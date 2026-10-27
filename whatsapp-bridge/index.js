import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  normalizeMessageContent
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Suprime ruídos internos de mensagens antigas de grupos/contatos antigos do libsignal (Bad MAC)
const filterNoise = (str) => {
  return (
    str.includes('Bad MAC') ||
    str.includes('Failed to decrypt message') ||
    str.includes('Closing open session in favor of incoming prekey bundle') ||
    str.includes('Closing session: SessionEntry') ||
    str.includes('Session error:Error:')
  );
};

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, encoding, callback) => {
  const str = chunk ? chunk.toString() : '';
  if (filterNoise(str)) {
    if (typeof encoding === 'function') encoding();
    else if (typeof callback === 'function') callback();
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
  const str = chunk ? chunk.toString() : '';
  if (filterNoise(str)) {
    if (typeof encoding === 'function') encoding();
    else if (typeof callback === 'function') callback();
    return true;
  }
  return originalStdoutWrite(chunk, encoding, callback);
};

// Configurações
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  apiUrl: 'https://meu-crm.yaduri16.workers.dev',
  syncIntervalMs: 2500
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('⚠️ Não foi possível ler config.json, usando padrões.');
  }
}

const AUTH_DIR = path.join(__dirname, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const LEADS_CACHE_FILE = path.join(__dirname, 'leads_cache.json');

// Estado em memória
let sock = null;
let connectionStatus = 'connecting'; // 'connecting' | 'qr_ready' | 'connected' | 'disconnected'
let connectedPhone = null;
let currentQrDataUrl = null;
let isSyncing = false;
let hasLoggedFirstSync = false;

// Filas
let incomingQueue = [];
let sentOutboxIds = [];
let failedOutboxIds = [];

// Cache local de leads (atualizado a cada sync pelo CRM e salvo em disco)
let leadsPhoneCache = new Set();
let leadsMap = new Map(); // phone -> { id, nome }
const lidToPhoneMap = new Map(); // lid -> phone

function cleanPhone(raw) {
  return (raw || '').replace(/\D/g, '');
}

function updateLeadsMemoryCache(leads, saveToDisk = false) {
  if (!Array.isArray(leads)) return;
  const newSet = new Set();
  const newMap = new Map();

  for (const lead of leads) {
    if (lead.variants && Array.isArray(lead.variants)) {
      for (const v of lead.variants) {
        newSet.add(v);
        newMap.set(v, { id: lead.id, nome: lead.nome });
      }
    }
    if (lead.phone) {
      newSet.add(lead.phone);
      newMap.set(lead.phone, { id: lead.id, nome: lead.nome });
    }
  }

  leadsPhoneCache = newSet;
  leadsMap = newMap;

  if (saveToDisk) {
    try {
      fs.writeFileSync(LEADS_CACHE_FILE, JSON.stringify(leads, null, 2), 'utf-8');
    } catch {}
  }
}

function loadLeadsCacheFromDisk() {
  if (fs.existsSync(LEADS_CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(LEADS_CACHE_FILE, 'utf-8');
      const leads = JSON.parse(raw);
      if (Array.isArray(leads) && leads.length > 0) {
        updateLeadsMemoryCache(leads, false);
        console.log(`📁 Cache offline de leads carregado (${leads.length} leads prontos para monitoramento).`);
      }
    } catch {}
  }
}

function extractMessageText(msg) {
  if (!msg) return '';
  const normalized = normalizeMessageContent(msg.message);
  if (!normalized) {
    if (msg.messageStubType) return '[Evento no chat]';
    return '';
  }
  const m = normalized;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    (m.imageMessage ? '[Imagem]' : '') ||
    m.videoMessage?.caption ||
    (m.videoMessage ? '[Vídeo]' : '') ||
    (m.audioMessage ? '[Áudio]' : '') ||
    (m.documentMessage?.title || (m.documentMessage ? '[Documento]' : '')) ||
    (m.stickerMessage ? '[Figurinha]' : '') ||
    (m.contactMessage ? '[Contato]' : '') ||
    m.templateButtonReplyMessage?.selectedId ||
    m.buttonsResponseMessage?.selectedButtonId ||
    ''
  );
}

function toWhatsAppJid(phone) {
  let digits = cleanPhone(phone);
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `${digits}@s.whatsapp.net`;
}

function resolvePhoneFromJid(jid) {
  if (!jid) return null;
  if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid === 'status@broadcast') {
    return null;
  }

  if (jid.endsWith('@lid')) {
    const lidClean = cleanPhone(jid.replace('@lid', ''));
    const mapped = lidToPhoneMap.get(lidClean);
    if (mapped) return cleanPhone(mapped);
    return null;
  }

  const raw = jid.replace('@s.whatsapp.net', '');
  return cleanPhone(raw);
}

