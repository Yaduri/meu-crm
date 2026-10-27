export type LeadStatusGroup = 'active' | 'paused' | 'closed' | 'won';

export interface StatusConfig {
  id: string;
  label: string;
  group: LeadStatusGroup;
  color: string;
  cadenceDays: number;
}

export type PresencaDigital = 
  | 'Sem site' 
  | 'Só Instagram' 
  | 'Só Google Meu Negócio' 
  | 'Site desatualizado/lento' 
  | 'Site bom';

export type LeadOrigem = 
  | 'Google Maps' 
  | 'Instagram' 
  | 'Indicação' 
  | 'Scraper' 
  | 'Outro';

export type TipoProjeto = 
  | 'Landing Page'
  | 'Site Institucional'
  | 'Sistema Web'
  | 'Loja Virtual / Catálogo'
  | 'Página de Vendas'
  | 'Outro';

export type EtapaProjeto = 
  | 'Briefing & Conteúdo'
  | 'Design & Layout'
  | 'Desenvolvimento'
  | 'Revisão do Cliente'
  | 'Ajustes Finais'
  | 'Publicação (DNS/Domínio)'
  | 'No ar / Entregue'
  | 'Pausado (Aguardando cliente)';

export interface ProjectTask {
  id: string;
  titulo: string;
  feito: boolean;
}

export interface WhatsAppMessage {
  id: string;
  lead_id: string;
  whatsapp: string;
  from_me: number; // 1 = enviado por você, 0 = recebido do lead
  body: string;
  timestamp: number;
  status: string; // 'pending' | 'sent' | 'received' | 'failed'
  created_at: string;
}

export interface WhatsAppBridgeStatus {
  connected: boolean;
  status: 'connected' | 'qr_ready' | 'connecting' | 'disconnected' | 'offline' | 'error';
  phone: string | null;
  qr_code: string | null;
  last_ping: number | null;
  online: boolean;
}

