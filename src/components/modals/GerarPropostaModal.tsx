import React, { useState } from 'react';
import type { Proposal, ClientLead, ProposalItem } from '../../types/crm';
import { 
  X, 
  Send, 
  Copy, 
  ExternalLink, 
  Check, 
  Sparkles, 
  DollarSign,
  Loader2
} from 'lucide-react';

interface GerarPropostaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ClientLead | null;
  onSaveProposal: (proposal: Proposal) => void;
}

const DEFAULT_ITENS: ProposalItem[] = [
  { id: '1', titulo: 'Design Exclusivo no Figma', descricao: 'Layout sob medida criado para a sua identidade visual antes da programação.', incluso: true },
  { id: '2', titulo: 'Copywriting Persuasivo', descricao: 'Textos orientados a conversão e estruturados para quebrar objeções do cliente.', incluso: true },
  { id: '3', titulo: 'Desenvolvimento Responsivo Ultra Rápido', descricao: 'Código limpo, seguro e com carregamento instantâneo em smartphones e PCs.', incluso: true },
  { id: '4', titulo: 'Botão Flutuante de WhatsApp Direto', descricao: 'Chamadas para ação integradas com mensagem de contato pré-formatada.', incluso: true },
  { id: '5', titulo: 'Otimização Técnica de SEO e Velocidade', descricao: 'Pontuação 90+ no Google PageSpeed para melhor posicionamento orgânico.', incluso: true },
  { id: '6', titulo: 'Instalação de Pixel Meta & Google Analytics', descricao: 'Tags configuradas para mensurar cliques e conversões de anúncios futuros.', incluso: true }
];

export const GerarPropostaModal: React.FC<GerarPropostaModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveProposal
}) => {
  const [titulo, setTitulo] = useState(`Landing Page de Alta Conversão para ${lead?.nome || 'Cliente'}`);
  const [implantacao, setImplantacao] = useState(lead?.implantacao || 1200);
  const [mensalidade, setMensalidade] = useState(lead?.mensalidade || 89);
  const [prazoDias, setPrazoDias] = useState(7);
  const [formaPagamento, setFormaPagamento] = useState('50% de entrada e 50% na aprovação final');
  const [apresentacao, setApresentacao] = useState(
    `Apresentamos esta proposta técnica e comercial com foco em valorizar a autoridade da sua marca na internet e transformar visitantes em novos agendamentos diretos no seu WhatsApp.`
  );
  const [itens, setItens] = useState<ProposalItem[]>(DEFAULT_ITENS);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (lead) {
      setTitulo(`Landing Page de Alta Conversão para ${lead.nome}`);
      setImplantacao(lead.implantacao || 1200);
      setMensalidade(lead.mensalidade || 89);
      setItens(DEFAULT_ITENS);
      setAiSuccess(false);
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const handlePersonalizeWithAI = async () => {
    setAiLoading(true);
    setAiSuccess(false);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'personalize_proposal',
          lead,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.result) {
        if (json.result.titulo_proposta) setTitulo(json.result.titulo_proposta);
        if (json.result.apresentacao) setApresentacao(json.result.apresentacao);
        if (Array.isArray(json.result.itens) && json.result.itens.length > 0) {
          setItens(
            json.result.itens.map((item: { titulo: string; descricao: string }, idx: number) => ({
              id: String(idx + 1),
              titulo: item.titulo,
              descricao: item.descricao,
              incluso: true,
            }))
          );
        }
        setAiSuccess(true);
      }
    } catch {
      // fallback silencioso
    } finally {
      setAiLoading(false);
    }
  };

  const defaultToken = `prop-${lead.id}`;

  const proposalParams = new URLSearchParams({
    c: lead.nome,
    n: lead.nicho,
    v: String(implantacao),
    m: String(mensalidade),
    d: String(prazoDias),
  });
  const publicBaseOrigin = window.location.hostname.endsWith('yagoduarte.com.br')
    ? 'https://propostas.yagoduarte.com.br'
    : window.location.origin;
  const proposalLink = `${publicBaseOrigin}/p/${defaultToken}?${proposalParams.toString()}`;

  const currentProposal: Proposal = {
    id: `prop-${lead.id}`,
    token: defaultToken,
    lead_id: lead.id,
    cliente_nome: lead.nome,
    cliente_whatsapp: lead.whatsapp || '',
    nicho: lead.nicho,
    titulo_proposta: titulo,
    apresentacao,
    itens,
    prazo_dias: prazoDias,
    implantacao,
    forma_pagamento_implantacao: formaPagamento,
    mensalidade,
    beneficios_mensalidade: [
      'Hospedagem ultra rápida Cloudflare + SSL grátis',
      'Suporte técnico direto no WhatsApp e pequenos ajustes mensais',
      'Backups diários e proteção ativa contra invasões'
    ],
    status: 'enviada',
    created_at: new Date().toISOString()
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(proposalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreview = () => {
    onSaveProposal(currentProposal);
    window.open(proposalLink, '_blank');
  };

  const handleSendWhatsApp = () => {
    onSaveProposal(currentProposal);
    const cleanPhone = (lead.whatsapp || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = `Olá ${lead.nome}, tudo bem? Me chamo Yago Duarte. Conforme combinamos, preparei uma proposta comercial exclusiva para o desenvolvimento do seu novo site:\n\n🔗 Acesse aqui: ${proposalLink}\n\nFiz um planejamento completo com prazos, escopo e condições facilitadas. Qualquer dúvida estou por aqui!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    onClose();
  };

  const handleSaveOnly = () => {
    onSaveProposal(currentProposal);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposta-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#16161a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 id="proposta-modal-title" className="text-base font-bold text-zinc-100">Gerador de Proposta Pública (/p/:token)</h2>
              <p className="text-xs text-zinc-400">Link interativo para enviar ao cliente aprovar</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* AI Personalizer Callout */}
          <div className="p-3 bg-[#18181b] border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Personalização Inteligente ({lead.nicho})</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Adapta título, apresentação e os 6 entregáveis especificamente para o negócio de {lead.nome}.
              </p>
            </div>
            <button
              type="button"
              disabled={aiLoading}
              onClick={handlePersonalizeWithAI}
              className="min-h-[34px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{aiSuccess ? 'Proposta Personalizada!' : 'Personalizar com IA'}</span>
            </button>
          </div>

          <div>
            <label className="block font-medium text-zinc-300 mb-1">Título da Proposta</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-300 mb-1">Valor de Implantação (R$)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="number"
                  value={implantacao}
                  onChange={(e) => setImplantacao(Number(e.target.value))}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-300 mb-1">Mensalidade Hospedagem (R$)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="number"
                  value={mensalidade}
                  onChange={(e) => setMensalidade(Number(e.target.value))}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-300 mb-1">Prazo de Entrega (Dias Úteis)</label>
              <input
                type="number"
                value={prazoDias}
                onChange={(e) => setPrazoDias(Number(e.target.value))}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-300 mb-1">Condição de Pagamento</label>
              <input
                type="text"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-300 mb-1">Mensagem de Apresentação</label>
            <textarea
              rows={3}
              value={apresentacao}
              onChange={(e) => setApresentacao(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-3 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Link Box */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-between gap-2">
            <div className="truncate font-mono text-[11px] text-zinc-400">
              {proposalLink}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[34px] px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPreview}
                aria-label="Abrir prévia da proposta em nova aba"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="Abrir Prévia em Nova Aba"
              >
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#16161a] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSaveOnly}
            className="min-h-[38px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Salvar
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="min-h-[38px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Send size={13} />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
