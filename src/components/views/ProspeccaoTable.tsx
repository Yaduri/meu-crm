import React, { useState, useEffect, useRef } from 'react';
import type { ClientLead } from '../../types/crm';
import { DEFAULT_STATUSES, isLeadActiveForFollowup } from '../../types/crm';
import {
  Send,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Trash2,
  Calendar,
  CalendarCheck,
  DollarSign,
  X,
  AlertTriangle,
  Zap,
  Sun,
  Check,
} from 'lucide-react';

interface ProspeccaoTableProps {
  leads: ClientLead[];
  onSelectLead: (lead: ClientLead) => void;
  onOpenWhatsApp: (lead: ClientLead) => void;
  onMoveLeadStatus: (leadId: string, targetStatusId: string) => void;
  onBulkUpdateLeads?: (leadIds: string[], updates: Partial<ClientLead>) => void;
  onBulkDeleteLeads?: (leadIds: string[]) => void;
}

type SortField = 
  | 'nome' 
  | 'nicho' 
  | 'status_id' 
  | 'presenca_digital' 
  | 'whatsapp' 
  | 'implantacao' 
  | 'mensalidade' 
  | 'ultimo_contato'
  | 'proximo_followup';

type SortOrder = 'asc' | 'desc';

const PAGE_STEP = 50;

