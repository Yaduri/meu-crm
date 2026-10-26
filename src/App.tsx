import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { HojeView } from './components/views/HojeView';
import { ProspeccaoView } from './components/views/ProspeccaoView';
import { ProjetosView } from './components/views/ProjetosView';
import { FinanceiroView } from './components/views/FinanceiroView';
import { CarteiraView } from './components/views/CarteiraView';
import { RelatoriosView } from './components/views/RelatoriosView';
import { ConfiguracoesView, DEFAULT_CRM_SETTINGS } from './components/views/ConfiguracoesView';
import type { CrmSettings } from './components/views/ConfiguracoesView';
import { LeadModal } from './components/modals/LeadModal';
import { MigrationModal } from './components/modals/MigrationModal';
import { FechamentoVendaModal } from './components/modals/FechamentoVendaModal';
import { GerarPropostaModal } from './components/modals/GerarPropostaModal';
import { GerarBriefingModal } from './components/modals/GerarBriefingModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { PublicProposalView } from './components/public/PublicProposalView';
import { PublicBriefingView } from './components/public/PublicBriefingView';
import { exportLeadsToCsv } from './lib/csvMigration';
import initialRealLeads from './data/initialLeads.json';
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
const SETTINGS_STORAGE_KEY = 'crm_yago_settings';

