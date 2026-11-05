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

function inferirTipoNegocio(seg, nicho) {
  const s = (String(seg || '') + ' ' + String(nicho || '')).toLowerCase();
  if (s.includes('advoc')) return 'escritório';
  if (s.includes('estét') || s.includes('cirurg') || s.includes('médic') || s.includes('medic')) return 'clínica';
  if (s.includes('masso') || s.includes('massag') || s.includes('terap')) return 'espaço';
  if (s.includes('psico')) return 'consultório';
  return 'empresa';
}

function parseCSV(text) {
  const lines = [];
  let curLine = [];
  let curField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          curField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        curField += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        curLine.push(curField.trim());
        curField = '';
      } else if (c === '\r') {
        // ignore
      } else if (c === '\n') {
        curLine.push(curField.trim());
        lines.push(curLine);
        curLine = [];
        curField = '';
      } else {
        curField += c;
      }
    }
  }
  if (curField.length > 0 || curLine.length > 0) {
    curLine.push(curField.trim());
    lines.push(curLine);
  }
  return lines;
}

async function run() {
  console.log('Buscando estado atual do CRM...');
  const res = await fetch('https://meu-crm.yaduri16.workers.dev/api/state');
  const json = await res.json();
  const leadsInProd = (json.state && json.state.leads) || [];
  console.log('Total leads no CRM atual em produção:', leadsInProd.length);

  const csvContent = fs.readFileSync('scripts/leads_input_batch2.csv', 'utf-8');
  const rows = parseCSV(csvContent);
  const headers = rows[0];
  console.log('Total linhas neste CSV:', rows.length - 1);

  // Mapas de telefones e nomes existentes no CRM
  const prodPhones = new Set();
  const prodLast8 = new Set();
  const prodNames = new Set();

  for (const l of leadsInProd) {
    const rawP = String(l.whatsapp || l.telefone || '').replace(/\D/g, '');
    if (rawP) {
      prodPhones.add(rawP);
      if (rawP.length >= 8) prodLast8.add(rawP.slice(-8));
    }
    if (l.nome) {
      prodNames.add(l.nome.toLowerCase().trim());
    }
  }

  let duplicatesCount = 0;
  const duplicateExamples = [];
  const newLeadsRaw = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 5 || !r[0]) continue;
    const item = {};
    headers.forEach((h, idx) => { item[h] = r[idx] || ''; });

    const phone = String(item.telefone || '').replace(/\D/g, '');
    const last8 = phone.length >= 8 ? phone.slice(-8) : '';
    const nameLower = String(item.empresa || '').toLowerCase().trim();

    const isDupPhone = phone && (prodPhones.has(phone) || (last8 && prodLast8.has(last8)));
    const isDupName = nameLower && prodNames.has(nameLower);

    if (isDupPhone || isDupName) {
      duplicatesCount++;
      duplicateExamples.push({ empresa: item.empresa, telefone: item.telefone, motivo: isDupPhone ? 'Telefone duplicado' : 'Nome duplicado' });
    } else {
      newLeadsRaw.push(item);
    }
  }

  console.log('==========================================');
  console.log('Leads Duplicados (já existem no CRM e serão ignorados):', duplicatesCount);
  console.log('Exemplos de duplicados ignorados:', JSON.stringify(duplicateExamples.slice(0, 5), null, 2));
  console.log('==========================================');
  console.log('Novos leads únicos a serem adicionados:', newLeadsRaw.length);

  if (newLeadsRaw.length === 0) {
    console.log('Nenhum lead novo para importar!');
    return;
  }

  const now = new Date().toISOString();
  const baseTimestamp = Date.now();

  const formattedLeads = newLeadsRaw.map((item, idx) => {
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
    const tipoNegocio = item.tipo_negocio || inferirTipoNegocio(item.segmento, nicho);

    return {
      id: `lead-csv2-${baseTimestamp}-${idx + 1}`,
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
      tipo_negocio: tipoNegocio,
      segmento: item.segmento ? item.segmento.trim() : '',
      nota_google: item.nota_google || '',
      avaliacoes: item.avaliacoes || '',
      observacoes: item.observacao ? item.observacao.trim() : '',
      created_at: '2026-11-04',
      updated_at: now
    };
  });

  // Enviar em blocos de 50 para /api/leads/import
  const batchSize = 50;
  let totalImportados = 0;

  for (let i = 0; i < formattedLeads.length; i += batchSize) {
    const chunk = formattedLeads.slice(i, i + batchSize);
    console.log(`Enviando lote ${Math.floor(i / batchSize) + 1} (${chunk.length} leads)...`);
    
    const importRes = await fetch('https://meu-crm.yaduri16.workers.dev/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: chunk })
    });

    if (!importRes.ok) {
      const errText = await importRes.text();
      throw new Error(`Falha no lote ${i}: ${importRes.status} - ${errText}`);
    }

    const data = await importRes.json();
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
