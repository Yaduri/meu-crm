import React, { useState } from 'react';
import type { ClientLead } from '../../types/crm';
import { DEFAULT_STATUSES } from '../../types/crm';
import { 
  Send, 
  Search, 
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface ProspeccaoKanbanProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onNewLeadWithStatus: (statusId: string) => void;
}

export const ProspeccaoKanban: React.FC<ProspeccaoKanbanProps> = ({
  leads,
  onSelectLead,
  onMoveLeadStatus,
  onOpenWhatsApp,
  onNewLeadWithStatus,
}) => {
  const [showClosed, setShowClosed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNicho, setSelectedNicho] = useState<string>('todos');

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
      <div className="px-6 py-3 border-b border-[#27272a] bg-[#121215] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome, nicho ou telefone..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedNicho}
            onChange={(e) => setSelectedNicho(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os nichos</option>
            {uniqueNichos.map(nicho => (
              <option key={nicho} value={nicho}>{nicho}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowClosed(!showClosed)}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] transition-colors cursor-pointer"
        >
          {showClosed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{showClosed ? 'Ocultar Encerrados e Pausados' : 'Ver Encerrados e Pausados'}</span>
        </button>
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-4">
          {activeStatuses.map((status) => {
            const columnLeads = filteredLeads.filter(l => l.status_id === status.id);

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
                    <span className="text-[10px] font-bold bg-[#1f1f24] text-zinc-400 px-1.5 py-0.2 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                  <button
                    onClick={() => onNewLeadWithStatus(status.id)}
                    className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
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
                      {columnLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(providedDrag, snapshotDrag) => (
                            <div
                              ref={providedDrag.innerRef}
                              {...providedDrag.draggableProps}
                              {...providedDrag.dragHandleProps}
                              onClick={() => onSelectLead(lead)}
                              className={`p-3 bg-[#18181c] border border-[#27272c] rounded-xl cursor-grab transition-all select-none hover:border-zinc-600 ${
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

                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                                <span className="truncate max-w-[130px]">
                                  {lead.presenca_digital}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenWhatsApp(lead);
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 p-1 rounded transition-colors cursor-pointer"
                                  title="Enviar WhatsApp"
                                >
                                  <Send size={11} />
                                </button>
                              </div>
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
                    <h3 className="text-xs font-semibold text-zinc-400">{status.label}</h3>
                    <span className="text-[10px] font-bold bg-zinc-800 text-zinc-500 px-1.5 py-0.2 rounded-full">
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
                              <div className="font-medium text-zinc-300">{lead.nome}</div>
                              <div className="text-[10px] text-zinc-500 mt-1">{lead.nicho}</div>
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
