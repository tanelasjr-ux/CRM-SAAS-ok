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
  Users, Plus, RefreshCw, MoreVertical, Key, Power, Trash2, Server, User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ServerUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    tenant_id: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, tenantsRes] = await Promise.all([
        axios.get(`${API_URL}/server/users`),
        axios.get(`${API_URL}/server/tenants`)
      ]);
      setUsers(usersRes.data);
      setTenants(tenantsRes.data);
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

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (newUser.role === 'client' && !newUser.tenant_id) {
      toast.error('Selecione uma empresa para o cliente');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/server/users`, {
        ...newUser,
        tenant_id: newUser.role === 'server_admin' ? null : newUser.tenant_id
      });
      setUsers(prev => [...prev, response.data]);
      setIsCreateDialogOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'client', tenant_id: '' });
      toast.success('Usuário criado com sucesso');
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar usuário');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/server/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Usuário excluído');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const response = await axios.put(`${API_URL}/server/users/${userId}/toggle-active`);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_active: response.data.is_active } : u
      ));
      toast.success(response.data.is_active ? 'Usuário ativado' : 'Usuário desativado');
    } catch (error) {
      console.error('Failed to toggle user:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleOpenPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Digite a nova senha');
      return;
    }
    try {
      await axios.put(`${API_URL}/server/users/${selectedUser.id}/password?password=${encodeURIComponent(newPassword)}`);
      setIsPasswordDialogOpen(false);
      toast.success('Senha alterada com sucesso');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Erro ao alterar senha');
    }
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.company_name || 'N/A';
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="server-users-loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="server-users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="create-user-btn">
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Administradores</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'server_admin').length}
              </p>
            </div>
            <Server className="w-8 h-8 text-red-500 opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <p className="text-2xl font-bold text-emerald-600">
                {users.filter(u => u.role === 'client').length}
              </p>
            </div>
            <User className="w-8 h-8 text-emerald-500 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? users.map(user => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={user.role === 'server_admin' 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }>
                      {user.role === 'server_admin' ? 'Servidor' : 'Cliente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.tenant_id ? getTenantName(user.tenant_id) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={user.is_active 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-700'
                    }>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenPasswordDialog(user)}>
                          <Key className="w-4 h-4 mr-2" />
                          Alterar Senha
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(user.id)}>
                          <Power className="w-4 h-4 mr-2" />
                          {user.is_active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.id)}
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="create-user-dialog">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nome completo"
                data-testid="user-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
                data-testid="user-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Senha"
                data-testid="user-password-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Acesso *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server_admin">Administrador do Servidor</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === 'client' && (
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select
                  value={newUser.tenant_id}
                  onValueChange={(value) => setNewUser({ ...newUser, tenant_id: value })}
                >
                  <SelectTrigger data-testid="user-tenant-select">
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} data-testid="submit-create-user">Criar Usuário</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent data-testid="password-dialog">
          <DialogHeader>
            <DialogTitle>Alterar Senha - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                data-testid="new-password-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleChangePassword} data-testid="submit-password">Alterar Senha</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerUsersPage;
