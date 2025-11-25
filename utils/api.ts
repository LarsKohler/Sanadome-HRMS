
import { supabase } from './supabaseClient';
import { storage } from './storage'; // Fallback
import { Employee, NewsPost, Notification, Survey, OnboardingTemplate, SystemUpdateLog, OnboardingTask, Debtor } from '../types';
import { MOCK_EMPLOYEES, MOCK_NEWS, MOCK_TEMPLATES, MOCK_SYSTEM_LOGS } from './mockData';

// This API layer decides whether to use Supabase (if configured) or LocalStorage (fallback)
// We explicitely check if supabase is not null
export const isLive = !!supabase;

// Helper to generate fresh tasks for demo users
const generateDemoTasks = (): OnboardingTask[] => [
  { id: 'd-1', week: 1, category: 'Introductie', title: 'Rondleiding Hotel & Spa', description: 'Volledige rondleiding door faciliteiten.', completed: true, score: 100, completedBy: 'System', completedDate: 'Vandaag' },
  { id: 'd-2', week: 1, category: 'IT', title: 'IDu PMS Training', description: 'Basisnavigatie in het systeem.', completed: true, score: 100, completedBy: 'System', completedDate: 'Vandaag' },
  { id: 'd-3', week: 2, category: 'Front Office', title: 'Check-in Procedure', description: 'Gasten ontvangen en registreren.', completed: false, score: 0 },
  { id: 'd-4', week: 3, category: 'Financieel', title: 'Kassa Afsluiting', description: 'Procedure voor einde dienst.', completed: false, score: 0 },
];

