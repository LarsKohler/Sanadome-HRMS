
import { supabase } from './supabaseClient';
import { storage } from './storage'; // Fallback
import { Employee, NewsPost, Notification, Survey, OnboardingTemplate, SystemUpdateLog, OnboardingTask, Debtor, Ticket, BadgeDefinition, KnowledgeArticle } from '../types';
import { MOCK_EMPLOYEES, MOCK_NEWS, MOCK_TEMPLATES, MOCK_SYSTEM_LOGS, MOCK_TICKETS, MOCK_BADGES, MOCK_KNOWLEDGE_BASE } from './mockData';

// This API layer decides whether to use Supabase (if configured) or LocalStorage (fallback)
// We explicitely check if supabase is not null
export const isLive = !!supabase;

// --- GITHUB CONFIGURATION ---
// PAS DIT AAN NAAR JOUW REPO GEGEVENS VOOR AUTOMATISCHE UPDATES
export const GITHUB_CONFIG = {
    OWNER: 'LarsKohler', // <-- Verander dit naar je GitHub gebruikersnaam
    REPO: 'Sanadome-HRMS', // <-- Verander dit naar je repository naam
    ENABLE: true // Zet op false om handmatige database logs te gebruiken
};

// Helper to generate fresh tasks for demo users
const generateDemoTasks = (): OnboardingTask[] => [
  { id: 'd-1', week: 1, category: 'Introductie', title: 'Rondleiding Hotel & Spa', description: 'Volledige rondleiding door faciliteiten.', completed: true, score: 100, completedBy: 'System', completedDate: 'Vandaag' },
  { id: 'd-2', week: 1, category: 'IT', title: 'IDu PMS Training', description: 'Basisnavigatie in het systeem.', completed: true, score: 100, completedBy: 'System', completedDate: 'Vandaag' },
  { id: 'd-3', week: 2, category: 'Front Office', title: 'Check-in Procedure', description: 'Gasten ontvangen en registreren.', completed: false, score: 0 },
  { id: 'd-4', week: 3, category: 'Financieel', title: 'Kassa Afsluiting', description: 'Procedure voor einde dienst.', completed: false, score: 0 },
];

