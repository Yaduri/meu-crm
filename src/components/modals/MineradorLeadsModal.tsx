import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { ClientLead } from '../../types/crm';
import {
  X,
  Search,
  Sparkles,
  MapPin,
  Building2,
  ExternalLink,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Phone,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';

interface MineradorLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads: ClientLead[];
  onAddMultipleLeads: (leads: Partial<ClientLead>[]) => void;
}

interface EmpresaResultado {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  nome_exibicao: string;
  municipio: string;
  uf: string;
  porte: string;
  capital_social: number;
  capital_social_brl: string;
  data_abertura: string;
  telefone: string | null;
  telefone_limpo: string | null;
  maps_url: string;
  whatsapp_url: string;
  origem_fichario_url: string;
}

const CIDADES_SUGERIDAS = [
  'Campo Limpo Paulista',
  'Várzea Paulista',
  'Jundiaí',
  'Franco da Rocha',
  'Francisco Morato',
  'Itupeva',
  'Itu',
  'Salto',
  'Vinhedo',
  'Louveira',
  'São Paulo'
];

interface NichoPredefinido {
  nome: string;
  cnae: string;
  nichoCRM: string;
  tipoNegocio: string;
  profissao: string;
  tratamento?: string;
}

const NICHOS_PREDEFINIDOS: NichoPredefinido[] = [
  { nome: 'Mecânica / Oficina Mecânica', cnae: '4520001', nichoCRM: 'Mecânica / Oficina', tipoNegocio: 'oficina mecânica', profissao: 'mecânico' },
  { nome: 'Estética Automotiva / Lava-Rápido', cnae: '4520005', nichoCRM: 'Estética Automotiva', tipoNegocio: 'estética automotiva', profissao: 'detailer' },
  { nome: 'Funilaria e Pintura', cnae: '4520002', nichoCRM: 'Mecânica / Oficina', tipoNegocio: 'funilaria', profissao: 'funileiro' },
  { nome: 'Marmoraria (Mármores e Granitos)', cnae: '2391503', nichoCRM: 'Marmoraria', tipoNegocio: 'marmoraria', profissao: 'marmorista' },
  { nome: 'Marcenaria / Móveis Planejados', cnae: '3101200', nichoCRM: 'Marcenaria', tipoNegocio: 'marcenaria', profissao: 'marceneiro' },
  { nome: 'Vidraçaria / Esquadrias de Alumínio', cnae: '4330499', nichoCRM: 'Vidraçaria', tipoNegocio: 'vidraçaria', profissao: 'vidraceiro' },
  { nome: 'Odontologia / Dentista', cnae: '8630504', nichoCRM: 'Dentista', tipoNegocio: 'consultório', profissao: 'dentista', tratamento: 'Dr.' },
  { nome: 'Clínica de Estética e Beleza', cnae: '9602502', nichoCRM: 'Estética', tipoNegocio: 'clínica de estética', profissao: 'esteticista' },
  { nome: 'Advocacia / Escritório Jurídico', cnae: '6911701', nichoCRM: 'Advogado', tipoNegocio: 'escritório', profissao: 'advogado', tratamento: 'Dr.' },
  { nome: 'Clínica Médica / Consultórios', cnae: '8630503', nichoCRM: 'Médico', tipoNegocio: 'consultório', profissao: 'médico', tratamento: 'Dr.' },
  { nome: 'Pet Shop e Veterinária', cnae: '7500100', nichoCRM: 'Veterinária', tipoNegocio: 'clínica veterinária', profissao: 'veterinário', tratamento: 'Dr.' },
  { nome: 'Restaurante / Pizzaria', cnae: '5611201', nichoCRM: 'Restaurante', tipoNegocio: 'restaurante', profissao: 'proprietário' }
];

const formatPhoneForModelo = (rawPhone?: string | null): string => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
};

