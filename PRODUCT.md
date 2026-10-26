# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um único usuário principal: Yago Duarte (`yaduri16@gmail.com`), desenvolvedor e designer freelancer que vende landing pages, sites institucionais e sistemas web para pequenos negócios locais de múltiplos nichos (estética, advocacia, massoterapia, dentistas, psicólogos, clínicas etc.). Prospecta ativamente (Google Maps, Instagram, indicação), conversa pelo WhatsApp, envia prévias e propostas interativas, e depois desenvolve e mantém os projetos fechados. Cobra implantação (valor único, 50/50) e mensalidade recorrente (MRR de hospedagem e manutenção).
Usuários secundários (externos): clientes em negociação ou em início de projeto que acessam apenas os links públicos exclusivos de Proposta (`/p/:token`) e Briefing (`/b/:token`).

## Product Purpose

CRM pessoal de operação diária que acompanha o ciclo inteiro de um cliente: prospecção → fechamento de venda → projeto em desenvolvimento → carteira de clientes ativos com mensalidade recorrente. Sucesso = nenhum follow-up esquecido na fila diária, clareza total de onde cada lead parou e por quê, prazos de projeto sob controle e recebimentos (implantação e mensalidades MRR) sem atraso despercebido.

## Positioning

Feito sob medida para quem vende sites a negócios locais via WhatsApp: status que espelham o funil real (abordagem, prévia, proposta, motivos de perda específicos), filtros inteligentes por pílulas e ordenação multi-coluna, cadência de follow-up automática, mensagens com variáveis prontas para `wa.me`, gerador de propostas e briefings públicos sem login para o cliente, e o mesmo cadastro seguindo para produção e cobrança recorrente com chave Pix integrada.

## Operating Context

- Manhã começa na tela **Hoje**: fila de follow-ups atrasados e do dia, KPIs reais de projetos ativos e valores a receber no mês, edição rápida e disparo no WhatsApp com 1 clique.
- Desktop para prospecção em massa (**Prospecção** em Kanban drag-and-drop ou Tabela ordenável com filtros rápidos); celular ou desktop para executar a fila diária.
- Resumo matinal automático todo dia às 08:00 (horário de Brasília) no Telegram via Cron Trigger (`0 11 * * *`) lendo direto do banco Cloudflare D1.
- Dois domínios em produção no mesmo Cloudflare Worker (`meu-crm`):
  - `https://crm.yagoduarte.com.br` — Painel administrativo privado, protegido pelo Cloudflare Access (Zero Trust OTP exclusivo para `yaduri16@gmail.com`).
  - `https://propostas.yagoduarte.com.br` — Portal público restrito exclusivamente às rotas de clientes (`/p/:token` para propostas e `/b/:token` para briefings, bloqueando qualquer acesso ao painel).

## Capabilities and Constraints

- **Lead:** nome, nicho, WhatsApp, Instagram, perfil Google, site atual, presença digital (`Sem site`, `Só Instagram`, `Só Google Meu Negócio`, `Site desatualizado/lento`, `Site bom`), origem, status, último contato, próximo follow-up, implantação R$, mensalidade R$, msg a mandar, link da prévia, link da proposta, observações.
- **Status agrupados:**
  - *Ativos:* A abordar, Abordado (aguardando), Em conversa, Pediu valor, Prévia em produção, Prévia enviada, Proposta enviada, Negociação.
  - *Pausado:* Retomar depois.
  - *Encerrados:* Sem resposta na abordagem, Parou de responder, Sem resposta após prévia, Sem resposta após proposta, Recusou – preço, Recusou – já tem site/fornecedor, Recusou – sem interesse, Recusou – outro.
  - *Ganho:* Fechado.
- **Fluxo de Conversão:** Mover para `Fechado` abre o modal de Fechamento de Venda → cria o Projeto na esteira de **Projetos** (com checklist padrão e links de Figma/Homologação/Produção) e gera automaticamente as 2 parcelas 50/50 na aba **Financeiro**.
- **Entrega e Recorrência:** Marcar projeto como `No ar / Entregue` transfere o cliente para a **Carteira** (gestão de pedidos de manutenção e upsell de nova venda) e gera a fatura mensal de hospedagem/suporte no **Financeiro** (com lembrete de cobrança via WhatsApp + chave Pix em 1 clique).
- **Configurações e Backup:** Configuração de Chave Pix, WhatsApp comercial, valores padrão de implantação/mensalidade, central de arquivos na nuvem (`/api/upload` e `/api/files/:key`) e exportação/importação de backup completo (`.JSON` e `.CSV`).
- **Infraestrutura 100% no Plano Gratuito Cloudflare:** Cloudflare Workers Static Assets + Hono API (`worker/index.ts`), banco SQLite distribuído Cloudflare D1 (`meu-crm-db`), armazenamento de arquivos na nuvem, Cloudflare Access e Cron Trigger diário.

## Brand Commitments

- **Marca:** Yago Duarte — Desenvolvimento Web & Design Estratégico.
- **Ativos oficiais integrados em `public/`:** `/logo-yd-symbol.png`, `/logo-yd-horizontal.png`, `/logo-dark.png`, `/favicon-32x32.png`, `/favicon-16x16.png`, `/apple-touch-icon.png` e `/favicon.ico`.

## Evidence on Hand

- **Base real migrada e ativa:** 306 leads reais importados do sistema anterior em `src/data/initialLeads.json` e gravados na tabela `leads` do banco remoto Cloudflare D1 (`meu-crm-db`, ID `ba62e791-a637-41c2-883c-07078f80018a`), sem nenhum cliente fictício de teste.

## Product Principles

1. **A fila do dia manda:** o sistema sempre responde imediatamente "com quem eu falo agora e o que eu mando".
2. **Ações frequentes em 1–2 cliques:** abrir WhatsApp, registrar contato, reagendar, mudar status, gerar proposta/briefing e cobrar mensalidade com Pix.
3. **Todo encerramento tem motivo; todo lead ativo tem próximo passo.**
4. **Um cliente, uma história:** prospecção, proposta, briefing, projeto e cobrança recorrente conectados no mesmo fluxo.
5. **Nada se perde:** sincronização automática em nuvem no Cloudflare D1 entre dispositivos, confirmação em ações destrutivas e backups completos exportáveis em CSV e JSON.
