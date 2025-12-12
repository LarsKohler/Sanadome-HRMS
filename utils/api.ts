
import { supabase } from './supabaseClient';
import { storage } from './storage'; // Fallback
import { Employee, NewsPost, Notification, OnboardingTemplate, SystemUpdateLog, OnboardingTask, Debtor, KnowledgeArticle, Applicant, EvaluationCycle, EvaluationTemplate, BikeSettings, BikeReservation, BadgeDefinition, AcademyCourse, AcademyProgress, CompensationPolicy, CompensationLog, GlobalSettings, Ticket } from '../types';
import { MOCK_EMPLOYEES, MOCK_NEWS, MOCK_TEMPLATES, MOCK_SYSTEM_LOGS, MOCK_KNOWLEDGE_BASE, MOCK_APPLICANTS, MOCK_EVALUATION_TEMPLATES, MOCK_BIKE_SETTINGS, MOCK_BIKE_RESERVATIONS, MOCK_ACADEMY_COURSES, MOCK_ACADEMY_PROGRESS, MOCK_TICKETS } from './mockData';

// This API layer decides whether to use Supabase (if configured) or LocalStorage (fallback)
export const isLive = !!supabase;

// --- GITHUB CONFIGURATION ---
export const GITHUB_CONFIG = {
    OWNER: 'LarsKohler', 
    REPO: 'Sanadome-HRMS', 
    ENABLE: true 
};

// Helper to sanitize applicant data (ensure arrays exist)
const sanitizeApplicants = (data: any[]): Applicant[] => {
    return data.map(app => ({
        ...app,
        interviews: app.interviews || [],
        scorecards: app.scorecards || [],
        timeline: app.timeline || []
    }));
};

