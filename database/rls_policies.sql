-- RLS POLICIES - Execute no Supabase SQL Editor
-- Estas políticas permitem que o service_role (backend) acesse todas as tabelas

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can do all on tenants" ON tenants;
DROP POLICY IF EXISTS "Service role can do all on users" ON users;
DROP POLICY IF EXISTS "Service role can do all on pipeline_stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Service role can do all on leads" ON leads;
DROP POLICY IF EXISTS "Service role can do all on activities" ON activities;
DROP POLICY IF EXISTS "Service role can do all on deals" ON deals;
DROP POLICY IF EXISTS "Service role can do all on invoices" ON invoices;
DROP POLICY IF EXISTS "Service role can do all on payments" ON payments;
DROP POLICY IF EXISTS "Service role can do all on whatsapp_conversations" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Service role can do all on kpis" ON kpis;
DROP POLICY IF EXISTS "Service role can do all on automation_logs" ON automation_logs;
DROP POLICY IF EXISTS "Service role can do all on audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can do all on subscriptions" ON subscriptions;

-- Create policies for service_role to bypass RLS
-- Tenants
CREATE POLICY "Service role full access tenants" ON tenants
    FOR ALL USING (true) WITH CHECK (true);

-- Users
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Pipeline Stages
CREATE POLICY "Service role full access pipeline_stages" ON pipeline_stages
    FOR ALL USING (true) WITH CHECK (true);

-- Leads
CREATE POLICY "Service role full access leads" ON leads
    FOR ALL USING (true) WITH CHECK (true);

-- Activities
CREATE POLICY "Service role full access activities" ON activities
    FOR ALL USING (true) WITH CHECK (true);

-- Deals
CREATE POLICY "Service role full access deals" ON deals
    FOR ALL USING (true) WITH CHECK (true);

-- Invoices
CREATE POLICY "Service role full access invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY "Service role full access payments" ON payments
    FOR ALL USING (true) WITH CHECK (true);

-- WhatsApp Conversations
CREATE POLICY "Service role full access whatsapp_conversations" ON whatsapp_conversations
    FOR ALL USING (true) WITH CHECK (true);

-- KPIs
CREATE POLICY "Service role full access kpis" ON kpis
    FOR ALL USING (true) WITH CHECK (true);

-- Automation Logs
CREATE POLICY "Service role full access automation_logs" ON automation_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Audit Logs
CREATE POLICY "Service role full access audit_logs" ON audit_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions
CREATE POLICY "Service role full access subscriptions" ON subscriptions
    FOR ALL USING (true) WITH CHECK (true);
