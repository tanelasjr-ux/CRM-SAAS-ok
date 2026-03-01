import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Building2, Plus, RefreshCw, MoreVertical, Settings, Trash2, Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ServerTenantsPage = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newTenant, setNewTenant] = useState({ company_name: '' });
  const [config, setConfig] = useState({
    evolution_api_url: '',
    evolution_api_key: '',
    whatsapp_instance: ''
  });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/server/tenants`);
      setTenants(response.data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('Erro ao carregar empresas');
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
      const response = await axios.post(`${API_URL}/server/tenants`, newTenant);
      setTenants(prev => [...prev, response.data]);
      setIsCreateDialogOpen(false);
      setNewTenant({ company_name: '' });
      toast.success('Empresa criada com sucesso');
    } catch (error) {
      console.error('Failed to create tenant:', error);
      toast.error('Erro ao criar empresa');
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa? Todos os dados serão perdidos.')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/server/tenants/${tenantId}`);
      setTenants(prev => prev.filter(t => t.id !== tenantId));
      toast.success('Empresa excluída');
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      toast.error('Erro ao excluir empresa');
    }
  };

  const handleOpenConfig = (tenant) => {
    setSelectedTenant(tenant);
    setConfig({
      evolution_api_url: tenant.evolution_api_url || '',
      evolution_api_key: tenant.evolution_api_key || '',
      whatsapp_instance: tenant.whatsapp_instance || ''
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      await axios.put(`${API_URL}/server/tenants/${selectedTenant.id}/config`, config);
      setTenants(prev => prev.map(t => 
        t.id === selectedTenant.id ? { ...t, ...config } : t
      ));
      setIsConfigDialogOpen(false);
      toast.success('Configurações salvas');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="server-tenants-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="server-tenants-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTenants} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="create-tenant-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Empresas</p>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-primary opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Com WhatsApp</p>
              <p className="text-2xl font-bold text-emerald-600">
                {tenants.filter(t => t.evolution_api_url).length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-emerald-500 opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sem Configuração</p>
              <p className="text-2xl font-bold text-amber-600">
                {tenants.filter(t => !t.evolution_api_url).length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-amber-500 opacity-50" />
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
                <TableHead>Status</TableHead>
                <TableHead>WhatsApp</TableHead>
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
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.evolution_api_url ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Configurado</Badge>
                    ) : (
                      <Badge variant="secondary">Não configurado</Badge>
                    )}
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
                        <DropdownMenuItem onClick={() => handleOpenConfig(tenant)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTenant(tenant.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTenant} data-testid="submit-create-tenant">Criar Empresa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent data-testid="config-tenant-dialog">
          <DialogHeader>
            <DialogTitle>Configurar WhatsApp - {selectedTenant?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL da Evolution API</Label>
              <Input
                value={config.evolution_api_url}
                onChange={(e) => setConfig({ ...config, evolution_api_url: e.target.value })}
                placeholder="https://evolution.seuservidor.com"
                data-testid="evolution-url-input"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key da Evolution</Label>
              <Input
                value={config.evolution_api_key}
                onChange={(e) => setConfig({ ...config, evolution_api_key: e.target.value })}
                placeholder="sua-api-key"
                type="password"
                data-testid="evolution-key-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Instância WhatsApp</Label>
              <Input
                value={config.whatsapp_instance}
                onChange={(e) => setConfig({ ...config, whatsapp_instance: e.target.value })}
                placeholder="nome-da-instancia"
                data-testid="whatsapp-instance-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveConfig} data-testid="save-config-btn">Salvar Configurações</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerTenantsPage;
