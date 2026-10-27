import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ClientLead, WhatsAppBridgeStatus, WhatsAppConversationSummary, WhatsAppMessage } from '../../types/crm';
import { parseConversationScript } from '../../utils/conversationScript';
import {
  AudioMessagePlayer,
  DocumentMessageCard,
  ImageMessageViewer
} from '../whatsapp/WhatsAppMediaComponents';
import { 
  MessageSquare, 
  Search, 
  Smartphone, 
  Send, 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  Edit3, 
  FileText, 
  Sparkles, 
  Check, 
  CheckCheck, 
  Clock,
  ShieldCheck,
  Paperclip,
  Mic,
  Trash2,
  X,
  Volume2
} from 'lucide-react';

interface ConversasViewProps {
  leads: ClientLead[];
  whatsAppStatus: WhatsAppBridgeStatus | null;
  onOpenWhatsAppModal: () => void;
  onEditLead?: (lead: ClientLead) => void;
  onOpenProposta?: (lead: ClientLead) => void;
}

export const ConversasView: React.FC<ConversasViewProps> = ({
  leads,
  whatsAppStatus,
  onOpenWhatsAppModal,
  onEditLead,
  onOpenProposta
}) => {
  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'conversas' | 'todos'>('conversas');
  
  // Chat state
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    previewUrl?: string;
    type: 'image' | 'audio' | 'document';
  } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const prevLeadIdRef = useRef<string | null>(null);
  const prevMessagesCountRef = useRef<number>(0);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isUserScrolledUpRef.current = distanceFromBottom > 60;
  };

  // Fetch all conversation summaries
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/conversations');
      if (res.ok) {
        const data = await res.json() as { success: boolean; conversations: WhatsAppConversationSummary[] };
        if (data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          // If no lead selected yet and we have conversations, select the first one
          if (!selectedLeadId && data.conversations.length > 0) {
            setSelectedLeadId(data.conversations[0].lead_id);
          }
        }
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingConversations(false);
    }
  }, [selectedLeadId]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages for selected lead
  const fetchChatMessages = useCallback(async (leadId: string, isSilent = false) => {
    if (!isSilent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/whatsapp/chat/${leadId}`);
      if (res.ok) {
        const data = await res.json() as { success: boolean; messages: WhatsAppMessage[] };
        if (data.success && Array.isArray(data.messages)) {
          setMessages(prev => {
            // Evita criar nova referência se a lista não mudou
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
      // Silencioso
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedLeadId) return;
    fetchChatMessages(selectedLeadId, false);
    const interval = setInterval(() => {
      fetchChatMessages(selectedLeadId, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedLeadId, fetchChatMessages]);

  // Scroll inteligente: nunca puxa para baixo se o usuário subiu para ler histórico
  useEffect(() => {
    const isNewLead = prevLeadIdRef.current !== selectedLeadId;
    prevLeadIdRef.current = selectedLeadId;

    const countChanged = messages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;

    if (isNewLead) {
      isUserScrolledUpRef.current = false;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
      return;
    }

    // Só scrolla se realmente chegou mensagem NOVA e o usuário não está lendo mensagens antigas
    if (countChanged && !isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedLeadId]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;
  const scriptSteps = selectedLead ? parseConversationScript(selectedLead.msg_a_mandar || '') : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'audio' | 'document' = 'document';
    let previewUrl: string | undefined;

    if (file.type.startsWith('image/')) {
      type = 'image';
      previewUrl = URL.createObjectURL(file);
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else {
      type = 'document';
    }

    setAttachedFile({ file, type, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Não foi possível acessar o microfone. Verifique as permissões de áudio no navegador.');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recorder = mediaRecorderRef.current;
    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((t) => t.stop());
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: mimeType });

      setIsRecording(false);
      setRecordingSeconds(0);
      await handleSendFile(audioFile, 'audio', '[Áudio de Voz]');
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const handleSendFile = async (
    fileToSend: File,
    fileType: 'image' | 'audio' | 'document',
    captionText?: string
  ) => {
    if (!selectedLead || sending) return;
    const cleanPhone = (selectedLead.whatsapp || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Este lead não possui um número de WhatsApp cadastrado.');
      return;
    }

    setSending(true);
    setUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append('file', fileToSend);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Falha no upload do arquivo');
      }

      const uploadData = (await uploadRes.json()) as { url: string; name: string; contentType?: string };

      const tempId = `temp_${Date.now()}`;
      const defaultBody =
        captionText ||
        (fileType === 'image'
          ? '[Imagem]'
          : fileType === 'audio'
          ? '[Áudio de Voz]'
          : `[Documento: ${fileToSend.name}]`);

      const optimisticMsg: WhatsAppMessage = {
        id: tempId,
        lead_id: selectedLead.id,
        whatsapp: cleanPhone,
        from_me: 1,
        body: defaultBody,
        timestamp: Date.now(),
        status: 'pending',
        created_at: new Date().toISOString(),
        media_type: fileType,
        media_url: uploadData.url,
        media_filename: fileToSend.name,
        media_mimetype: uploadData.contentType || fileToSend.type
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setAttachedFile(null);
      setInputText('');

      const sendRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          text: captionText || '',
          media_type: fileType,
          media_url: uploadData.url,
          media_filename: fileToSend.name,
          media_mimetype: uploadData.contentType || fileToSend.type
        })
      });

      if (!sendRes.ok) {
        alert('Erro ao enviar mídia para o WhatsApp.');
      } else {
        fetchChatMessages(selectedLead.id);
        fetchConversations();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar arquivo';
      alert(`Erro: ${msg}`);
    } finally {
      setSending(false);
      setUploadingMedia(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (attachedFile) {
      await handleSendFile(attachedFile.file, attachedFile.type, (textToSend || inputText).trim());
      return;
    }

    const text = (textToSend || inputText).trim();
    if (!text || sending || !selectedLead) return;

    const cleanPhone = (selectedLead.whatsapp || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Este lead não possui um número de WhatsApp cadastrado.');
      return;
    }

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      lead_id: selectedLead.id,
      whatsapp: cleanPhone,
      from_me: 1,
      body: text,
      timestamp: Date.now(),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          text
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro no envio' })) as { error?: string };
        alert(`Erro: ${errData.error || 'Falha ao enviar mensagem'}`);
      } else {
        fetchChatMessages(selectedLead.id);
        fetchConversations();
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

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Filtered lists
  const conversationLeadIds = new Set(conversations.map((c) => c.lead_id));

  const filteredConversations = conversations.filter((c) => {
    const matchSearch =
      c.lead_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      c.lead_nicho.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredAllLeads = leads.filter((l) => {
    const matchSearch =
      l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.whatsapp || '').includes(searchTerm) ||
      (l.nicho || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#09090b]">
      {/* Coluna Esquerda: Lista de Conversas (estilo WhatsApp Web) */}
      <div
        className={`w-full md:w-[360px] lg:w-[400px] border-r border-[#27272a] bg-[#121215] flex flex-col shrink-0 ${
          selectedLeadId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <MessageSquare size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm text-zinc-100 leading-tight">Conversas WhatsApp</h1>
              <span className="text-[11px] text-zinc-400">Atendimento e Prospecção</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenWhatsAppModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer bg-[#18181b] border-[#27272a] hover:border-zinc-700"
          >
            <Smartphone
              size={13}
              className={
                whatsAppStatus?.connected
                  ? 'text-emerald-400'
                  : whatsAppStatus?.online
                  ? 'text-amber-400'
                  : 'text-zinc-500'
              }
            />
            <span
              className={
                whatsAppStatus?.connected
                  ? 'text-emerald-300'
                  : whatsAppStatus?.online
                  ? 'text-amber-300'
                  : 'text-zinc-400'
              }
            >
              {whatsAppStatus?.connected ? 'Online' : whatsAppStatus?.online ? 'QR Code' : 'Offline'}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#27272a] space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, nicho ou telefone..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a] text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('conversas')}
              className={`flex-1 min-h-[28px] rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'conversas'
                  ? 'bg-[#27272f] text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Com Mensagens ({conversations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('todos')}
              className={`flex-1 min-h-[28px] rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                filterMode === 'todos'
                  ? 'bg-[#27272f] text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos os Leads ({leads.length})
            </button>
          </div>
        </div>

        {/* List of Chats */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e24]">
          {loadingConversations && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
              <Loader2 size={20} className="animate-spin text-emerald-400" />
              <span className="text-xs">Carregando conversas...</span>
            </div>
          ) : filterMode === 'conversas' ? (
            filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
                  <MessageSquare size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-300">Nenhuma conversa encontrada</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Mude para a aba &ldquo;Todos os Leads&rdquo; para selecionar um contato e enviar a primeira mensagem!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterMode('todos')}
                  className="min-h-[32px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Ver Todos os Leads
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedLeadId === conv.lead_id;
                return (
                  <div
                    key={conv.lead_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedLeadId(conv.lead_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedLeadId(conv.lead_id);
                      }
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-2 ${
                      isSelected
                        ? 'bg-[#1a1a20] border-l-emerald-500 text-zinc-100'
                        : 'border-l-transparent hover:bg-[#16161b] text-zinc-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#27272f] border border-[#32323a] text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                      {conv.lead_nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs text-zinc-100 truncate">
                          {conv.lead_nome}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {formatTimestamp(conv.last_message.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium shrink-0">
                          {conv.lead_nicho}
                        </span>
                        <span className="truncate">
                          {conv.last_message.from_me === 1 ? 'Você: ' : ''}
                          {conv.last_message.media_type === 'image'
                            ? '📷 Foto'
                            : conv.last_message.media_type === 'audio'
                            ? '🎙️ Áudio'
                            : conv.last_message.media_type === 'document'
                            ? `📄 ${conv.last_message.media_filename || 'Documento'}`
                            : conv.last_message.media_type === 'sticker'
                            ? '👾 Figurinha'
                            : conv.last_message.body}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            filteredAllLeads.map((lead) => {
              const isSelected = selectedLeadId === lead.id;
              const hasChat = conversationLeadIds.has(lead.id);
              return (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLeadId(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedLeadId(lead.id);
                    }
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-2 ${
                    isSelected
                      ? 'bg-[#1a1a20] border-l-emerald-500 text-zinc-100'
                      : 'border-l-transparent hover:bg-[#16161b] text-zinc-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#27272f] border border-[#32323a] text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {lead.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs text-zinc-100 truncate">
                        {lead.nome}
                      </span>
                      {hasChat && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Possui mensagens" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium shrink-0">
                        {lead.nicho}
                      </span>
                      <span className="font-mono text-zinc-500 truncate">{lead.whatsapp || 'Sem número'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coluna Direita: Janela do Chat (estilo WhatsApp Web) */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#0d0d10] ${
          !selectedLeadId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedLead ? (
          <>
            {/* Chat Top Header */}
            <div className="px-4 py-3 bg-[#121215] border-b border-[#27272a] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  className="md:hidden min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-[#18181b] border border-[#27272a] text-zinc-300 cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>

                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {selectedLead.nome.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-zinc-100">{selectedLead.nome}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">
                      {selectedLead.nicho}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span className="font-mono text-emerald-400">{selectedLead.whatsapp || 'Sem número'}</span>
                    <span>·</span>
                    <span>{selectedLead.presenca_digital}</span>
                  </div>
                </div>
              </div>

              {/* Header Action Shortcuts */}
              <div className="flex items-center gap-1.5">
                {onOpenProposta && (
                  <button
                    type="button"
                    onClick={() => onOpenProposta(selectedLead)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Gerar ou ver proposta comercial"
                  >
                    <FileText size={13} />
                    <span className="hidden sm:inline">Proposta</span>
                  </button>
                )}

                {onEditLead && (
                  <button
                    type="button"
                    onClick={() => onEditLead(selectedLead)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#222227] border border-[#27272a] text-zinc-300 hover:text-zinc-100 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Editar informações do lead"
                  >
                    <Edit3 size={13} />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                )}

                {selectedLead.whatsapp && (
                  <a
                    href={`https://wa.me/55${selectedLead.whatsapp.replace(/\D/g, '').replace(/^55/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#222227] border border-[#27272a] text-zinc-300 hover:text-zinc-100 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Abrir no WhatsApp Web externo"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {loadingMessages && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
                  <Loader2 size={24} className="animate-spin text-emerald-400" />
                  <span className="text-xs">Carregando conversa...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageSquare size={24} />
                  </div>
                  <div className="max-w-sm space-y-1.5">
                    <p className="text-sm font-bold text-zinc-200">Nenhuma mensagem registrada</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Envie a primeira mensagem para <strong>{selectedLead.nome}</strong> usando o campo abaixo ou selecione uma das etapas do roteiro de 1º Contato!
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
                        className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                          isMe
                            ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-100 rounded-tr-xs'
                            : 'bg-[#18181b] border border-[#27272a] text-zinc-100 rounded-tl-xs'
                        }`}
                      >
                        {/* Mídia: Foto / Imagem */}
                        {msg.media_type === 'image' && msg.media_url && (
                          <ImageMessageViewer src={msg.media_url} alt={msg.body} />
                        )}

                        {/* Mídia: Áudio de Voz com Player */}
                        {msg.media_type === 'audio' && msg.media_url && (
                          <AudioMessagePlayer src={msg.media_url} isMe={isMe} />
                        )}

                        {/* Mídia: Documento / PDF */}
                        {msg.media_type === 'document' && msg.media_url && (
                          <DocumentMessageCard
                            url={msg.media_url}
                            filename={msg.media_filename}
                            isMe={isMe}
                          />
                        )}

                        {/* Mídia: Figurinha */}
                        {msg.media_type === 'sticker' && msg.media_url && (
                          <div className="py-1">
                            <img
                              src={msg.media_url}
                              alt="Figurinha"
                              className="w-28 h-28 object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* Texto ou Legenda */}
                        {msg.body &&
                          !['[Imagem]', '[Áudio]', '[Áudio de Voz]', '[Figurinha]', '[Evento no chat]'].includes(
                            msg.body
                          ) &&
                          !msg.body.startsWith('[Documento:') && (
                            <p className={msg.media_url ? 'mt-1.5' : ''}>{msg.body}</p>
                          )}

                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                            isMe ? 'text-emerald-400/70' : 'text-zinc-500'
                          }`}
                        >
                          <span>{formatTimestamp(msg.timestamp)}</span>
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

            {/* Quick Roteiro Pills Bar */}
            {scriptSteps && scriptSteps.filter((s) => s.type === 'message').length > 0 && (
              <div className="px-4 py-2 bg-[#121215] border-t border-[#27272a] flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
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

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            {/* Barra de Anexo Selecionado */}
            {attachedFile && (
              <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-t border-[#27272a] text-xs text-zinc-300 shrink-0">
                <div className="flex items-center gap-2.5 truncate">
                  {attachedFile.type === 'image' && attachedFile.previewUrl ? (
                    <img
                      src={attachedFile.previewUrl}
                      alt="Preview"
                      className="w-8 h-8 rounded-md object-cover border border-[#3f3f46]"
                    />
                  ) : attachedFile.type === 'document' ? (
                    <div className="w-8 h-8 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Volume2 size={16} />
                    </div>
                  )}
                  <div className="flex flex-col truncate">
                    <span className="truncate font-semibold text-zinc-200">
                      {attachedFile.file.name}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {(attachedFile.file.size / 1024).toFixed(0)} KB • Arquivo pronto para envio
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Remover anexo"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 sm:p-4 bg-[#121215] border-t border-[#27272a] flex items-end gap-2.5 shrink-0">
              {isRecording ? (
                /* Modo Gravação de Áudio ao Vivo */
                <div className="flex-1 flex items-center justify-between bg-red-950/30 border border-red-500/40 rounded-xl px-4 py-2.5 min-h-[46px]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span className="text-xs font-semibold text-red-200">Gravando áudio de voz...</span>
                    <span className="text-xs font-mono text-red-300 bg-red-900/40 px-2 py-0.5 rounded-md font-bold">
                      {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Cancelar gravação"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={stopRecordingAndSend}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      title="Enviar áudio para o lead"
                    >
                      <Send size={13} />
                      <span>Enviar Áudio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo Normal de Digitação */
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploadingMedia}
                    className="min-h-[46px] w-[46px] rounded-xl bg-[#18181b] hover:bg-[#27272f] border border-[#27272a] hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    title="Anexar arquivo, imagem ou documento"
                  >
                    <Paperclip size={18} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      attachedFile
                        ? 'Adicione uma legenda ao arquivo (opcional)...'
                        : `Mensagem para ${selectedLead.nome}... (Pressione Enter para enviar)`
                    }
                    className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500 resize-none"
                  />

                  {inputText.trim() || attachedFile ? (
                    <button
                      type="button"
                      disabled={sending || uploadingMedia}
                      onClick={() => handleSendMessage()}
                      className="min-h-[46px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {sending || uploadingMedia ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={sending}
                      className="min-h-[46px] w-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0 shadow-md"
                      title="Gravar áudio de voz para o WhatsApp"
                    >
                      <Mic size={18} />
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* Empty State: Nenhuma conversa selecionada */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-400 shadow-xl">
              <MessageSquare size={32} className="text-emerald-400" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-lg font-bold text-zinc-200">WhatsApp Web dos Seus Leads</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Selecione qualquer lead na coluna à esquerda para ver o histórico completo de mensagens ou iniciar uma nova conversa diretamente pelo CRM.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-[#121215] border border-[#27272a] px-3 py-1.5 rounded-full">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Privacidade ativa: Apenas mensagens dos leads cadastrados aparecem aqui.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
