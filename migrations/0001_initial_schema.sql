-- Schema Oficial do Meu CRM (Cloudflare D1)
CREATE TABLE IF NOT EXISTS crm_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  nicho TEXT,
  status_id TEXT,
  fase TEXT,
  proximo_followup TEXT,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  token TEXT PRIMARY KEY,
  lead_id TEXT,
  cliente_nome TEXT,
  data_json TEXT NOT NULL,
  status TEXT DEFAULT 'enviada',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS briefings (
  token TEXT PRIMARY KEY,
  project_id TEXT,
  lead_id TEXT,
  cliente_nome TEXT,
  data_json TEXT NOT NULL,
  preenchido INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  key TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
