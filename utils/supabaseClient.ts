
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
*/

/*
  =============================================
  DEEL 2: AUTOMATISCHE USER AANMAAK (RPC)
  =============================================

  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE OR REPLACE FUNCTION admin_create_user(
    new_email text,
    new_password text,
    new_id uuid
  ) RETURNS void AS $$
  BEGIN
    IF NOT is_manager() THEN
      RAISE EXCEPTION 'Access Denied: Only Managers can create users.';
    END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated',
      'authenticated',
      new_email,
      crypt(new_password, gen_salt('bf')),
      now(), NULL, NULL,
      '{"provider":"email","providers":["email"]}', '{}',
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_id,
      format('{"sub":"%s","email":"%s"}', new_id::text, new_email)::jsonb,
      'email',
      new_id::text, -- Fix: provider_id is mandatory
      now(),
      now()
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
*/

/*
  =============================================
  DEEL 3: AUTOMATISCHE USER VERWIJDERING (RPC)
  =============================================
  -- Voer dit uit om te zorgen dat gebruikers ook uit Auth verwijderd worden.

  CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
  RETURNS void AS $$
  BEGIN
    -- 1. Veiligheidscheck
    IF NOT is_manager() THEN
      RAISE EXCEPTION 'Access Denied: Only Managers can delete users.';
    END IF;

    -- 2. Verwijder data
    DELETE FROM public.employees WHERE id = target_user_id::text;

    -- 3. Verwijder Auth user
    DELETE FROM auth.users WHERE id = target_user_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
*/

/*
  =============================================
  DEEL 4: SECURITY AUDIT TOOL
  =============================================
  
  CREATE OR REPLACE FUNCTION get_table_security_stats()
  RETURNS TABLE(table_name text, rls_enabled boolean) AS $$
  BEGIN
      RETURN QUERY
      SELECT c.relname::text, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r';
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
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
