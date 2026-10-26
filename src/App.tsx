import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { HojeView } from './components/views/HojeView';
import { ProspeccaoView } from './components/views/ProspeccaoView';
import { ProjetosView } from './components/views/ProjetosView';
import { FinanceiroView } from './components/views/FinanceiroView';
import { CarteiraView } from './components/views/CarteiraView';
import { RelatoriosView } from './components/views/RelatoriosView';
import { LeadModal } from './components/modals/LeadModal';
import { MigrationModal } from './components/modals/MigrationModal';
import { FechamentoVendaModal } from './components/modals/FechamentoVendaModal';
import { GerarPropostaModal } from './components/modals/GerarPropostaModal';
import { GerarBriefingModal } from './components/modals/GerarBriefingModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { PublicProposalView } from './components/public/PublicProposalView';
import { PublicBriefingView } from './components/public/PublicBriefingView';
import { exportLeadsToCsv } from './lib/csvMigration';
import type { 
  ClientLead, 
  Project, 
  EtapaProjeto, 
  TipoProjeto,
  Installment,
  MonthlyInvoice,
  MaintenanceRequest,
  Proposal,
  BriefingData
} from './types/crm';
import { DEFAULT_STATUSES } from './types/crm';

const LEADS_STORAGE_KEY = 'crm_yago_leads';
const PROJECTS_STORAGE_KEY = 'crm_yago_projects';
const INSTALLMENTS_STORAGE_KEY = 'crm_yago_installments';
const INVOICES_STORAGE_KEY = 'crm_yago_invoices';
const MAINTENANCE_STORAGE_KEY = 'crm_yago_maintenance';
const PROPOSALS_STORAGE_KEY = 'crm_yago_proposals';
const BRIEFINGS_STORAGE_KEY = 'crm_yago_briefings';

