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
  Clock
} from 'lucide-react';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#16161a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100">Briefing do Projeto</h2>
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
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Link Box */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-between gap-3">
            <div className="truncate font-mono text-[11px] text-zinc-400">
              {briefingLink}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copiado' : 'Copiar Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPreview}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer"
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
                <div className="grid grid-cols-2 gap-3 text-zinc-300">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Nome da Empresa / Marca:</span>
                    <span className="font-medium text-zinc-100">{briefing.nome_empresa || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Slogan / Posicionamento:</span>
                    <span>{briefing.slogan_posicionamento || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Público-Alvo:</span>
                  <p className="mt-0.5 text-zinc-200">{briefing.publico_alvo || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Principais Serviços:</span>
                  <p className="mt-0.5 text-zinc-200">{briefing.servicos_principais || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Diferenciais:</span>
                  <p className="mt-0.5 text-zinc-200">{briefing.diferenciais || '-'}</p>
                </div>
              </div>

              <div className="bg-[#16161a] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <Palette size={14} className="text-emerald-400" />
                  <span>2. Visual & Estilo</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Cores Preferidas:</span>
                  <span className="text-zinc-200 font-medium">{briefing.cores_preferidas || '-'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Sites de Referência:</span>
                  <span className="text-zinc-200">{briefing.sites_referencia || '-'}</span>
                </div>
              </div>

              <div className="bg-[#16161a] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <PhoneCall size={14} className="text-emerald-400" />
                  <span>3. Contatos & Redes</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-zinc-300">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">WhatsApp Oficial:</span>
                    <span className="text-zinc-100 font-medium">{briefing.whatsapp_atendimento || '-'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Instagram:</span>
                    <span className="text-zinc-100">{briefing.instagram || '-'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Endereço:</span>
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
                    <span className="text-zinc-500 block text-[11px]">Link do Google Drive / Dropbox:</span>
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
                  <span className="text-zinc-500">Nenhum link de arquivos informado.</span>
                )}
                {briefing.observacoes_adicionais && (
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Observações Extras:</span>
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
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#16161a] flex items-center justify-between">
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
                className="text-zinc-500 hover:text-zinc-400 text-[11px] underline cursor-pointer"
              >
                Resetar respostas
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
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