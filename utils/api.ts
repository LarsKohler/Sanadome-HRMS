



import { supabase } from './supabaseClient';
import { storage } from './storage'; // Fallback
import { Employee, NewsPost, Notification, OnboardingTemplate, SystemUpdateLog, OnboardingTask, Debtor, KnowledgeArticle, Applicant, Ticket, EvaluationCycle, EvaluationTemplate, BikeSettings, BikeReservation, BadgeDefinition, AcademyCourse, AcademyProgress, CompensationPolicy, CompensationLog } from '../types';
import { MOCK_EMPLOYEES, MOCK_NEWS, MOCK_TEMPLATES, MOCK_SYSTEM_LOGS, MOCK_KNOWLEDGE_BASE, MOCK_APPLICANTS, MOCK_TICKETS, MOCK_EVALUATION_TEMPLATES, MOCK_BIKE_SETTINGS, MOCK_BIKE_RESERVATIONS, MOCK_ACADEMY_COURSES, MOCK_ACADEMY_PROGRESS } from './mockData';

// This API layer decides whether to use Supabase (if configured) or LocalStorage (fallback)
export const isLive = !!supabase;

// --- GITHUB CONFIGURATION ---
export const GITHUB_CONFIG = {
    OWNER: 'LarsKohler', 
    REPO: 'Sanadome-HRMS', 
    ENABLE: true 
};

const generateDemoTasks = (): OnboardingTask[] => [
  { id: 'd-1', week: 1, category: 'Introductie', title: 'Rondleiding Hotel & Spa', description: 'Volledige rondleiding door faciliteiten.', completed: true, score: 100, completedBy: 'System', completedDate: 'Vandaag' },
  { id: 'd-2', week: 1, category: 'IT', title: 'IDu PMS Training', description: 'Basisnavigatie in het systeem.', completed: true, score: 100, completedBy: 'System', completedDate: 'Vandaag' },
  { id: 'd-3', week: 2, category: 'Front Office', title: 'Check-in Procedure', description: 'Gasten ontvangen en registreren.', completed: false, score: 0 },
  { id: 'd-4', week: 3, category: 'Financieel', title: 'Kassa Afsluiting', description: 'Procedure voor einde dienst.', completed: false, score: 0 },
];

