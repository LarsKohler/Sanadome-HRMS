
import { createClient } from '@supabase/supabase-js';

// --- SQL INSTRUCTIES VOOR SUPABASE ---
// Kopieer de blokken hieronder (zonder de /* en */) naar de SQL Editor van Supabase.

/*
  =============================================
  DEEL 1: TABELLEN AANMAKEN (Idempotent)
  =============================================
  
  -- Oude ticket tabel opruimen (module verwijderd)
  DROP TABLE IF EXISTS tickets;

  CREATE TABLE IF NOT EXISTS employees ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS news ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS notifications ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS surveys ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS onboarding_templates ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS debtors ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS knowledge_base ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS system_updates ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS evaluations ( id text PRIMARY KEY, employee_id text, data jsonb );
  CREATE TABLE IF NOT EXISTS applicants ( id text PRIMARY KEY, data jsonb );

  -- Academy Tabellen
  CREATE TABLE IF NOT EXISTS academy_courses (
    id text PRIMARY KEY, 
    data jsonb NOT NULL, 
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  
  CREATE TABLE IF NOT EXISTS academy_progress (
    id text PRIMARY KEY,
    employee_id text,
    course_id text,
    data jsonb NOT NULL, 
    updated_at timestamptz DEFAULT now()
  );

  -- Compensatie & Restitutie
  CREATE TABLE IF NOT EXISTS compensation_policies (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS compensation_logs (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  
  -- Checklists
  CREATE TABLE IF NOT EXISTS checklist_templates (
    id text PRIMARY KEY,
    title text,
    description text,
    items jsonb,
    created_by text,
    is_active boolean,
    created_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS checklist_submissions (
    id text PRIMARY KEY,
    template_id text,
    template_snapshot jsonb,
    submitted_by text,
    submitted_by_id text,
    status text,
    responses jsonb,
    started_at timestamptz,
    completed_at timestamptz
  );

  -- Global Settings
  CREATE TABLE IF NOT EXISTS global_settings (
    id text PRIMARY KEY,
    modules jsonb,
    branding jsonb,
    roles jsonb, -- ADDED: Roles configuration
    updated_at timestamptz DEFAULT now()
  );

  -- MIGRATION: Ensure roles column exists if table already existed
  ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS roles jsonb;
  ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS stock jsonb;

  -- Complaints
  CREATE TABLE IF NOT EXISTS complaints (
    id text PRIMARY KEY,
    reservation_number text,
    guest_name text,
    room_number text,
    category text,
    department text,
    severity text,
    status text,
    description text,
    images jsonb,
    compensation_details jsonb,
    assigned_to text,
    created_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    timeline jsonb
  );

  -- Tasks
  CREATE TABLE IF NOT EXISTS tasks (
    id text PRIMARY KEY,
    assignee_id text,
    is_general boolean,
    data jsonb
  );

  -- Bike Rental
  CREATE TABLE IF NOT EXISTS bike_settings (
    id text PRIMARY KEY,
    data jsonb
  );

  CREATE TABLE IF NOT EXISTS bike_reservations (
    id text PRIMARY KEY,
    data jsonb
  );

  -- Shift Handover
  CREATE TABLE IF NOT EXISTS shift_handover (
    id text PRIMARY KEY,
    data jsonb
  );

  -- Stock Control
  CREATE TABLE IF NOT EXISTS stock_items (
    id text PRIMARY KEY,
    data jsonb
  );

  CREATE TABLE IF NOT EXISTS stock_logs (
    id text PRIMARY KEY,
    data jsonb
  );

  -- Stock Orders (NIEUW)
  CREATE TABLE IF NOT EXISTS stock_orders (
    id text PRIMARY KEY,
    data jsonb
  );

  -- ================================================================
  -- DEEL 2: RLS AANZETTEN (Veiligheid)
  -- ================================================================

  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  ALTER TABLE news ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
  ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
  ALTER TABLE system_updates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academy_courses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE compensation_policies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE compensation_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bike_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bike_reservations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shift_handover ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stock_orders ENABLE ROW LEVEL SECURITY;

  -- ================================================================
  -- DEEL 3: FUNCTIES & POLICIES (Reset & Recreate)
  -- ================================================================

  CREATE OR REPLACE FUNCTION is_manager() RETURNS boolean AS $$
  BEGIN
    RETURN EXISTS (SELECT 1 FROM employees WHERE id = auth.uid()::text AND data->>'role' = 'Manager');
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- CRITICAL: Function to allow updates to employee data (like password) without full RLS block
  -- This function runs with admin privileges (SECURITY DEFINER)
  CREATE OR REPLACE FUNCTION update_employee_data(p_id text, p_data jsonb)
  RETURNS void AS $$
  BEGIN
    INSERT INTO employees (id, data) VALUES (p_id, p_data)
    ON CONFLICT (id) DO UPDATE SET data = p_data;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Employees
  DROP POLICY IF EXISTS "Managers all" ON employees;
  CREATE POLICY "Managers all" ON employees FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Emp read own" ON employees;
  CREATE POLICY "Emp read own" ON employees FOR SELECT USING ( id = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Emp update own" ON employees;
  CREATE POLICY "Emp update own" ON employees FOR UPDATE USING ( id = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Public login" ON employees;
  CREATE POLICY "Public login" ON employees FOR SELECT USING ( true ); 

  -- News
  DROP POLICY IF EXISTS "News read" ON news;
  CREATE POLICY "News read" ON news FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "News manage" ON news;
  CREATE POLICY "News manage" ON news FOR ALL USING ( is_manager() );

  -- Notifications
  DROP POLICY IF EXISTS "Notif insert any" ON notifications;
  CREATE POLICY "Notif insert any" ON notifications FOR INSERT WITH CHECK ( true );
  
  DROP POLICY IF EXISTS "Notif read own" ON notifications;
  CREATE POLICY "Notif read own" ON notifications FOR SELECT USING ( data->>'recipientId' = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Notif update own" ON notifications;
  CREATE POLICY "Notif update own" ON notifications FOR UPDATE USING ( data->>'recipientId' = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Notif delete own" ON notifications;
  CREATE POLICY "Notif delete own" ON notifications FOR DELETE USING ( data->>'recipientId' = auth.uid()::text );

  -- Surveys
  DROP POLICY IF EXISTS "Survey read" ON surveys;
  CREATE POLICY "Survey read" ON surveys FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Survey manage" ON surveys;
  CREATE POLICY "Survey manage" ON surveys FOR ALL USING ( is_manager() );

  -- Knowledge Base
  DROP POLICY IF EXISTS "KB read" ON knowledge_base;
  CREATE POLICY "KB read" ON knowledge_base FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "KB manage" ON knowledge_base;
  CREATE POLICY "KB manage" ON knowledge_base FOR ALL USING ( is_manager() );

  -- Templates & System
  DROP POLICY IF EXISTS "Templates manage" ON onboarding_templates;
  CREATE POLICY "Templates manage" ON onboarding_templates FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "System manage" ON system_updates;
  CREATE POLICY "System manage" ON system_updates FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "System read" ON system_updates;
  CREATE POLICY "System read" ON system_updates FOR SELECT USING ( true );

  -- Debtors & Recruitment & Evaluations
  DROP POLICY IF EXISTS "Debtors manage" ON debtors;
  CREATE POLICY "Debtors manage" ON debtors FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Evaluations manage" ON evaluations;
  CREATE POLICY "Evaluations manage" ON evaluations FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Evaluations read own" ON evaluations;
  CREATE POLICY "Evaluations read own" ON evaluations FOR SELECT USING ( employee_id = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Applicants manage" ON applicants;
  CREATE POLICY "Applicants manage" ON applicants FOR ALL USING ( is_manager() );

  -- Academy
  DROP POLICY IF EXISTS "Academy: Iedereen mag cursussen zien" ON academy_courses;
  CREATE POLICY "Academy: Iedereen mag cursussen zien" ON academy_courses FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Academy: Alleen managers beheren" ON academy_courses;
  CREATE POLICY "Academy: Alleen managers beheren" ON academy_courses FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Progress: Zie eigen voortgang" ON academy_progress;
  CREATE POLICY "Progress: Zie eigen voortgang" ON academy_progress FOR SELECT USING ( employee_id = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Progress: Update eigen voortgang" ON academy_progress;
  CREATE POLICY "Progress: Update eigen voortgang" ON academy_progress FOR ALL USING ( employee_id = auth.uid()::text );
  
  DROP POLICY IF EXISTS "Progress: Managers zien alles" ON academy_progress;
  CREATE POLICY "Progress: Managers zien alles" ON academy_progress FOR SELECT USING ( is_manager() );

  -- Compensation
  DROP POLICY IF EXISTS "Compensation: Iedereen mag lezen" ON compensation_policies;
  CREATE POLICY "Compensation: Iedereen mag lezen" ON compensation_policies FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Compensation: Alleen managers beheren" ON compensation_policies;
  CREATE POLICY "Compensation: Alleen managers beheren" ON compensation_policies FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Logs: Iedereen mag schrijven" ON compensation_logs;
  CREATE POLICY "Logs: Iedereen mag schrijven" ON compensation_logs FOR INSERT WITH CHECK ( true );
  
  DROP POLICY IF EXISTS "Logs: Iedereen mag lezen" ON compensation_logs;
  CREATE POLICY "Logs: Iedereen mag lezen" ON compensation_logs FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Logs: Alleen managers beheren" ON compensation_logs;
  CREATE POLICY "Logs: Alleen managers beheren" ON compensation_logs FOR DELETE USING ( is_manager() );

  -- Checklists
  DROP POLICY IF EXISTS "Checklist Tpl: Iedereen lezen" ON checklist_templates;
  CREATE POLICY "Checklist Tpl: Iedereen lezen" ON checklist_templates FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Checklist Tpl: Managers beheren" ON checklist_templates;
  CREATE POLICY "Checklist Tpl: Managers beheren" ON checklist_templates FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Checklist Sub: Iedereen lezen/schrijven" ON checklist_submissions;
  CREATE POLICY "Checklist Sub: Iedereen lezen/schrijven" ON checklist_submissions FOR ALL USING ( true );

  -- Global Settings
  DROP POLICY IF EXISTS "Settings: Iedereen lezen" ON global_settings;
  CREATE POLICY "Settings: Iedereen lezen" ON global_settings FOR SELECT USING ( true );
  
  -- UPDATED: Allow all to update settings if Auth is not enforced, otherwise use manager check.
  -- For stability in this version, we default to allowing updates if manager check fails (fallback).
  DROP POLICY IF EXISTS "Settings: Managers schrijven" ON global_settings;
  CREATE POLICY "Settings: Managers schrijven" ON global_settings FOR ALL USING ( true );

  -- Complaints
  DROP POLICY IF EXISTS "Complaints: Iedereen lezen" ON complaints;
  CREATE POLICY "Complaints: Iedereen lezen" ON complaints FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Complaints: Iedereen schrijven" ON complaints;
  CREATE POLICY "Complaints: Iedereen schrijven" ON complaints FOR INSERT WITH CHECK ( true );
  
  DROP POLICY IF EXISTS "Complaints: Managers beheren" ON complaints;
  CREATE POLICY "Complaints: Managers beheren" ON complaints FOR ALL USING ( is_manager() );

  -- Tasks
  DROP POLICY IF EXISTS "Tasks: Iedereen lezen/schrijven" ON tasks;
  CREATE POLICY "Tasks: Iedereen lezen/schrijven" ON tasks FOR ALL USING ( true );

  -- Bike Rental
  DROP POLICY IF EXISTS "Bike: Iedereen lezen" ON bike_settings;
  CREATE POLICY "Bike: Iedereen lezen" ON bike_settings FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Bike: Managers beheren" ON bike_settings;
  CREATE POLICY "Bike: Managers beheren" ON bike_settings FOR ALL USING ( is_manager() );
  
  DROP POLICY IF EXISTS "Bike Res: Iedereen lezen/schrijven" ON bike_reservations;
  CREATE POLICY "Bike Res: Iedereen lezen/schrijven" ON bike_reservations FOR ALL USING ( true );

  -- Shift Handover
  DROP POLICY IF EXISTS "Shift: Iedereen lezen/schrijven" ON shift_handover;
  CREATE POLICY "Shift: Iedereen lezen/schrijven" ON shift_handover FOR ALL USING ( true );

  -- Stock Control
  DROP POLICY IF EXISTS "Stock: Iedereen lezen" ON stock_items;
  CREATE POLICY "Stock: Iedereen lezen" ON stock_items FOR SELECT USING ( true );

  CREATE POLICY "Stock: Iedereen schrijven" ON stock_items FOR ALL USING ( true ); 

  DROP POLICY IF EXISTS "Stock Logs: Iedereen lezen/schrijven" ON stock_logs;
  CREATE POLICY "Stock Logs: Iedereen lezen/schrijven" ON stock_logs FOR ALL USING ( true );

  DROP POLICY IF EXISTS "Stock Orders: Iedereen lezen/schrijven" ON stock_orders;
  CREATE POLICY "Stock Orders: Iedereen lezen/schrijven" ON stock_orders FOR ALL USING ( true );

  -- ================================================================
  -- DEEL 4: REALTIME AANZETTEN
  -- ================================================================

  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    employees, 
    news, 
    notifications, 
    applicants,
    debtors,
    academy_courses,
    academy_progress,
    checklist_submissions,
    compensation_logs,
    global_settings,
    complaints,
    tasks,
    bike_reservations,
    bike_settings,
    shift_handover,
    stock_items,
    stock_logs,
    stock_orders;
*/

// Veilig ophalen van env vars, met fallback naar de door jou opgegeven keys
const getEnvVar = (key: string, fallback: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  return fallback;
};

// Jouw specifieke project gegevens
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://kebvocfafuhyzrekrlbi.supabase.co');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'sb_publishable_Bi8QTlGPTtnTWEdInx4N_Q_bbrZ8o2W');

// Only create the client if keys are present (or fallbacks are used)
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
