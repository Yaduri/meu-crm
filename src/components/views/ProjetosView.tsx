import React, { useState } from 'react';
import type { Project, EtapaProjeto } from '../../types/crm';
import { ETAPAS_PROJETO } from '../../types/crm';
import { 
  FolderKanban, 
  CheckSquare, 
  Globe, 
  Plus, 
  Calendar,
  FileText
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface ProjetosViewProps {
  projects: Project[];
  onMoveProjectStage: (projectId: string, newStage: EtapaProjeto) => void;
  onToggleTask: (projectId: string, taskId: string) => void;
  onAddTask: (projectId: string, taskTitle: string) => void;
  onUpdateProjectLinks: (projectId: string, links: { figma?: string; homologacao?: string; producao?: string }) => void;
  onOpenBriefing?: (project: Project) => void;
}

export const ProjetosView: React.FC<ProjetosViewProps> = ({
  projects,
  onMoveProjectStage,
  onToggleTask,
  onAddTask,
  onUpdateProjectLinks,
  onOpenBriefing,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId !== result.source.droppableId) {
      onMoveProjectStage(draggableId, destination.droppableId as EtapaProjeto);
    }
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProject) return;
    onAddTask(selectedProject.id, newTaskTitle.trim());
    setNewTaskTitle('');
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <header className="px-8 py-4 border-b border-[#27272a] bg-[#0d0d10] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <FolderKanban size={20} className="text-emerald-400" />
            <span>Esteira de Desenvolvimento & Entrega</span>
            <span className="text-xs font-normal text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
              {projects.length} projetos
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhe o andamento de design, código, revisão com cliente e publicação no ar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#18181b] border border-[#27272a] px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 text-zinc-300">
            <span>Produção Total:</span>
            <span className="font-mono font-bold text-emerald-400">
              R$ {projects.reduce((acc, p) => acc + p.implantacao, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban de Etapas do Projeto */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 border-r border-[#27272a]">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full">
              {ETAPAS_PROJETO.map((etapa) => {
                const columnProjects = projects.filter(p => p.etapa === etapa.id);

                return (
                  <div
                    key={etapa.id}
                    className="w-72 shrink-0 bg-[#121215] border border-[#27272a] rounded-2xl flex flex-col max-h-full overflow-hidden"
                  >
                    {/* Header da Coluna */}
                    <div className="p-3.5 border-b border-[#222226] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: etapa.color }}
                        />
                        <h3 className="text-xs font-semibold text-zinc-200">{etapa.label}</h3>
                        <span className="text-[10px] font-bold bg-[#1f1f24] text-zinc-400 px-1.5 py-0.2 rounded-full">
                          {columnProjects.length}
                        </span>
                      </div>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={etapa.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-2.5 overflow-y-auto space-y-2.5 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          {columnProjects.map((project, index) => {
                            const isSelected = selectedProject?.id === project.id;
                            const isOverdue = project.prazo < todayStr;
                            const totalTasks = project.tasks?.length || 0;
                            const completedTasks = project.tasks?.filter(t => t.feito).length || 0;
                            const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                            return (
                              <Draggable key={project.id} draggableId={project.id} index={index}>
                                {(providedDrag, snapshotDrag) => (
                                  <div
                                    ref={providedDrag.innerRef}
                                    {...providedDrag.draggableProps}
                                    {...providedDrag.dragHandleProps}
                                    onClick={() => setSelectedProjectId(project.id)}
                                    className={`p-3.5 bg-[#18181c] border rounded-xl cursor-grab transition-all select-none hover:border-zinc-600 ${
                                      isSelected
                                        ? 'border-emerald-500/70 bg-[#1d1d23] shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                                        : 'border-[#27272c]'
                                    } ${snapshotDrag.isDragging ? 'shadow-2xl border-emerald-500' : ''}`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="font-semibold text-xs text-zinc-100 leading-snug">
                                        {project.cliente_nome}
                                      </div>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                                        {project.tipo}
                                      </span>
                                    </div>

                                    {/* Prazo */}
                                    <div className="flex items-center gap-1.5 text-[11px] mt-2">
                                      <Calendar size={12} className={isOverdue ? 'text-rose-400' : 'text-zinc-500'} />
                                      <span className={isOverdue ? 'text-rose-400 font-semibold' : 'text-zinc-400'}>
                                        Prazo: {project.prazo.split('-').reverse().join('/')}
                                      </span>
                                    </div>

                                    {/* Barra de Progresso de Tarefas */}
                                    {totalTasks > 0 && (
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                                          <span>Checklist</span>
                                          <span className="font-mono font-semibold text-zinc-300">
                                            {completedTasks}/{totalTasks} ({progressPercent}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPercent}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Rodapé Financeiro */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[11px]">
                                      <span className="font-mono font-medium text-emerald-400">
                                        R$ {project.implantacao.toLocaleString('pt-BR')}
                                      </span>
                                      {project.mensalidade > 0 && (
                                        <span className="font-mono text-zinc-400 text-[10px]">
                                          + R$ {project.mensalidade}/mês
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* Painel Lateral de Detalhes & Checklist do Projeto Selecionado */}
        {selectedProject ? (
          <div className="w-96 bg-[#0e0e11] flex flex-col h-full overflow-y-auto p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {selectedProject.etapa}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {selectedProject.tipo}
                </span>
              </div>
              <h2 className="text-lg font-bold text-zinc-100 mt-2">
                {selectedProject.cliente_nome}
              </h2>
              <div className="text-xs text-zinc-400">
                Nicho: {selectedProject.nicho}
              </div>
            </div>

            {/* Checklist de Produção */}
            <div className="bg-[#141418] border border-[#27272a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-emerald-400" />
                  <span>Checklist de Tarefas</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {selectedProject.tasks?.filter(t => t.feito).length || 0}/{selectedProject.tasks?.length || 0}
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedProject.tasks?.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors text-xs select-none"
                  >
                    <input
                      type="checkbox"
                      checked={task.feito}
                      onChange={() => onToggleTask(selectedProject.id, task.id)}
                      className="mt-0.5 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className={task.feito ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                      {task.titulo}
                    </span>
                  </label>
                ))}
              </div>

              {/* Adicionar nova tarefa ao checklist */}
              <form onSubmit={handleAddTaskSubmit} className="mt-3 pt-3 border-t border-zinc-800/80 flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Adicionar"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>

            {/* Links Rápidos do Projeto */}
            <div className="bg-[#141418] border border-[#27272a] rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-zinc-200">Links do Projeto</div>
              
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Link Figma / Wireframe</label>
                <input
                  type="url"
                  value={selectedProject.link_figma || ''}
                  onChange={(e) => onUpdateProjectLinks(selectedProject.id, { figma: e.target.value })}
                  placeholder="https://figma.com/..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Homologação / Teste</label>
                <input
                  type="url"
                  value={selectedProject.link_homologacao || ''}
                  onChange={(e) => onUpdateProjectLinks(selectedProject.id, { homologacao: e.target.value })}
                  placeholder="https://cliente.pages.dev"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Domínio Oficial em Produção</label>
                <input
                  type="url"
                  value={selectedProject.link_producao || ''}
                  onChange={(e) => onUpdateProjectLinks(selectedProject.id, { producao: e.target.value })}
                  placeholder="https://cliente.com.br"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Briefing Público */}
            <div className="bg-[#141418] border border-[#27272a] rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
                <span>Briefing do Cliente</span>
                <span className="text-[10px] text-zinc-500 font-mono">/b/:token</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Envie o formulário público para o cliente responder cores, público, serviços e enviar logo/fotos.
              </p>
              <button
                type="button"
                onClick={() => onOpenBriefing && onOpenBriefing(selectedProject)}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileText size={13} />
                <span>Ver / Enviar Link do Briefing</span>
              </button>
            </div>

            {/* Ação: Mudar para No Ar / Concluído */}
            {selectedProject.etapa !== 'No ar / Entregue' ? (
              <button
                onClick={() => onMoveProjectStage(selectedProject.id, 'No ar / Entregue')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Globe size={14} />
                <span>Marcar como "No Ar" (Entregar)</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-400 font-semibold">
                ✓ Projeto no ar e entregue ao cliente!
              </div>
            )}
          </div>
        ) : (
          <div className="w-96 bg-[#0e0e11] flex items-center justify-center text-zinc-500 text-xs">
            Nenhum projeto selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
