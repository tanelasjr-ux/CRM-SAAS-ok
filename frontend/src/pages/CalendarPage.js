import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { format, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Clock, User, CheckCircle2, Circle, Calendar as CalendarIcon,
  Phone, Video, Mail, Coffee, RefreshCw
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const activityTypes = [
  { value: 'call', label: 'Ligação', icon: Phone, color: 'text-blue-500' },
  { value: 'meeting', label: 'Reunião', icon: Video, color: 'text-purple-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-emerald-500' },
  { value: 'follow_up', label: 'Follow-up', icon: Coffee, color: 'text-amber-500' },
  { value: 'stage_change', label: 'Mudança de Etapa', icon: CalendarIcon, color: 'text-pink-500' },
];

const getActivityIcon = (type) => {
  const activity = activityTypes.find(a => a.value === type);
  return activity || { icon: CalendarIcon, color: 'text-gray-500', label: type };
};

const CalendarPage = () => {
  const [activities, setActivities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    lead_id: '',
    type: 'call',
    description: '',
    scheduled_at: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activitiesRes, leadsRes] = await Promise.all([
        axios.get(`${API_URL}/activities`),
        axios.get(`${API_URL}/leads`)
      ]);
      setActivities(activitiesRes.data);
      setLeads(leadsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateActivity = async () => {
    if (!newActivity.lead_id || !newActivity.description.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/activities`, {
        ...newActivity,
        scheduled_at: newActivity.scheduled_at || selectedDate.toISOString()
      });
      
      setActivities(prev => [...prev, response.data]);
      setIsDialogOpen(false);
      setNewActivity({
        lead_id: '',
        type: 'call',
        description: '',
        scheduled_at: ''
      });
      toast.success('Atividade criada com sucesso');
    } catch (error) {
      console.error('Failed to create activity:', error);
      toast.error('Erro ao criar atividade');
    }
  };

  const handleCompleteActivity = async (activityId) => {
    try {
      await axios.put(`${API_URL}/activities/${activityId}/complete`);
      setActivities(prev => prev.map(a => 
        a.id === activityId ? { ...a, is_completed: true } : a
      ));
      toast.success('Atividade concluída');
    } catch (error) {
      console.error('Failed to complete activity:', error);
      toast.error('Erro ao concluir atividade');
    }
  };

  const getActivitiesForDate = (date) => {
    return activities.filter(activity => {
      const activityDate = activity.scheduled_at 
        ? new Date(activity.scheduled_at) 
        : new Date(activity.created_at);
      return isSameDay(activityDate, date);
    });
  };

  const selectedDateActivities = getActivitiesForDate(selectedDate);

  const daysWithActivities = activities.map(activity => {
    const date = activity.scheduled_at 
      ? new Date(activity.scheduled_at) 
      : new Date(activity.created_at);
    return startOfDay(date).toISOString();
  });

  const pendingActivities = activities.filter(a => !a.is_completed);
  const completedToday = activities.filter(a => 
    a.is_completed && 
    a.completed_at && 
    isSameDay(new Date(a.completed_at), new Date())
  );

  if (loading) {
    return (
      <div className="space-y-6" data-testid="calendar-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Gerencie suas atividades e follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="icon" data-testid="refresh-calendar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="add-activity-button">
            <Plus className="w-4 h-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingActivities.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas Hoje</p>
                <p className="text-2xl font-bold">{completedToday.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Para Hoje</p>
                <p className="text-2xl font-bold">{selectedDateActivities.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="font-outfit">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md"
              modifiers={{
                hasActivity: (date) => 
                  daysWithActivities.includes(startOfDay(date).toISOString())
              }}
              modifiersStyles={{
                hasActivity: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(var(--primary))'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Day Activities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-outfit">
              Atividades - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateActivities.length > 0 ? (
              <div className="space-y-3">
                {selectedDateActivities.map(activity => {
                  const { icon: Icon, color, label } = getActivityIcon(activity.type);
                  const lead = leads.find(l => l.id === activity.lead_id);
                  
                  return (
                    <div
                      key={activity.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        activity.is_completed ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/50'
                      }`}
                      data-testid={`activity-${activity.id}`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => !activity.is_completed && handleCompleteActivity(activity.id)}
                        disabled={activity.is_completed}
                      >
                        {activity.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${color}`} />
                          <Badge variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                          {lead && (
                            <span className="text-xs text-muted-foreground">
                              • {lead.name}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${activity.is_completed ? 'line-through' : ''}`}>
                          {activity.description}
                        </p>
                        {activity.scheduled_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.scheduled_at), "HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade para este dia</p>
                <Button 
                  variant="link" 
                  onClick={() => setIsDialogOpen(true)}
                  className="mt-2"
                >
                  Adicionar atividade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="add-activity-dialog">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lead *</Label>
              <Select
                value={newActivity.lead_id}
                onValueChange={(value) => setNewActivity({ ...newActivity, lead_id: value })}
              >
                <SelectTrigger data-testid="activity-lead-select">
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newActivity.type}
                onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}
              >
                <SelectTrigger data-testid="activity-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="Descreva a atividade..."
                data-testid="activity-description-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input
                type="datetime-local"
                value={newActivity.scheduled_at}
                onChange={(e) => setNewActivity({ ...newActivity, scheduled_at: e.target.value })}
                data-testid="activity-datetime-input"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateActivity} data-testid="create-activity-button">
                Criar Atividade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
