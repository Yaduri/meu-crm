export interface DadosSegmento {
  tipoNegocio: string;
  profissao: string;
  tratamento: string;
  segmento: string;
}

/**
 * Mapeamento padronizado de Nicho/Segmento para Tipo de Negócio e Profissão
 * Atende perfeitamente à regra:
 * - Estética -> clínica / esteticista
 * - Mecânica -> oficina / mecânico
 * - Odontologia -> consultório / dentista (Dr./Dra.)
 * etc.
 */
export function inferirDadosSegmento(rawSegmentoOrNicho?: string): DadosSegmento {
  const s = String(rawSegmentoOrNicho || '').toLowerCase().trim();

  // Estética
  if (s.includes('estética') || s.includes('estetica') || s.includes('beleza') || s.includes('skincare') || s.includes('biomedicina')) {
    if (s.includes('auto') || s.includes('lava') || s.includes('car')) {
      return { tipoNegocio: 'estética automotiva', profissao: 'detailer', tratamento: '', segmento: 'estética automotiva' };
    }
    return { tipoNegocio: 'clínica', profissao: 'esteticista', tratamento: '', segmento: 'estética' };
  }

  // Mecânica / Automotivo
  if (s.includes('mecân') || s.includes('mecan') || s.includes('oficina') || s.includes('auto') || s.includes('funilaria') || s.includes('carro')) {
    if (s.includes('funil') || s.includes('pintura')) {
      return { tipoNegocio: 'funilaria', profissao: 'funileiro', tratamento: '', segmento: 'mecânica / oficina' };
    }
    return { tipoNegocio: 'oficina', profissao: 'mecânico', tratamento: '', segmento: 'mecânica / oficina' };
  }

  // Odontologia / Dentista
  if (s.includes('dent') || s.includes('odonto') || s.includes('dental')) {
    return { tipoNegocio: 'consultório', profissao: 'dentista', tratamento: 'Dr.', segmento: 'odontologia' };
  }

  // Advocacia / Advogado
  if (s.includes('advog') || s.includes('juríd') || s.includes('jurid') || s.includes('direito')) {
    return { tipoNegocio: 'escritório', profissao: 'advogado', tratamento: 'Dr.', segmento: 'advocacia' };
  }

  // Medicina / Médico
  if (s.includes('médic') || s.includes('medic') || s.includes('consultório') || s.includes('saúde') || s.includes('saude')) {
    return { tipoNegocio: 'consultório', profissao: 'médico', tratamento: 'Dr.', segmento: 'medicina' };
  }

  // Psicologia / Psicólogo
  if (s.includes('psico') || s.includes('terapia') || s.includes('terapeuta')) {
    if (s.includes('masso')) {
      return { tipoNegocio: 'studio', profissao: 'massoterapeuta', tratamento: '', segmento: 'massoterapia' };
    }
    return { tipoNegocio: 'consultório', profissao: 'psicólogo', tratamento: '', segmento: 'psicologia' };
  }

  // Massoterapia
  if (s.includes('masso') || s.includes('spa') || s.includes('relax')) {
    return { tipoNegocio: 'studio', profissao: 'massoterapeuta', tratamento: '', segmento: 'massoterapia' };
  }

  // Veterinária / Pet
  if (s.includes('vet') || s.includes('pet') || s.includes('animal')) {
    return { tipoNegocio: 'clínica', profissao: 'veterinário', tratamento: 'Dr.', segmento: 'veterinária' };
  }

  // Arquitetura / Design de Interiores
  if (s.includes('arquit') || s.includes('interiores') || s.includes('urbanis')) {
    return { tipoNegocio: 'escritório', profissao: 'arquiteto', tratamento: '', segmento: 'arquitetura' };
  }

  // Nutrição / Nutricionista
  if (s.includes('nutri')) {
    return { tipoNegocio: 'consultório', profissao: 'nutricionista', tratamento: '', segmento: 'nutrição' };
  }

  // Marcenaria
  if (s.includes('marcen') || s.includes('móve') || s.includes('move') || s.includes('planejad')) {
    return { tipoNegocio: 'marcenaria', profissao: 'marceneiro', tratamento: '', segmento: 'marcenaria' };
  }

  // Marmoraria
  if (s.includes('marmor') || s.includes('granit') || s.includes('pedra')) {
    return { tipoNegocio: 'marmoraria', profissao: 'marmorista', tratamento: '', segmento: 'marmoraria' };
  }

  // Vidraçaria
  if (s.includes('vidr') || s.includes('esquadria') || s.includes('box')) {
    return { tipoNegocio: 'vidraçaria', profissao: 'vidraceiro', tratamento: '', segmento: 'vidraçaria' };
  }

  // Salão de Beleza / Cabeleireiro
  if (s.includes('salão') || s.includes('salao') || s.includes('cabel') || s.includes('hair')) {
    return { tipoNegocio: 'salão', profissao: 'cabeleireiro', tratamento: '', segmento: 'beleza' };
  }

  // Barbearia
  if (s.includes('barb') || s.includes('barber')) {
    return { tipoNegocio: 'barbearia', profissao: 'barbeiro', tratamento: '', segmento: 'barbearia' };
  }

  // Restaurante / Gastronomia
  if (s.includes('restaur') || s.includes('pizza') || s.includes('burger') || s.includes('lanch') || s.includes('gastronom')) {
    return { tipoNegocio: 'restaurante', profissao: 'proprietário', tratamento: '', segmento: 'restaurante' };
  }

  // Imobiliária
  if (s.includes('imob') || s.includes('imóve') || s.includes('imove') || s.includes('corretor')) {
    return { tipoNegocio: 'imobiliária', profissao: 'corretor', tratamento: '', segmento: 'imobiliária' };
  }

  // Academia / Fitness
  if (s.includes('acad') || s.includes('cross') || s.includes('fit') || s.includes('treino')) {
    return { tipoNegocio: 'academia', profissao: 'personal', tratamento: '', segmento: 'fitness' };
  }

  // Padrão Geral
  return {
    tipoNegocio: 'empresa',
    profissao: 'proprietário',
    tratamento: '',
    segmento: s || 'geral'
  };
}

