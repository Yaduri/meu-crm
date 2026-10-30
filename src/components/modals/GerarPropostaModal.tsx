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
  Loader2,
  Plus,
  Trash2,
  Layers,
  FileText,
  Server
} from 'lucide-react';

interface GerarPropostaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ClientLead | null;
  existingProposal?: Proposal | null;
  onSaveProposal: (proposal: Proposal) => void;
}

const DEFAULT_ITENS: ProposalItem[] = [
  { id: '1', titulo: 'Design Visual Exclusivo', descricao: 'Layout moderno sob medida criado exclusivamente para a identidade da sua marca.', incluso: true },
  { id: '2', titulo: 'Copywriting Persuasivo', descricao: 'Textos orientados a conversão e estruturados para quebrar objeções do cliente.', incluso: true },
  { id: '3', titulo: 'Desenvolvimento Responsivo Ultra Rápido', descricao: 'Código limpo, seguro e com carregamento instantâneo em smartphones e PCs.', incluso: true },
  { id: '4', titulo: 'Botão Flutuante de WhatsApp Direto', descricao: 'Chamadas para ação integradas com mensagem de contato pré-formatada.', incluso: true },
  { id: '5', titulo: 'Otimização Técnica de SEO e Velocidade', descricao: 'Pontuação 90+ no Google PageSpeed para melhor posicionamento orgânico.', incluso: true },
  { id: '6', titulo: 'Instalação de Pixel Meta & Google Analytics', descricao: 'Tags configuradas para mensurar cliques e conversões de anúncios futuros.', incluso: true }
];

const DEFAULT_BENEFICIOS: string[] = [
  'Hospedagem ultra rápida Cloudflare + SSL grátis',
  'Suporte técnico direto no WhatsApp e pequenos ajustes mensais',
  'Domínio .com.br incluso'
];

type ActiveTab = 'geral' | 'itens' | 'hospedagem';

