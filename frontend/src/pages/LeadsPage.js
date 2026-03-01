import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Plus, RefreshCw, Mail, Phone, DollarSign, Star,
  MoreVertical, Sparkles, Lightbulb, TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    pipeline_stage_id: '',
    estimated_value: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, stagesRes] = await Promise.all([
        axios.get(`${API_URL}/leads`, { params: { search: searchTerm || undefined } }),
        axios.get(`${API_URL}/pipeline-stages`)
      ]);
      setLeads(leadsRes.data);
      setStages(stagesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/leads`, {
        ...newLead,
        estimated_value: parseFloat(newLead.estimated_value) || 0
      });
      setLeads(prev => [...prev, response.data]);
      setIsDialogOpen(false);
      setNewLead({
        name: '',
        email: '',
        phone: '',
        source: '',
        pipeline_stage_id: '',
        estimated_value: 0
      });
      toast.success('Lead criado com sucesso');
    } catch (error) {
      console.error('Failed to create lead:', error);
      toast.error('Erro ao criar lead');
    }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await axios.delete(`${API_URL}/leads/${leadId}`);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success('Lead excluído');
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Erro ao excluir lead');
    }
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

  const handleAISuggestion = async (lead) => {
    setSelectedLead(lead);
    setLoadingAI(true);
    setAiSuggestion(null);
    try {
      const response = await axios.post(`${API_URL}/ai/suggest-followup?lead_id=${lead.id}`);
      setAiSuggestion(response.data);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      toast.error('Erro ao obter sugestão');
    } finally {
      setLoadingAI(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 70) return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{score}</Badge>;
    if (score >= 40) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{score}</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{score}</Badge>;
  };

  const getStageName = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.name || 'N/A';
  };

  const getStageColor = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.color || '#6366F1';
  };

  if (loading && leads.length === 0) {
    return (
      <div className="space-y-6" data-testid="leads-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Gerencie todos os seus leads</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="search-leads-input"
            />
          </div>
          <Button onClick={fetchData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="add-lead-button">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{leads.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Score Alto</p>
              <p className="text-2xl font-bold text-emerald-600">
                {leads.filter(l => l.lead_score >= 70).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-emerald-500 opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-primary opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Novos (7d)</p>
              <p className="text-2xl font-bold text-blue-600">
                {leads.filter(l => {
                  const created = new Date(l.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return created >= weekAgo;
                }).length}
              </p>
            </div>
            <Plus className="w-8 h-8 text-blue-500 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length > 0 ? leads.map(lead => (
                <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.source || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      style={{ backgroundColor: getStageColor(lead.pipeline_stage_id) + '20', color: getStageColor(lead.pipeline_stage_id) }}
                    >
                      {getStageName(lead.pipeline_stage_id)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(lead.estimated_value)}
                  </TableCell>
                  <TableCell>
                    {getScoreBadge(lead.lead_score)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAIScore(lead.id)}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Calcular Score IA
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAISuggestion(lead)}>
                          <Lightbulb className="w-4 h-4 mr-2" />
                          Sugestão IA
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-destructive"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="add-lead-dialog">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Nome do lead"
                data-testid="new-lead-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select
                  value={newLead.source}
                  onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Etapa</Label>
                <Select
                  value={newLead.pipeline_stage_id}
                  onValueChange={(value) => setNewLead({ ...newLead, pipeline_stage_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor Estimado</Label>
              <Input
                type="number"
                value={newLead.estimated_value}
                onChange={(e) => setNewLead({ ...newLead, estimated_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateLead} data-testid="create-lead-submit">Criar Lead</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestion Dialog */}
      <Dialog open={!!selectedLead && !!aiSuggestion} onOpenChange={() => { setSelectedLead(null); setAiSuggestion(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sugestão de IA para {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>
          {loadingAI ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : aiSuggestion && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">Etapa Atual: {aiSuggestion.current_stage}</p>
                <p className="text-sm">{aiSuggestion.suggestion}</p>
              </div>
              <div className="flex items-center justify-between">
                <Badge className={aiSuggestion.priority === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                  Prioridade: {aiSuggestion.priority}
                </Badge>
                <Button onClick={() => { setSelectedLead(null); setAiSuggestion(null); }}>
                  Entendido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsPage;
