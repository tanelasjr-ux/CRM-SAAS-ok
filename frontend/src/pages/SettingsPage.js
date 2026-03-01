import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import {
  User, Building2, CreditCard, Bell, Shield, Palette,
  Save, RefreshCw
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsPage = () => {
  const { user, tenant, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState(tenant?.company_name || '');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });

  useEffect(() => {
    if (tenant) {
      setCompanyName(tenant.company_name);
    }
  }, [tenant]);

  const handleSaveCompany = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/tenants/current`, {
        company_name: companyName,
        plan: tenant?.plan || 'trial',
        status: tenant?.status || 'trial'
      });
      await refreshUser();
      toast.success('Configurações salvas');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const getPlanDetails = () => {
    const plans = {
      trial: {
        name: 'Trial',
        price: 'Grátis',
        features: ['3 usuários', '50 requisições IA', 'Kanban + Dashboard'],
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      },
      basic: {
        name: 'Básico',
        price: 'R$ 99/mês',
        features: ['5 usuários', '200 IA/mês', 'Kanban + Dashboard'],
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      },
      pro: {
        name: 'Pro',
        price: 'R$ 299/mês',
        features: ['20 usuários', 'IA ilimitado', 'WhatsApp + Automações'],
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      },
      enterprise: {
        name: 'Enterprise',
        price: 'Personalizado',
        features: ['Ilimitado', 'Webhooks personalizados', 'Suporte prioritário'],
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      }
    };
    return plans[tenant?.plan] || plans.trial;
  };

  const planDetails = getPlanDetails();

  return (
    <div className="space-y-6 max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Informações da sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={user?.name || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <div>
              <Badge variant="secondary">{user?.role || 'vendedor'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Empresa</CardTitle>
              <CardDescription>Configurações da organização</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Minha Empresa"
              data-testid="company-name-input"
            />
          </div>
          <Button onClick={handleSaveCompany} disabled={loading} data-testid="save-company-button">
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Plan Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Detalhes da sua assinatura</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge className={planDetails.color}>{planDetails.name}</Badge>
                <span className="text-2xl font-bold">{planDetails.price}</span>
              </div>
              {tenant?.plan === 'trial' && tenant?.trial_expires_at && (
                <Badge variant="outline">
                  Expira em {new Date(tenant.trial_expires_at).toLocaleDateString('pt-BR')}
                </Badge>
              )}
            </div>
            <ul className="space-y-2">
              {planDetails.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Requisições IA: </span>
                <span className="font-medium">{tenant?.ai_requests_used || 0} / {tenant?.ai_requests_limit || 50}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Usuários: </span>
                <span className="font-medium">1 / {tenant?.user_limit || 3}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" data-testid="upgrade-plan-button">
              Fazer Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Preferências de alertas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações por Email</p>
              <p className="text-sm text-muted-foreground">Receba atualizações por email</p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações Push</p>
              <p className="text-sm text-muted-foreground">Alertas no navegador</p>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações SMS</p>
              <p className="text-sm text-muted-foreground">Alertas urgentes por SMS</p>
            </div>
            <Switch
              checked={notifications.sms}
              onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Proteção da sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autenticação de Dois Fatores</p>
              <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
            </div>
            <Button variant="outline" disabled>Em breve</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sessões Ativas</p>
              <p className="text-sm text-muted-foreground">Gerencie seus dispositivos conectados</p>
            </div>
            <Button variant="outline" disabled>Em breve</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
