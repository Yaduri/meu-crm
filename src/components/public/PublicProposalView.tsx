import React from 'react';
import type { Proposal } from '../../types/crm';
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  Server, 
  Layers,
  ArrowRight,
  Printer
} from 'lucide-react';

interface PublicProposalViewProps {
  proposal: Proposal;
  onAccept?: () => void;
  whatsappComercial?: string;
}

export const PublicProposalView: React.FC<PublicProposalViewProps> = ({ 
  proposal: initialProposal,
  whatsappComercial,
}) => {
  const [proposal, setProposal] = React.useState<Proposal>(initialProposal);
  const [yagoWhatsApp, setYagoWhatsApp] = React.useState<string>(whatsappComercial || '5511945987666');

  React.useEffect(() => {
    document.title = `Proposta Comercial · ${proposal.cliente_nome} | Yago Duarte`;
    fetch(`/api/proposals/${initialProposal.token}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.proposal) {
          setProposal(res.proposal);
        }
        if (res.whatsapp_comercial) {
          setYagoWhatsApp(res.whatsapp_comercial);
        }
      })
      .catch(() => {});

    // Dispara notificação silenciosa de visualização em tempo real (1x por sessão)
    const viewKey = `viewed_prop_${initialProposal.token}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      fetch(`/api/proposals/${initialProposal.token}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'viewed',
          cliente_nome: initialProposal.cliente_nome,
          nicho: initialProposal.nicho,
          implantacao: initialProposal.implantacao,
          mensalidade: initialProposal.mensalidade,
        }),
      }).catch(() => {});
    }
  }, [initialProposal.token, initialProposal.cliente_nome, initialProposal.nicho, initialProposal.implantacao, initialProposal.mensalidade, proposal.cliente_nome]);

  const handleAceitarProposta = () => {
    fetch(`/api/proposals/${proposal.token}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'accepted',
        cliente_nome: proposal.cliente_nome,
        nicho: proposal.nicho,
        implantacao: proposal.implantacao,
        mensalidade: proposal.mensalidade,
      }),
    }).catch(() => {});

    const cleanPhone = (yagoWhatsApp || '5511945987666').replace(/\D/g, '');
    const msg = `Olá Yago Duarte! Vi a proposta comercial para "${proposal.cliente_nome}" no valor de R$ ${proposal.implantacao.toFixed(2)} e aprovei os termos! Como podemos dar início?`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePrintProposal = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Banner sutil */}
      <div className="border-b border-[#27272a] bg-[#0d0d10]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/60 overflow-hidden flex items-center justify-center p-1">
            <img 
              src="/logo-yd-symbol.png" 
              alt="Yago Duarte" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 leading-none">Yago Duarte</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Desenvolvimento Web & Design Estratégico</div>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={handlePrintProposal}
            className="min-h-[36px] bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 font-medium text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Salvar como PDF ou Imprimir Proposta"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Baixar PDF / Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleAceitarProposta}
            className="min-h-[36px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
          >
            <Send size={13} />
            <span>Aceitar Proposta</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-6 py-10 space-y-10 flex-1">
        {/* Header Hero */}
        <div className="text-center space-y-3 pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles size={13} />
            <span>Proposta Comercial Exclusiva</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-100">
            {proposal.titulo_proposta || `Projeto de Landing Page Profissional`}
          </h1>

          <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            Preparada exclusivamente para <span className="text-zinc-200 font-semibold">{proposal.cliente_nome}</span> ({proposal.nicho}).
            Um site moderno, ultra rápido e planejado para converter visitantes em agendamentos no seu WhatsApp.
          </p>
        </div>

        {/* Apresentação / Contexto */}
        {proposal.apresentacao && (
          <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl leading-relaxed text-zinc-300 text-sm shadow-xs">
            <p className="whitespace-pre-line">{proposal.apresentacao}</p>
          </div>
        )}

        {/* O que está incluso (Escopo) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-base">
            <Layers size={18} className="text-emerald-400" />
            <h2>O que está incluso no projeto</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3.5">
            {proposal.itens.map((item) => (
              <div 
                key={item.id}
                className="p-4 bg-[#121215] border border-[#27272a] rounded-xl flex items-start gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">{item.titulo}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cronograma e Prazos */}
        <section className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-base mb-4">
            <Clock size={18} className="text-emerald-400" />
            <h2>Cronograma e Metodologia de Trabalho</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-[#18181b] rounded-xl border border-zinc-800/80">
              <div className="font-mono text-emerald-400 font-bold mb-1">Passo 01</div>
              <div className="font-semibold text-zinc-200 text-sm">Briefing & Estratégia</div>
              <p className="text-zinc-400 mt-1">Coleta dos dados da empresa, fotos, serviços e definição da mensagem principal de vendas.</p>
            </div>

            <div className="p-3.5 bg-[#18181b] rounded-xl border border-zinc-800/80">
              <div className="font-mono text-emerald-400 font-bold mb-1">Passo 02</div>
              <div className="font-semibold text-zinc-200 text-sm">Design & Aprovação</div>
              <p className="text-zinc-400 mt-1">Criação do layout exclusivo no Figma para você aprovar o visual antes da programação.</p>
            </div>

            <div className="p-3.5 bg-[#18181b] rounded-xl border border-zinc-800/80">
              <div className="font-mono text-emerald-400 font-bold mb-1">Passo 03</div>
              <div className="font-semibold text-zinc-200 text-sm">Programação & No Ar</div>
              <p className="text-zinc-400 mt-1">Desenvolvimento responsivo, testes no celular, SSL e publicação em até {proposal.prazo_dias} dias úteis.</p>
            </div>
          </div>
        </section>

        {/* Valores e Investimento */}
        <section className="space-y-4">
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-2xl font-bold text-zinc-100">Investimento Transparente</h2>
            <p className="text-xs text-zinc-400">Sem surpresas ou letras miúdas. Pagamento facilitado em duas etapas.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card Implantação */}
            <div className="p-6 bg-[#121215] border border-emerald-500/40 rounded-2xl relative shadow-lg shadow-emerald-500/5">
              <div className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mb-3">
                Criação & Desenvolvimento
              </div>
              
              <div className="text-xs text-zinc-400">Valor total de implantação</div>
              <div className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">
                R$ {proposal.implantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/80 text-xs space-y-2 text-zinc-300">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" />
                  <span><strong>Condição:</strong> {proposal.forma_pagamento_implantacao || '50% de entrada no início e 50% na aprovação final'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Garantia de aprovação e suporte inicial na publicação</span>
                </div>
              </div>
            </div>

            {/* Card Mensalidade Hospedagem */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl">
              <div className="inline-block text-[11px] font-bold text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-full mb-3">
                Hospedagem & Manutenção Contínua
              </div>

              <div className="text-xs text-zinc-400">Mensalidade recorrente</div>
              <div className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">
                R$ {proposal.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-zinc-400"> /mês</span>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/80 text-xs space-y-2 text-zinc-300">
                {proposal.beneficios_mensalidade && proposal.beneficios_mensalidade.length > 0 ? (
                  proposal.beneficios_mensalidade.map((ben, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Server size={13} className="text-emerald-400 shrink-0" />
                      <span>{ben}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Server size={13} className="text-emerald-400 shrink-0" />
                      <span>Hospedagem ultra rápida Cloudflare + SSL grátis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>Suporte técnico direto no WhatsApp e pequenos ajustes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>Sem fidelidade obrigatória</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <div className="bg-gradient-to-b from-[#18181b] to-[#121215] border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <h3 className="text-2xl font-bold text-zinc-100">Pronto para transformar sua presença digital?</h3>
          <p className="text-zinc-400 text-xs max-w-md mx-auto">
            Clique no botão abaixo para aprovar a proposta e falarmos diretamente no WhatsApp para dar início ao seu projeto hoje mesmo.
          </p>

          <button
            onClick={handleAceitarProposta}
            className="inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:scale-[1.02] cursor-pointer"
          >
            <span>Aceitar Proposta via WhatsApp</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-6 text-center text-xs text-zinc-400">
        <div>Yago Duarte · Desenvolvedor e Designer Web</div>
        <div className="text-[11px] text-zinc-400 mt-1">Todos os direitos reservados · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
};