import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';
import type { WhatsAppBridgeStatus } from '../../types/crm';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: WhatsAppBridgeStatus | null;
  onRefresh: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(onRefresh, 2500);
    return () => clearInterval(interval);
  }, [isOpen, onRefresh]);

  if (!isOpen) return null;

  const isConnected = status?.connected;
  const isQrReady = status?.online && status?.status === 'qr_ready' && status.qr_code;
  const isOffline = !status?.online || status?.status === 'offline';

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('npm run zap');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isConnected ? 'bg-emerald-500/15 text-emerald-400' : isQrReady ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Smartphone size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                Conexão WhatsApp
                {isConnected && (
                  <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Conectado
                  </span>
                )}
                {isQrReady && (
                  <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Aguardando QR Code
                  </span>
                )}
                {isOffline && (
                  <span className="text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
                    Ponte Offline
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Integração 100% gratuita rodando localmente no seu PC via Baileys.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-[#1f1f23] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Status Conectado */}
          {isConnected && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-100">WhatsApp Conectado e Ativo!</h3>
                <p className="text-xs text-zinc-400">
                  Número sincronizado: <strong className="text-emerald-400">{status?.phone || 'Seu WhatsApp'}</strong>
                </p>
              </div>

              <div className="p-3.5 bg-[#18181b] border border-emerald-500/20 rounded-xl text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <ShieldCheck size={16} />
                  <span>Filtro de Privacidade Estrito Ativo</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Apenas mensagens trocadas com <strong>leads cadastrados no CRM</strong> são sincronizadas e exibidas. Conversas com amigos, família e grupos são descartadas localmente no seu computador e nunca saem do seu celular.
                </p>
              </div>
            </div>
          )}

          {/* Status QR Code Pronto para Escanear */}
          {isQrReady && (
            <div className="text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100">Escaneie o QR Code no seu WhatsApp</h3>
                <p className="text-xs text-zinc-400">
                  Abra o WhatsApp no celular &gt; <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong>
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl w-64 h-64 mx-auto flex items-center justify-center shadow-lg">
                <img
                  src={status.qr_code!}
                  alt="QR Code WhatsApp"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-[11px] text-zinc-400">
                O QR Code se atualiza automaticamente. Você só precisa escanear uma vez.
              </p>
            </div>
          )}

          {/* Status Offline */}
          {isOffline && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 flex items-start gap-3">
                <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-amber-300">A ponte local do WhatsApp não está rodando no seu computador.</p>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    Para o CRM sincronizar mensagens sem custo de servidor, inicie a ponte no seu PC quando for trabalhar.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-300 block">Como iniciar no Windows:</span>
                <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" />
                      <strong>Opção 1 (Mais fácil):</strong> Clique duas vezes em
                    </span>
                    <code className="bg-[#27272a] text-zinc-200 px-2 py-0.5 rounded text-[11px]">
                      Iniciar-WhatsApp-CRM.bat
                    </code>
                  </div>
                  <div className="border-t border-[#27272a] pt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      <strong>Opção 2:</strong> Pelo terminal do projeto
                    </span>
                    <button
                      onClick={handleCopyCmd}
                      className="min-h-[28px] px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#323238] text-zinc-200 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>npm run zap</span>
                      {copiedCmd ? <span className="text-emerald-400">Copiado!</span> : null}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50 flex items-center justify-between">
          <button
            onClick={onRefresh}
            className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#323238] text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Atualizar Status</span>
          </button>
          <button
            onClick={onClose}
            className="min-h-[34px] px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
