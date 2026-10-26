import React, { useState, useEffect } from 'react';
import type { ClientLead, PresencaDigital, LeadOrigem } from '../../types/crm';
import { NICHOS_PADRAO, DEFAULT_STATUSES } from '../../types/crm';
import { X, AlertCircle, Trash2, FileText, Sparkles, Loader2 } from 'lucide-react';

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
  const [implantacao, setImplantacao] = useState(initialLead?.implantacao?.toString() || '1200');
  const [mensalidade, setMensalidade] = useState(initialLead?.mensalidade?.toString() || '89');
  const [linkPrevia, setLinkPrevia] = useState(initialLead?.link_previa || '');
  const [linkProposta, setLinkProposta] = useState(initialLead?.link_proposta || '');
  const [msgAMandar, setMsgAMandar] = useState(initialLead?.msg_a_mandar || '');
  const [observacoes, setObservacoes] = useState(initialLead?.observacoes || '');
  const [aiLoadingIntent, setAiLoadingIntent] = useState<string | null>(null);

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Link da Prévia (Figma / Web)</label>
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
                  <span>Prévia IA</span>
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
            <textarea
              rows={3}
              value={msgAMandar}
              onChange={(e) => setMsgAMandar(e.target.value)}
              placeholder="Script personalizado para abordagem ou follow-up..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
            />
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
