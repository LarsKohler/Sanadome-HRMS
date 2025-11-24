import { Employee, NewsPost, Notification, Survey } from '../types';
import { MOCK_EMPLOYEES, MOCK_NEWS } from './mockData';

// Keys for localStorage
export const STORAGE_KEYS = {
  EMPLOYEES: 'hrms_employees_v2',
  NEWS: 'hrms_news_v2',
  NOTIFICATIONS: 'hrms_notifications_v2',
  SURVEYS: 'hrms_surveys_v2'
};

// Broadcast Channel for cross-tab communication
const channel = new BroadcastChannel('hrms_sync_channel');

type EventType = 'UPDATE_EMPLOYEES' | 'UPDATE_NEWS' | 'UPDATE_NOTIFICATIONS' | 'UPDATE_SURVEYS';

// Helper to dispatch events locally and across tabs
const notifyChange = (type: EventType, data: any) => {
  // 1. Notify other tabs
  channel.postMessage({ type, data });
  // 2. Notify current tab via CustomEvent
  window.dispatchEvent(new CustomEvent(type, { detail: data }));
};

export const storage = {
  // --- EMPLOYEES ---
  getEmployees: (): Employee[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      return data ? JSON.parse(data) : MOCK_EMPLOYEES;
    } catch {
      return MOCK_EMPLOYEES;
    }
  },
  
  saveEmployees: (employees: Employee[]) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    notifyChange('UPDATE_EMPLOYEES', employees);
  },

  // --- NEWS ---
  getNews: (): NewsPost[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NEWS);
      return data ? JSON.parse(data) : MOCK_NEWS;
    } catch {
      return MOCK_NEWS;
    }
  },

  saveNews: (news: NewsPost[]) => {
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));
    notifyChange('UPDATE_NEWS', news);
  },

  // --- NOTIFICATIONS ---
  getNotifications: (): Notification[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveNotifications: (notifications: Notification[]) => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    notifyChange('UPDATE_NOTIFICATIONS', notifications);
  },

  // --- SURVEYS ---
  getSurveys: (): Survey[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SURVEYS);
      if (data) return JSON.parse(data);
      
      // Default Survey if none exists
      return [{
          id: 's1',
          title: 'Medewerkerstevredenheid 2023',
          description: 'Wij horen graag hoe jij je voelt binnen het team. Deze survey helpt ons om Sanadome nog beter te maken.',
          targetAudience: 'All',
          questions: [
              { id: 'q1', text: 'Ik voel mij gewaardeerd door mijn manager', type: 'Rating', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80' },
              { id: 'q2', text: 'Ik heb voldoende doorgroeimogelijkheden', type: 'Choice', options: ['Mee eens', 'Neutraal', 'Mee oneens'] },
              { id: 'q3', text: 'Wat kunnen we verbeteren op de werkvloer?', type: 'Text' }
          ],
          createdBy: 'HR',
          createdAt: '20 Okt 2023',
          status: 'Active',
          responseCount: 12,
          completedBy: []
      }];
    } catch {
      return [];
    }
  },

  saveSurveys: (surveys: Survey[]) => {
    localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
    notifyChange('UPDATE_SURVEYS', surveys);
  },
  
  // Listeners
  subscribe: (
    onEmployees: (data: Employee[]) => void,
    onNews: (data: NewsPost[]) => void,
    onNotifications: (data: Notification[]) => void,
    onSurveys: (data: Survey[]) => void
  ) => {
    // Listener for other tabs
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'UPDATE_EMPLOYEES') onEmployees(data);
      if (type === 'UPDATE_NEWS') onNews(data);
      if (type === 'UPDATE_NOTIFICATIONS') onNotifications(data);
      if (type === 'UPDATE_SURVEYS') onSurveys(data);
    };

    // Listener for current tab (CustomEvents)
    const handleLocal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type = e.type;
      if (type === 'UPDATE_EMPLOYEES') onEmployees(detail);
      if (type === 'UPDATE_NEWS') onNews(detail);
      if (type === 'UPDATE_NOTIFICATIONS') onNotifications(detail);
      if (type === 'UPDATE_SURVEYS') onSurveys(detail);
    };

    window.addEventListener('UPDATE_EMPLOYEES', handleLocal);
    window.addEventListener('UPDATE_NEWS', handleLocal);
    window.addEventListener('UPDATE_NOTIFICATIONS', handleLocal);
    window.addEventListener('UPDATE_SURVEYS', handleLocal);

    // Also listen to storage events (fallback for some browsers)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.EMPLOYEES) onEmployees(storage.getEmployees());
      if (e.key === STORAGE_KEYS.NEWS) onNews(storage.getNews());
      if (e.key === STORAGE_KEYS.NOTIFICATIONS) onNotifications(storage.getNotifications());
      if (e.key === STORAGE_KEYS.SURVEYS) onSurveys(storage.getSurveys());
    };
    window.addEventListener('storage', handleStorage);

    // Cleanup function
    return () => {
      channel.onmessage = null;
      window.removeEventListener('UPDATE_EMPLOYEES', handleLocal);
      window.removeEventListener('UPDATE_NEWS', handleLocal);
      window.removeEventListener('UPDATE_NOTIFICATIONS', handleLocal);
      window.removeEventListener('UPDATE_SURVEYS', handleLocal);
      window.removeEventListener('storage', handleStorage);
    };
  }
};
