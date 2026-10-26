import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  CheckCircle2, 
  KeyRound, 
  Smartphone, 
  DollarSign, 
  Database,
  ShieldCheck
} from 'lucide-react';

export interface CrmSettings {
  nomeProfissional: string;
  whatsappComercial: string;
  chavePix: string;
  implantacaoPadrao: number;
  mensalidadePadrao: number;
  diaVencimentoPadrao: number;
}

export const DEFAULT_CRM_SETTINGS: CrmSettings = {
  nomeProfissional: 'Yago Duarte',
  whatsappComercial: '5511911300834',
  chavePix: '',
  implantacaoPadrao: 1200,
  mensalidadePadrao: 89,
  diaVencimentoPadrao: 10,
};

interface ConfiguracoesViewProps {
  settings: CrmSettings;
  onSaveSettings: (newSettings: CrmSettings) => void;
  onExportFullBackup: () => void;
  onImportFullBackup: (file: File) => void;
  counts: {
    leads: number;
    projects: number;
    invoices: number;
    installments: number;
  };
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  settings,
  onSaveSettings,
  onExportFullBackup,
  onImportFullBackup,
  counts,
}) => {
  const [formData, setFormData] = useState<CrmSettings>(settings);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFullBackup(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-8 py-5 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings size={20} className="text-emerald-400" />
            <span>Configurações do Sistema</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Personalize sua Chave Pix, WhatsApp de atendimento, valores padrão e faça backups completos da operação.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Comerciais e Pix */}
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 border-b border-[#27272a] pb-3">
                <KeyRound size={16} className="text-emerald-400" />
                <span>Dados de Cobrança & Atendimento</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Seu Nome / Marca</label>
                  <input
                    type="text"
                    value={formData.nomeProfissional}
                    onChange={(e) => setFormData({ ...formData, nomeProfissional: e.target.value })}
                    placeholder="Yago Duarte"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Seu WhatsApp Oficial (com DDI 55)
                  </label>
                  <div className="relative">
                    <Smartphone size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      value={formData.whatsappComercial}
                      onChange={(e) => setFormData({ ...formData, whatsappComercial: e.target.value })}
                      placeholder="5511911300834"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Usado no botão "Aceitar Proposta" das páginas públicas.
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Sua Chave Pix (Para Cobranças)
                  </label>
                  <input
                    type="text"
                    value={formData.chavePix}
                    onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                    placeholder="CPF, CNPJ, E-mail ou Celular"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-emerald-400 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Inserida automaticamente nos lembretes de mensalidade via WhatsApp.
                  </span>
                </div>
              </div>
            </div>

            {/* Valores Padrão */}
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 border-b border-[#27272a] pb-3">
                <DollarSign size={16} className="text-emerald-400" />
                <span>Valores Padrão de Novos Negócios</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Implantação Padrão (R$)</label>
                  <input
                    type="number"
                    step="50"
                    value={formData.implantacaoPadrao}
                    onChange={(e) => setFormData({ ...formData, implantacaoPadrao: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Mensalidade MRR Padrão (R$)</label>
                  <input
                    type="number"
                    step="5"
                    value={formData.mensalidadePadrao}
                    onChange={(e) => setFormData({ ...formData, mensalidadePadrao: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Dia de Vencimento Padrão</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.diaVencimentoPadrao}
                    onChange={(e) => setFormData({ ...formData, diaVencimentoPadrao: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {savedFeedback ? (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={15} />
                    <span>Configurações salvas com sucesso!</span>
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Save size={14} />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </div>
          </form>

          {/* Backup Completo JSON & Segurança */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                <Database size={16} className="text-emerald-400" />
                <span>Backup Completo do Sistema (JSON)</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                {counts.leads} leads · {counts.projects} projetos · {counts.invoices} mensalidades
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Exporte um arquivo único <code>.json</code> contendo todos os seus leads, projetos, checklists, histórico financeiro, propostas e configurações, ou restaure um backup salvo anteriormente.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onExportFullBackup}
                className="px-4 py-2.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-emerald-400" />
                <span>Baixar Backup Completo (.JSON)</span>
              </button>

              <label className="px-4 py-2.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer">
                <Upload size={14} className="text-sky-400" />
                <span>Restaurar Backup (.JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Status de Segurança Cloudflare */}
          <div className="bg-emerald-950/15 border border-emerald-500/25 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100">Ambiente Protegido · Cloudflare Zero Trust</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Domínio oficial <strong>crm.yagoduarte.com.br</strong> com autenticação de acesso ativa.
                </div>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              Produção Ativa
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
