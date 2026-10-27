import React, { useState } from 'react';
import type { BriefingData } from '../../types/crm';
import { 
  Send, 
  Sparkles, 
  Building2, 
  Palette, 
  PhoneCall, 
  FolderPlus, 
  CheckCircle2
} from 'lucide-react';

interface PublicBriefingViewProps {
  initialData: BriefingData;
  onSaveBriefing: (updated: BriefingData) => void;
  whatsappComercial?: string;
}

export const PublicBriefingView: React.FC<PublicBriefingViewProps> = ({ 
  initialData, 
  onSaveBriefing,
  whatsappComercial,
}) => {
  const [formData, setFormData] = useState<BriefingData>(initialData);
  const [submitted, setSubmitted] = useState(initialData.preenchido || false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [yagoWhatsApp, setYagoWhatsApp] = useState<string>(whatsappComercial || '5511945987666');

  React.useEffect(() => {
    document.title = `Briefing do Projeto · ${initialData.cliente_nome} | Yago Duarte`;
    fetch(`/api/briefings/${initialData.token}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.briefing) {
          setFormData(res.briefing);
          if (res.briefing.preenchido) setSubmitted(true);
        }
        if (res.whatsapp_comercial) {
          setYagoWhatsApp(res.whatsapp_comercial);
        }
      })
      .catch(() => {});
  }, [initialData.token, initialData.cliente_nome]);

  const handleChange = (field: keyof BriefingData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        const fullUrl = `${window.location.origin}${data.url}`;
        setFormData(prev => ({
          ...prev,
          link_arquivos: prev.link_arquivos ? `${prev.link_arquivos} | ${fullUrl}` : fullUrl
        }));
      }
    } catch {
      alert('Erro ao enviar arquivo.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BriefingData = {
      ...formData,
      preenchido: true,
      preenchido_em: new Date().toISOString()
    };
    onSaveBriefing(updated);
    try {
      await fetch(`/api/briefings/${formData.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch {
      // Salvo localmente caso offline
    }
    setSubmitted(true);
  };

  const handleNotifyWhatsApp = () => {
    const cleanPhone = (yagoWhatsApp || '5511945987666').replace(/\D/g, '');
    const msg = `Olá Yago Duarte! Acabei de preencher e enviar o briefing do projeto "${formData.nome_empresa || formData.cliente_nome}"!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="max-w-md w-full bg-[#121215] border border-emerald-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-100">Briefing Enviado com Sucesso!</h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Obrigado pelas respostas! Com essas informações, o Yago já começará a montar a estratégia e o design exclusivo do seu projeto.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleNotifyWhatsApp}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={14} />
              <span>Avisar Yago no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Banner */}
      <div className="border-b border-[#27272a] bg-[#0d0d10]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/60 overflow-hidden flex items-center justify-center p-1">
            <img 
              src="/logo-yd-symbol.png" 
              alt="Yago Duarte" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 leading-none">Yago Duarte</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Formulário de Alinhamento de Projeto</div>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400">
          Cliente: <span className="text-zinc-200 font-semibold">{formData.cliente_nome}</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto px-6 py-10 flex-1">
        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles size={13} />
            <span>Etapa Inicial · Briefing Criativo</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
            Vamos alinhar os detalhes do seu novo site
          </h1>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Preencha os campos abaixo com o máximo de detalhes possível. Essas informações serão a base de toda a arquitetura, copy e design do seu projeto.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Dados do Negócio */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm border-b border-zinc-800 pb-3">
              <Building2 size={16} className="text-emerald-400" />
              <span>1. Informações da sua Empresa</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Fantasia ou da Marca *</label>
                <input
                  type="text"
                  required
                  value={formData.nome_empresa}
                  onChange={(e) => handleChange('nome_empresa', e.target.value)}
                  placeholder="Ex: Dra. Camila Rocha Advocacia"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Slogan ou Posicionamento Principal</label>
                <input
                  type="text"
                  value={formData.slogan_posicionamento}
                  onChange={(e) => handleChange('slogan_posicionamento', e.target.value)}
                  placeholder="Ex: Especialista em Direito Previdenciário em SP"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Quem é o seu cliente ideal / público-alvo? *</label>
              <textarea
                rows={2}
                required
                value={formData.publico_alvo}
                onChange={(e) => handleChange('publico_alvo', e.target.value)}
                placeholder="Ex: Mulheres de 28 a 55 anos que buscam procedimentos estéticos faciais e corporais com segurança..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Quais os principais serviços ou tratamentos a destacar? *</label>
              <textarea
                rows={3}
                required
                value={formData.servicos_principais}
                onChange={(e) => handleChange('servicos_principais', e.target.value)}
                placeholder="Ex: 1. Harmonização Facial, 2. Botox Preventivo, 3. Bioestimulador de Colágeno..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Quais seus principais diferenciais frente aos concorrentes?</label>
              <textarea
                rows={2}
                value={formData.diferenciais}
                onChange={(e) => handleChange('diferenciais', e.target.value)}
                placeholder="Ex: Atendimento humanizado e individual, tecnologia de ponta alemã, estacionamento gratuito no local..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Seção 2: Identidade Visual e Estilo */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm border-b border-zinc-800 pb-3">
              <Palette size={16} className="text-emerald-400" />
              <span>2. Visual, Cores & Referências</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Cores preferidas (ou da sua marca)</label>
              <input
                type="text"
                value={formData.cores_preferidas}
                onChange={(e) => handleChange('cores_preferidas', e.target.value)}
                placeholder="Ex: Dourado, branco e preto fosco / Verde esmeralda e tons terrosos"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Sites de referência que você acha bonitos (opcional)</label>
              <textarea
                rows={2}
                value={formData.sites_referencia}
                onChange={(e) => handleChange('sites_referencia', e.target.value)}
                placeholder="Ex: https://clinicaexemplo.com.br (gosto das fontes e da limpeza visual)"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Seção 3: Contatos e Localização */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm border-b border-zinc-800 pb-3">
              <PhoneCall size={16} className="text-emerald-400" />
              <span>3. Canais de Contato & Redes</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">WhatsApp oficial de atendimento ao cliente *</label>
                <input
                  type="text"
                  required
                  value={formData.whatsapp_atendimento}
                  onChange={(e) => handleChange('whatsapp_atendimento', e.target.value)}
                  placeholder="Ex: (11) 99999-8888"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Instagram (@usuario)</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="Ex: @clinicasorriso"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Endereço Físico (se aplicável)</label>
              <input
                type="text"
                value={formData.endereco_fisico}
                onChange={(e) => handleChange('endereco_fisico', e.target.value)}
                placeholder="Ex: Av. Paulista, 1000, Cj. 42 - Bela Vista, São Paulo - SP"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Seção 4: Links de Arquivos e Fotos */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm border-b border-zinc-800 pb-3">
              <FolderPlus size={16} className="text-emerald-400" />
              <span>4. Arquivos, Logo & Fotos</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Enviar Logo / Fotos direto por aqui (ou colar link abaixo)</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                  <span>{uploadingFile ? 'Enviando arquivo para a nuvem...' : '+ Anexar Logo / Arquivo'}</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-zinc-400">Salvo direto na nuvem do CRM</span>
              </div>
              <input
                type="text"
                value={formData.link_arquivos}
                onChange={(e) => handleChange('link_arquivos', e.target.value)}
                placeholder="Ou cole o link da pasta compartilhada (Google Drive, Dropbox, WeTransfer)"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Pode incluir logo em PNG/vetor, fotos da clínica/escritório e fotos dos profissionais. Se não tiver agora, pode enviar pelo WhatsApp depois.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Observações ou solicitações extras</label>
              <textarea
                rows={2}
                value={formData.observacoes_adicionais}
                onChange={(e) => handleChange('observacoes_adicionais', e.target.value)}
                placeholder="Ex: Gostaria de ter um mapa do Google no rodapé e seção para dúvidas frequentes (FAQ)..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-600/20 hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              <span>Concluir e Enviar Briefing</span>
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-6 text-center text-xs text-zinc-400">
        <div>Yago Duarte · Desenvolvimento Web & Design Estratégico</div>
      </footer>
    </div>
  );
};