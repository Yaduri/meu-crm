import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  User,
  Building2,
  Phone,
  MapPin,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';

export interface LeadParaRevisaoN8n {
  id?: string;
  empresa: string;
  tipo_negocio: string;
  decisor: string;
  tratamento: string;
  genero: string;
  profissao: string;
  segmento: string;
  cidade: string;
  telefone: string;
  site?: string;
  instagram?: string;
  nota_google?: string | number;
  avaliacoes?: string | number;
  link_maps?: string;
  observacao?: string;
  abordagem?: string;
  status: string; // Vazio por padrão
  tipo_enviado?: string;
  mensagem_enviada?: string;
  enviado_em?: string;
}

interface RevisarEnvioN8nModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadsIniciais: LeadParaRevisaoN8n[];
  onConfirmSend: (leadsRevisados: LeadParaRevisaoN8n[]) => Promise<void>;
}

export const RevisarEnvioN8nModal: React.FC<RevisarEnvioN8nModalProps> = ({
  isOpen,
  onClose,
  leadsIniciais,
  onConfirmSend
}) => {
  const [leads, setLeads] = useState<LeadParaRevisaoN8n[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroSemDecisor, setFiltroSemDecisor] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Clona os leads para permitir edição isolada
      setLeads(JSON.parse(JSON.stringify(leadsIniciais)));
      setFiltroSemDecisor(false);
    }
  }, [isOpen, leadsIniciais]);

  if (!isOpen) return null;

  const handleUpdateField = (index: number, field: keyof LeadParaRevisaoN8n, value: string) => {
    setLeads(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveLead = (indexToRemove: number) => {
    setLeads(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const totalSemDecisor = leads.filter(l => !l.decisor || !l.decisor.trim()).length;

  const leadsExibidos = filtroSemDecisor
    ? leads.map((lead, originalIdx) => ({ lead, originalIdx })).filter(item => !item.lead.decisor || !item.lead.decisor.trim())
    : leads.map((lead, originalIdx) => ({ lead, originalIdx }));

  const handleSubmit = async () => {
    if (leads.length === 0) {
      alert('Nenhum lead na lista para envio.');
      return;
    }

    setLoading(true);
    try {
      await onConfirmSend(leads);
      onClose();
    } catch {
      // Erro tratado externamente
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-[#101014] border border-[#27272a] rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272a] bg-[#141418] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Send size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Revisar Dados antes do Envio para o N8N</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Confira o nome do decisor, tipo de negócio e profissão. As abordagens automáticas do N8N usam exatamente esses dados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning / Decision Maker Alert Bar */}
        <div className="px-5 py-3 bg-[#131317] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            {totalSemDecisor > 0 ? (
              <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-lg font-medium">
                <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                <span>
                  <strong>{totalSemDecisor} de {leads.length}</strong> leads estão sem nome do decisor preenchido.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg font-medium">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <span>Todos os leads estão com decisor preenchido!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {totalSemDecisor > 0 && (
              <button
                type="button"
                onClick={() => setFiltroSemDecisor(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  filtroSemDecisor
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                    : 'bg-[#18181b] hover:bg-[#242428] border-zinc-700 text-zinc-300'
                }`}
              >
                {filtroSemDecisor ? 'Mostrar Todos' : 'Ver apenas sem decisor'}
              </button>
            )}
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              Dica: O N8N usa o nome do decisor para personalizar a 1ª abordagem.
            </span>
          </div>
        </div>

        {/* Main Content: Editable Leads Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {leads.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Info size={32} className="text-zinc-600 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">Nenhum lead na lista para envio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leadsExibidos.map(({ lead, originalIdx }, displayIndex) => {
                const semDecisor = !lead.decisor || !lead.decisor.trim();

                return (
                  <div
                    key={lead.id || originalIdx}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      semDecisor
                        ? 'bg-[#17151a] border-amber-500/30'
                        : 'bg-[#141418] border-[#27272a] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono flex items-center justify-center shrink-0">
                          {displayIndex + 1}
                        </span>
                        <span className="font-semibold text-xs text-zinc-100 truncate">
                          {lead.empresa}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono shrink-0">
                          {lead.telefone || 'Sem telefone'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLead(originalIdx)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="Remover este lead do envio"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Grid of Editable Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                      {/* 1. Decisor (Com destaque quando vazio) */}
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center gap-1">
                          <User size={11} className={semDecisor ? 'text-amber-400' : 'text-emerald-400'} />
                          <span>Decisor (Responsável)</span>
                          {semDecisor && <span className="text-[10px] text-amber-400 font-normal">*preencha</span>}
                        </label>
                        <input
                          type="text"
                          value={lead.decisor || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'decisor', e.target.value)}
                          placeholder="Ex: Amanda Alves, Carlos Souza..."
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden transition-colors ${
                            semDecisor
                              ? 'bg-amber-500/10 border border-amber-500/40 focus:border-amber-400'
                              : 'bg-[#18181b] border border-zinc-700 focus:border-indigo-500'
                          }`}
                        />
                      </div>

                      {/* 2. Tratamento */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Tratamento
                        </label>
                        <select
                          value={lead.tratamento || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'tratamento', e.target.value)}
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="">Nenhum</option>
                          <option value="Dr.">Dr.</option>
                          <option value="Dra.">Dra.</option>
                          <option value="Sr.">Sr.</option>
                          <option value="Sra.">Sra.</option>
                        </select>
                      </div>

                      {/* 3. Tipo de Negócio */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center gap-1">
                          <Building2 size={11} className="text-indigo-400" />
                          <span>Tipo Negócio</span>
                        </label>
                        <input
                          type="text"
                          value={lead.tipo_negocio || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'tipo_negocio', e.target.value)}
                          placeholder="Ex: clínica, oficina..."
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      {/* 4. Profissão */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center gap-1">
                          <Sparkles size={11} className="text-indigo-400" />
                          <span>Profissão</span>
                        </label>
                        <input
                          type="text"
                          value={lead.profissao || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'profissao', e.target.value)}
                          placeholder="Ex: esteticista, mecânico..."
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      {/* 5. Segmento */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Segmento
                        </label>
                        <input
                          type="text"
                          value={lead.segmento || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'segmento', e.target.value)}
                          placeholder="Ex: estética, mecânica..."
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500 font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Row 2: Cidade / UF, Telefone, Observações */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-2.5 pt-2.5 border-t border-zinc-800/60 text-xs">
                      {/* Cidade / UF - Com destaque e campo próprio */}
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center gap-1">
                          <MapPin size={11} className="text-rose-400 shrink-0" />
                          <span>Cidade / UF</span>
                        </label>
                        <input
                          type="text"
                          value={lead.cidade || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'cidade', e.target.value)}
                          placeholder="Ex: Campo Limpo Paulista/SP, Jundiaí/SP"
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      {/* Telefone (WhatsApp) */}
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center gap-1">
                          <Phone size={11} className="text-emerald-400 shrink-0" />
                          <span>WhatsApp (55 + DDD + Número)</span>
                        </label>
                        <input
                          type="text"
                          value={lead.telefone || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'telefone', e.target.value)}
                          placeholder="5511999998888"
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      {/* Observações */}
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Observações
                        </label>
                        <input
                          type="text"
                          value={lead.observacao || ''}
                          onChange={(e) => handleUpdateField(originalIdx, 'observacao', e.target.value)}
                          placeholder="Notas ou detalhes da empresa..."
                          className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-hidden focus:border-indigo-500 truncate"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#27272a] bg-[#141418] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200">{leads.length} leads prontos</span>
            {totalSemDecisor > 0 && (
              <span className="text-amber-400 font-medium">
                ({totalSemDecisor} sem decisor)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={loading || leads.length === 0}
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Enviando para o N8N...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Confirmar e Enviar para o N8N ({leads.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
