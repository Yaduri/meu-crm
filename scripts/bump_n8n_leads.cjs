async function run() {
  const res = await fetch('https://meu-crm.yaduri16.workers.dev/api/state');
  const data = await res.json();
  const leads = data.state?.leads || [];

  const n8nLeads = leads.filter(l => Boolean(l.enviado_n8n));
  console.log(`Found ${n8nLeads.length} leads with enviado_n8n = true`);

  const nowIso = new Date().toISOString();
  const updated = n8nLeads.map(l => ({
    ...l,
    updated_at: nowIso
  }));

  console.log(`Updating ${updated.length} leads with new updated_at (${nowIso})...`);

  const postRes = await fetch('https://meu-crm.yaduri16.workers.dev/api/leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads: updated })
  });

  if (postRes.ok) {
    const postData = await postRes.json();
    console.log('Sucesso:', postData);
  } else {
    console.error('Erro:', await postRes.text());
  }
}

run().catch(console.error);
