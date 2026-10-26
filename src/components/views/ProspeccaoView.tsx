import React, { useState } from 'react';
import type { ClientLead } from '../../types/crm';
import { ProspeccaoKanban } from './ProspeccaoKanban';
import { ProspeccaoTable } from './ProspeccaoTable';
import { Kanban, Table as TableIcon, Plus } from 'lucide-react';

interface ProspeccaoViewProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onNewLead: () => void;
  onNewLeadWithStatus: (statusId: string) => void;
}

export const ProspeccaoView: React.FC<ProspeccaoViewProps> = ({
  leads,
  onSelectLead,
  onMoveLeadStatus,
  onOpenWhatsApp,
  onNewLead,
  onNewLeadWithStatus,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'tabela'>('kanban');

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
      {/* Top Header of Prospecção */}
      <header className="px-8 py-4 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Pipeline de Prospecção</span>
            <span className="text-xs font-normal text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
              {leads.length} leads no radar
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gerencie contatos frios, envio de prévias, propostas e negociações ativas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Switch Kanban vs Tabela */}
          <div className="bg-[#18181b] border border-[#27272a] p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Kanban size={13} />
              <span>Kanban</span>
            </button>

            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'tabela'
                  ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TableIcon size={13} />
              <span>Tabela</span>
            </button>
          </div>

          <button
            onClick={onNewLead}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={15} />
            <span>Novo Lead</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'kanban' ? (
          <ProspeccaoKanban
            leads={leads}
            onSelectLead={onSelectLead}
            onMoveLeadStatus={onMoveLeadStatus}
            onOpenWhatsApp={onOpenWhatsApp}
            onNewLeadWithStatus={onNewLeadWithStatus}
          />
        ) : (
          <ProspeccaoTable
            leads={leads}
            onSelectLead={onSelectLead}
            onOpenWhatsApp={onOpenWhatsApp}
            onMoveLeadStatus={onMoveLeadStatus}
          />
        )}
      </div>
    </div>
  );
};
