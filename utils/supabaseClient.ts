


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
  
  -- Shift Overdracht
  -- UPDATED: Added expiry_date column for history retention
  CREATE TABLE IF NOT EXISTS shift_handover_items (
    id text PRIMARY KEY,
    date date NOT NULL, 
    content text NOT NULL,
    category text NOT NULL, 
    target text, 
    author_name text NOT NULL,
    priority text DEFAULT 'Normal',
    created_at timestamptz DEFAULT now(),
    expiry_date date
  );

  -- Global Settings
  CREATE TABLE IF NOT EXISTS global_settings (
    id text PRIMARY KEY,
    modules jsonb,
    updated_at timestamptz DEFAULT now()
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
  ALTER TABLE shift_handover_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

  -- ================================================================
  -- DEEL 3: FUNCTIES & POLICIES (Reset & Recreate)
  -- ================================================================

  CREATE OR REPLACE FUNCTION is_manager() RETURNS boolean AS $$
  BEGIN
    RETURN EXISTS (SELECT 1 FROM employees WHERE id = auth.uid()::text AND data->>'role' = 'Manager');
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

  -- Shift Handover (Logbook)
  DROP POLICY IF EXISTS "Shift: Iedereen lezen" ON shift_handover_items;
  CREATE POLICY "Shift: Iedereen lezen" ON shift_handover_items FOR SELECT USING ( true );
  DROP POLICY IF EXISTS "Shift: Iedereen schrijven" ON shift_handover_items;
  CREATE POLICY "Shift: Iedereen schrijven" ON shift_handover_items FOR INSERT WITH CHECK ( true );
  DROP POLICY IF EXISTS "Shift: Iedereen updaten" ON shift_handover_items;
  CREATE POLICY "Shift: Iedereen updaten" ON shift_handover_items FOR UPDATE USING ( true );
  DROP POLICY IF EXISTS "Shift: Iedereen verwijderen" ON shift_handover_items;
  CREATE POLICY "Shift: Iedereen verwijderen" ON shift_handover_items FOR DELETE USING ( true );

  -- Global Settings
  DROP POLICY IF EXISTS "Settings: Iedereen lezen" ON global_settings;
  CREATE POLICY "Settings: Iedereen lezen" ON global_settings FOR SELECT USING ( true );
  
  DROP POLICY IF EXISTS "Settings: Managers schrijven" ON global_settings;
  CREATE POLICY "Settings: Managers schrijven" ON global_settings FOR ALL USING ( is_manager() );

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
    shift_handover_items,
    compensation_logs,
    global_settings;
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