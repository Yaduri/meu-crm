import Papa from 'papaparse';
import type { ClientLead, PresencaDigital } from '../types/crm';

export interface MigrationSummary {
  totalRows: number;
  validLeads: number;
  duplicatePhones: number;
  statusBreakdown: Record<string, number>;
  leads: ClientLead[];
}

export function parseOldCsv(csvText: string): MigrationSummary {
  const lines = csvText.split(/\r?\n/);
  
  // Localiza a linha do header real
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('nicho') && l.includes('nome')) {
      headerIndex = i;
      break;
    }
  }

  const cleanContent = headerIndex !== -1 ? lines.slice(headerIndex).join('\n') : csvText;

  const parsed = Papa.parse<Record<string, string>>(cleanContent, {
    header: true,
    skipEmptyLines: true,
  });

  const statusBreakdown: Record<string, number> = {};
  const seenPhones = new Set<string>();
  let duplicatePhones = 0;

  const leads: ClientLead[] = [];

  parsed.data.forEach((row, idx) => {
    // Normalizar chaves do header (remover espaços, pontuações e acentos)
    const normalizedRow: Record<string, string> = {};
    Object.keys(row).forEach((k) => {
      const cleanKey = k.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, '_');
      normalizedRow[cleanKey] = row[k] ? row[k].trim() : '';
    });

    const nome = normalizedRow['nome'] || normalizedRow['cliente'];
    if (!nome) return;

    let nicho = normalizedRow['nicho'] || 'Estética';
    // Padronizar nichos comuns
    if (nicho.toLowerCase().includes('massag')) nicho = 'Massoterapia';
    if (nicho.toLowerCase().includes('advoc')) nicho = 'Advogado';
    if (nicho.toLowerCase().includes('psico')) nicho = 'Psicólogo';
    if (nicho.toLowerCase().includes('estet')) nicho = 'Estética';
    if (nicho.toLowerCase().includes('mecanic') || nicho.toLowerCase().includes('oficin') || nicho.toLowerCase().includes('auto center') || nicho.toLowerCase().includes('funilaria')) nicho = 'Mecânica / Oficina';

    const rawWhats = normalizedRow['whatsapp'] || '';
    const rawLinkPerfil = normalizedRow['link_do_perfil'] || normalizedRow['link_perfil'] || '';

    // WhatsApp
    let whatsapp = rawWhats.replace(/\D/g, '');
    let instagram = '';
    let googleUrl = '';

    // Se o link do perfil for WhatsApp ou URL
    if (rawLinkPerfil) {
      const perfilDigits = rawLinkPerfil.replace(/\D/g, '');
      if (!whatsapp && perfilDigits.length >= 8 && perfilDigits.length <= 13) {
        whatsapp = perfilDigits;
      } else if (rawLinkPerfil.includes('instagram.com') || rawLinkPerfil.startsWith('@')) {
        instagram = rawLinkPerfil;
      } else if (rawLinkPerfil.includes('google') || rawLinkPerfil.includes('maps') || rawLinkPerfil.includes('share.google')) {
        googleUrl = rawLinkPerfil;
      }
    }

    if (whatsapp) {
      if (seenPhones.has(whatsapp)) {
        duplicatePhones++;
      } else {
        seenPhones.add(whatsapp);
      }
    }

    // Mapeamento de Status
    const statusAntigo = (normalizedRow['status_de_prospeccao'] || normalizedRow['status_prospeccao'] || '').toLowerCase();
    const vendaRealizada = (normalizedRow['venda_realizada'] || '').toLowerCase();

    let newStatusId = 'abordar';
    if (statusAntigo.includes('andamento')) {
      newStatusId = 'abordado';
    } else if (statusAntigo.includes('negocia')) {
      newStatusId = 'negociacao';
    } else if (statusAntigo.includes('concluido') || statusAntigo.includes('conclu')) {
      if (vendaRealizada.includes('sim')) {
        newStatusId = 'fechado';
      } else {
        newStatusId = 'recusou_outro';
      }
    } else if (statusAntigo.includes('sem interesse')) {
      newStatusId = 'recusou_sem_interesse';
    }

    // Se venda_realizada for Sim, garante fechado
    if (vendaRealizada.includes('sim')) {
      newStatusId = 'fechado';
    }

    statusBreakdown[newStatusId] = (statusBreakdown[newStatusId] || 0) + 1;

    // Presença digital
    let presencaDigital: PresencaDigital = 'Sem site';
    const presencaAntiga = (normalizedRow['presenca_digital'] || '').toLowerCase();
    if (presencaAntiga.includes('lento') || presencaAntiga.includes('antigo')) {
      presencaDigital = 'Site desatualizado/lento';
    } else if (presencaAntiga.includes('instagram')) {
      presencaDigital = 'Só Instagram';
    } else if (presencaAntiga.includes('moderno') || presencaAntiga.includes('bom')) {
      presencaDigital = 'Site bom';
    }

    // Valores
    const rawValorVenda = normalizedRow['valor_da_venda'] || normalizedRow['valor_venda'] || '';
    const cleanValorVenda = rawValorVenda.replace(/[^\d,.]/g, '').replace(',', '.');
    const implantacao = parseFloat(cleanValorVenda) || 0;

    const rawValorRecorrente = normalizedRow['valor_recorrente'] || '';
    const cleanValorRecorrente = rawValorRecorrente.replace(/[^\d,.]/g, '').replace(',', '.');
    const mensalidade = parseFloat(cleanValorRecorrente) || 0;

    // Datas (se o lead já estiver encerrado/sem interesse ou fechado, não agenda próximo contato)
    const isClosedOrWon = newStatusId.startsWith('recusou_') || newStatusId.startsWith('sem_resp_') || newStatusId === 'fechado';
    const dataContato = normalizedRow['data'] || normalizedRow['data_contato'] || '';
    const proximoContato = isClosedOrWon ? '' : (normalizedRow['proximo_contato'] || normalizedRow['data_proximo_contato'] || '');

    // Dados de entrega/financeiro antigo
    const etapaEntrega = normalizedRow['etapa_de_entrega'] || undefined;
    const statusPagamento = normalizedRow['status_do_pagamento'] || undefined;
    const diaVencimento = parseInt(normalizedRow['dia_de_vencimento'] || '10', 10);

    leads.push({
      id: `migrated-${Date.now()}-${idx}`,
      nome,
      nicho,
      whatsapp,
      instagram: instagram || undefined,
      google_url: googleUrl || undefined,
      site_atual: normalizedRow['site_atual'] || undefined,
      presenca_digital: presencaDigital,
      origem: 'Scraper',
      status_id: newStatusId,
      ultimo_contato: dataContato || undefined,
      proximo_followup: proximoContato || undefined,
      followups_sem_resposta: 0,
      implantacao: implantacao > 0 ? implantacao : 1200,
      mensalidade,
      msg_a_mandar: normalizedRow['msg_a_mandar'] || undefined,
      observacoes: normalizedRow['observacoes'] || undefined,
      fase: newStatusId === 'fechado' ? 'projeto' : 'prospeccao',
      etapa_entrega: etapaEntrega,
      status_pagamento: statusPagamento,
      dia_vencimento: diaVencimento,
      created_at: dataContato || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    });
  });

  return {
    totalRows: parsed.data.length,
    validLeads: leads.length,
    duplicatePhones,
    statusBreakdown,
    leads,
  };
}

export function exportLeadsToCsv(leads: ClientLead[]): string {
  const exportData = leads.map(l => ({
    Nome: l.nome,
    Nicho: l.nicho,
    WhatsApp: l.whatsapp || '',
    Instagram: l.instagram || '',
    'Google Maps': l.google_url || '',
    'Site Atual': l.site_atual || '',
    'Presenca Digital': l.presenca_digital,
    Origem: l.origem,
    Status: l.status_id,
    'Implantacao (R$)': l.implantacao,
    'Mensalidade (R$)': l.mensalidade,
    'Ultimo Contato': l.ultimo_contato || '',
    'Proximo Follow-up': l.proximo_followup || '',
    'Msg a Mandar': l.msg_a_mandar || '',
    Observacoes: l.observacoes || '',
  }));

  return Papa.unparse(exportData);
}
