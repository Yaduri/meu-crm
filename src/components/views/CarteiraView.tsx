import React, { useState } from 'react';
import type { ClientLead, MaintenanceRequest } from '../../types/crm';
import { 
  Wallet, 
  Wrench, 
  Globe, 
  Plus, 
  Send,
  Sparkles
} from 'lucide-react';

interface CarteiraViewProps {
  clients: ClientLead[];
  maintenanceRequests: MaintenanceRequest[];
  onAddMaintenance: (clientId: string, titulo: string) => void;
  onToggleMaintenance: (requestId: string) => void;
  onNovaVenda: (client: ClientLead) => void;
  onOpenWhatsApp: (client: ClientLead) => void;
}

export const CarteiraView: React.FC<CarteiraViewProps> = ({
  clients,
  maintenanceRequests,
  onAddMaintenance,
  onToggleMaintenance,
  onNovaVenda,
  onOpenWhatsApp,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [newRequestTitle, setNewRequestTitle] = useState('');

  const selectedClient = clients.find(c => c.id === selectedClientId) || clients[0];
  const clientRequests = maintenanceRequests.filter(r => r.client_id === selectedClient?.id);

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestTitle.trim() || !selectedClient) return;
    onAddMaintenance(selectedClient.id, newRequestTitle.trim());
    setNewRequestTitle('');
  };

  const totalMRR = clients.reduce((acc, c) => acc + (c.mensalidade || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-5 border-b border-[#27272a] bg-[#0d0d10] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex flex-wrap items-center gap-2">
            <Wallet size={20} className="text-emerald-400" />
            <span>Carteira de Clientes Ativos & Recorrência</span>
            <span className="text-xs font-normal text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50 font-mono">
              {clients.length} ativos
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhe a base de clientes com sites no ar, pedidos de manutenção e oportunidades de nova venda.
          </p>
        </div>

        <div className="bg-[#18181b] border border-[#27272a] px-4 py-2 rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto">
          <span className="text-zinc-400">MRR da Carteira:</span>
          <span className="font-mono font-bold text-base sm:text-lg text-emerald-400">
            R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* Left: Lista de Clientes Ativos */}
        <div className="flex-1 lg:overflow-auto p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-[#27272a]">
          {clients.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-3">
                <Wallet size={24} />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Nenhum cliente ativo na carteira ainda</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
                Quando você fechar um projeto e entregá-lo (movendo para a etapa "No ar / Entregue" na esteira de Projetos), o cliente aparecerá aqui automaticamente com a gestão de solicitações de suporte e mensalidade recorrente (MRR).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {clients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const pendingRequestsCount = maintenanceRequests.filter(r => r.client_id === client.id && r.status !== 'concluido').length;

                return (
                  <div
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedClientId(client.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedClientId(client.id);
                      }
                    }}
                    className={`p-4 bg-[#121215] border rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500/70 bg-[#16161b] shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                        : 'border-[#27272a] hover:border-zinc-700 hover:bg-[#141418]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm text-zinc-100">{client.nome}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                            {client.nicho}
                          </span>
                          {client.site_atual && (
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <Globe size={11} className="text-emerald-400" />
                              <span className="truncate max-w-[140px]">{client.site_atual}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          R$ {client.mensalidade?.toFixed(2)}/mês
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          Venc: dia {client.dia_vencimento || 10}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-800/60 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                        <Wrench size={12} className={pendingRequestsCount > 0 ? 'text-amber-400' : 'text-zinc-400'} />
                        <span>{pendingRequestsCount} manutenção pendente</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWhatsApp(client);
                          }}
                          className="min-h-[34px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                        >
                          <Send size={11} />
                          <span>Zap</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNovaVenda(client);
                          }}
                          className="min-h-[34px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                          title="Reabrir lead para novo escopo ou novo site"
                        >
                          <Sparkles size={11} />
                          <span>Nova Venda</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Painel de Manutenção & Detalhes */}
        {selectedClient ? (
          <div className="w-full lg:w-96 bg-[#0e0e11] flex flex-col lg:h-full lg:overflow-y-auto p-4 sm:p-5 space-y-5 shrink-0">
            <div>
              <div className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 inline-block">
                Cliente Ativo na Carteira
              </div>
              <h2 className="text-lg font-bold text-zinc-100 mt-2">{selectedClient.nome}</h2>
              <div className="text-xs text-zinc-400 font-mono">{selectedClient.nicho} · WhatsApp: {selectedClient.whatsapp || '-'}</div>
            </div>

            {/* Pedidos de Alteração / Manutenção */}
            <div className="bg-[#141418] border border-[#27272a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Wrench size={14} className="text-amber-400" />
                  <span>Pedidos de Manutenção / Alteração</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {clientRequests.length}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {clientRequests.length === 0 ? (
                  <div className="text-zinc-400 text-xs py-3 text-center">
                    Nenhum pedido aberto no momento.
                  </div>
                ) : (
                  clientRequests.map((req) => (
                    <label
                      key={req.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors text-xs select-none"
                    >
                      <input
                        type="checkbox"
                        checked={req.status === 'concluido'}
                        onChange={() => onToggleMaintenance(req.id)}
                        className="mt-0.5 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className={req.status === 'concluido' ? 'line-through text-zinc-400' : 'text-zinc-200'}>
                        {req.titulo}
                      </span>
                    </label>
                  ))
                )}
              </div>

              {/* Form de Nova Manutenção */}
              <form onSubmit={handleAddRequest} className="mt-3 pt-3 border-t border-zinc-800/80 flex gap-2">
                <input
                  type="text"
                  value={newRequestTitle}
                  onChange={(e) => setNewRequestTitle(e.target.value)}
                  placeholder="Ex: Trocar foto do banner..."
                  className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="submit"
                  aria-label="Registrar pedido de manutenção"
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Registrar Pedido"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>

            {/* Ação de Upsell / Nova Venda */}
            <div className="bg-gradient-to-br from-indigo-950/30 to-[#141418] border border-indigo-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
                <Sparkles size={14} />
                <span>Oportunidade de Nova Venda (Upsell)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                Quer vender um novo sistema web, tráfego ou reformulação para este cliente? Clique abaixo para abrir um novo ciclo de negociação sem perder o histórico atual.
              </p>
              <button
                type="button"
                onClick={() => onNovaVenda(selectedClient)}
                className="w-full min-h-[38px] py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Iniciar Nova Negociação com {selectedClient.nome}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full lg:w-96 bg-[#0e0e11] p-8 flex items-center justify-center text-zinc-400 text-xs shrink-0">
            Nenhum cliente selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
