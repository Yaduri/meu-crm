import React, { useState, useEffect } from 'react';
import type { ClientLead, PresencaDigital, LeadOrigem } from '../../types/crm';
import { NICHOS_PADRAO, DEFAULT_STATUSES } from '../../types/crm';
import { parseConversationScript } from '../../utils/conversationScript';
import { X, AlertCircle, Trash2, FileText, Sparkles, Loader2, ClipboardPaste, MessageSquare, Clock, Copy, Check, Send } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadData: Partial<ClientLead>) => void;
  onDelete?: (leadId: string) => void;
  onOpenProposta?: (lead: ClientLead) => void;
  initialLead?: ClientLead | null;
  existingLeads: ClientLead[];
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenProposta,
  initialLead,
  existingLeads
}) => {
  const [nome, setNome] = useState(initialLead?.nome || '');
  const [nicho, setNicho] = useState(initialLead?.nicho || 'Estética');
  const [whatsapp, setWhatsapp] = useState(initialLead?.whatsapp || '');
  const [instagram, setInstagram] = useState(initialLead?.instagram || '');
  const [googleUrl, setGoogleUrl] = useState(initialLead?.google_url || '');
  const [siteAtual, setSiteAtual] = useState(initialLead?.site_atual || '');
  const [presencaDigital, setPresencaDigital] = useState<PresencaDigital>(
    initialLead?.presenca_digital || 'Sem site'
  );
  const [origem, setOrigem] = useState<LeadOrigem>(initialLead?.origem || 'Google Maps');
  const [statusId, setStatusId] = useState(initialLead?.status_id || 'abordar');
  const [ultimoContato, setUltimoContato] = useState(initialLead?.ultimo_contato || '');
  const [proximoFollowup, setProximoFollowup] = useState(initialLead?.proximo_followup || '');
  const [implantacao, setImplantacao] = useState(initialLead?.implantacao?.toString() || '1200');
  const [mensalidade, setMensalidade] = useState(initialLead?.mensalidade?.toString() || '89');
  const [linkPrevia, setLinkPrevia] = useState(initialLead?.link_previa || '');
  const [linkProposta, setLinkProposta] = useState(initialLead?.link_proposta || '');
  const [msgAMandar, setMsgAMandar] = useState(initialLead?.msg_a_mandar || '');
  const [observacoes, setObservacoes] = useState(initialLead?.observacoes || '');
  const [aiLoadingIntent, setAiLoadingIntent] = useState<string | null>(null);
  const [showMagicPaste, setShowMagicPaste] = useState(false);
  const [rawPasteText, setRawPasteText] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [copiedStepIdx, setCopiedStepIdx] = useState<number | null>(null);
  const [scriptViewMode, setScriptViewMode] = useState<'steps' | 'raw'>('steps');

  const handleParseRawLeadAI = async () => {
    if (!rawPasteText.trim()) return;
    setMagicLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse_raw_lead',
          rawText: rawPasteText,
        }),
      });
      const json = await res.json();
      const parsed = json.result || json.data;
      if (res.ok && parsed) {
        if (parsed.nome) setNome(parsed.nome);
        if (parsed.nicho) setNicho(parsed.nicho);
        if (parsed.whatsapp) setWhatsapp(String(parsed.whatsapp).replace(/\D/g, ''));
        if (parsed.instagram) setInstagram(parsed.instagram);
        if (parsed.site_atual) setSiteAtual(parsed.site_atual);
        if (parsed.presenca_digital) setPresencaDigital(parsed.presenca_digital as PresencaDigital);
        if (parsed.origem) setOrigem(parsed.origem as LeadOrigem);
        if (parsed.observacoes) setObservacoes(parsed.observacoes);
        setShowMagicPaste(false);
        setRawPasteText('');
      }
    } catch {
      // ignore
    } finally {
      setMagicLoading(false);
    }
  };

  const handleCopyStepText = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStepIdx(index);
    setTimeout(() => setCopiedStepIdx(null), 2000);
  };

  const handleDispatchStepWhatsApp = (text: string) => {
    if (!whatsapp) return;
    const cleanPhone = whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleGenerateLeadMsgAI = async (intent: string) => {
    setAiLoadingIntent(intent);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'whatsapp_message',
          intent,
          lead: {
            nome: nome || 'Cliente',
            nicho,
            presenca_digital: presencaDigital,
            origem,
            site_atual: siteAtual,
            instagram,
            implantacao: parseFloat(implantacao) || 1200,
            mensalidade: parseFloat(mensalidade) || 89,
            link_previa: linkPrevia,
            link_proposta: linkProposta,
            observacoes,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.result) {
        setMsgAMandar(String(json.result).trim());
      }
    } catch {
      // fallback silencioso
    } finally {
      setAiLoadingIntent(null);
    }
  };

  useEffect(() => {
    if (initialLead) {
      setNome(initialLead.nome || '');
      setNicho(initialLead.nicho || 'Estética');
      setWhatsapp(initialLead.whatsapp || '');
      setInstagram(initialLead.instagram || '');
      setGoogleUrl(initialLead.google_url || '');
      setSiteAtual(initialLead.site_atual || '');
      setPresencaDigital(initialLead.presenca_digital || 'Sem site');
      setOrigem(initialLead.origem || 'Google Maps');
      setStatusId(initialLead.status_id || 'abordar');
      setUltimoContato(initialLead.ultimo_contato || '');
      setProximoFollowup(initialLead.proximo_followup || '');
      setImplantacao(initialLead.implantacao !== undefined ? initialLead.implantacao.toString() : '1200');
      setMensalidade(initialLead.mensalidade !== undefined ? initialLead.mensalidade.toString() : '89');
      setLinkPrevia(initialLead.link_previa || '');
      setLinkProposta(initialLead.link_proposta || '');
      setMsgAMandar(initialLead.msg_a_mandar || '');
      setObservacoes(initialLead.observacoes || '');
    } else {
      setNome('');
      setNicho('Estética');
      setWhatsapp('');
      setInstagram('');
      setGoogleUrl('');
      setSiteAtual('');
      setPresencaDigital('Sem site');
      setOrigem('Google Maps');
      setStatusId('abordar');
      setUltimoContato('');
      setProximoFollowup('');
      setImplantacao('1200');
      setMensalidade('89');
      setLinkPrevia('');
      setLinkProposta('');
      setMsgAMandar('');
      setObservacoes('');
    }
  }, [initialLead, isOpen]);

  if (!isOpen) return null;

  const allNichos = Array.from(
    new Set([
      ...NICHOS_PADRAO,
      ...existingLeads.map(l => l.nicho).filter(Boolean),
      ...(initialLead?.nicho ? [initialLead.nicho] : [])
    ])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const cleanPhone = whatsapp.replace(/\D/g, '');
  const duplicateLead = cleanPhone && cleanPhone.length >= 8
    ? existingLeads.find(l => l.id !== initialLead?.id && l.whatsapp?.replace(/\D/g, '').includes(cleanPhone))
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSave({
      nome,
      nicho,
      whatsapp,
      instagram,
      google_url: googleUrl,
      site_atual: siteAtual,
      presenca_digital: presencaDigital,
      origem,
      status_id: statusId,
      ultimo_contato: ultimoContato || undefined,
      proximo_followup: proximoFollowup || undefined,
      implantacao: parseFloat(implantacao) || 0,
      mensalidade: parseFloat(mensalidade) || 0,
      link_previa: linkPrevia,
      link_proposta: linkProposta,
      msg_a_mandar: msgAMandar,
      observacoes,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
          <h2 id="lead-modal-title" className="text-base font-bold text-zinc-100">
            {initialLead?.nome ? 'Editar Cliente / Lead' : 'Novo Lead para Prospecção'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Magic Paste Box (Feature #6) */}
          <div className="p-3 bg-[#18181b] border border-emerald-500/30 rounded-xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={14} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold text-zinc-100">Cadastro Mágico via Google Maps / Instagram (IA)</span>
                  <span className="text-[11px] text-zinc-400 block">
                    Cole o bloco de texto copiado do Google Maps ou da bio do Instagram e preencha tudo em 1 clique.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMagicPaste(prev => !prev)}
                className="min-h-[32px] px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles size={12} />
                <span>{showMagicPaste ? 'Fechar' : 'Colar Texto Bruto'}</span>
              </button>
            </div>

            {showMagicPaste && (
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <textarea
                  rows={3}
                  value={rawPasteText}
                  onChange={(e) => setRawPasteText(e.target.value)}
                  placeholder="Cole aqui o texto copiado do Google Maps (nome, avaliações, telefone, endereço, site) ou da bio do Instagram..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={magicLoading || !rawPasteText.trim()}
                    onClick={handleParseRawLeadAI}
                    className="min-h-[34px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {magicLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>Extrair e Preencher com IA</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {duplicateLead && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                <strong>Atenção:</strong> Já existe um lead cadastrado com este WhatsApp: <strong>{duplicateLead.nome}</strong> ({duplicateLead.nicho}).
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Nome do Cliente / Empresa *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Studio Letícia Vieira"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Nicho</label>
              <select
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                {allNichos.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@perfil"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Origem do Lead</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as LeadOrigem)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="Google Maps">Google Maps</option>
                <option value="Instagram">Instagram</option>
                <option value="Indicação">Indicação</option>
                <option value="Scraper">Scraper / Lista</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Presença Digital Atual</label>
              <select
                value={presencaDigital}
                onChange={(e) => setPresencaDigital(e.target.value as PresencaDigital)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="Sem site">Sem site</option>
                <option value="Só Instagram">Só Instagram</option>
                <option value="Só Google Meu Negócio">Só Google Meu Negócio</option>
                <option value="Site desatualizado/lento">Site desatualizado/lento</option>
                <option value="Site bom">Site bom</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Site Atual (se houver)</label>
              <input
                type="text"
                value={siteAtual}
                onChange={(e) => setSiteAtual(e.target.value)}
                placeholder="exemplo.com.br"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Perfil Google Meu Negócio / Maps</label>
            <input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Status Inicial</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                {DEFAULT_STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Implantação (R$)</label>
              <input
                type="number"
                step="50"
                value={implantacao}
                onChange={(e) => setImplantacao(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Mensalidade (R$)</label>
              <input
                type="number"
                step="10"
                value={mensalidade}
                onChange={(e) => setMensalidade(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Datas de Contato & Próximo Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-[#16161a] border border-[#27272a] rounded-xl">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-300 font-medium">Data do Último Contato</label>
                <button
                  type="button"
                  onClick={() => setUltimoContato(new Date().toISOString().slice(0, 10))}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                >
                  Marcar Hoje
                </button>
              </div>
              <input
                type="date"
                value={ultimoContato}
                onChange={(e) => setUltimoContato(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-zinc-300 font-medium">Próximo Contato (Follow-up)</label>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Hoje', days: 0 },
                    { label: '+2d', days: 2 },
                    { label: '+7d', days: 7 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + btn.days);
                        setProximoFollowup(d.toISOString().slice(0, 10));
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#27272a] hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                  {proximoFollowup && (
                    <button
                      type="button"
                      onClick={() => setProximoFollowup('')}
                      className="px-1.5 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
              <input
                type="date"
                value={proximoFollowup}
                onChange={(e) => setProximoFollowup(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Link do Site de Demonstração (Demo / Modelo)</label>
              <input
                type="url"
                value={linkPrevia}
                onChange={(e) => setLinkPrevia(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Link da Proposta Comercial</label>
              <input
                type="url"
                value={linkProposta}
                onChange={(e) => setLinkProposta(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="block text-zinc-300 font-medium">Mensagem a Mandar no WhatsApp</label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={!!aiLoadingIntent}
                  onClick={() => handleGenerateLeadMsgAI('primeiro_contato')}
                  className="px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {aiLoadingIntent === 'primeiro_contato' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>1º Contato IA</span>
                </button>
                <button
                  type="button"
                  disabled={!!aiLoadingIntent}
                  onClick={() => handleGenerateLeadMsgAI('envio_previa')}
                  className="px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {aiLoadingIntent === 'envio_previa' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Demo IA</span>
                </button>
                <button
                  type="button"
                  disabled={!!aiLoadingIntent}
                  onClick={() => handleGenerateLeadMsgAI('followup_resgate')}
                  className="px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {aiLoadingIntent === 'followup_resgate' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Follow-up IA</span>
                </button>
              </div>
            </div>

            {(() => {
              const scriptSteps = parseConversationScript(msgAMandar);
              if (scriptSteps && scriptSteps.length > 0) {
                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <MessageSquare size={13} />
                        <span>Roteiro Conversacional ({scriptSteps.filter(s => s.type === 'message').length} etapas)</span>
                      </span>
                      <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a] text-[11px]">
                        <button
                          type="button"
                          onClick={() => setScriptViewMode('steps')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            scriptViewMode === 'steps' ? 'bg-[#27272f] text-zinc-100 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Ver em Etapas
                        </button>
                        <button
                          type="button"
                          onClick={() => setScriptViewMode('raw')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            scriptViewMode === 'raw' ? 'bg-[#27272f] text-zinc-100 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Editar Texto
                        </button>
                      </div>
                    </div>

                    {scriptViewMode === 'steps' ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {scriptSteps.map((step, idx) => {
                          if (step.type === 'wait') {
                            return (
                              <div key={idx} className="py-0.5 flex items-center justify-center">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-medium">
                                  <Clock size={11} className="text-amber-400 shrink-0" />
                                  <span>{step.content}</span>
                                </div>
                              </div>
                            );
                          }

                          const isCopied = copiedStepIdx === idx;
                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-[#18181c] border border-[#27272f] rounded-xl space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-[#23232a] pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[9px] flex items-center justify-center font-mono">
                                    {step.stepNumber || 1}
                                  </span>
                                  <span className="text-[11px] font-semibold text-zinc-200">
                                    {step.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyStepText(idx, step.content)}
                                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                    <span>{isCopied ? 'Copiada' : 'Copiar'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDispatchStepWhatsApp(step.content)}
                                    className="px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Send size={10} />
                                    <span>Zap</span>
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-zinc-200 whitespace-pre-line leading-relaxed">
                                {step.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        rows={5}
                        value={msgAMandar}
                        onChange={(e) => setMsgAMandar(e.target.value)}
                        placeholder="Script personalizado para abordagem ou follow-up..."
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                      />
                    )}
                  </div>
                );
              }

              return (
                <textarea
                  rows={3}
                  value={msgAMandar}
                  onChange={(e) => setMsgAMandar(e.target.value)}
                  placeholder="Script personalizado para abordagem ou follow-up..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                />
              );
            })()}
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Observações Internas</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas importantes sobre as necessidades do cliente..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#27272a] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {initialLead?.id && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Deseja realmente excluir o lead "${initialLead.nome}"?`)) {
                      onDelete(initialLead.id);
                      onClose();
                    }
                  }}
                  className="min-h-[38px] px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              )}

              {initialLead?.id && onOpenProposta && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProposta(initialLead);
                  }}
                  className="min-h-[38px] px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Gerar Proposta (/p/)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[38px] px-4 py-2 rounded-lg bg-[#27272a] hover:bg-zinc-700 text-zinc-200 font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[38px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer"
              >
                {initialLead?.nome ? 'Salvar Alterações' : 'Cadastrar Lead'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
