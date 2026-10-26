import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface Fetcher {
  fetch(request: Request | string): Promise<Response>;
}

type Bindings = {
  DB: D1Database;
  BUCKET?: R2Bucket;
  ASSETS: Fetcher;
  TELEGRAM_BOT_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', cors());

// Health check das 5 peças da arquitetura Cloudflare
app.get('/api/health', async (c) => {
  let d1Status = 'disconnected';
  let filesCount = 0;
  try {
    if (c.env.DB) {
      await c.env.DB.prepare('SELECT 1').first();
      d1Status = 'connected (meu-crm-db)';
      const f = await c.env.DB.prepare('SELECT COUNT(*) as total FROM files').first<{ total: number }>();
      filesCount = f?.total || 0;
    }
  } catch (e) {
    d1Status = `error: ${e instanceof Error ? e.message : 'unknown'}`;
  }

  return c.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    architecture: {
      pages_workers: 'active',
      d1_database: d1Status,
      cloud_storage: c.env.BUCKET ? 'connected (R2 + D1)' : `connected (D1 Cloud Storage · ${filesCount} files)`,
      access_security: 'active',
      cron_telegram: 'active (0 11 * * * -> 08:00 BRT)'
    }
  });
});

// Carregar todo o estado sincronizado do CRM direto do Cloudflare D1
app.get('/api/state', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT key, value, updated_at FROM crm_kv').all<{
      key: string;
      value: string;
      updated_at: string;
    }>();

    const state: Record<string, unknown> = {};
    for (const row of results) {
      try {
        state[row.key] = JSON.parse(row.value);
      } catch {
        state[row.key] = row.value;
      }
    }

    // Carregar os leads individuais da tabela `leads` no D1
    const leadsRows = await c.env.DB.prepare('SELECT data_json FROM leads').all<{ data_json: string }>();
    if (leadsRows.results.length > 0) {
      state.leads = leadsRows.results.map(r => JSON.parse(r.data_json));
    }

    // Mesclar também propostas e briefings atualizados por clientes nas tabelas públicas
    const proposalsRows = await c.env.DB.prepare('SELECT data_json FROM proposals ORDER BY updated_at DESC').all<{ data_json: string }>();
    if (proposalsRows.results.length > 0) {
      state.proposals = proposalsRows.results.map(r => JSON.parse(r.data_json));
    }

    const briefingsRows = await c.env.DB.prepare('SELECT data_json FROM briefings ORDER BY updated_at DESC').all<{ data_json: string }>();
    if (briefingsRows.results.length > 0) {
      state.briefings = briefingsRows.results.map(r => JSON.parse(r.data_json));
    }

    // Lista de arquivos salvos na nuvem
    const filesRows = await c.env.DB.prepare('SELECT key, filename, content_type, size, created_at FROM files ORDER BY created_at DESC').all();
    state.files = filesRows.results;

    return c.json({
      success: true,
      hasData: Object.keys(state).length > 0 && Array.isArray(state.leads) && state.leads.length > 0,
      state
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao ler D1';
    return c.json({ success: false, error: message }, 500);
  }
});