export function App() {
  const [currentView, setCurrentView] = useState('hoje');
  
  // Leads
  const [leads, setLeads] = useState<ClientLead[]>(() => {
    const saved = localStorage.getItem(LEADS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler do localStorage', e);
      }
    }
    return [];
  });

  // Projetos
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler projetos', e);
      }
    }
    return [];
  });

  // Parcelas de Implantação
  const [installments, setInstallments] = useState<Installment[]>(() => {
    const saved = localStorage.getItem(INSTALLMENTS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler parcelas', e);
      }
    }
    return [
      {
        id: 'inst-1',
        project_id: 'proj-1',
        cliente_nome: 'Dra. Camila Rocha Advocacia',
        descricao: '50% Entrada (Início)',
        valor: 900.0,
        vencimento: '2026-10-20',
        pago: true,
        pago_em: '2026-10-20'
      },
      {
        id: 'inst-2',
        project_id: 'proj-1',
        cliente_nome: 'Dra. Camila Rocha Advocacia',
        descricao: '50% Final (Na Entrega)',
        valor: 900.0,
        vencimento: '2026-11-05',
        pago: false
      }
    ];
  });

  // Mensalidades (Cobranças MRR)
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>(() => {
    const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler mensalidades', e);
      }
    }
    return [
      {
        id: 'inv-1',
        client_id: 'c-1',
        cliente_nome: 'Studio Letícia Vieira Estética',
        cliente_whatsapp: '11911300834',
        competencia: '2026-10',
        valor: 89.0,
        vencimento: '2026-10-25',
        pago: false
      },
      {
        id: 'inv-2',
        client_id: 'c-2',
        cliente_nome: 'Espaço Zen Massoterapia',
        cliente_whatsapp: '11977776666',
        competencia: '2026-10',
        valor: 79.0,
        vencimento: '2026-10-28',
        pago: true,
        pago_em: '2026-10-26'
      },
      {
        id: 'inv-3',
        client_id: 'c-3',
        cliente_nome: 'Clínica Sorriso Pleno',
        cliente_whatsapp: '11966665555',
        competencia: '2026-10',
        valor: 99.0,
        vencimento: '2026-10-30',
        pago: false
      }
    ];
  });

  // Pedidos de Manutenção
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(() => {
    const saved = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler manutenções', e);
      }
    }
    return [
      {
        id: 'req-1',
        client_id: 'c-1',
        titulo: 'Atualizar endereço da nova sala de atendimento no rodapé',
        status: 'aberto',
        created_at: '2026-10-24'
      }
    ];
  });

  // Propostas Públicas
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    const saved = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler propostas', e);
      }
    }
    return [];
  });

  // Briefings Públicos
  const [briefings, setBriefings] = useState<BriefingData[]>(() => {
    const saved = localStorage.getItem(BRIEFINGS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler briefings', e);
      }
    }
    return [];
  });

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ClientLead | null>(null);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [closingLead, setClosingLead] = useState<ClientLead | null>(null);
  const [selectedProposalLead, setSelectedProposalLead] = useState<ClientLead | null>(null);
  const [selectedBriefingProject, setSelectedBriefingProject] = useState<Project | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Atalhos Globais (Ctrl+K, N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingLead(null);
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Roteamento de páginas públicas
  const urlParams = new URLSearchParams(window.location.search);
  const pToken = urlParams.get('p') || (window.location.hash.startsWith('#p=') ? window.location.hash.replace('#p=', '') : null);
  const bToken = urlParams.get('b') || (window.location.hash.startsWith('#b=') ? window.location.hash.replace('#b=', '') : null);

  // Persistência
  useEffect(() => {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    if (!selectedLeadId && leads.length > 0) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(INSTALLMENTS_STORAGE_KEY, JSON.stringify(installments));
  }, [installments]);

  useEffect(() => {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(maintenanceRequests));
  }, [maintenanceRequests]);

  useEffect(() => {
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    localStorage.setItem(BRIEFINGS_STORAGE_KEY, JSON.stringify(briefings));
  }, [briefings]);

  const handleOpenWhatsApp = (lead: ClientLead) => {
    if (!lead.whatsapp) return;
    const cleanPhone = lead.whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const textEncoded = encodeURIComponent(lead.msg_a_mandar || '');
    const url = `https://wa.me/${phoneWithCountry}?text=${textEncoded}`;
    
    window.open(url, '_blank');

    const todayStr = new Date().toISOString().slice(0, 10);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);
    const nextDateStr = nextDate.toISOString().slice(0, 10);

    setLeads(prev => prev.map(l => {
      if (l.id === lead.id) {
        return {
          ...l,
          ultimo_contato: todayStr,
          proximo_followup: nextDateStr
        };
      }
      return l;
    }));
  };

  const handleMoveLeadStatus = (leadId: string, targetStatusId: string) => {
    if (targetStatusId === 'fechado') {
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead) {
        setClosingLead(targetLead);
        return;
      }
    }

    const statusCfg = DEFAULT_STATUSES.find(s => s.id === targetStatusId);
    const cadence = statusCfg ? statusCfg.cadenceDays : 2;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + cadence);
    const nextDateStr = cadence > 0 ? nextDate.toISOString().slice(0, 10) : undefined;

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status_id: targetStatusId,
          proximo_followup: nextDateStr,
          updated_at: new Date().toISOString().slice(0, 10)
        };
      }
      return l;
    }));
  };

  const handleConfirmVenda = (projectData: {
    tipo: TipoProjeto;
    implantacao: number;
    mensalidade: number;
    inicio: string;
    prazo: string;
    tasks: { id: string; titulo: string; feito: boolean }[];
  }) => {
    if (!closingLead) return;

    setLeads(prev => prev.map(l => {
      if (l.id === closingLead.id) {
        return {
          ...l,
          status_id: 'fechado',
          fase: 'projeto',
          implantacao: projectData.implantacao,
          mensalidade: projectData.mensalidade,
          updated_at: new Date().toISOString().slice(0, 10)
        };
      }
      return l;
    }));

    const newProjectId = `proj-${Date.now()}`;
    const newProject: Project = {
      id: newProjectId,
      client_id: closingLead.id,
      cliente_nome: closingLead.nome,
      cliente_whatsapp: closingLead.whatsapp,
      nicho: closingLead.nicho,
      tipo: projectData.tipo,
      etapa: 'Briefing & Conteúdo',
      inicio: projectData.inicio,
      prazo: projectData.prazo,
      implantacao: projectData.implantacao,
      mensalidade: projectData.mensalidade,
      tasks: projectData.tasks,
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10)
    };

    // Criar automaticamente parcelas de implantação 50/50
    const halfValue = projectData.implantacao / 2;
    const newInstallments: Installment[] = [
      {
        id: `inst-${Date.now()}-1`,
        project_id: newProjectId,
        cliente_nome: closingLead.nome,
        descricao: '50% Entrada (Início)',
        valor: halfValue,
        vencimento: projectData.inicio,
        pago: false
      },
      {
        id: `inst-${Date.now()}-2`,
        project_id: newProjectId,
        cliente_nome: closingLead.nome,
        descricao: '50% Final (Entrega do Site)',
        valor: halfValue,
        vencimento: projectData.prazo,
        pago: false
      }
    ];

    setProjects(prev => [newProject, ...prev]);
    setInstallments(prev => [...newInstallments, ...prev]);
    setClosingLead(null);
    setCurrentView('projetos');
  };

  const handleReagendar = (leadId: string, days: number) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    const nextDateStr = nextDate.toISOString().slice(0, 10);

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          proximo_followup: nextDateStr
        };
      }
      return l;
    }));
  };

  const handleRegistrarContato = (leadId: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          ultimo_contato: todayStr
        };
      }
      return l;
    }));
  };

  const handleSaveLead = (leadData: Partial<ClientLead>) => {
    if (editingLead && editingLead.id) {
      setLeads(prev => prev.map(l => {
        if (l.id === editingLead.id) {
          return {
            ...l,
            ...leadData,
            updated_at: new Date().toISOString().slice(0, 10)
          } as ClientLead;
        }
        return l;
      }));
    } else {
      const newLead: ClientLead = {
        id: Date.now().toString(),
        nome: leadData.nome || 'Novo Lead',
        nicho: leadData.nicho || 'Estética',
        whatsapp: leadData.whatsapp || '',
        instagram: leadData.instagram,
        google_url: leadData.google_url,
        site_atual: leadData.site_atual,
        presenca_digital: leadData.presenca_digital || 'Sem site',
        origem: leadData.origem || 'Google Maps',
        status_id: leadData.status_id || 'abordar',
        implantacao: leadData.implantacao || 1200,
        mensalidade: leadData.mensalidade || 89,
        msg_a_mandar: leadData.msg_a_mandar,
        observacoes: leadData.observacoes,
        followups_sem_resposta: 0,
        fase: 'prospeccao',
        created_at: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString().slice(0, 10)
      };
      setLeads(prev => [newLead, ...prev]);
      setSelectedLeadId(newLead.id);
    }
    setEditingLead(null);
  };

  const handleImportMigratedLeads = (migratedLeads: ClientLead[], replaceAll: boolean) => {
    if (replaceAll) {
      setLeads(migratedLeads);
      if (migratedLeads.length > 0) {
        setSelectedLeadId(migratedLeads[0].id);
      }
    } else {
      const existingPhones = new Set(leads.map(l => l.whatsapp?.replace(/\D/g, '')).filter(Boolean));
      const uniqueIncoming = migratedLeads.filter(l => {
        const p = l.whatsapp?.replace(/\D/g, '');
        return !p || !existingPhones.has(p);
      });
      setLeads(prev => [...prev, ...uniqueIncoming]);
    }
  };

  const handleClearAllLeads = () => {
    setLeads([]);
    setSelectedLeadId(null);
    localStorage.removeItem(LEADS_STORAGE_KEY);
  };

  const handleExportCsv = () => {
    if (leads.length === 0) {
      alert('Nenhum lead para exportar.');
      return;
    }
    const csvStr = exportLeadsToCsv(leads);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads-crm-yago-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funções de Projetos
  const handleMoveProjectStage = (projectId: string, newStage: EtapaProjeto) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        // Se foi para No ar / Entregue, transfere o lead para fase carteira e gera assinatura
        if (newStage === 'No ar / Entregue') {
          setLeads(leadsPrev => leadsPrev.map(l => {
            if (l.id === p.client_id) {
              return { ...l, fase: 'carteira' };
            }
            return l;
          }));

          // Se tiver mensalidade, adiciona cobrança inicial do mês
          if (p.mensalidade > 0) {
            const nextInvoice: MonthlyInvoice = {
              id: `inv-${Date.now()}`,
              client_id: p.client_id,
              cliente_nome: p.cliente_nome,
              cliente_whatsapp: p.cliente_whatsapp,
              competencia: new Date().toISOString().slice(0, 7),
              valor: p.mensalidade,
              vencimento: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
              pago: false
            };
            setInvoices(invs => [nextInvoice, ...invs]);
          }
        }

        return {
          ...p,
          etapa: newStage,
          entrega: newStage === 'No ar / Entregue' ? new Date().toISOString().slice(0, 10) : p.entrega,
          updated_at: new Date().toISOString().slice(0, 10)
        };
      }
      return p;
    }));
  };

  const handleToggleTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, feito: !t.feito } : t),
          updated_at: new Date().toISOString().slice(0, 10)
        };
      }
      return p;
    }));
  };

  const handleAddTask = (projectId: string, taskTitle: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newTask = {
          id: `task-${Date.now()}`,
          titulo: taskTitle,
          feito: false
        };
        return {
          ...p,
          tasks: [...(p.tasks || []), newTask],
          updated_at: new Date().toISOString().slice(0, 10)
        };
      }
      return p;
    }));
  };

  const handleUpdateProjectLinks = (projectId: string, links: { figma?: string; homologacao?: string; producao?: string }) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          link_figma: links.figma !== undefined ? links.figma : p.link_figma,
          link_homologacao: links.homologacao !== undefined ? links.homologacao : p.link_homologacao,
          link_producao: links.producao !== undefined ? links.producao : p.link_producao,
          updated_at: new Date().toISOString().slice(0, 10)
        };
      }
      return p;
    }));
  };

  // Funções Financeiro
  const handleToggleInstallment = (id: string) => {
    setInstallments(prev => prev.map(inst => {
      if (inst.id === id) {
        const nextPago = !inst.pago;
        return {
          ...inst,
          pago: nextPago,
          pago_em: nextPago ? new Date().toISOString().slice(0, 10) : undefined
        };
      }
      return inst;
    }));
  };

  const handleToggleInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const nextPago = !inv.pago;
        return {
          ...inv,
          pago: nextPago,
          pago_em: nextPago ? new Date().toISOString().slice(0, 10) : undefined
        };
      }
      return inv;
    }));
  };

  const handleSendCobrancaWhatsApp = (invoice: MonthlyInvoice) => {
    if (!invoice.cliente_whatsapp) {
      alert('Cliente sem WhatsApp cadastrado.');
      return;
    }
    const cleanPhone = invoice.cliente_whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const msg = `Olá ${invoice.cliente_nome}, tudo bem? Me chamo Yago Duarte. Passando para enviar o lembrete da mensalidade de hospedagem e manutenção do seu site referente ao mês de ${invoice.competencia} no valor de R$ ${invoice.valor.toFixed(2)}. Chave Pix: seu-pix@aqui. Qualquer dúvida, estou à disposição!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Funções Carteira
  const handleAddMaintenance = (clientId: string, titulo: string) => {
    const newReq: MaintenanceRequest = {
      id: `req-${Date.now()}`,
      client_id: clientId,
      titulo,
      status: 'aberto',
      created_at: new Date().toISOString().slice(0, 10)
    };
    setMaintenanceRequests(prev => [newReq, ...prev]);
  };

  const handleToggleMaintenance = (requestId: string) => {
    setMaintenanceRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: r.status === 'concluido' ? 'aberto' : 'concluido'
        };
      }
      return r;
    }));
  };

  const handleNovaVendaUpsell = (client: ClientLead) => {
    // Reabre o lead na prospecção para novo escopo
    setLeads(prev => prev.map(l => {
      if (l.id === client.id) {
        return {
          ...l,
          status_id: 'conversa',
          fase: 'prospeccao',
          msg_a_mandar: `Olá ${client.nome}, como está o desempenho do site? Estava pensando em uma novidade para aumentarmos ainda mais suas conversões!`
        };
      }
      return l;
    }));
    setCurrentView('prospeccao');
  };

  // Funções de Propostas e Briefings Públicos
  const handleSaveProposal = (proposal: Proposal) => {
    setProposals(prev => {
      const filtered = prev.filter(p => p.token !== proposal.token);
      return [proposal, ...filtered];
    });
  };

  const handleUpdateBriefing = (updated: BriefingData) => {
    setBriefings(prev => {
      const filtered = prev.filter(b => b.token !== updated.token);
      return [updated, ...filtered];
    });
  };

  // Se a rota for pública de proposta (/p/:token ou ?p=token)
  if (pToken) {
    const foundProposal = proposals.find(p => p.token === pToken) || {
      id: `prop-${pToken}`,
      token: pToken,
      lead_id: 'lead-demo',
      cliente_nome: 'Dra. Camila Rocha Advocacia',
      cliente_whatsapp: '11911300834',
      nicho: 'Advocacia',
      titulo_proposta: 'Landing Page de Alta Conversão para Dra. Camila Rocha',
      apresentacao: 'Apresentamos uma proposta completa para posicionar sua marca jurídica com máxima autoridade na web e atrair clientes qualificados diretamente para o seu WhatsApp.',
      itens: [
        { id: '1', titulo: 'Design Exclusivo no Figma', descricao: 'Layout sob medida criado para a sua identidade visual antes da programação.', incluso: true },
        { id: '2', titulo: 'Copywriting Jurídico Persuasivo', descricao: 'Textos orientados a conversão e estruturados para quebrar objeções do cliente.', incluso: true },
        { id: '3', titulo: 'Desenvolvimento Responsivo Ultra Rápido', descricao: 'Código limpo, seguro e com carregamento instantâneo em smartphones e PCs.', incluso: true },
        { id: '4', titulo: 'Botão Flutuante de WhatsApp Direto', descricao: 'Chamadas para ação integradas com mensagem de contato pré-formatada.', incluso: true },
        { id: '5', titulo: 'Otimização Técnica de SEO e Velocidade', descricao: 'Pontuação 90+ no Google PageSpeed para melhor posicionamento orgânico.', incluso: true },
        { id: '6', titulo: 'Instalação de Pixel Meta & Google Analytics', descricao: 'Tags configuradas para mensurar cliques e conversões de anúncios futuros.', incluso: true }
      ],
      prazo_dias: 7,
      implantacao: 1800,
      forma_pagamento_implantacao: '50% de entrada e 50% na aprovação final',
      mensalidade: 89,
      beneficios_mensalidade: [
        'Hospedagem ultra rápida Cloudflare + SSL grátis',
        'Suporte técnico direto no WhatsApp e pequenos ajustes mensais',
        'Backups diários e proteção ativa contra invasões'
      ],
      status: 'enviada',
      created_at: new Date().toISOString()
    };

    return <PublicProposalView proposal={foundProposal} />;
  }

  // Se a rota for pública de briefing (/b/:token ou ?b=token)
  if (bToken) {
    const foundBriefing = briefings.find(b => b.token === bToken) || {
      id: `brief-${bToken}`,
      token: bToken,
      lead_id: 'lead-demo',
      cliente_nome: 'Dra. Camila Rocha Advocacia',
      nome_empresa: 'Dra. Camila Rocha Advocacia',
      slogan_posicionamento: 'Especialista em Direito de Família e Sucessões',
      publico_alvo: '',
      servicos_principais: '',
      diferenciais: '',
      cores_preferidas: '',
      sites_referencia: '',
      whatsapp_atendimento: '11911300834',
      instagram: '',
      endereco_fisico: '',
      link_arquivos: '',
      observacoes_adicionais: '',
      preenchido: false,
      created_at: new Date().toISOString()
    };

    return <PublicBriefingView initialData={foundBriefing} onSaveBriefing={handleUpdateBriefing} />;
  }

  // Clientes na Carteira são os que têm fase 'carteira' ou projeto 'No ar'
  const carteiraClients = leads.filter(l => l.fase === 'carteira' || projects.some(p => p.client_id === l.id && p.etapa === 'No ar / Entregue'));

  const counts = {
    hoje: leads.filter(l => l.fase === 'prospeccao' && (l.proximo_followup || l.status_id === 'previa_enviada')).length,
    prospeccao: leads.filter(l => l.fase === 'prospeccao').length,
    projetos: projects.length,
    carteira: carteiraClients.length > 0 ? carteiraClients.length : 3
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans">
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        counts={counts}
        onNewLead={() => {
          setEditingLead(null);
          setIsModalOpen(true);
        }}
        onOpenMigration={() => setIsMigrationOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {currentView === 'hoje' && (
        <HojeView
          leads={leads}
          selectedLeadId={selectedLeadId}
          onSelectLead={setSelectedLeadId}
          onOpenWhatsApp={handleOpenWhatsApp}
          onReagendar={handleReagendar}
          onRegistrarContato={handleRegistrarContato}
          onMudarStatus={handleMoveLeadStatus}
          onOpenProposta={(lead) => setSelectedProposalLead(lead)}
        />
      )}

      {currentView === 'prospeccao' && (
        <ProspeccaoView
          leads={leads}
          onSelectLead={(lead) => {
            setEditingLead(lead);
            setIsModalOpen(true);
          }}
          onMoveLeadStatus={handleMoveLeadStatus}
          onOpenWhatsApp={handleOpenWhatsApp}
          onNewLead={() => {
            setEditingLead(null);
            setIsModalOpen(true);
          }}
          onNewLeadWithStatus={(statusId) => {
            setEditingLead({
              id: '',
              nome: '',
              nicho: 'Estética',
              whatsapp: '',
              presenca_digital: 'Sem site',
              origem: 'Google Maps',
              status_id: statusId,
              implantacao: 1200,
              mensalidade: 89,
              followups_sem_resposta: 0,
              fase: 'prospeccao',
              created_at: '',
              updated_at: ''
            });
            setIsModalOpen(true);
          }}
        />
      )}

      {currentView === 'projetos' && (
        <ProjetosView
          projects={projects}
          onMoveProjectStage={handleMoveProjectStage}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
          onUpdateProjectLinks={handleUpdateProjectLinks}
          onOpenBriefing={(project) => setSelectedBriefingProject(project)}
        />
      )}

      {currentView === 'financeiro' && (
        <FinanceiroView
          installments={installments}
          invoices={invoices}
          onToggleInstallment={handleToggleInstallment}
          onToggleInvoice={handleToggleInvoice}
          onSendCobrançaWhatsApp={handleSendCobrancaWhatsApp}
        />
      )}

      {currentView === 'carteira' && (
        <CarteiraView
          clients={carteiraClients.length > 0 ? carteiraClients : leads.slice(0, 4)}
          maintenanceRequests={maintenanceRequests}
          onAddMaintenance={handleAddMaintenance}
          onToggleMaintenance={handleToggleMaintenance}
          onNovaVenda={handleNovaVendaUpsell}
          onOpenWhatsApp={handleOpenWhatsApp}
        />
      )}

      {currentView === 'relatorios' && (
        <RelatoriosView
          leads={leads}
          projects={projects}
          invoices={invoices}
        />
      )}

      {currentView !== 'hoje' && currentView !== 'prospeccao' && currentView !== 'projetos' && currentView !== 'financeiro' && currentView !== 'carteira' && currentView !== 'relatorios' && (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <div className="text-base font-medium text-zinc-300">Tela {currentView.toUpperCase()}</div>
          <p className="text-xs text-zinc-500 mt-1">Será implementada nas próximas fases do plano.</p>
        </div>
      )}

      {/* Modal de Lead */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        initialLead={editingLead}
        existingLeads={leads}
      />

      {/* Modal de Fechamento de Venda */}
      <FechamentoVendaModal
        isOpen={!!closingLead}
        onClose={() => setClosingLead(null)}
        lead={closingLead}
        onConfirmVenda={handleConfirmVenda}
      />

      {/* Modal de Migração CSV */}
      <MigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        onImportLeads={handleImportMigratedLeads}
        onClearAllLeads={handleClearAllLeads}
        currentCount={leads.length}
      />

      {/* Modal de Gerar Proposta */}
      <GerarPropostaModal
        isOpen={!!selectedProposalLead}
        onClose={() => setSelectedProposalLead(null)}
        lead={selectedProposalLead}
        onSaveProposal={handleSaveProposal}
      />

      {/* Modal de Gerar Briefing */}
      {selectedBriefingProject && (
        <GerarBriefingModal
          isOpen={!!selectedBriefingProject}
          onClose={() => setSelectedBriefingProject(null)}
          clientName={selectedBriefingProject.cliente_nome}
          clientWhatsApp={selectedBriefingProject.cliente_whatsapp}
          briefing={
            briefings.find(b => b.project_id === selectedBriefingProject.id || b.token === `brief-${selectedBriefingProject.id}`) || {
              id: `brief-${selectedBriefingProject.id}`,
              token: `brief-${selectedBriefingProject.id}`,
              project_id: selectedBriefingProject.id,
              lead_id: selectedBriefingProject.client_id,
              cliente_nome: selectedBriefingProject.cliente_nome,
              nome_empresa: selectedBriefingProject.cliente_nome,
              slogan_posicionamento: '',
              publico_alvo: '',
              servicos_principais: '',
              diferenciais: '',
              cores_preferidas: '',
              sites_referencia: '',
              whatsapp_atendimento: selectedBriefingProject.cliente_whatsapp || '',
              instagram: '',
              endereco_fisico: '',
              link_arquivos: '',
              observacoes_adicionais: '',
              preenchido: false,
              created_at: new Date().toISOString()
            }
          }
          onUpdateBriefing={handleUpdateBriefing}
        />
      )}

      {/* Paleta de Comandos Global (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        leads={leads}
        projects={projects}
        onSelectLead={(lead) => {
          setSelectedLeadId(lead.id);
          setEditingLead(lead);
          setIsModalOpen(true);
        }}
        onSelectProject={() => {
          setCurrentView('projetos');
        }}
        onNavigateView={(view) => {
          setCurrentView(view);
        }}
        onNewLead={() => {
          setEditingLead(null);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}

export default App;
