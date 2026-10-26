import React, { useState } from 'react';
import type { ClientLead } from '../../types/crm';
import { DEFAULT_STATUSES } from '../../types/crm';
import { Send, Search } from 'lucide-react';

interface ProspeccaoTableProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
}

export const ProspeccaoTable: React.FC<ProspeccaoTableProps> = ({
  leads,
  onSelectLead,
  onOpenWhatsApp,
  onMoveLeadStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedNicho, setSelectedNicho] = useState<string>('todos');

  const filteredLeads = leads.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        l.nicho.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (l.whatsapp && l.whatsapp.includes(searchTerm));
    const matchStatus = selectedStatus === 'todos' || l.status_id === selectedStatus;
    const matchNicho = selectedNicho === 'todos' || l.nicho === selectedNicho;
    return matchSearch && matchStatus && matchNicho;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Table Filters */}
      <div className="px-6 py-3 border-b border-[#27272a] bg-[#121215] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar em todos os campos..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="todos">Todos os status</option>
            {DEFAULT_STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <select
            value={selectedNicho}
            onChange={(e) => setSelectedNicho(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="todos">Todos os nichos</option>
            <option value="Estética">Estética</option>
            <option value="Advogado">Advogado</option>
            <option value="Massoterapia">Massoterapia</option>
            <option value="Dentista">Dentista</option>
            <option value="Psicólogo">Psicólogo</option>
          </select>
        </div>

        <div className="text-xs text-zinc-400 font-medium">
          Total: <span className="text-zinc-200 font-semibold">{filteredLeads.length}</span> leads
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#121215] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] sticky top-0 border-b border-[#27272a] z-10">
            <tr>
              <th className="py-3 px-4">Cliente / Nome</th>
              <th className="py-3 px-4">Nicho</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Presença Digital</th>
              <th className="py-3 px-4">WhatsApp</th>
              <th className="py-3 px-4 text-right">Implantação</th>
              <th className="py-3 px-4 text-right">Mensalidade</th>
              <th className="py-3 px-4">Próximo Contato</th>
              <th className="py-3 px-4 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e24] text-zinc-300">
            {filteredLeads.map((lead) => {
              const status = DEFAULT_STATUSES.find(s => s.id === lead.status_id) || DEFAULT_STATUSES[0];
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="hover:bg-[#15151a] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-zinc-100 flex items-center gap-2">
                    <span>{lead.nome}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium text-[11px]">
                      {lead.nicho}
                    </span>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status_id}
                      onChange={(e) => onMoveLeadStatus(lead.id, e.target.value)}
                      className="bg-[#18181b] border border-zinc-700/60 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-hidden cursor-pointer"
                      style={{ borderLeftColor: status.color, borderLeftWidth: '3px' }}
                    >
                      {DEFAULT_STATUSES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {lead.presenca_digital}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400">
                    {lead.whatsapp || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-emerald-400">
                    R$ {lead.implantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-400">
                    {lead.mensalidade > 0 ? `R$ ${lead.mensalidade.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {lead.proximo_followup || '-'}
                  </td>
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenWhatsApp(lead)}
                      className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 font-medium cursor-pointer"
                      title="Abrir no WhatsApp"
                    >
                      <Send size={11} />
                      <span>Zap</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
