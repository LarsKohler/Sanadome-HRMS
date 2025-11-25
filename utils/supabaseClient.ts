
import { createClient } from '@supabase/supabase-js';

// --- SQL SETUP INSTRUCTIONS ---
// Kopieer onderstaande SQL regels naar je Supabase SQL Editor:

// -- 1. Create Employees Table
// create table if not exists employees (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// );

// -- 2. Create News Table
// create table if not exists news (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// );

// -- 3. Create Notifications Table
// create table if not exists notifications (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// );

// -- 4. Create Surveys Table
// create table if not exists surveys (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// );

// -- 5. Create Onboarding Templates Table
// create table if not exists onboarding_templates (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// );

// -- 6. Create Debtors Table
// create table if not exists debtors (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// );

// -- 7. Enable Realtime
// alter publication supabase_realtime add table employees, news, notifications, surveys, onboarding_templates, debtors;

// -- 8. Enable Delete Policy for Debtors (Cruciaal voor verwijderen!)
// create policy "Enable delete access for all users" on debtors for delete using (true);

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
