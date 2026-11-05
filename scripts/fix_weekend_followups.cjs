function ajustarSeFimDeSemana(dateStr) {
  if (!dateStr) return undefined;
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const dayOfWeek = target.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 6) {
    target.setDate(target.getDate() + 2); // Sábado -> Segunda
  } else if (dayOfWeek === 0) {
    target.setDate(target.getDate() + 1); // Domingo -> Segunda
  } else {
    return clean;
  }
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function run() {
  const res = await fetch('https://meu-crm.yaduri16.workers.dev/api/state');
  const data = await res.json();
  const leads = data.state?.leads || [];

  const toUpdate = [];
  for (const l of leads) {
    if (!l.proximo_followup) continue;
    const adjusted = ajustarSeFimDeSemana(l.proximo_followup);
    if (adjusted && adjusted !== l.proximo_followup) {
      toUpdate.push({
        ...l,
        proximo_followup: adjusted,
        updated_at: new Date().toISOString()
      });
      console.log(`[${l.id}] ${l.nome}: ${l.proximo_followup} -> ${adjusted}`);
    }
  }

  console.log(`Total de leads com follow-up no fim de semana corrigidos: ${toUpdate.length}`);

  if (toUpdate.length > 0) {
    const postRes = await fetch('https://meu-crm.yaduri16.workers.dev/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: toUpdate })
    });

    if (postRes.ok) {
      const resp = await postRes.json();
      console.log('Sucesso na gravação no D1:', resp);
    } else {
      console.error('Erro:', await postRes.text());
    }
  }
}

run().catch(console.error);