/**
 * Tenta inferir o nome do decisor e gênero a partir do nome da empresa ou razão social
 */
export function inferirDecisor(nomeEmpresa?: string): {
  decisor: string;
  tratamento: string;
  genero: string;
} {
  if (!nomeEmpresa) return { decisor: '', tratamento: '', genero: '' };

  let clean = nomeEmpresa.trim();

  // Tratamento Dr./Dra.
  let tratamento = '';
  let genero = '';
  if (/^dr\b|^dr\./i.test(clean)) {
    tratamento = 'Dr.';
    genero = 'M';
    clean = clean.replace(/^dr\.?\s+/i, '');
  } else if (/^dra\b|^dra\./i.test(clean)) {
    tratamento = 'Dra.';
    genero = 'F';
    clean = clean.replace(/^dra\.?\s+/i, '');
  }

  // Títulos profissionais no início (ex: "Psicóloga Monia Tomaz Soares", "Terapeuta Christian Bezzon")
  const prefixoProfissao = clean.match(/^(psicólog[ao]|psicolog[ao]|terapeuta|massoterapeuta|esteticista|dentista|médic[ao]|medico|advogad[ao]|arquiteto|nutricionista)\s+/i);
  if (prefixoProfissao) {
    if (!genero) {
      genero = prefixoProfissao[1].endsWith('a') ? 'F' : 'M';
    }
    clean = clean.slice(prefixoProfissao[0].length);
  }

  // Separações por traço, vírgula, barra ou pipe (ex: "Amanda Alves - Estética", "Cláudia Guimarães, Psicólogo")
  const partes = clean.split(/\s*[-–|/,]\s*/);
  const candidatoNome = partes[0].trim();

  // Remove sufixos jurídicos empresariais
  const semSufixo = candidatoNome
    .replace(/\b(ltda|epp|me|eireli|s\/s|ss|sa|s\.a\.|epu)\b/gi, '')
    .trim();

  const palavras = semSufixo.split(/\s+/);

  // Palavras corporativas que desclassificam como nome de pessoa
  const stopWords = /^(oficina|mecanica|mecânica|centro|auto|servicos|serviços|clinica|clínica|consultorio|consultório|estúdio|studio|espaço|espaco|salao|salão|instituto|grupo|comercio|comércio|vidracaria|vidraçaria|marcenaria|marmoraria|pizzaria|restaurante|laboratorio|laboratório)$/i;
  
  if (palavras.length >= 2 && palavras.length <= 4 && !palavras.some(p => stopWords.test(p))) {
    // Parece um nome de pessoa real (ex: "Amanda Alves", "Monia Tomaz Soares")
    const primeiro = palavras[0];
    if (!genero) {
      genero = /a$/i.test(primeiro) ? 'F' : 'M';
    }
    return {
      decisor: palavras.join(' '),
      tratamento,
      genero
    };
  }

  return {
    decisor: '',
    tratamento,
    genero
  };
}

/**
 * Normaliza o telefone no formato com DDI 55 (ex: 5511999998888)
 */
export function formatarTelefoneParaN8n(rawPhone?: string | null): string {
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
}

/**
 * Extrai a cidade/UF do lead se disponível no campo dedicado ou nas observações/nome.
 * Nunca inventa uma cidade padrão se não houver dados.
 */
export function extrairCidadeLead(lead?: { cidade?: string; observacoes?: string; nome?: string } | null): string {
  if (!lead) return '';

  if (lead.cidade && lead.cidade.trim()) {
    return lead.cidade.trim();
  }

  // Tenta extrair de observacoes (ex: "Cidade: Bragança Paulista - SP" ou "Cidade: Bragança Paulista/SP")
  if (lead.observacoes) {
    const match = lead.observacoes.match(/cidade:\s*([^.\n,]+(?:\s*[-/]\s*[a-zA-Z]{2})?)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
}
