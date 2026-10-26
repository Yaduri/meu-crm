import React, { useState } from 'react';
import type { BriefingData } from '../../types/crm';
import { 
  X, 
  Send, 
  Copy, 
  ExternalLink, 
  Check, 
  Building2, 
  Palette, 
  PhoneCall, 
  FolderPlus, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';

interface GeneratedLandingCopy {
  headline: string;
  subheadline: string;
  cta_texto: string;
  paleta_sugerida: string[];
  tipografia_sugerida: string;
  secoes: { dobra: string; objetivo: string; copy_sugerida: string }[];
  faq: { pergunta: string; resposta: string }[];
}

interface GerarBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientWhatsApp?: string;
  briefing: BriefingData;
  onUpdateBriefing: (briefing: BriefingData) => void;
}

export const GerarBriefingModal: React.FC<GerarBriefingModalProps> = ({
  isOpen,
  onClose,
  clientName,
  clientWhatsApp,
  briefing,
  onUpdateBriefing
}) => {
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<GeneratedLandingCopy | null>(null);
  const [copiedCopy, setCopiedCopy] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCopyWithAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'briefing_to_copy',
          briefing: {
            ...briefing,
            nome_empresa: briefing.nome_empresa || clientName,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.result) {
        setGeneratedCopy(json.result as GeneratedLandingCopy);
      }
    } catch {
      // fallback silencioso
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAllGenerated = () => {
    if (!generatedCopy) return;
    const text = [
      `# Copy & Estrutura da Landing Page — ${briefing.nome_empresa || clientName}`,
      `\n## Hero`,
      `- Headline: ${generatedCopy.headline}`,
      `- Subheadline: ${generatedCopy.subheadline}`,
      `- CTA: ${generatedCopy.cta_texto}`,
      `\n## Direção Visual`,
      `- Paleta Hex: ${(generatedCopy.paleta_sugerida || []).join(', ')}`,
      `- Tipografia: ${generatedCopy.tipografia_sugerida}`,
      `\n## Estrutura de Dobras`,
      ...(generatedCopy.secoes || []).map((s, i) => `${i + 1}. ${s.dobra} (${s.objetivo})\n   Copy: ${s.copy_sugerida}`),
      `\n## FAQ`,
      ...(generatedCopy.faq || []).map((f) => `P: ${f.pergunta}\nR: ${f.resposta}`),
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCopy(true);
    setTimeout(() => setCopiedCopy(false), 2000);
  };

  const publicBaseOrigin = window.location.hostname.endsWith('yagoduarte.com.br')
    ? 'https://propostas.yagoduarte.com.br'
    : window.location.origin;
  const briefingLink = `${publicBaseOrigin}/b/${briefing.token}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(briefingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreview = () => {
    window.open(briefingLink, '_blank');
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (clientWhatsApp || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = `Olá ${clientName}, tudo bem? Me chamo Yago Duarte. Para iniciarmos o desenvolvimento do seu novo site com o pé direito, preparei este formulário rápido de briefing:\n\n🔗 Acesse aqui: ${briefingLink}\n\nLeva menos de 5 minutinhos e ajuda a entender exatamente as cores, serviços e estilo que você mais gosta. Qualquer dúvida, estou por aqui!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#16161a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 size={16} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="briefing-modal-title" className="text-base font-bold text-zinc-100">Briefing do Projeto</h2>
                {briefing.preenchido ? (
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> Preenchido pelo Cliente
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={11} /> Aguardando Preenchimento
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Cliente: {clientName}</p>
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

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Link Box */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-between gap-3">
            <div className="truncate font-mono text-[11px] text-zinc-400">
              {briefingLink}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[34px] px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copiado' : 'Copiar Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPreview}
                aria-label="Abrir formulário de briefing em nova aba"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="Abrir Formulário"
              >
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          {/* Se preenchido, exibe os dados organizados */}
          {briefing.preenchido ? (
            <div className="space-y-4">
              <div className="bg-[#16161a] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <Building2 size={14} className="text-emerald-400" />
                  <span>1. Dados da Empresa</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-300">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Nome da Empresa / Marca:</span>
                    <span className="font-medium text-zinc-100">{briefing.nome_empresa || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Slogan / Posicionamento:</span>
                    <span>{briefing.slogan_posicionamento || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Público-Alvo:</span>
                  <p className="mt-0.5 text-zinc-200">{briefing.publico_alvo || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Principais Serviços:</span>
                  <p className="mt-0.5 text-zinc-200">{briefing.servicos_principais || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Diferenciais:</span>
                  <p className="mt-0.5 text-zinc-200">{briefing.diferenciais || '-'}</p>
                </div>
              </div>

              <div className="bg-[#16161a] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <Palette size={14} className="text-emerald-400" />
                  <span>2. Visual & Estilo</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Cores Preferidas:</span>
                  <span className="text-zinc-200 font-medium">{briefing.cores_preferidas || '-'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Sites de Referência:</span>
                  <span className="text-zinc-200">{briefing.sites_referencia || '-'}</span>
                </div>
              </div>

              <div className="bg-[#16161a] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <PhoneCall size={14} className="text-emerald-400" />
                  <span>3. Contatos & Redes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-300">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">WhatsApp Oficial:</span>
                    <span className="text-zinc-100 font-medium font-mono">{briefing.whatsapp_atendimento || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Instagram:</span>
                    <span className="text-zinc-100">{briefing.instagram || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Endereço:</span>
                  <span>{briefing.endereco_fisico || '-'}</span>
                </div>
              </div>

              <div className="bg-[#16161a] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <FolderPlus size={14} className="text-emerald-400" />
                  <span>4. Arquivos & Links</span>
                </div>
                {briefing.link_arquivos ? (
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Link do Google Drive / Dropbox:</span>
                    <a
                      href={briefing.link_arquivos.startsWith('http') ? briefing.link_arquivos : `https://${briefing.link_arquivos}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 break-all"
                    >
                      <span>{briefing.link_arquivos}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  </div>
                ) : (
                  <span className="text-zinc-400">Nenhum link de arquivos informado.</span>
                )}
                {briefing.observacoes_adicionais && (
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Observações Extras:</span>
                    <p className="mt-0.5 text-zinc-300">{briefing.observacoes_adicionais}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#16161a] border border-dashed border-[#27272a] rounded-xl space-y-2">
              <Clock size={28} className="text-amber-400/80 mx-auto" />
              <div className="text-zinc-200 font-semibold text-sm">O cliente ainda não preencheu o formulário</div>
              <p className="text-zinc-400 text-xs max-w-sm mx-auto">
                Envie o link acima diretamente no WhatsApp do cliente para que ele possa responder e enviar a logo e referências.
              </p>
            </div>
          )}

          {/* AI Copy & Landing Page Structure Generator (Feature #3) */}
          <div className="bg-[#16161a] border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-zinc-100 font-semibold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>Gerador de Copy & Estrutura da Landing Page (Gemini IA)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Transforma o briefing em Headline, Dobras da LP, FAQ e Paleta Hex prontos para o Figma ou código.
                </p>
              </div>

              <button
                type="button"
                disabled={aiLoading}
                onClick={handleGenerateCopyWithAI}
                className="min-h-[34px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{generatedCopy ? 'Regerar Copy IA' : 'Gerar Copy da LP'}</span>
              </button>
            </div>

            {generatedCopy && (
              <div className="space-y-3 pt-2 border-t border-[#27272a]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold">Estrutura Gerada para {briefing.nome_empresa || clientName}</span>
                  <button
                    type="button"
                    onClick={handleCopyAllGenerated}
                    className="min-h-[30px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedCopy ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedCopy ? 'Copiado Tudo!' : 'Copiar Tudo'}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-xl space-y-1.5">
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Headline Principal (Hero):</span>
                    <span className="text-zinc-100 font-bold text-sm">{generatedCopy.headline}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Subheadline:</span>
                    <span className="text-zinc-300">{generatedCopy.subheadline}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Botão CTA:</span>
                    <span className="inline-block mt-0.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold">
                      {generatedCopy.cta_texto}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-xl">
                    <span className="text-zinc-400 text-[11px] block mb-1.5">Paleta Hex Sugerida:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(generatedCopy.paleta_sugerida || []).map((hex, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-[#18181b] px-2 py-1 rounded-md border border-[#27272a]">
                          <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: hex }} />
                          <span className="font-mono text-[11px] text-zinc-200">{hex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-xl">
                    <span className="text-zinc-400 text-[11px] block mb-1">Tipografia Sugerida:</span>
                    <span className="text-zinc-200 font-medium">{generatedCopy.tipografia_sugerida}</span>
                  </div>
                </div>

                {Array.isArray(generatedCopy.secoes) && generatedCopy.secoes.length > 0 && (
                  <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-xl space-y-2">
                    <span className="text-zinc-200 font-semibold block">Dobras da Página:</span>
                    {generatedCopy.secoes.map((sec, idx) => (
                      <div key={idx} className="p-2.5 bg-[#16161a] border border-[#27272a] rounded-lg space-y-1">
                        <div className="font-semibold text-emerald-400">{idx + 1}. {sec.dobra}</div>
                        <div className="text-[11px] text-zinc-400">{sec.objetivo}</div>
                        <p className="text-zinc-200">{sec.copy_sugerida}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#16161a] flex flex-wrap items-center justify-between gap-3">
          <div>
            {briefing.preenchido && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja resetar o status de preenchimento deste briefing?')) {
                    onUpdateBriefing({
                      ...briefing,
                      preenchido: false,
                      preenchido_em: undefined
                    });
                  }
                }}
                className="text-zinc-400 hover:text-zinc-200 text-[11px] underline cursor-pointer"
              >
                Resetar respostas
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Fechar
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
    </div>
  );
};