export interface Project {
  id: string;
  client_id: string;
  cliente_nome: string;
  cliente_whatsapp?: string;
  nicho: string;
  tipo: TipoProjeto;
  etapa: EtapaProjeto;
  inicio: string;             // YYYY-MM-DD
  prazo: string;              // YYYY-MM-DD
  entrega?: string;           // YYYY-MM-DD
  implantacao: number;
  mensalidade: number;
  tasks: ProjectTask[];
  link_figma?: string;
  link_homologacao?: string;
  link_producao?: string;
  link_repositorio?: string;
  dominio?: string;
  hospedagem?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientLead {
  id: string;
  nome: string;
  nicho: string;
  whatsapp: string;
  instagram?: string;
  google_url?: string;
  site_atual?: string;
  presenca_digital: PresencaDigital;
  origem: LeadOrigem;
  status_id: string;
  ultimo_contato?: string;         // YYYY-MM-DD
  proximo_followup?: string;       // YYYY-MM-DD
  followups_sem_resposta: number;
  implantacao: number;
  mensalidade: number;
  msg_a_mandar?: string;
  link_previa?: string;
  link_proposta?: string;
  observacoes?: string;
  fase: 'prospeccao' | 'projeto' | 'carteira';
  etapa_entrega?: string;
  status_pagamento?: string;
  dia_vencimento?: number;
  created_at: string;
  updated_at: string;
}

// Financeiro
export interface Installment {
  id: string;
  project_id: string;
  cliente_nome: string;
  descricao: string;           // ex: "50% Entrada", "50% Na Entrega"
  valor: number;
  vencimento: string;          // YYYY-MM-DD
  pago: boolean;
  pago_em?: string;
}

export interface MonthlyInvoice {
  id: string;
  client_id: string;
  cliente_nome: string;
  cliente_whatsapp?: string;
  competencia: string;         // "2026-10"
  valor: number;
  vencimento: string;          // YYYY-MM-DD
  pago: boolean;
  pago_em?: string;
}

export interface MaintenanceRequest {
  id: string;
  client_id: string;
  titulo: string;
  status: 'aberto' | 'em_andamento' | 'concluido';
  prazo?: string;
  created_at: string;
}

// Proposta Pública
export interface ProposalItem {
  id: string;
  titulo: string;
  descricao: string;
  incluso: boolean;
}

export interface Proposal {
  id: string;
  token: string;
  lead_id: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  nicho: string;
  titulo_proposta: string;
  apresentacao: string;
  itens: ProposalItem[];
  prazo_dias: number;
  implantacao: number;
  forma_pagamento_implantacao: string;
  mensalidade: number;
  beneficios_mensalidade: string[];
  status: 'enviada' | 'aceita' | 'recusada';
  visualizada_em?: string;
  aceita_em?: string;
  created_at: string;
}

// Briefing Público
export interface BriefingData {
  id: string;
  token: string;
  project_id?: string;
  lead_id: string;
  cliente_nome: string;
  nome_empresa: string;
  slogan_posicionamento: string;
  publico_alvo: string;
  servicos_principais: string;
  diferenciais: string;
  cores_preferidas: string;
  sites_referencia: string;
  whatsapp_atendimento: string;
  instagram: string;
  endereco_fisico: string;
  link_arquivos: string;
  observacoes_adicionais: string;
  preenchido: boolean;
  preenchido_em?: string;
  created_at: string;
}

export const ETAPAS_PROJETO: { id: EtapaProjeto; label: string; color: string }[] = [
  { id: 'Briefing & Conteúdo', label: 'Briefing & Conteúdo', color: '#94a3b8' },
  { id: 'Design & Layout', label: 'Design & Layout', color: '#38bdf8' },
  { id: 'Desenvolvimento', label: 'Desenvolvimento', color: '#818cf8' },
  { id: 'Revisão do Cliente', label: 'Revisão com Cliente', color: '#f59e0b' },
  { id: 'Ajustes Finais', label: 'Ajustes Finais', color: '#fb923c' },
  { id: 'Publicação (DNS/Domínio)', label: 'Publicação / DNS', color: '#a855f7' },
  { id: 'No ar / Entregue', label: 'No Ar / Concluído', color: '#10b981' },
  { id: 'Pausado (Aguardando cliente)', label: 'Pausado (Cliente)', color: '#64748b' }
];

export const CHECKLIST_PADRAO_LP: string[] = [
  'Receber logo e identidade visual',
  'Coletar textos e depoimentos',
  'Wireframe e Estrutura do Layout',
  'Aprovação do design pelo cliente',
  'Desenvolvimento front-end responsivo',
  'Configuração de botão WhatsApp e formulários',
  'Instalação de Pixel Meta / Google Analytics',
  'Apontamento de DNS e certificado SSL',
  'Testes em mobile e checklist de performance'
];

export const DEFAULT_STATUSES: StatusConfig[] = [
  // Ativos
  { id: 'abordar', label: 'A abordar', group: 'active', color: '#94a3b8', cadenceDays: 1 },
  { id: 'abordado', label: 'Abordado (aguardando)', group: 'active', color: '#38bdf8', cadenceDays: 2 },
  { id: 'conversa', label: 'Em conversa', group: 'active', color: '#60a5fa', cadenceDays: 2 },
  { id: 'pediu_valor', label: 'Pediu valor', group: 'active', color: '#818cf8', cadenceDays: 1 },
  { id: 'previa_producao', label: 'Prévia em produção', group: 'active', color: '#a78bfa', cadenceDays: 2 },
  { id: 'previa_enviada', label: 'Prévia enviada', group: 'active', color: '#f59e0b', cadenceDays: 2 },
  { id: 'proposta_enviada', label: 'Proposta enviada', group: 'active', color: '#f97316', cadenceDays: 3 },
  { id: 'negociacao', label: 'Negociação', group: 'active', color: '#ec4899', cadenceDays: 2 },
  
  // Pausado
  { id: 'retomar', label: 'Retomar depois', group: 'paused', color: '#64748b', cadenceDays: 15 },
  
  // Encerrados
  { id: 'sem_resp_abordagem', label: 'Sem resp. na abordagem', group: 'closed', color: '#71717a', cadenceDays: 0 },
  { id: 'parou_responder', label: 'Parou de responder', group: 'closed', color: '#71717a', cadenceDays: 0 },
  { id: 'sem_resp_previa', label: 'Sem resp. pós prévia', group: 'closed', color: '#71717a', cadenceDays: 0 },
  { id: 'sem_resp_proposta', label: 'Sem resp. pós proposta', group: 'closed', color: '#71717a', cadenceDays: 0 },
  { id: 'recusou_preco', label: 'Recusou – preço', group: 'closed', color: '#ef4444', cadenceDays: 0 },
  { id: 'recusou_ja_tem', label: 'Recusou – já tem site', group: 'closed', color: '#ef4444', cadenceDays: 0 },
  { id: 'recusou_sem_interesse', label: 'Recusou – sem interesse', group: 'closed', color: '#ef4444', cadenceDays: 0 },
  { id: 'recusou_outro', label: 'Recusou – outro', group: 'closed', color: '#ef4444', cadenceDays: 0 },
  
  // Ganho
  { id: 'fechado', label: 'Fechado (Ganho)', group: 'won', color: '#10b981', cadenceDays: 0 },
];

export const INACTIVE_FOLLOWUP_STATUS_IDS = new Set(
  DEFAULT_STATUSES.filter(s => s.group === 'closed' || s.group === 'won').map(s => s.id)
);

export function isLeadActiveForFollowup(lead: ClientLead): boolean {
  if (lead.fase !== 'prospeccao') return false;
  if (!lead.status_id) return true;
  if (INACTIVE_FOLLOWUP_STATUS_IDS.has(lead.status_id)) return false;
  if (lead.status_id.startsWith('recusou_') || lead.status_id.startsWith('sem_resp_')) return false;
  return true;
}

export const NICHOS_PADRAO = [
  'Estética',
  'Advogado',
  'Massoterapia',
  'Dentista',
  'Psicólogo',
  'Arquitetura',
  'Médico',
  'Nutricionista',
  'Outro',
];

export interface CrmSettings {
  nomeProfissional: string;
  whatsappComercial: string;
  chavePix: string;
  implantacaoPadrao: number;
  mensalidadePadrao: number;
  diaVencimentoPadrao: number;
}

export const DEFAULT_CRM_SETTINGS: CrmSettings = {
  nomeProfissional: 'Yago Duarte',
  whatsappComercial: '5511945987666',
  chavePix: '',
  implantacaoPadrao: 1200,
  mensalidadePadrao: 89,
  diaVencimentoPadrao: 10,
};