export const api = {
  // --- SECURITY AUDIT (NEW) ---
  getSecurityStatus: async (): Promise<{ table_name: string, rls_enabled: boolean }[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.rpc('get_table_security_stats');
              if (error) throw error;
              return data;
          } catch (e) {
              console.error("Security audit failed (RPC missing?):", e);
              return [];
          }
      }
      // Mock for non-supabase env
      return [
          { table_name: 'employees', rls_enabled: true },
          { table_name: 'debtors', rls_enabled: true },
          { table_name: 'tickets', rls_enabled: true },
          { table_name: 'news', rls_enabled: true },
      ];
  },

  // --- DIRECT LOGIN (SUPABASE AUTH & DB FALLBACK) ---
  loginUser: async (email: string, password: string): Promise<Employee | null> => {
      if (!isLive || !supabase) {
          // Fallback for local dev without Supabase
          const employees = storage.getEmployees();
          return employees.find(e => e.email.toLowerCase() === email.toLowerCase() && (e.password === password || e.accountStatus === 'Pending')) || null;
      }

      try {
          // STEP 1: Try Secure Auth (Supabase Auth)
          // DIT IS DE VEILIGE MANIER: Gebruik Supabase Auth Users.
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password
          });

          if (authData.user) {
              // Als Auth slaagt, haal het profiel op.
              const { data: profileData } = await supabase
                  .from('employees')
                  .select('data')
                  .eq('id', authData.user.id) // ID moet matchen met Auth ID
                  .single();
                  
              if (profileData) return profileData.data as Employee;
          }

          // STEP 2: Legacy/Demo Login (Query JSON) - FALLBACK VOOR OUDE GEBRUIKERS
          const { data, error } = await supabase
              .from('employees')
              .select('data')
              .eq('data->>email', email)
              .single();

          if (error || !data) {
              // Retry with lowercase just in case
              const { data: dataLower, error: errorLower } = await supabase
                .from('employees')
                .select('data')
                .ilike('data->>email', email)
                .single();
                
              if(errorLower || !dataLower) return null;
              const emp = dataLower.data as Employee;
              if (emp.password === password) return emp;
              return null;
          }

          const emp = data.data as Employee;
          if (emp.password === password) return emp;
          
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
      
      // Generate a Proper UUID for Supabase Auth
      const newId = crypto.randomUUID();
      
      const newEmployee: Employee = {
          id: newId,
          name: name,
          role: role,
          departments: role === 'Manager' ? ['Management', 'Front Office'] : ['Front Office'],
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
              { type: 'Sick Leave', entitled: 10.0, taken: 0 },
              { type: 'Without Pay', entitled: 0, taken: 0 }
          ],
          leaveRequests: [],
          documents: [],
          notes: [],
          onboardingTasks: role === 'Manager' ? [] : generateDemoTasks(),
          evaluations: [],
          badges: [],
          // Managers get full permissions, Employees get defaults
          customPermissions: role === 'Manager' ? [
            'VIEW_REPORTS', 'MANAGE_EMPLOYEES', 'MANAGE_DOCUMENTS', 
            'VIEW_ALL_DOCUMENTS', 'CREATE_NEWS', 'MANAGE_ONBOARDING', 
            'MANAGE_SURVEYS', 'VIEW_SYSTEM_STATUS', 'MANAGE_SETTINGS', 
            'MANAGE_EVALUATIONS', 'MANAGE_DEBTORS', 'MANAGE_RECRUITMENT',
            'VIEW_CALENDAR', 'MANAGE_ATTENDANCE', 'MANAGE_CASES',
            'MANAGE_TICKETS', 'MANAGE_BADGES', 'MANAGE_KNOWLEDGE',
            'MANAGE_OPERATIONS'
          ] : undefined
      };

      await api.saveEmployee(newEmployee, true); // true = create auth user
      return { email, password };
  },

  // --- UTILS ---
  seedDatabase: async () => {
    if (!isLive || !supabase) return;
    // ... (rest of seeding logic remains the same)
  },

  uploadFile: async (file: File, bucket: string = 'hrms-storage'): Promise<string | null> => {
    // ... (rest of upload logic remains the same)
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
        if (data?.length === 0) {
           await api.seedDatabase();
           return MOCK_EMPLOYEES;
        }
      } catch (e) {
        return storage.getEmployees();
      }
    }
    return storage.getEmployees();
  },

  saveEmployee: async (employee: Employee, isNewUser: boolean = false): Promise<boolean> => {
    if (isLive && supabase) {
      try {
          // 1. AUTOMATIC AUTH SYNC
          // Als het een nieuwe gebruiker is (en we hebben een wachtwoord), maak hem aan in Auth.
          if (isNewUser && employee.password) {
              const { error: rpcError } = await supabase.rpc('admin_create_user', {
                  new_email: employee.email,
                  new_password: employee.password,
                  new_id: employee.id
              });

              if (rpcError) {
                  console.error("Auth Auto-Sync Failed:", rpcError);
                  // We gaan door, want misschien bestaat de user al of is er een ander issue.
                  // De data opslag in 'employees' moet wel lukken.
              } else {
                  console.log("Auth User Created via RPC");
              }
          }

          // 2. DATA OPSLAAN
          const { data, error } = await supabase
            .from('employees')
            .upsert({ id: employee.id, data: employee })
            .select()
            .single();

          if (error) {
              console.error('Supabase Save Error:', error);
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
        // Note: Removing from Auth requires an Edge Function or manual admin action usually, 
        // unless we add another RPC for 'admin_delete_user'. 
    } else {
        const current = storage.getEmployees();
        const filtered = current.filter(e => e.id !== id);
        storage.saveEmployees(filtered);
    }
  },

  // --- BADGES (NEW) ---
  getBadges: async (): Promise<BadgeDefinition[]> => {
      const local = localStorage.getItem('hrms_badges');
      if (local) return JSON.parse(local);
      return MOCK_BADGES;
  },

  saveBadge: async (badge: BadgeDefinition) => {
      const current = await api.getBadges();
      const index = current.findIndex(b => b.id === badge.id);
      if (index >= 0) current[index] = badge;
      else current.push(badge);
      localStorage.setItem('hrms_badges', JSON.stringify(current));
  },

  deleteBadge: async (id: string) => {
      const current = await api.getBadges();
      const filtered = current.filter(b => b.id !== id);
      localStorage.setItem('hrms_badges', JSON.stringify(filtered));
  },

  // --- KNOWLEDGE BASE (NEW) ---
  getKnowledgeArticles: async (): Promise<KnowledgeArticle[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('knowledge_base').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              return MOCK_KNOWLEDGE_BASE;
          } catch (e) {
              return MOCK_KNOWLEDGE_BASE;
          }
      }
      const local = localStorage.getItem('hrms_kb');
      return local ? JSON.parse(local) : MOCK_KNOWLEDGE_BASE;
  },

  saveKnowledgeArticle: async (article: KnowledgeArticle) => {
      if (isLive && supabase) {
          await supabase.from('knowledge_base').upsert({ id: article.id, data: article });
      } else {
          const current = await api.getKnowledgeArticles();
          const index = current.findIndex(a => a.id === article.id);
          if (index >= 0) current[index] = article;
          else current.unshift(article);
          localStorage.setItem('hrms_kb', JSON.stringify(current));
      }
  },

  deleteKnowledgeArticle: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('knowledge_base').delete().eq('id', id);
      } else {
          const current = await api.getKnowledgeArticles();
          const filtered = current.filter(a => a.id !== id);
          localStorage.setItem('hrms_kb', JSON.stringify(filtered));
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

  deleteNewsPost: async (id: string) => {
    if (isLive && supabase) {
        await supabase.from('news').delete().eq('id', id);
    } else {
        const current = storage.getNews();
        storage.saveNews(current.filter(n => n.id !== id));
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

  deleteNotification: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('notifications').delete().eq('id', id);
      } else {
          const current = storage.getNotifications();
          const filtered = current.filter(n => n.id !== id);
          storage.saveNotifications(filtered);
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
          const updates = debtors.map(d => ({ id: d.id, data: d }));
          const { error } = await supabase.from('debtors').upsert(updates);
          if (error) console.error("Error saving debtors:", error);
      } 
      localStorage.setItem('hrms_debtors', JSON.stringify(debtors));
  },

  deleteDebtor: async (id: string): Promise<boolean> => {
      if (isLive && supabase) {
          const { error } = await supabase.from('debtors').delete().eq('id', id);
          if (error) return false;
      }
      const local = localStorage.getItem('hrms_debtors');
      if (local) {
          const parsed = JSON.parse(local);
          const filtered = parsed.filter((d: Debtor) => d.id !== id);
          localStorage.setItem('hrms_debtors', JSON.stringify(filtered));
      }
      return true;
  },

  deleteDebtors: async (ids: string[]): Promise<boolean> => {
      if (isLive && supabase) {
          const { error } = await supabase.from('debtors').delete().in('id', ids);
          if (error) return false;
      }
      const local = localStorage.getItem('hrms_debtors');
      if (local) {
          const parsed = JSON.parse(local) as Debtor[];
          const filtered = parsed.filter(d => !ids.includes(d.id));
          localStorage.setItem('hrms_debtors', JSON.stringify(filtered));
      }
      return true;
  },

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

  // --- TICKETS ---
  getTickets: async (): Promise<Ticket[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('tickets').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              return MOCK_TICKETS;
          } catch (e) {
              return MOCK_TICKETS;
          }
      }
      const local = localStorage.getItem('hrms_tickets');
      return local ? JSON.parse(local) : MOCK_TICKETS;
  },

  saveTicket: async (ticket: Ticket) => {
      if (isLive && supabase) {
          await supabase.from('tickets').upsert({ id: ticket.id, data: ticket });
      } else {
          const current = localStorage.getItem('hrms_tickets');
          const parsed = current ? JSON.parse(current) : MOCK_TICKETS;
          const index = parsed.findIndex((t: Ticket) => t.id === ticket.id);
          if (index >= 0) parsed[index] = ticket;
          else parsed.unshift(ticket);
          localStorage.setItem('hrms_tickets', JSON.stringify(parsed));
      }
  },

  deleteTicket: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('tickets').delete().eq('id', id);
      } else {
          const current = localStorage.getItem('hrms_tickets');
          if (current) {
              const parsed = JSON.parse(current);
              const filtered = parsed.filter((t: Ticket) => t.id !== id);
              localStorage.setItem('hrms_tickets', JSON.stringify(filtered));
          }
      }
  },

  // --- SYSTEM LOGS ---
  getSystemLogs: async (): Promise<SystemUpdateLog[]> => {
    if (GITHUB_CONFIG.ENABLE) {
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/commits?per_page=15`);
            if (response.ok) {
                const commits = await response.json();
                const gitHubLogs: SystemUpdateLog[] = commits.map((c: any) => {
                    const msg = c.commit.message || '';
                    const title = msg.split('\n')[0]; 
                    
                    let type: 'Feature' | 'Bugfix' | 'Maintenance' | 'Security' = 'Maintenance';
                    let affectedArea = 'System';
                    let impact: 'High' | 'Medium' | 'Low' = 'Low';

                    if (title.toLowerCase().includes('feat')) type = 'Feature';
                    else if (title.toLowerCase().includes('fix')) type = 'Bugfix';

                    const dateObj = new Date(c.commit.author.date);

                    return {
                        id: c.sha,
                        version: c.sha.substring(0, 7),
                        date: dateObj.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
                        timestamp: dateObj.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
                        author: c.commit.author.name,
                        type: type,
                        impact: impact,
                        affectedArea: affectedArea,
                        description: title,
                        status: 'Success'
                    };
                });
                return gitHubLogs;
            }
        } catch (e) {
            console.warn("Failed to fetch GitHub commits", e);
        }
    }

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
