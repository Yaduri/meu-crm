import React, { useState } from 'react';
import type { ClientLead, PresencaDigital } from '../../types/crm';
import { isLeadActiveForFollowup } from '../../types/crm';
import { ProspeccaoKanban } from './ProspeccaoKanban';
import { ProspeccaoTable } from './ProspeccaoTable';
import { MineradorLeadsModal } from '../modals/MineradorLeadsModal';
import { 
  Kanban, 
  Table as TableIcon, 
  Plus, 
  Sparkles, 
  Calendar, 
  AlertCircle, 
  Flame, 
  Globe, 
  UserPlus, 
  Search, 
  X,
  ChevronDown,
  Bot,
  User
} from 'lucide-react';

interface ProspeccaoViewProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onNewLead: () => void;
  onNewLeadWithStatus: (statusId: string) => void;
  onAddMultipleLeads?: (leads: Partial<ClientLead>[]) => void;
  onBulkUpdateLeads?: (leadIds: string[], updates: Partial<ClientLead>) => void;
  onBatchUpdateLeads?: (updates: Array<{ id: string; changes: Partial<ClientLead> }>) => void;
  onBulkDeleteLeads?: (leadIds: string[]) => void;
}

type FilterPill = 'todos' | 'hoje' | 'atrasado' | 'negociacao' | 'semsite' | 'abordar' | 'n8n' | 'manual';

const PRESENCA_OPTIONS: PresencaDigital[] = [
  'Sem site',
  'Site desatualizado/lento',
  'Só Instagram',
  'Só Google Meu Negócio',
  'Site bom'
];

