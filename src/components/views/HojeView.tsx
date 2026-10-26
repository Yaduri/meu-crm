import React, { useState } from 'react';
import type { ClientLead, Project, MonthlyInvoice, Installment } from '../../types/crm';
import { DEFAULT_STATUSES } from '../../types/crm';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  History,
  FileText,
  Edit3,
  ArrowLeft
} from 'lucide-react';

interface HojeViewProps {
  leads: ClientLead[];
  projects?: Project[];
  invoices?: MonthlyInvoice[];
  installments?: Installment[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onReagendar: (leadId: string, days: number) => void;
  onRegistrarContato: (leadId: string) => void;
  onMudarStatus: (leadId: string, statusId: string) => void;
  onOpenProposta?: (lead: ClientLead) => void;
  onEditLead?: (lead: ClientLead) => void;
}

export const HojeView: React.FC<HojeViewProps> = ({
  leads,
  projects = [],
  invoices = [],
  installments = [],
  selectedLeadId,
  onSelectLead,
  onOpenWhatsApp,
  onReagendar,
  onRegistrarContato,
  onMudarStatus,
  onOpenProposta,
  onEditLead,
}) => {
  const [mobilePane, setMobilePane] = useState<'queue' | 'detail'>('queue');
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Classificar followups
  const overdueLeads = leads.filter(l => l.proximo_followup && l.proximo_followup < todayStr && l.fase === 'prospeccao');
  const todayLeads = leads.filter(l => l.proximo_followup === todayStr && l.fase === 'prospeccao');
  const pendingQueue = [...overdueLeads, ...todayLeads];

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || pendingQueue[0] || leads[0];

  // Métricas dinâmicas reais
  const projetosAtivos = projects.filter(p => p.etapa !== 'No ar / Entregue').length;
  const pendenteInvoices = invoices.filter(inv => !inv.pago).reduce((acc, inv) => acc + inv.valor, 0);
  const pendenteInstallments = installments.filter(inst => !inst.pago).reduce((acc, inst) => acc + inst.valor, 0);
  const totalAReceber = pendenteInvoices + pendenteInstallments;

  const handleSelectLeadCard = (leadId: string) => {
    onSelectLead(leadId);
    setMobilePane('detail');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-5 border-b border-[#27272a] bg-[#0d0d10] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex flex-wrap items-center gap-2">
            <span>Hoje</span>
            <span className="text-xs font-normal text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fila diária de follow-ups priorizados para fechamento rápido de sites e sistemas.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex lg:items-center">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
            <div>
              <div className="text-[11px] text-zinc-400 font-medium">Follow-ups hoje</div>
              <div className="text-base sm:text-lg font-bold text-zinc-100 font-mono flex flex-wrap items-center gap-1.5">
                <span>{pendingQueue.length}</span>
                {overdueLeads.length > 0 && (
                  <span className="text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-full font-sans">
                    {overdueLeads.length} atrasados
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 sm:px-4 py-2">
            <div className="text-[11px] text-zinc-400 font-medium">Projetos no forno</div>
            <div className="text-base sm:text-lg font-bold text-zinc-100 font-mono">
              {projetosAtivos} <span className="text-xs font-sans font-normal text-zinc-400">{projetosAtivos === 1 ? 'ativo' : 'ativos'}</span>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 sm:px-4 py-2">
            <div className="text-[11px] text-zinc-400 font-medium">A receber no mês</div>
            <div className="text-sm sm:text-lg font-bold text-emerald-400 font-mono truncate">
              R$ {totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Switcher (<lg) */}
      <div className="lg:hidden flex border-b border-[#27272a] bg-[#121215] px-4 py-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobilePane('queue')}
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            mobilePane === 'queue'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#18181b] text-zinc-300 border border-[#27272a]'
          }`}
        >
          Fila Prioritária ({pendingQueue.length})
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('detail')}
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer truncate ${
            mobilePane === 'detail'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#18181b] text-zinc-300 border border-[#27272a]'
          }`}
        >
          {selectedLead ? `Lead: ${selectedLead.nome}` : 'Detalhes do Lead'}
        </button>
      </div>

      {/* Main Workspace (2 columns on lg, toggled on mobile) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Priority Queue */}
        <div
          className={`w-full lg:w-[420px] border-r border-[#27272a] flex-col bg-[#0e0e11] overflow-hidden ${
            mobilePane === 'queue' ? 'flex flex-1 lg:flex-initial' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b border-[#27272a] flex items-center justify-between text-xs text-zinc-300 font-medium bg-[#121215]">
            <span>Fila de Ação Prioritária ({pendingQueue.length})</span>
            <span className="text-[11px] text-zinc-400">Ordenado por urgência</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1f1f23] p-2 space-y-1.5">
            {pendingQueue.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const isOverdue = lead.proximo_followup && lead.proximo_followup < todayStr;

              return (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectLeadCard(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectLeadCard(lead.id);
                    }
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isSelected
                      ? 'bg-[#1c1c21] border-emerald-500/50 shadow-sm shadow-emerald-500/5'
                      : 'bg-[#141418] border-[#222227] hover:border-zinc-700 hover:bg-[#18181d]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm text-zinc-100 leading-tight">
                      {lead.nome}
                    </div>
                    {isOverdue ? (
                      <span className="shrink-0 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Atrasado
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full">
                        Hoje
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                      {lead.nicho}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300">
                      {lead.status_id.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-3 pt-2 border-t border-zinc-800/50">
                    <span>Último: {lead.ultimo_contato || 'Sem registro'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWhatsApp(lead);
                      }}
                      className="min-h-[34px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Send size={12} />
                      WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Lead Detail & Quick Action Terminal */}
        {selectedLead ? (
          <div
            className={`flex-1 flex-col overflow-y-auto bg-[#09090b] p-4 sm:p-6 ${
              mobilePane === 'detail' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="max-w-3xl w-full mx-auto space-y-5">
              {/* Mobile back link */}
              <button
                type="button"
                onClick={() => setMobilePane('queue')}
                className="lg:hidden inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 min-h-[36px] px-2.5 py-1 rounded-lg bg-[#121215] border border-[#27272a] cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Voltar para a fila ({pendingQueue.length})</span>
              </button>

              {/* Header Box */}
              <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-zinc-100">{selectedLead.nome}</h2>
                      {onEditLead && (
                        <button
                          type="button"
                          onClick={() => onEditLead(selectedLead)}
                          aria-label="Editar dados do lead"
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
                          title="Editar dados do lead"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-200 font-medium">
                        {selectedLead.nicho}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {selectedLead.presenca_digital}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-800/60 text-zinc-300">
                        Origem: {selectedLead.origem}
                      </span>
                      <select
                        aria-label="Alterar status do lead"
                        value={selectedLead.status_id}
                        onChange={(e) => onMudarStatus(selectedLead.id, e.target.value)}
                        className="min-h-[32px] bg-[#18181b] border border-zinc-700 rounded-md px-2.5 py-1 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        {DEFAULT_STATUSES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-[#222227]">
                    <div className="text-xs text-zinc-400">Implantação proposta</div>
                    <div className="text-lg font-bold text-emerald-400 font-mono">
                      R$ {selectedLead.implantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {selectedLead.mensalidade > 0 && (
                      <div className="text-xs text-zinc-400 font-mono">
                        + R$ {selectedLead.mensalidade.toFixed(2)}/mês
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#222227] text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">WhatsApp</span>
                    <span className="text-zinc-200 font-medium font-mono">{selectedLead.whatsapp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Instagram</span>
                    <span className="text-zinc-200 font-medium">{selectedLead.instagram || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Site Atual</span>
                    <span className="text-zinc-200 font-medium truncate block">{selectedLead.site_atual || 'Não possui'}</span>
                  </div>
                </div>
              </div>

              {/* Action Box: Mensagem Pronta + Disparo */}
              <div className="bg-[#121215] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Send size={15} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Mensagem Pronta para Envio
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Variáveis {`{nome}, {nicho}`} aplicadas</span>
                </div>

                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed font-sans">
                  {selectedLead.msg_a_mandar || `Olá ${selectedLead.nome}, tudo bem? Me chamo Yago Duarte e desenvolvo sites modernos e de alta conversão para o nicho de ${selectedLead.nicho}. Preparei uma prévia exclusiva para você!`}
                </div>

                {/* Big Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(selectedLead)}
                    className="w-full sm:flex-1 min-h-[42px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Send size={15} />
                    <span>Abrir no WhatsApp e Registrar Contato</span>
                  </button>

                  {onOpenProposta && (
                    <button
                      type="button"
                      onClick={() => onOpenProposta(selectedLead)}
                      className="min-h-[42px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Gerar Proposta Pública /p/:token"
                    >
                      <FileText size={14} />
                      <span>Proposta</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onReagendar(selectedLead.id, 2)}
                    className="min-h-[42px] bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 font-medium py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clock size={14} />
                    <span>Reagendar (+2d)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRegistrarContato(selectedLead.id)}
                    className="min-h-[42px] bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 font-medium py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Registrar Contato</span>
                  </button>
                </div>
              </div>

              {/* History & Notes Timeline */}
              <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-zinc-200">
                  <History size={14} className="text-zinc-400" />
                  <span>Histórico & Observações do Cliente</span>
                </div>

                <div className="space-y-3">
                  {selectedLead.observacoes && (
                    <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-zinc-300">
                      <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Observações Internas:</span>
                      {selectedLead.observacoes}
                    </div>
                  )}
                  <div className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="text-zinc-200 font-medium">
                        Status Atual: {DEFAULT_STATUSES.find(s => s.id === selectedLead.status_id)?.label || selectedLead.status_id}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Próximo Follow-up: {selectedLead.proximo_followup ? selectedLead.proximo_followup.split('-').reverse().join('/') : 'Não agendado'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-zinc-600 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="text-zinc-200 font-medium">
                        Último contato registrado: {selectedLead.ultimo_contato ? selectedLead.ultimo_contato.split('-').reverse().join('/') : 'Ainda não abordado'}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Cadastrado em {selectedLead.created_at ? selectedLead.created_at.split('-').reverse().join('/') : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
            Nenhum lead pendente selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