export const ProspeccaoTable: React.FC<ProspeccaoTableProps> = ({
  leads,
  onSelectLead,
  onOpenWhatsApp,
  onMoveLeadStatus,
  onBulkUpdateLeads,
  onBulkDeleteLeads,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedNicho, setSelectedNicho] = useState<string>('todos');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_STEP);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const handleMarkLastContactToday = (leadId: string) => {
    if (!onBulkUpdateLeads) return;
    onBulkUpdateLeads([leadId], { ultimo_contato: todayStr });
  };

  const getDaysDiffFromToday = (dateStr: string): number => {
    const target = new Date(`${dateStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);
    return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  };

  const toggleSelectOne = (leadId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

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

      if (sortField === 'ultimo_contato') {
        const dateA = a.ultimo_contato || '0000-00-00';
        const dateB = b.ultimo_contato || '0000-00-00';
        return dateA.localeCompare(dateB) * multiplier;
      }

      const strA = String(a[sortField] || '').toLowerCase();
      const strB = String(b[sortField] || '').toLowerCase();
      return strA.localeCompare(strB, 'pt-BR') * multiplier;
    });

  const paginatedLeads = filteredLeads.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLeads.length;
  const allVisibleSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLeads.map(l => l.id)));
    }
  };

  const handleBulkFollowupDays = (daysOffset: number) => {
    if (!onBulkUpdateLeads || selectedIds.size === 0) return;
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dateStr = d.toISOString().slice(0, 10);
    onBulkUpdateLeads(Array.from(selectedIds), { proximo_followup: dateStr });
    setSelectedIds(new Set());
  };

  const handleBulkStatusChange = (statusId: string) => {
    if (!onBulkUpdateLeads || !statusId || selectedIds.size === 0) return;
    onBulkUpdateLeads(Array.from(selectedIds), { status_id: statusId });
    setSelectedIds(new Set());
  };

  const handleBulkPriceChange = () => {
    if (!onBulkUpdateLeads || selectedIds.size === 0) return;
    const raw = window.prompt('Novo valor de Implantação (R$) para os leads selecionados:', '1200');
    if (!raw) return;
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0) {
      onBulkUpdateLeads(Array.from(selectedIds), { implantacao: val });
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (!onBulkDeleteLeads || selectedIds.size === 0) return;
    if (window.confirm(`Deseja realmente excluir os ${selectedIds.size} leads selecionados?`)) {
      onBulkDeleteLeads(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Bulk Action Bar (Feature #4) */}
      {selectedIds.size > 0 && (
        <div className="px-4 sm:px-6 py-2.5 bg-emerald-950/30 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-emerald-400 font-mono bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <X size={12} />
              <span>Limpar seleção</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label="Mudar status em lote"
              defaultValue=""
              onChange={(e) => {
                handleBulkStatusChange(e.target.value);
                e.target.value = '';
              }}
              className="min-h-[32px] bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="" disabled>Mudar Status em Lote...</option>
              {DEFAULT_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleBulkFollowupDays(0)}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <Calendar size={12} className="text-sky-400" />
              <span>Follow-up: Hoje</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkFollowupDays(1)}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <Calendar size={12} className="text-emerald-400" />
              <span>Amanhã (+1d)</span>
            </button>

            <button
              type="button"
              onClick={handleBulkPriceChange}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <DollarSign size={12} className="text-emerald-400" />
              <span>Definir Valor</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Excluir ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}
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
              <th className="py-3 pl-4 pr-2 w-8">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os leads visíveis"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </th>
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
                onClick={() => handleSort('ultimo_contato')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'ultimo_contato' ? 'text-emerald-400' : ''}>Último Contato</span>
                  {renderSortIcon('ultimo_contato')}
                </div>
              </th>

              <th
                onClick={() => handleSort('proximo_followup')}
                className="py-3 px-4 cursor-pointer hover:bg-[#18181d] hover:text-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span className={sortField === 'proximo_followup' ? 'text-emerald-400' : ''}>Próximo Follow-up</span>
                  {renderSortIcon('proximo_followup')}
                </div>
              </th>

              <th className="py-3 px-4 text-center">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1e1e24] text-zinc-300">
            {paginatedLeads.map((lead) => {
              const status = DEFAULT_STATUSES.find(s => s.id === lead.status_id) || DEFAULT_STATUSES[0];
              const isChecked = selectedIds.has(lead.id);
              const isActiveLead = isLeadActiveForFollowup(lead);
              const followupStr = lead.proximo_followup;
              const isOverdue = Boolean(isActiveLead && followupStr && followupStr < todayStr);
              const isToday = Boolean(followupStr && followupStr === todayStr);
              const daysDiff = followupStr ? getDaysDiffFromToday(followupStr) : 0;
              const isPopoverOpen = openFollowupLeadId === lead.id;

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
                  className={`hover:bg-[#15151a] focus-visible:bg-[#15151a] cursor-pointer transition-colors ${
                    isChecked ? 'bg-emerald-950/15' : ''
                  }`}
                >
                  <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${lead.nome}`}
                      checked={isChecked}
                      onChange={() => toggleSelectOne(lead.id)}
                      className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </td>
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
                  <td className="py-3 px-4 font-mono text-zinc-300" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <span>
                        {lead.ultimo_contato ? lead.ultimo_contato.split('-').reverse().join('/') : '-'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarkLastContactToday(lead.id)}
                        title="Marcar último contato como Hoje"
                        aria-label={`Marcar último contato de ${lead.nome} como hoje`}
                        className="p-1 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                      >
                        <CalendarCheck size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenFollowupPopover(lead)}
                      title="Clique para agendar ou alterar o próximo contato"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        !followupStr
                          ? 'bg-[#18181b] hover:bg-[#222227] border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          : isOverdue
                          ? 'bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400'
                          : isToday
                          ? 'bg-amber-950/60 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300'
                          : isActiveLead
                          ? 'bg-sky-950/50 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300'
                          : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-400'
                      }`}
                    >
                      {!followupStr ? (
                        <>
                          <Calendar size={11} />
                          <span>+ Agendar</span>
                        </>
                      ) : (
                        <>
                          {isOverdue ? (
                            <AlertTriangle size={11} className="text-rose-400 shrink-0" />
                          ) : isToday ? (
                            <Zap size={11} className="text-amber-400 shrink-0" />
                          ) : (
                            <Calendar size={11} className="shrink-0" />
                          )}
                          <span>{followupStr.split('-').reverse().join('/')}</span>
                          {isOverdue && daysDiff > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                              {daysDiff}d
                            </span>
                          )}
                          {isToday && (
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              Hoje
                            </span>
                          )}
                        </>
                      )}
                    </button>

                    {isPopoverOpen && (
                      <div
                        ref={popoverRef}
                        className="absolute right-4 top-11 z-40 w-64 bg-[#111218] border border-[#272835] rounded-2xl p-3.5 shadow-2xl text-left font-sans"
                      >
                        <div className="flex items-center justify-between mb-2.5">
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

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickFollowupSelect(lead.id, 0)}
                            className="py-2.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Zap size={12} className="text-amber-400 shrink-0" />
                            <span>Hoje</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickFollowupSelect(lead.id, 1)}
                            className="py-2.5 px-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Sun size={12} className="text-sky-400 shrink-0" />
                            <span className="leading-tight text-center">Amanhã (+1d)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickFollowupSelect(lead.id, 3)}
                            className="py-2.5 px-2.5 rounded-xl bg-[#1b1c26] hover:bg-[#252634] border border-[#2d2e3d] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Calendar size={12} className="text-zinc-400 shrink-0" />
                            <span>Em 3 dias</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickFollowupSelect(lead.id, 7)}
                            className="py-2.5 px-2.5 rounded-xl bg-[#1b1c26] hover:bg-[#252634] border border-[#2d2e3d] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Calendar size={12} className="text-zinc-400 shrink-0" />
                            <span className="leading-tight text-center">Em 1 semana</span>
                          </button>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#22232e]">
                          <label className="block text-[11px] text-zinc-400 mb-1.5">
                            Ou escolha no calendário:
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={customFollowupDate}
                              onChange={(e) => setCustomFollowupDate(e.target.value)}
                              className="flex-1 min-w-0 bg-[#0b0c10] border border-[#272835] rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleCustomFollowupSave(lead.id)}
                              title="Confirmar data"
                              aria-label="Confirmar data"
                              className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
