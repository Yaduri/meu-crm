import React, { useState } from 'react';
import type { ClientLead, Project, MonthlyInvoice } from '../../types/crm';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Bot, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface RelatoriosViewProps {
  leads: ClientLead[];
  projects: Project[];
  invoices: MonthlyInvoice[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  leads,
  projects,
  invoices
}) => {
  const [telegramChatId, setTelegramChatId] = useState(() => {
    return localStorage.getItem('crm_telegram_chat_id') || '';
  });
  const [telegramBotToken, setTelegramBotToken] = useState(() => {
    return localStorage.getItem('crm_telegram_bot_token') || '';
  });
  const [telegramSending, setTelegramSending] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  // Métricas do Funil
  const totalLeads = leads.length;
  const fechados = leads.filter(l => l.status_id === 'fechado' || l.fase === 'carteira').length;
  const negociacao = leads.filter(l => l.status_id === 'negociacao' || l.status_id === 'proposta_enviada').length;
  const abordados = leads.filter(l => l.status_id === 'abordado' || l.status_id === 'conversa' || l.status_id === 'previa_enviada').length;
  const aAbordar = leads.filter(l => l.status_id === 'abordar').length;
  const perdidos = leads.filter(l => l.status_id.startsWith('recusou') || l.status_id.startsWith('sem_resp')).length;

  const taxaConversao = totalLeads > 0 ? ((fechados / totalLeads) * 100).toFixed(1) : '0';

  // Faturamento
  const totalMRR = invoices.reduce((acc, inv) => acc + inv.valor, 0);
  const faturamentoFechado = leads
    .filter(l => l.status_id === 'fechado' || l.fase === 'carteira')
    .reduce((acc, l) => acc + (l.implantacao || 0), 0);
  const faturamentoEmPotencial = leads
    .filter(l => l.status_id === 'negociacao' || l.status_id === 'proposta_enviada')
    .reduce((acc, l) => acc + (l.implantacao || 0), 0);

  // Distribuição por Nicho
  const nichosMap: Record<string, number> = {};
  leads.forEach(l => {
    nichosMap[l.nicho] = (nichosMap[l.nicho] || 0) + 1;
  });
  const nichosOrdenados = Object.entries(nichosMap).sort((a, b) => b[1] - a[1]);

  // Função para testar disparo do Telegram
  const handleTestTelegram = async () => {
    if (!telegramChatId.trim()) {
      alert('Por favor, informe seu Chat ID do Telegram. Você pode descobrir seu Chat ID enviando uma mensagem no Telegram para @userinfobot ou iniciando conversa com seu bot.');
      return;
    }

    if (!telegramBotToken.trim()) {
      alert('Por favor, informe o Token HTTP do seu Bot do Telegram gerado no @BotFather.');
      return;
    }

    localStorage.setItem('crm_telegram_chat_id', telegramChatId.trim());
    localStorage.setItem('crm_telegram_bot_token', telegramBotToken.trim());
    setTelegramSending(true);
    setTelegramStatus(null);

    const token = telegramBotToken.trim();
    const followupsHoje = leads.filter(l => l.proximo_followup === new Date().toISOString().slice(0, 10)).length;
    const projetosAndamento = projects.filter(p => p.etapa !== 'No ar / Entregue').length;

    const texto = `☀️ *Bom dia, Yago Duarte! Resumo do CRM:*\n\n` +
      `📋 *Follow-ups para hoje:* ${followupsHoje} contatos pendentes\n` +
      `🚀 *Projetos em desenvolvimento:* ${projetosAndamento} sites na esteira\n` +
      `💰 *MRR Ativo (Hospedagem):* R$ ${totalMRR.toFixed(2)}/mês\n` +
      `🎯 *Pipeline:* ${negociacao} propostas quentes em negociação\n\n` +
      `👉 Acesse seu painel: https://crm.yagoduarte.com.br`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId.trim(),
          text: texto,
          parse_mode: 'Markdown'
        })
      });

      const data = await res.json();
      if (data.ok) {
        setTelegramStatus('✓ Resumo diário enviado com sucesso para seu Telegram!');
      } else {
        setTelegramStatus(`Erro ao enviar: ${data.description}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão';
      setTelegramStatus(`Erro de rede: ${msg}`);
    } finally {
      setTelegramSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-8 py-5 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-400" />
            <span>Relatórios & Inteligência de Negócio</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Métricas de conversão, faturamento por nicho e automação diária do bot do Telegram.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Top KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4.5 bg-[#121215] border border-[#27272a] rounded-2xl">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Total de Leads na Base</span>
              <Target size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
              {totalLeads}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Leads cadastrados/importados</div>
          </div>

          <div className="p-4.5 bg-[#121215] border border-emerald-500/30 rounded-2xl">
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>Taxa de Conversão</span>
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {taxaConversao}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">{fechados} vendas fechadas</div>
          </div>

          <div className="p-4.5 bg-[#121215] border border-[#27272a] rounded-2xl">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Faturamento Fechado</span>
              <DollarSign size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
              R$ {faturamentoFechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Em implantações concluídas</div>
          </div>

          <div className="p-4.5 bg-[#121215] border border-sky-500/30 rounded-2xl">
            <div className="flex items-center justify-between text-[11px] text-sky-400 font-semibold">
              <span>Pipeline em Negociação</span>
              <Sparkles size={14} className="text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-sky-300 mt-1">
              R$ {faturamentoEmPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">{negociacao} propostas ativas</div>
          </div>
        </div>

        {/* Funil Visual de Conversão */}
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
          <div className="text-sm font-bold text-zinc-100 mb-4 flex items-center justify-between">
            <span>Funil de Conversão Comercial</span>
            <span className="text-xs font-normal text-zinc-400">Distribuição por etapa</span>
          </div>

          <div className="grid grid-cols-5 gap-3 text-center">
            <div className="p-4 bg-[#18181b] rounded-xl border border-zinc-800">
              <div className="text-[11px] text-zinc-400 font-medium">A Abordar</div>
              <div className="text-xl font-bold font-mono text-zinc-200 mt-1">{aAbordar}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Novos contatos</div>
            </div>

            <div className="p-4 bg-[#18181b] rounded-xl border border-zinc-800">
              <div className="text-[11px] text-zinc-400 font-medium">Em Contato / Prévia</div>
              <div className="text-xl font-bold font-mono text-zinc-200 mt-1">{abordados}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Aguardando retorno</div>
            </div>

            <div className="p-4 bg-[#18181b] rounded-xl border border-amber-500/20">
              <div className="text-[11px] text-amber-400 font-medium">Negociação Ativa</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">{negociacao}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Proposta enviada</div>
            </div>

            <div className="p-4 bg-[#18181b] rounded-xl border border-emerald-500/30">
              <div className="text-[11px] text-emerald-400 font-medium">Fechados (Ganhos)</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{fechados}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Clientes na carteira</div>
            </div>

            <div className="p-4 bg-[#18181b] rounded-xl border border-rose-500/20">
              <div className="text-[11px] text-rose-400 font-medium">Perdidos / Recusados</div>
              <div className="text-xl font-bold font-mono text-rose-300 mt-1">{perdidos}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Sem interesse / preço</div>
            </div>
          </div>
        </div>

        {/* Linha 2: Nichos + Telegram Automation */}
        <div className="grid grid-cols-2 gap-6">
          {/* Nichos com mais leads */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-100 mb-4">Volume de Leads por Nicho</h3>
            <div className="space-y-3">
              {nichosOrdenados.slice(0, 6).map(([nicho, count]) => {
                const percent = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                return (
                  <div key={nicho} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{nicho}</span>
                      <span className="font-mono text-zinc-400">{count} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automação Telegram */}
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Bot do Telegram (@YagoCRMbot)</h3>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Conectado à API Oficial do Telegram</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mt-2 mb-4">
                Receba todo dia às 08:00 o resumo dos contatos agendados para o dia, projetos em andamento e mensalidades a vencer direto no seu Telegram.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-zinc-300 font-medium mb-1">Token HTTP do Bot Telegram:</label>
                  <input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="Cole o token do @BotFather aqui..."
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    🔒 Salvo de forma segura e privada apenas no armazenamento local do seu navegador.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-300 font-medium mb-1">Seu Chat ID do Telegram:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="Ex: 123456789"
                      className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                    <button
                      onClick={handleTestTelegram}
                      disabled={telegramSending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      <Send size={13} />
                      <span>{telegramSending ? 'Enviando...' : 'Testar Agora'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal mt-1">
                    💡 Para descobrir seu Chat ID: abra o Telegram, mande <code>/start</code> para o bot <strong>@userinfobot</strong> ou procure seu ID e cole aqui.
                  </p>
                </div>
              </div>
            </div>

            {telegramStatus && (
              <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                telegramStatus.startsWith('✓') 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {telegramStatus.startsWith('✓') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{telegramStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};