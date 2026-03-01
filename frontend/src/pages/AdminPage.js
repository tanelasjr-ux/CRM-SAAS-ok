import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
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
  Building2, Users, Plus, RefreshCw, MoreVertical,
  Pause, Play, Settings, Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPage = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    company_name: '',
    plan: 'trial',
    status: 'trial'
  });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/tenants`);
      setTenants(response.data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      if (error.response?.status === 403) {
        toast.error('Acesso negado. Você precisa ser Super Admin.');
      } else {
        toast.error('Erro ao carregar empresas');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreateTenant = async () => {
    if (!newTenant.company_name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/admin/tenants`, newTenant);
      setTenants(prev => [...prev, response.data]);
      setIsDialogOpen(false);
      setNewTenant({ company_name: '', plan: 'trial', status: 'trial' });
      toast.success('Empresa criada com sucesso');
    } catch (error) {
      console.error('Failed to create tenant:', error);
      toast.error('Erro ao criar empresa');
    }
  };

  const handleSuspendTenant = async (tenantId) => {
    try {
      await axios.put(`${API_URL}/admin/tenants/${tenantId}/suspend`);
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, status: 'suspended' } : t
      ));
      toast.success('Empresa suspensa');
    } catch (error) {
      console.error('Failed to suspend tenant:', error);
      toast.error('Erro ao suspender empresa');
    }
  };

  const handleUpdateTenant = async (tenantId, updates) => {
    try {
      await axios.put(`${API_URL}/admin/tenants/${tenantId}`, updates);
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, ...updates } : t
      ));
      toast.success('Empresa atualizada');
    } catch (error) {
      console.error('Failed to update tenant:', error);
      toast.error('Erro ao atualizar empresa');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const labels = {
      trial: 'Trial',
      active: 'Ativo',
      suspended: 'Suspenso',
      cancelled: 'Cancelado',
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const getPlanBadge = (plan) => {
    const styles = {
      trial: 'bg-blue-100 text-blue-700',
      basic: 'bg-emerald-100 text-emerald-700',
      pro: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-amber-100 text-amber-700',
    };
    return <Badge className={styles[plan]}>{plan.toUpperCase()}</Badge>;
  };

  // Stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="admin-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-outfit text-3xl font-bold">Super Admin</h1>
            <p className="text-muted-foreground">Gerencie todas as empresas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTenants} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="create-tenant-button">
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalTenants}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-emerald-600">{activeTenants}</p>
              </div>
              <Play className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trial</p>
                <p className="text-2xl font-bold text-blue-600">{trialTenants}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspensos</p>
                <p className="text-2xl font-bold text-red-600">{suspendedTenants}</p>
              </div>
              <Pause className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Limites</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length > 0 ? tenants.map(tenant => (
                <TableRow key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                  <TableCell>
                    <div className="font-medium">{tenant.company_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {tenant.id?.substring(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell>{getPlanBadge(tenant.plan)}</TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div>Usuários: {tenant.user_limit || 3}</div>
                      <div>IA: {tenant.ai_requests_used || 0}/{tenant.ai_requests_limit || 50}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tenant.created_at ? format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateTenant(tenant.id, { plan: 'basic', status: 'active' })}>
                          <Play className="w-4 h-4 mr-2" />
                          Ativar Plano Básico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateTenant(tenant.id, { plan: 'pro', status: 'active' })}>
                          <Settings className="w-4 h-4 mr-2" />
                          Ativar Plano Pro
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSuspendTenant(tenant.id)}
                          className="text-destructive"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Suspender
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="create-tenant-dialog">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input
                value={newTenant.company_name}
                onChange={(e) => setNewTenant({ ...newTenant, company_name: e.target.value })}
                placeholder="Nome da empresa"
                data-testid="tenant-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select
                value={newTenant.plan}
                onValueChange={(value) => setNewTenant({ ...newTenant, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (14 dias)</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Inicial</Label>
              <Select
                value={newTenant.status}
                onValueChange={(value) => setNewTenant({ ...newTenant, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTenant} data-testid="submit-create-tenant">Criar Empresa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
