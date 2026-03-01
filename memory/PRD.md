# CRM SaaS Multi-tenant - PRD

## Problema Original
Criar um CRM SaaS genérico, inspirado no Ploomes, com arquitetura escalável, multi-tenant e preparado para venda por assinatura. Sistema moderno, responsivo, com tema claro/escuro e autenticação Google OAuth.

## Arquitetura

### Stack Técnica
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Google OAuth manual
- **IA**: OpenAI (key do usuário)
- **Pagamentos**: Mercado Pago (MOCKADO)

### Estrutura Multi-tenant
- Todas tabelas possuem `tenant_id`
- RLS (Row Level Security) configurado
- Perfis: super_admin, admin_empresa, vendedor, visualizador

## O que foi implementado

### Data: 24/02/2026

#### Backend (FastAPI + Supabase)
- [x] Configuração Supabase completa
- [x] Autenticação Google OAuth
- [x] JWT tokens para sessões
- [x] CRUD completo para: tenants, users, leads, activities, deals, invoices, payments
- [x] Pipeline stages com Kanban support
- [x] WhatsApp conversations (MOCKADO)
- [x] Dashboard stats endpoint
- [x] IA endpoints: lead-score, suggest-followup, detect-bottlenecks
- [x] Super Admin endpoints

#### Frontend (React + shadcn/ui)
- [x] Login com Google OAuth
- [x] Tema dark/light com detecção automática
- [x] Dashboard com KPIs e gráficos (Recharts)
- [x] Pipeline Kanban drag-and-drop (@dnd-kit)
- [x] Lista de Leads com ações IA
- [x] WhatsApp Inbox (MOCKADO)
- [x] Calendário de Atividades
- [x] Módulo Financeiro (Deals, Faturas, Pagamentos)
- [x] Relatórios com exportação MBR
- [x] Configurações do usuário/empresa
- [x] Super Admin Panel
- [x] Sidebar responsiva

### Integrações
- [x] Google OAuth (manual)
- [x] Supabase PostgreSQL
- [ ] OpenAI (configurado, não testado com IA real)
- [ ] Mercado Pago (MOCKADO)
- [ ] WhatsApp Real (MOCKADO)

## User Personas

### Admin da Empresa
- Gerencia leads e pipeline
- Acessa relatórios
- Configura usuários

### Vendedor
- Trabalha no Kanban
- Registra atividades
- Usa WhatsApp inbox

### Super Admin
- Gerencia todas empresas
- Define planos
- Monitora uso

## Backlog Priorizado

### P0 (Crítico)
- [ ] Executar schema.sql no Supabase
- [ ] Configurar URLs OAuth no Google Console

### P1 (Importante)
- [ ] Integração OpenAI real para lead scoring
- [ ] Mercado Pago real para assinaturas
- [ ] Webhooks para n8n

### P2 (Desejável)
- [ ] WhatsApp real integration
- [ ] 2FA authentication
- [ ] Backup automático
- [ ] Treinamento sugerido por gargalo

## Próximos Passos

1. Executar `/app/database/schema.sql` no Supabase SQL Editor
2. Configurar no Google Cloud Console:
   - Authorized JavaScript Origins: `https://sales-vault-5.preview.emergentagent.com`
   - Authorized redirect URIs: `https://sales-vault-5.preview.emergentagent.com/auth/google`
3. Testar login com conta Google
4. Implementar Mercado Pago real quando tiver credenciais