export const ProspeccaoView: React.FC<ProspeccaoViewProps> = ({
  leads,
  onSelectLead,
  onMoveLeadStatus,
  onOpenWhatsApp,
  onNewLead,
  onNewLeadWithStatus,
  onAddMultipleLeads,
  onBulkUpdateLeads,
  onBatchUpdateLeads,
  onBulkDeleteLeads,
}) => {
  const [viewMode, setViewMode] = useState<'tabela' | 'kanban'>('tabela');
  const [filterPill, setFilterPill] = useState<FilterPill>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPresenca, setSelectedPresenca] = useState<string>('todos');
  const [showMineradorModal, setShowMineradorModal] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Contagens dinâmicas para as pílulas (ignorando leads encerrados/sem interesse nos follow-ups)
  const countHoje = leads.filter(l => isLeadActiveForFollowup(l) && l.proximo_followup === todayStr).length;
  const countAtrasados = leads.filter(l => isLeadActiveForFollowup(l) && l.proximo_followup && l.proximo_followup < todayStr).length;
  const countNegociacao = leads.filter(l => l.status_id === 'negociacao' || l.status_id === 'proposta_enviada').length;
  const countSemSite = leads.filter(l => l.presenca_digital === 'Sem site' || !l.site_atual).length;
  const countAAbordar = leads.filter(l => l.status_id === 'abordar').length;
  const countN8N = leads.filter(l => Boolean(l.enviado_n8n)).length;
  const countManual = leads.filter(l => l.status_id !== 'abordar' && !l.enviado_n8n).length;

  // Contagem por Presença Digital
  const countPresenca = leads.reduce((acc, l) => {
    const p = l.presenca_digital || 'Sem site';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtragem dos leads em tempo real
  const filteredLeads = leads.filter(l => {
    if (filterPill === 'hoje' && !(isLeadActiveForFollowup(l) && l.proximo_followup === todayStr)) return false;
    if (filterPill === 'atrasado' && !(isLeadActiveForFollowup(l) && l.proximo_followup && l.proximo_followup < todayStr)) return false;
    if (filterPill === 'negociacao' && l.status_id !== 'negociacao' && l.status_id !== 'proposta_enviada') return false;
    if (filterPill === 'semsite' && l.presenca_digital !== 'Sem site' && l.site_atual) return false;
    if (filterPill === 'abordar' && l.status_id !== 'abordar') return false;
    if (filterPill === 'n8n' && !l.enviado_n8n) return false;
    if (filterPill === 'manual' && (l.enviado_n8n || l.status_id === 'abordar')) return false;

    // Filtro por Presença Digital
    if (selectedPresenca !== 'todos') {
      const presenca = l.presenca_digital || 'Sem site';
      if (presenca !== selectedPresenca) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNome = l.nome.toLowerCase().includes(q);
      const matchWhats = l.whatsapp ? l.whatsapp.includes(q) : false;
      const matchNicho = l.nicho.toLowerCase().includes(q);
      if (!matchNome && !matchWhats && !matchNicho) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Top Header of Prospecção */}
      <header className="px-4 sm:px-8 py-4 border-b border-[#27272a] bg-[#0d0d10] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex flex-wrap items-center gap-2">
            <span>Pipeline de Prospecção</span>
            <span className="text-xs font-normal text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50 font-mono">
              {filteredLeads.length} de {leads.length} leads
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gerencie contatos frios, envio de prévias, propostas e negociações ativas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Switch Tabela vs Kanban */}
          <div className="bg-[#18181b] border border-[#27272a] p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('tabela')}
              className={`min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'tabela'
                  ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TableIcon size={13} />
              <span>Tabela</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Kanban size={13} />
              <span>Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMineradorModal(true)}
            className="min-h-[38px] flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/15 cursor-pointer"
            title="Buscar empresas ativas no CNPJ (Fichário) e Google Maps para prospecção"
          >
            <Sparkles size={14} className="text-emerald-200" />
            <span>Minerar Empresas (CNPJ & Maps)</span>
          </button>

          <button
            type="button"
            onClick={onNewLead}
            className="min-h-[38px] flex items-center gap-1.5 bg-[#1f1f25] hover:bg-[#282830] border border-[#2e2e38] text-zinc-200 hover:text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Lead</span>
          </button>
        </div>
      </header>

      {/* Pills & Search Filter Bar */}
      <div className="px-4 sm:px-8 py-3 border-b border-[#27272a] bg-[#0c0c0f] space-y-2.5 shrink-0">
        {/* Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
          {/* Todos */}
          <button
            type="button"
            onClick={() => setFilterPill('todos')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'todos'
                ? 'bg-white text-zinc-950 shadow-md shadow-white/10 ring-1 ring-white'
                : 'bg-[#141418] text-zinc-300 hover:text-zinc-100 hover:bg-[#18181d] border border-[#27272a]'
            }`}
          >
            <Sparkles size={14} className={filterPill === 'todos' ? 'text-zinc-950' : 'text-zinc-400'} />
            <span>Todos</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'todos' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {leads.length}
            </span>
          </button>

          {/* Para Contatar Hoje */}
          <button
            type="button"
            onClick={() => setFilterPill('hoje')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'hoje'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-sky-400'
                : 'bg-[#141418] text-sky-400 hover:bg-sky-500/10 border border-sky-500/30'
            }`}
          >
            <Calendar size={14} />
            <span>Para Contatar Hoje</span>
            {countHoje > 0 && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
                filterPill === 'hoje' ? 'bg-sky-400 text-white' : 'bg-sky-500/20 text-sky-300'
              }`}>
                {countHoje}
              </span>
            )}
          </button>

          {/* Follow-up Atrasado */}
          <button
            type="button"
            onClick={() => setFilterPill('atrasado')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'atrasado'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 ring-1 ring-rose-500'
                : 'bg-[#141418] text-rose-400 hover:bg-rose-500/10 border border-rose-500/30'
            }`}
          >
            <AlertCircle size={14} />
            <span>Follow-up Atrasado</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'atrasado' ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {countAtrasados}
            </span>
          </button>

          {/* Em Negociação */}
          <button
            type="button"
            onClick={() => setFilterPill('negociacao')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'negociacao'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-500'
                : 'bg-[#141418] text-purple-400 hover:bg-purple-500/10 border border-purple-500/30'
            }`}
          >
            <Flame size={14} />
            <span>Em Negociação</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'negociacao' ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300'
            }`}>
              {countNegociacao}
            </span>
          </button>

          {/* Sem Site */}
          <button
            type="button"
            onClick={() => setFilterPill('semsite')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'semsite'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-1 ring-amber-500'
                : 'bg-[#141418] text-amber-400 hover:bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            <Globe size={14} />
            <span>Sem Site (Oportunidade)</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'semsite' ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {countSemSite}
            </span>
          </button>

          {/* A Abordar */}
          <button
            type="button"
            onClick={() => setFilterPill('abordar')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'abordar'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500'
                : 'bg-[#141418] text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
            }`}
          >
            <UserPlus size={14} />
            <span>A Abordar</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'abordar' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {countAAbordar}
            </span>
          </button>

          {/* N8N Automação */}
          <button
            type="button"
            onClick={() => setFilterPill('n8n')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'n8n'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-500'
                : 'bg-[#141418] text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30'
            }`}
          >
            <Bot size={14} />
            <span>N8N (Automação)</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'n8n' ? 'bg-indigo-500 text-white' : 'bg-indigo-500/20 text-indigo-300'
            }`}>
              {countN8N}
            </span>
          </button>

          {/* Manual */}
          <button
            type="button"
            onClick={() => setFilterPill('manual')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              filterPill === 'manual'
                ? 'bg-zinc-700 text-white shadow-md shadow-zinc-700/25 ring-1 ring-zinc-500'
                : 'bg-[#141418] text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
            }`}
          >
            <User size={14} />
            <span>Contato Manual</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ml-0.5 ${
              filterPill === 'manual' ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {countManual}
            </span>
          </button>
        </div>

        {/* Real-time Search & Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 max-w-md w-full">
            <Search size={15} className="absolute left-3.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, nicho ou WhatsApp..."
              className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-10 pr-9 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por Presença Digital */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[240px]">
              <Globe size={14} className={`absolute left-3 top-2.5 pointer-events-none ${selectedPresenca !== 'todos' ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <select
                aria-label="Filtrar por Presença Digital"
                value={selectedPresenca}
                onChange={(e) => {
                  setSelectedPresenca(e.target.value);
                  if (filterPill === 'semsite' && e.target.value !== 'Sem site') {
                    setFilterPill('todos');
                  }
                }}
                className={`w-full min-h-[38px] bg-[#121215] border text-xs font-medium rounded-xl pl-9 pr-8 py-2 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer appearance-none ${
                  selectedPresenca !== 'todos'
                    ? 'border-emerald-500/60 text-emerald-300 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                    : 'border-[#27272a] text-zinc-300 hover:border-[#3f3f46]'
                }`}
              >
                <option value="todos">Presença: Todas ({leads.length})</option>
                {PRESENCA_OPTIONS.map(p => (
                  <option key={p} value={p}>
                    {p} ({countPresenca[p] || 0})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-3.5 text-zinc-400 pointer-events-none" />
            </div>

            {selectedPresenca !== 'todos' && (
              <button
                type="button"
                onClick={() => setSelectedPresenca('todos')}
                className="text-[11px] text-zinc-300 hover:text-white bg-zinc-800/90 hover:bg-zinc-700 px-2.5 py-2 rounded-xl border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Limpar filtro de presença digital"
              >
                <X size={12} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'kanban' ? (
          <ProspeccaoKanban
            leads={filteredLeads}
            onSelectLead={onSelectLead}
            onMoveLeadStatus={onMoveLeadStatus}
            onOpenWhatsApp={onOpenWhatsApp}
            onNewLeadWithStatus={onNewLeadWithStatus}
            onBulkUpdateLeads={onBulkUpdateLeads}
          />
        ) : (
          <ProspeccaoTable
            leads={filteredLeads}
            onSelectLead={onSelectLead}
            onOpenWhatsApp={onOpenWhatsApp}
            onMoveLeadStatus={onMoveLeadStatus}
            onBulkUpdateLeads={onBulkUpdateLeads}
            onBatchUpdateLeads={onBatchUpdateLeads}
            onBulkDeleteLeads={onBulkDeleteLeads}
          />
        )}
      </div>

      <MineradorLeadsModal
        isOpen={showMineradorModal}
        onClose={() => setShowMineradorModal(false)}
        existingLeads={leads}
        onAddMultipleLeads={(newLeads) => {
          if (onAddMultipleLeads) {
            onAddMultipleLeads(newLeads);
          }
        }}
      />
    </div>
  );
};
