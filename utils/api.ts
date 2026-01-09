import { supabase } from './supabaseClient';
import { 
  Employee, NewsPost, Notification, OnboardingTemplate, SystemUpdateLog, OnboardingTask, 
  Debtor, KnowledgeArticle, Applicant, EvaluationCycle, EvaluationTemplate, BadgeDefinition, 
  AcademyCourse, AcademyProgress, CompensationPolicy, CompensationLog, GlobalSettings, 
  Ticket, ChecklistTemplate, ChecklistSubmission, Task, Complaint, BikeSettings, 
  BikeReservation, ShiftHandoverItem, StockItem, StockLog, StockOrder 
} from '../types';
import { 
  MOCK_EMPLOYEES, MOCK_NEWS, MOCK_TEMPLATES, MOCK_SYSTEM_LOGS, MOCK_KNOWLEDGE_BASE, 
  MOCK_APPLICANTS, MOCK_EVALUATION_TEMPLATES, MOCK_ACADEMY_COURSES, MOCK_ACADEMY_PROGRESS, 
  MOCK_TICKETS, MOCK_COMPLAINTS 
} from './mockData';
import { storage } from './storage';

export const isLive = !!supabase;

export const GITHUB_CONFIG = {
    ENABLE: false, // Feature flag for GitHub integration
    OWNER: 'your-org',
    REPO: 'your-repo'
};

// Helper for offline unique IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

