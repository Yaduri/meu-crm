# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite (SPA) hospedado no Cloudflare Pages · API em Pages Functions com Hono · banco Cloudflare D1 (SQLite) · arquivos no R2 · login via Cloudflare Access (Zero Trust, e-mail OTP) · Worker separado com Cron Trigger para lembretes no Telegram. Tudo dentro do plano gratuito do Cloudflare. PWA instalável.

## Users

Um único usuário: Yago Duarte, desenvolvedor freelancer que vende landing pages, sites institucionais e sistemas web para pequenos negócios locais de vários nichos (estética, advocacia, massoterapia, dentistas, psicólogos etc.). Prospecta ativamente (Google Maps, Instagram, indicação), conversa pelo WhatsApp, envia prévias e propostas, e depois desenvolve e mantém os projetos fechados. Cobra implantação (valor único) e, conforme o escopo, mensalidade recorrente.

## Product Purpose

CRM pessoal que acompanha o ciclo inteiro de um cliente: prospecção → projeto em desenvolvimento → carteira de clientes ativos com mensalidade. Sucesso = nenhum follow-up esquecido, clareza de onde cada lead parou e por quê, prazos de projeto sob controle e recebimentos (implantação e mensalidades) sem atraso despercebido.

## Positioning

Feito sob medida para quem vende sites a negócios locais via WhatsApp: status que espelham o funil real (abordagem, prévia, proposta, motivos de perda específicos), cadência de follow-up automática, mensagens com variáveis prontas para wa.me, e o mesmo cadastro seguindo para produção e cobrança recorrente.

## Operating Context

- Manhã começa na tela "Hoje": fila de follow-ups atrasados/de hoje, prazos de projeto, cobranças vencendo.
- Desktop para prospecção em massa (Kanban/tabela); celular para executar a fila (WhatsApp, registrar contato, reagendar, marcar pagamento).
- Resumo diário às 8h no Telegram.
- Sistema anterior: `C:\Vercel\app-kanban` (Next.js + Supabase). Os dados serão migrados.

## Capabilities and Constraints

- Lead: nome, nicho, WhatsApp, Instagram, perfil Google, site atual, presença digital (Sem site · Só Instagram · Só Google Meu Negócio · Site desatualizado/lento · Site bom), origem, status, último contato, próximo follow-up, implantação R$, mensalidade R$, msg a mandar, link da prévia, link da proposta, observações.
- Status agrupados — Ativos: A abordar, Abordado (aguardando), Em conversa, Pediu valor, Prévia em produção, Prévia enviada, Proposta enviada, Negociação. Pausado: Retomar depois. Encerrados: Sem resposta na abordagem, Parou de responder, Sem resposta após prévia, Sem resposta após proposta, Recusou – preço, Recusou – já tem site/fornecedor, Recusou – sem interesse, Recusou – outro. Ganho: Fechado. Lista editável.
- Histórico de interações por cliente; cadência sugerida por status; sugestão de encerrar após N follow-ups sem resposta.
- Fechado → cria Projeto (puxa implantação/mensalidade). Projeto "No ar" → cliente entra na Carteira. Um cliente pode ter vários projetos.
- Financeiro: parcelas de implantação, mensalidades geradas por mês, marcação de pagamento em 1 clique, lembrete de cobrança via WhatsApp.
- Entrada de leads: manual e importação CSV. A API externa/scraper do sistema antigo NÃO será mantida.
- Páginas públicas (proposta e briefing) ficam fora do Cloudflare Access.
- Limites gratuitos relevantes: D1 5 GB / 5M leituras e 100k escritas por dia; Pages Functions 100k req/dia; R2 10 GB; Access até 50 usuários.

## Evidence on Hand

- Dados reais no Supabase do sistema antigo (tabela `leads`), esquema em `C:\Vercel\app-kanban\supabase\leads.sql`.
- Não há depoimentos, logo ou identidade visual definida para o novo CRM; não inventar.

## Product Principles

1. A fila do dia manda: o sistema sempre responde "com quem eu falo agora e o que eu mando".
2. Ações frequentes em 1–2 cliques: abrir WhatsApp, registrar contato, reagendar, mudar status, marcar pago.
3. Todo encerramento tem motivo; todo lead ativo tem próximo passo.
4. Um cliente, uma história: prospecção, projeto e cobrança no mesmo cadastro.
5. Nada se perde: histórico, confirmação em ações destrutivas, backup exportável.
