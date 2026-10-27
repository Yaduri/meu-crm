import React, { useState, useEffect, useRef } from 'react';
import type { ClientLead, WhatsAppMessage } from '../../types/crm';
import { parseConversationScript } from '../../utils/conversationScript';
import { Send, Loader2, MessageSquare, Sparkles, RefreshCw, Smartphone, Check, CheckCheck, Clock } from 'lucide-react';

interface LeadWhatsAppChatProps {
  lead: ClientLead;
  onOpenWhatsAppModal?: () => void;
}

export const LeadWhatsAppChat: React.FC<LeadWhatsAppChatProps> = ({
  lead,
  onOpenWhatsAppModal
}) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const prevLeadIdRef = useRef<string | null>(null);

  const cleanPhone = (lead.whatsapp || '').replace(/\D/g, '');
  const scriptSteps = parseConversationScript(lead.msg_a_mandar || '');

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isUserScrolledUpRef.current = distanceFromBottom > 90;
  };

  const fetchChat = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/chat/${lead.id}`);
      if (res.ok) {
        const data = await res.json() as { success: boolean; messages: WhatsAppMessage[] };
        if (data.success && Array.isArray(data.messages)) {
          setMessages(prev => {
            if (
              prev.length === data.messages.length &&
              prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id &&
              prev[prev.length - 1]?.status === data.messages[data.messages.length - 1]?.status
            ) {
              return prev;
            }
            return data.messages;
          });
        }
      }
    } catch {
      // Falha silenciosa
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat(false);
    const interval = setInterval(() => fetchChat(true), 3000);
    return () => clearInterval(interval);
  }, [lead.id]);

  useEffect(() => {
    const isNewLead = prevLeadIdRef.current !== lead.id;
    prevLeadIdRef.current = lead.id;

    if (isNewLead) {
      isUserScrolledUpRef.current = false;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
      return;
    }

    if (!isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, lead.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    if (!cleanPhone) {
      alert('Este lead não possui um número de WhatsApp cadastrado.');
      return;
    }

    setSending(true);

    // Atualização otimista imediata na interface
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      lead_id: lead.id,
      whatsapp: cleanPhone,
      from_me: 1,
      body: text,
      timestamp: Date.now(),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          text
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro no envio' })) as { error?: string };
        alert(`Erro: ${errData.error || 'Não foi possível enviar a mensagem'}`);
      } else {
        fetchChat();
      }
    } catch {
      alert('Falha na conexão ao enviar mensagem.');
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInsertScript = (stepText: string) => {
    setInputText(stepText);
    textareaRef.current?.focus();
  };

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[520px] bg-[#0d0d10] border border-[#27272a] rounded-xl overflow-hidden shadow-inner">
      {/* Top Banner Lead Phone */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121215] border-b border-[#27272a]">
        <div className="flex items-center gap-2 text-xs">
          <Smartphone size={14} className="text-emerald-400" />
          <span className="font-semibold text-zinc-200">{lead.nome}</span>
          <span className="text-zinc-500">·</span>
          <span className="font-mono text-zinc-400">{lead.whatsapp || 'Sem número'}</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenWhatsAppModal && (
            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              className="text-[11px] text-zinc-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Status da Conexão</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchChat(false)}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Recarregar histórico"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
            <span className="text-xs">Carregando conversa...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-zinc-200">Nenhuma mensagem registrada</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Envie a primeira mensagem para <strong>{lead.nome}</strong> pelo campo abaixo ou use um dos passos do roteiro sugerido!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from_me === 1;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                    isMe
                      ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-100 rounded-tr-xs'
                      : 'bg-[#18181b] border border-[#27272a] text-zinc-100 rounded-tl-xs'
                  }`}
                >
                  {msg.body}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                      isMe ? 'text-emerald-400/70' : 'text-zinc-500'
                    }`}
                  >
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && (
                      msg.status === 'pending' ? (
                        <Clock size={11} className="text-zinc-400 animate-pulse" />
                      ) : msg.status === 'sent' ? (
                        <CheckCheck size={12} className="text-emerald-400" />
                      ) : (
                        <Check size={12} />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Scripts Suggestions */}
      {scriptSteps && scriptSteps.filter(s => s.type === 'message').length > 0 && (
        <div className="px-3 py-2 bg-[#121215] border-t border-[#27272a]/70 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Sparkles size={12} className="text-emerald-400" />
            Roteiro:
          </span>
          {scriptSteps
            .filter((s): s is typeof s & { type: 'message'; content: string } => s.type === 'message')
            .map((step, idx) => (
              <button
                key={step.stepNumber || idx}
                type="button"
                onClick={() => handleInsertScript(step.content)}
                className="shrink-0 min-h-[26px] px-2.5 py-1 rounded-md bg-[#18181b] hover:bg-emerald-500/15 border border-[#27272a] hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-300 text-[11px] font-medium transition-colors cursor-pointer"
                title={step.content}
              >
                Inserir Etapa {step.stepNumber || idx + 1}
              </button>
            ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-[#121215] border-t border-[#27272a] flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem para o lead... (Pressione Enter para enviar)"
          className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500 resize-none"
        />
        <button
          type="button"
          disabled={sending || !inputText.trim()}
          onClick={() => handleSendMessage()}
          className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>
    </div>
  );
};
