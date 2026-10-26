import React from 'react';
import type { ClientLead, Project, MonthlyInvoice, Installment } from '../../types/crm';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  History,
  FileText
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
  onOpenProposta,
}) => {
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Classificar followups
  const overdueLeads = leads.filter(l => l.proximo_followup && l.proximo_followup < todayStr && l.fase === 'prospeccao');
  const todayLeads = leads.filter(l => l.proximo_followup === todayStr && l.fase === 'prospeccao');
  const pendingQueue = [...overdueLeads, ...todayLeads];

  // Métricas dinâmicas reais
  const projetosAtivos = projects.filter(p => p.etapa !== 'No ar / Entregue').length;
  const pendenteInvoices = invoices.filter(inv => !inv.pago).reduce((acc, inv) => acc + inv.valor, 0);
  const pendenteInstallments = installments.filter(inst => !inst.pago).reduce((acc, inst) => acc + inst.valor, 0);
  const totalAReceber = pendenteInvoices + pendenteInstallments;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-8 py-5 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Hoje</span>
            <span className="text-xs font-normal text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fila diária de follow-ups priorizados para fechamento rápido de sites e sistemas.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2 flex items-center gap-3">
            <div>
              <div className="text-[11px] text-zinc-400 font-medium">Follow-ups hoje</div>
              <div className="text-lg font-bold text-zinc-100 flex items-center gap-1.5">
                <span>{pendingQueue.length}</span>
                {overdueLeads.length > 0 && (
                  <span className="text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded-full">
                    {overdueLeads.length} atrasados
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2">
            <div className="text-[11px] text-zinc-400 font-medium">Projetos no forno</div>
            <div className="text-lg font-bold text-zinc-100">
              {projetosAtivos} {projetosAtivos === 1 ? 'ativo' : 'ativos'}
            </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2">
            <div className="text-[11px] text-zinc-400 font-medium">A receber no mês</div>
            <div className="text-lg font-bold text-emerald-400">
              R$ {totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace (2 columns) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Priority Queue */}
        <div className="w-[420px] border-r border-[#27272a] flex flex-col bg-[#0e0e11] overflow-hidden">
          <div className="p-3 border-b border-[#27272a] flex items-center justify-between text-xs text-zinc-400 font-medium bg-[#121215]">
            <span>Fila de Ação Prioritária ({pendingQueue.length})</span>
            <span className="text-[11px] text-zinc-500">Ordenado por urgência</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1f1f23] p-2 space-y-1.5">
            {pendingQueue.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const isOverdue = lead.proximo_followup && lead.proximo_followup < todayStr;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
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
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                      {lead.status_id.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800/50">
                    <span>Último: {lead.ultimo_contato || 'Sem registro'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWhatsApp(lead);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors"
                    >
                      <Send size={11} />
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
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#09090b] p-6">
            <div className="max-w-3xl w-full mx-auto space-y-5">
              {/* Header Box */}
              <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100">{selectedLead.nome}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-medium">
                        {selectedLead.nicho}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {selectedLead.presenca_digital}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400">
                        Origem: {selectedLead.origem}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
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
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#222227] text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">WhatsApp</span>
                    <span className="text-zinc-200 font-medium font-mono">{selectedLead.whatsapp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Instagram</span>
                    <span className="text-zinc-200 font-medium">{selectedLead.instagram || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Site Atual</span>
                    <span className="text-zinc-200 font-medium truncate block">{selectedLead.site_atual || 'Não possui'}</span>
                  </div>
                </div>
              </div>

              {/* Action Box: Mensagem Pronta + Disparo */}
              <div className="bg-[#121215] border border-emerald-500/30 rounded-2xl p-5 shadow-lg shadow-black/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Send size={15} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      Mensagem Pronta para Envio
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Variáveis {`{nome}, {nicho}`} aplicadas</span>
                </div>

                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed font-sans">
                  {selectedLead.msg_a_mandar || `Olá ${selectedLead.nome}, tudo bem? Me chamo Yago Duarte e desenvolvo sites modernos e de alta conversão para o nicho de ${selectedLead.nicho}. Preparei uma prévia exclusiva para você!`}
                </div>

                {/* Big Action Buttons */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => onOpenWhatsApp(selectedLead)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Send size={15} />
                    <span>Abrir no WhatsApp e Registrar Contato</span>
                  </button>

                  {onOpenProposta && (
                    <button
                      onClick={() => onOpenProposta(selectedLead)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium py-3 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Gerar Proposta Pública /p/:token"
                    >
                      <FileText size={14} />
                      <span>Proposta</span>
                    </button>
                  )}

                  <button
                    onClick={() => onReagendar(selectedLead.id, 2)}
                    className="bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 font-medium py-3 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clock size={14} />
                    <span>Reagendar (+2d)</span>
                  </button>

                  <button
                    onClick={() => onRegistrarContato(selectedLead.id)}
                    className="bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-300 font-medium py-3 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Registrar Contato</span>
                  </button>
                </div>
              </div>

              {/* History Timeline */}
              <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  <History size={14} />
                  <span>Linha do Tempo de Interações</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="text-zinc-200 font-medium">Prévia exclusiva enviada via WhatsApp</div>
                      <div className="text-[11px] text-zinc-500">22/10/2026 às 14:30 · aguardando retorno</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-zinc-600 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="text-zinc-200 font-medium">Abordagem inicial realizada</div>
                      <div className="text-[11px] text-zinc-500">18/10/2026 às 10:15 · lead demonstrou interesse</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
            Nenhum lead pendente selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
