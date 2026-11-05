const fs = require('fs');

function normalizarNicho(segmento) {
  const s = String(segmento || '').toLowerCase().trim();
  if (s.includes('advoc')) return 'Advocacia';
  if (s.includes('cirurg')) return 'Cirurgia';
  if (s.includes('médic') || s.includes('medic') || s.includes('clínica') || s.includes('clinica')) return 'Clínica Médica';
  if (s.includes('estét') || s.includes('estet')) return 'Estética';
  if (s.includes('masso') || s.includes('massag')) return 'Massoterapia';
  if (s.includes('psico')) return 'Psicologia';
  if (s.includes('terap')) return 'Terapia';
  return 'Outro';
}

function inferirProfissao(seg, gen) {
  const s = String(seg || '').toLowerCase();
  const g = String(gen || '').toUpperCase();
  if (s.includes('estét')) return 'esteticista';
  if (s.includes('advoc')) return g === 'F' ? 'advogada' : 'advogado';
  if (s.includes('psico')) return g === 'F' ? 'psicóloga' : 'psicólogo';
  if (s.includes('masso') || s.includes('massag')) return 'massoterapeuta';
  if (s.includes('clínica') || s.includes('cirurg') || s.includes('médic')) return g === 'F' ? 'médica' : 'médico';
  if (s.includes('terap')) return 'terapeuta';
  return 'profissional';
}

async function run() {
  const rawLeads = require('./new_leads_to_import.json');
  console.log(`Lendo ${rawLeads.length} novos leads únicos do CSV...`);

  const now = new Date().toISOString();
  const baseTimestamp = Date.now();

  const formattedLeads = rawLeads.map((item, idx) => {
    const nicho = normalizarNicho(item.segmento);
    const cleanPhone = String(item.telefone || '').replace(/\D/g, '');
    const hasSite = Boolean(item.site && item.site.trim());
    const hasInsta = Boolean(item.instagram && item.instagram.trim());
    
    let presenca = 'Sem site';
    if (hasSite) {
      presenca = 'Site desatualizado/lento';
    } else if (hasInsta) {
      presenca = 'Só Instagram';
    }

    const profissao = item.profissao || inferirProfissao(item.segmento, item.genero);

    return {
      id: `lead-csv-${baseTimestamp}-${idx + 1}`,
      nome: item.empresa.trim(),
      nicho: nicho,
      cidade: item.cidade.trim(),
      whatsapp: cleanPhone,
      instagram: item.instagram ? item.instagram.trim() : '',
      google_url: item.link_maps ? item.link_maps.trim() : '',
      site_atual: item.site ? item.site.trim() : '',
      presenca_digital: presenca,
      origem: 'Google Maps',
      status_id: 'abordar',
      fase: 'prospeccao',
      followups_sem_resposta: 0,
      implantacao: 1200,
      mensalidade: 89,
      decisor: item.decisor ? item.decisor.trim() : '',
      tratamento: item.tratamento ? item.tratamento.trim() : '',
      genero: item.genero ? item.genero.trim().toUpperCase() : '',
      profissao: profissao,
      tipo_negocio: item.tipo_negocio ? item.tipo_negocio.trim() : '',
      segmento: item.segmento ? item.segmento.trim() : '',
      nota_google: item.nota_google || '',
      avaliacoes: item.avaliacoes || '',
      observacoes: item.observacao ? item.observacao.trim() : '',
      created_at: '2026-11-04',
      updated_at: now
    };
  });

  console.log(`Formatados ${formattedLeads.length} leads no schema do CRM.`);

  // Enviar em blocos de 50 para a rota /api/leads/import
  const batchSize = 50;
  let totalImportados = 0;

  for (let i = 0; i < formattedLeads.length; i += batchSize) {
    const chunk = formattedLeads.slice(i, i + batchSize);
    console.log(`Enviando lote ${Math.floor(i / batchSize) + 1} (${chunk.length} leads)...`);
    
    const res = await fetch('https://meu-crm.yaduri16.workers.dev/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: chunk })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha no lote ${i}: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    totalImportados += (data.imported || chunk.length);
    console.log(`Lote ${Math.floor(i / batchSize) + 1} importado com sucesso!`);
  }

  console.log('==========================================');
  console.log(`TOTAL IMPORTADO COM SUCESSO: ${totalImportados} leads!`);
  console.log('==========================================');

  // Verificar estado final
  const stateRes = await fetch('https://meu-crm.yaduri16.workers.dev/api/state');
  const stateData = await stateRes.json();
  const totalLeadsNow = stateData.state?.leads?.length || 0;
  console.log(`Total de leads em produção no CRM agora: ${totalLeadsNow}`);
}

run().catch(console.error);