// Inicia o socket do Baileys
async function startWhatsApp() {
  console.log('\n==========================================');
  console.log('🚀 Iniciando Ponte Local WhatsApp (CRM)');
  console.log(`📡 Conectando ao CRM em: ${config.apiUrl}`);
  console.log('==========================================\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📦 Usando Baileys v${version.join('.')} (Última: ${isLatest})`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: true
  });

  sock.ev.on('creds.update', saveCreds);

  // Mapeia contatos e IDs do WhatsApp (LID -> Telefone)
  sock.ev.on('contacts.upsert', (contacts) => {
    if (!Array.isArray(contacts)) return;
    for (const c of contacts) {
      const cId = c.id ? cleanPhone(c.id) : '';
      const cPhone = c.phoneNumber ? cleanPhone(c.phoneNumber) : '';
      if (cId && cPhone) {
        lidToPhoneMap.set(cId, cPhone);
      }
      if (c.lid && c.id) {
        lidToPhoneMap.set(cleanPhone(c.lid), cleanPhone(c.id));
      }
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'qr_ready';
      console.log('\n📲 QR CODE GERADO! Escaneie pelo WhatsApp do celular:');
      qrcodeTerminal.generate(qr, { small: true });

      try {
        currentQrDataUrl = await QRCode.toDataURL(qr);
      } catch (e) {
        console.error('Erro ao gerar DataURL do QR:', e);
      }
      triggerSyncImmediately();
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionStatus = 'disconnected';
      connectedPhone = null;
      currentQrDataUrl = null;
      console.log(`⚠️ Conexão encerrada. Motivo: ${statusCode || 'Desconhecido'}. Reconectar: ${shouldReconnect}`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🚪 Sessão desconectada pelo usuário. Limpando credenciais locais...');
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch {}
      }

      triggerSyncImmediately();

      if (shouldReconnect) {
        setTimeout(startWhatsApp, 4000);
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      currentQrDataUrl = null;
      connectedPhone = sock?.user?.id ? cleanPhone(sock.user.id.split(':')[0]) : 'Conectado';
      console.log(`\n✅ WHATSAPP CONECTADO COM SUCESSO!`);
      console.log(`📱 Número Ativo: ${connectedPhone}`);
      console.log(`🔒 Filtro de Privacidade Ativo: Somente mensagens de leads serão sincronizadas.\n`);
      triggerSyncImmediately();
    }
  });

  // Captura histórico de conversas prévias enviadas pelo celular
  sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
    if (contacts && Array.isArray(contacts)) {
      for (const c of contacts) {
        const cId = c.id ? cleanPhone(c.id) : '';
        const cPhone = c.phoneNumber ? cleanPhone(c.phoneNumber) : '';
        if (cId && cPhone) {
          lidToPhoneMap.set(cId, cPhone);
        }
        if (c.lid && c.id) {
          lidToPhoneMap.set(cleanPhone(c.lid), cleanPhone(c.id));
        }
      }
    }

    // Coleta mensagens tanto do array principal quanto das conversas individuais
    const allMsgs = [];
    if (Array.isArray(messages)) {
      allMsgs.push(...messages);
    }
    if (Array.isArray(chats)) {
      for (const c of chats) {
        if (c.messages && Array.isArray(c.messages)) {
          for (const m of c.messages) {
            allMsgs.push(m.message || m);
          }
        }
      }
    }

    if (allMsgs.length === 0) return;
    console.log(`📥 Recebido lote de histórico do celular: ${allMsgs.length} mensagens no total.`);

    const matchedLeadNames = new Set();
    let leadMessagesFound = 0;

    for (const msg of allMsgs) {
      if (!msg || !msg.key || !msg.key.remoteJid) continue;
      const jid = msg.key.remoteJid;

      const cleaned = resolvePhoneFromJid(jid);
      if (!cleaned || !leadsPhoneCache.has(cleaned)) {
        continue;
      }

      const text = extractMessageText(msg);
      if (!text || !text.trim()) continue;

      const fromMe = !!msg.key.fromMe;
      const leadInfo = leadsMap.get(cleaned);
      if (leadInfo?.nome) {
        matchedLeadNames.add(`${leadInfo.nome} (${cleaned})`);
      }

      leadMessagesFound++;
      incomingQueue.push({
        id: msg.key.id || `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        phone: cleaned,
        body: text.trim(),
        timestamp: (msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now()),
        from_me: fromMe
      });
    }

    // Se houver conversas no chats do WhatsApp de leads cujo texto de mensagens individuais
    // não pôde ser decifrado por chaves antigas (Bad MAC), garante que a conversa apareça no CRM
    if (chats && Array.isArray(chats)) {
      for (const chat of chats) {
        const cleaned = resolvePhoneFromJid(chat.id);
        if (cleaned && leadsPhoneCache.has(cleaned)) {
          const leadInfo = leadsMap.get(cleaned);
          const leadLabel = `${leadInfo?.nome || cleaned} (${cleaned})`;
          if (!matchedLeadNames.has(leadLabel)) {
            matchedLeadNames.add(leadLabel);
            leadMessagesFound++;
            incomingQueue.push({
              id: `chat_init_${chat.id}_${chat.conversationTimestamp || Date.now()}`,
              phone: cleaned,
              body: '[Conversa no WhatsApp]',
              timestamp: (chat.conversationTimestamp ? Number(chat.conversationTimestamp) * 1000 : Date.now()),
              from_me: true
            });
          }
        }
      }
    }

    if (leadMessagesFound > 0) {
      console.log(`✨ Encontradas ${leadMessagesFound} mensagens no histórico de ${matchedLeadNames.size} lead(s)!`);
      if (matchedLeadNames.size > 0) {
        console.log(`📋 Leads com conversas ativas no WhatsApp:\n   • ${Array.from(matchedLeadNames).join('\n   • ')}`);
      }
      triggerSyncImmediately();
    }
  });

  // Escuta novas mensagens em tempo real
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify' && m.type !== 'append') return;

    for (const msg of m.messages) {
      if (!msg || !msg.key || !msg.key.remoteJid) continue;
      const jid = msg.key.remoteJid;

      const cleaned = resolvePhoneFromJid(jid);
      if (!cleaned) continue;

      // FILTRO DE PRIVACIDADE ESTRITO:
      // Verifica se o número (ou qualquer uma de suas variantes) pertence a um Lead cadastrado no CRM
      const isLead = leadsPhoneCache.has(cleaned);
      if (!isLead) {
        // Ignora silenciosamente para preservar 100% da privacidade de conversas pessoais
        continue;
      }

      const text = extractMessageText(msg);
      if (!text || !text.trim()) continue;

      const fromMe = !!msg.key.fromMe;
      const leadInfo = leadsMap.get(cleaned);
      const leadNome = leadInfo ? leadInfo.nome : cleaned;

      console.log(`💬 [Lead: ${leadNome}] ${fromMe ? 'Você:' : 'Cliente:'} ${text.slice(0, 60)}`);

      incomingQueue.push({
        id: msg.key.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        phone: cleaned,
        body: text.trim(),
        timestamp: (msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now()),
        from_me: fromMe
      });

      triggerSyncImmediately();
    }
  });
}

// Loop de sincronização com o CRM Cloudflare
async function syncWithCrm() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const payload = {
      status: connectionStatus,
      phone: connectedPhone,
      qr_code: currentQrDataUrl,
      sent_outbox_ids: [...sentOutboxIds],
      failed_outbox_ids: [...failedOutboxIds],
      incoming_messages: [...incomingQueue]
    };

    const res = await fetch(`${config.apiUrl}/api/whatsapp/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`⚠️ Erro ao sincronizar com CRM (${res.status} ${res.statusText})`);
      isSyncing = false;
      return;
    }

    const data = await res.json();

    if (!hasLoggedFirstSync && data.leads_cache) {
      hasLoggedFirstSync = true;
      console.log(`📡 Sincronizado com o CRM na nuvem com sucesso! (${data.leads_cache.length} leads monitorados)`);
    }

    // Se a sincronização teve sucesso, limpa os itens já entregues
    sentOutboxIds = sentOutboxIds.filter((id) => !payload.sent_outbox_ids.includes(id));
    failedOutboxIds = failedOutboxIds.filter((item) => !payload.failed_outbox_ids.some((f) => f.id === item.id));
    incomingQueue = incomingQueue.filter((m) => !payload.incoming_messages.some((inc) => inc.id === m.id));

    // Atualiza cache local de leads autorizados e persiste em disco
    if (data.leads_cache && Array.isArray(data.leads_cache)) {
      updateLeadsMemoryCache(data.leads_cache, true);
    }

    // Processa fila de envio pendente (mensagens digitadas no CRM)
    if (data.pending_outbox && Array.isArray(data.pending_outbox) && data.pending_outbox.length > 0) {
      if (connectionStatus === 'connected' && sock) {
        for (const outbox of data.pending_outbox) {
          const jid = toWhatsAppJid(outbox.whatsapp);
          try {
            console.log(`📤 Enviando mensagem para ${outbox.whatsapp}...`);
            await sock.sendMessage(jid, { text: outbox.body });
            sentOutboxIds.push(outbox.id);
            console.log(`✅ Mensagem enviada com sucesso! [ID: ${outbox.id}]`);
          } catch (err) {
            console.error(`❌ Erro ao enviar para ${outbox.whatsapp}:`, err?.message || err);
            failedOutboxIds.push({ id: outbox.id, error: err?.message || 'Falha no envio' });
          }
        }
        triggerSyncImmediately();
      }
    }
  } catch (err) {
    if (!hasLoggedFirstSync) {
      console.warn(`⚠️ Falha de rede ao conectar com o CRM: ${err?.message || err}`);
    }
  } finally {
    isSyncing = false;
  }
}

let syncTimeout = null;
function triggerSyncImmediately() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncWithCrm, 100);
}

// Inicialização segura com cache antecipado
async function bootstrap() {
  // 1. Carrega cache offline imediatamente
  loadLeadsCacheFromDisk();

  // 2. Realiza sync inicial com o CRM na nuvem antes de abrir o socket
  await syncWithCrm();

  // 3. Inicia loop contínuo de sincronização
  setInterval(syncWithCrm, config.syncIntervalMs);

  // 4. Inicia socket do WhatsApp
  await startWhatsApp();
}

bootstrap();
