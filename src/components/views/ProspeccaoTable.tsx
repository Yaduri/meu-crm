import React, { useState } from 'react';
import type { ClientLead } from '../../types/crm';
import { DEFAULT_STATUSES } from '../../types/crm';
import { Send, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';

interface ProspeccaoTableProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
}

type SortField = 
  | 'nome' 
  | 'nicho' 
  | 'status_id' 
  | 'presenca_digital' 
  | 'whatsapp' 
  | 'implantacao' 
  | 'mensalidade' 
  | 'proximo_followup';

type SortOrder = 'asc' | 'desc';

const PAGE_STEP = 50;

export const ProspeccaoTable: React.FC<ProspeccaoTableProps> = ({
  leads,
  onSelectLead,
  onOpenWhatsApp,
  onMoveLeadStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedNicho, setSelectedNicho] = useState<string>('todos');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_STEP);

  // Lista dinâmica de nichos presentes na base
  const uniqueNichos = Array.from(new Set(leads.map(l => l.nicho).filter(Boolean))).sort();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={11} className="text-emerald-400" />
    ) : (
      <ArrowDown size={11} className="text-emerald-400" />
    );
  };

  const filteredLeads = leads
    .filter(l => {
      const matchSearch =
        l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.nicho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.whatsapp && l.whatsapp.includes(searchTerm));
      const matchStatus = selectedStatus === 'todos' || l.status_id === selectedStatus;
      const matchNicho = selectedNicho === 'todos' || l.nicho === selectedNicho;
      return matchSearch && matchStatus && matchNicho;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;

      if (sortField === 'implantacao' || sortField === 'mensalidade') {
        const valA = a[sortField] || 0;
        const valB = b[sortField] || 0;
        return (valA - valB) * multiplier;
      }

      if (sortField === 'proximo_followup') {
        const dateA = a.proximo_followup || '9999-99-99';
        const dateB = b.proximo_followup || '9999-99-99';
        return dateA.localeCompare(dateB) * multiplier;
      }

      const strA = String(a[sortField] || '').toLowerCase();
      const strB = String(b[sortField] || '').toLowerCase();
      return strA.localeCompare(strB, 'pt-BR') * multiplier;
    });

  const paginatedLeads = filteredLeads.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLeads.length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Table Filters */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#27272a] bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative w-full sm:flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(PAGE_STEP);
              }}
              placeholder="Filtrar na tabela..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <select
            aria-label="Filtrar por status"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setVisibleCount(PAGE_STEP);
            }}
            className="min-h-[34px] bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os status</option>
            {DEFAULT_STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <select
            aria-label="Filtrar por nicho"
            value={selectedNicho}
            onChange={(e) => {
              setSelectedNicho(e.target.value);
              setVisibleCount(PAGE_STEP);
            }}
            className="min-h-[34px] bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os nichos</option>
            {uniqueNichos.map(nicho => (
              <option key={nicho} value={nicho}>{nicho}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-zinc-400 font-medium font-mono">
          Exibindo <span className="text-zinc-200 font-semibold">{paginatedLeads.length}</span> de <span className="text-zinc-200 font-semibold">{filteredLeads.length}</span> leads
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse select-none">
          <thead className="bg-[#121215] text-zinc-300 font-semibold text-[11px] sticky top-0 border-b border-[#27272a] z-10">
            <tr>
              <th
                onClick={() => handleSort('nome')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'nome' ? 'text-emerald-400' : ''}>Cliente / Nome</span>
                  {renderSortIcon('nome')}
                </div>
              </th>

              <th
                onClick={() => handleSort('nicho')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'nicho' ? 'text-emerald-400' : ''}>Nicho</span>
                  {renderSortIcon('nicho')}
                </div>
              </th>

              <th
                onClick={() => handleSort('status_id')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'status_id' ? 'text-emerald-400' : ''}>Status</span>
                  {renderSortIcon('status_id')}
                </div>
              </th>

              <th
                onClick={() => handleSort('presenca_digital')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'presenca_digital' ? 'text-emerald-400' : ''}>Presença Digital</span>
                  {renderSortIcon('presenca_digital')}
                </div>
              </th>

              <th
                onClick={() => handleSort('whatsapp')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'whatsapp' ? 'text-emerald-400' : ''}>WhatsApp</span>
                  {renderSortIcon('whatsapp')}
                </div>
              </th>

              <th
                onClick={() => handleSort('implantacao')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className={sortField === 'implantacao' ? 'text-emerald-400' : ''}>Implantação</span>
                  {renderSortIcon('implantacao')}
                </div>
              </th>

              <th
                onClick={() => handleSort('mensalidade')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className={sortField === 'mensalidade' ? 'text-emerald-400' : ''}>Mensalidade</span>
                  {renderSortIcon('mensalidade')}
                </div>
              </th>

              <th
                onClick={() => handleSort('proximo_followup')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'proximo_followup' ? 'text-emerald-400' : ''}>Próximo Contato</span>
                  {renderSortIcon('proximo_followup')}
                </div>
              </th>

              <th className="py-3 px-4 text-center">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1e1e24] text-zinc-300">
            {paginatedLeads.map((lead) => {
              const status = DEFAULT_STATUSES.find(s => s.id === lead.status_id) || DEFAULT_STATUSES[0];
              return (
                <tr
                  key={lead.id}
                  tabIndex={0}
                  onClick={() => onSelectLead(lead)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectLead(lead);
                    }
                  }}
                  className="hover:bg-[#15151a] focus-visible:bg-[#15151a] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-zinc-100">
                    <span>{lead.nome}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium text-[11px]">
                      {lead.nicho}
                    </span>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <select
                        aria-label={`Status de ${lead.nome}`}
                        value={lead.status_id}
                        onChange={(e) => onMoveLeadStatus(lead.id, e.target.value)}
                        className="min-h-[32px] bg-[#18181b] border border-zinc-700/60 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        {DEFAULT_STATUSES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {lead.presenca_digital}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">
                    {lead.whatsapp || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-emerald-400">
                    R$ {lead.implantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-300">
                    {lead.mensalidade > 0 ? `R$ ${lead.mensalidade.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-zinc-300 font-mono">
                    {lead.proximo_followup ? lead.proximo_followup.split('-').reverse().join('/') : '-'}
                  </td>
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(lead)}
                      className="min-h-[34px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium cursor-pointer"
                      title="Abrir no WhatsApp"
                    >
                      <Send size={12} />
                      <span>Zap</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {hasMore && (
          <div className="p-4 border-t border-[#27272a] bg-[#121215] flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + PAGE_STEP)}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ChevronDown size={14} />
              <span>Carregar mais {Math.min(PAGE_STEP, filteredLeads.length - visibleCount)} leads</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount(filteredLeads.length)}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-transparent hover:bg-[#18181b] text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Mostrar todos ({filteredLeads.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
