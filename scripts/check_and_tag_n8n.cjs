async function run() {
  const res = await fetch('https://meu-crm.yaduri16.workers.dev/api/state');
  const data = await res.json();
  const leads = data.state?.leads || [];
  console.log(`Total leads in production: ${leads.length}`);

  const n8nLeads = [];
  for (const l of leads) {
    const obs = (l.observacoes || '').toLowerCase();
    const isN8N = obs.includes('n8n') || l.enviado_n8n === true;
    if (isN8N) {
      n8nLeads.push(l);
    }
  }

  console.log(`Leads identified with N8N activity: ${n8nLeads.length}`);
  for (const l of n8nLeads.slice(0, 10)) {
    console.log(`- [${l.id}] ${l.nome} | status: ${l.status_id} | enviado_n8n: ${l.enviado_n8n}`);
  }

  const needTagging = n8nLeads.filter(l => !l.enviado_n8n);
  console.log(`Leads needing enviado_n8n = true: ${needTagging.length}`);

  if (needTagging.length > 0) {
    const updated = needTagging.map(l => ({
      ...l,
      enviado_n8n: true,
      data_envio_n8n: l.data_envio_n8n || l.ultimo_contato || l.updated_at || new Date().toISOString()
    }));

    const batchRes = await fetch('https://meu-crm.yaduri16.workers.dev/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: updated })
    });

    if (batchRes.ok) {
      console.log(`Sucesso! ${needTagging.length} leads atualizados com enviado_n8n = true no D1.`);
    } else {
      console.error('Erro ao atualizar leads:', await batchRes.text());
    }
  }
}

run().catch(console.error);