export const api = {
  // --- DIRECT LOGIN (SUPABASE ONLY) ---
  loginUser: async (email: string, password: string): Promise<Employee | null> => {
      if (!isLive || !supabase) {
          // Fallback for local dev without Supabase
          const employees = storage.getEmployees();
          // For local pending users, allow logic if needed, but usually stricter
          return employees.find(e => e.email.toLowerCase() === email.toLowerCase() && (e.password === password || e.accountStatus === 'Pending')) || null;
      }

      try {
          // Query Supabase directly for the email inside the JSONB 'data' column
          // Note: We use ->> to get the value as text
          const { data, error } = await supabase
              .from('employees')
              .select('data')
              .eq('data->>email', email) // Exact match on email (Supabase is case sensitive usually, but email should be stored consistently)
              .single();

          if (error || !data) {
              console.warn("Login query failed or user not found:", error);
              // Retry with lowercase just in case
              const { data: dataLower, error: errorLower } = await supabase
                .from('employees')
                .select('data')
                .ilike('data->>email', email) // Case insensitive match
                .single();
                
              if(errorLower || !dataLower) return null;
              
              const emp = dataLower.data as Employee;
              
              // CRITICAL CHANGE: Allow Pending users to proceed to Welcome Flow without password check
              if (emp.accountStatus === 'Pending') {
                  return emp;
              }

              if (emp.password === password) return emp;
              return null;
          }

          const emp = data.data as Employee;
          
          // CRITICAL CHANGE: Allow Pending users to proceed to Welcome Flow without password check
          if (emp.accountStatus === 'Pending') {
              return emp;
          }
          
          // Verify password for Active users
          if (emp.password === password) {
              return emp;
          }
          
          console.warn("Password mismatch for user:", email);
          return null;

      } catch (e) {
          console.error("Login exception:", e);
          return null;
      }
  },

  // --- DEMO USER GENERATOR ---
  createDemoUser: async (role: 'Manager' | 'Medewerker'): Promise<{email: string, password: string}> => {
      const rand = Math.floor(Math.random() * 10000);
      const email = role === 'Manager' ? `demo.manager.${rand}@sanadome.nl` : `demo.user.${rand}@sanadome.nl`;
      const password = 'demo';
      const name = role === 'Manager' ? `Demo Manager ${rand}` : `Demo Medewerker ${rand}`;
      
      const newEmployee: Employee = {
          id: `demo-${rand}`,
          name: name,
          role: role,
          department: role === 'Manager' ? 'Management' : 'Front Office',
          location: 'Nijmegen',
          avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${role === 'Manager' ? '0d9488' : '2563eb'}&color=fff`,
          email: email,
          password: password,
          phone: '+31 6 1234 5678',
          linkedin: name,
          hiredOn: new Date().toLocaleDateString('nl-NL'),
          employmentType: 'Full-Time',
          accountStatus: 'Active',
          onboardingStatus: role === 'Manager' ? 'Completed' : 'Active',
          leaveBalances: [
              { type: 'Annual Leave', entitled: 25, taken: 0 },
              { type: 'Sick Leave', entitled: 10, taken: 0 },
              { type: 'Without Pay', entitled: 0, taken: 0 }
          ],
          leaveRequests: [],
          documents: [],
          notes: [],
          onboardingTasks: role === 'Manager' ? [] : generateDemoTasks(),
          evaluations: [],
          // Managers get full permissions, Employees get defaults
          customPermissions: role === 'Manager' ? [
            'VIEW_REPORTS', 'MANAGE_EMPLOYEES', 'MANAGE_DOCUMENTS', 
            'VIEW_ALL_DOCUMENTS', 'CREATE_NEWS', 'MANAGE_ONBOARDING', 
            'MANAGE_SURVEYS', 'VIEW_SYSTEM_STATUS', 'MANAGE_SETTINGS', 
            'MANAGE_EVALUATIONS', 'MANAGE_DEBTORS'
          ] : undefined
      };

      await api.saveEmployee(newEmployee);
      return { email, password };
  },

  // --- UTILS ---
  seedDatabase: async () => {
    if (!isLive || !supabase) return;
    
    console.log("Starting database seed...");

    // 1. Seed Employees
    const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });
    if (empCount === 0) {
        console.log("Seeding employees...");
        // Use direct MOCK_EMPLOYEES to ensure we have data even if localStorage is empty
        const { error } = await supabase.from('employees').insert(
            MOCK_EMPLOYEES.map(e => ({ id: e.id, data: e }))
        );
        if (error) console.error("Error seeding employees:", error);
    }

    // 2. Seed News
    const { count: newsCount } = await supabase.from('news').select('*', { count: 'exact', head: true });
    if (newsCount === 0) {
        console.log("Seeding news...");
        const { error } = await supabase.from('news').insert(
            MOCK_NEWS.map(n => ({ id: n.id, data: n }))
        );
        if (error) console.error("Error seeding news:", error);
    }

    // 3. Seed Surveys (using storage default getter which returns mock survey)
    const { count: surveyCount } = await supabase.from('surveys').select('*', { count: 'exact', head: true });
    if (surveyCount === 0) {
        console.log("Seeding surveys...");
        const defaultSurveys = storage.getSurveys();
        const { error } = await supabase.from('surveys').insert(
            defaultSurveys.map(s => ({ id: s.id, data: s }))
        );
        if (error) console.error("Error seeding surveys:", error);
    }

    // 4. Seed Templates
    const { count: templateCount } = await supabase.from('onboarding_templates').select('*', { count: 'exact', head: true });
    if (templateCount === 0) {
        console.log("Seeding templates...");
        const { error } = await supabase.from('onboarding_templates').insert(
            MOCK_TEMPLATES.map(t => ({ id: t.id, data: t }))
        );
        if (error) console.error("Error seeding templates:", error);
    }

    // 5. Seed System Logs
    const { count: logsCount } = await supabase.from('system_updates').select('*', { count: 'exact', head: true });
    if (logsCount === 0) {
        console.log("Seeding system logs...");
        const { error } = await supabase.from('system_updates').insert(
            MOCK_SYSTEM_LOGS.map(l => ({ id: l.id, data: l }))
        );
        if (error) console.error("Error seeding logs:", error);
    }
    
    console.log("Database seed completed.");
  },

  uploadFile: async (file: File, bucket: string = 'hrms-storage'): Promise<string | null> => {
    if (isLive && supabase) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
      } catch (e) {
        console.error('Upload exception:', e);
        return null;
      }
    }
    // Fallback for local testing
    return URL.createObjectURL(file);
  },

  deleteFile: async (fullUrl: string, bucket: string = 'hrms-storage') => {
    if (isLive && supabase && fullUrl) {
        try {
            if (fullUrl.includes(bucket)) {
                const parts = fullUrl.split(`${bucket}/`);
                if (parts.length > 1) {
                    const filePath = parts[1]; 
                    
                    const { error } = await supabase.storage
                        .from(bucket)
                        .remove([filePath]);
                    
                    if (error) {
                        console.error("Error deleting file:", error);
                    } else {
                        console.log("Old file deleted successfully:", filePath);
                    }
                }
            }
        } catch (e) {
            console.error("Delete exception:", e);
        }
    }
  },

  // --- EMPLOYEES ---
  getEmployees: async (): Promise<Employee[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('employees').select('data');
        
        if (!error && data && data.length > 0) {
            return data.map((row: any) => row.data);
        }
        
        // If table is empty, attempt to seed it immediately
        if (data?.length === 0) {
           console.log("Employees table empty, attempting auto-seed...");
           await api.seedDatabase();
           return MOCK_EMPLOYEES;
        }
      } catch (e) {
        console.warn("Supabase connection failed, falling back to local storage", e);
        return storage.getEmployees();
      }
    }
    return storage.getEmployees();
  },

  saveEmployee: async (employee: Employee): Promise<boolean> => {
    if (isLive && supabase) {
      try {
          // Important: Supabase might block updates via RLS if policies aren't set up for Anon key.
          // We attempt the update.
          const { data, error } = await supabase
            .from('employees')
            .upsert({ id: employee.id, data: employee })
            .select()
            .single();

          if (error) {
              console.error('Supabase Save Error:', error);
              return false;
          }
          
          if (!data) {
              console.error("Update failed: No data returned. Likely RLS blocking update.");
              return false;
          }

          return true;
      } catch (e) {
          console.error("Exception in saveEmployee:", e);
          return false;
      }
    } else {
      const current = storage.getEmployees();
      const index = current.findIndex(e => e.id === employee.id);
      if (index >= 0) current[index] = employee;
      else current.push(employee);
      storage.saveEmployees(current);
      return true;
    }
  },

  deleteEmployee: async (id: string) => {
    if (isLive && supabase) {
        await supabase.from('employees').delete().eq('id', id);
    } else {
        const current = storage.getEmployees();
        const filtered = current.filter(e => e.id !== id);
        storage.saveEmployees(filtered);
    }
  },

  // --- NEWS ---
  getNews: async (): Promise<NewsPost[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('news').select('data');
        if (!error && data && data.length > 0) return data.map((row: any) => row.data);
        
        if (data?.length === 0) return MOCK_NEWS; 
      } catch (e) {
        return storage.getNews();
      }
    }
    return storage.getNews();
  },

  saveNewsPost: async (post: NewsPost) => {
    if (isLive && supabase) {
      await supabase.from('news').upsert({ id: post.id, data: post });
    } else {
      const current = storage.getNews();
      storage.saveNews([post, ...current]);
    }
  },

  updateNewsPost: async (post: NewsPost) => {
    if (isLive && supabase) {
      await supabase.from('news').upsert({ id: post.id, data: post });
    } else {
      const current = storage.getNews();
      const updated = current.map(n => n.id === post.id ? post : n);
      storage.saveNews(updated);
    }
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (): Promise<Notification[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('notifications').select('data');
        if (!error && data) return data.map((row: any) => row.data);
      } catch (e) {
        return storage.getNotifications();
      }
    }
    return storage.getNotifications();
  },

  saveNotification: async (notification: Notification) => {
    if (isLive && supabase) {
      await supabase.from('notifications').insert({ id: notification.id, data: notification });
    } else {
      const current = storage.getNotifications();
      storage.saveNotifications([notification, ...current]);
    }
  },

  markNotificationRead: async (id: string, allNotifications: Notification[]) => {
      const notif = allNotifications.find(n => n.id === id);
      if (notif) {
          const updated = { ...notif, read: true };
          if (isLive && supabase) {
              await supabase.from('notifications').update({ data: updated }).eq('id', id);
          } else {
              const current = storage.getNotifications();
              const newStore = current.map(n => n.id === id ? updated : n);
              storage.saveNotifications(newStore);
          }
      }
  },

  markAllNotificationsRead: async (userId: string, allNotifications: Notification[]) => {
      const userNotifs = allNotifications.filter(n => n.recipientId === userId && !n.read);
      if (isLive && supabase) {
          for (const n of userNotifs) {
              await supabase.from('notifications').update({ data: { ...n, read: true } }).eq('id', n.id);
          }
      } else {
          const current = storage.getNotifications();
          const updated = current.map(n => n.recipientId === userId ? { ...n, read: true } : n);
          storage.saveNotifications(updated);
      }
  },

  // --- SURVEYS ---
  getSurveys: async (): Promise<Survey[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('surveys').select('data');
        if (!error && data && data.length > 0) return data.map((row: any) => row.data);
        if (data?.length === 0) return storage.getSurveys();
      } catch (e) {
        return storage.getSurveys();
      }
    }
    return storage.getSurveys();
  },

  saveSurvey: async (survey: Survey) => {
    if (isLive && supabase) {
      await supabase.from('surveys').upsert({ id: survey.id, data: survey });
    } else {
      const current = storage.getSurveys();
      const index = current.findIndex(s => s.id === survey.id);
      if (index >= 0) current[index] = survey;
      else current.push(survey);
      storage.saveSurveys(current);
    }
  },

  deleteSurvey: async (id: string) => {
    if (isLive && supabase) {
        await supabase.from('surveys').delete().eq('id', id);
    } else {
        const current = storage.getSurveys();
        storage.saveSurveys(current.filter(s => s.id !== id));
    }
  },

  // --- TEMPLATES ---
  getTemplates: async (): Promise<OnboardingTemplate[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('onboarding_templates').select('data');
        if (!error && data && data.length > 0) return data.map((row: any) => row.data);
        if (data?.length === 0) return MOCK_TEMPLATES;
      } catch (e) {
        return storage.getTemplates();
      }
    }
    return storage.getTemplates();
  },

  saveTemplate: async (template: OnboardingTemplate) => {
    if (isLive && supabase) {
      await supabase.from('onboarding_templates').upsert({ id: template.id, data: template });
    } else {
      const current = storage.getTemplates();
      const index = current.findIndex(t => t.id === template.id);
      if (index >= 0) current[index] = template;
      else current.push(template);
      storage.saveTemplates(current);
    }
  },

  deleteTemplate: async (id: string) => {
    if (isLive && supabase) {
        await supabase.from('onboarding_templates').delete().eq('id', id);
    } else {
        const current = storage.getTemplates();
        storage.saveTemplates(current.filter(t => t.id !== id));
    }
  },

  // --- DEBT CONTROL (DEBITEUREN) ---
  getDebtors: async (): Promise<Debtor[]> => {
    if (isLive && supabase) {
        try {
            const { data, error } = await supabase.from('debtors').select('data');
            if (!error && data && data.length > 0) return data.map((row: any) => row.data);
            return [];
        } catch (e) {
            // If table doesn't exist yet or error, return local
            const local = localStorage.getItem('hrms_debtors');
            return local ? JSON.parse(local) : [];
        }
    } else {
        const local = localStorage.getItem('hrms_debtors');
        return local ? JSON.parse(local) : [];
    }
  },

  saveDebtors: async (debtors: Debtor[]) => {
      if (isLive && supabase) {
          // Bulk upsert
          const updates = debtors.map(d => ({ id: d.id, data: d }));
          const { error } = await supabase.from('debtors').upsert(updates);
          if (error) {
              // If table 'debtors' does not exist, we might need to create it or fallback.
              // Assuming table exists for this feature.
              console.error("Error saving debtors:", error);
          }
      } 
      // Always update local for reactivity/fallback
      localStorage.setItem('hrms_debtors', JSON.stringify(debtors));
  },

  // Subscribe to debtors specifically
  subscribeToDebtors: (onUpdate: (debtors: Debtor[]) => void) => {
    if (isLive && supabase) {
      const channel = supabase.channel('debtors_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'debtors' }, async () => {
             const { data } = await supabase.from('debtors').select('data');
             if (data) onUpdate(data.map((r: any) => r.data));
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    return () => {};
  },

  // --- SYSTEM LOGS ---
  getSystemLogs: async (): Promise<SystemUpdateLog[]> => {
    if (isLive && supabase) {
        try {
            const { data, error } = await supabase.from('system_updates').select('data');
            if (!error && data && data.length > 0) return data.map((row: any) => row.data);
            if (data?.length === 0) return MOCK_SYSTEM_LOGS;
        } catch (e) {
            return MOCK_SYSTEM_LOGS;
        }
    }
    return MOCK_SYSTEM_LOGS;
  },

  saveSystemLog: async (log: SystemUpdateLog) => {
      if (isLive && supabase) {
          await supabase.from('system_updates').insert({ id: log.id, data: log });
      }
  },

  // --- REALTIME SUBSCRIPTION (GLOBAL) ---
  subscribe: (
    onEmployees: (data: Employee[]) => void,
    onNews: (data: NewsPost[]) => void,
    onNotifications: (data: Notification[]) => void,
    onSurveys: (data: Survey[]) => void,
    onTemplates?: (data: OnboardingTemplate[]) => void
  ) => {
    if (isLive && supabase) {
      // Supabase Realtime
      const channel = supabase.channel('main')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => {
             const { data } = await supabase.from('employees').select('data');
             if (data) onEmployees(data.map((r: any) => r.data));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, async () => {
             const { data } = await supabase.from('news').select('data');
             if (data) onNews(data.map((r: any) => r.data));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
             const { data } = await supabase.from('notifications').select('data');
             if (data) onNotifications(data.map((r: any) => r.data));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, async () => {
             const { data } = await supabase.from('surveys').select('data');
             if (data) onSurveys(data.map((r: any) => r.data));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_templates' }, async () => {
             if (onTemplates) {
                 const { data } = await supabase.from('onboarding_templates').select('data');
                 if (data) onTemplates(data.map((r: any) => r.data));
             }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      return storage.subscribe(onEmployees, onNews, onNotifications, onSurveys, onTemplates);
    }
  }
};
