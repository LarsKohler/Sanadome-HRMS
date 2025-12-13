
import { createClient } from '@supabase/supabase-js';

// --- SQL INSTRUCTIES VOOR SUPABASE ---
// Kopieer de blokken hieronder (zonder de /* en */) naar de SQL Editor van Supabase.

/*
  =============================================
  DEEL 1: BASIS SETUP (Tabellen & Beveiliging)
  =============================================

  -- 1. Tabellen maken
  CREATE TABLE IF NOT EXISTS employees ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS news ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS notifications ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS surveys ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS onboarding_templates ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS debtors ( id text PRIMARY KEY, data jsonb );
  -- Tickets tabel verwijderd uit setup --
  CREATE TABLE IF NOT EXISTS knowledge_base ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS system_updates ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS evaluations ( id text PRIMARY KEY, employee_id text, data jsonb );
  CREATE TABLE IF NOT EXISTS applicants ( id text PRIMARY KEY, data jsonb );

  -- NIEUW: Academy Tabellen
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

  -- NIEUW: Compensatie & Restitutie Beleid
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
  
  -- NIEUW: Checklist Tabellen
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
  
  CREATE TABLE IF NOT EXISTS global_settings (
    id text PRIMARY KEY,
    modules jsonb,
    updated_at timestamptz DEFAULT now()
  );

  -- 2. RLS Aanzetten
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

  -- 3. Manager Check Functie
  CREATE OR REPLACE FUNCTION is_manager() RETURNS boolean AS $$
  BEGIN
    RETURN EXISTS (SELECT 1 FROM employees WHERE id = auth.uid()::text AND data->>'role' = 'Manager');
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 4. Policies
  CREATE POLICY "Managers all" ON employees FOR ALL USING ( is_manager() );
  CREATE POLICY "Emp read own" ON employees FOR SELECT USING ( id = auth.uid()::text );
  CREATE POLICY "Emp update own" ON employees FOR UPDATE USING ( id = auth.uid()::text );
  CREATE POLICY "Public login" ON employees FOR SELECT USING ( true ); 

  CREATE POLICY "News read" ON news FOR SELECT USING ( true );
  CREATE POLICY "News manage" ON news FOR ALL USING ( is_manager() );

  -- CRITICAL FIX FOR NOTIFICATIONS: 
  -- Allow everyone to INSERT (send) notifications to anyone.
  -- Allow users to SELECT (read) only their own notifications.
  CREATE POLICY "Notif insert any" ON notifications FOR INSERT WITH CHECK ( true );
  CREATE POLICY "Notif read own" ON notifications FOR SELECT USING ( data->>'recipientId' = auth.uid()::text );
  CREATE POLICY "Notif update own" ON notifications FOR UPDATE USING ( data->>'recipientId' = auth.uid()::text );
  CREATE POLICY "Notif delete own" ON notifications FOR DELETE USING ( data->>'recipientId' = auth.uid()::text );

  CREATE POLICY "Survey read" ON surveys FOR SELECT USING ( true );
  
  CREATE POLICY "KB read" ON knowledge_base FOR SELECT USING ( true );
  CREATE POLICY "KB manage" ON knowledge_base FOR ALL USING ( is_manager() );

  CREATE POLICY "Templates manage" ON onboarding_templates FOR ALL USING ( is_manager() );
  CREATE POLICY "Debtors manage" ON debtors FOR ALL USING ( is_manager() );
  CREATE POLICY "System manage" ON system_updates FOR ALL USING ( is_manager() );
  CREATE POLICY "Evaluations manage" ON evaluations FOR ALL USING ( is_manager() );
  
  CREATE POLICY "Applicants manage" ON applicants FOR ALL USING ( is_manager() );

  -- Academy Policies
  CREATE POLICY "Academy: Iedereen mag cursussen zien" ON academy_courses FOR SELECT USING ( true );
  CREATE POLICY "Academy: Alleen managers beheren" ON academy_courses FOR ALL USING ( is_manager() );
  CREATE POLICY "Progress: Zie eigen voortgang" ON academy_progress FOR SELECT USING ( employee_id = auth.uid()::text );
  CREATE POLICY "Progress: Update eigen voortgang" ON academy_progress FOR ALL USING ( employee_id = auth.uid()::text );
  CREATE POLICY "Progress: Managers zien alles" ON academy_progress FOR SELECT USING ( is_manager() );

  -- Compensation Policies
  CREATE POLICY "Compensation: Iedereen mag lezen" ON compensation_policies FOR SELECT USING ( true );
  CREATE POLICY "Compensation: Alleen managers beheren" ON compensation_policies FOR ALL USING ( is_manager() );
  
  -- Compensation Logs
  CREATE POLICY "Logs: Iedereen mag schrijven" ON compensation_logs FOR INSERT WITH CHECK ( true );
  CREATE POLICY "Logs: Iedereen mag lezen" ON compensation_logs FOR SELECT USING ( true );
  CREATE POLICY "Logs: Alleen managers beheren" ON compensation_logs FOR DELETE USING ( is_manager() );

  -- Checklists
  CREATE POLICY "Checklist Tpl: Iedereen lezen" ON checklist_templates FOR SELECT USING ( true );
  CREATE POLICY "Checklist Tpl: Managers beheren" ON checklist_templates FOR ALL USING ( is_manager() );
  CREATE POLICY "Checklist Sub: Iedereen lezen/schrijven" ON checklist_submissions FOR ALL USING ( true );

  -- Global Settings
  CREATE POLICY "Settings: Iedereen lezen" ON global_settings FOR SELECT USING ( true );
  CREATE POLICY "Settings: Managers schrijven" ON global_settings FOR ALL USING ( is_manager() );

  -- 5. Realtime aanzetten
  alter publication supabase_realtime add table academy_courses;
  alter publication supabase_realtime add table academy_progress;
  alter publication supabase_realtime add table compensation_policies;
  alter publication supabase_realtime add table compensation_logs;
  alter publication supabase_realtime add table checklist_templates;
  alter publication supabase_realtime add table checklist_submissions;
  alter publication supabase_realtime add table global_settings;
  alter publication supabase_realtime add table notifications;
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