export const api = {
  // --- REALTIME SUBSCRIPTIONS ---
  subscribe: (
    onEmployees: (data: Employee[]) => void,
    onNews: (data: NewsPost[]) => void,
    onApplicants?: (data: Applicant[]) => void
  ) => {
    if (isLive && supabase) {
      // Supabase Realtime logic would go here
      const empSub = supabase.channel('employees').on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, payload => {
          // Fetch fresh data on change
          api.getEmployees().then(onEmployees);
      }).subscribe();
      
      const newsSub = supabase.channel('news').on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, payload => {
          api.getNews().then(onNews);
      }).subscribe();

      let appSub: any;
      if (onApplicants) {
          appSub = supabase.channel('applicants').on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, payload => {
              api.getApplicants().then(onApplicants);
          }).subscribe();
      }

      return () => {
          supabase.removeChannel(empSub);
          supabase.removeChannel(newsSub);
          if (appSub) supabase.removeChannel(appSub);
      };
    } else {
      // LocalStorage Polling
      return storage.subscribe(onEmployees, onNews, () => {}, () => {}); // Notifications ignored in this simplified subscribe
    }
  },

  subscribeToDebtors: (callback: (debtors: Debtor[]) => void) => {
      if (isLive && supabase) {
          const sub = supabase.channel('debtors').on('postgres_changes', { event: '*', schema: 'public', table: 'debtors' }, () => {
              api.getDebtors().then(callback);
          }).subscribe();
          return () => { supabase.removeChannel(sub); };
      }
      return () => {}; // No-op for offline
  },

  // --- EMPLOYEES ---
  getEmployees: async (): Promise<Employee[]> => {
    if (isLive && supabase) {
      const { data } = await supabase.from('employees').select('data');
      return data ? data.map((row: any) => row.data) : [];
    }
    return storage.getEmployees();
  },

  saveEmployee: async (employee: Employee, isNew = false): Promise<boolean> => {
    if (isLive && supabase) {
      const { error } = await supabase.from('employees').upsert({ id: employee.id, data: employee });
      if (error) { console.error(error); return false; }
      return true;
    }
    const employees = storage.getEmployees();
    const index = employees.findIndex(e => e.id === employee.id);
    if (index >= 0) employees[index] = employee;
    else employees.push(employee);
    storage.saveEmployees(employees);
    return true;
  },

  deleteEmployee: async (id: string) => {
    if (isLive && supabase) {
      await supabase.from('employees').delete().eq('id', id);
    } else {
      const employees = storage.getEmployees().filter(e => e.id !== id);
      storage.saveEmployees(employees);
    }
  },

  loginUser: async (email: string, pass: string): Promise<Employee | null> => {
      const employees = await api.getEmployees();
      const user = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
      
      if (user) {
          // Check for default or set password
          const validPass = user.password || 'sanadome123';
          if (validPass === pass) {
              return user;
          }
      }
      return null;
  },

  // --- NEWS ---
  getNews: async (): Promise<NewsPost[]> => {
    if (isLive && supabase) {
      const { data } = await supabase.from('news').select('data');
      return data ? data.map((row: any) => row.data) : [];
    }
    return storage.getNews();
  },

  saveNewsPost: async (post: NewsPost) => {
    if (isLive && supabase) {
      await supabase.from('news').upsert({ id: post.id, data: post });
    } else {
      const news = storage.getNews();
      storage.saveNews([post, ...news]);
    }
  },

  updateNewsPost: async (post: NewsPost) => {
    if (isLive && supabase) {
      await supabase.from('news').upsert({ id: post.id, data: post });
    } else {
      const news = storage.getNews().map(n => n.id === post.id ? post : n);
      storage.saveNews(news);
    }
  },

  deleteNewsPost: async (id: string) => {
    if (isLive && supabase) {
      await supabase.from('news').delete().eq('id', id);
    } else {
      const news = storage.getNews().filter(n => n.id !== id);
      storage.saveNews(news);
    }
  },

  // --- TEMPLATES ---
  getTemplates: async (): Promise<OnboardingTemplate[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('onboarding_templates').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      return storage.getTemplates();
  },

  saveTemplate: async (template: OnboardingTemplate) => {
      if (isLive && supabase) {
          await supabase.from('onboarding_templates').upsert({ id: template.id, data: template });
      } else {
          const tpls = storage.getTemplates();
          const idx = tpls.findIndex(t => t.id === template.id);
          if (idx >= 0) tpls[idx] = template;
          else tpls.push(template);
          storage.saveTemplates(tpls);
      }
  },

  deleteTemplate: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('onboarding_templates').delete().eq('id', id);
      } else {
          const tpls = storage.getTemplates().filter(t => t.id !== id);
          storage.saveTemplates(tpls);
      }
  },

  // --- SYSTEM LOGS ---
  getSystemLogs: async (): Promise<SystemUpdateLog[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('system_updates').select('data');
          return data ? data.map((row: any) => row.data) : [];
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

  // --- KNOWLEDGE BASE ---
  getKnowledgeArticles: async (): Promise<KnowledgeArticle[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('knowledge_base').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_kb_articles');
      return local ? JSON.parse(local) : MOCK_KNOWLEDGE_BASE;
  },

  saveKnowledgeArticle: async (article: KnowledgeArticle) => {
      if (isLive && supabase) {
          await supabase.from('knowledge_base').upsert({ id: article.id, data: article });
      } else {
          const current = await api.getKnowledgeArticles();
          const idx = current.findIndex(a => a.id === article.id);
          if (idx >= 0) current[idx] = article;
          else current.push(article);
          localStorage.setItem('hrms_kb_articles', JSON.stringify(current));
      }
  },

  deleteKnowledgeArticle: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('knowledge_base').delete().eq('id', id);
      } else {
          const current = await api.getKnowledgeArticles();
          localStorage.setItem('hrms_kb_articles', JSON.stringify(current.filter(a => a.id !== id)));
      }
  },

  // --- TICKETS ---
  getTickets: async (): Promise<Ticket[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('tickets').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_tickets_v2');
      return local ? JSON.parse(local) : MOCK_TICKETS;
  },

  saveTicket: async (ticket: Ticket) => {
      if (isLive && supabase) {
          await supabase.from('tickets').upsert({ id: ticket.id, data: ticket });
      } else {
          const current = await api.getTickets();
          const idx = current.findIndex(t => t.id === ticket.id);
          if (idx >= 0) current[idx] = ticket;
          else current.push(ticket);
          localStorage.setItem('hrms_tickets_v2', JSON.stringify(current));
      }
  },

  // --- RECRUITMENT ---
  getApplicants: async (): Promise<Applicant[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('applicants').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_applicants');
      return local ? JSON.parse(local) : MOCK_APPLICANTS;
  },

  saveApplicant: async (applicant: Applicant) => {
      if (isLive && supabase) {
          await supabase.from('applicants').upsert({ id: applicant.id, data: applicant });
      } else {
          const current = await api.getApplicants();
          const idx = current.findIndex(a => a.id === applicant.id);
          if (idx >= 0) current[idx] = applicant;
          else current.push(applicant);
          localStorage.setItem('hrms_applicants', JSON.stringify(current));
      }
  },

  // --- DEBTORS ---
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
          const updates = debtors.map(d => supabase.from('debtors').upsert({ id: d.id, data: d }));
          await Promise.all(updates);
      } else {
          localStorage.setItem('hrms_debtors', JSON.stringify(debtors));
      }
  },

  deleteDebtor: async (id: string): Promise<boolean> => {
      if (isLive && supabase) {
          const { error } = await supabase.from('debtors').delete().eq('id', id);
          return !error;
      } else {
          const current = await api.getDebtors();
          localStorage.setItem('hrms_debtors', JSON.stringify(current.filter(d => d.id !== id)));
          return true;
      }
  },

  deleteDebtors: async (ids: string[]): Promise<boolean> => {
      if (isLive && supabase) {
          const { error } = await supabase.from('debtors').delete().in('id', ids);
          return !error;
      } else {
          const current = await api.getDebtors();
          localStorage.setItem('hrms_debtors', JSON.stringify(current.filter(d => !ids.includes(d.id))));
          return true;
      }
  },

  // --- NOTIFICATIONS ---
  saveNotification: async (notification: Notification) => {
      if (isLive && supabase) {
          await supabase.from('notifications').upsert({ id: notification.id, data: notification });
      } else {
          // Local storage notifications logic if needed
      }
  },

  // --- EVALUATION TEMPLATES ---
  getEvaluationTemplates: async (): Promise<EvaluationTemplate[]> => {
      if (isLive && supabase) {
          // Assuming stored in system_updates table or dedicated
          // For now, let's use a mock
          return MOCK_EVALUATION_TEMPLATES;
      }
      const local = localStorage.getItem('hrms_evaluation_templates');
      return local ? JSON.parse(local) : MOCK_EVALUATION_TEMPLATES;
  },

  saveEvaluationTemplate: async (template: EvaluationTemplate) => {
      const current = await api.getEvaluationTemplates();
      const idx = current.findIndex(t => t.id === template.id);
      if (idx >= 0) current[idx] = template;
      else current.push(template);
      localStorage.setItem('hrms_evaluation_templates', JSON.stringify(current));
  },

  deleteEvaluationTemplate: async (id: string) => {
      const current = await api.getEvaluationTemplates();
      localStorage.setItem('hrms_evaluation_templates', JSON.stringify(current.filter(t => t.id !== id)));
  },

  // --- EVALUATIONS (Stored in Employee object, but helper for single save) ---
  saveEvaluation: async (evalCycle: EvaluationCycle) => {
      // In this architecture, evaluations are inside employee objects.
      // So saving an evaluation typically means saving the employee.
      // This helper might be redundant unless we have a separate table.
      // Assuming separate table 'evaluations' for indexing/performance in future
      if (isLive && supabase) {
          await supabase.from('evaluations').upsert({ id: evalCycle.id, employee_id: evalCycle.employeeId, data: evalCycle });
      }
  },

  deleteEvaluation: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('evaluations').delete().eq('id', id);
      }
  },

  // --- BADGES ---
  getBadges: async (): Promise<BadgeDefinition[]> => {
      if (isLive && supabase) {
          // Assuming badges are part of global settings or separate table.
          // Let's use local storage for now or fetch from global settings.
          const settings = await api.getGlobalSettings();
          return (settings as any)?.badges || [];
      }
      const local = localStorage.getItem('hrms_badges');
      return local ? JSON.parse(local) : [];
  },

  saveBadge: async (badge: BadgeDefinition) => {
      const current = await api.getBadges();
      const idx = current.findIndex(b => b.id === badge.id);
      if (idx >= 0) current[idx] = badge;
      else current.push(badge);
      
      if (isLive && supabase) {
          // Store in global settings for now
          const settings = await api.getGlobalSettings();
          const newSettings = { ...settings, badges: current };
          await api.saveGlobalSettings(newSettings as any);
      } else {
          localStorage.setItem('hrms_badges', JSON.stringify(current));
      }
  },

  deleteBadge: async (id: string) => {
      const current = await api.getBadges();
      const updated = current.filter(b => b.id !== id);
      if (isLive && supabase) {
          const settings = await api.getGlobalSettings();
          const newSettings = { ...settings, badges: updated };
          await api.saveGlobalSettings(newSettings as any);
      } else {
          localStorage.setItem('hrms_badges', JSON.stringify(updated));
      }
  },

  // --- ACADEMY ---
  getAcademyCourses: async (): Promise<AcademyCourse[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('academy_courses').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_academy_courses');
      return local ? JSON.parse(local) : MOCK_ACADEMY_COURSES;
  },

  saveAcademyCourse: async (course: AcademyCourse) => {
      if (isLive && supabase) {
          await supabase.from('academy_courses').upsert({ id: course.id, data: course });
      } else {
          const current = await api.getAcademyCourses();
          const idx = current.findIndex(c => c.id === course.id);
          if (idx >= 0) current[idx] = course;
          else current.push(course);
          localStorage.setItem('hrms_academy_courses', JSON.stringify(current));
      }
  },

  deleteAcademyCourse: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('academy_courses').delete().eq('id', id);
      } else {
          const current = await api.getAcademyCourses();
          localStorage.setItem('hrms_academy_courses', JSON.stringify(current.filter(c => c.id !== id)));
      }
  },

  getAcademyProgress: async (): Promise<AcademyProgress[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('academy_progress').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_academy_progress');
      return local ? JSON.parse(local) : MOCK_ACADEMY_PROGRESS;
  },

  saveAcademyProgress: async (progress: AcademyProgress) => {
      if (isLive && supabase) {
          await supabase.from('academy_progress').upsert({ id: progress.id, employee_id: progress.employeeId, course_id: progress.courseId, data: progress });
      } else {
          const current = await api.getAcademyProgress();
          const idx = current.findIndex(p => p.id === progress.id);
          if (idx >= 0) current[idx] = progress;
          else current.push(progress);
          localStorage.setItem('hrms_academy_progress', JSON.stringify(current));
      }
  },

  // --- COMPENSATION ---
  getCompensationPolicies: async (): Promise<CompensationPolicy[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('compensation_policies').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_comp_policies');
      return local ? JSON.parse(local) : [];
  },

  saveCompensationPolicy: async (policy: CompensationPolicy) => {
      if (isLive && supabase) {
          await supabase.from('compensation_policies').upsert({ id: policy.id, data: policy });
      } else {
          const current = await api.getCompensationPolicies();
          const idx = current.findIndex(p => p.id === policy.id);
          if (idx >= 0) current[idx] = policy;
          else current.push(policy);
          localStorage.setItem('hrms_comp_policies', JSON.stringify(current));
      }
  },

  deleteCompensationPolicy: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('compensation_policies').delete().eq('id', id);
      } else {
          const current = await api.getCompensationPolicies();
          localStorage.setItem('hrms_comp_policies', JSON.stringify(current.filter(p => p.id !== id)));
      }
  },

  getCompensationLogs: async (): Promise<CompensationLog[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('compensation_logs').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_comp_logs');
      return local ? JSON.parse(local) : [];
  },

  saveCompensationLog: async (log: CompensationLog) => {
      if (isLive && supabase) {
          await supabase.from('compensation_logs').upsert({ id: log.id, data: log });
      } else {
          const current = await api.getCompensationLogs();
          const idx = current.findIndex(l => l.id === log.id);
          if (idx >= 0) current[idx] = log;
          else current.push(log);
          localStorage.setItem('hrms_comp_logs', JSON.stringify(current));
      }
  },

  deleteCompensationLog: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('compensation_logs').delete().eq('id', id);
      } else {
          const current = await api.getCompensationLogs();
          localStorage.setItem('hrms_comp_logs', JSON.stringify(current.filter(l => l.id !== id)));
      }
  },

  // --- CHECKLISTS ---
  getChecklistTemplates: async (): Promise<ChecklistTemplate[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('checklist_templates').select('id, title, description, items, created_by, is_active, created_at'); // Mapping needed
          // Map DB columns to object
          return data ? data.map((row: any) => ({
              id: row.id,
              title: row.title,
              description: row.description,
              items: row.items,
              createdBy: row.created_by,
              isActive: row.is_active,
              createdAt: row.created_at
          })) : [];
      }
      const local = localStorage.getItem('hrms_checklist_templates');
      return local ? JSON.parse(local) : [];
  },

  saveChecklistTemplate: async (template: ChecklistTemplate) => {
      if (isLive && supabase) {
          await supabase.from('checklist_templates').upsert({
              id: template.id,
              title: template.title,
              description: template.description,
              items: template.items,
              created_by: template.createdBy,
              is_active: template.isActive,
              created_at: template.createdAt
          });
      } else {
          const current = await api.getChecklistTemplates();
          const idx = current.findIndex(t => t.id === template.id);
          if (idx >= 0) current[idx] = template;
          else current.push(template);
          localStorage.setItem('hrms_checklist_templates', JSON.stringify(current));
      }
  },

  deleteChecklistTemplate: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('checklist_templates').delete().eq('id', id);
      } else {
          const current = await api.getChecklistTemplates();
          localStorage.setItem('hrms_checklist_templates', JSON.stringify(current.filter(t => t.id !== id)));
      }
  },

  getChecklistSubmissions: async (): Promise<ChecklistSubmission[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('checklist_submissions').select('*');
          return data ? data.map((row: any) => ({
              id: row.id,
              templateId: row.template_id,
              templateSnapshot: row.template_snapshot,
              submittedBy: row.submitted_by,
              submittedById: row.submitted_by_id,
              status: row.status,
              responses: row.responses,
              startedAt: row.started_at,
              completedAt: row.completed_at
          })) : [];
      }
      const local = localStorage.getItem('hrms_checklist_submissions');
      return local ? JSON.parse(local) : [];
  },

  saveChecklistSubmission: async (submission: ChecklistSubmission) => {
      if (isLive && supabase) {
          await supabase.from('checklist_submissions').upsert({
              id: submission.id,
              template_id: submission.templateId,
              template_snapshot: submission.templateSnapshot,
              submitted_by: submission.submittedBy,
              submitted_by_id: submission.submittedById,
              status: submission.status,
              responses: submission.responses,
              started_at: submission.startedAt,
              completed_at: submission.completedAt
          });
      } else {
          const current = await api.getChecklistSubmissions();
          const idx = current.findIndex(s => s.id === submission.id);
          if (idx >= 0) current[idx] = submission;
          else current.push(submission);
          localStorage.setItem('hrms_checklist_submissions', JSON.stringify(current));
      }
  },

  // --- GLOBAL SETTINGS ---
  getGlobalSettings: async (): Promise<GlobalSettings | null> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('global_settings').select('*').single();
          if (data) {
              return {
                  modules: data.modules || {},
                  branding: data.branding || {},
                  roles: data.roles || {}
              };
          }
          return null;
      }
      const local = localStorage.getItem('hrms_global_settings');
      return local ? JSON.parse(local) : null;
  },

  saveGlobalSettings: async (settings: GlobalSettings) => {
      if (isLive && supabase) {
          await supabase.from('global_settings').upsert({ 
              id: '1', // Singleton
              modules: settings.modules,
              branding: settings.branding,
              roles: settings.roles
          });
      } else {
          localStorage.setItem('hrms_global_settings', JSON.stringify(settings));
      }
  },

  // --- COMPLAINTS ---
  getComplaints: async (): Promise<Complaint[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('complaints').select('*');
          return data ? data.map((row: any) => ({
              id: row.id,
              reservationNumber: row.reservation_number,
              guestName: row.guest_name,
              roomNumber: row.room_number,
              category: row.category,
              department: row.department,
              severity: row.severity,
              status: row.status,
              description: row.description,
              images: row.images,
              compensationDetails: row.compensation_details,
              assignedTo: row.assigned_to,
              createdBy: row.created_by,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              timeline: row.timeline
          })) : [];
      }
      const local = localStorage.getItem('hrms_complaints');
      return local ? JSON.parse(local) : MOCK_COMPLAINTS;
  },

  saveComplaint: async (complaint: Complaint) => {
      if (isLive && supabase) {
          await supabase.from('complaints').upsert({
              id: complaint.id,
              reservation_number: complaint.reservationNumber,
              guest_name: complaint.guestName,
              room_number: complaint.roomNumber,
              category: complaint.category,
              department: complaint.department,
              severity: complaint.severity,
              status: complaint.status,
              description: complaint.description,
              images: complaint.images,
              compensation_details: complaint.compensationDetails,
              assigned_to: complaint.assignedTo,
              created_by: complaint.createdBy,
              created_at: complaint.createdAt,
              updated_at: complaint.updatedAt,
              timeline: complaint.timeline
          });
      } else {
          const current = await api.getComplaints();
          const idx = current.findIndex(c => c.id === complaint.id);
          if (idx >= 0) current[idx] = complaint;
          else current.push(complaint);
          localStorage.setItem('hrms_complaints', JSON.stringify(current));
      }
  },

  deleteComplaint: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('complaints').delete().eq('id', id);
      } else {
          const current = await api.getComplaints();
          localStorage.setItem('hrms_complaints', JSON.stringify(current.filter(c => c.id !== id)));
      }
  },

  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('tasks').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_tasks');
      return local ? JSON.parse(local) : [];
  },

  saveTask: async (task: Task) => {
      if (isLive && supabase) {
          await supabase.from('tasks').upsert({ id: task.id, assignee_id: task.assigneeId, is_general: task.isGeneral, data: task });
      } else {
          const current = await api.getTasks();
          const idx = current.findIndex(t => t.id === task.id);
          if (idx >= 0) current[idx] = task;
          else current.push(task);
          localStorage.setItem('hrms_tasks', JSON.stringify(current));
      }
  },

  deleteTask: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('tasks').delete().eq('id', id);
      } else {
          const current = await api.getTasks();
          localStorage.setItem('hrms_tasks', JSON.stringify(current.filter(t => t.id !== id)));
      }
  },

  // --- BIKE RENTAL ---
  getBikeSettings: async (): Promise<BikeSettings> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('bike_settings').select('data').single();
          return data ? data.data : { inventory: {}, inMaintenance: [], termsAndConditions: '', maintenanceReasons: {} };
      }
      const local = localStorage.getItem('hrms_bike_settings');
      return local ? JSON.parse(local) : { inventory: {}, inMaintenance: [], termsAndConditions: '', maintenanceReasons: {} };
  },

  saveBikeSettings: async (settings: BikeSettings) => {
      if (isLive && supabase) {
          await supabase.from('bike_settings').upsert({ id: '1', data: settings });
      } else {
          localStorage.setItem('hrms_bike_settings', JSON.stringify(settings));
      }
  },

  getBikeReservations: async (): Promise<BikeReservation[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('bike_reservations').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_bike_reservations');
      return local ? JSON.parse(local) : [];
  },

  saveBikeReservation: async (res: BikeReservation) => {
      if (isLive && supabase) {
          await supabase.from('bike_reservations').upsert({ id: res.id, data: res });
      } else {
          const current = await api.getBikeReservations();
          const idx = current.findIndex(r => r.id === res.id);
          if (idx >= 0) current[idx] = res;
          else current.push(res);
          localStorage.setItem('hrms_bike_reservations', JSON.stringify(current));
      }
  },

  // --- SHIFT HANDOVER ---
  getShiftHandoverItems: async (date: string): Promise<ShiftHandoverItem[]> => {
      if (isLive && supabase) {
          // Fetch General (no date or valid range) + Specific for this date
          const { data } = await supabase.from('shift_handover').select('data');
          // Filtering logic can be done in SQL, but for simplicity filtering in JS
          return data ? data.map((row: any) => row.data).filter((item: ShiftHandoverItem) => {
              if (item.category === 'General') return true; // Always show general unless expired (soft delete logic needed)
              return item.date === date;
          }) : [];
      }
      const local = localStorage.getItem('hrms_shift_handover');
      const all: ShiftHandoverItem[] = local ? JSON.parse(local) : [];
      return all.filter(item => {
          // If soft deleted (expiryDate set), filter out
          if (item.expiryDate && new Date(item.expiryDate) <= new Date(date)) return false;
          if (item.category === 'General') return true;
          return item.date === date;
      });
  },

  saveShiftHandoverItem: async (item: ShiftHandoverItem) => {
      if (isLive && supabase) {
          await supabase.from('shift_handover').upsert({ id: item.id, data: item });
      } else {
          const current = JSON.parse(localStorage.getItem('hrms_shift_handover') || '[]');
          const idx = current.findIndex((i: ShiftHandoverItem) => i.id === item.id);
          if (idx >= 0) current[idx] = item;
          else current.push(item);
          localStorage.setItem('hrms_shift_handover', JSON.stringify(current));
      }
  },

  deleteShiftHandoverItem: async (id: string, date: string) => {
      // Soft delete: set expiryDate to now/selected date
      if (isLive && supabase) {
          const { data } = await supabase.from('shift_handover').select('data').eq('id', id).single();
          if (data) {
              const updated = { ...data.data, expiryDate: date };
              await supabase.from('shift_handover').upsert({ id, data: updated });
          }
      } else {
          const current = JSON.parse(localStorage.getItem('hrms_shift_handover') || '[]');
          const idx = current.findIndex((i: ShiftHandoverItem) => i.id === id);
          if (idx >= 0) {
              current[idx].expiryDate = date;
              localStorage.setItem('hrms_shift_handover', JSON.stringify(current));
          }
      }
  },

  // --- STOCK CONTROL ---
  getStockItems: async (): Promise<StockItem[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('stock_items').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_stock_items');
      return local ? JSON.parse(local) : [];
  },

  saveStockItem: async (item: StockItem) => {
      if (isLive && supabase) {
          await supabase.from('stock_items').upsert({ id: item.id, data: item });
      } else {
          const current = await api.getStockItems();
          const index = current.findIndex(i => i.id === item.id);
          if (index >= 0) current[index] = item;
          else current.push(item);
          localStorage.setItem('hrms_stock_items', JSON.stringify(current));
      }
  },

  deleteStockItem: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('stock_items').delete().eq('id', id);
      } else {
          const current = await api.getStockItems();
          localStorage.setItem('hrms_stock_items', JSON.stringify(current.filter(i => i.id !== id)));
      }
  },

  getStockLogs: async (): Promise<StockLog[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('stock_logs').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_stock_logs');
      return local ? JSON.parse(local) : [];
  },

  saveStockLog: async (log: StockLog) => {
      if (isLive && supabase) {
          await supabase.from('stock_logs').upsert({ id: log.id, data: log });
      } else {
          const current = await api.getStockLogs();
          localStorage.setItem('hrms_stock_logs', JSON.stringify([log, ...current]));
      }
  },

  // Stock Orders
  getStockOrders: async (): Promise<StockOrder[]> => {
      if (isLive && supabase) {
          const { data } = await supabase.from('stock_orders').select('data');
          return data ? data.map((row: any) => row.data) : [];
      }
      const local = localStorage.getItem('hrms_stock_orders');
      return local ? JSON.parse(local) : [];
  },

  saveStockOrder: async (order: StockOrder) => {
      if (isLive && supabase) {
          await supabase.from('stock_orders').upsert({ id: order.id, data: order });
      } else {
          const current = await api.getStockOrders();
          const index = current.findIndex(o => o.id === order.id);
          if (index >= 0) current[index] = order;
          else current.push(order);
          localStorage.setItem('hrms_stock_orders', JSON.stringify(current));
      }
  },

  deleteStockOrder: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('stock_orders').delete().eq('id', id);
      } else {
          const current = await api.getStockOrders();
          localStorage.setItem('hrms_stock_orders', JSON.stringify(current.filter(o => o.id !== id)));
      }
  },

  // --- GENERAL UTILS ---
  uploadFile: async (file: File): Promise<string> => {
      // Mock upload - in real app, upload to storage bucket and return URL
      // Here we simulate it by creating a temporary object URL
      // Note: ObjectURLs are revoked on page reload, real app needs persistent storage
      return new Promise((resolve) => {
          setTimeout(() => {
              resolve(URL.createObjectURL(file));
          }, 1000);
      });
  },

  deleteFile: async (url: string) => {
      // Mock delete
      return Promise.resolve();
  },

  getLatestCommitSha: async (): Promise<string | null> => {
      // Mock SHA for update check
      // In real app, fetch from GitHub API or a version file
      return "mock-sha-v1.0.0";
  },

  getSecurityStatus: async (): Promise<any[]> => {
      if (isLive && supabase) {
          // This would require a custom RPC function in Supabase
          // For now, return mock or try to call it if exists
          try {
              const { data, error } = await supabase.rpc('get_table_security_stats');
              if (error) throw error;
              return data;
          } catch (e) {
              console.warn("Security check RPC failed or not implemented", e);
              return [];
          }
      }
      return [];
  }
};
