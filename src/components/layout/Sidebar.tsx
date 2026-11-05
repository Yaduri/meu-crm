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
  X,
  PanelLeftClose,
  PanelLeftOpen
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  isCollapsed = false,
  onToggleCollapse,
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
        className={`fixed inset-y-0 left-0 z-40 bg-[#121215] border-r border-[#27272a] flex flex-col h-screen select-none transform transition-[width,transform] duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpenMobile 
            ? 'translate-x-0 w-64' 
            : isCollapsed
              ? '-translate-x-full lg:translate-x-0 lg:w-[68px]'
              : '-translate-x-full lg:translate-x-0 lg:w-64'
        }`}
      >
        {/* Top Profile / Brand */}
        {!isCollapsed ? (
          <div className="p-3.5 border-b border-[#27272a] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 overflow-hidden flex items-center justify-center p-1 shadow-xs shrink-0">
                <img 
                  src="/logo-yd-symbol.png" 
                  alt="Yago Duarte" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-zinc-100 leading-tight truncate">Yago Duarte</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Disponível
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Recuar menu lateral (Ctrl+B para mais espaço)"
                  aria-label="Recuar menu lateral"
                  className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#1f1f23] transition-colors cursor-pointer"
                >
                  <PanelLeftClose size={18} />
                </button>
              )}
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
          </div>
        ) : (
          <div className="p-3 border-b border-[#27272a] flex flex-col items-center gap-2">
            <div 
              className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 overflow-hidden flex items-center justify-center p-1 shadow-xs relative shrink-0"
              title="Yago Duarte (Disponível)"
            >
              <img 
                src="/logo-yd-symbol.png" 
                alt="Yago Duarte" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#121215]"></span>
            </div>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expandir menu lateral (Ctrl+B)"
                aria-label="Expandir menu lateral"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#1f1f23] transition-colors cursor-pointer"
              >
                <PanelLeftOpen size={18} />
              </button>
            )}
          </div>
        )}

        {/* Quick Add Button */}
        {!isCollapsed ? (
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
        ) : (
          <div className="p-2.5 flex justify-center">
            <button
              type="button"
              onClick={() => {
                onNewLead();
                onCloseMobile?.();
              }}
              title="Novo Lead (N)"
              aria-label="Novo Lead"
              className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const tooltip = `${item.label}${item.badge !== undefined && item.badge > 0 ? ` (${item.badge})` : ''}`;

            if (isCollapsed) {
              return (
                <div key={item.id} className="flex justify-center">
                  <button
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleSelect(item.id)}
                    title={tooltip}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#27272a] text-zinc-100 shadow-sm border border-zinc-700/60'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-zinc-400'} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[17px] h-4 px-1 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center font-mono ring-2 ring-[#121215]">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                </div>
              );
            }

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
        {!isCollapsed ? (
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
        ) : (
          <div className="p-2 border-t border-[#27272a] flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenMigration();
                onCloseMobile?.();
              }}
              title="Importar do Sistema Antigo"
              aria-label="Importar do Sistema Antigo"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] transition-colors cursor-pointer"
            >
              <UploadCloud size={17} className="text-emerald-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onExportCsv();
                onCloseMobile?.();
              }}
              title="Exportar Base (CSV)"
              aria-label="Exportar Base (CSV)"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] transition-colors cursor-pointer"
            >
              <DownloadCloud size={17} className="text-zinc-400" />
            </button>
          </div>
        )}

        {/* Command palette hint */}
        {!isCollapsed ? (
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
        ) : (
          <div className="p-2 border-t border-[#27272a] flex justify-center">
            <button
              type="button"
              onClick={() => {
                onOpenCommandPalette?.();
                onCloseMobile?.();
              }}
              title="Buscar lead... (Ctrl+K)"
              aria-label="Buscar lead"
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#18181b] hover:bg-[#222227] border border-[#27272a] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Search size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
