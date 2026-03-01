import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Server, Database, MessageSquare, Key } from 'lucide-react';

const ServerConfigPage = () => {
  return (
    <div className="space-y-6 max-w-4xl" data-testid="server-config-page">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-3xl font-bold">Configurações do Servidor</h1>
        <p className="text-muted-foreground">Informações e configurações globais</p>
      </div>

      {/* Server Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>Detalhes da instalação</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Versão</p>
              <p className="text-lg font-semibold">2.0.0</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="bg-emerald-100 text-emerald-700">Online</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Banco de Dados</CardTitle>
              <CardDescription>Supabase PostgreSQL</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">URL do Supabase</p>
            <code className="text-xs bg-background px-2 py-1 rounded">
              {process.env.REACT_APP_BACKEND_URL ? 'Configurado' : 'Não configurado'}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle>WhatsApp - Evolution API</CardTitle>
              <CardDescription>Integração com WhatsApp</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">Como configurar:</h4>
            <ol className="list-decimal list-inside text-sm text-amber-600 dark:text-amber-300 space-y-1">
              <li>Instale a Evolution API em seu servidor</li>
              <li>Crie uma instância do WhatsApp</li>
              <li>Obtenha a URL da API e a API Key</li>
              <li>Configure cada empresa em "Empresas → Configurar WhatsApp"</li>
            </ol>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Documentação: <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">doc.evolution-api.com</a></p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Instruções de Uso</CardTitle>
              <CardDescription>Como administrar o sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">1. Criar Empresa</h4>
              <p className="text-sm text-muted-foreground">Vá em "Empresas" → "Nova Empresa" para criar uma empresa cliente</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">2. Configurar WhatsApp</h4>
              <p className="text-sm text-muted-foreground">Clique nos 3 pontos da empresa → "Configurar WhatsApp" para vincular a Evolution API</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">3. Criar Usuário Cliente</h4>
              <p className="text-sm text-muted-foreground">Vá em "Usuários" → "Novo Usuário", selecione "Cliente" e vincule à empresa</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-1">4. Fornecer Credenciais</h4>
              <p className="text-sm text-muted-foreground">Envie o email e senha criados para o cliente acessar o CRM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServerConfigPage;