export function App() {
  const [currentView, setCurrentView] = useState('hoje');

  // Configurações Gerais do Sistema
  const [settings, setSettings] = useState<CrmSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_CRM_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Erro ao ler configurações', e);
      }
    }
    return DEFAULT_CRM_SETTINGS;
  });
  
  // Leads (Inicia com os 306 leads reais do backup se não houver dados salvos)
  const [leads, setLeads] = useState<ClientLead[]>(() => {
    const saved = localStorage.getItem(LEADS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Garante remoção de leads de teste antigos caso existam
          const cleaned = parsed.filter((l: ClientLead) => !l.nome.includes('Camila Rocha') && !l.nome.includes('Letícia Vieira'));
          if (cleaned.length > 0) return cleaned;
        }
      } catch (e) {
        console.error('Erro ao ler do localStorage', e);
      }
    }
    return initialRealLeads as ClientLead[];
  });

  // Projetos (Apenas projetos reais criados ao fechar vendas)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: Project) => !p.cliente_nome.includes('Camila Rocha'));
        }
      } catch (e) {
        console.error('Erro ao ler projetos', e);
      }
    }
    return [];
  });

  // Parcelas de Implantação (Apenas parcelas reais de vendas)
  const [installments, setInstallments] = useState<Installment[]>(() => {
    const saved = localStorage.getItem(INSTALLMENTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((inst: Installment) => !inst.cliente_nome.includes('Camila Rocha'));
        }
      } catch (e) {
        console.error('Erro ao ler parcelas', e);
      }
    }
    return [];
  });

  // Mensalidades (Cobranças MRR de clientes reais)
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>(() => {
    const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((inv: MonthlyInvoice) => 
            !inv.cliente_nome.includes('Leticia') && 
            !inv.cliente_nome.includes('Letícia') &&
            !inv.cliente_nome.includes('Zen') &&
            !inv.cliente_nome.includes('Sorriso')
          );
        }
      } catch (e) {
        console.error('Erro ao ler mensalidades', e);
      }
    }
    return [];
  });

  // Pedidos de Manutenção
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(() => {
    const saved = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m: MaintenanceRequest) => m.client_id !== 'c-1');
        }
      } catch (e) {
        console.error('Erro ao ler manutenções', e);
      }
    }
    return [];
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

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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
        implantacao: leadData.implantacao || settings.implantacaoPadrao || 1200,
        mensalidade: leadData.mensalidade || settings.mensalidadePadrao || 89,
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

  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
    }
  };

  const handleExportFullBackup = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      leads,
      projects,
      installments,
      invoices,
      maintenanceRequests,
      proposals,
      briefings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backup-completo-crm-yago-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFullBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.leads && Array.isArray(parsed.leads)) setLeads(parsed.leads);
        if (parsed.projects && Array.isArray(parsed.projects)) setProjects(parsed.projects);
        if (parsed.installments && Array.isArray(parsed.installments)) setInstallments(parsed.installments);
        if (parsed.invoices && Array.isArray(parsed.invoices)) setInvoices(parsed.invoices);
        if (parsed.maintenanceRequests && Array.isArray(parsed.maintenanceRequests)) setMaintenanceRequests(parsed.maintenanceRequests);
        if (parsed.proposals && Array.isArray(parsed.proposals)) setProposals(parsed.proposals);
        if (parsed.briefings && Array.isArray(parsed.briefings)) setBriefings(parsed.briefings);
        if (parsed.settings) setSettings({ ...DEFAULT_CRM_SETTINGS, ...parsed.settings });
        alert('Backup completo restaurado com sucesso!');
      } catch {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file, 'utf-8');
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
    const pixInfo = settings.chavePix ? ` Chave Pix: ${settings.chavePix}.` : '';
    const msg = `Olá ${invoice.cliente_nome}, tudo bem? Me chamo ${settings.nomeProfissional || 'Yago Duarte'}. Passando para enviar o lembrete da mensalidade de hospedagem e manutenção do seu site referente ao mês de ${invoice.competencia} no valor de R$ ${invoice.valor.toFixed(2)}.${pixInfo} Qualquer dúvida, estou à disposição!`;
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
    const matchedLead = leads.find(l => pToken === `prop-${l.id}` || l.id === pToken) || leads[0];
    const clientName = urlParams.get('c') || (matchedLead ? matchedLead.nome : 'Cliente');
    const clientNicho = urlParams.get('n') || (matchedLead ? matchedLead.nicho : 'Negócios');
    const customImplantacao = urlParams.get('v') ? Number(urlParams.get('v')) : (matchedLead?.implantacao || 1200);
    const customMensalidade = urlParams.get('m') ? Number(urlParams.get('m')) : (matchedLead?.mensalidade || 89);
    const customPrazo = urlParams.get('d') ? Number(urlParams.get('d')) : 7;

    const foundProposal = proposals.find(p => p.token === pToken) || {
      id: `prop-${pToken}`,
      token: pToken,
      lead_id: matchedLead?.id || 'lead-1',
      cliente_nome: clientName,
      cliente_whatsapp: matchedLead?.whatsapp || '11911300834',
      nicho: clientNicho,
      titulo_proposta: `Landing Page de Alta Conversão para ${clientName}`,
      apresentacao: `Apresentamos uma proposta completa para posicionar a marca ${clientName} com máxima autoridade na web e atrair clientes qualificados diretamente para o seu WhatsApp.`,
      itens: [
        { id: '1', titulo: 'Design Exclusivo no Figma', descricao: 'Layout sob medida criado para a sua identidade visual antes da programação.', incluso: true },
        { id: '2', titulo: 'Copywriting Estratégico Persuasivo', descricao: 'Textos orientados a conversão e estruturados para quebrar objeções do cliente.', incluso: true },
        { id: '3', titulo: 'Desenvolvimento Responsivo Ultra Rápido', descricao: 'Código limpo, seguro e com carregamento instantâneo em smartphones e PCs.', incluso: true },
        { id: '4', titulo: 'Botão Flutuante de WhatsApp Direto', descricao: 'Chamadas para ação integradas com mensagem de contato pré-formatada.', incluso: true },
        { id: '5', titulo: 'Otimização Técnica de SEO e Velocidade', descricao: 'Pontuação 90+ no Google PageSpeed para melhor posicionamento orgânico.', incluso: true },
        { id: '6', titulo: 'Instalação de Pixel Meta & Google Analytics', descricao: 'Tags configuradas para mensurar cliques e conversões de anúncios futuros.', incluso: true }
      ],
      prazo_dias: customPrazo,
      implantacao: customImplantacao,
      forma_pagamento_implantacao: '50% de entrada e 50% na aprovação final',
      mensalidade: customMensalidade,
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
    const firstLead = leads[0];
    const clientName = firstLead ? firstLead.nome : 'Cliente';
    const foundBriefing = briefings.find(b => b.token === bToken) || {
      id: `brief-${bToken}`,
      token: bToken,
      lead_id: firstLead?.id || 'lead-1',
      cliente_nome: clientName,
      nome_empresa: clientName,
      slogan_posicionamento: '',
      publico_alvo: '',
      servicos_principais: '',
      diferenciais: '',
      cores_preferidas: '',
      sites_referencia: '',
      whatsapp_atendimento: firstLead?.whatsapp || '11911300834',
      instagram: firstLead?.instagram || '',
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
    carteira: carteiraClients.length
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
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {currentView === 'hoje' && (
        <HojeView
          leads={leads}
          projects={projects}
          invoices={invoices}
          installments={installments}
          selectedLeadId={selectedLeadId}
          onSelectLead={setSelectedLeadId}
          onOpenWhatsApp={handleOpenWhatsApp}
          onReagendar={handleReagendar}
          onRegistrarContato={handleRegistrarContato}
          onMudarStatus={handleMoveLeadStatus}
          onOpenProposta={(lead) => setSelectedProposalLead(lead)}
          onEditLead={(lead) => {
            setEditingLead(lead);
            setIsModalOpen(true);
          }}
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
          clients={carteiraClients}
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

      {currentView === 'configuracoes' && (
        <ConfiguracoesView
          settings={settings}
          onSaveSettings={setSettings}
          onExportFullBackup={handleExportFullBackup}
          onImportFullBackup={handleImportFullBackup}
          counts={{
            leads: leads.length,
            projects: projects.length,
            invoices: invoices.length,
            installments: installments.length,
          }}
        />
      )}

      {/* Modal de Lead */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        onDelete={handleDeleteLead}
        onOpenProposta={(lead) => setSelectedProposalLead(lead)}
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