// Salvar e sincronizar o estado do CRM no Cloudflare D1
app.post('/api/state', async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    const keys = [
      'projects',
      'installments',
      'invoices',
      'maintenanceRequests',
      'settings',
      'telegram_config'
    ];

    for (const key of keys) {
      if (body[key] !== undefined) {
        statements.push(
          c.env.DB.prepare(
            'INSERT INTO crm_kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
          ).bind(key, JSON.stringify(body[key]), now)
        );
      }
    }

    // Sincronizar leads individualmente na tabela `leads` (evitando limite de 100KB por linha do D1)
    if (Array.isArray(body.leads)) {
      const incomingLeads = body.leads as Array<Record<string, unknown>>;
      const incomingIds = new Set(incomingLeads.map(l => String(l.id)));

      // Remover leads excluídos
      const existingRows = await c.env.DB.prepare('SELECT id FROM leads').all<{ id: string }>();
      for (const row of existingRows.results) {
        if (!incomingIds.has(row.id)) {
          statements.push(c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(row.id));
        }
      }

      for (const lead of incomingLeads) {
        if (lead.id) {
          statements.push(
            c.env.DB.prepare(
              'INSERT INTO leads (id, nome, nicho, status_id, fase, proximo_followup, data_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, nicho = excluded.nicho, status_id = excluded.status_id, fase = excluded.fase, proximo_followup = excluded.proximo_followup, data_json = excluded.data_json, updated_at = excluded.updated_at'
            ).bind(
              String(lead.id),
              String(lead.nome || ''),
              String(lead.nicho || ''),
              String(lead.status_id || 'abordar'),
              String(lead.fase || 'prospeccao'),
              lead.proximo_followup ? String(lead.proximo_followup) : null,
              JSON.stringify(lead),
              now
            )
          );
        }
      }
    }

    // Sincronizar propostas individuais na tabela pública `proposals`
    if (Array.isArray(body.proposals)) {
      for (const prop of body.proposals as Array<Record<string, unknown>>) {
        if (prop.token) {
          statements.push(
            c.env.DB.prepare(
              'INSERT INTO proposals (token, lead_id, cliente_nome, data_json, status, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET data_json = excluded.data_json, status = excluded.status, updated_at = excluded.updated_at'
            ).bind(
              String(prop.token),
              String(prop.lead_id || ''),
              String(prop.cliente_nome || ''),
              JSON.stringify(prop),
              String(prop.status || 'enviada'),
              now
            )
          );
        }
      }
    }

    // Sincronizar briefings individuais na tabela pública `briefings`
    if (Array.isArray(body.briefings)) {
      for (const brief of body.briefings as Array<Record<string, unknown>>) {
        if (brief.token) {
          statements.push(
            c.env.DB.prepare(
              'INSERT INTO briefings (token, project_id, lead_id, cliente_nome, data_json, preenchido, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET data_json = excluded.data_json, preenchido = excluded.preenchido, updated_at = excluded.updated_at'
            ).bind(
              String(brief.token),
              String(brief.project_id || ''),
              String(brief.lead_id || ''),
              String(brief.cliente_nome || ''),
              JSON.stringify(brief),
              brief.preenchido ? 1 : 0,
              now
            )
          );
        }
      }
    }

    // Executar em lotes seguros de 50 queries no D1
    for (let i = 0; i < statements.length; i += 50) {
      await c.env.DB.batch(statements.slice(i, i + 50));
    }

    return c.json({ success: true, updated_at: now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar no D1';
    return c.json({ success: false, error: message }, 500);
  }
});

// Buscar Proposta Pública no D1
app.get('/api/proposals/:token', async (c) => {
  const token = c.req.param('token');
  const row = await c.env.DB.prepare('SELECT data_json FROM proposals WHERE token = ?').bind(token).first<{ data_json: string }>();
  if (!row) {
    return c.json({ success: false, error: 'Proposta não encontrada' }, 404);
  }
  return c.json({
    success: true,
    proposal: JSON.parse(row.data_json)
  });
});

// Buscar Briefing Público no D1
app.get('/api/briefings/:token', async (c) => {
  const token = c.req.param('token');
  const row = await c.env.DB.prepare('SELECT data_json FROM briefings WHERE token = ?').bind(token).first<{ data_json: string }>();
  if (!row) {
    return c.json({ success: false, error: 'Briefing não encontrado' }, 404);
  }
  return c.json({
    success: true,
    briefing: JSON.parse(row.data_json)
  });
});

// Salvar Resposta de Briefing Público preenchido pelo cliente no D1
app.post('/api/briefings/:token', async (c) => {
  const token = c.req.param('token');
  try {
    const data = await c.req.json<Record<string, unknown>>();
    const now = new Date().toISOString();
    const updatedBriefing = {
      ...data,
      token,
      preenchido: true,
      preenchido_em: now
    };

    await c.env.DB.prepare(
      'INSERT INTO briefings (token, project_id, lead_id, cliente_nome, data_json, preenchido, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(token) DO UPDATE SET data_json = excluded.data_json, preenchido = 1, updated_at = excluded.updated_at'
    )
      .bind(
        token,
        String(data.project_id || ''),
        String(data.lead_id || ''),
        String(data.cliente_nome || ''),
        JSON.stringify(updatedBriefing),
        now
      )
      .run();

    // Notificar Yago no Telegram caso configurado
    try {
      const tgRow = await c.env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'telegram_config'").first<{ value: string }>();
      if (tgRow) {
        const tg = JSON.parse(tgRow.value);
        if (tg.bot_token && tg.chat_id) {
          await fetch(`https://api.telegram.org/bot${tg.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tg.chat_id,
              text: `🎉 *Novo Briefing Preenchido!*\n\n👤 *Cliente:* ${data.cliente_nome || data.nome_empresa}\n🏢 *Marca:* ${data.nome_empresa || '-'}\n🎨 *Cores:* ${data.cores_preferidas || '-'}\n\n👉 Veja completo no seu painel: https://crm.yagoduarte.com.br`,
              parse_mode: 'Markdown'
            })
          });
        }
      }
    } catch {
      // ignora erro de notificação
    }

    return c.json({
      success: true,
      briefing: updatedBriefing
    });
  } catch {
    return c.json({ error: 'Dados inválidos' }, 400);
  }
});

