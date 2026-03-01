import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus, MoreVertical, User, DollarSign, Phone, Mail,
  GripVertical, Search, Filter, RefreshCw, Sparkles
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LeadCard = ({ lead, onClick, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'lead-score-high';
    if (score >= 40) return 'lead-score-medium';
    return 'lead-score-low';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all group"
      onClick={onClick}
      data-testid={`lead-card-${lead.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div 
          {...attributes} 
          {...listeners}
          className="p-1 -ml-1 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <Badge className={getScoreColor(lead.lead_score)}>
          {lead.lead_score}
        </Badge>
      </div>
      
      <h4 className="font-medium text-sm mb-2 line-clamp-1">{lead.name}</h4>
      
      <div className="space-y-1 text-xs text-muted-foreground">
        {lead.email && (
          <div className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>
      
      {lead.estimated_value > 0 && (
        <div className="flex items-center gap-1 mt-2 text-sm font-medium text-primary">
          <DollarSign className="w-4 h-4" />
          {formatCurrency(lead.estimated_value)}
        </div>
      )}
    </div>
  );
};

const Column = ({ stage, leads, onAddLead, onLeadClick, children }) => {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex-shrink-0 w-72" data-testid={`pipeline-column-${stage.id}`}>
      <div className="bg-muted/50 rounded-xl p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {leads.length}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddLead(stage.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="text-xs text-muted-foreground mb-3">
          {formatCurrency(totalValue)}
        </div>
        
        <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
          <SortableContext 
            items={leads.map(l => l.id)} 
            strategy={verticalListSortingStrategy}
          >
            {children}
          </SortableContext>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full mt-2 text-muted-foreground"
          onClick={() => onAddLead(stage.id)}
          data-testid={`add-lead-${stage.id}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>
    </div>
  );
};

const PipelinePage = () => {
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    estimated_value: 0
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        axios.get(`${API_URL}/pipeline-stages`),
        axios.get(`${API_URL}/leads`)
      ]);
      setStages(stagesRes.data);
      setLeads(leadsRes.data);
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error);
      toast.error('Erro ao carregar dados do pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeLeadId = active.id;
    const overId = over.id;

    // Find the lead and target stage
    const activeLead = leads.find(l => l.id === activeLeadId);
    if (!activeLead) return;

    // Check if dropping on a lead in a different column
    const overLead = leads.find(l => l.id === overId);
    const targetStageId = overLead ? overLead.pipeline_stage_id : overId;

    // Check if it's a stage ID
    const isStage = stages.some(s => s.id === targetStageId);
    
    if (isStage && activeLead.pipeline_stage_id !== targetStageId) {
      try {
        await axios.put(`${API_URL}/leads/${activeLeadId}/move`, {
          stage_id: targetStageId
        });
        
        setLeads(prev => prev.map(lead => 
          lead.id === activeLeadId 
            ? { ...lead, pipeline_stage_id: targetStageId }
            : lead
        ));
        
        toast.success('Lead movido com sucesso');
      } catch (error) {
        console.error('Failed to move lead:', error);
        toast.error('Erro ao mover lead');
      }
    }
  };

  const handleAddLead = (stageId) => {
    setSelectedStageId(stageId);
    setNewLead({
      name: '',
      email: '',
      phone: '',
      source: '',
      estimated_value: 0
    });
    setIsDialogOpen(true);
  };

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/leads`, {
        ...newLead,
        pipeline_stage_id: selectedStageId,
        estimated_value: parseFloat(newLead.estimated_value) || 0
      });
      
      setLeads(prev => [...prev, response.data]);
      setIsDialogOpen(false);
      toast.success('Lead criado com sucesso');
    } catch (error) {
      console.error('Failed to create lead:', error);
      toast.error('Erro ao criar lead');
    }
  };

  const handleLeadClick = (lead) => {
    // Could open a lead detail modal/page
    console.log('Lead clicked:', lead);
  };

  const handleAIScore = async (leadId) => {
    try {
      const response = await axios.post(`${API_URL}/ai/lead-score?lead_id=${leadId}`);
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, lead_score: response.data.score } : lead
      ));
      toast.success(`Score atualizado: ${response.data.score}`);
    } catch (error) {
      console.error('Failed to calculate score:', error);
      toast.error('Erro ao calcular score');
    }
  };

  const filteredLeads = searchTerm
    ? leads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leads;

  const getLeadsForStage = (stageId) => {
    return filteredLeads.filter(lead => lead.pipeline_stage_id === stageId);
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="pipeline-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[500px] w-72 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pipeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">Gerencie seus leads com drag-and-drop</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="search-leads"
            />
          </div>
          <Button onClick={fetchData} variant="outline" size="icon" data-testid="refresh-pipeline">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll">
          {stages.map(stage => (
            <Column
              key={stage.id}
              stage={stage}
              leads={getLeadsForStage(stage.id)}
              onAddLead={handleAddLead}
              onLeadClick={handleLeadClick}
            >
              {getLeadsForStage(stage.id).map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => handleLeadClick(lead)}
                  isDragging={lead.id === activeId}
                />
              ))}
            </Column>
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <LeadCard lead={activeLead} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="add-lead-dialog">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Nome do lead"
                data-testid="lead-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="email@exemplo.com"
                data-testid="lead-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                data-testid="lead-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Origem</Label>
              <Select
                value={newLead.source}
                onValueChange={(value) => setNewLead({ ...newLead, source: value })}
              >
                <SelectTrigger data-testid="lead-source-select">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="ads">Anúncios</SelectItem>
                  <SelectItem value="social">Redes Sociais</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor Estimado</Label>
              <Input
                id="value"
                type="number"
                value={newLead.estimated_value}
                onChange={(e) => setNewLead({ ...newLead, estimated_value: e.target.value })}
                placeholder="0.00"
                data-testid="lead-value-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateLead} data-testid="create-lead-button">
                Criar Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelinePage;