export const GerarPropostaModal: React.FC<GerarPropostaModalProps> = ({
  isOpen,
  onClose,
  lead,
  existingProposal,
  onSaveProposal
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('geral');
  const [titulo, setTitulo] = useState('');
  const [implantacao, setImplantacao] = useState(1200);
  const [mensalidade, setMensalidade] = useState(89);
  const [prazoDias, setPrazoDias] = useState(7);
  const [formaPagamento, setFormaPagamento] = useState('50% de entrada e 50% na aprovação final');
  const [apresentacao, setApresentacao] = useState('');
  const [itens, setItens] = useState<ProposalItem[]>(DEFAULT_ITENS);
  const [beneficios, setBeneficios] = useState<string[]>(DEFAULT_BENEFICIOS);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (lead) {
      if (existingProposal) {
        setTitulo(existingProposal.titulo_proposta || `Landing Page de Alta Conversão para ${lead.nome}`);
        setImplantacao(existingProposal.implantacao ?? (lead.implantacao || 1200));
        setMensalidade(existingProposal.mensalidade ?? (lead.mensalidade || 89));
        setPrazoDias(existingProposal.prazo_dias || 7);
        setFormaPagamento(existingProposal.forma_pagamento_implantacao || '50% de entrada e 50% na aprovação final');
        setApresentacao(
          existingProposal.apresentacao ||
          `Apresentamos esta proposta técnica e comercial com foco em valorizar a autoridade da sua marca na internet e transformar visitantes em novos agendamentos diretos no seu WhatsApp.`
        );
        setItens(existingProposal.itens && existingProposal.itens.length > 0 ? existingProposal.itens : DEFAULT_ITENS);
        setBeneficios(
          existingProposal.beneficios_mensalidade && existingProposal.beneficios_mensalidade.length > 0
            ? existingProposal.beneficios_mensalidade
            : DEFAULT_BENEFICIOS
        );
      } else {
        setTitulo(`Landing Page de Alta Conversão para ${lead.nome}`);
        setImplantacao(lead.implantacao || 1200);
        setMensalidade(lead.mensalidade || 89);
        setPrazoDias(7);
        setFormaPagamento('50% de entrada e 50% na aprovação final');
        setApresentacao(
          `Apresentamos esta proposta técnica e comercial com foco em valorizar a autoridade da sua marca na internet e transformar visitantes em novos agendamentos diretos no seu WhatsApp.`
        );
        setItens(DEFAULT_ITENS);
        setBeneficios(DEFAULT_BENEFICIOS);
      }
      setAiSuccess(false);
    }
  }, [lead, existingProposal, isOpen]);

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

  const handleAddItem = () => {
    const nextId = String(itens.length + 1);
    setItens(prev => [
      ...prev,
      {
        id: nextId,
        titulo: 'Novo Entregável',
        descricao: 'Descrição detalhada do que será entregue nesta etapa.',
        incluso: true,
      }
    ]);
  };

  const handleUpdateItem = (id: string, field: 'titulo' | 'descricao', value: string) => {
    setItens(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  const handleAddBeneficio = () => {
    setBeneficios(prev => [...prev, 'Novo benefício de suporte ou hospedagem']);
  };

  const handleUpdateBeneficio = (index: number, value: string) => {
    setBeneficios(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveBeneficio = (index: number) => {
    setBeneficios(prev => prev.filter((_, i) => i !== index));
  };

  const defaultToken = existingProposal?.token || `prop-${lead.id}`;

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
    id: existingProposal?.id || `prop-${lead.id}`,
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
    beneficios_mensalidade: beneficios,
    status: existingProposal?.status || 'enviada',
    created_at: existingProposal?.created_at || new Date().toISOString()
  };

  const handleSaveAndSync = () => {
    onSaveProposal(currentProposal);
  };

  const handleCopyLink = () => {
    handleSaveAndSync();
    navigator.clipboard.writeText(proposalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreview = () => {
    handleSaveAndSync();
    window.open(proposalLink, '_blank');
  };

  const handleSendWhatsApp = () => {
    handleSaveAndSync();
    const cleanPhone = (lead.whatsapp || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = `Olá ${lead.nome}, tudo bem? Me chamo Yago Duarte. Conforme combinamos, preparei uma proposta comercial exclusiva para o desenvolvimento do seu novo site:\n\n🔗 Acesse aqui: ${proposalLink}\n\nFiz um planejamento completo com prazos, escopo e condições facilitadas. Qualquer dúvida estou por aqui!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    onClose();
  };

  const handleSaveOnly = () => {
    handleSaveAndSync();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposta-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272a] flex items-center justify-between bg-[#16161a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 id="proposta-modal-title" className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Personalizar Proposta Comercial</span>
                <span className="text-[11px] font-normal text-zinc-400 font-mono">({lead.nome})</span>
              </h2>
              <p className="text-xs text-zinc-400">Edite textos, valores, itens de entrega e benefícios antes de enviar</p>
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

        {/* AI Generator Bar */}
        <div className="px-5 py-2.5 bg-[#141418] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Sparkles size={14} className="text-emerald-400 shrink-0" />
            <span className="text-[11px] text-zinc-300">
              Quer sugestões sob medida para <strong>{lead.nicho}</strong>?
            </span>
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={handlePersonalizeWithAI}
            className="min-h-[30px] px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{aiSuccess ? 'Sugerido com IA ✓' : 'Sugerir com IA'}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 border-b border-[#27272a] bg-[#121215] flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'geral'
                ? 'bg-[#27272f] text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181c]'
            }`}
          >
            <FileText size={13} />
            <span>Geral & Valores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('itens')}
            className={`min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'itens'
                ? 'bg-[#27272f] text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181c]'
            }`}
          >
            <Layers size={13} />
            <span>Entregáveis / Escopo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 font-mono">
              {itens.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hospedagem')}
            className={`min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'hospedagem'
                ? 'bg-[#27272f] text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181c]'
            }`}
          >
            <Server size={13} />
            <span>Mensalidade & Benefícios</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 font-mono">
              {beneficios.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: GERAL & VALORES */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Título Principal da Proposta</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Landing Page de Alta Conversão para..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Texto de Apresentação / Contexto
                </label>
                <textarea
                  rows={3}
                  value={apresentacao}
                  onChange={(e) => setApresentacao(e.target.value)}
                  placeholder="Apresentamos esta proposta técnica e comercial..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-3 text-zinc-100 placeholder:text-zinc-400 leading-relaxed focus:outline-hidden focus:border-emerald-500"
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
                    placeholder="Ex: 50% de entrada e 50% na aprovação final"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENTREGÁVEIS / ESCOPO */}
          {activeTab === 'itens' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-zinc-400">
                  Edite, adicione ou remova os tópicos do escopo que o cliente verá na proposta.
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="min-h-[30px] px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Novo Entregável</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {itens.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#18181c] border border-[#27272f] rounded-xl space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.titulo}
                          onChange={(e) => handleUpdateItem(item.id, 'titulo', e.target.value)}
                          placeholder="Título do entregável"
                          className="flex-1 bg-[#121215] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-100 font-semibold focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remover entregável"
                        className="text-zinc-400 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={item.descricao}
                      onChange={(e) => handleUpdateItem(item.id, 'descricao', e.target.value)}
                      placeholder="Descrição do que está incluso..."
                      className="w-full bg-[#121215] border border-[#27272a] rounded-lg p-2 text-[11px] text-zinc-300 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                ))}

                {itens.length === 0 && (
                  <div className="text-center py-6 text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
                    Nenhum entregável cadastrado. Clique no botão acima para adicionar.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HOSPEDAGEM & BENEFÍCIOS */}
          {activeTab === 'hospedagem' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-zinc-400">
                  Benefícios exibidos no card da mensalidade de R$ {mensalidade.toFixed(2)}/mês:
                </span>
                <button
                  type="button"
                  onClick={handleAddBeneficio}
                  className="min-h-[30px] px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Novo Benefício</span>
                </button>
              </div>

              <div className="space-y-2">
                {beneficios.map((ben, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ben}
                      onChange={(e) => handleUpdateBeneficio(idx, e.target.value)}
                      placeholder="Descrição do benefício mensal..."
                      className="flex-1 bg-[#18181c] border border-[#27272f] rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBeneficio(idx)}
                      title="Remover benefício"
                      className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        <div className="p-4 border-t border-[#27272a] bg-[#16161a] flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400">
            {activeTab === 'geral' ? 'Valores e texto principal' : activeTab === 'itens' ? `${itens.length} entregáveis configurados` : `${beneficios.length} benefícios na mensalidade`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="min-h-[38px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Salvar Alterações
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="min-h-[38px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Send size={13} />
              <span>Salvar & Enviar Zap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
