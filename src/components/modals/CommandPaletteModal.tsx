import React, { useState, useEffect, useRef } from 'react';
import type { ClientLead, Project } from '../../types/crm';
import { 
  Search, 
  User, 
  FolderKanban, 
  Plus, 
  Calendar, 
  DollarSign, 
  Wallet,
  ArrowRight
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: ClientLead[];
  projects: Project[];
  onSelectLead: (lead: ClientLead) => void;
  onSelectProject: (project: Project) => void;
  onNavigateView: (view: string) => void;
  onNewLead: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  leads,
  projects,
  onSelectLead,
  onSelectProject,
  onNavigateView,
  onNewLead
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  // Resultados
  const filteredLeads = cleanQuery
    ? leads.filter(l => 
        l.nome.toLowerCase().includes(cleanQuery) || 
        l.nicho.toLowerCase().includes(cleanQuery) ||
        (l.whatsapp && l.whatsapp.includes(cleanQuery))
      ).slice(0, 5)
    : leads.slice(0, 4);

  const filteredProjects = cleanQuery
    ? projects.filter(p => 
        p.cliente_nome.toLowerCase().includes(cleanQuery) ||
        p.tipo.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : projects.slice(0, 2);

  const navigationActions = [
    { id: 'hoje', label: 'Ir para Fila de Hoje', icon: Calendar },
    { id: 'prospeccao', label: 'Ir para Funil de Prospecção', icon: User },
    { id: 'projetos', label: 'Ir para Esteira de Projetos', icon: FolderKanban },
    { id: 'financeiro', label: 'Ir para Painel Financeiro & MRR', icon: DollarSign },
    { id: 'carteira', label: 'Ir para Carteira de Clientes Ativos', icon: Wallet },
  ].filter(a => !cleanQuery || a.label.toLowerCase().includes(cleanQuery));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#27272a] flex items-center gap-3 bg-[#16161b]">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, nicho, WhatsApp ou ação rápida..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden"
          />
          <kbd className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Ação Rápida: Novo Lead */}
          <div className="px-2">
            <button
              onClick={() => {
                onClose();
                onNewLead();
              }}
              className="w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus size={15} />
                <span>Cadastrar Novo Lead (N)</span>
              </div>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Seção Leads */}
          {filteredLeads.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Leads & Contatos
              </div>
              <div className="space-y-1 mt-1">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => {
                      onClose();
                      onSelectLead(lead);
                    }}
                    className="p-2.5 rounded-xl hover:bg-[#18181b] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-[11px]">
                        {lead.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                          {lead.nome}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {lead.nicho} · {lead.whatsapp || 'Sem WhatsApp'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {lead.status_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção Projetos */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Projetos em Andamento
              </div>
              <div className="space-y-1 mt-1">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      onClose();
                      onSelectProject(project);
                    }}
                    className="p-2.5 rounded-xl hover:bg-[#18181b] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-[11px]">
                        <FolderKanban size={13} />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 group-hover:text-sky-400 transition-colors">
                          {project.cliente_nome}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {project.tipo} · {project.etapa}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navegação Rápida */}
          {navigationActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Telas & Navegação
              </div>
              <div className="space-y-1 mt-1">
                {navigationActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      onClick={() => {
                        onClose();
                        onNavigateView(action.id);
                      }}
                      className="p-2.5 rounded-xl hover:bg-[#18181b] flex items-center justify-between cursor-pointer transition-colors group text-zinc-300"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={14} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                        <span>{action.label}</span>
                      </div>
                      <ArrowRight size={13} className="text-zinc-600 group-hover:text-zinc-300" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="p-3 bg-[#0d0d10] border-t border-[#27272a] text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Dica: Pressione</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[10px]">Ctrl+K</kbd>
            <span>a qualquer momento para pesquisar</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[10px]">N</kbd>
            <span>Novo Lead</span>
          </div>
        </div>
      </div>
    </div>
  );
};