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
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', cors());

// Helper para consultar o Google Gemini (gemini-3.5-flash-lite)
async function callGemini(env: Bindings, prompt: string, jsonMode = false): Promise<string> {
  let apiKey = env.GEMINI_API_KEY || '';
  let model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    try {
      const row = await env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'gemini_config'").first<{ value: string }>();
      if (row) {
        const parsed = JSON.parse(row.value);
        if (parsed.api_key) apiKey = parsed.api_key;
        if (parsed.model) model = parsed.model;
      }
    } catch {
      // ignore
    }
  }

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {})
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro Gemini (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const parts = data.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find(p => typeof p.text === 'string' && p.text.trim().length > 0);
  return textPart?.text?.trim() || '';
}

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
      cron_telegram: 'active (0 11 * * * -> 08:00 BRT)',
      gemini_ai: `active (${c.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'})`
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

    // Carregar os leads individuais da tabela `leads` no D1 sincronizando colunas e JSON
    const leadsRows = await c.env.DB.prepare('SELECT status_id, fase, proximo_followup, data_json FROM leads').all<{
      status_id: string;
      fase: string;
      proximo_followup: string | null;
      data_json: string;
    }>();
    if (leadsRows.results.length > 0) {
      state.leads = leadsRows.results.map(r => {
        const parsed = JSON.parse(r.data_json);
        if (r.status_id) parsed.status_id = r.status_id;
        if (r.fase) parsed.fase = r.fase;
        parsed.proximo_followup = r.proximo_followup || undefined;
        return parsed;
      });
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

// Helper para disparar alertas em tempo real no Telegram de Yago
async function sendTelegramRealtimeAlert(env: Bindings, text: string): Promise<void> {
  try {
    let botToken = env.TELEGRAM_BOT_TOKEN || '';
    let chatId = '';

    const tgRow = await env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'telegram_config'").first<{ value: string }>();
    if (tgRow) {
      const tg = JSON.parse(tgRow.value);
      if (!botToken && tg.bot_token) botToken = tg.bot_token;
      if (tg.chat_id) chatId = tg.chat_id;
    }

    if (!botToken || !chatId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch {
    // ignora erro de rede no alerta em tempo real
  }
}

// Buscar Proposta Pública no D1
app.get('/api/proposals/:token', async (c) => {
  const token = c.req.param('token');
  const row = await c.env.DB.prepare('SELECT data_json FROM proposals WHERE token = ?').bind(token).first<{ data_json: string }>();
  if (!row) {
    return c.json({ success: false, error: 'Proposta não encontrada' }, 404);
  }

  let whatsappComercial = '5511945987666';
  try {
    const settingsRow = await c.env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'settings'").first<{ value: string }>();
    if (settingsRow) {
      const s = JSON.parse(settingsRow.value);
      if (s.whatsappComercial) whatsappComercial = s.whatsappComercial;
    }
  } catch {}

  return c.json({
    success: true,
    proposal: JSON.parse(row.data_json),
    whatsapp_comercial: whatsappComercial,
  });
});

// Registrar Evento em Tempo Real na Proposta Pública (Visualizada ou Aceita) + Alerta Telegram
app.post('/api/proposals/:token/event', async (c) => {
  const token = c.req.param('token');
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const eventType = String(body.event || 'viewed');
    const now = new Date().toISOString();

    let clienteNome = String(body.cliente_nome || 'Cliente');
    let nicho = String(body.nicho || 'Negócios');
    let implantacao = Number(body.implantacao || 1200);
    let mensalidade = Number(body.mensalidade || 89);

    const row = await c.env.DB.prepare('SELECT data_json FROM proposals WHERE token = ?').bind(token).first<{ data_json: string }>();
    if (row) {
      const prop = JSON.parse(row.data_json) as Record<string, unknown>;
      clienteNome = String(prop.cliente_nome || clienteNome);
      nicho = String(prop.nicho || nicho);
      implantacao = Number(prop.implantacao || implantacao);
      mensalidade = Number(prop.mensalidade || mensalidade);

      if (eventType === 'accepted') {
        prop.status = 'aceita';
        prop.accepted_at = now;
        await c.env.DB.prepare('UPDATE proposals SET data_json = ?, status = ?, updated_at = ? WHERE token = ?')
          .bind(JSON.stringify(prop), 'aceita', now, token)
          .run();
      }
    }

    if (eventType === 'accepted') {
      await sendTelegramRealtimeAlert(
        c.env,
        `🎉 *Proposta Aprovada pelo Cliente!*\n\n👤 *Cliente:* ${clienteNome} (${nicho})\n💰 *Valor:* R$ ${implantacao.toFixed(2)} + R$ ${mensalidade.toFixed(2)}/mês\n\n🔥 O cliente acabou de clicar em *Aceitar Proposta*!`
      );
    } else {
      await sendTelegramRealtimeAlert(
        c.env,
        `👀 *Proposta Sendo Visualizada Agora!*\n\n👤 *Cliente:* ${clienteNome} (${nicho})\n💰 *Proposta:* R$ ${implantacao.toFixed(2)}\n\n💡 _Timing perfeito para mandar um "Oi, conseguiu abrir?" no WhatsApp!_`
      );
    }

    return c.json({ ok: true, success: true });
  } catch {
    return c.json({ ok: false, success: false }, 400);
  }
});

// Buscar Briefing Público no D1
app.get('/api/briefings/:token', async (c) => {
  const token = c.req.param('token');
  const row = await c.env.DB.prepare('SELECT data_json FROM briefings WHERE token = ?').bind(token).first<{ data_json: string }>();
  if (!row) {
    return c.json({ success: false, error: 'Briefing não encontrado' }, 404);
  }

  let whatsappComercial = '5511945987666';
  try {
    const settingsRow = await c.env.DB.prepare("SELECT value FROM crm_kv WHERE key = 'settings'").first<{ value: string }>();
    if (settingsRow) {
      const s = JSON.parse(settingsRow.value);
      if (s.whatsappComercial) whatsappComercial = s.whatsappComercial;
    }
  } catch {}

  return c.json({
    success: true,
    briefing: JSON.parse(row.data_json),
    whatsapp_comercial: whatsappComercial,
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

    // Notificar Yago no Telegram em tempo real
    await sendTelegramRealtimeAlert(
      c.env,
      `📋 *Novo Briefing Preenchido!*\n\n👤 *Cliente:* ${data.cliente_nome || data.nome_empresa}\n🏢 *Marca:* ${data.nome_empresa || '-'}\n🎯 *Serviços:* ${data.servicos_principais || '-'}\n🎨 *Cores:* ${data.cores_preferidas || '-'}\n\n👉 Veja completo e gere a Copy IA no painel: https://crm.yagoduarte.com.br`
    );

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

// Endpoint de Inteligência Artificial (Google Gemini gemini-3.5-flash-lite)
app.post('/api/ai/generate', async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const action = String(body.action || '');

    // 1. Copiloto de WhatsApp & Quebra de Objeções
    if (action === 'whatsapp_message') {
      const lead = (body.lead || {}) as Record<string, unknown>;
      const intent = String(body.intent || 'primeiro_contato');
      const objectionText = String(body.objection || body.objectionText || '');

      const intentInstructions: Record<string, string> = {
        primeiro_contato: `Você NÃO deve criar uma mensagem única e longa para ser disparada toda de uma vez.
Em vez disso, você deve criar um SCRIPT CONVERSACIONAL EM ETAPAS (bate-papo real de WhatsApp entre Yago Duarte e o cliente). O tom deve ser leve, conversado, natural, próximo e profissional (sem excesso de formalidade e sem parecer vendedor chato ou robô).

O script deve conter EXATAMENTE estas 3 etapas:

[MENSAGEM 1 - Enviar primeiro]
(Quebre o gelo com simpatia dizendo que encontrou o trabalho deles enquanto conhecia profissionais da área de [nicho]. Faça um elogio sincero ao perfil no Instagram e avaliações no Google. Termine com uma pergunta aberta e curiosa para puxar assunto de forma natural: "Uma dúvida por curiosidade: hoje a maior parte dos clientes novos de vocês costuma vir mais por indicação (boca a boca) ou pelo Instagram mesmo?").

---
[AGUARDAR RESPOSTA DO CLIENTE]
---

[MENSAGEM 2 - Após o cliente responder de onde vêm os clientes]
(Comente a resposta dele de forma simpática. Diga que perguntou isso porque percebeu que eles ainda não possuem um site próprio oficial. Toque no ponto da CREDIBILIDADE, AUTORIDADE e PROFISSIONALISMO: no Google, quando uma pessoa pesquisa por [serviços do nicho na cidade] querendo atendimento rápido, ter uma página própria passa muito mais confiança na hora de decidir agendar, além de pegar quem já está procurando no momento exato).

---
[AGUARDAR RESPOSTA DO CLIENTE]
---

[MENSAGEM 3 - Apresentar seu trabalho e pedir permissão para enviar exemplo]
(Fale que trabalha com desenvolvimento de sites focados exatamente em passar essa credibilidade e facilitar o agendamento direto no WhatsApp. Diga que teve uma ideia bem legal para o segmento deles e pergunte de forma leve se pode mostrar um EXEMPLO de site que desenvolveu para a área de [nicho]: "Posso te mandar um exemplo de site que desenvolvi para a área de [nicho], só para você dar uma olhada de como ficaria?").

Regras obrigatórias:
1. Adapte os termos específicos ao nicho (${lead.nicho || 'Negócios Locais'}) e ao nome da empresa (${lead.nome || 'Cliente'}).
2. Se o lead tiver site cadastrado (${lead.site_atual || ''}), na Mensagem 1 pergunte se os clientes chegam por indicação, Instagram ou pelo site; e na Mensagem 2 comente que percebeu que o site atual pode ser modernizado para passar mais credibilidade e converter melhor no celular.
3. NUNCA diga que já fez uma prévia pronta exclusiva para a empresa dele. Você deve dizer que desenvolveu um EXEMPLO de site para a área dele e perguntar com simpatia se pode mostrar esse exemplo.
4. Mantenha os marcadores [MENSAGEM 1 - Enviar primeiro], [AGUARDAR RESPOSTA DO CLIENTE], [MENSAGEM 2 ...] e [MENSAGEM 3 ...], pois o painel utiliza esses marcadores para organizar o roteiro.`,

        envio_previa: `Gere uma mensagem de WhatsApp para apresentar o site de demonstração que você (Yago Duarte) desenvolveu como modelo para o nicho de ${lead.nicho || 'Negócios'}:
${lead.link_previa ? `Link do site de demonstração a incluir: ${lead.link_previa}` : '(Inclua o espaço para o link do site de demonstração)'}
Apresente o exemplo com entusiasmo profissional, destacando a rapidez no celular, a apresentação clara dos serviços e o botão de agendamento direto no WhatsApp. Pergunte o que achou da ideia e da estrutura.`,

        followup_resgate:
          'Crie uma mensagem curta, educada e sem pressão de follow-up para um lead que recebeu o primeiro contato ou o link do site de demonstração há alguns dias e ainda não respondeu. Deixe muito fácil responder com apenas um "oi, vi sim" ou "pode mandar".',

        quebra_objecao:
          `O cliente respondeu com a seguinte objeção ou dúvida: "${objectionText || 'Achei o valor alto / vou pensar'}". Crie uma resposta persuasiva, empática e consultiva de Yago Duarte contornando essa objeção com foco em retorno sobre investimento (quantos clientes novos 1 único fechamento no mês já paga o site) e facilidade de pagamento (50% entrada e 50% na entrega).`
      };

      const prompt = `Você é Yago Duarte, web designer e desenvolvedor especialista em Landing Pages e Sites de Alta Conversão no Brasil.
Dados do Lead:
- Nome / Empresa: ${lead.nome || 'Cliente'}
- Nicho: ${lead.nicho || 'Negócios Locais'}
- Presença Digital Atual: ${lead.presenca_digital || 'Sem site'}
- Site Atual: ${lead.site_atual || 'Não possui'}
- Status no Funil: ${lead.status_id || 'abordar'}
- Valor de Implantação: R$ ${lead.implantacao || 1200} (Mensalidade: R$ ${lead.mensalidade || 89}/mês)
- Observações Internas: ${lead.observacoes || 'Nenhuma'}

Objetivo da mensagem:
${intentInstructions[intent] || intentInstructions.primeiro_contato}

Regras:
- Escreva APENAS o texto final da mensagem pronta para colar no WhatsApp (sem aspas em volta, sem explicações antes ou depois).
- Use tom humano, profissional, próximo e direto (português do Brasil).`;

      const message = await callGemini(c.env, prompt, false);
      return c.json({ ok: true, success: true, result: message, message });
    }

    // 2. Raio-X Comercial & Roteiro de Áudio de 20s por Lead
    if (action === 'lead_xray') {
      const lead = (body.lead || {}) as Record<string, unknown>;
      const prompt = `Você é um estrategista comercial sênior ajudando Yago Duarte (desenvolvedor de Landing Pages de alta conversão) a fechar uma venda.
Analise este Lead:
- Empresa/Cliente: ${lead.nome || 'Cliente'}
- Nicho: ${lead.nicho || 'Negócios'}
- Presença Digital Atual: ${lead.presenca_digital || 'Sem site'}
- Site Atual: ${lead.site_atual || 'Não possui'}
- Origem: ${lead.origem || 'Google Maps'}
- Valor Proposto: R$ ${lead.implantacao || 1200} + R$ ${lead.mensalidade || 89}/mês
- Observações: ${lead.observacoes || 'Nenhuma'}

Retorne um JSON válido exatamente com esta estrutura:
{
  "diagnostico": "1 frase direta explicando onde esse negócio está perdendo clientes hoje e por que precisa da Landing Page.",
  "argumentos": [
    "Argumento 1 focado em lucro/autoridade no nicho específico",
    "Argumento 2 focado em conversão no WhatsApp e Google/Ads",
    "Argumento 3 focado em velocidade e segurança (50% entrada / 50% na entrega)"
  ],
  "roteiro_audio_20s": "Texto falado natural de 20 segundos para o Yago gravar em áudio no WhatsApp para esse cliente."
}`;

      const raw = await callGemini(c.env, prompt, true);
      const parsed = JSON.parse(raw);
      return c.json({ ok: true, success: true, result: parsed, data: parsed });
    }

    // 3. Personalizador Inteligente de Proposta Pública (/p/:token)
    if (action === 'personalize_proposal') {
      const lead = (body.lead || {}) as Record<string, unknown>;
      const prazoDias = Number(body.prazo_dias || 7);

      const prompt = `Você é Yago Duarte, especialista em criação de Landing Pages e Sites de Alta Conversão.
Crie uma proposta comercial altamente persuasiva e personalizada para:
- Cliente: ${lead.nome || 'Cliente'}
- Nicho: ${lead.nicho || 'Negócios'}
- Situação atual: ${lead.presenca_digital || 'Sem site'}
- Observações: ${lead.observacoes || ''}
- Prazo de entrega: ${prazoDias} dias úteis

Retorne APENAS um JSON válido com a seguinte estrutura exata:
{
  "titulo_proposta": "Título forte e específico para o cliente e seu nicho",
  "apresentacao": "Parágrafo persuasivo de 3 a 4 linhas mostrando como a nova estrutura web vai posicionar a marca como referência em seu nicho e transformar visitantes em clientes qualificados no WhatsApp.",
  "itens": [
    { "id": "1", "titulo": "Design Visual Exclusivo", "descricao": "Descrição adaptada ao nicho do cliente", "incluso": true },
    { "id": "2", "titulo": "Copywriting Persuasivo para o Nicho", "descricao": "Descrição adaptada ao nicho do cliente", "incluso": true },
    { "id": "3", "titulo": "Desenvolvimento Mobile-First Ultra Rápido", "descricao": "Descrição adaptada ao nicho do cliente", "incluso": true },
    { "id": "4", "titulo": "Funil Direto para Agendamento no WhatsApp", "descricao": "Descrição adaptada ao nicho do cliente", "incluso": true },
    { "id": "5", "titulo": "SEO Local & Velocidade 90+ no Google", "descricao": "Descrição adaptada ao nicho do cliente", "incluso": true },
    { "id": "6", "titulo": "Rastreamento Pixel Meta & Google Ads", "descricao": "Descrição adaptada ao nicho do cliente", "incluso": true }
  ]
}`;

      const raw = await callGemini(c.env, prompt, true);
      const parsed = JSON.parse(raw);
      return c.json({ ok: true, success: true, result: parsed, data: parsed });
    }

    // 4. Gerador de Copy & Estrutura da Landing Page a partir do Briefing (/b/:token)
    if (action === 'briefing_to_copy') {
      const briefing = (body.briefing || {}) as Record<string, unknown>;
      const prompt = `Você é um Copywriter Sênior e Arquiteto de Conversão especialista em Landing Pages brasileiras.
Com base nos dados deste Briefing do cliente, crie a estrutura completa e a copy pronta para a Landing Page:
- Empresa / Marca: ${briefing.nome_empresa || briefing.cliente_nome || 'Cliente'}
- Slogan / Posicionamento: ${briefing.slogan_posicionamento || 'Não informado'}
- Público-Alvo: ${briefing.publico_alvo || 'Clientes em busca de atendimento especializado'}
- Serviços Principais: ${briefing.servicos_principais || 'Atendimento especializado'}
- Diferenciais: ${briefing.diferenciais || 'Atendimento personalizado e excelência'}
- Cores Preferidas: ${briefing.cores_preferidas || 'Tons elegantes e modernos'}
- Referências: ${briefing.sites_referencia || ''}
- Observações: ${briefing.observacoes_adicionais || ''}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "headline": "Promessa principal magnética para a Dobra 1 (Hero)",
  "subheadline": "Subtítulo complementar quebrando a principal objeção e gerando desejo",
  "cta_texto": "Texto do botão principal de ação (WhatsApp)",
  "paleta_sugerida": ["#10b981", "#09090b", "#f4f4f5"],
  "tipografia_sugerida": "Sugestão de par de fontes Google Fonts",
  "secoes": [
    { "dobra": "Dobra 1 · Hero & Promessa", "objetivo": "Capturar atenção imediata", "copy_sugerida": "Texto persuasivo pronto para usar" },
    { "dobra": "Dobra 2 · Identificação & Autoridade", "objetivo": "Gerar conexão e confiança", "copy_sugerida": "Texto persuasivo pronto para usar" },
    { "dobra": "Dobra 3 · Serviços & Soluções", "objetivo": "Apresentar serviços com foco em benefício", "copy_sugerida": "Apresentação dos principais serviços" },
    { "dobra": "Dobra 4 · Diferenciais & Prova Social", "objetivo": "Eliminar insegurança", "copy_sugerida": "Por que escolher a empresa" }
  ],
  "faq": [
    { "pergunta": "Pergunta frequente 1 do nicho", "resposta": "Resposta persuasiva 1" },
    { "pergunta": "Pergunta frequente 2 do nicho", "resposta": "Resposta persuasiva 2" },
    { "pergunta": "Pergunta frequente 3 do nicho", "resposta": "Resposta persuasiva 3" }
  ]
}`;

      const raw = await callGemini(c.env, prompt, true);
      const parsed = JSON.parse(raw);
      return c.json({ ok: true, success: true, result: parsed, data: parsed });
    }

    // 6. Cadastro Mágico via Texto Bruto do Google Maps / Instagram
    if (action === 'parse_raw_lead') {
      const rawText = String(body.rawText || '');
      const prompt = `Extraia os dados estruturados de prospecção a partir do texto bruto abaixo (copiado do Google Maps, Instagram ou WhatsApp).
Texto bruto:
"""
${rawText}
"""

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "nome": "Nome da empresa ou profissional",
  "nicho": "Nicho principal em português (ex: Estética, Odontologia, Advocacia, Barbearia, Academia, Imobiliária, Restaurante, Oficina, etc.)",
  "whatsapp": "Apenas dígitos do telefone/WhatsApp com DDD (ex: 11999998888) ou vazio se não houver",
  "instagram": "@usuario se encontrado ou vazio",
  "site_atual": "domínio/URL do site se houver ou vazio",
  "presenca_digital": "Escolha exatamente um: 'Sem site', 'Só Instagram', 'Só Google Meu Negócio', 'Site desatualizado/lento', 'Site bom'",
  "origem": "Escolha exatamente um: 'Google Maps', 'Instagram', 'Indicação', 'Scraper', 'Outro'",
  "observacoes": "Resumo curto de endereço, nota/avaliações, especialidades ou detalhes úteis encontrados no texto"
}`;

      const raw = await callGemini(c.env, prompt, true);
      const parsed = JSON.parse(raw);
      return c.json({ ok: true, success: true, result: parsed, data: parsed });
    }

    return c.json({ success: false, error: 'Ação de IA desconhecida' }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na geração com IA';
    return c.json({ success: false, error: message }, 500);
  }
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

    const pendingLeads = leads.filter(l => {
      const st = String(l.status_id || '');
      const isClosed = st.startsWith('recusou_') || st.startsWith('sem_resp_') || st === 'parou_responder' || st === 'fechado';
      return l.fase === 'prospeccao' && !isClosed && l.proximo_followup && String(l.proximo_followup) <= todayStr;
    });
    const followupsHoje = pendingLeads.length;
    const negociacao = leads.filter(l => l.status_id === 'negociacao' || l.status_id === 'proposta_enviada').length;
    const projetosAndamento = projects.filter(p => p.etapa !== 'No ar / Entregue').length;
    const totalMRR = invoices.reduce((acc, inv) => acc + Number(inv.valor || 0), 0);

    // 5. Resumo Matinal Inteligente com Gemini (Top 3 prioridades do dia)
    let aiTacticalBlock = '';
    try {
      const topCandidates = (pendingLeads.length > 0 ? pendingLeads : leads.filter(l => l.fase === 'prospeccao')).slice(0, 3);
      if (topCandidates.length > 0) {
        const summaryList = topCandidates
          .map(l => `- ${l.nome} (${l.nicho}, ${l.presenca_digital}, status: ${l.status_id}, R$ ${l.implantacao || 1200})`)
          .join('\n');
        const aiPrompt = `Você é o copiloto comercial de Yago Duarte. Liste em 3 linhas curtas (1 para cada lead abaixo) uma dica prática de abordagem para fechar venda hoje no WhatsApp. Não use caracteres especiais de Markdown que quebrem o Telegram (evite _ ou * soltos).
Leads prioritários de hoje:
${summaryList}`;
        const aiAdvice = await callGemini(env, aiPrompt, false);
        if (aiAdvice) {
          aiTacticalBlock = `\n\n🧠 *Foco Tático IA (Top 3 de Hoje):*\n${aiAdvice.replace(/[*_`[\]]/g, '')}`;
        }
      }
    } catch {
      // Continua envio normal caso a IA falhe
    }

    text =
      `☀️ *Bom dia, Yago Duarte! Resumo Diário do CRM (08:00):*\n\n` +
      `📋 *Follow-ups pendentes para hoje:* ${followupsHoje} contatos\n` +
      `🚀 *Projetos em desenvolvimento:* ${projetosAndamento} sites na esteira\n` +
      `💰 *MRR Ativo (Hospedagem):* R$ ${totalMRR.toFixed(2)}/mês\n` +
      `🎯 *Pipeline Quente:* ${negociacao} propostas em negociação\n` +
      `👥 *Total na Base:* ${leads.length} leads` +
      aiTacticalBlock +
      `\n\n👉 Acesse seu painel: https://crm.yagoduarte.com.br`;
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

// ==========================================
// INTEGRAÇÃO WHATSAPP (PONTE LOCAL BAILEYS)
// ==========================================

function cleanPhoneDigits(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

function getPhoneVariants(phone: string): string[] {
  const digits = cleanPhoneDigits(phone);
  if (!digits) return [];
  const variants = new Set<string>();
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

// Status da conexão do WhatsApp (verificado pelo frontend)
app.get('/api/whatsapp/status', async (c) => {
  try {
    const session = await c.env.DB.prepare(
      'SELECT status, phone, qr_code, last_ping, updated_at FROM whatsapp_session WHERE id = ?'
    ).bind('default').first<{
      status: string;
      phone: string | null;
      qr_code: string | null;
      last_ping: number | null;
      updated_at: string | null;
    }>();

    const now = Date.now();
    const isOnline = !!(session?.last_ping && (now - session.last_ping < 20000));

    return c.json({
      connected: session?.status === 'connected' && isOnline,
      status: isOnline ? (session?.status || 'disconnected') : 'offline',
      phone: session?.phone || null,
      qr_code: isOnline && session?.status === 'qr_ready' ? session.qr_code : null,
      last_ping: session?.last_ping || null,
      online: isOnline
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar status';
    return c.json({ connected: false, status: 'error', error: message }, 500);
  }
});

// Histórico de mensagens trocadas com o lead
app.get('/api/whatsapp/chat/:leadId', async (c) => {
  const leadId = c.req.param('leadId');
  try {
    const messages = await c.env.DB.prepare(
      'SELECT id, lead_id, whatsapp, from_me, body, timestamp, status, created_at FROM whatsapp_messages WHERE lead_id = ? ORDER BY timestamp ASC'
    ).bind(leadId).all<{
      id: string;
      lead_id: string;
      whatsapp: string;
      from_me: number;
      body: string;
      timestamp: number;
      status: string;
      created_at: string;
    }>();

    return c.json({
      success: true,
      messages: messages.results || []
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar mensagens';
    return c.json({ error: message }, 500);
  }
});

// Envia mensagem pelo CRM (enfileira para a ponte local disparar no WhatsApp)
app.post('/api/whatsapp/send', async (c) => {
  try {
    const { leadId, text } = await c.req.json<{ leadId: string; text: string }>();
    if (!leadId || !text || !text.trim()) {
      return c.json({ error: 'Lead e texto são obrigatórios' }, 400);
    }

    const leadRow = await c.env.DB.prepare(
      'SELECT id, nome, data_json FROM leads WHERE id = ?'
    ).bind(leadId).first<{ id: string; nome: string; data_json: string }>();

    if (!leadRow) {
      return c.json({ error: 'Lead não encontrado' }, 404);
    }

    const leadData = JSON.parse(leadRow.data_json || '{}');
    const rawPhone = leadData.whatsapp || leadData.telefone || '';
    const phone = cleanPhoneDigits(rawPhone);
    if (!phone) {
      return c.json({ error: 'Lead não possui número de WhatsApp cadastrado' }, 400);
    }

    const now = Date.now();
    const isoNow = new Date().toISOString();
    const msgId = `msg_${now}_${Math.random().toString(36).substring(2, 8)}`;

    // Salva no histórico de mensagens do CRM
    await c.env.DB.prepare(
      'INSERT INTO whatsapp_messages (id, lead_id, whatsapp, from_me, body, timestamp, status, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?)'
    ).bind(msgId, leadId, phone, text.trim(), now, 'pending', isoNow).run();

    // Enfileira no outbox para a ponte disparar
    await c.env.DB.prepare(
      'INSERT INTO whatsapp_outbox (id, lead_id, whatsapp, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(msgId, leadId, phone, text.trim(), 'pending', isoNow).run();

    // Atualiza ultimo_contato do lead
    leadData.ultimo_contato = isoNow;
    await c.env.DB.prepare(
      'UPDATE leads SET data_json = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(leadData), isoNow, leadId).run();

    return c.json({
      success: true,
      messageId: msgId,
      message: {
        id: msgId,
        lead_id: leadId,
        whatsapp: phone,
        from_me: 1,
        body: text.trim(),
        timestamp: now,
        status: 'pending',
        created_at: isoNow
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
    return c.json({ error: message }, 500);
  }
});

// Sincronização entre a ponte local no PC e o Cloudflare D1
app.post('/api/whatsapp/sync', async (c) => {
  try {
    const body = await c.req.json<{
      status?: string;
      phone?: string;
      qr_code?: string | null;
      sent_outbox_ids?: string[];
      failed_outbox_ids?: Array<{ id: string; error?: string }>;
      incoming_messages?: Array<{
        id: string;
        phone: string;
        body: string;
        timestamp: number;
        from_me: boolean;
      }>;
    }>();

    const now = Date.now();
    const isoNow = new Date().toISOString();

    // 1. Atualiza estado da sessão
    if (body.status) {
      await c.env.DB.prepare(
        `INSERT INTO whatsapp_session (id, status, phone, qr_code, last_ping, updated_at)
         VALUES ('default', ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           phone = COALESCE(excluded.phone, whatsapp_session.phone),
           qr_code = excluded.qr_code,
           last_ping = excluded.last_ping,
           updated_at = excluded.updated_at`
      ).bind(
        body.status,
        body.phone || null,
        body.qr_code || null,
        now,
        isoNow
      ).run();
    }

    // 2. Atualiza mensagens enviadas com sucesso
    if (body.sent_outbox_ids && body.sent_outbox_ids.length > 0) {
      for (const outboxId of body.sent_outbox_ids) {
        await c.env.DB.prepare(
          'UPDATE whatsapp_outbox SET status = ?, sent_at = ? WHERE id = ?'
        ).bind('sent', isoNow, outboxId).run();

        await c.env.DB.prepare(
          'UPDATE whatsapp_messages SET status = ? WHERE id = ?'
        ).bind('sent', outboxId).run();
      }
    }

    // 3. Atualiza falhas de envio
    if (body.failed_outbox_ids && body.failed_outbox_ids.length > 0) {
      for (const item of body.failed_outbox_ids) {
        await c.env.DB.prepare(
          'UPDATE whatsapp_outbox SET status = ?, error = ? WHERE id = ?'
        ).bind('failed', item.error || 'Falha no envio', item.id).run();

        await c.env.DB.prepare(
          'UPDATE whatsapp_messages SET status = ? WHERE id = ?'
        ).bind('failed', item.id).run();
      }
    }

    // 4. Carrega todos os leads para cruzar telefones e devolver cache à ponte
    const allLeads = await c.env.DB.prepare(
      'SELECT id, nome, data_json FROM leads'
    ).all<{ id: string; nome: string; data_json: string }>();

    const phoneToLeadMap = new Map<string, { leadId: string; nome: string }>();
    const leadsFilterCache: Array<{ id: string; nome: string; phone: string; variants: string[] }> = [];

    for (const lead of allLeads.results || []) {
      const parsed = JSON.parse(lead.data_json || '{}');
      const raw = parsed.whatsapp || parsed.telefone;
      if (raw) {
        const variants = getPhoneVariants(raw);
        for (const v of variants) {
          phoneToLeadMap.set(v, { leadId: lead.id, nome: lead.nome });
        }
        leadsFilterCache.push({
          id: lead.id,
          nome: lead.nome,
          phone: cleanPhoneDigits(raw),
          variants
        });
      }
    }

    // 5. Processa mensagens recebidas (se houver)
    if (body.incoming_messages && body.incoming_messages.length > 0) {
      for (const msg of body.incoming_messages) {
        const cleaned = cleanPhoneDigits(msg.phone);
        const match = phoneToLeadMap.get(cleaned);
        if (match) {
          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO whatsapp_messages (id, lead_id, whatsapp, from_me, body, timestamp, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            msg.id,
            match.leadId,
            cleaned,
            msg.from_me ? 1 : 0,
            msg.body,
            msg.timestamp,
            'received',
            isoNow
          ).run();

          // Se a mensagem veio do lead, atualiza o ultimo contato
          if (!msg.from_me) {
            const leadRow = allLeads.results.find(l => l.id === match.leadId);
            if (leadRow) {
              const ld = JSON.parse(leadRow.data_json || '{}');
              ld.ultimo_contato = isoNow;
              await c.env.DB.prepare(
                'UPDATE leads SET data_json = ?, updated_at = ? WHERE id = ?'
              ).bind(JSON.stringify(ld), isoNow, match.leadId).run();
            }
          }
        }
      }
    }

    // 6. Busca mensagens pendentes na fila outbox para a ponte disparar
    const pending = await c.env.DB.prepare(
      "SELECT id, lead_id, whatsapp, body FROM whatsapp_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 10"
    ).all<{ id: string; lead_id: string; whatsapp: string; body: string }>();

    return c.json({
      success: true,
      pending_outbox: pending.results || [],
      leads_cache: leadsFilterCache
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro na sincronização';
    return c.json({ error: message }, 500);
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
