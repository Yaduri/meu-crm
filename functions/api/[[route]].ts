import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  TELEGRAM_BOT_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    service: 'CRM Yago Duarte API (Cloudflare Pages Functions)' 
  });
});

// Proposta Pública
app.get('/proposals/:token', async (c) => {
  const token = c.req.param('token');
  return c.json({ 
    success: true, 
    token,
    message: 'Endpoint público para carregar proposta'
  });
});

// Briefing Público
app.get('/briefings/:token', async (c) => {
  const token = c.req.param('token');
  return c.json({ 
    success: true, 
    token,
    message: 'Endpoint público para carregar dados de briefing'
  });
});

app.post('/briefings/:token', async (c) => {
  const token = c.req.param('token');
  try {
    const data = await c.req.json();
    return c.json({ 
      success: true, 
      token, 
      data,
      received_at: new Date().toISOString() 
    });
  } catch {
    return c.json({ error: 'Dados inválidos' }, 400);
  }
});

// Upload de Arquivos para o Cloudflare R2
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'Nenhum arquivo enviado' }, 400);
    }

    const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (c.env?.BUCKET) {
      await c.env.BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
      });
    }

    return c.json({ 
      success: true, 
      key, 
      name: file.name, 
      size: file.size,
      contentType: file.type 
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});

// Automação: Envio de resumo diário no Telegram (@YagoCRMbot)
app.post('/telegram/summary', async (c) => {
  try {
    const body = await c.req.json();
    const chatId = body.chat_id;
    const token = c.env?.TELEGRAM_BOT_TOKEN || body.bot_token;

    if (!token) {
      return c.json({ error: 'TELEGRAM_BOT_TOKEN não configurado' }, 400);
    }

    if (!chatId) {
      return c.json({ error: 'chat_id é obrigatório' }, 400);
    }

    const text = body.text || '☀️ Resumo diário do CRM Yago Duarte: sistema operacional!';

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });

    const data = await res.json();
    return c.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro no envio';
    return c.json({ error: message }, 500);
  }
});

export const onRequest = handle(app);