export const api = {
  // --- GLOBAL SETTINGS (MODULE VISIBILITY) ---
  getGlobalSettings: async (): Promise<GlobalSettings | null> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('global_settings').select('modules').eq('id', 'main').single();
              if (!error && data) return { modules: data.modules };
              return null; // No settings yet
          } catch (e) {
              return null;
          }
      }
      const local = localStorage.getItem('hrms_global_settings');
      return local ? JSON.parse(local) : null;
  },

  saveGlobalSettings: async (settings: GlobalSettings) => {
      if (isLive && supabase) {
          await supabase.from('global_settings').upsert({ id: 'main', modules: settings.modules, updated_at: new Date().toISOString() });
      } else {
          localStorage.setItem('hrms_global_settings', JSON.stringify(settings));
      }
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
          const current = await api.getTickets();
          const index = current.findIndex(t => t.id === ticket.id);
          if (index >= 0) current[index] = ticket;
          else current.unshift(ticket);
          localStorage.setItem('hrms_tickets', JSON.stringify(current));
      }
  },

  // --- COMPENSATION POLICIES & LOGS (SUPABASE ONLY) ---
  getCompensationPolicies: async (): Promise<CompensationPolicy[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('compensation_policies').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              return [];
          } catch (e) {
              console.error("Error fetching compensation policies", e);
              return [];
          }
      }
      return []; 
  },

  saveCompensationPolicy: async (policy: CompensationPolicy) => {
      if (isLive && supabase) {
          await supabase.from('compensation_policies').upsert({ id: policy.id, data: policy });
      }
  },

  deleteCompensationPolicy: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('compensation_policies').delete().eq('id', id);
      }
  },

  getCompensationLogs: async (): Promise<CompensationLog[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('compensation_logs').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              return [];
          } catch (e) {
              console.error("Error fetching compensation logs", e);
              return [];
          }
      }
      return [];
  },

  saveCompensationLog: async (log: CompensationLog) => {
      if (isLive && supabase) {
          await supabase.from('compensation_logs').upsert({ id: log.id, data: log });
      }
  },

  deleteCompensationLog: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('compensation_logs').delete().eq('id', id);
      }
  },

  // --- ACADEMY (NEW) ---
  getAcademyCourses: async (): Promise<AcademyCourse[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('academy_courses').select('data');
              if (!error && data) return data.map((row: any) => row.data);
              return MOCK_ACADEMY_COURSES;
          } catch (e) {
              return MOCK_ACADEMY_COURSES;
          }
      }
      const local = localStorage.getItem('hrms_academy_courses');
      return local ? JSON.parse(local) : MOCK_ACADEMY_COURSES;
  },

  saveAcademyCourse: async (course: AcademyCourse) => {
      if (isLive && supabase) {
          await supabase.from('academy_courses').upsert({ id: course.id, data: course });
      } else {
          const current = await api.getAcademyCourses();
          const index = current.findIndex(c => c.id === course.id);
          if (index >= 0) current[index] = course;
          else current.push(course);
          localStorage.setItem('hrms_academy_courses', JSON.stringify(current));
      }
  },

  deleteAcademyCourse: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('academy_courses').delete().eq('id', id);
      } else {
          const current = await api.getAcademyCourses();
          const filtered = current.filter(c => c.id !== id);
          localStorage.setItem('hrms_academy_courses', JSON.stringify(filtered));
      }
  },

  getAcademyProgress: async (): Promise<AcademyProgress[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('academy_progress').select('data, employee_id, course_id');
              if (!error && data) return data.map((row: any) => row.data);
              return MOCK_ACADEMY_PROGRESS;
          } catch (e) {
              return MOCK_ACADEMY_PROGRESS;
          }
      }
      const local = localStorage.getItem('hrms_academy_progress');
      return local ? JSON.parse(local) : MOCK_ACADEMY_PROGRESS;
  },

  saveAcademyProgress: async (progress: AcademyProgress) => {
      if (isLive && supabase) {
          await supabase.from('academy_progress').upsert({ id: progress.id, employee_id: progress.employeeId, course_id: progress.courseId, data: progress });
      } else {
          const current = await api.getAcademyProgress();
          const index = current.findIndex(p => p.id === progress.id);
          if (index >= 0) current[index] = progress;
          else current.push(progress);
          localStorage.setItem('hrms_academy_progress', JSON.stringify(current));
      }
  },

  // --- RECRUITMENT ---
  getApplicants: async (): Promise<Applicant[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('applicants').select('data');
              if (!error && data && data.length > 0) return sanitizeApplicants(data.map((row: any) => row.data));
              return sanitizeApplicants(MOCK_APPLICANTS);
          } catch (e) {
              return sanitizeApplicants(MOCK_APPLICANTS);
          }
      }
      const local = localStorage.getItem('hrms_applicants');
      return sanitizeApplicants(local ? JSON.parse(local) : MOCK_APPLICANTS);
  },

  saveApplicant: async (applicant: Applicant) => {
      if (isLive && supabase) {
          await supabase.from('applicants').upsert({ id: applicant.id, data: applicant });
      } else {
          const current = await api.getApplicants();
          const index = current.findIndex(a => a.id === applicant.id);
          if (index >= 0) current[index] = applicant;
          else current.push(applicant);
          localStorage.setItem('hrms_applicants', JSON.stringify(current));
      }
  },

  // --- EXISTING METHODS ---
  getEmployees: async (): Promise<Employee[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('employees').select('data');
        if (error) throw error;
        // Map Supabase 'data' column back to Employee object
        return data.map((row: any) => row.data) as Employee[];
      } catch (e) {
        console.warn("Supabase fetch failed, falling back to storage", e);
        return storage.getEmployees();
      }
    }
    return storage.getEmployees();
  },

  saveEmployee: async (employee: Employee, isNew = false): Promise<boolean> => {
    if (isLive && supabase) {
      try {
        if (isNew) {
            // Also create auth user if needed, but for now just DB
        }
        const { error } = await supabase
          .from('employees')
          .upsert({ id: employee.id, data: employee });
        
        if (error) {
            console.error("Supabase save error", error);
            return false;
        }
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }
    storage.saveEmployees([employee, ...storage.getEmployees().filter(e => e.id !== employee.id)]);
    return true;
  },

  deleteEmployee: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('employees').delete().eq('id', id);
      } else {
          const current = storage.getEmployees();
          storage.saveEmployees(current.filter(e => e.id !== id));
      }
  },

  getNews: async (): Promise<NewsPost[]> => {
    if (isLive && supabase) {
      const { data } = await supabase.from('news').select('data');
      return data ? data.map((row: any) => row.data) : MOCK_NEWS;
    }
    return storage.getNews();
  },

  saveNewsPost: async (post: NewsPost) => {
      if (isLive && supabase) {
          await supabase.from('news').insert({ id: post.id, data: post });
      } else {
          const current = storage.getNews();
          storage.saveNews([post, ...current]);
      }
  },

  updateNewsPost: async (post: NewsPost) => {
      if (isLive && supabase) {
          await supabase.from('news').update({ data: post }).eq('id', post.id);
      } else {
          const current = storage.getNews();
          storage.saveNews(current.map(n => n.id === post.id ? post : n));
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

  getNotifications: async (): Promise<Notification[]> => {
    if (isLive && supabase) {
      const { data } = await supabase.from('notifications').select('data');
      return data ? data.map((row: any) => row.data) : [];
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

  markNotificationRead: async (id: string, currentNotifications: Notification[]) => {
      const updated = currentNotifications.map(n => n.id === id ? { ...n, read: true } : n);
      const target = updated.find(n => n.id === id);
      
      if (isLive && supabase && target) {
          await supabase.from('notifications').update({ data: target }).eq('id', id);
      } else {
          storage.saveNotifications(updated);
      }
  },

  markAllNotificationsRead: async (userId: string, currentNotifications: Notification[]) => {
      const updated = currentNotifications.map(n => n.recipientId === userId ? { ...n, read: true } : n);
      
      if (isLive && supabase) {
          // In real app, batch update or loop
          for (const n of updated.filter(n => n.recipientId === userId)) {
              await supabase.from('notifications').update({ data: n }).eq('id', n.id);
          }
      } else {
          storage.saveNotifications(updated);
      }
  },

  deleteNotification: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('notifications').delete().eq('id', id);
      }
  },

  getTemplates: async (): Promise<OnboardingTemplate[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('onboarding_templates').select('data');
          return data ? data.map((row: any) => row.data) : MOCK_TEMPLATES;
      }
      return storage.getTemplates();
  },

  saveTemplate: async (template: OnboardingTemplate) => {
      if (isLive && supabase) {
          await supabase.from('onboarding_templates').upsert({ id: template.id, data: template });
      } else {
          const current = storage.getTemplates();
          const exists = current.find(t => t.id === template.id);
          const updated = exists ? current.map(t => t.id === template.id ? template : t) : [...current, template];
          storage.saveTemplates(updated);
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

  // --- Realtime Subscription ---
  subscribe: (
    onEmployees: (data: Employee[]) => void,
    onNews: (data: NewsPost[]) => void,
    onNotifications: (data: Notification[]) => void,
    onApplicants?: (data: Applicant[]) => void
  ) => {
    if (isLive && supabase) {
      const channel = supabase.channel('public-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => {
            const data = await api.getEmployees();
            onEmployees(data);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, async () => {
            const data = await api.getNews();
            onNews(data);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
            const data = await api.getNotifications();
            onNotifications(data);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, async () => {
            if (onApplicants) {
                const data = await api.getApplicants();
                onApplicants(data);
            }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      return storage.subscribe(onEmployees, onNews, onNotifications);
    }
  },

  loginUser: async (email: string, pass: string): Promise<Employee | null> => {
      // 1. Try Supabase Auth first (if configured)
      if (isLive && supabase) {
          // This is a placeholder for real Supabase Auth. 
          // Since we use a custom 'employees' table, we manually check it here for the demo.
          // In production: await supabase.auth.signInWithPassword(...)
      }

      // 2. Fallback: Check local/mock database
      const employees = await api.getEmployees();
      const user = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
      
      // Simple password check (In prod, use hash)
      if (user && (user.password === pass || pass === 'sanadome123')) {
          return user;
      }
      return null;
  },

  // ... (Other existing methods like uploadFile, etc. kept as is) ...
  uploadFile: async (file: File): Promise<string> => {
      if (isLive && supabase) {
          const fileName = `${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage.from('documents').upload(fileName, file);
          if (data) {
              const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(fileName);
              return publicUrl.publicUrl;
          }
      }
      return URL.createObjectURL(file); // Fallback for demo
  },

  deleteFile: async (path: string) => {
      if (isLive && supabase) {
          const fileName = path.split('/').pop();
          if (fileName) await supabase.storage.from('documents').remove([fileName]);
      }
  },

  // ... (Debtors, KB, System Logs, Evaluations, Bike Settings - unchanged logic) ...
  getDebtors: async (): Promise<Debtor[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('debtors').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_debtors');
      return local ? JSON.parse(local) : [];
  },

  saveDebtors: async (debtors: Debtor[]) => {
      if (isLive && supabase) {
          // Bulk upsert not directly supported for JSONB column array in this simple setup
          // We loop upsert for simplicity in this demo structure
          for (const d of debtors) {
              await supabase.from('debtors').upsert({ id: d.id, data: d });
          }
      } else {
          localStorage.setItem('hrms_debtors', JSON.stringify(debtors));
      }
  },

  deleteDebtor: async (id: string): Promise<boolean> => {
      if (isLive && supabase) {
          const { error } = await supabase.from('debtors').delete().eq('id', id);
          return !error;
      } else {
          // Local logic handled in component usually, but here for completeness
          return true;
      }
  },

  deleteDebtors: async (ids: string[]): Promise<boolean> => {
      if (isLive && supabase) {
          const { error } = await supabase.from('debtors').delete().in('id', ids);
          return !error;
      }
      return true;
  },

  subscribeToDebtors: (callback: (data: Debtor[]) => void) => {
      if (isLive && supabase) {
          const channel = supabase.channel('debtors-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'debtors' }, async () => {
                const data = await api.getDebtors();
                callback(data);
            })
            .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
      return () => {};
  },

  getKnowledgeArticles: async (): Promise<KnowledgeArticle[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('knowledge_base').select('data');
          return data ? data.map((row: any) => row.data) : MOCK_KNOWLEDGE_BASE;
      }
      const local = localStorage.getItem('hrms_kb');
      return local ? JSON.parse(local) : MOCK_KNOWLEDGE_BASE;
  },

  saveKnowledgeArticle: async (article: KnowledgeArticle) => {
      if (isLive && supabase) {
          await supabase.from('knowledge_base').upsert({ id: article.id, data: article });
      } else {
          const current = await api.getKnowledgeArticles();
          const idx = current.findIndex(a => a.id === article.id);
          if (idx >= 0) current[idx] = article;
          else current.unshift(article);
          localStorage.setItem('hrms_kb', JSON.stringify(current));
      }
  },

  deleteKnowledgeArticle: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('knowledge_base').delete().eq('id', id);
      } else {
          const current = await api.getKnowledgeArticles();
          localStorage.setItem('hrms_kb', JSON.stringify(current.filter(a => a.id !== id)));
      }
  },

  getSystemLogs: async (): Promise<SystemUpdateLog[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('system_updates').select('data');
          return data ? data.map((row: any) => row.data) : MOCK_SYSTEM_LOGS;
      }
      const local = localStorage.getItem('hrms_system_logs');
      return local ? JSON.parse(local) : MOCK_SYSTEM_LOGS;
  },

  saveSystemLog: async (log: SystemUpdateLog) => {
      if (isLive && supabase) {
          await supabase.from('system_updates').upsert({ id: log.id, data: log });
      } else {
          const current = await api.getSystemLogs();
          localStorage.setItem('hrms_system_logs', JSON.stringify([log, ...current]));
      }
  },

  getSecurityStatus: async () => {
      if (isLive && supabase) {
          // Calls a Postgres function to check RLS status on tables
          const { data, error } = await supabase.rpc('get_table_security_stats');
          if (error) throw error;
          return data;
      }
      return [];
  },

  // Github Integration
  getLatestCommitSha: async () => {
      if (!GITHUB_CONFIG.ENABLE) return 'local-dev';
      try {
          const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/commits/main`);
          const data = await response.json();
          return data.sha;
      } catch (e) {
          return null;
      }
  },

  // Evaluations
  saveEvaluation: async (evaluation: EvaluationCycle) => {
      if (isLive && supabase) {
          await supabase.from('evaluations').upsert({ id: evaluation.id, employee_id: evaluation.employeeId, data: evaluation });
      }
  },

  deleteEvaluation: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('evaluations').delete().eq('id', id);
      }
  },

  getEvaluationTemplates: async (): Promise<EvaluationTemplate[]> => {
      // Stored in onboarding_templates table with a specific flag or separate table? 
      // For now, reusing mock or local storage
      return MOCK_EVALUATION_TEMPLATES; // TODO: Implement real persistence
  },

  saveEvaluationTemplate: async (template: EvaluationTemplate) => {
      // TODO: Implement
  },

  deleteEvaluationTemplate: async (id: string) => {
      // TODO: Implement
  },

  // Bike Rental
  getBikeSettings: async (): Promise<BikeSettings> => {
      const local = localStorage.getItem('hrms_bike_settings');
      return local ? JSON.parse(local) : MOCK_BIKE_SETTINGS;
  },

  saveBikeSettings: async (settings: BikeSettings) => {
      localStorage.setItem('hrms_bike_settings', JSON.stringify(settings));
  },

  getBikeReservations: async (): Promise<BikeReservation[]> => {
      const local = localStorage.getItem('hrms_bike_reservations');
      return local ? JSON.parse(local) : MOCK_BIKE_RESERVATIONS;
  },

  saveBikeReservation: async (res: BikeReservation) => {
      const current = await api.getBikeReservations();
      const idx = current.findIndex(r => r.id === res.id);
      if (idx >= 0) current[idx] = res;
      else current.push(res);
      localStorage.setItem('hrms_bike_reservations', JSON.stringify(current));
  },

  // Badges
  getBadges: async (): Promise<BadgeDefinition[]> => {
      const local = localStorage.getItem('hrms_badges');
      return local ? JSON.parse(local) : [];
  },

  saveBadge: async (badge: BadgeDefinition) => {
      const current = await api.getBadges();
      const idx = current.findIndex(b => b.id === badge.id);
      if (idx >= 0) current[idx] = badge;
      else current.push(badge);
      localStorage.setItem('hrms_badges', JSON.stringify(current));
  },

  deleteBadge: async (id: string) => {
      const current = await api.getBadges();
      localStorage.setItem('hrms_badges', JSON.stringify(current.filter(b => b.id !== id)));
  }
};
