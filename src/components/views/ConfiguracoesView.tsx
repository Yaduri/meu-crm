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
  ShieldCheck,
  Bot,
  Copy
} from 'lucide-react';
import type { CrmSettings } from '../../types/crm';
export { DEFAULT_CRM_SETTINGS } from '../../types/crm';
export type { CrmSettings };

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
  const [cloudFiles, setCloudFiles] = useState<Array<{ key: string; filename: string; size: number; created_at: string }>>([]);
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [testN8nResult, setTestN8nResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestN8n = async () => {
    setTestingN8n(true);
    setTestN8nResult(null);
    try {
      const res = await fetch('/api/prospeccao/testar-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: formData.n8nWebhookUrl })
      });
      const data = await res.json();
      if (data.ok) {
        setTestN8nResult({ ok: true, message: '✅ ' + (data.message || 'Webhook conectado com sucesso!') });
      } else {
        setTestN8nResult({ ok: false, message: '❌ ' + (data.error || 'Falha ao conectar no webhook do N8N.') });
      }
    } catch {
      setTestN8nResult({ ok: false, message: '❌ Erro de rede ao testar webhook do N8N.' });
    } finally {
      setTestingN8n(false);
    }
  };

  React.useEffect(() => {
    fetch('/api/state')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.state?.files)) {
          setCloudFiles(res.state.files);
        }
      })
      .catch(() => {});
  }, []);

  const handleCloudUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCloud(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setCloudFiles(prev => [
          { key: data.key, filename: data.name, size: data.size, created_at: new Date().toISOString() },
          ...prev
        ]);
      }
    } catch {
      alert('Falha no upload para a nuvem.');
    } finally {
      setUploadingCloud(false);
      e.target.value = '';
    }
  };

  const handleDeleteCloudFile = async (key: string) => {
    await fetch(`/api/files/${key}`, { method: 'DELETE' });
    setCloudFiles(prev => prev.filter(f => f.key !== key));
  };

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-5 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings size={20} className="text-emerald-400" />
            <span>Configurações do Sistema</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Personalize sua Chave Pix, WhatsApp de atendimento, valores padrão e faça backups completos da operação.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Comerciais e Pix */}
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 border-b border-[#27272a] pb-3">
                <KeyRound size={16} className="text-emerald-400" />
                <span>Dados de Cobrança & Atendimento</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Seu Nome / Marca</label>
                  <input
                    type="text"
                    value={formData.nomeProfissional}
                    onChange={(e) => setFormData({ ...formData, nomeProfissional: e.target.value })}
                    placeholder="Yago Duarte"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Seu WhatsApp Oficial (com DDI 55)
                  </label>
                  <div className="relative">
                    <Smartphone size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      value={formData.whatsappComercial}
                      onChange={(e) => setFormData({ ...formData, whatsappComercial: e.target.value })}
                      placeholder="5511945987666"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-9 pr-3 py-2 text-zinc-100 placeholder:text-zinc-400 font-mono focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Usado no botão "Aceitar Proposta" das páginas públicas.
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Sua Chave Pix (Para Cobranças)
                  </label>
                  <input
                    type="text"
                    value={formData.chavePix}
                    onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                    placeholder="CPF, CNPJ, E-mail ou Celular"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-emerald-400 placeholder:text-zinc-400 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Inserida automaticamente nos lembretes de mensalidade via WhatsApp.
                  </span>
                </div>
              </div>
            </div>

            {/* Valores Padrão */}
            <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 border-b border-[#27272a] pb-3">
                <DollarSign size={16} className="text-emerald-400" />
                <span>Valores Padrão de Novos Negócios</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Implantação Padrão (R$)</label>
                  <input
                    type="number"
                    step="50"
                    value={formData.implantacaoPadrao}
                    onChange={(e) => setFormData({ ...formData, implantacaoPadrao: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Mensalidade MRR Padrão (R$)</label>
                  <input
                    type="number"
                    step="5"
                    value={formData.mensalidadePadrao}
                    onChange={(e) => setFormData({ ...formData, mensalidadePadrao: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Dia de Vencimento Padrão</label>
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

              {/* Integração N8N (Prospecção Automática) */}
              <div className="pt-4 border-t border-[#27272a] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <Bot size={16} className="text-indigo-400" />
                  <span>Integração N8N & Automação WhatsApp</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-normal">
                    Sincronização Bidirecional
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-zinc-300 font-medium">
                        URL do Webhook do N8N (Disparo de Leads)
                      </label>
                      <button
                        type="button"
                        disabled={testingN8n}
                        onClick={handleTestN8n}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {testingN8n ? 'Testando...' : 'Testar Conexão'}
                      </button>
                    </div>
                    <input
                      type="url"
                      value={formData.n8nWebhookUrl || ''}
                      onChange={(e) => setFormData({ ...formData, n8nWebhookUrl: e.target.value })}
                      placeholder="https://n8n.yagoduarte.com.br/webhook/prospeccao-leads"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-100 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Ao clicar em "Enviar N8N", o CRM posta os leads diretamente aqui.
                    </span>

                    {testN8nResult && (
                      <div className={`mt-2 p-2 rounded-lg text-xs ${testN8nResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}`}>
                        {testN8nResult.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Webhook de Retorno do CRM (Para nós do N8N)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="https://crm.yagoduarte.com.br/api/prospeccao/webhook-n8n"
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-300 text-xs font-mono focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://crm.yagoduarte.com.br/api/prospeccao/webhook-n8n');
                          alert('URL do Webhook copiada para a área de transferência!');
                        }}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        title="Copiar URL"
                      >
                        <Copy size={13} />
                        <span>Copiar</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Recebe atualizações de "abordado", "sem_whatsapp", "resposta", etc.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
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
                  className="min-h-[40px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Save size={14} />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </div>
          </form>

          {/* Backup Completo JSON & Segurança */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
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
                className="min-h-[40px] px-4 py-2.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-emerald-400" />
                <span>Baixar Backup Completo (.JSON)</span>
              </button>

              <label className="min-h-[40px] px-4 py-2.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer">
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

          {/* Arquivos na Nuvem (Logos, Contratos e Comprovantes) */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                <Upload size={16} className="text-emerald-400" />
                <span>Arquivos na Nuvem (Logos, Contratos & Comprovantes)</span>
              </div>
              <label className="min-h-[36px] inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors">
                <span>{uploadingCloud ? 'Enviando...' : '+ Enviar Arquivo'}</span>
                <input type="file" onChange={handleCloudUpload} disabled={uploadingCloud} className="hidden" />
              </label>
            </div>

            {cloudFiles.length === 0 ? (
              <div className="text-xs text-zinc-400 py-4 text-center">
                Nenhum arquivo salvo na nuvem ainda. Os arquivos anexados nos briefings ou enviados aqui ficam disponíveis em qualquer dispositivo.
              </div>
            ) : (
              <div className="divide-y divide-[#1e1e24] text-xs">
                {cloudFiles.map(f => (
                  <div key={f.key} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <a
                        href={`/api/files/${f.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-emerald-400 hover:underline"
                      >
                        {f.filename}
                      </a>
                      <span className="text-[11px] text-zinc-400 ml-2 font-mono">
                        ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCloudFile(f.key)}
                      className="min-h-[32px] px-2 text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status de Segurança Cloudflare */}
          <div className="bg-emerald-950/15 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
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