export const MineradorLeadsModal: React.FC<MineradorLeadsModalProps> = ({
  isOpen,
  onClose,
  existingLeads,
  onAddMultipleLeads
}) => {
  const [cidade, setCidade] = useState('Campo Limpo Paulista');
  const [selectedNichoIndex, setSelectedNichoIndex] = useState<number>(0);
  const [customCnae, setCustomCnae] = useState('');
  const [isCustomCnae, setIsCustomCnae] = useState(false);
  const [porteFiltro, setPorteFiltro] = useState<'todos' | 'me_epp' | 'me' | 'epp'>('me_epp');
  const [apenasSemSite, setApenasSemSite] = useState(false);
  const [apenasComTelefone, setApenasComTelefone] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<EmpresaResultado[]>([]);
  const [totalEncontrados, setTotalEncontrados] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [selectedCnpjs, setSelectedCnpjs] = useState<Set<string>>(new Set());
  const [importedCnpjs, setImportedCnpjs] = useState<Set<string>>(new Set());
  const [enrichingCnpj, setEnrichingCnpj] = useState<string | null>(null);
  const [enrichDetails, setEnrichDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen && resultados.length === 0) {
      handleBuscar(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCnae = isCustomCnae ? customCnae.replace(/\D/g, '') : NICHOS_PREDEFINIDOS[selectedNichoIndex]?.cnae;
  const currentNichoCRM = isCustomCnae ? 'Outro' : NICHOS_PREDEFINIDOS[selectedNichoIndex]?.nichoCRM || 'Outro';

  // Verifica se uma empresa já está no CRM (por telefone ou nome)
  const isEmpresaNoCRM = (empresa: EmpresaResultado): boolean => {
    const cleanEmpresaPhone = empresa.telefone_limpo || '';
    const cleanEmpresaNome = empresa.nome_exibicao.toLowerCase().trim();

    return existingLeads.some(lead => {
      const leadPhone = (lead.whatsapp || '').replace(/\D/g, '');
      if (cleanEmpresaPhone && leadPhone && cleanEmpresaPhone.length >= 8 && leadPhone.includes(cleanEmpresaPhone.slice(-8))) {
        return true;
      }
      if (lead.nome && lead.nome.toLowerCase().trim() === cleanEmpresaNome) {
        return true;
      }
      return false;
    });
  };

  const handleBuscar = async (novaPagina = 1) => {
    if (!currentCnae) {
      setError('Informe um código CNAE válido para buscar.');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedCnpjs(new Set());

    try {
      const params = new URLSearchParams({
        uf: 'SP',
        cidade,
        cnae: currentCnae,
        pagina: String(novaPagina),
        ordem: 'capital_desc'
      });

      if (porteFiltro === 'me_epp') {
        params.set('porte', 'ME,EPP');
      } else if (porteFiltro === 'me') {
        params.set('porte', 'ME');
      } else if (porteFiltro === 'epp') {
        params.set('porte', 'EPP');
      }

      if (apenasComTelefone) {
        params.set('tem_telefone', 'true');
      }

      if (apenasSemSite) {
        params.set('tem_site', 'false');
      }

      const res = await fetch(`/api/prospeccao/cnpj-search?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Falha ao buscar empresas no CNPJ');
      }

      setResultados(json.resultados || []);
      setTotalEncontrados(json.total || 0);
      setTotalPaginas(json.paginas || 1);
      setPagina(novaPagina);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar API de empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (cnpj: string) => {
    setSelectedCnpjs(prev => {
      const next = new Set(prev);
      if (next.has(cnpj)) next.delete(cnpj);
      else next.add(cnpj);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedCnpjs.size === resultados.length) {
      setSelectedCnpjs(new Set());
    } else {
      setSelectedCnpjs(new Set(resultados.map(r => r.cnpj)));
    }
  };

  const handleImportSingle = async (empresa: EmpresaResultado) => {
    const enriched = enrichDetails[empresa.cnpj];
    const newLead: Partial<ClientLead> = {
      nome: empresa.nome_exibicao,
      nicho: currentNichoCRM,
      whatsapp: empresa.telefone_limpo || '',
      presenca_digital: apenasSemSite ? 'Sem site' : 'Só Google Meu Negócio',
      origem: 'Google Maps',
      status_id: 'abordar',
      implantacao: 1200,
      mensalidade: 89,
      google_url: empresa.maps_url,
      observacoes: `CNPJ: ${empresa.cnpj} (${empresa.porte}). Cidade: ${empresa.municipio} - SP. Capital Social: ${empresa.capital_social_brl || 'R$ ' + empresa.capital_social}. Aberta em: ${empresa.data_abertura}.${enriched?.endereco ? ` Endereço: ${enriched.endereco}` : ''}`
    };

    onAddMultipleLeads([newLead]);
    setImportedCnpjs(prev => new Set(prev).add(empresa.cnpj));
  };

  const handleImportBatch = () => {
    const toImport = resultados.filter(r => selectedCnpjs.has(r.cnpj) && !importedCnpjs.has(r.cnpj));
    if (toImport.length === 0) return;

    const newLeads: Partial<ClientLead>[] = toImport.map(empresa => {
      const enriched = enrichDetails[empresa.cnpj];
      return {
        nome: empresa.nome_exibicao,
        nicho: currentNichoCRM,
        whatsapp: empresa.telefone_limpo || '',
        presenca_digital: apenasSemSite ? 'Sem site' : 'Só Google Meu Negócio',
        origem: 'Google Maps',
        status_id: 'abordar',
        implantacao: 1200,
        mensalidade: 89,
        google_url: empresa.maps_url,
        observacoes: `CNPJ: ${empresa.cnpj} (${empresa.porte}). Cidade: ${empresa.municipio} - SP. Capital Social: ${empresa.capital_social_brl || 'R$ ' + empresa.capital_social}. Aberta em: ${empresa.data_abertura}.${enriched?.endereco ? ` Endereço: ${enriched.endereco}` : ''}`
      };
    });

    onAddMultipleLeads(newLeads);
    setImportedCnpjs(prev => {
      const next = new Set(prev);
      toImport.forEach(r => next.add(r.cnpj));
      return next;
    });
    setSelectedCnpjs(new Set());
  };

  const handleEnrichMapsIA = async (empresa: EmpresaResultado) => {
    setEnrichingCnpj(empresa.cnpj);
    try {
      const res = await fetch('/api/prospeccao/maps-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: empresa.nome_exibicao,
          cidade: empresa.municipio,
          nicho: currentNichoCRM
        })
      });
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        setEnrichDetails(prev => ({ ...prev, [empresa.cnpj]: json.data }));
      }
    } catch {
      // fallback silencioso
    } finally {
      setEnrichingCnpj(null);
    }
  };

  const buildRowForModelo = (empresa: EmpresaResultado) => {
    const enrich = enrichDetails[empresa.cnpj];
    const currentNichoObj = isCustomCnae ? null : NICHOS_PREDEFINIDOS[selectedNichoIndex];

    return {
      empresa: empresa.nome_exibicao || empresa.razao_social,
      tipo_negocio: currentNichoObj?.tipoNegocio || 'empresa',
      decisor: enrich?.decisor || '',
      tratamento: currentNichoObj?.tratamento || '',
      genero: '',
      profissao: currentNichoObj?.profissao || '',
      segmento: (currentNichoCRM || 'Geral').toLowerCase(),
      cidade: `${empresa.municipio}/${empresa.uf || 'SP'}`,
      telefone: formatPhoneForModelo(enrich?.telefone || empresa.telefone_limpo || empresa.telefone),
      site: enrich?.site_url || '',
      instagram: enrich?.instagram || '',
      nota_google: enrich?.nota_avaliacao ?? '',
      avaliacoes: enrich?.total_avaliacoes ?? '',
      link_maps: empresa.maps_url || '',
      observacao: `CNPJ: ${empresa.cnpj} (${empresa.porte}). Capital Social: ${empresa.capital_social_brl || 'R$ ' + empresa.capital_social}. Aberta em: ${empresa.data_abertura}.${enrich?.endereco ? ' Endereço: ' + enrich.endereco : ''}`,
      abordagem: '',
      status: 'a_abordar',
      tipo_enviado: '',
      mensagem_enviada: '',
      enviado_em: ''
    };
  };

  const handleExportCsv = (list: EmpresaResultado[], filenameSuffix = '') => {
    if (list.length === 0) return;

    const rows = list.map(buildRowForModelo);

    const csvString = '\uFEFF' + Papa.unparse(rows, {
      quotes: false,
      header: true
    });

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedCidade = cidade.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sanitizedNicho = currentNichoCRM.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.href = url;
    link.setAttribute('download', `leads-${sanitizedCidade}-${sanitizedNicho}${filenameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-[#101014] border border-[#27272a] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272a] bg-[#141418] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Minerador de Empresas & Leads</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  CNPJ Fichário + Google Maps
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Encontre empresas ativas por CNAE e cidade na Receita Federal, confira no Maps e importe para o CRM em 1 clique.
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

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 bg-[#121216] border-b border-[#27272a] space-y-3.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Cidade */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <MapPin size={12} className="text-emerald-400" />
                <span>Cidade (SP)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="cidades-sugeridas"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: Campo Limpo Paulista"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500"
                />
                <datalist id="cidades-sugeridas">
                  {CIDADES_SUGERIDAS.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Nicho / CNAE */}
            <div className="sm:col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Building2 size={12} className="text-emerald-400" />
                  <span>Nicho & Atividade (CNAE)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCnae(prev => !prev)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  {isCustomCnae ? 'Escolher da lista' : 'Digitar CNAE manual'}
                </button>
              </div>

              {!isCustomCnae ? (
                <select
                  value={selectedNichoIndex}
                  onChange={(e) => setSelectedNichoIndex(Number(e.target.value))}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
                >
                  {NICHOS_PREDEFINIDOS.map((n, idx) => (
                    <option key={n.cnae} value={idx}>
                      {n.nome} (CNAE {n.cnae})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customCnae}
                  onChange={(e) => setCustomCnae(e.target.value)}
                  placeholder="Ex: 4520001 (7 dígitos)"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 font-mono focus:outline-hidden focus:border-emerald-500"
                />
              )}
            </div>

            {/* Porte */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Filter size={12} className="text-emerald-400" />
                <span>Porte da Empresa</span>
              </label>
              <select
                value={porteFiltro}
                onChange={(e) => setPorteFiltro(e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="me_epp">ME & EPP (Recomendado)</option>
                <option value="todos">Todos os portes</option>
                <option value="me">Apenas ME</option>
                <option value="epp">Apenas EPP</option>
              </select>
            </div>
          </div>

          {/* Checkboxes & Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={apenasComTelefone}
                  onChange={(e) => setApenasComTelefone(e.target.checked)}
                  className="rounded border-[#27272a] text-emerald-500 focus:ring-emerald-500/20 w-4 h-4"
                />
                <span>Com telefone cadastrado</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={apenasSemSite}
                  onChange={(e) => setApenasSemSite(e.target.checked)}
                  className="rounded border-[#27272a] text-emerald-500 focus:ring-emerald-500/20 w-4 h-4"
                />
                <span className="text-amber-300/90 font-medium">Apenas sem site (Oportunidades)</span>
              </label>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleBuscar(1)}
              className="min-h-[36px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              <span>{loading ? 'Consultando CNPJ...' : 'Buscar Empresas'}</span>
            </button>
          </div>
        </div>

        {/* Action Header on Results: Batch Select / Import */}
        {resultados.length > 0 && (
          <div className="px-5 py-2.5 bg-[#141418] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={selectedCnpjs.size === resultados.length && resultados.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-[#27272a] text-emerald-500 focus:ring-emerald-500/20 w-4 h-4"
                />
                <span className="font-semibold text-zinc-200">Selecionar Todos</span>
              </label>
              <span className="text-zinc-400 font-mono">
                {selectedCnpjs.size} de {resultados.length} selecionados
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-400 font-mono text-[11px] hidden sm:inline mr-1">
                {totalEncontrados} empresas ativas em {cidade}
              </span>

              {/* Botão Exportar Planilha (CSV) */}
              <button
                type="button"
                onClick={() =>
                  handleExportCsv(
                    selectedCnpjs.size > 0
                      ? resultados.filter(r => selectedCnpjs.has(r.cnpj))
                      : resultados,
                    selectedCnpjs.size > 0 ? '-selecionados' : '-pagina'
                  )
                }
                className="min-h-[32px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Exportar leads no formato do modelo de planilha CSV"
              >
                <FileSpreadsheet size={13} className="text-emerald-400" />
                <span>
                  {selectedCnpjs.size > 0
                    ? `Exportar Selecionadas (${selectedCnpjs.size})`
                    : `Exportar Planilha (${resultados.length})`}
                </span>
              </button>

              {/* Botão Importar Selecionadas */}
              {selectedCnpjs.size > 0 && (
                <button
                  type="button"
                  onClick={handleImportBatch}
                  className="min-h-[32px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-600/20"
                >
                  <Plus size={13} />
                  <span>Importar Selecionadas ({selectedCnpjs.size})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results List / Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loading && resultados.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-zinc-200">Minerando dados de CNPJ no Fichário...</p>
              <p className="text-xs text-zinc-400">Filtrando empresas ativas de {cidade} por CNAE {currentCnae}.</p>
            </div>
          )}

          {!loading && resultados.length === 0 && !error && (
            <div className="py-16 text-center space-y-2">
              <Building2 size={36} className="text-zinc-600 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">Nenhuma empresa encontrada com os filtros atuais.</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Tente desmarcar "Apenas sem site" ou selecionar "Todos os portes" para ampliar o resultado.
              </p>
            </div>
          )}

          {resultados.map((empresa) => {
            const isSelected = selectedCnpjs.has(empresa.cnpj);
            const isImported = importedCnpjs.has(empresa.cnpj) || isEmpresaNoCRM(empresa);
            const enrich = enrichDetails[empresa.cnpj];
            const isEnriching = enrichingCnpj === empresa.cnpj;

            return (
              <div
                key={empresa.cnpj}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/5 border-emerald-500/40'
                    : isImported
                    ? 'bg-[#141418] border-[#27272a] opacity-80'
                    : 'bg-[#16161b] hover:bg-[#191920] border-[#27272a]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Checkbox & Basic Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isImported}
                      onChange={() => handleToggleSelect(empresa.cnpj)}
                      className="mt-1 rounded border-[#27272a] text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer disabled:opacity-40"
                    />

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-100 text-sm truncate max-w-md">
                          {empresa.nome_exibicao}
                        </span>

                        {isImported ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                            <Check size={10} />
                            <span>Já no CRM</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-semibold">
                            Nova Oportunidade
                          </span>
                        )}

                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                          {empresa.porte}
                        </span>
                      </div>

                      {empresa.nome_fantasia && empresa.nome_fantasia !== empresa.razao_social && (
                        <p className="text-[11px] text-zinc-400 truncate">
                          Razão: {empresa.razao_social}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono">
                        <span>CNPJ: {empresa.cnpj}</span>
                        <span>•</span>
                        <span>Abertura: {empresa.data_abertura}</span>
                        <span>•</span>
                        <span>Capital: {empresa.capital_social_brl || 'R$ ' + empresa.capital_social}</span>
                        <span>•</span>
                        <span>{empresa.municipio} - {empresa.uf}</span>
                      </div>

                      {/* Enriched AI details if present */}
                      {enrich && (
                        <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] space-y-1">
                          <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                            <Sparkles size={12} />
                            <span>Diagnóstico Comercial IA:</span>
                          </div>
                          <p className="text-zinc-200">{enrich.argumento_personalizado}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Telefone / WhatsApp */}
                    {empresa.whatsapp_url ? (
                      <a
                        href={empresa.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title={`Conversar com ${empresa.telefone}`}
                      >
                        <Phone size={12} />
                        <span>{empresa.telefone}</span>
                      </a>
                    ) : empresa.telefone ? (
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-mono flex items-center gap-1.5">
                        <Phone size={12} />
                        <span>{empresa.telefone}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">Sem telefone</span>
                    )}

                    {/* Google Maps Link */}
                    <a
                      href={empresa.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#222228] hover:bg-[#2c2c34] border border-zinc-700/60 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Abrir pesquisa da empresa no Google Maps"
                    >
                      <MapPin size={12} className="text-rose-400" />
                      <span>Google Maps</span>
                      <ExternalLink size={10} className="text-zinc-400" />
                    </a>

                    {/* Botão Enriquecer com IA */}
                    {!enrich && (
                      <button
                        type="button"
                        disabled={isEnriching}
                        onClick={() => handleEnrichMapsIA(empresa)}
                        className="min-h-[32px] px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Buscar diagnóstico de presença digital e argumentos com IA"
                      >
                        {isEnriching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        <span>Raio-X IA</span>
                      </button>
                    )}

                    {/* Botão Exportar Lead Individual */}
                    <button
                      type="button"
                      onClick={() => handleExportCsv([empresa], `-${empresa.cnpj}`)}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-300 hover:text-zinc-100 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Exportar esta empresa para planilha CSV modelo"
                    >
                      <FileSpreadsheet size={12} className="text-emerald-400" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>

                    {/* Botão Importar Lead */}
                    <button
                      type="button"
                      disabled={isImported}
                      onClick={() => handleImportSingle(empresa)}
                      className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isImported
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      }`}
                    >
                      {isImported ? <Check size={12} /> : <Plus size={12} />}
                      <span>{isImported ? 'Importado' : 'Adicionar Lead'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Pagination */}
        {totalPaginas > 1 && (
          <div className="px-5 py-3 border-t border-[#27272a] bg-[#141418] flex items-center justify-between text-xs shrink-0">
            <span className="text-zinc-400 font-mono">
              Página {pagina} de {totalPaginas} ({totalEncontrados} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1 || loading}
                onClick={() => handleBuscar(pagina - 1)}
                className="min-h-[32px] px-3 py-1 rounded-lg bg-[#222228] hover:bg-[#2c2c34] text-zinc-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                disabled={pagina >= totalPaginas || loading}
                onClick={() => handleBuscar(pagina + 1)}
                className="min-h-[32px] px-3 py-1 rounded-lg bg-[#222228] hover:bg-[#2c2c34] text-zinc-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
