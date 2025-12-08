
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
  CREATE TABLE IF NOT EXISTS tickets ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS knowledge_base ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS system_updates ( id text PRIMARY KEY, data jsonb );
  CREATE TABLE IF NOT EXISTS evaluations ( id text PRIMARY KEY, employee_id text, data jsonb );
  
  -- NIEUW: Recruitment Tabel
  CREATE TABLE IF NOT EXISTS applicants ( id text PRIMARY KEY, data jsonb );

  -- NIEUW: Academy Tabellen (Course Builder)
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

  -- 2. RLS Aanzetten
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  ALTER TABLE news ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
  ALTER TABLE system_updates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academy_courses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;

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

  CREATE POLICY "Notif read" ON notifications FOR ALL USING ( data->>'recipientId' = auth.uid()::text );
  CREATE POLICY "Survey read" ON surveys FOR SELECT USING ( true );
  
  CREATE POLICY "Ticket manager" ON tickets FOR ALL USING ( is_manager() );
  CREATE POLICY "Ticket user" ON tickets FOR SELECT USING ( data->>'submittedById' = auth.uid()::text );
  CREATE POLICY "Ticket create" ON tickets FOR INSERT WITH CHECK ( data->>'submittedById' = auth.uid()::text );

  CREATE POLICY "KB read" ON knowledge_base FOR SELECT USING ( true );
  CREATE POLICY "KB manage" ON knowledge_base FOR ALL USING ( is_manager() );

  CREATE POLICY "Templates manage" ON onboarding_templates FOR ALL USING ( is_manager() );
  CREATE POLICY "Debtors manage" ON debtors FOR ALL USING ( is_manager() );
  CREATE POLICY "System manage" ON system_updates FOR ALL USING ( is_manager() );
  CREATE POLICY "Evaluations manage" ON evaluations FOR ALL USING ( is_manager() );
  
  -- Recruitment Policies
  CREATE POLICY "Applicants manage" ON applicants FOR ALL USING ( is_manager() );

  -- Academy Policies
  -- Iedereen mag cursussen ZIEN (lezen)
  CREATE POLICY "Academy: Iedereen mag cursussen zien" 
  ON academy_courses FOR SELECT 
  USING ( true );

  -- Alleen Managers mogen cursussen MAKEN en BEWERKEN
  CREATE POLICY "Academy: Alleen managers beheren" 
  ON academy_courses FOR ALL 
  USING ( is_manager() );

  -- Medewerkers mogen hun EIGEN voortgang zien
  CREATE POLICY "Progress: Zie eigen voortgang" 
  ON academy_progress FOR SELECT 
  USING ( employee_id = auth.uid()::text );

  -- Medewerkers mogen hun EIGEN voortgang updaten (als ze een les afronden)
  CREATE POLICY "Progress: Update eigen voortgang" 
  ON academy_progress FOR ALL 
  USING ( employee_id = auth.uid()::text );

  -- Managers mogen IEDEREENS voortgang zien (voor rapportages)
  CREATE POLICY "Progress: Managers zien alles" 
  ON academy_progress FOR SELECT 
  USING ( is_manager() );

  -- 5. Realtime aanzetten (Zodat aanpassingen direct zichtbaar zijn bij anderen)
  alter publication supabase_realtime add table academy_courses;
  alter publication supabase_realtime add table academy_progress;
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