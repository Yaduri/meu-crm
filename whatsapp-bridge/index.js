import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
  apiUrl: 'https://crm.yagoduarte.com.br',
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

// Estado em memória
let sock = null;
let connectionStatus = 'connecting'; // 'connecting' | 'qr_ready' | 'connected' | 'disconnected'
let connectedPhone = null;
let currentQrDataUrl = null;
let isSyncing = false;

// Filas
let incomingQueue = [];
let sentOutboxIds = [];
let failedOutboxIds = [];

// Cache local de leads (atualizado a cada sync pelo CRM)
let leadsPhoneCache = new Set();
let leadsMap = new Map(); // phone -> { id, nome }

function cleanPhone(raw) {
  return (raw || '').replace(/\D/g, '');
}

function getPhoneVariants(phone) {
  const digits = cleanPhone(phone);
  if (!digits) return [];
  const variants = new Set();
  variants.add(digits);

  if (digits.startsWith('55') && digits.length >= 12) {
    const without55 = digits.slice(2);
    variants.add(without55);
    if (without55.length === 11 && without55[2] === '9') {
      variants.add(without55.slice(0, 2) + without55.slice(3));
      variants.add('55' + without55.slice(0, 2) + without55.slice(3));
    }
  } else if (digits.length === 11 && digits[2] === '9') {
    variants.add('55' + digits);
    variants.add(digits.slice(0, 2) + digits.slice(3));
    variants.add('55' + digits.slice(0, 2) + digits.slice(3));
  } else if (digits.length === 10) {
    variants.add('55' + digits);
    variants.add(digits.slice(0, 2) + '9' + digits.slice(2));
    variants.add('55' + digits.slice(0, 2) + '9' + digits.slice(2));
  }

  return Array.from(variants);
}

function extractMessageText(msg) {
  if (!msg.message) return '';
  const m = msg.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
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
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

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

  // Escuta novas mensagens
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      if (!msg.key || !msg.key.remoteJid) continue;
      const jid = msg.key.remoteJid;

      // Ignora status e grupos
      if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid === 'status@broadcast') {
        continue;
      }

      const rawPhone = jid.replace('@s.whatsapp.net', '');
      const cleaned = cleanPhone(rawPhone);

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
      // Se falhar (ex: sem internet), mantém as filas para tentar na próxima
      isSyncing = false;
      return;
    }

    const data = await res.json();

    // Se a sincronização teve sucesso, limpa os itens já entregues
    sentOutboxIds = sentOutboxIds.filter((id) => !payload.sent_outbox_ids.includes(id));
    failedOutboxIds = failedOutboxIds.filter((item) => !payload.failed_outbox_ids.some((f) => f.id === item.id));
    incomingQueue = incomingQueue.filter((m) => !payload.incoming_messages.some((inc) => inc.id === m.id));

    // Atualiza cache local de leads autorizados
    if (data.leads_cache && Array.isArray(data.leads_cache)) {
      const newSet = new Set();
      const newMap = new Map();

      for (const lead of data.leads_cache) {
        if (lead.variants) {
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
        // Dispara sync para reportar status de envio
        triggerSyncImmediately();
      }
    }
  } catch (err) {
    // Falha silenciosa de rede/timeout
  } finally {
    isSyncing = false;
  }
}

let syncTimeout = null;
function triggerSyncImmediately() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncWithCrm, 100);
}

// Inicia loop contínuo
setInterval(syncWithCrm, config.syncIntervalMs);

// Inicia aplicação
startWhatsApp();
