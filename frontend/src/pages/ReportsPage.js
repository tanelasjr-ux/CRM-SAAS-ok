import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import {
  FileText, Download, Sparkles, TrendingUp, Users, Target,
  AlertTriangle, RefreshCw, Printer
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [bottlenecks, setBottlenecks] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBottlenecks, setLoadingBottlenecks] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, chartRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/dashboard/revenue-chart`)
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
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

  const handleDetectBottlenecks = async () => {
    setLoadingBottlenecks(true);
    try {
      const response = await axios.post(`${API_URL}/ai/detect-bottlenecks`);
      setBottlenecks(response.data);
      toast.success('Análise concluída');
    } catch (error) {
      console.error('Failed to detect bottlenecks:', error);
      toast.error('Erro na análise');
    } finally {
      setLoadingBottlenecks(false);
    }
  };

  const handleExportMBR = () => {
    // Generate MBR Report HTML
    const mbrHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório MBR - ${new Date().toLocaleDateString('pt-BR')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .kpi-card { background: #f8fafc; padding: 20px; border-radius: 8px; }
          .kpi-value { font-size: 2em; font-weight: bold; color: #4F46E5; }
          .kpi-label { color: #64748b; margin-top: 5px; }
          .section { margin: 30px 0; }
          .bottleneck { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #f59e0b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Monthly Business Review (MBR)</h1>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        
        <div class="section">
          <h2>KPIs Principais</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-value">${stats?.total_leads || 0}</div>
              <div class="kpi-label">Total de Leads</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${formatCurrency(stats?.total_revenue || 0)}</div>
              <div class="kpi-label">Receita Total</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${stats?.conversion_rate || 0}%</div>
              <div class="kpi-label">Taxa de Conversão</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${formatCurrency(stats?.average_ticket || 0)}</div>
              <div class="kpi-label">Ticket Médio</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Resumo do Pipeline</h2>
          <p>Deals ganhos: ${stats?.deals_won || 0}</p>
          <p>Deals em aberto: ${stats?.deals_open || 0}</p>
          <p>Valor no pipeline: ${formatCurrency(stats?.total_value || 0)}</p>
        </div>
        
        ${bottlenecks ? `
        <div class="section">
          <h2>Análise de Gargalos</h2>
          <p>Score de saúde do pipeline: ${bottlenecks.health_score}/100</p>
          ${bottlenecks.bottlenecks.map(b => `
            <div class="bottleneck">
              <strong>${b.stage}</strong> - ${b.count} leads parados
              <br><small>${b.suggestion}</small>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <div class="section" style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="color: #64748b; font-size: 12px;">
            Relatório gerado automaticamente pelo CRM SaaS.
            Este documento é confidencial e destinado apenas ao uso interno.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([mbrHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MBR_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório MBR exportado');
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="reports-loading">
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
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e insights do seu negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handleExportMBR} data-testid="export-mbr-button">
            <Download className="w-4 h-4 mr-2" />
            Exportar MBR
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{stats?.total_leads || 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stats?.total_revenue || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversão</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.conversion_rate || 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats?.average_ticket || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="bottlenecks">Gargalos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-outfit">Evolução da Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Receita']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue2)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="font-outfit">Leads por Etapa do Funil</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.stages?.map(stage => ({
                  name: stage.name,
                  leads: stats.leads_by_stage[stage.id]?.count || 0,
                  value: stats.leads_by_stage[stage.id]?.value || 0,
                  color: stage.color
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [
                      name === 'leads' ? value : formatCurrency(value),
                      name === 'leads' ? 'Leads' : 'Valor'
                    ]}
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-outfit flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Análise de Gargalos com IA
                </CardTitle>
                <Button 
                  onClick={handleDetectBottlenecks} 
                  disabled={loadingBottlenecks}
                  data-testid="detect-bottlenecks-button"
                >
                  {loadingBottlenecks ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Analisar Pipeline
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bottlenecks ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{bottlenecks.health_score}</p>
                      <p className="text-sm text-muted-foreground">Score de Saúde</p>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-secondary rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            bottlenecks.health_score >= 70 ? 'bg-emerald-500' :
                            bottlenecks.health_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${bottlenecks.health_score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {bottlenecks.bottlenecks.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Gargalos Identificados
                      </h3>
                      {bottlenecks.bottlenecks.map((bottleneck, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{bottleneck.stage}</span>
                            <Badge className={
                              bottleneck.severity === 'alta' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                            }>
                              {bottleneck.count} leads
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{bottleneck.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum gargalo identificado!</p>
                      <p className="text-sm">Seu pipeline está saudável.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Clique em "Analisar Pipeline" para detectar gargalos</p>
                  <p className="text-sm">usando inteligência artificial</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
