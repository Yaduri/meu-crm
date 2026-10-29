import React, { useState, useEffect, useRef } from 'react';
import type { ClientLead } from '../../types/crm';
import { DEFAULT_STATUSES, isLeadActiveForFollowup } from '../../types/crm';
import { formatDateBR, formatDateShortBR } from '../../utils/dateFormat';
import { 
  Send, 
  Search, 
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  AlertTriangle,
  Zap,
  Sun,
  X,
  Check,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface ProspeccaoKanbanProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onNewLeadWithStatus: (statusId: string) => void;
  onBulkUpdateLeads?: (leadIds: string[], updates: Partial<ClientLead>) => void;
}

const INITIAL_COLUMN_CAP = 35;

export const ProspeccaoKanban: React.FC<ProspeccaoKanbanProps> = ({
  leads,
  onSelectLead,
  onMoveLeadStatus,
  onOpenWhatsApp,
  onNewLeadWithStatus,
  onBulkUpdateLeads,
}) => {
  const [showClosed, setShowClosed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNicho, setSelectedNicho] = useState<string>('todos');
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({});
  const [openFollowupLeadId, setOpenFollowupLeadId] = useState<string | null>(null);
  const [customFollowupDate, setCustomFollowupDate] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenFollowupLeadId(null);
      }
    };
    if (openFollowupLeadId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFollowupLeadId]);

  const handleOpenFollowupPopover = (lead: ClientLead) => {
    if (openFollowupLeadId === lead.id) {
      setOpenFollowupLeadId(null);
      return;
    }
    setCustomFollowupDate(lead.proximo_followup || todayStr);
    setOpenFollowupLeadId(lead.id);
  };

  const handleQuickFollowupSelect = (leadId: string, daysOffset: number | null) => {
    if (!onBulkUpdateLeads) return;
    if (daysOffset === null) {
      onBulkUpdateLeads([leadId], { proximo_followup: undefined });
    } else {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      const dateStr = d.toISOString().slice(0, 10);
      onBulkUpdateLeads([leadId], { proximo_followup: dateStr });
    }
    setOpenFollowupLeadId(null);
  };

  const handleCustomFollowupSave = (leadId: string) => {
    if (!onBulkUpdateLeads) return;
    onBulkUpdateLeads([leadId], { proximo_followup: customFollowupDate || undefined });
    setOpenFollowupLeadId(null);
  };

  const getDaysDiffFromToday = (dateStr: string): number => {
    const target = new Date(`${dateStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);
    return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  };

  const uniqueNichos = Array.from(new Set(leads.map(l => l.nicho).filter(Boolean))).sort();

  // Filtragem
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.nicho.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lead.whatsapp && lead.whatsapp.includes(searchTerm));
    const matchesNicho = selectedNicho === 'todos' || lead.nicho === selectedNicho;
    return matchesSearch && matchesNicho;
  });

  // Separação de status
  const activeStatuses = DEFAULT_STATUSES.filter(s => s.group === 'active');
  const closedStatuses = DEFAULT_STATUSES.filter(s => s.group === 'closed' || s.group === 'paused');

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId !== result.source.droppableId) {
      onMoveLeadStatus(draggableId, destination.droppableId);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Kanban Filter Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#27272a] bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome, nicho ou telefone..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <select
            aria-label="Filtrar por nicho"
            value={selectedNicho}
            onChange={(e) => setSelectedNicho(e.target.value)}
            className="min-h-[34px] bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os nichos</option>
            {uniqueNichos.map(nicho => (
              <option key={nicho} value={nicho}>{nicho}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowClosed(!showClosed)}
          className="min-h-[34px] text-xs text-zinc-300 hover:text-zinc-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] transition-colors cursor-pointer self-start sm:self-auto"
        >
          {showClosed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{showClosed ? 'Ocultar Encerrados e Pausados' : 'Ver Encerrados e Pausados'}</span>
        </button>
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 flex gap-4">
          {activeStatuses.map((status) => {
            const columnLeads = filteredLeads.filter(l => l.status_id === status.id);
            const limit = columnLimits[status.id] || INITIAL_COLUMN_CAP;
            const visibleLeads = columnLeads.slice(0, limit);
            const remaining = columnLeads.length - visibleLeads.length;

            return (
              <div
                key={status.id}
                className="w-72 shrink-0 bg-[#121215] border border-[#27272a] rounded-2xl flex flex-col max-h-full overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[#222226] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <h3 className="text-xs font-semibold text-zinc-200">{status.label}</h3>
                    <span className="text-[10px] font-bold font-mono bg-[#1f1f24] text-zinc-300 px-1.5 py-0.5 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNewLeadWithStatus(status.id)}
                    aria-label={`Adicionar lead em ${status.label}`}
                    className="min-h-[30px] min-w-[30px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Adicionar lead nesta etapa"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Droppable Card Area */}
                <Droppable droppableId={status.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2.5 overflow-y-auto space-y-2.5 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {visibleLeads.map((lead, index) => {
                        const isActiveLead = isLeadActiveForFollowup(lead);
                        const followupStr = lead.proximo_followup;
                        const isOverdue = Boolean(isActiveLead && followupStr && followupStr < todayStr);
                        const isToday = Boolean(followupStr && followupStr === todayStr);
                        const daysDiff = followupStr ? getDaysDiffFromToday(followupStr) : 0;
                        const isPopoverOpen = openFollowupLeadId === lead.id;

                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(providedDrag, snapshotDrag) => (
                              <div
                                ref={providedDrag.innerRef}
                                {...providedDrag.draggableProps}
                                {...providedDrag.dragHandleProps}
                                onClick={() => onSelectLead(lead)}
                                className={`relative p-3 bg-[#18181c] border border-[#27272c] rounded-xl cursor-grab transition-all select-none hover:border-zinc-600 ${
                                  snapshotDrag.isDragging ? 'shadow-2xl border-emerald-500 ring-2 ring-emerald-500/30' : ''
                                }`}
                              >
                                <div className="font-semibold text-xs text-zinc-100 leading-snug">
                                  {lead.nome}
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                                    {lead.nicho}
                                  </span>
                                  <span className="text-[11px] font-mono text-emerald-400 font-medium">
                                    R$ {lead.implantacao.toLocaleString('pt-BR')}
                                  </span>
                                </div>

                                <div
                                  className="mt-2.5 flex items-center justify-between gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFollowupPopover(lead)}
                                    title="Clique para agendar ou alterar o próximo contato"
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                                      !followupStr
                                        ? 'bg-[#121216] hover:bg-[#222227] border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                        : isOverdue
                                        ? 'bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400'
                                        : isToday
                                        ? 'bg-amber-950/60 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300'
                                        : 'bg-sky-950/50 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300'
                                    }`}
                                  >
                                    {!followupStr ? (
                                      <>
                                        <Calendar size={10} />
                                        <span>+ Agendar</span>
                                      </>
                                    ) : (
                                      <>
                                        {isOverdue ? (
                                          <AlertTriangle size={10} className="text-rose-400 shrink-0" />
                                        ) : isToday ? (
                                          <Zap size={10} className="text-amber-400 shrink-0" />
                                        ) : (
                                          <Calendar size={10} className="shrink-0" />
                                        )}
                                        <span>{formatDateBR(followupStr)}</span>
                                        {isOverdue && daysDiff > 0 && (
                                          <span className="ml-0.5 px-1 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                                            {daysDiff}d
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </button>

                                  {lead.ultimo_contato && (
                                    <span className="text-[10px] font-mono text-zinc-400" title="Último contato">
                                      Últ: {formatDateShortBR(lead.ultimo_contato)}
                                    </span>
                                  )}
                                </div>

                                {isPopoverOpen && (
                                  <div
                                    ref={popoverRef}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-2.5 z-40 w-full bg-[#111218] border border-[#272835] rounded-2xl p-3 shadow-2xl text-left font-sans cursor-default"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[11px] font-bold text-zinc-400 tracking-wide">
                                        Próximo Contato
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickFollowupSelect(lead.id, null)}
                                        className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <X size={12} />
                                        <span>Limpar</span>
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickFollowupSelect(lead.id, 0)}
                                        className="py-2 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Zap size={11} className="text-amber-400 shrink-0" />
                                        <span>Hoje</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleQuickFollowupSelect(lead.id, 1)}
                                        className="py-2 px-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Sun size={11} className="text-sky-400 shrink-0" />
                                        <span>Amanhã (+1d)</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleQuickFollowupSelect(lead.id, 3)}
                                        className="py-2 px-2 rounded-xl bg-[#1b1c26] hover:bg-[#252634] border border-[#2d2e3d] text-zinc-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Calendar size={11} className="text-zinc-400 shrink-0" />
                                        <span>Em 3 dias</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleQuickFollowupSelect(lead.id, 7)}
                                        className="py-2 px-2 rounded-xl bg-[#1b1c26] hover:bg-[#252634] border border-[#2d2e3d] text-zinc-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Calendar size={11} className="text-zinc-400 shrink-0" />
                                        <span>Em 1 semana</span>
                                      </button>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-[#22232e]">
                                      <label className="block text-[10px] text-zinc-400 mb-1">
                                        Ou escolha no calendário:
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="date"
                                          value={customFollowupDate}
                                          onChange={(e) => setCustomFollowupDate(e.target.value)}
                                          className="flex-1 min-w-0 bg-[#0b0c10] border border-[#272835] rounded-xl px-2 py-1 text-[11px] text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleCustomFollowupSave(lead.id)}
                                          title="Confirmar data"
                                          aria-label="Confirmar data"
                                          className="w-7 h-7 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                                        >
                                          <Check size={13} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                                  <span className="truncate max-w-[140px]">
                                    {lead.presenca_digital}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Enviar WhatsApp para ${lead.nome}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenWhatsApp(lead);
                                    }}
                                    className="min-h-[30px] min-w-[30px] flex items-center justify-center text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                                    title="Enviar WhatsApp"
                                  >
                                    <Send size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {remaining > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setColumnLimits(prev => ({
                              ...prev,
                              [status.id]: limit + INITIAL_COLUMN_CAP,
                            }))
                          }
                          className="w-full min-h-[36px] py-2 px-3 rounded-xl bg-[#18181b] hover:bg-[#222227] border border-[#27272a] text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
                        >
                          Ver mais (+{remaining})
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}

          {/* Colunas Opcionais de Encerrados/Pausados */}
          {showClosed && closedStatuses.map((status) => {
            const columnLeads = filteredLeads.filter(l => l.status_id === status.id);
            return (
              <div
                key={status.id}
                className="w-72 shrink-0 bg-[#0f0f13] border border-zinc-800/60 rounded-2xl flex flex-col max-h-full overflow-hidden opacity-85"
              >
                <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <h3 className="text-xs font-semibold text-zinc-300">{status.label}</h3>
                    <span className="text-[10px] font-bold font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={status.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 p-2.5 overflow-y-auto space-y-2"
                    >
                      {columnLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(providedDrag) => (
                            <div
                              ref={providedDrag.innerRef}
                              {...providedDrag.draggableProps}
                              {...providedDrag.dragHandleProps}
                              onClick={() => onSelectLead(lead)}
                              className="p-3 bg-[#141418] border border-zinc-800/80 rounded-xl cursor-grab text-xs hover:border-zinc-700"
                            >
                              <div className="font-medium text-zinc-200">{lead.nome}</div>
                              <div className="text-[11px] text-zinc-400 mt-1">{lead.nicho}</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
