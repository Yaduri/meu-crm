import React, { useState } from 'react';
import { parseOldCsv } from '../../lib/csvMigration';
import type { MigrationSummary } from '../../lib/csvMigration';
import type { ClientLead } from '../../types/crm';
import { DEFAULT_STATUSES } from '../../types/crm';
import { UploadCloud, ArrowRight, X, AlertTriangle } from 'lucide-react';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (leads: ClientLead[], replaceAll: boolean) => void;
  onClearAllLeads: () => void;
  currentCount: number;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  onClose,
  onImportLeads,
  onClearAllLeads,
  currentCount,
}) => {
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [replaceAll, setReplaceAll] = useState(true);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseOldCsv(text);
      setSummary(res);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirm = () => {
    if (!summary || summary.leads.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      onImportLeads(summary.leads, replaceAll);
      setIsProcessing(false);
      onClose();
    }, 400);
  };

  const handleClear = () => {
    if (window.confirm('Tem certeza que deseja apagar TODOS os leads atuais (incluindo os dados de teste)? Esta ação não pode ser desfeita.')) {
      onClearAllLeads();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
          <div>
            <h2 id="migration-modal-title" className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <UploadCloud size={18} className="text-emerald-400" />
              <span>Importar e Gerenciar Base</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Importe o backup do sistema antigo ou limpe a base atual ({currentCount} leads cadastrados).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* Botão de Limpar Base Atual */}
          {currentCount > 0 && !summary && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                <div>
                  <div className="font-semibold text-rose-300">Apagar toda a base atual?</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Remove todos os {currentCount} leads cadastrados no momento (incluindo os de teste).
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors cursor-pointer shrink-0"
              >
                Apagar Tudo
              </button>
            </div>
          )}

          {!summary ? (
            <div className="border-2 border-dashed border-[#27272a] hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-[#0e0e11]">
              <UploadCloud size={40} className="text-zinc-400 mb-3" />
              <div className="text-sm font-semibold text-zinc-200">
                Arraste o arquivo CSV ou clique para selecionar
              </div>
              <p className="text-zinc-400 text-xs mt-1 max-w-sm">
                Selecione o arquivo <strong>Leads.csv</strong> ou <strong>LED - Leads.csv</strong>.
              </p>
              <label className="mt-4 min-h-[38px] inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl cursor-pointer transition-colors">
                <span>Escolher Arquivo</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Relatório de Prévia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5">
                  <div className="text-zinc-400 text-[11px]">Total de Linhas</div>
                  <div className="text-lg font-bold font-mono text-zinc-100 mt-0.5">{summary.totalRows}</div>
                </div>
                <div className="bg-[#18181b] border border-emerald-500/30 rounded-xl p-3.5">
                  <div className="text-emerald-400 text-[11px] font-semibold">Leads Válidos Mapeados</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{summary.validLeads}</div>
                </div>
                <div className="bg-[#18181b] border border-amber-500/30 rounded-xl p-3.5">
                  <div className="text-amber-400 text-[11px]">Telefones Duplicados</div>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{summary.duplicatePhones}</div>
                </div>
              </div>

              {/* Opção de Substituir Tudo ou Apenas Somar */}
              <div className="p-3.5 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-200">Como deseja importar?</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {replaceAll
                      ? 'Substituir toda a base (apaga os dados de teste e coloca só estes novos leads)'
                      : 'Somar aos leads existentes'}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={replaceAll}
                    onChange={(e) => setReplaceAll(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-zinc-300 font-medium">Substituir tudo</span>
                </label>
              </div>

              {/* Mapeamento de Status Detalhado */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                <div className="text-xs font-semibold text-zinc-200 mb-2">
                  Distribuição para o Novo Funil:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(summary.statusBreakdown).map(([statusId, count]) => {
                    const statusCfg = DEFAULT_STATUSES.find(s => s.id === statusId);
                    return (
                      <div key={statusId} className="flex items-center justify-between p-2 rounded-lg bg-[#141418] border border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: statusCfg?.color || '#94a3b8' }}
                          />
                          <span className="text-zinc-300">{statusCfg?.label || statusId}</span>
                        </div>
                        <span className="font-mono font-semibold text-zinc-100">{String(count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Nova Escolha */}
              <div className="flex justify-between items-center text-zinc-400 text-xs pt-2">
                <span>Arquivo carregado com sucesso</span>
                <label className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer">
                  Escolher outro arquivo
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#27272a] flex items-center justify-end gap-3 bg-[#141418]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-2 rounded-xl bg-[#27272a] hover:bg-zinc-700 text-zinc-200 font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!summary || summary.validLeads === 0 || isProcessing}
            onClick={handleConfirm}
            className="min-h-[38px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer flex items-center gap-2"
          >
            {isProcessing ? (
              <span>Importando...</span>
            ) : (
              <>
                <span>
                  {replaceAll ? 'Limpar e Importar' : 'Importar'} {summary?.validLeads || 0} Leads
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
