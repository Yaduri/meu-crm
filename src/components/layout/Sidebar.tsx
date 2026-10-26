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
  DownloadCloud,
  X
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
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  counts,
  onNewLead,
  onOpenMigration,
  onExportCsv,
  onOpenCommandPalette,
  isOpenMobile = false,
  onCloseMobile,
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

  const handleSelect = (viewId: string) => {
    onSelectView(viewId);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#121215] border-r border-[#27272a] flex flex-col h-screen select-none transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#18181b] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Quick Add Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNewLead();
              onCloseMobile?.();
            }}
            className="w-full min-h-[40px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors shadow-sm cursor-pointer"
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
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleSelect(item.id)}
                className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold font-mono ${
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
            type="button"
            onClick={() => {
              onOpenMigration();
              onCloseMobile?.();
            }}
            className="w-full min-h-[36px] flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] text-xs font-medium transition-colors cursor-pointer"
          >
            <UploadCloud size={14} className="text-emerald-400" />
            <span>Importar do Sistema Antigo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onExportCsv();
              onCloseMobile?.();
            }}
            className="w-full min-h-[36px] flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] text-xs font-medium transition-colors cursor-pointer"
          >
            <DownloadCloud size={14} className="text-zinc-400" />
            <span>Exportar Base (CSV)</span>
          </button>
        </div>

        {/* Command palette hint */}
        <div className="p-3 border-t border-[#27272a]">
          <button
            type="button"
            onClick={() => {
              onOpenCommandPalette?.();
              onCloseMobile?.();
            }}
            className="w-full min-h-[38px] flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#18181b] hover:bg-[#222227] border border-[#27272a] text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors cursor-pointer"
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
    </>
  );
};
