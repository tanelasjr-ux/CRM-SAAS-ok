import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  DollarSign, FileText, CreditCard, TrendingUp, Plus, RefreshCw,
  CheckCircle2, Clock, AlertCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const FinancialPage = () => {
  const [deals, setDeals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('deal');
  
  const [newDeal, setNewDeal] = useState({ lead_id: '', value: 0, status: 'open' });
  const [newInvoice, setNewInvoice] = useState({ deal_id: '', value: 0, due_date: '', status: 'pending' });
  const [newPayment, setNewPayment] = useState({ invoice_id: '', amount_paid: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, invoicesRes, paymentsRes, leadsRes] = await Promise.all([
        axios.get(`${API_URL}/deals`),
        axios.get(`${API_URL}/invoices`),
        axios.get(`${API_URL}/payments`),
        axios.get(`${API_URL}/leads`)
      ]);
      setDeals(dealsRes.data);
      setInvoices(invoicesRes.data);
      setPayments(paymentsRes.data);
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

  const handleCreateDeal = async () => {
    if (!newDeal.lead_id || !newDeal.value) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/deals`, {
        ...newDeal,
        value: parseFloat(newDeal.value)
      });
      setDeals(prev => [...prev, response.data]);
      setIsDialogOpen(false);
      setNewDeal({ lead_id: '', value: 0, status: 'open' });
      toast.success('Deal criado com sucesso');
    } catch (error) {
      console.error('Failed to create deal:', error);
      toast.error('Erro ao criar deal');
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.deal_id || !newInvoice.value || !newInvoice.due_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/invoices`, {
        ...newInvoice,
        value: parseFloat(newInvoice.value)
      });
      setInvoices(prev => [...prev, response.data]);
      setIsDialogOpen(false);
      setNewInvoice({ deal_id: '', value: 0, due_date: '', status: 'pending' });
      toast.success('Fatura criada com sucesso');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Erro ao criar fatura');
    }
  };

  const handleCreatePayment = async () => {
    if (!newPayment.invoice_id || !newPayment.amount_paid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/payments`, {
        ...newPayment,
        amount_paid: parseFloat(newPayment.amount_paid)
      });
      setPayments(prev => [...prev, response.data]);
      
      // Update invoice status
      setInvoices(prev => prev.map(inv => 
        inv.id === newPayment.invoice_id ? { ...inv, status: 'paid' } : inv
      ));
      
      setIsDialogOpen(false);
      setNewPayment({ invoice_id: '', amount_paid: 0 });
      toast.success('Pagamento registrado com sucesso');
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const openDialog = (type) => {
    setDialogType(type);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = {
      open: 'Em Aberto',
      won: 'Ganho',
      lost: 'Perdido',
      pending: 'Pendente',
      paid: 'Pago',
      overdue: 'Vencido',
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  // Calculate stats
  const totalRevenue = deals.filter(d => d.status === 'won').reduce((sum, d) => sum + (d.value || 0), 0);
  const pendingValue = deals.filter(d => d.status === 'open').reduce((sum, d) => sum + (d.value || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.value || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="financial-loading">
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
    <div className="space-y-6" data-testid="financial-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Gerencie deals, faturas e pagamentos</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="icon" data-testid="refresh-financial">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Negociação</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(pendingValue)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Faturado</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalInvoiced)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="deals" data-testid="tab-deals">Deals</TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">Faturas</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Pagamentos</TabsTrigger>
          </TabsList>
          <Button onClick={() => openDialog(activeTab === 'deals' ? 'deal' : activeTab === 'invoices' ? 'invoice' : 'payment')}>
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'deals' ? 'Novo Deal' : activeTab === 'invoices' ? 'Nova Fatura' : 'Novo Pagamento'}
          </Button>
        </div>

        {/* Deals Tab */}
        <TabsContent value="deals">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.length > 0 ? deals.map(deal => {
                    const lead = leads.find(l => l.id === deal.lead_id);
                    return (
                      <TableRow key={deal.id} data-testid={`deal-row-${deal.id}`}>
                        <TableCell className="font-medium">{lead?.name || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(deal.value)}</TableCell>
                        <TableCell>{getStatusBadge(deal.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(deal.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum deal encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length > 0 ? invoices.map(invoice => {
                    const deal = deals.find(d => d.id === invoice.deal_id);
                    const lead = leads.find(l => l.id === deal?.lead_id);
                    return (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell className="font-medium">{lead?.name || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(invoice.value)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma fatura encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fatura</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length > 0 ? payments.map(payment => (
                    <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                      <TableCell className="font-medium font-mono text-xs">
                        {payment.invoice_id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount_paid)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="financial-dialog">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'deal' ? 'Novo Deal' : dialogType === 'invoice' ? 'Nova Fatura' : 'Novo Pagamento'}
            </DialogTitle>
          </DialogHeader>
          
          {dialogType === 'deal' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lead *</Label>
                <Select
                  value={newDeal.lead_id}
                  onValueChange={(value) => setNewDeal({ ...newDeal, lead_id: value })}
                >
                  <SelectTrigger data-testid="deal-lead-select">
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                  placeholder="0.00"
                  data-testid="deal-value-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newDeal.status}
                  onValueChange={(value) => setNewDeal({ ...newDeal, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Em Aberto</SelectItem>
                    <SelectItem value="won">Ganho</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateDeal} data-testid="create-deal-button">Criar Deal</Button>
              </div>
            </div>
          )}
          
          {dialogType === 'invoice' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Deal *</Label>
                <Select
                  value={newInvoice.deal_id}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, deal_id: value })}
                >
                  <SelectTrigger data-testid="invoice-deal-select">
                    <SelectValue placeholder="Selecione um deal" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map(deal => {
                      const lead = leads.find(l => l.id === deal.lead_id);
                      return (
                        <SelectItem key={deal.id} value={deal.id}>
                          {lead?.name} - {formatCurrency(deal.value)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  value={newInvoice.value}
                  onChange={(e) => setNewInvoice({ ...newInvoice, value: e.target.value })}
                  placeholder="0.00"
                  data-testid="invoice-value-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  data-testid="invoice-date-input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateInvoice} data-testid="create-invoice-button">Criar Fatura</Button>
              </div>
            </div>
          )}
          
          {dialogType === 'payment' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fatura *</Label>
                <Select
                  value={newPayment.invoice_id}
                  onValueChange={(value) => setNewPayment({ ...newPayment, invoice_id: value })}
                >
                  <SelectTrigger data-testid="payment-invoice-select">
                    <SelectValue placeholder="Selecione uma fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.filter(i => i.status !== 'paid').map(invoice => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {formatCurrency(invoice.value)} - Venc: {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Pago *</Label>
                <Input
                  type="number"
                  value={newPayment.amount_paid}
                  onChange={(e) => setNewPayment({ ...newPayment, amount_paid: e.target.value })}
                  placeholder="0.00"
                  data-testid="payment-value-input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreatePayment} data-testid="create-payment-button">Registrar Pagamento</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialPage;
