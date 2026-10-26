-- =============================================================
-- Schema D1 (SQLite) — CRM Yago Duarte
-- =============================================================

-- Tabela de Status de Prospecção (Editável nas Configurações)
create table if not exists statuses (
  id text primary key,
  label text not null,
  group_type text not null check (group_type in ('active', 'paused', 'closed', 'won')),
  color text not null,
  cadence_days integer not null default 2,
  sort_order integer not null default 0
);

-- Tabela de Clientes / Leads
create table if not exists clients (
  id text primary key,
  nome text not null,
  nicho text not null default 'Outro',
  whatsapp text,
  instagram text,
  google_url text,
  site_atual text,
  presenca_digital text not null default 'Sem site',
  origem text not null default 'Outro',
  status_id text not null default 'abordar' references statuses(id),
  ultimo_contato text,           -- ISO date YYYY-MM-DD
  proximo_followup text,         -- ISO date YYYY-MM-DD
  followups_sem_resposta integer not null default 0,
  implantacao real not null default 0.00,
  mensalidade real not null default 0.00,
  msg_a_mandar text,
  link_previa text,
  link_proposta text,
  observacoes text,
  fase text not null default 'prospeccao' check (fase in ('prospeccao', 'projeto', 'carteira')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

-- Histórico de Interações / Linha do Tempo
create table if not exists interactions (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  tipo text not null check (tipo in ('contato', 'resposta', 'status', 'nota', 'pagamento', 'sistema')),
  canal text default 'whatsapp',
  texto text not null,
  created_at text not null default (datetime('now'))
);

-- Projetos (Cliente Fechado)
create table if not exists projects (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  tipo text not null default 'Landing Page',
  etapa text not null default 'Briefing & Conteúdo',
  inicio text,
  prazo text,
  entrega text,
  implantacao real not null default 0.00,
  mensalidade real not null default 0.00,
  links_json text,               -- JSON com repo, figma, prod
  dominio text,
  hospedagem text,
  renovacao_dominio text,
  notas text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

-- Tarefas / Checklist do Projeto
create table if not exists tasks (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  titulo text not null,
  feito integer not null default 0,
  sort_order integer not null default 0
);

-- Parcelas da Implantação
create table if not exists installments (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  descricao text not null,
  valor real not null,
  vencimento text,
  pago_em text,
  forma text
);

-- Assinaturas / Mensalidades
create table if not exists subscriptions (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  valor real not null,
  dia_vencimento integer not null default 10,
  inicio text not null,
  ativo integer not null default 1
);

-- Cobranças Mensais Geradas
create table if not exists invoices (
  id text primary key,
  subscription_id text not null references subscriptions(id) on delete cascade,
  competencia text not null,     -- '2026-10'
  valor real not null,
  vencimento text not null,
  pago_em text,
  forma text
);

-- Índices essenciais para velocidade
create index if not exists idx_clients_status on clients(status_id);
create index if not exists idx_clients_fase on clients(fase);
create index if not exists idx_clients_followup on clients(proximo_followup);
create index if not exists idx_interactions_client on interactions(client_id, created_at desc);
create index if not exists idx_projects_client on projects(client_id);