export const api = {
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
              const { data, error } = await supabase.from('academy_progress').select('data');
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
          await supabase.from('academy_progress').upsert({ 
              id: progress.id, 
              employee_id: progress.employeeId, 
              course_id: progress.courseId, 
              data: progress 
          });
      } else {
          const current = await api.getAcademyProgress();
          const index = current.findIndex(p => p.id === progress.id);
          if (index >= 0) current[index] = progress;
          else current.push(progress);
          localStorage.setItem('hrms_academy_progress', JSON.stringify(current));
      }
  },

  subscribeToAcademy: (onCourses: (data: AcademyCourse[]) => void, onProgress: (data: AcademyProgress[]) => void) => {
      if (isLive && supabase) {
          const channel = supabase.channel('academy_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_courses' }, async () => {
                const courses = await api.getAcademyCourses();
                onCourses(courses);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_progress' }, async () => {
                const progress = await api.getAcademyProgress();
                onProgress(progress);
            })
            .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
      return () => {};
  },

  // --- BADGES (NEW) ---
  getBadges: async (): Promise<BadgeDefinition[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('badges').select('data');
              if (!error && data) return data.map((row: any) => row.data);
              return [];
          } catch (e) {
              return [];
          }
      }
      const local = localStorage.getItem('hrms_badges');
      return local ? JSON.parse(local) : [];
  },

  saveBadge: async (badge: BadgeDefinition) => {
      if (isLive && supabase) {
          await supabase.from('badges').upsert({ id: badge.id, data: badge });
      } else {
          const current = await api.getBadges();
          const index = current.findIndex(b => b.id === badge.id);
          if (index >= 0) current[index] = badge;
          else current.push(badge);
          localStorage.setItem('hrms_badges', JSON.stringify(current));
      }
  },

  deleteBadge: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('badges').delete().eq('id', id);
      } else {
          const current = await api.getBadges();
          const filtered = current.filter(b => b.id !== id);
          localStorage.setItem('hrms_badges', JSON.stringify(filtered));
      }
  },

  // --- BIKE RENTAL (NEW) ---
  getBikeSettings: async (): Promise<BikeSettings> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('bike_settings').select('data').single();
              if (!error && data) return data.data;
              return MOCK_BIKE_SETTINGS;
          } catch (e) {
              return MOCK_BIKE_SETTINGS;
          }
      }
      const local = localStorage.getItem('hrms_bike_settings');
      return local ? JSON.parse(local) : MOCK_BIKE_SETTINGS;
  },

  saveBikeSettings: async (settings: BikeSettings) => {
      if (isLive && supabase) {
          await supabase.from('bike_settings').upsert({ id: 'settings', data: settings });
      } else {
          localStorage.setItem('hrms_bike_settings', JSON.stringify(settings));
      }
  },

  getBikeReservations: async (): Promise<BikeReservation[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('bike_reservations').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              return MOCK_BIKE_RESERVATIONS;
          } catch (e) {
              return MOCK_BIKE_RESERVATIONS;
          }
      }
      const local = localStorage.getItem('hrms_bike_reservations');
      return local ? JSON.parse(local) : MOCK_BIKE_RESERVATIONS;
  },

  saveBikeReservation: async (reservation: BikeReservation) => {
      if (isLive && supabase) {
          await supabase.from('bike_reservations').upsert({ id: reservation.id, data: reservation });
      } else {
          const current = await api.getBikeReservations();
          const index = current.findIndex(r => r.id === reservation.id);
          if (index >= 0) current[index] = reservation;
          else current.unshift(reservation);
          localStorage.setItem('hrms_bike_reservations', JSON.stringify(current));
      }
  },

  // --- TICKETS (NEW) ---
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

  // --- RECRUITMENT (NEW) ---
  getApplicants: async (): Promise<Applicant[]> => {
      if (isLive && supabase) {
          try {
              const { data, error } = await supabase.from('applicants').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              return MOCK_APPLICANTS;
          } catch (e) {
              return MOCK_APPLICANTS;
          }
      }
      const local = localStorage.getItem('hrms_applicants');
      return local ? JSON.parse(local) : MOCK_APPLICANTS;
  },

  saveApplicant: async (applicant: Applicant) => {
      if (isLive && supabase) {
          await supabase.from('applicants').upsert({ id: applicant.id, data: applicant });
      } else {
          const current = await api.getApplicants();
          const index = current.findIndex(a => a.id === applicant.id);
          if (index >= 0) current[index] = applicant;
          else current.unshift(applicant);
          localStorage.setItem('hrms_applicants', JSON.stringify(current));
      }
  },

  deleteApplicant: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('applicants').delete().eq('id', id);
      } else {
          const current = await api.getApplicants();
          const filtered = current.filter(a => a.id !== id);
          localStorage.setItem('hrms_applicants', JSON.stringify(filtered));
      }
  },

  // --- EXISTING METHODS ---
  getSecurityStatus: async (): Promise<{ table_name: string, rls_enabled: boolean }[]> => {
      if (isLive && supabase) {
          try { const { data, error } = await supabase.rpc('get_table_security_stats'); if (error) throw error; return data; } catch (e) { return []; }
      }
      return [{ table_name: 'employees', rls_enabled: true }, { table_name: 'debtors', rls_enabled: true }, { table_name: 'news', rls_enabled: true }];
  },
  loginUser: async (email: string, password: string): Promise<Employee | null> => {
      if (!isLive || !supabase) { const employees = storage.getEmployees(); return employees.find(e => e.email.toLowerCase() === email.toLowerCase() && (e.password === password || e.accountStatus === 'Pending')) || null; }
      try { const { data: authData } = await supabase.auth.signInWithPassword({ email, password }); if (authData.user) { const { data: profileData } = await supabase.from('employees').select('data').eq('id', authData.user.id).single(); if (profileData) return profileData.data as Employee; } const { data, error } = await supabase.from('employees').select('data').eq('data->>email', email).single(); if (error || !data) return null; const emp = data.data as Employee; if (emp.password === password) return emp; return null; } catch (e) { return null; }
  },
  createDemoUser: async (role: 'Manager' | 'Medewerker') => {
      const rand = Math.floor(Math.random() * 10000); const email = role === 'Manager' ? `demo.manager.${rand}@sanadome.nl` : `demo.user.${rand}@sanadome.nl`; const password = 'demo'; const name = role === 'Manager' ? `Demo Manager ${rand}` : `Demo Medewerker ${rand}`; const newId = crypto.randomUUID(); const newEmployee: Employee = { id: newId, name: name, role: role, departments: role === 'Manager' ? ['Management', 'Front Office'] : ['Front Office'], avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${role === 'Manager' ? '0d9488' : '2563eb'}&color=fff`, email: email, password: password, phone: '+31 6 1234 5678', linkedin: name, hiredOn: new Date().toLocaleDateString('nl-NL'), employmentType: 'Full-Time', accountStatus: 'Active', onboardingStatus: role === 'Manager' ? 'Completed' : 'Active', documents: [], notes: [], onboardingTasks: role === 'Manager' ? [] : generateDemoTasks(), evaluations: [] }; await api.saveEmployee(newEmployee, true); return { email, password };
  },
  uploadFile: async (file: File, bucket: string = 'hrms-storage') => { if (isLive && supabase) { try { const fileExt = file.name.split('.').pop(); const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`; const filePath = `${fileName}`; const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file); if (uploadError) return null; const { data } = supabase.storage.from(bucket).getPublicUrl(filePath); return data.publicUrl; } catch (e) { return null; } } return URL.createObjectURL(file); },
  deleteFile: async (fullUrl: string, bucket: string = 'hrms-storage') => { if (isLive && supabase && fullUrl) { try { if (fullUrl.includes(bucket)) { const parts = fullUrl.split(`${bucket}/`); if (parts.length > 1) { const filePath = parts[1]; await supabase.storage.from(bucket).remove([filePath]); } } } catch (e) {} } },
  
  getEmployees: async () => { 
      if (isLive && supabase) { 
          try { 
              // Fetch base employee data
              const { data: empData, error } = await supabase.from('employees').select('data'); 
              
              // Fetch evaluation data from separate table
              const { data: evalData } = await supabase.from('evaluations').select('data');

              if (!error && empData && empData.length > 0) {
                  const employees = empData.map((row: any) => row.data);
                  const evaluations = evalData ? evalData.map((row: any) => row.data) : [];

                  // Merge evaluations into employees
                  return employees.map((emp: Employee) => ({
                      ...emp,
                      evaluations: evaluations.filter((ev: EvaluationCycle) => ev.employeeId === emp.id)
                  }));
              }
              
              if (empData?.length === 0) { await api.seedDatabase(); return MOCK_EMPLOYEES; } 
          } catch (e) { return storage.getEmployees(); } 
      } 
      return storage.getEmployees(); 
  },

  saveEmployee: async (employee: Employee, isNewUser: boolean = false) => { 
      if (isLive && supabase) { 
          try { 
              if (isNewUser && employee.password) { await supabase.rpc('admin_create_user', { new_email: employee.email, new_password: employee.password, new_id: employee.id }); } 
              
              // Also save any evaluations present in the object to the separate table to keep them in sync immediately
              if (employee.evaluations && employee.evaluations.length > 0) {
                  for (const ev of employee.evaluations) {
                      await api.saveEvaluation(ev);
                  }
              }

              let error;
              // Use UPDATE for existing users to respect 'Emp update own' RLS policies correctly
              // Use UPSERT only for new users or admin overrides
              if (!isNewUser) {
                  const result = await supabase.from('employees').update({ data: employee }).eq('id', employee.id);
                  error = result.error;
              } else {
                  const result = await supabase.from('employees').upsert({ id: employee.id, data: employee });
                  error = result.error;
              }

              if (error) {
                  console.error("Supabase Save Error:", error);
                  return false;
              }
              
              return true; 
          } catch (e) { 
              console.error("API Error:", e);
              return false; 
          } 
      } else { 
          const current = storage.getEmployees(); 
          const index = current.findIndex(e => e.id === employee.id); 
          if (index >= 0) current[index] = employee; else current.push(employee); 
          storage.saveEmployees(current); 
          return true; 
      } 
  },

  // NEW: Dedicated Evaluation Save
  saveEvaluation: async (evaluation: EvaluationCycle) => {
      if (isLive && supabase) {
          try {
              await supabase.from('evaluations').upsert({
                  id: evaluation.id,
                  employee_id: evaluation.employeeId,
                  data: evaluation
              });
          } catch (e) {
              console.error("Error saving evaluation:", e);
          }
      }
  },

  // NEW: Delete Evaluation
  deleteEvaluation: async (id: string) => {
      if (isLive && supabase) {
          try {
              await supabase.from('evaluations').delete().eq('id', id);
          } catch (e) {
              console.error("Error deleting evaluation:", e);
          }
      }
  },

  // NEW: Evaluation Templates Logic
  getEvaluationTemplates: async (): Promise<EvaluationTemplate[]> => {
      if (isLive && supabase) {
          // Assuming a table 'evaluation_templates' exists, otherwise fallback or create
          try {
              const { data, error } = await supabase.from('evaluation_templates').select('data');
              if (!error && data && data.length > 0) return data.map((row: any) => row.data);
              // Fallback if table empty
              return MOCK_EVALUATION_TEMPLATES;
          } catch (e) {
              return MOCK_EVALUATION_TEMPLATES;
          }
      }
      const local = localStorage.getItem('hrms_evaluation_templates');
      return local ? JSON.parse(local) : MOCK_EVALUATION_TEMPLATES;
  },

  saveEvaluationTemplate: async (template: EvaluationTemplate) => {
      if (isLive && supabase) {
          await supabase.from('evaluation_templates').upsert({ id: template.id, data: template });
      } else {
          const current = await api.getEvaluationTemplates();
          const index = current.findIndex(t => t.id === template.id);
          if (index >= 0) current[index] = template;
          else current.push(template);
          localStorage.setItem('hrms_evaluation_templates', JSON.stringify(current));
      }
  },

  deleteEvaluationTemplate: async (id: string) => {
      if (isLive && supabase) {
          await supabase.from('evaluation_templates').delete().eq('id', id);
      } else {
          const current = await api.getEvaluationTemplates();
          const filtered = current.filter(t => t.id !== id);
          localStorage.setItem('hrms_evaluation_templates', JSON.stringify(filtered));
      }
  },

  deleteEmployee: async (id: string) => { if (isLive && supabase) { await supabase.rpc('admin_delete_user', { target_user_id: id }); } else { const current = storage.getEmployees(); const filtered = current.filter(e => e.id !== id); storage.saveEmployees(filtered); } },
  
  getKnowledgeArticles: async () => { if (isLive && supabase) { try { const { data, error } = await supabase.from('knowledge_base').select('data'); if (!error && data && data.length > 0) return data.map((row: any) => row.data); return MOCK_KNOWLEDGE_BASE; } catch (e) { return MOCK_KNOWLEDGE_BASE; } } const local = localStorage.getItem('hrms_kb'); return local ? JSON.parse(local) : MOCK_KNOWLEDGE_BASE; },
  saveKnowledgeArticle: async (article: KnowledgeArticle) => { if (isLive && supabase) { await supabase.from('knowledge_base').upsert({ id: article.id, data: article }); } else { const current = await api.getKnowledgeArticles(); const index = current.findIndex(a => a.id === article.id); if (index >= 0) current[index] = article; else current.unshift(article); localStorage.setItem('hrms_kb', JSON.stringify(current)); } },
  deleteKnowledgeArticle: async (id: string) => { if (isLive && supabase) { await supabase.from('knowledge_base').delete().eq('id', id); } else { const current = await api.getKnowledgeArticles(); const filtered = current.filter(a => a.id !== id); localStorage.setItem('hrms_kb', JSON.stringify(filtered)); } },
  getNews: async () => { if (isLive && supabase) { try { const { data, error } = await supabase.from('news').select('data'); if (!error && data && data.length > 0) return data.map((row: any) => row.data); return MOCK_NEWS; } catch (e) { return storage.getNews(); } } return storage.getNews(); },
  saveNewsPost: async (post: NewsPost) => { if (isLive && supabase) { await supabase.from('news').upsert({ id: post.id, data: post }); } else { const current = storage.getNews(); storage.saveNews([post, ...current]); } },
  updateNewsPost: async (post: NewsPost) => { if (isLive && supabase) { await supabase.from('news').upsert({ id: post.id, data: post }); } else { const current = storage.getNews(); const updated = current.map(n => n.id === post.id ? post : n); storage.saveNews(updated); } },
  deleteNewsPost: async (id: string) => { if (isLive && supabase) { await supabase.from('news').delete().eq('id', id); } else { const current = storage.getNews(); storage.saveNews(current.filter(n => n.id !== id)); } },
  getNotifications: async () => { if (isLive && supabase) { try { const { data, error } = await supabase.from('notifications').select('data'); if (!error && data) return data.map((row: any) => row.data); } catch (e) { return storage.getNotifications(); } } return storage.getNotifications(); },
  saveNotification: async (notification: Notification) => { if (isLive && supabase) { await supabase.from('notifications').insert({ id: notification.id, data: notification }); } else { const current = storage.getNotifications(); storage.saveNotifications([notification, ...current]); } },
  deleteNotification: async (id: string) => { if (isLive && supabase) { await supabase.from('notifications').delete().eq('id', id); } else { const current = storage.getNotifications(); const filtered = current.filter(n => n.id !== id); storage.saveNotifications(filtered); } },
  markNotificationRead: async (id: string, allNotifications: Notification[]) => { const notif = allNotifications.find(n => n.id === id); if (notif) { const updated = { ...notif, read: true }; if (isLive && supabase) { await supabase.from('notifications').update({ data: updated }).eq('id', id); } else { const current = storage.getNotifications(); const newStore = current.map(n => n.id === id ? updated : n); storage.saveNotifications(newStore); } } },
  markAllNotificationsRead: async (userId: string, allNotifications: Notification[]) => { const userNotifs = allNotifications.filter(n => n.recipientId === userId && !n.read); if (isLive && supabase) { for (const n of userNotifs) { await supabase.from('notifications').update({ data: { ...n, read: true } }).eq('id', n.id); } } else { const current = storage.getNotifications(); const updated = current.map(n => n.recipientId === userId ? { ...n, read: true } : n); storage.saveNotifications(updated); } },
  
  getTemplates: async () => { if (isLive && supabase) { try { const { data, error } = await supabase.from('onboarding_templates').select('data'); if (!error && data && data.length > 0) return data.map((row: any) => row.data); return storage.getTemplates(); } catch (e) { return storage.getTemplates(); } } return storage.getTemplates(); },
  saveTemplate: async (template: OnboardingTemplate) => { if (isLive && supabase) { await supabase.from('onboarding_templates').upsert({ id: template.id, data: template }); } else { const current = storage.getTemplates(); const index = current.findIndex(t => t.id === template.id); if (index >= 0) current[index] = template; else current.push(template); storage.saveTemplates(current); } },
  deleteTemplate: async (id: string) => { if (isLive && supabase) { await supabase.from('onboarding_templates').delete().eq('id', id); } else { const current = storage.getTemplates(); storage.saveTemplates(current.filter(t => t.id !== id)); } },
  getDebtors: async () => { if (isLive && supabase) { try { const { data, error } = await supabase.from('debtors').select('data'); if (!error && data && data.length > 0) return data.map((row: any) => row.data); return []; } catch (e) { const local = localStorage.getItem('hrms_debtors'); return local ? JSON.parse(local) : []; } } else { const local = localStorage.getItem('hrms_debtors'); return local ? JSON.parse(local) : []; } },
  saveDebtors: async (debtors: Debtor[]) => { if (isLive && supabase) { const updates = debtors.map(d => ({ id: d.id, data: d })); await supabase.from('debtors').upsert(updates); } localStorage.setItem('hrms_debtors', JSON.stringify(debtors)); },
  deleteDebtor: async (id: string) => { if (isLive && supabase) { const { error } = await supabase.from('debtors').delete().eq('id', id); if (error) return false; } const local = localStorage.getItem('hrms_debtors'); if (local) { const parsed = JSON.parse(local); const filtered = parsed.filter((d: Debtor) => d.id !== id); localStorage.setItem('hrms_debtors', JSON.stringify(filtered)); } return true; },
  deleteDebtors: async (ids: string[]) => { if (isLive && supabase) { const { error } = await supabase.from('debtors').delete().in('id', ids); if (error) return false; } const local = localStorage.getItem('hrms_debtors'); if (local) { const parsed = JSON.parse(local) as Debtor[]; const filtered = parsed.filter(d => !ids.includes(d.id)); localStorage.setItem('hrms_debtors', JSON.stringify(filtered)); } return true; },
  subscribeToDebtors: (onUpdate: (debtors: Debtor[]) => void) => { if (isLive && supabase) { const channel = supabase.channel('debtors_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'debtors' }, async () => { const { data } = await supabase.from('debtors').select('data'); if (data) onUpdate(data.map((r: any) => r.data)); }).subscribe(); return () => { supabase.removeChannel(channel); }; } return () => {}; },
  
  getLatestCommitSha: async (): Promise<string | null> => {
      if (GITHUB_CONFIG.ENABLE) {
          try {
              const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/commits?per_page=1`);
              if (response.ok) {
                  const commits = await response.json();
                  if (commits && commits.length > 0) {
                      return commits[0].sha;
                  }
              }
          } catch (e) {
              console.warn("Failed to check for updates");
          }
      }
      return null;
  },

  getSystemLogs: async () => { if (GITHUB_CONFIG.ENABLE) { try { const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/commits?per_page=15`); if (response.ok) { const commits = await response.json(); return commits.map((c: any) => { const msg = c.commit.message || ''; const title = msg.split('\n')[0]; let type = 'Maintenance'; if (title.toLowerCase().includes('feat')) type = 'Feature'; else if (title.toLowerCase().includes('fix')) type = 'Bugfix'; return { id: c.sha, version: c.sha.substring(0, 7), date: new Date(c.commit.author.date).toLocaleDateString('nl-NL'), timestamp: new Date(c.commit.author.date).toLocaleTimeString('nl-NL'), author: c.commit.author.name, type, impact: 'Low', affectedArea: 'System', description: title, status: 'Success' }; }); } } catch (e) {} } if (isLive && supabase) { try { const { data } = await supabase.from('system_updates').select('data'); if (data && data.length > 0) return data.map((row: any) => row.data); } catch (e) {} } return MOCK_SYSTEM_LOGS; },
  saveSystemLog: async (log: SystemUpdateLog) => { if (isLive && supabase) { await supabase.from('system_updates').insert({ id: log.id, data: log }); } },
  seedDatabase: async () => { if (!isLive || !supabase) return; const { data } = await supabase.from('employees').select('id'); if (!data || data.length === 0) { const all = [...MOCK_EMPLOYEES]; for (const emp of all) { await api.saveEmployee(emp); } } },
  
  subscribe: (
    onEmployees: (data: Employee[]) => void,
    onNews: (data: NewsPost[]) => void,
    onNotifications: (data: Notification[]) => void,
    onTemplates?: (data: OnboardingTemplate[]) => void
  ) => {
    if (isLive && supabase) {
      const channel = supabase.channel('main')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => { 
            // Re-fetch all with merged evaluations
            const all = await api.getEmployees();
            onEmployees(all); 
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, async () => { 
            // Also re-fetch all when evaluations change
            const all = await api.getEmployees();
            onEmployees(all); 
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, async () => { const { data } = await supabase.from('news').select('data'); if (data) onNews(data.map((r: any) => r.data)); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => { const { data } = await supabase.from('notifications').select('data'); if (data) onNotifications(data.map((r: any) => r.data)); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_templates' }, async () => { if (onTemplates) { const { data } = await supabase.from('onboarding_templates').select('data'); if (data) onTemplates(data.map((r: any) => r.data)); } })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      return storage.subscribe(onEmployees, onNews, onNotifications, onTemplates);
    }
  }
};