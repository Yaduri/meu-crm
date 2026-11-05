const fs = require('fs');
const path = require('path');

async function run() {
  const res = await fetch('https://meu-crm.yaduri16.workers.dev/api/state');
  const json = await res.json();
  const leadsInProd = (json.state && json.state.leads) || [];
  console.log('Total leads no CRM atual em produção:', leadsInProd.length);

  const csvPath = 'C:/Users/yadur/.gemini/antigravity/brain/f33449b8-4c00-47dc-85d0-9b63b7cb8789/.user_uploaded/media_1793817299442_f1291c76.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

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

  const rows = parseCSV(csvContent);
  const headers = rows[0];
  console.log('Headers:', headers);
  console.log('Total linhas no CSV:', rows.length - 1);

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
  const newLeads = [];

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
      if (duplicateExamples.length < 10) {
        duplicateExamples.push({ empresa: item.empresa, telefone: item.telefone, motivo: isDupPhone ? 'Telefone duplicado' : 'Nome duplicado' });
      }
    } else {
      newLeads.push(item);
    }
  }

  console.log('==========================================');
  console.log('Leads Duplicados (já existem no CRM):', duplicatesCount);
  console.log('Exemplos de duplicados que serão ignorados:', JSON.stringify(duplicateExamples, null, 2));
  console.log('==========================================');
  console.log('Novos leads únicos a serem adicionados:', newLeads.length);

  // Salvar prévia dos novos leads
  fs.writeFileSync('scripts/new_leads_to_import.json', JSON.stringify(newLeads, null, 2));
}

run().catch(console.error);
