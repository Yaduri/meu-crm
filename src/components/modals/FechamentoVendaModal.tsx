import React, { useState, useEffect } from 'react';
import type { ClientLead, TipoProjeto } from '../../types/crm';
import { CHECKLIST_PADRAO_LP } from '../../types/crm';
import { CheckCircle, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FechamentoVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ClientLead | null;
  onConfirmVenda: (projectData: {
    tipo: TipoProjeto;
    implantacao: number;
    mensalidade: number;
    inicio: string;
    prazo: string;
    tasks: { id: string; titulo: string; feito: boolean }[];
  }) => void;
}

export const FechamentoVendaModal: React.FC<FechamentoVendaModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConfirmVenda,
}) => {
  const [tipo, setTipo] = useState<TipoProjeto>('Landing Page');
  const [implantacao, setImplantacao] = useState(lead?.implantacao?.toString() || '1200');
  const [mensalidade, setMensalidade] = useState(lead?.mensalidade?.toString() || '89');
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const next15Days = new Date();
  next15Days.setDate(next15Days.getDate() + 15);
  const defaultPrazo = next15Days.toISOString().slice(0, 10);

  const [inicio, setInicio] = useState(todayStr);
  const [prazo, setPrazo] = useState(defaultPrazo);

  useEffect(() => {
    if (lead) {
      setImplantacao(lead.implantacao !== undefined ? lead.implantacao.toString() : '1200');
      setMensalidade(lead.mensalidade !== undefined ? lead.mensalidade.toString() : '89');
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    const defaultTasks = CHECKLIST_PADRAO_LP.map((t, idx) => ({
      id: `task-${Date.now()}-${idx}`,
      titulo: t,
      feito: false
    }));

    onConfirmVenda({
      tipo,
      implantacao: parseFloat(implantacao) || 0,
      mensalidade: parseFloat(mensalidade) || 0,
      inicio,
      prazo,
      tasks: defaultTasks
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fechamento-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-[#121215] border border-emerald-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Comemorativo */}
        <div className="px-5 sm:px-6 py-5 border-b border-[#27272a] bg-gradient-to-r from-emerald-950/40 to-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="fechamento-modal-title" className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Venda Fechada!</span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Novo Projeto
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lead.nome} ({lead.nicho})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">Tipo de Escopo / Projeto</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoProjeto)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-medium"
            >
              <option value="Landing Page">Landing Page de Alta Conversão</option>
              <option value="Site Institucional">Site Institucional Multi-páginas</option>
              <option value="Sistema Web">Sistema Web Sob Medida</option>
              <option value="Loja Virtual / Catálogo">Loja Virtual / Catálogo de Produtos</option>
              <option value="Página de Vendas">Página de Vendas / VSL</option>
              <option value="Outro">Outro Escopo</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Valor de Implantação (R$)</label>
              <input
                type="number"
                step="50"
                required
                value={implantacao}
                onChange={(e) => setImplantacao(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-hidden focus:border-emerald-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Mensalidade / MRR (R$)</label>
              <input
                type="number"
                step="10"
                value={mensalidade}
                onChange={(e) => setMensalidade(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-bold focus:outline-hidden focus:border-emerald-500 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Início do Projeto</label>
              <input
                type="date"
                required
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Prazo Prometido de Entrega</label>
              <input
                type="date"
                required
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-400 text-[11px] leading-relaxed">
            💡 Ao confirmar, o cliente sairá da lista ativa de prospecção e será transferido automaticamente para a esteira de <strong>Projetos</strong>, já com o checklist de produção preparado!
          </div>

          <div className="pt-3 border-t border-[#27272a] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-[#27272a] hover:bg-zinc-700 text-zinc-200 font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[38px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <CheckCircle size={15} />
              <span>Confirmar e Iniciar Projeto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