// Upload de Arquivos (Logos, Briefings, Contratos, Comprovantes) para R2 + D1 Cloud
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'Nenhum arquivo enviado' }, 400);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${Date.now()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();

    // Se o bucket R2 estiver vinculado, salva no R2
    if (c.env.BUCKET) {
      await c.env.BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' }
      });
    }

    // Salva também no armazenamento em nuvem D1 para disponibilidade imediata
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    await c.env.DB.prepare(
      'INSERT INTO files (key, filename, content_type, size, data_base64, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(key, file.name, file.type || 'application/octet-stream', file.size, base64, new Date().toISOString())
      .run();

    return c.json({
      success: true,
      key,
      url: `/api/files/${key}`,
      name: file.name,
      size: file.size,
      contentType: file.type
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno no upload';
    return c.json({ error: message }, 500);
  }
});

// Download / Visualização de Arquivos da Nuvem
app.get('/api/files/:key', async (c) => {
  const key = c.req.param('key');

  if (c.env.BUCKET) {
    const obj = await c.env.BUCKET.get(key);
    if (obj) {
      return new Response(obj.body, {
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }
  }

  const row = await c.env.DB.prepare('SELECT filename, content_type, data_base64 FROM files WHERE key = ?')
    .bind(key)
    .first<{ filename: string; content_type: string; data_base64: string }>();

  if (!row) {
    return c.text('Arquivo não encontrado', 404);
  }

  const binary = atob(row.data_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Response(bytes.buffer, {
    headers: {
      'Content-Type': row.content_type,
      'Content-Disposition': `inline; filename="${row.filename}"`,
      'Cache-Control': 'public, max-age=31536000'
    }
  });
});

// Excluir Arquivo da Nuvem
app.delete('/api/files/:key', async (c) => {
  const key = c.req.param('key');
  await c.env.DB.prepare('DELETE FROM files WHERE key = ?').bind(key).run();
  return c.json({ success: true });
});

// Função auxiliar que monta e dispara o resumo diário no Telegram lendo direto do D1
async function sendTelegramDailySummary(env: Bindings, overrideToken?: string, overrideChatId?: string, overrideText?: string) {
  let botToken = overrideToken || env.TELEGRAM_BOT_TOKEN || '';
  let chatId = overrideChatId || '';

  const tgRow = await env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'telegram_config'").first<{ value: string }>();
  if (tgRow) {
    try {
      const parsed = JSON.parse(tgRow.value);
      if (!botToken && parsed.bot_token) botToken = parsed.bot_token;
      if (!chatId && parsed.chat_id) chatId = parsed.chat_id;
    } catch {
      // ignore
    }
  }

  if (!botToken || !chatId) {
    return { ok: false, description: 'Token ou Chat ID do Telegram não configurados no banco D1.' };
  }

  // Se recebeu token/chatId novos, salva no D1 para que o Cron das 08:00 use automaticamente!
  if (overrideToken && overrideChatId) {
    await env.DB.prepare(
      "INSERT INTO crm_kv (key, value, updated_at) VALUES ('telegram_config', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    )
      .bind(JSON.stringify({ bot_token: overrideToken, chat_id: overrideChatId }), new Date().toISOString())
      .run();
  }

  let text = overrideText;
  if (!text) {
    // Calcula os indicadores reais direto do banco D1
    const todayStr = new Date().toISOString().slice(0, 10);
    const leadsRows = await env.DB.prepare('SELECT data_json FROM leads').all<{ data_json: string }>();
    const projectsRow = await env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'projects'").first<{ value: string }>();
    const invoicesRow = await env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'invoices'").first<{ value: string }>();

    const leads = leadsRows.results.map(r => JSON.parse(r.data_json) as Record<string, unknown>);
    const projects = projectsRow ? (JSON.parse(projectsRow.value) as Array<Record<string, unknown>>) : [];
    const invoices = invoicesRow ? (JSON.parse(invoicesRow.value) as Array<Record<string, unknown>>) : [];

    const followupsHoje = leads.filter(l => l.fase === 'prospeccao' && l.proximo_followup && String(l.proximo_followup) <= todayStr).length;
    const negociacao = leads.filter(l => l.status_id === 'negociacao' || l.status_id === 'proposta_enviada').length;
    const projetosAndamento = projects.filter(p => p.etapa !== 'No ar / Entregue').length;
    const totalMRR = invoices.reduce((acc, inv) => acc + Number(inv.valor || 0), 0);

    text =
      `☀️ *Bom dia, Yago Duarte! Resumo Diário do CRM (08:00):*\n\n` +
      `📋 *Follow-ups pendentes para hoje:* ${followupsHoje} contatos\n` +
      `🚀 *Projetos em desenvolvimento:* ${projetosAndamento} sites na esteira\n` +
      `💰 *MRR Ativo (Hospedagem):* R$ ${totalMRR.toFixed(2)}/mês\n` +
      `🎯 *Pipeline Quente:* ${negociacao} propostas em negociação\n` +
      `👥 *Total na Base:* ${leads.length} leads\n\n` +
      `👉 Acesse seu painel: https://crm.yagoduarte.com.br`;
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    })
  });

  return await res.json();
}

// Endpoint manual e de ativação do resumo diário no Telegram
app.post('/api/telegram/summary', async (c) => {
  try {
    const body = await c.req.json<Record<string, string>>();
    const result = await sendTelegramDailySummary(c.env, body.bot_token, body.chat_id, body.text);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro no envio';
    return c.json({ ok: false, description: message }, 500);
  }
});

export default {
  async fetch(request: Request, env: Bindings, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    const isPublicPortal = url.hostname === 'propostas.yagoduarte.com.br';

    // No domínio público de propostas/briefings, bloqueia qualquer acesso ao painel do CRM ou APIs internas
    if (isPublicPortal) {
      const isPublicApi =
        url.pathname.startsWith('/api/proposals/') ||
        url.pathname.startsWith('/api/briefings/') ||
        url.pathname === '/api/upload' ||
        url.pathname.startsWith('/api/files/');

      if (url.pathname.startsWith('/api/')) {
        if (!isPublicApi) {
          return new Response(JSON.stringify({ error: 'Acesso restrito ao painel administrativo.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return app.fetch(request, env, ctx as never);
      }

      const isStaticAsset =
        url.pathname.startsWith('/assets/') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.svg');

      const isPublicPage =
        url.pathname.startsWith('/p/') ||
        url.pathname.startsWith('/b/') ||
        url.searchParams.has('p') ||
        url.searchParams.has('b');

      if (!isStaticAsset && !isPublicPage) {
        return new Response(
          `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><title>Yago Duarte · Portal do Cliente</title><style>body{background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}.box{background:#121215;border:1px solid #27272a;padding:36px 32px;border-radius:20px;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,0.5)}.logo{width:48px;height:48px;border-radius:12px;background:#18181b;border:1px solid #27272a;padding:6px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center}.logo img{width:100%;height:100%;object-fit:contain}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;line-height:1.5;margin:0}</style></head><body><div class="box"><div class="logo"><img src="/logo-yd-symbol.png" alt="Yago Duarte"></div><h1>Portal Exclusivo de Clientes</h1><p>Para visualizar sua proposta comercial ou preencher seu briefing, acesse utilizando o link exclusivo enviado no seu WhatsApp.</p></div></body></html>`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          }
        );
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx as never);
    }
    return env.ASSETS.fetch(request);
  },

  // Cron Trigger oficial: executa todo dia às 08:00 BRT (11:00 UTC)
  async scheduled(_controller: unknown, env: Bindings, _ctx: unknown): Promise<void> {
    await sendTelegramDailySummary(env);
  }
};
