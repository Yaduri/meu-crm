import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  normalizeMessageContent,
  downloadMediaMessage
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
  } catch {
    console.warn('⚠️ Não foi possível ler config.json, usando padrões.');
  }
}

const AUTH_DIR = path.join(__dirname, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const LEADS_CACHE_FILE = path.join(__dirname, 'leads_cache.json');
const LID_CACHE_FILE = path.join(__dirname, 'lid_cache.json');

// Estado em memória
let sock = null;
let connectionStatus = 'connecting'; // 'connecting' | 'qr_ready' | 'connected' | 'disconnected'
let connectedPhone = null;
let currentQrDataUrl = null;
let isSyncing = false;
let hasLoggedFirstSync = false;
let isResolvingLids = false;

// Filas
let incomingQueue = [];
let sentOutboxIds = [];
let failedOutboxIds = [];

// Cache local de leads (atualizado a cada sync pelo CRM e salvo em disco)
let leadsRawList = [];
let leadsPhoneCache = new Set();
let leadsMap = new Map(); // phone -> { id, nome, canonicalPhone }
let leadsSuffixMap = new Map(); // ddd+last8 -> { id, nome, canonicalPhone }
const lidToPhoneMap = new Map(); // lidDigits -> phoneDigits

// Buffer para mensagens recebidas com @lid antes do mapeamento LID->Telefone chegar
const pendingLidMessages = new Map(); // lidDigits -> Array<msg>
const pendingLidChats = new Map(); // lidDigits -> chatObj
const syncedHistoryMsgIds = new Set();

function cleanPhone(raw) {
  if (!raw) return '';
  // Remove sufixo de dispositivo (:38) antes do @ se existir
  const withoutDomain = String(raw).split('@')[0].split(':')[0];
  return withoutDomain.replace(/\D/g, '');
}

function isLikelyPhoneDigits(digits) {
  if (!digits) return false;
  // Telefones BR (com ou sem 55) têm entre 10 e 13 dígitos. LIDs geralmente têm 14 ou 15 dígitos.
  return digits.length >= 10 && digits.length <= 13;
}

function getDddAndLast8(digits) {
  if (!digits || digits.length < 10) return null;
  let d = digits;
  if (d.startsWith('55') && d.length >= 12) {
    d = d.slice(2);
  }
  if (d.length < 10) return null;
  const ddd = d.slice(0, 2);
  const last8 = d.slice(-8);
  return `${ddd}${last8}`;
}

function loadLidCacheFromDisk() {
  if (fs.existsSync(LID_CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(LID_CACHE_FILE, 'utf-8');
      const obj = JSON.parse(raw);
      let count = 0;
      for (const [lid, phone] of Object.entries(obj)) {
        if (lid && phone) {
          lidToPhoneMap.set(lid, phone);
          count++;
        }
      }
      if (count > 0) {
        console.log(`🔗 Cache de WhatsApp Business (LID) carregado (${count} números mapeados).`);
      }
    } catch {}
  }
}

let saveLidTimeout = null;
function saveLidCacheToDisk() {
  if (saveLidTimeout) clearTimeout(saveLidTimeout);
  saveLidTimeout = setTimeout(() => {
    try {
      const obj = Object.fromEntries(lidToPhoneMap.entries());
      fs.writeFileSync(LID_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {}
  }, 500);
}

function registerLidMapping(rawLid, rawPhone) {
  const lidDigits = cleanPhone(rawLid);
  const phoneDigits = cleanPhone(rawPhone);
  if (!lidDigits || !phoneDigits || lidDigits === phoneDigits) return false;
  if (!isLikelyPhoneDigits(phoneDigits)) return false;

  const prev = lidToPhoneMap.get(lidDigits);
  lidToPhoneMap.set(lidDigits, phoneDigits);

  if (prev !== phoneDigits) {
    saveLidCacheToDisk();
  }

  // Se havia mensagens ou conversas aguardando a resolução desse @lid, processa imediatamente!
  flushPendingForLid(lidDigits, phoneDigits);
  return true;
}

function extractMappingsFromObject(obj) {
  if (!obj || typeof obj !== 'object') return;

  const lidCandidates = [];
  const phoneCandidates = [];

  const fields = [
    { val: obj.id, hint: 'any' },
    { val: obj.lid, hint: 'lid' },
    { val: obj.lidJid, hint: 'lid' },
    { val: obj.pnJid, hint: 'phone' },
    { val: obj.phoneNumber, hint: 'phone' },
    { val: obj.jid, hint: 'phone' },
    { val: obj.newJid, hint: 'any' },
    { val: obj.oldJid, hint: 'any' }
  ];

  for (const { val, hint } of fields) {
    if (!val || typeof val !== 'string') continue;
    if (val.endsWith('@g.us') || val.endsWith('@broadcast')) continue;

    if (val.endsWith('@lid') || hint === 'lid') {
      const d = cleanPhone(val);
      if (d) lidCandidates.push(d);
    } else if (val.endsWith('@s.whatsapp.net') || hint === 'phone') {
      const d = cleanPhone(val);
      if (isLikelyPhoneDigits(d)) phoneCandidates.push(d);
    }
  }

  if (lidCandidates.length > 0 && phoneCandidates.length > 0) {
    for (const lid of lidCandidates) {
      registerLidMapping(lid, phoneCandidates[0]);
    }
  }
}

function updateLeadsMemoryCache(leads, saveToDisk = false) {
  if (!Array.isArray(leads)) return;
  leadsRawList = leads;
  const newSet = new Set();
  const newMap = new Map();
  const newSuffixMap = new Map();

  for (const lead of leads) {
    const primaryPhone = cleanPhone(lead.phone);
    const info = { id: lead.id, nome: lead.nome, canonicalPhone: primaryPhone || lead.phone };

    if (lead.variants && Array.isArray(lead.variants)) {
      for (const v of lead.variants) {
        const cleanV = cleanPhone(v);
        if (cleanV) {
          newSet.add(cleanV);
          newMap.set(cleanV, info);
          const suffix = getDddAndLast8(cleanV);
          if (suffix) newSuffixMap.set(suffix, info);
        }
      }
    }
    if (primaryPhone) {
      newSet.add(primaryPhone);
      newMap.set(primaryPhone, info);
      const suffix = getDddAndLast8(primaryPhone);
      if (suffix) newSuffixMap.set(suffix, info);
    }
  }

  leadsPhoneCache = newSet;
  leadsMap = newMap;
  leadsSuffixMap = newSuffixMap;

  if (saveToDisk) {
    try {
      fs.writeFileSync(LEADS_CACHE_FILE, JSON.stringify(leads, null, 2), 'utf-8');
    } catch {}
  }
}

function matchLeadByPhone(rawDigits) {
  if (!rawDigits) return null;
  if (leadsPhoneCache.has(rawDigits)) {
    return leadsMap.get(rawDigits) || { canonicalPhone: rawDigits, nome: rawDigits };
  }
  const suffix = getDddAndLast8(rawDigits);
  if (suffix && leadsSuffixMap.has(suffix)) {
    return leadsSuffixMap.get(suffix);
  }
  return null;
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

function getMediaDetails(msg) {
  if (!msg || !msg.message) return null;
  const m = normalizeMessageContent(msg.message);
  if (!m) return null;

  if (m.imageMessage) {
    const ext = m.imageMessage.mimetype?.includes('png') ? 'png' : 'jpg';
    return {
      type: 'image',
      mimetype: m.imageMessage.mimetype || 'image/jpeg',
      filename: `foto_${Date.now()}.${ext}`,
      caption: m.imageMessage.caption || ''
    };
  }
  if (m.audioMessage) {
    return {
      type: 'audio',
      mimetype: m.audioMessage.mimetype || 'audio/ogg; codecs=opus',
      filename: `audio_${Date.now()}.ogg`,
      caption: ''
    };
  }
  if (m.documentMessage) {
    const name = m.documentMessage.fileName || m.documentMessage.title || `doc_${Date.now()}.pdf`;
    return {
      type: 'document',
      mimetype: m.documentMessage.mimetype || 'application/pdf',
      filename: name,
      caption: m.documentMessage.caption || ''
    };
  }
  if (m.stickerMessage) {
    return {
      type: 'sticker',
      mimetype: m.stickerMessage.mimetype || 'image/webp',
      filename: `sticker_${Date.now()}.webp`,
      caption: ''
    };
  }
  if (m.videoMessage) {
    return {
      type: 'video',
      mimetype: m.videoMessage.mimetype || 'video/mp4',
      filename: `video_${Date.now()}.mp4`,
      caption: m.videoMessage.caption || ''
    };
  }
  return null;
}

async function uploadMediaBuffer(buffer, filename, mimetype) {
  try {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimetype || 'application/octet-stream' });
    formData.append('file', blob, filename || `zap_media_${Date.now()}`);

    const res = await fetch(`${config.apiUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
  } catch (err) {
    console.warn('⚠️ Falha ao salvar mídia na nuvem:', err.message);
  }
  return null;
}

function toWhatsAppJid(phone) {
  let digits = cleanPhone(phone);
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `${digits}@s.whatsapp.net`;
}

function resolvePhoneFromJid(jid) {
  if (!jid || typeof jid !== 'string') return null;
  if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid === 'status@broadcast') {
    return null;
  }

  if (jid.endsWith('@lid')) {
    const lidClean = cleanPhone(jid);
    const mapped = lidToPhoneMap.get(lidClean);
    if (mapped) return cleanPhone(mapped);
    return null;
  }

  const cleaned = cleanPhone(jid);
  if (isLikelyPhoneDigits(cleaned)) {
    return cleaned;
  }
  // Caso venha um LID sem sufixo @lid
  if (lidToPhoneMap.has(cleaned)) {
    return lidToPhoneMap.get(cleaned);
  }
  return null;
}

function resolvePhoneFromMessage(msg) {
  if (!msg) return null;

  // 1. Se a mensagem veio acompanhada do pnJid da conversa pai no HistorySync
  if (msg._chatPnJid) {
    const p = resolvePhoneFromJid(msg._chatPnJid);
    if (p) {
      if (msg.key?.remoteJid?.endsWith('@lid')) {
        registerLidMapping(msg.key.remoteJid, p);
      }
      if (msg._chatLidJid) {
        registerLidMapping(msg._chatLidJid, p);
      }
      return p;
    }
  }

  // 2. Tenta resolver pelo remoteJid da mensagem
  if (msg.key?.remoteJid) {
    const p = resolvePhoneFromJid(msg.key.remoteJid);
    if (p) return p;
  }

  // 3. Tenta resolver pelo _chatId ou participant
  if (msg._chatId) {
    const p = resolvePhoneFromJid(msg._chatId);
    if (p) {
      if (msg.key?.remoteJid?.endsWith('@lid')) {
        registerLidMapping(msg.key.remoteJid, p);
      }
      if (msg._chatLidJid) {
        registerLidMapping(msg._chatLidJid, p);
      }
      return p;
    }
  }

  if (msg.key?.senderPn) {
    const p = resolvePhoneFromJid(msg.key.senderPn);
    if (p) {
      if (msg.key?.remoteJid?.endsWith('@lid')) {
        registerLidMapping(msg.key.remoteJid, p);
      }
      return p;
    }
  }

  return null;
}

function queueHistoryMessageForLead(msg, rawPhone) {
  const leadInfo = matchLeadByPhone(rawPhone);
  if (!leadInfo) return null;

  const targetPhone = leadInfo.canonicalPhone || rawPhone;

  // Se for o contato de teste da irmã (11945130865), limita a sincronização aos últimos 7 dias
  if (targetPhone.endsWith('11945130865') || rawPhone.endsWith('11945130865')) {
    const msgTs = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (msgTs < sevenDaysAgo) {
      return null;
    }
  }

  const text = extractMessageText(msg);
  if (!text || !text.trim()) return null;

  const msgId = msg.key?.id || `hist_${msg.messageTimestamp || Date.now()}_${cleanPhone(msg.key?.remoteJid)}`;
  if (syncedHistoryMsgIds.has(msgId)) return null;
  syncedHistoryMsgIds.add(msgId);

  const fromMe = !!msg.key?.fromMe;
  incomingQueue.push({
    id: msgId,
    phone: targetPhone,
    body: text.trim(),
    timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
    from_me: fromMe
  });

  return `${leadInfo.nome || targetPhone} (${targetPhone})`;
}

function flushPendingForLid(lidDigits, phoneDigits) {
  const leadInfo = matchLeadByPhone(phoneDigits);
  if (!leadInfo) {
    // Se o LID foi resolvido para um telefone que NÃO é lead do CRM, limpa do buffer para economizar memória
    pendingLidMessages.delete(lidDigits);
    pendingLidChats.delete(lidDigits);
    return;
  }

  let flushedCount = 0;
  const targetPhone = leadInfo.canonicalPhone || phoneDigits;

  const msgs = pendingLidMessages.get(lidDigits);
  if (msgs && msgs.length > 0) {
    pendingLidMessages.delete(lidDigits);
    for (const msg of msgs) {
      const label = queueHistoryMessageForLead(msg, targetPhone);
      if (label) flushedCount++;
    }
  }

  const chat = pendingLidChats.get(lidDigits);
  if (chat) {
    pendingLidChats.delete(lidDigits);
    if (flushedCount === 0) {
      const msgId = `chat_init_${chat.id}_${chat.conversationTimestamp || Date.now()}`;
      if (!syncedHistoryMsgIds.has(msgId)) {
        syncedHistoryMsgIds.add(msgId);
        incomingQueue.push({
          id: msgId,
          phone: targetPhone,
          body: '[Conversa no WhatsApp]',
          timestamp: chat.conversationTimestamp ? Number(chat.conversationTimestamp) * 1000 : Date.now(),
          from_me: true
        });
        flushedCount++;
      }
    }
  }

  if (flushedCount > 0) {
    console.log(`✨ [LID Resolvido] Sincronizadas ${flushedCount} mensagens de ${leadInfo.nome} (${targetPhone})`);
    triggerSyncImmediately();
  }
}

// Consulta proativamente a API USync do WhatsApp para descobrir o @lid de todos os 312 leads do CRM
async function resolveLeadsLidsViaWhatsApp() {
  if (isResolvingLids || !sock || connectionStatus !== 'connected') return;
  if (!leadsRawList || leadsRawList.length === 0) return;

  isResolvingLids = true;
  try {
    const phonesSet = new Set();
    for (const lead of leadsRawList) {
      const p = cleanPhone(lead.phone);
      if (p) {
        phonesSet.add(p.startsWith('55') ? `+${p}` : `+55${p}`);
      }
      if (Array.isArray(lead.variants)) {
        for (const v of lead.variants) {
          const cv = cleanPhone(v);
          if (cv && cv.startsWith('55')) {
            phonesSet.add(`+${cv}`);
          }
        }
      }
    }
    const phonesToQuery = Array.from(phonesSet);

    if (phonesToQuery.length === 0) return;

    console.log(`🔍 Consultando IDs de WhatsApp Business (LID) para os ${leadsRawList.length} leads do CRM...`);
    let newlyMapped = 0;
    const batchSize = 50;

    for (let i = 0; i < phonesToQuery.length; i += batchSize) {
      if (connectionStatus !== 'connected' || !sock) break;
      const batch = phonesToQuery.slice(i, i + batchSize);
      try {
        const results = await sock.onWhatsApp(...batch);
        if (Array.isArray(results)) {
          for (const r of results) {
            if (r.jid && r.lid) {
              const lidClean = cleanPhone(r.lid);
              const phoneClean = cleanPhone(r.jid);
              if (lidClean && phoneClean) {
                const hadBefore = lidToPhoneMap.has(lidClean);
                registerLidMapping(lidClean, phoneClean);
                if (!hadBefore) newlyMapped++;
              }
            }
          }
        }
      } catch {}
    }

    console.log(`✅ Mapeamento LID concluído! Total de leads com LID mapeado: ${lidToPhoneMap.size} (${newlyMapped} novos).`);
  } catch (err) {
    console.warn('⚠️ Aviso ao consultar LIDs:', err?.message || err);
  } finally {
    isResolvingLids = false;
  }
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

  // Mapeia contatos e IDs do WhatsApp (LID -> Telefone) em todos os eventos possíveis
  sock.ev.on('contacts.upsert', (contacts) => {
    if (!Array.isArray(contacts)) return;
    for (const c of contacts) {
      extractMappingsFromObject(c);
    }
  });

  sock.ev.on('contacts.update', (contacts) => {
    if (!Array.isArray(contacts)) return;
    for (const c of contacts) {
      extractMappingsFromObject(c);
    }
  });

  sock.ev.on('chats.upsert', (chats) => {
    if (!Array.isArray(chats)) return;
    for (const c of chats) {
      extractMappingsFromObject(c);
    }
  });

  sock.ev.on('chats.update', (chats) => {
    if (!Array.isArray(chats)) return;
    for (const c of chats) {
      extractMappingsFromObject(c);
    }
  });

  sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
    if (lid && jid) {
      registerLidMapping(lid, jid);
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

      // Dispara resolução proativa de LIDs para todos os 312 leads do CRM
      resolveLeadsLidsViaWhatsApp();
    }
  });

  // Captura histórico de conversas prévias enviadas pelo celular
  sock.ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
    // 1. Extrai todos os mapeamentos LID -> Telefone de contacts e chats
    if (contacts && Array.isArray(contacts)) {
      for (const c of contacts) {
        extractMappingsFromObject(c);
      }
    }
    if (chats && Array.isArray(chats)) {
      for (const c of chats) {
        extractMappingsFromObject(c);
      }
    }

    // 2. Coleta mensagens tanto do array principal quanto das conversas individuais
    const allMsgs = [];
    if (Array.isArray(messages)) {
      allMsgs.push(...messages);
    }
    if (Array.isArray(chats)) {
      for (const c of chats) {
        if (c.messages && Array.isArray(c.messages)) {
          for (const m of c.messages) {
            const msgObj = m.message || m;
            if (msgObj) {
              msgObj._chatId = msgObj._chatId || c.id;
              msgObj._chatPnJid = msgObj._chatPnJid || c.pnJid;
              msgObj._chatLidJid = msgObj._chatLidJid || c.lidJid;
              allMsgs.push(msgObj);
            }
          }
        }
      }
    }

    if (allMsgs.length === 0 && (!chats || chats.length === 0)) return;
    console.log(`📥 Recebido lote de histórico do celular: ${allMsgs.length} mensagens (${chats?.length || 0} conversas).`);

    const matchedLeadNames = new Set();
    let leadMessagesFound = 0;
    let bufferedLidCount = 0;

    for (const msg of allMsgs) {
      if (!msg || !msg.key || !msg.key.remoteJid) continue;
      const jid = msg.key.remoteJid;
      if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid === 'status@broadcast') continue;

      const cleaned = resolvePhoneFromMessage(msg);
      if (!cleaned) {
        // Se for um @lid ainda não resolvido, guarda no buffer temporário aguardando o mapeamento LID
        if (jid.endsWith('@lid')) {
          const lidDigits = cleanPhone(jid);
          if (lidDigits) {
            if (!pendingLidMessages.has(lidDigits)) {
              pendingLidMessages.set(lidDigits, []);
            }
            const arr = pendingLidMessages.get(lidDigits);
            if (arr.length < 250) {
              arr.push(msg);
              bufferedLidCount++;
            }
          }
        }
        continue;
      }

      const label = queueHistoryMessageForLead(msg, cleaned);
      if (label) {
        matchedLeadNames.add(label);
        leadMessagesFound++;
      }
    }

    // 3. Processa conversas do histórico
    if (chats && Array.isArray(chats)) {
      for (const chat of chats) {
        if (!chat || !chat.id) continue;
        if (chat.id.endsWith('@g.us') || chat.id.endsWith('@broadcast')) continue;

        const cleaned = resolvePhoneFromJid(chat.pnJid) || resolvePhoneFromJid(chat.id) || resolvePhoneFromJid(chat.lidJid);
        if (!cleaned) {
          if (chat.id.endsWith('@lid')) {
            const lidDigits = cleanPhone(chat.id);
            if (lidDigits) pendingLidChats.set(lidDigits, chat);
          }
          continue;
        }

        const leadInfo = matchLeadByPhone(cleaned);
        if (leadInfo) {
          const targetPhone = leadInfo.canonicalPhone || cleaned;
          const leadLabel = `${leadInfo.nome || targetPhone} (${targetPhone})`;
          if (!matchedLeadNames.has(leadLabel)) {
            const msgId = `chat_init_${chat.id}_${chat.conversationTimestamp || Date.now()}`;
            if (!syncedHistoryMsgIds.has(msgId)) {
              syncedHistoryMsgIds.add(msgId);
              matchedLeadNames.add(leadLabel);
              leadMessagesFound++;
              incomingQueue.push({
                id: msgId,
                phone: targetPhone,
                body: '[Conversa no WhatsApp]',
                timestamp: chat.conversationTimestamp ? Number(chat.conversationTimestamp) * 1000 : Date.now(),
                from_me: true
              });
            }
          }
        }
      }
    }

    if (leadMessagesFound > 0) {
      console.log(`✨ Encontradas ${leadMessagesFound} mensagens no histórico de ${matchedLeadNames.size} lead(s)!`);
      if (matchedLeadNames.size > 0) {
        console.log(`📋 Leads sincronizados neste lote:\n   • ${Array.from(matchedLeadNames).slice(0, 25).join('\n   • ')}${matchedLeadNames.size > 25 ? `\n   ... e mais ${matchedLeadNames.size - 25} lead(s)` : ''}`);
      }
      triggerSyncImmediately();
    }

    if (bufferedLidCount > 0 && !isResolvingLids) {
      resolveLeadsLidsViaWhatsApp();
    }
  });

  // Escuta novas mensagens em tempo real
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify' && m.type !== 'append') return;

    for (const msg of m.messages) {
      if (!msg || !msg.key || !msg.key.remoteJid) continue;
      const jid = msg.key.remoteJid;

      const cleaned = resolvePhoneFromMessage(msg);
      if (!cleaned) continue;

      // FILTRO DE PRIVACIDADE ESTRITO:
      // Verifica se o número (ou qualquer uma de suas variantes) pertence a um Lead cadastrado no CRM
      const leadInfo = matchLeadByPhone(cleaned);
      if (!leadInfo) {
        // Ignora silenciosamente para preservar 100% da privacidade de conversas pessoais
        continue;
      }

      const targetPhone = leadInfo.canonicalPhone || cleaned;

      // Se for o contato de teste da irmã (11945130865), limita a sincronização aos últimos 7 dias
      if (targetPhone.endsWith('11945130865') || cleaned.endsWith('11945130865')) {
        const msgTs = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (msgTs < sevenDaysAgo) {
          continue;
        }
      }

      const text = extractMessageText(msg);
      const mediaInfo = getMediaDetails(msg);
      let mediaUrl = null;

      if (mediaInfo) {
        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: sock?.logger, reuploadRequest: (update) => sock?.updateMediaMessage(update) }
          );
          if (buffer) {
            mediaUrl = await uploadMediaBuffer(buffer, mediaInfo.filename, mediaInfo.mimetype);
          }
        } catch {}
      }

      const bodyText = (mediaInfo?.caption || '').trim() || text.trim() || (mediaInfo ? `[${mediaInfo.type.toUpperCase()}]` : '');
      if (!bodyText && !mediaUrl) continue;

      const fromMe = !!msg.key.fromMe;
      const leadNome = leadInfo.nome || targetPhone;

      console.log(`💬 [Lead: ${leadNome}] ${fromMe ? 'Você:' : 'Cliente:'} ${bodyText.slice(0, 60)}`);

      incomingQueue.push({
        id: msg.key.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        phone: targetPhone,
        body: bodyText,
        timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
        from_me: fromMe,
        media_type: mediaInfo?.type || null,
        media_url: mediaUrl,
        media_filename: mediaInfo?.filename || null,
        media_mimetype: mediaInfo?.mimetype || null
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
    // Envia em lotes de até 500 mensagens por requisição para evitar payloads gigantes
    const batchMessages = incomingQueue.slice(0, 500);

    const payload = {
      status: connectionStatus,
      phone: connectedPhone,
      qr_code: currentQrDataUrl,
      sent_outbox_ids: [...sentOutboxIds],
      failed_outbox_ids: [...failedOutboxIds],
      incoming_messages: batchMessages
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
    const deliveredMsgIds = new Set(batchMessages.map((m) => m.id));
    incomingQueue = incomingQueue.filter((m) => !deliveredMsgIds.has(m.id));

    // Se ainda restarem mensagens na fila, agenda o envio do próximo lote imediatamente
    if (incomingQueue.length > 0) {
      setTimeout(triggerSyncImmediately, 150);
    }

    // Atualiza cache local de leads autorizados e persiste em disco
    if (data.leads_cache && Array.isArray(data.leads_cache)) {
      const prevLeadCount = leadsRawList.length;
      updateLeadsMemoryCache(data.leads_cache, true);
      if (data.leads_cache.length > prevLeadCount && connectionStatus === 'connected') {
        resolveLeadsLidsViaWhatsApp();
      }
    }

    // Processa fila de envio pendente (mensagens digitadas no CRM)
    if (data.pending_outbox && Array.isArray(data.pending_outbox) && data.pending_outbox.length > 0) {
      if (connectionStatus === 'connected' && sock) {
        for (const outbox of data.pending_outbox) {
          const jid = toWhatsAppJid(outbox.whatsapp);
          try {
            if (outbox.media_url) {
              console.log(`📤 Enviando ${outbox.media_type || 'mídia'} para ${outbox.whatsapp}...`);
              const mediaRes = await fetch(`${config.apiUrl}${outbox.media_url}`);
              if (!mediaRes.ok) throw new Error(`Falha ao baixar mídia: ${mediaRes.statusText}`);
              const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());

              if (outbox.media_type === 'image') {
                await sock.sendMessage(jid, {
                  image: mediaBuffer,
                  caption: outbox.body && outbox.body !== '[Imagem]' ? outbox.body : undefined
                });
              } else if (outbox.media_type === 'audio') {
                await sock.sendMessage(jid, {
                  audio: mediaBuffer,
                  mimetype: outbox.media_mimetype || 'audio/mp4',
                  ptt: true
                });
              } else if (outbox.media_type === 'document') {
                await sock.sendMessage(jid, {
                  document: mediaBuffer,
                  mimetype: outbox.media_mimetype || 'application/pdf',
                  fileName: outbox.media_filename || 'documento.pdf',
                  caption: outbox.body && !outbox.body.startsWith('[Documento') ? outbox.body : undefined
                });
              } else if (outbox.media_type === 'sticker') {
                await sock.sendMessage(jid, {
                  sticker: mediaBuffer
                });
              } else if (outbox.media_type === 'video') {
                await sock.sendMessage(jid, {
                  video: mediaBuffer,
                  caption: outbox.body && outbox.body !== '[Vídeo]' ? outbox.body : undefined
                });
              } else {
                await sock.sendMessage(jid, { text: outbox.body });
              }
            } else {
              console.log(`📤 Enviando mensagem para ${outbox.whatsapp}...`);
              await sock.sendMessage(jid, { text: outbox.body });
            }
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
  // 1. Carrega caches offline (leads + mapeamento LID) imediatamente
  loadLeadsCacheFromDisk();
  loadLidCacheFromDisk();

  // 2. Realiza sync inicial com o CRM na nuvem antes de abrir o socket
  await syncWithCrm();

  // 3. Inicia loop contínuo de sincronização
  setInterval(syncWithCrm, config.syncIntervalMs);

  // 4. Inicia socket do WhatsApp
  await startWhatsApp();
}

bootstrap();
