import { useState, useEffect, lazy, Suspense } from 'react';
import { Menu, Plus, Search } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { HojeView } from './components/views/HojeView';
import { LeadModal } from './components/modals/LeadModal';
import { exportLeadsToCsv } from './lib/csvMigration';

const ProspeccaoView = lazy(() => import('./components/views/ProspeccaoView').then(m => ({ default: m.ProspeccaoView })));
const ProjetosView = lazy(() => import('./components/views/ProjetosView').then(m => ({ default: m.ProjetosView })));
const FinanceiroView = lazy(() => import('./components/views/FinanceiroView').then(m => ({ default: m.FinanceiroView })));
const CarteiraView = lazy(() => import('./components/views/CarteiraView').then(m => ({ default: m.CarteiraView })));
const RelatoriosView = lazy(() => import('./components/views/RelatoriosView').then(m => ({ default: m.RelatoriosView })));
const ConfiguracoesView = lazy(() => import('./components/views/ConfiguracoesView').then(m => ({ default: m.ConfiguracoesView })));

const MigrationModal = lazy(() => import('./components/modals/MigrationModal').then(m => ({ default: m.MigrationModal })));
const FechamentoVendaModal = lazy(() => import('./components/modals/FechamentoVendaModal').then(m => ({ default: m.FechamentoVendaModal })));
const GerarPropostaModal = lazy(() => import('./components/modals/GerarPropostaModal').then(m => ({ default: m.GerarPropostaModal })));
const GerarBriefingModal = lazy(() => import('./components/modals/GerarBriefingModal').then(m => ({ default: m.GerarBriefingModal })));
const CommandPaletteModal = lazy(() => import('./components/modals/CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })));
const PublicProposalView = lazy(() => import('./components/public/PublicProposalView').then(m => ({ default: m.PublicProposalView })));
const PublicBriefingView = lazy(() => import('./components/public/PublicBriefingView').then(m => ({ default: m.PublicBriefingView })));
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
  BriefingData,
  CrmSettings
} from './types/crm';
import { DEFAULT_STATUSES, DEFAULT_CRM_SETTINGS, isLeadActiveForFollowup } from './types/crm';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Atalhos Globais (Ctrl+K, N, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsModalOpen(false);
        setEditingLead(null);
        setClosingLead(null);
        setIsMigrationOpen(false);
        setSelectedProposalLead(null);
        setSelectedBriefingProject(null);
        setIsMobileMenuOpen(false);
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

  // Roteamento de páginas públicas (/p/:token, /b/:token, ?p=token, ?b=token)
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const pathPToken = pathParts[0] === 'p' && pathParts[1] ? pathParts[1] : null;
  const pathBToken = pathParts[0] === 'b' && pathParts[1] ? pathParts[1] : null;

  const pToken = pathPToken || urlParams.get('p') || (window.location.hash.startsWith('#p=') ? window.location.hash.replace('#p=', '') : null);
  const bToken = pathBToken || urlParams.get('b') || (window.location.hash.startsWith('#b=') ? window.location.hash.replace('#b=', '') : null);

  // Persistência Local + Sincronização Automática em Nuvem (Cloudflare D1)
  const [d1Hydrated, setD1Hydrated] = useState(false);

  useEffect(() => {
    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.hasData && data.state) {
          if (Array.isArray(data.state.leads) && data.state.leads.length > 0) setLeads(data.state.leads);
          if (Array.isArray(data.state.projects)) setProjects(data.state.projects);
          if (Array.isArray(data.state.installments)) setInstallments(data.state.installments);
          if (Array.isArray(data.state.invoices)) setInvoices(data.state.invoices);
          if (Array.isArray(data.state.maintenanceRequests)) setMaintenanceRequests(data.state.maintenanceRequests);
          if (Array.isArray(data.state.proposals)) setProposals(data.state.proposals);
          if (Array.isArray(data.state.briefings)) setBriefings(data.state.briefings);
          if (data.state.settings) setSettings(prev => ({ ...prev, ...data.state.settings }));
        }
      })
      .catch(() => {})
      .finally(() => {
        setD1Hydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!d1Hydrated) return;
    const timer = setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads,
          projects,
          installments,
          invoices,
          maintenanceRequests,
          proposals,
          briefings,
          settings
        })
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [d1Hydrated, leads, projects, installments, invoices, maintenanceRequests, proposals, briefings, settings]);

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

  const handleUpdateLeadMessage = (leadId: string, newMessage: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          msg_a_mandar: newMessage,
          updated_at: new Date().toISOString().slice(0, 10)
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
        ultimo_contato: leadData.ultimo_contato,
        proximo_followup: leadData.proximo_followup,
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

  const handleBulkUpdateLeads = (leadIds: string[], updates: Partial<ClientLead>) => {
    const idSet = new Set(leadIds);
    const todayStr = new Date().toISOString().slice(0, 10);
    setLeads(prev =>
      prev.map(l => (idSet.has(l.id) ? { ...l, ...updates, updated_at: todayStr } : l))
    );
  };

  const handleBulkDeleteLeads = (leadIds: string[]) => {
    const idSet = new Set(leadIds);
    setLeads(prev => prev.filter(l => !idSet.has(l.id)));
    if (selectedLeadId && idSet.has(selectedLeadId)) {
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
    const clientLead = leads.find(l => l.id === invoice.client_id || l.nome === invoice.cliente_nome);
    const rawPhone = invoice.cliente_whatsapp || clientLead?.whatsapp || '';
    if (!rawPhone) {
      alert('Cliente sem WhatsApp cadastrado.');
      return;
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const pixInfo = settings.chavePix ? `\n\n💠 *Chave PIX:* ${settings.chavePix}` : '';
    const msg = `Olá ${invoice.cliente_nome}, tudo bem? Me chamo ${settings.nomeProfissional || 'Yago Duarte'}. Passando para enviar o lembrete da mensalidade de hospedagem e manutenção do seu site referente a ${invoice.competencia} no valor de R$ ${invoice.valor.toFixed(2)} (vencimento ${invoice.vencimento.split('-').reverse().join('/')}).${pixInfo}\n\nQualquer dúvida, estou à disposição!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendCobrancaInstallment = (inst: Installment) => {
    const proj = projects.find(p => p.id === inst.project_id);
    const clientLead = leads.find(l => l.id === proj?.client_id || l.nome === inst.cliente_nome);
    const rawPhone = proj?.cliente_whatsapp || clientLead?.whatsapp || '';
    if (!rawPhone) {
      alert('Cliente sem WhatsApp cadastrado.');
      return;
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const pixInfo = settings.chavePix ? `\n\n💠 *Chave PIX:* ${settings.chavePix}` : '';
    const msg = `Olá ${inst.cliente_nome}, tudo bem? Me chamo ${settings.nomeProfissional || 'Yago Duarte'}. Passando para enviar os dados referentes à parcela "${inst.descricao}" do seu projeto web, no valor de R$ ${inst.valor.toFixed(2)} (vencimento ${inst.vencimento.split('-').reverse().join('/')}).${pixInfo}\n\nAssim que realizar, pode me mandar o comprovante por aqui. Muito obrigado!`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCobrarPixClient = (client: ClientLead) => {
    if (!client.whatsapp) {
      alert('Cliente sem WhatsApp cadastrado.');
      return;
    }
    const cleanPhone = client.whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const pixInfo = settings.chavePix ? `\n\n💠 *Chave PIX:* ${settings.chavePix}` : '';
    const msg = `Olá ${client.nome}, tudo bem? Me chamo ${settings.nomeProfissional || 'Yago Duarte'}. Passando para enviar o lembrete da mensalidade de hospedagem e manutenção do seu site no valor de R$ ${(client.mensalidade || 89).toFixed(2)}.${pixInfo}\n\nQualquer dúvida ou ajuste que precisar no site, estou por aqui!`;
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
      cliente_whatsapp: matchedLead?.whatsapp || settings.whatsappComercial || '11945987666',
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

    return (
      <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm">Carregando proposta...</div>}>
        <PublicProposalView proposal={foundProposal} whatsappComercial={settings.whatsappComercial} />
      </Suspense>
    );
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
      whatsapp_atendimento: firstLead?.whatsapp || settings.whatsappComercial || '11945987666',
      instagram: firstLead?.instagram || '',
      endereco_fisico: '',
      link_arquivos: '',
      observacoes_adicionais: '',
      preenchido: false,
      created_at: new Date().toISOString()
    };

    return (
      <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm">Carregando briefing...</div>}>
        <PublicBriefingView 
          initialData={foundBriefing} 
          onSaveBriefing={handleUpdateBriefing} 
          whatsappComercial={settings.whatsappComercial} 
        />
      </Suspense>
    );
  }

  // Clientes na Carteira são os que têm fase 'carteira' ou projeto 'No ar'
  const carteiraClients = leads.filter(l => l.fase === 'carteira' || projects.some(p => p.client_id === l.id && p.etapa === 'No ar / Entregue'));

  const todayForCounts = new Date().toISOString().slice(0, 10);
  const counts = {
    hoje: leads.filter(l => isLeadActiveForFollowup(l) && l.proximo_followup && l.proximo_followup <= todayForCounts).length,
    prospeccao: leads.filter(l => l.fase === 'prospeccao').length,
    projetos: projects.length,
    carteira: carteiraClients.length
  };

  const viewTitles: Record<string, string> = {
    hoje: 'Hoje',
    prospeccao: 'Prospecção',
    projetos: 'Projetos',
    carteira: 'Carteira',
    financeiro: 'Financeiro',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações',
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans">
      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-[#121215] border-b border-[#27272a] shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-[#18181b] border border-[#27272a] text-zinc-200 hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-yd-symbol.png" alt="" className="w-6 h-6 object-contain" />
            <span className="font-semibold text-sm text-zinc-100">{viewTitles[currentView] || 'CRM'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Buscar lead"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[#18181b] border border-[#27272a] text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setIsModalOpen(true);
            }}
            className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Lead</span>
          </button>
        </div>
      </header>

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
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#09090b] text-zinc-400 text-xs">Carregando módulo...</div>}>
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
            onUpdateLeadMessage={handleUpdateLeadMessage}
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
            onBulkUpdateLeads={handleBulkUpdateLeads}
            onBulkDeleteLeads={handleBulkDeleteLeads}
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
            onSendCobrancaInstallment={handleSendCobrancaInstallment}
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
            onCobrarPixClient={handleCobrarPixClient}
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
      </Suspense>

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

      <Suspense fallback={null}>
        {/* Modal de Fechamento de Venda */}
        {closingLead && (
          <FechamentoVendaModal
            isOpen={!!closingLead}
            onClose={() => setClosingLead(null)}
            lead={closingLead}
            onConfirmVenda={handleConfirmVenda}
          />
        )}

        {/* Modal de Migração CSV */}
        {isMigrationOpen && (
          <MigrationModal
            isOpen={isMigrationOpen}
            onClose={() => setIsMigrationOpen(false)}
            onImportLeads={handleImportMigratedLeads}
            onClearAllLeads={handleClearAllLeads}
            currentCount={leads.length}
          />
        )}

        {/* Modal de Gerar Proposta */}
        {selectedProposalLead && (
          <GerarPropostaModal
            isOpen={!!selectedProposalLead}
            onClose={() => setSelectedProposalLead(null)}
            lead={selectedProposalLead}
            onSaveProposal={handleSaveProposal}
          />
        )}

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
        {isCommandPaletteOpen && (
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
        )}
      </Suspense>
    </div>
  );
}

export default App;
