import React, { useState } from 'react';
import type { Installment, MonthlyInvoice } from '../../types/crm';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Send
} from 'lucide-react';

interface FinanceiroViewProps {
  installments: Installment[];
  invoices: MonthlyInvoice[];
  onToggleInstallment: (id: string) => void;
  onToggleInvoice: (id: string) => void;
  onSendCobrançaWhatsApp: (invoice: MonthlyInvoice) => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  installments,
  invoices,
  onToggleInstallment,
  onToggleInvoice,
  onSendCobrançaWhatsApp,
}) => {
  const [activeTab, setActiveTab] = useState<'mensalidades' | 'implantacao'>('mensalidades');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Cálculos de Mensalidades (MRR)
  const totalMRR = invoices.reduce((acc, inv) => acc + inv.valor, 0);
  const mrrRecebido = invoices.filter(inv => inv.pago).reduce((acc, inv) => acc + inv.valor, 0);
  const mrrPendente = invoices.filter(inv => !inv.pago).reduce((acc, inv) => acc + inv.valor, 0);

  // Cálculos de Implantação
  const totalImplantacao = installments.reduce((acc, inst) => acc + inst.valor, 0);
  const implantacaoRecebida = installments.filter(inst => inst.pago).reduce((acc, inst) => acc + inst.valor, 0);
  const implantacaoPendente = installments.filter(inst => !inst.pago).reduce((acc, inst) => acc + inst.valor, 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-8 py-5 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            <span>Painel Financeiro & Mensalidades (MRR)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Controle de entradas de projetos e cobranças de hospedagem/manutenção com 1 clique no WhatsApp.
          </p>
        </div>

        {/* Alternador de Abas */}
        <div className="bg-[#18181b] border border-[#27272a] p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('mensalidades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'mensalidades'
                ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mensalidades (Hospedagem)
          </button>
          <button
            onClick={() => setActiveTab('implantacao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'implantacao'
                ? 'bg-[#27272a] text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Implantações (Entradas/Saldo)
          </button>
        </div>
      </header>

      {/* KPI Cards Row */}
      <div className="p-8 pb-4 grid grid-cols-4 gap-4">
        {activeTab === 'mensalidades' ? (
          <>
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4.5">
              <div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between">
                <span>MRR Total Ativo</span>
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Receita recorrente contratada</div>
            </div>

            <div className="bg-[#121215] border border-emerald-500/30 rounded-2xl p-4.5">
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between">
                <span>Recebido Este Mês</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                R$ {mrrRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Já quitado pelos clientes</div>
            </div>

            <div className="bg-[#121215] border border-amber-500/30 rounded-2xl p-4.5">
              <div className="text-[11px] text-amber-400 font-medium flex items-center justify-between">
                <span>A Receber / Pendente</span>
                <Clock size={14} className="text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                R$ {mrrPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Vencendo nos próximos dias</div>
            </div>

            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4.5">
              <div className="text-[11px] text-zinc-400 font-medium">Assinaturas Ativas</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {invoices.length} clientes
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Hospedagem & suporte</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4.5">
              <div className="text-[11px] text-zinc-400 font-medium">Total de Implantações</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                R$ {totalImplantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-[#121215] border border-emerald-500/30 rounded-2xl p-4.5">
              <div className="text-[11px] text-emerald-400 font-semibold">Total Recebido (Entradas)</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                R$ {implantacaoRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-[#121215] border border-amber-500/30 rounded-2xl p-4.5">
              <div className="text-[11px] text-amber-400 font-medium">A Receber (Na Entrega)</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                R$ {implantacaoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4.5">
              <div className="text-[11px] text-zinc-400 font-medium">Parcelas Cadastradas</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {installments.length} parcelas
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabela de Lançamentos */}
      <div className="flex-1 overflow-auto px-8 py-4">
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
          {activeTab === 'mensalidades' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#16161b] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a]">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24] text-zinc-300">
                {invoices.map((inv) => {
                  const isLate = !inv.pago && inv.vencimento < todayStr;
                  return (
                    <tr key={inv.id} className="hover:bg-[#18181d] transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-100">
                        {inv.cliente_nome}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {inv.competencia}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={isLate ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                          {inv.vencimento.split('-').reverse().join('/')}
                        </span>
                        {isLate && (
                          <span className="ml-2 text-[10px] bg-rose-500/15 text-rose-400 px-1.5 py-0.2 rounded font-semibold">
                            Atrasado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-100">
                        R$ {inv.valor.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onToggleInvoice(inv.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            inv.pago
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                          }`}
                        >
                          {inv.pago ? '✓ Pago' : 'Pendente (Clique p/ Quitar)'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!inv.pago && (
                          <button
                            onClick={() => onSendCobrançaWhatsApp(inv)}
                            className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Send size={12} />
                            <span>Lembrete WhatsApp</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#16161b] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a]">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Parcela / Descrição</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24] text-zinc-300">
                {installments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#18181d] transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-100">
                      {inst.cliente_nome}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-medium">
                      {inst.descricao}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {inst.vencimento.split('-').reverse().join('/')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {inst.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onToggleInstallment(inst.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          inst.pago
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        {inst.pago ? '✓ Recebido' : 'Pendente (Clique p/ Quitar)'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
