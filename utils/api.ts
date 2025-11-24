
import { supabase } from './supabaseClient';
import { storage } from './storage'; // Fallback
import { Employee, NewsPost, Notification, Survey } from '../types';
import { MOCK_EMPLOYEES, MOCK_NEWS } from './mockData';

// This API layer decides whether to use Supabase (if configured) or LocalStorage (fallback)
// We explicitely check if supabase is not null
export const isLive = !!supabase;

export const api = {
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

  // --- EMPLOYEES ---
  getEmployees: async (): Promise<Employee[]> => {
    if (isLive && supabase) {
      try {
        const { data, error } = await supabase.from('employees').select('data');
        
        // If successful and has data, return it
        if (!error && data && data.length > 0) {
            return data.map((row: any) => row.data);
        }
        
        // If table is empty, attempt to seed it immediately
        if (data?.length === 0) {
           console.log("Employees table empty, attempting auto-seed...");
           await api.seedDatabase(); // Call the seed function
           return MOCK_EMPLOYEES; // Return the mock data directly for immediate UI render
        }
      } catch (e) {
        console.warn("Supabase connection failed, falling back to local storage", e);
        return storage.getEmployees();
      }
    }
    return storage.getEmployees();
  },

  saveEmployee: async (employee: Employee) => {
    if (isLive && supabase) {
      // Upsert: update if exists, insert if new
      const { error } = await supabase.from('employees').upsert({ id: employee.id, data: employee });
      if (error) console.error('Supabase Error:', error);
    } else {
      const current = storage.getEmployees();
      const index = current.findIndex(e => e.id === employee.id);
      if (index >= 0) current[index] = employee;
      else current.push(employee);
      storage.saveEmployees(current);
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
        
        if (data?.length === 0) {
          // Fallback if seed didn't happen in getEmployees
          return MOCK_NEWS; 
        }
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
      // Logic handled in App.tsx mainly, but we need to persist the single update
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
          // This is a bit heavier in a loop, normally we'd do a bulk update or SQL query
          // For now, loop is fine for small scale
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
        if (data?.length === 0) {
             const defaultSurveys = storage.getSurveys(); // Use default from storage logic
             return defaultSurveys;
        }
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

  // --- REALTIME SUBSCRIPTION ---
  subscribe: (
    onEmployees: (data: Employee[]) => void,
    onNews: (data: NewsPost[]) => void,
    onNotifications: (data: Notification[]) => void,
    onSurveys: (data: Survey[]) => void
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
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      // Fallback to LocalStorage events
      return storage.subscribe(onEmployees, onNews, onNotifications, onSurveys);
    }
  }
};
