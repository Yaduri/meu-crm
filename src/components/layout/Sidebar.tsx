import React from 'react';
import { 
  Calendar, 
  Users, 
  FolderKanban, 
  Wallet, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Search,
  Plus,
  UploadCloud,
  DownloadCloud
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  counts: {
    hoje: number;
    prospeccao: number;
    projetos: number;
    carteira: number;
  };
  onNewLead: () => void;
  onOpenMigration: () => void;
  onExportCsv: () => void;
  onOpenCommandPalette?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  counts,
  onNewLead,
  onOpenMigration,
  onExportCsv,
  onOpenCommandPalette,
}) => {
  const navItems = [
    { id: 'hoje', label: 'Hoje', icon: Calendar, badge: counts.hoje },
    { id: 'prospeccao', label: 'Prospecção', icon: Users, badge: counts.prospeccao },
    { id: 'projetos', label: 'Projetos', icon: FolderKanban, badge: counts.projetos },
    { id: 'carteira', label: 'Carteira', icon: Wallet, badge: counts.carteira },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#121215] border-r border-[#27272a] flex flex-col h-screen select-none">
      {/* Top Profile / Brand */}
      <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 overflow-hidden flex items-center justify-center p-1 shadow-xs">
            <img 
              src="/logo-yd-symbol.png" 
              alt="Yago Duarte" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="font-semibold text-sm text-zinc-100 leading-tight">Yago Duarte</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Disponível
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Button */}
      <div className="p-3">
        <button
          onClick={onNewLead}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={15} />
          <span>Novo Lead (N)</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-zinc-400'} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Migration & Backup Tools */}
      <div className="p-3 border-t border-[#27272a] space-y-1.5">
        <button
          onClick={onOpenMigration}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] text-xs font-medium transition-colors cursor-pointer"
        >
          <UploadCloud size={14} className="text-emerald-400" />
          <span>Importar do Sistema Antigo</span>
        </button>

        <button
          onClick={onExportCsv}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] text-xs font-medium transition-colors cursor-pointer"
        >
          <DownloadCloud size={14} className="text-zinc-400" />
          <span>Exportar Base (CSV)</span>
        </button>
      </div>

      {/* Command palette hint */}
      <div className="p-3 border-t border-[#27272a]">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#18181b] hover:bg-[#222227] border border-[#27272a] text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search size={13} />
            <span>Buscar lead...</span>
          </div>
          <kbd className="text-[10px] bg-[#27272a] px-1.5 py-0.5 rounded text-zinc-300 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </aside>
  );
};
