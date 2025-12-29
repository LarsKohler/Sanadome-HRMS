
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Briefcase, MapPin, 
  Mail, Linkedin, Phone, 
  Camera, Image as ImageIcon,
  Calendar, Clock, AlertCircle, FileText, Download, CheckCircle2,
  TrendingUp, Award, ChevronRight, Flag, Target, ArrowUpRight, History, Layers, Check, PlayCircle, Map, User, Sparkles, Zap, LayoutDashboard, Building2, Users, GraduationCap, MessageSquare, ListTodo, Euro, AlertTriangle, HeartPulse, Plane, ClipboardCheck, Circle, Newspaper, Heart, Shield, Rocket, Crown, ThumbsUp, Lightbulb, Flame, Star, Eye, ArrowLeft, ArrowRight, BookOpen, PenTool, CheckCircle, BarChart3, Save, Trophy, Lock, Pencil, Medal, Calendar as CalendarIcon, Thermometer, FolderOpen, Info
} from 'lucide-react';
import { Employee, EmployeeNote, EmployeeDocument, ViewState, NewsPost, EvaluationCycle, BadgeIconKey, BadgeColor, AssignedBadge, AcademyCourse, AcademyProgress, Applicant, DossierEntry, Debtor } from '../types';
import { Modal } from './Modal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';

// ... (Existing Constants BADGE_ICONS, BADGE_COLORS) ...
const BADGE_ICONS: Record<BadgeIconKey, React.ElementType> = {
    'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Heart': Heart, 'Zap': Zap, 'Shield': Shield,
    'Rocket': Rocket, 'Crown': Crown, 'ThumbsUp': ThumbsUp, 'Lightbulb': Lightbulb, 'Flame': Flame,
    'Target': Target, 'Users': Users, 'Eye': Eye
};

const BADGE_COLORS: Record<BadgeColor, string> = {
    'yellow': 'bg-yellow-100 text-yellow-600 border-yellow-200',
    'blue': 'bg-blue-100 text-blue-600 border-blue-200',
    'purple': 'bg-purple-100 text-purple-600 border-purple-200',
    'red': 'bg-red-100 text-red-600 border-red-200',
    'green': 'bg-green-100 text-green-600 border-green-200',
    'pink': 'bg-pink-100 text-pink-600 border-pink-200',
    'orange': 'bg-orange-100 text-orange-600 border-orange-200',
    'slate': 'bg-slate-100 text-slate-600 border-slate-200'
};

interface EmployeeProfileProps {
  employee: Employee; // The profile being viewed
  currentUser: Employee; // The person viewing the profile
  applicants?: Applicant[]; // NEW
  onNext: () => void;
  onPrevious: () => void;
  onChangeView: (view: ViewState) => void;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  onShowToast: (message: string) => void;
  onBack?: () => void; // Function to go back to directory or home
  managers: Employee[];
  latestNews?: NewsPost | null;
}

// Helper to check if a planned evaluation is within 14 days
const isEvaluationUnlockable = (dateStr?: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    
    // Parse NL Date (dd-mm-yyyy)
    const plannedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const unlockDate = new Date(plannedDate);
    unlockDate.setDate(unlockDate.getDate() - 14); // 2 weeks before
    
    return new Date() >= unlockDate;
};

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
  employee, 
  currentUser,
  applicants,
  onNext, 
  onPrevious,
  onChangeView,
  onUpdateEmployee,
  onShowToast,
  onBack,
  managers,
  latestNews
}) => {
  // ... (Existing State & Effects) ...
  const [activeTab, setActiveTab] = useState('Overzicht');
  
  // NEW: HR Dossier States
  const [isSickModalOpen, setIsSickModalOpen] = useState(false);
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false); // NEW for Recovery
  
  const [sickForm, setSickForm] = useState({ duration: '', tasksHandedOver: false, type: 'Kort' as 'Kort'|'Lang'|'Frequent', notes: '' });
  const [lateForm, setLateForm] = useState({ minutes: 0, reason: '', date: new Date().toISOString().split('T')[0] });
  const [warningForm, setWarningForm] = useState({ title: '', description: '', severity: 'Low' as 'Low'|'Medium'|'High' });
  const [recoveryDate, setRecoveryDate] = useState(new Date().toISOString().split('T')[0]); // NEW

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Security Check
  const isOwnProfile = employee.id === currentUser.id;
  const isManager = hasPermission(currentUser, 'MANAGE_EMPLOYEES');
  const canEdit = isOwnProfile || isManager;
  // Dossier Access: Only Managers can SEE and EDIT the HR Dossier tab.
  const canViewDossier = isManager; 

  // Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident'>('General');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisible, setNoteVisible] = useState(true);
  const [noteImpact, setNoteImpact] = useState<'Positive' | 'Negative' | 'Neutral'>('Neutral');
  const [noteScore, setNoteScore] = useState(0); 

  // Onboarding Template State
  const [templateTitle, setTemplateTitle] = useState<string>('');

  // Debt Control State (for Dashboard)
  const [urgentDebtCount, setUrgentDebtCount] = useState(0);
  
  // Badges State
  const [combinedBadges, setCombinedBadges] = useState<any[]>([]); // Mixed type for display

  // Load Template Name
  useEffect(() => {
      const fetchTemplateName = async () => {
          if (employee.activeTemplateId) {
              try {
                  const templates = await api.getTemplates();
                  const found = templates.find(t => t.id === employee.activeTemplateId);
                  if (found) setTemplateTitle(found.title);
                  else setTemplateTitle('Maatwerk Traject');
              } catch (e) {
                  setTemplateTitle('Onboarding Traject');
              }
          } else if (employee.onboardingTasks && employee.onboardingTasks.length > 0) {
              setTemplateTitle('Maatwerk Traject');
          } else {
              setTemplateTitle('');
          }
      };
      
      if (employee.onboardingStatus === 'Active' && (isOwnProfile || isManager)) {
          fetchTemplateName();
      }
  }, [employee.activeTemplateId, employee.onboardingStatus, employee.onboardingTasks, isOwnProfile, isManager]);

  // Load Combined Badges
  useEffect(() => {
      const fetchBadges = async () => {
          const manualBadges = employee.badges || [];
          let displayBadges: any[] = [];

          // 1. Process Manual Badges
          const badgeDefinitions = await api.getBadges(); 
          
          manualBadges.forEach(b => {
              const def = badgeDefinitions.find(d => d.id === b.badgeId);
              if (def) {
                  displayBadges.push({
                      id: b.id,
                      name: def.name,
                      description: def.description,
                      icon: def.icon,
                      color: def.color,
                      date: b.assignedAt,
                      source: b.assignedBy || 'Systeem'
                  });
              }
          });

          // 2. Process Academy Badges
          const progress = await api.getAcademyProgress();
          const courses = await api.getAcademyCourses();
          
          const myProgress = progress.filter(p => p.employeeId === employee.id && p.isBadgeEarned);
          
          myProgress.forEach(p => {
              const course = courses.find(c => c.id === p.courseId);
              if (course && course.badgeConfig && course.badgeConfig.enabled) {
                  displayBadges.push({
                      id: `academy-${p.id}`,
                      name: course.badgeConfig.name,
                      description: `Behaald via cursus: ${course.title}`,
                      icon: course.badgeConfig.icon,
                      color: course.badgeConfig.color,
                      date: p.completedDate || new Date().toLocaleDateString('nl-NL'),
                      source: 'SanaLearn'
                  });
              }
          });

          setCombinedBadges(displayBadges);
      };

      fetchBadges();
  }, [employee]);

  // Fetch Data for Dashboard
  useEffect(() => {
      const loadDashboardData = async () => {
          if (isOwnProfile && hasPermission(employee, 'MANAGE_DEBTORS')) {
              try {
                  const debtors = await api.getDebtors();
                  
                  // SYNCED LOGIC WITH DebtControlPage.tsx
                  const urgent = debtors.filter(d => {
                      // Exclude finished statuses
                      if (d.status === 'Paid' || d.status === 'Correction' || d.status === 'Cashlist') return false;
                      if (!d.statusDate) return false;

                      const statusDate = new Date(d.statusDate);
                      const now = new Date();
                      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      // Final Notice -> 14 days
                      if (d.status === 'Final Notice') {
                          return diffDays > 14;
                      }
                      
                      // Others (New, 1st Reminder, 2nd Reminder) -> 7 days
                      return diffDays > 7;
                  });
                  
                  setUrgentDebtCount(urgent.length);
              } catch (e) {
                  console.error("Failed to fetch dashboard debt stats", e);
              }
          }
      };
      loadDashboardData();
  }, [employee, isOwnProfile]);

  const tabs = useMemo(() => {
    const availableTabs = ['Overzicht'];
    if (isOwnProfile || isManager) {
        availableTabs.push('Carrière');
        availableTabs.push('Evaluatie');
        const hasActiveTasks = employee.onboardingTasks && employee.onboardingTasks.length > 0;
        const isStatusActive = employee.onboardingStatus === 'Active';
        const hasActive = isStatusActive && hasActiveTasks;
        const hasHistory = employee.onboardingHistory && employee.onboardingHistory.length > 0;
        if (hasActive || hasHistory) {
            availableTabs.push('Onboarding');
        }
        availableTabs.push('Documenten');
    }
    if (canViewDossier) {
        availableTabs.push('HR Dossier');
    }
    if (!isOwnProfile && !isManager) {
        availableTabs.push('Contact');
    }
    return availableTabs;
  }, [employee.onboardingStatus, employee.onboardingHistory, employee.onboardingTasks, isOwnProfile, isManager, canViewDossier]);

  useEffect(() => {
      if (!tabs.includes(activeTab)) {
          setActiveTab(tabs[0]);
      }
  }, [tabs, activeTab]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    // ... upload logic ...
    if (!isOwnProfile) return; 
    const file = e.target.files?.[0];
    if (!file) return;
    onShowToast(`${type === 'avatar' ? 'Profielfoto' : 'Banner'} uploaden...`);
    try {
        const oldUrl = type === 'avatar' ? employee.avatar : employee.banner;
        if (oldUrl && oldUrl.includes('supabase')) {
             await api.deleteFile(oldUrl);
        }
        const publicUrl = await api.uploadFile(file);
        if (publicUrl) {
            const updatedEmployee = { ...employee, [type]: publicUrl };
            onUpdateEmployee(updatedEmployee);
            onShowToast(`${type === 'avatar' ? 'Profielfoto' : 'Banner'} succesvol bijgewerkt.`);
        } else {
             onShowToast('Uploaden mislukt. Probeer het opnieuw.');
        }
    } catch (error) {
        console.error("Upload error", error);
        onShowToast('Er is een fout opgetreden bij het uploaden.');
    }
  };

  // ... rest of the file ...
  const handleAddSickLeave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const newEntry: DossierEntry = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'Sick',
          date: new Date().toLocaleDateString('nl-NL'),
          title: 'Ziekmelding',
          description: sickForm.notes || 'Geen toelichting',
          loggedBy: currentUser.name,
          meta: {
              sickType: sickForm.type,
              tasksHandedOver: sickForm.tasksHandedOver,
              nextActionDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('nl-NL')
          }
      };

      const updatedDossier = [newEntry, ...(employee.dossier || [])];
      onUpdateEmployee({ ...employee, dossier: updatedDossier });
      
      setIsSickModalOpen(false);
      setSickForm({ duration: '', tasksHandedOver: false, type: 'Kort', notes: '' });
      onShowToast("Ziekmelding geregistreerd.");
  };

  const handleReportRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      const activeSickEntry = employee.dossier?.find(e => e.type === 'Sick' && !e.endDate);
      if (activeSickEntry) {
          const formattedRecoveryDate = new Date(recoveryDate).toLocaleDateString('nl-NL');
          const updatedDossier = (employee.dossier || []).map(entry => {
              if (entry.id === activeSickEntry.id) {
                  return { ...entry, endDate: formattedRecoveryDate };
              }
              return entry;
          });
          const recoveryEntry: DossierEntry = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'Recovery',
              date: formattedRecoveryDate,
              title: 'Hersteld gemeld',
              description: `Medewerker is weer beter gemeld. Ziekteperiode afgesloten.`,
              loggedBy: currentUser.name
          };
          const finalDossier = [recoveryEntry, ...updatedDossier];
          onUpdateEmployee({ ...employee, dossier: finalDossier });
          setIsRecoveryModalOpen(false);
          onShowToast("Medewerker beter gemeld.");
      }
  };

  const handleAddLateness = async (e: React.FormEvent) => {
      e.preventDefault();
      const recentLates = (employee.dossier || []).filter(e => {
          const entryDate = new Date(e.date.split('-').reverse().join('-'));
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return e.type === 'Late' && entryDate > thirtyDaysAgo;
      }).length;
      const newEntry: DossierEntry = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'Late',
          date: new Date(lateForm.date).toLocaleDateString('nl-NL'),
          title: 'Te Laat',
          description: lateForm.reason,
          loggedBy: currentUser.name,
          meta: {
              minutesLate: lateForm.minutes,
              severity: lateForm.minutes > 30 ? 'Medium' : 'Low'
          }
      };
      if (recentLates >= 2) {
          alert(`Let op: Dit is de ${recentLates + 1}e keer te laat in 30 dagen. Overweeg een officiële waarschuwing.`);
      }
      const updatedDossier = [newEntry, ...(employee.dossier || [])];
      onUpdateEmployee({ ...employee, dossier: updatedDossier });
      setIsLateModalOpen(false);
      setLateForm({ minutes: 0, reason: '', date: new Date().toISOString().split('T')[0] });
      onShowToast("Te laat melding geregistreerd.");
  };

  const handleAddWarning = async (e: React.FormEvent) => {
      e.preventDefault();
      const newEntry: DossierEntry = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'Warning',
          date: new Date().toLocaleDateString('nl-NL'),
          title: warningForm.title,
          description: warningForm.description,
          loggedBy: currentUser.name,
          meta: {
              severity: warningForm.severity
          }
      };
      const updatedDossier = [newEntry, ...(employee.dossier || [])];
      onUpdateEmployee({ ...employee, dossier: updatedDossier });
      setIsWarningModalOpen(false);
      setWarningForm({ title: '', description: '', severity: 'Low' });
      onShowToast("Officiële waarschuwing vastgelegd.");
  };

  const renderDashboardOverview = () => {
      const hiredDate = new Date(employee.hiredOn);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - hiredDate.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

      const openOnboardingTasks = employee.onboardingTasks?.filter(t => t.score !== 100) || [];
      const actionableEvaluations = employee.evaluations?.filter(ev => ev.status === 'EmployeeInput' || ev.status === 'ManagerInput') || [];
      const plannedEvaluations = employee.evaluations?.filter(ev => ev.status === 'Planned') || [];
      const unlockablePlanned = plannedEvaluations.filter(ev => isEvaluationUnlockable(ev.plannedDate));
      
      const recruitmentActions: { applicantName: string, date: string, time: string, id: string }[] = [];
      if (isOwnProfile && applicants) {
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          const today = new Date();
          today.setHours(0,0,0,0);
          
          applicants.forEach(app => {
              if (app.stage === 'Rejected' || app.stage === 'Hired') return;
              (app.interviews || []).forEach(int => {
                  if (int.interviewers && int.interviewers.includes(currentUser.id) && int.status === 'Scheduled') {
                      const intDate = new Date(int.date);
                      if (intDate >= today && intDate <= sevenDaysFromNow) {
                          recruitmentActions.push({
                              applicantName: `${app.firstName} ${app.lastName}`,
                              date: int.date,
                              time: int.time,
                              id: app.id
                          });
                      }
                  }
              });
          });
      }

      const totalActions = openOnboardingTasks.length + actionableEvaluations.length + urgentDebtCount + unlockablePlanned.length + recruitmentActions.length;

      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {(isOwnProfile || isManager) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${totalActions > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'}`}>
                              <ListTodo size={22} />
                          </div>
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Taken</div>
                              <div className="text-lg font-bold text-slate-900">{totalActions}</div>
                          </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                              <Award size={22} />
                          </div>
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dienstverband</div>
                              <div className="text-lg font-bold text-slate-900">
                                  {diffYears > 0 ? `${diffYears}j, ${diffMonths}m` : `${diffMonths} Mnd`}
                              </div>
                          </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                              <Medal size={22} />
                          </div>
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badges</div>
                              <div className="text-lg font-bold text-slate-900">{combinedBadges.length}</div>
                          </div>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                      {(isOwnProfile || isManager) && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                      <Zap size={16} className="text-amber-500" fill="currentColor" /> Actie Centrum
                                  </h3>
                              </div>
                              <div className="divide-y divide-slate-50">
                                  {recruitmentActions.map((action, idx) => (
                                      <div key={`rec-${idx}`} className="p-4 hover:bg-purple-50/30 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => onChangeView(ViewState.RECRUITMENT)}>
                                          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                              <User size={18} />
                                          </div>
                                          <div className="flex-1">
                                              <div className="text-sm font-bold text-purple-900">Sollicitatiegesprek: {action.applicantName}</div>
                                              <div className="text-xs text-purple-700 flex items-center gap-2">
                                                  <CalendarIcon size={10} /> {new Date(action.date).toLocaleDateString()} om {action.time}
                                              </div>
                                          </div>
                                          <ChevronRight size={16} className="text-slate-300 group-hover:text-purple-600" />
                                      </div>
                                  ))}
                                  {urgentDebtCount > 0 && (
                                      <div className="p-4 hover:bg-red-50/30 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => onChangeView(ViewState.DEBT_CONTROL)}>
                                          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                              <AlertTriangle size={18} />
                                          </div>
                                          <div className="flex-1">
                                              <div className="text-sm font-bold text-red-900">Debiteuren Beheer</div>
                                              <div className="text-xs text-red-700">{urgentDebtCount} dossiers vereisen directe opvolging.</div>
                                          </div>
                                          <ChevronRight size={16} className="text-slate-300 group-hover:text-red-600" />
                                      </div>
                                  )}
                                  {actionableEvaluations.map(ev => (
                                      <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => onChangeView(ViewState.EVALUATIONS)}>
                                          <div className={`p-2 rounded-lg ${ev.status === 'EmployeeInput' ? 'bg-teal-100 text-teal-600' : 'bg-purple-100 text-purple-600'}`}>
                                              {ev.status === 'EmployeeInput' ? <Pencil size={18}/> : <ClipboardCheck size={18} />}
                                          </div>
                                          <div className="flex-1">
                                              <div className="text-sm font-bold text-slate-900">{ev.type}</div>
                                              <div className="text-xs font-bold text-slate-500">
                                                  {ev.status === 'EmployeeInput' ? 'Jouw beurt: Invullen' : 'Wachten op manager'}
                                              </div>
                                          </div>
                                          {ev.status === 'EmployeeInput' ? (
                                              <button className="px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors">Invullen</button>
                                          ) : (
                                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                          )}
                                      </div>
                                  ))}
                                  {plannedEvaluations.map(ev => {
                                      const isUnlockable = isEvaluationUnlockable(ev.plannedDate);
                                      return (
                                          <div key={ev.id} className={`p-4 transition-colors flex items-center gap-4 group ${isUnlockable ? 'cursor-pointer hover:bg-slate-50' : 'opacity-70 bg-slate-50/50'}`} onClick={() => isUnlockable && onChangeView(ViewState.EVALUATIONS)}>
                                              <div className={`p-2 rounded-lg ${isUnlockable ? 'bg-teal-100 text-teal-600' : 'bg-slate-200 text-slate-500'}`}>
                                                  {isUnlockable ? <ClipboardCheck size={18} /> : <Lock size={18} />}
                                              </div>
                                              <div className="flex-1">
                                                  <div className="text-sm font-bold text-slate-900">{ev.type} (Ingepland)</div>
                                                  <div className="text-xs text-slate-500">
                                                      {isUnlockable ? 'Beschikbaar om in te vullen' : `Opent automatisch rond ${ev.plannedDate}`}
                                                  </div>
                                              </div>
                                              {isUnlockable && <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-600" />}
                                          </div>
                                      );
                                  })}
                                  {openOnboardingTasks.slice(0, 3).map(task => (
                                      <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => onChangeView(ViewState.ONBOARDING)}>
                                          <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                                              <ListTodo size={18} />
                                          </div>
                                          <div className="flex-1">
                                              <div className="text-sm font-bold text-slate-900">{task.title}</div>
                                              <div className="text-xs text-slate-500">Onboarding Week {task.week}</div>
                                          </div>
                                          <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-600" />
                                      </div>
                                  ))}
                                  {totalActions === 0 && (
                                      <div className="p-8 text-center">
                                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                              <CheckCircle2 size={20} />
                                          </div>
                                          <p className="text-sm font-bold text-slate-900">Alles is bijgewerkt!</p>
                                          <p className="text-xs text-slate-500">Geen openstaande acties.</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                          <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                              <Trophy size={16} className="text-teal-600"/> Badges & Prestaties
                          </h3>
                          {combinedBadges.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {combinedBadges.map((badge, i) => {
                                      const Icon = BADGE_ICONS[badge.icon as BadgeIconKey] || Star;
                                      const colorClass = BADGE_COLORS[badge.color as BadgeColor] || 'bg-slate-100 text-slate-600 border-slate-200';
                                      return (
                                          <div key={i} className="flex flex-col items-center text-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                                              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 ${colorClass}`}>
                                                  <Icon size={20}/>
                                              </div>
                                              <h4 className="text-xs font-bold text-slate-900 leading-tight mb-1">{badge.name}</h4>
                                              <p className="text-[10px] text-slate-400">{badge.source}</p>
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="text-center py-8 text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  Nog geen badges verdiend.
                              </div>
                          )}
                      </div>
                      {!isOwnProfile && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                  <User size={16} className="text-teal-600"/> Over {employee.name.split(' ')[0]}
                              </h3>
                              <p className="text-slate-600 text-sm leading-relaxed">
                                  {employee.name} werkt sinds {employee.hiredOn} bij Sanadome als {employee.role} binnen de afdeling {employee.departments.join(' & ')}.
                              </p>
                              <div className="mt-6">
                                  <h4 className="font-bold text-slate-900 text-xs uppercase mb-3 flex items-center gap-2">
                                      <Sparkles size={14} className="text-teal-600"/> Vaardigheden & Expertise
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                      {['Gastvrijheid', 'IDu PMS', 'Engels', 'Duits', 'Teamplayer'].map(tag => (
                                          <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                                              {tag}
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}
                      {(isOwnProfile || isManager) && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                  <FileText size={16}/> Recente Bestanden
                              </h3>
                              <div className="relative border-l-2 border-slate-100 ml-2 space-y-6 pl-6">
                                  {employee.documents?.slice(0, 2).map((doc, i) => (
                                      <div key={i} className="relative group cursor-pointer" onClick={() => onChangeView(ViewState.DOCUMENTS)}>
                                          <div className="absolute -left-[31px] top-0 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white group-hover:scale-125 transition-transform"></div>
                                          <p className="text-xs text-slate-400 font-bold mb-0.5">{doc.date}</p>
                                          <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{doc.name}</p>
                                          <p className="text-xs text-slate-500">{doc.category}</p>
                                      </div>
                                  ))}
                                  <div className="relative">
                                      <div className="absolute -left-[31px] top-0 w-3 h-3 bg-slate-300 rounded-full ring-4 ring-white"></div>
                                      <p className="text-xs text-slate-400 font-bold mb-0.5">{employee.hiredOn}</p>
                                      <p className="text-sm font-bold text-slate-800">In dienst getreden</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="space-y-6">
                      {isOwnProfile && latestNews && (
                          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-teal-500 shadow-sm group cursor-pointer overflow-hidden hover:shadow-md transition-shadow" onClick={() => onChangeView(ViewState.NEWS)}>
                              <div className="p-5">
                                  <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                                          <Newspaper size={16} className="text-teal-600" /> Nieuws
                                      </h3>
                                      {latestNews.isPinned && !latestNews.readBy?.includes(currentUser.id) ? (
                                          <span className="text-[10px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full animate-pulse">Te Lezen</span>
                                      ) : latestNews.readBy?.includes(currentUser.id) ? (
                                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10}/> Gelezen</span>
                                      ) : (
                                          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Nieuw</span>
                                      )}
                                  </div>
                                  {latestNews.image && (
                                      <div className="relative rounded-xl overflow-hidden mb-3 border border-slate-100">
                                          <img src={latestNews.image} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" alt="News"/>
                                      </div>
                                  )}
                                  <h4 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2 group-hover:text-teal-600 transition-colors">{latestNews.title}</h4>
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{latestNews.shortDescription}</p>
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mt-3 pt-3 border-t border-slate-50">
                                      <span>{latestNews.date}</span>
                                      <span>•</span>
                                      <span>Lees meer <ChevronRight size={10} className="inline"/></span>
                                  </div>
                              </div>
                          </div>
                      )}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Team</h3>
                          <div className="space-y-4">
                              <div className="flex items-center gap-3 group">
                                  <img src="https://ui-avatars.com/api/?name=Dennis+Manager&background=0d9488&color=fff" className="w-10 h-10 rounded-full border border-slate-100" alt="Manager"/>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-slate-900 truncate">Dennis de Manager</div>
                                      <div className="text-xs text-slate-500">Leidinggevende</div>
                                  </div>
                                  <a href="mailto:manager@sanadome.nl" className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><Mail size={16} /></a>
                              </div>
                              {employee.mentor && (
                                  <div className="flex items-center gap-3 group">
                                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-200">{employee.mentor.charAt(0)}</div>
                                      <div className="flex-1 min-w-0">
                                          <div className="text-sm font-bold text-slate-900 truncate">{employee.mentor}</div>
                                          <div className="text-xs text-slate-500">Mentor / Buddy</div>
                                      </div>
                                      <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><MessageSquare size={16} /></button>
                                  </div>
                              )}
                          </div>
                          <div className="mt-6 pt-4 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Contactgegevens</h4>
                              <div className="space-y-1 text-xs text-slate-600 font-medium">
                                  <div className="flex items-center gap-2 truncate"><Mail size={12}/> {employee.email}</div>
                                  <div className="flex items-center gap-2"><Phone size={12}/> {employee.phone}</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderHRDossier = () => {
      const sickLeaves = (employee.dossier || []).filter(e => e.type === 'Sick');
      const lates = (employee.dossier || []).filter(e => e.type === 'Late');
      const sickFreqLast12Months = sickLeaves.filter(e => {
          const d = new Date(e.date.split('-').reverse().join('-'));
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return d > yearAgo;
      }).length;
      const activeCase = sickLeaves.find(e => !e.endDate);
      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute right-0 top-0 p-4 opacity-10"><Thermometer size={64} className="text-slate-900"/></div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Verzuim Frequentie (12 mnd)</h4>
                      <div className="flex items-end gap-2">
                          <span className={`text-4xl font-bold ${sickFreqLast12Months > 3 ? 'text-red-600' : sickFreqLast12Months > 1 ? 'text-amber-500' : 'text-green-600'}`}>{sickFreqLast12Months}</span>
                          <span className="text-sm text-slate-500 mb-1">meldingen</span>
                      </div>
                      {activeCase ? (
                          <div className="mt-4 bg-red-50 text-red-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-between border border-red-100">
                              <span className="flex items-center gap-2"><AlertCircle size={14}/> Ziek sinds {activeCase.date}</span>
                              <button onClick={() => setIsRecoveryModalOpen(true)} className="bg-white border border-red-200 px-2 py-1 rounded text-[10px] uppercase hover:bg-red-50 text-red-600">Herstelmelden</button>
                          </div>
                      ) : (
                          <div className="mt-4 text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Geen lopend verzuim</div>
                      )}
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute right-0 top-0 p-4 opacity-10"><Clock size={64} className="text-slate-900"/></div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Te Laat (Totaal)</h4>
                      <div className="flex items-end gap-2">
                          <span className="text-4xl font-bold text-slate-900">{lates.length}</span>
                          <span className="text-sm text-slate-500 mb-1">keren</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-4">Laatste keer: {lates[0]?.date || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center gap-3">
                      <button onClick={() => setIsSickModalOpen(true)} className="w-full py-2.5 bg-white border border-red-200 text-red-700 font-bold text-sm rounded-xl shadow-sm hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"><Thermometer size={16}/> Meld Ziekte</button>
                      <button onClick={() => setIsLateModalOpen(true)} className="w-full py-2.5 bg-white border border-amber-200 text-amber-700 font-bold text-sm rounded-xl shadow-sm hover:bg-amber-50 flex items-center justify-center gap-2 transition-colors"><Clock size={16}/> Meld Te Laat</button>
                      <button onClick={() => setIsWarningModalOpen(true)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"><AlertTriangle size={16}/> Officiële Waarschuwing</button>
                  </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2"><FolderOpen size={18} className="text-teal-600"/> Dossier Historie</h3>
                  </div>
                  <div className="p-6">
                      {(employee.dossier && employee.dossier.length > 0) ? (
                          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                              {employee.dossier.map((entry) => (
                                  <div key={entry.id} className="relative flex items-start group">
                                      <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10 ${entry.type === 'Sick' ? 'bg-red-100 text-red-600' : entry.type === 'Late' ? 'bg-amber-100 text-amber-600' : entry.type === 'Warning' ? 'bg-slate-900 text-white' : entry.type === 'Recovery' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                          {entry.type === 'Sick' && <Thermometer size={18}/>}
                                          {entry.type === 'Late' && <Clock size={18}/>}
                                          {entry.type === 'Warning' && <AlertTriangle size={18}/>}
                                          {entry.type === 'OfficialNote' && <FileText size={18}/>}
                                          {entry.type === 'Recovery' && <CheckCircle2 size={18}/>}
                                      </div>
                                      <div className="ml-16 w-full">
                                          <div className="flex justify-between items-start mb-1">
                                              <div>
                                                  <span className="text-xs font-bold text-slate-400">{entry.date}</span>
                                                  <h4 className="font-bold text-slate-900 text-sm">{entry.title}</h4>
                                              </div>
                                              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">Door: {entry.loggedBy}</span>
                                          </div>
                                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm text-slate-600 leading-relaxed">
                                              {entry.description}
                                              {entry.meta?.minutesLate && <div className="mt-2 text-xs font-bold text-amber-600">⏱ {entry.meta.minutesLate} minuten te laat</div>}
                                              {entry.meta?.nextActionDate && <div className="mt-2 text-xs font-bold text-teal-600 flex items-center gap-1"><CalendarIcon size={12}/> Opvolging: {entry.meta.nextActionDate}</div>}
                                              {entry.endDate && <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Hersteld op: {entry.endDate}</div>}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-12 text-slate-400 italic">Nog geen dossier-items vastgelegd.</div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const renderCareerDetails = () => {
      const departmentDisplay = employee.departments ? employee.departments.join(', ') : 'Geen afdeling';
      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{employee.role}</h2>
                      <div className="flex flex-wrap gap-3 mb-6">
                          {employee.departments?.map(dept => (<span key={dept} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200">{dept}</span>))}
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200">{employee.employmentType}</span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">Als {employee.role} ben je verantwoordelijk voor de dagelijkse operatie binnen {departmentDisplay}. Je rapporteert direct aan de afdelingsmanager.</p>
                  </div>
                  <div className="w-full md:w-72 bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-teal-600"><Briefcase size={20}/></div>
                          <div>
                              <div className="text-xs font-bold text-slate-400 uppercase">Contract</div>
                              <div className="text-sm font-bold text-slate-900">Onbepaalde tijd</div>
                          </div>
                      </div>
                      <div className="space-y-2 border-t border-slate-200 pt-4 mt-2">
                          <div className="flex justify-between text-sm"><span className="text-slate-500">Uren p/w</span><span className="font-bold text-slate-900">38</span></div>
                          <div className="flex justify-between text-sm"><span className="text-slate-500">Startdatum</span><span className="font-bold text-slate-900">{employee.hiredOn}</span></div>
                      </div>
                      <button onClick={() => onChangeView(ViewState.DOCUMENTS)} className="w-full mt-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-all shadow-sm">Bekijk Contract</button>
                  </div>
              </div>
          </div>
      );
  };

  const renderDocumentsContent = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Personeelsdossier</h3>
          <button onClick={() => onChangeView(ViewState.DOCUMENTS)} className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">Alles bekijken</button>
       </div>
       <div className="divide-y divide-slate-100">
          {employee.documents && employee.documents.length > 0 ? (
            employee.documents.slice(0, 5).map(doc => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-teal-600 group-hover:shadow-sm transition-all"><FileText size={20} /></div>
                    <div>
                       <div className="font-bold text-slate-800 text-sm">{doc.name}</div>
                       <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">{doc.category}</span><span>• {doc.date}</span></div>
                    </div>
                 </div>
                 <button className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Download size={18} /></button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 italic">Geen documenten in dossier.</div>
          )}
       </div>
    </div>
  );

  const renderPerformanceReport = () => {
     const evaluations = [...(employee.evaluations || [])].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
     const chartData = evaluations
        .filter(ev => ev.status === 'Signed' || ev.status === 'Archived' || (ev as any).overallRating)
        .map(ev => ({
            name: ev.type,
            score: (ev as any).overallRating || 0,
            date: ev.completedAt || ev.createdAt
        }));
     return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {chartData.length > 1 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><TrendingUp className="text-teal-600" size={20}/>Prestatie Trend</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 5]} hide />
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value: number) => [value, 'Rating']}/>
                                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(employee.evaluations || []).length > 0 ? (
                    employee.evaluations?.map(ev => {
                        const isPlanned = ev.status === 'Planned';
                        const isLocked = isPlanned && !isEvaluationUnlockable(ev.plannedDate);
                        const isActionable = ev.status === 'EmployeeInput' && isOwnProfile;
                        return (
                            <div key={ev.id} className={`group relative p-5 rounded-2xl border shadow-sm transition-all overflow-hidden ${isLocked ? 'bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed' : isActionable ? 'bg-white border-teal-200 ring-2 ring-teal-50 hover:shadow-md cursor-pointer' : 'bg-white border-slate-200 hover:shadow-md cursor-pointer'}`} onClick={() => { if(!isLocked) { onChangeView(ViewState.EVALUATIONS); }}}>
                                {isLocked && (<div className="absolute top-3 right-3 text-slate-400"><Lock size={16} /></div>)}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[100px] -mr-4 -mt-4 transition-all group-hover:bg-teal-50 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        {isPlanned ? (
                                            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shadow-sm"><CalendarIcon size={16}/></div>
                                        ) : isActionable ? (
                                            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-xs shadow-sm animate-pulse"><Pencil size={16}/></div>
                                        ) : (
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${(ev as any).overallRating && (ev as any).overallRating >= 4 ? 'bg-green-100 text-green-700' : (ev as any).overallRating && (ev as any).overallRating >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{(ev as any).overallRating || '-'}</div>
                                        )}
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${ev.status === 'Signed' ? 'bg-green-50 text-green-700 border-green-100' : ev.status === 'Review' ? 'bg-purple-50 text-purple-700 border-purple-100' : ev.status === 'Planned' ? 'bg-amber-50 text-amber-700 border-amber-100' : ev.status === 'EmployeeInput' ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{ev.status === 'Planned' ? 'Gepland' : ev.status === 'EmployeeInput' ? 'Jouw Beurt' : ev.status}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-lg mb-1">{ev.type}</h4>
                                    <p className="text-xs text-slate-500 mb-4">{isPlanned && ev.plannedDate ? `Gepland: ${ev.plannedDate}` : ev.createdAt}</p>
                                    {!isLocked && (<div className={`flex items-center gap-2 text-xs font-bold transition-colors ${isActionable ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-600'}`}>{isActionable ? 'Nu Invullen' : (isPlanned ? 'Start Evaluatie' : 'Bekijk Rapport')} <ArrowRight size={14}/></div>)}
                                    {isLocked && (<div className="text-xs text-slate-400 italic">Nog niet beschikbaar</div>)}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">Nog geen evaluaties beschikbaar.</div>
                )}
            </div>
            <button onClick={() => onChangeView(ViewState.EVALUATIONS)} className="w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors bg-white shadow-sm">Ga naar Performance Center</button>
        </div>
     );
  };

  const renderOnboardingContent = () => (<div className="p-8 text-center text-slate-400">Onboarding weergave</div>);
  const renderContactContent = () => (<div className="p-8 text-center text-slate-400">Contact weergave</div>);

  return (
    <div className="p-6 lg:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
      {!isOwnProfile && onBack && (<button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"><ArrowLeft size={18} />Terug naar overzicht</button>)}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative group/header">
        <div className="h-48 md:h-64 relative overflow-hidden bg-slate-100">
          {employee.banner ? (<img src={employee.banner} alt="Banner" className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover/header:scale-105" />) : (<div className="w-full h-full bg-slate-200 relative overflow-hidden"><div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-slate-100 to-slate-200"></div></div>)}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          {isOwnProfile && (<button onClick={() => bannerInputRef.current?.click()} className="absolute top-4 right-4 px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-md text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2 opacity-0 group-hover/header:opacity-100"><ImageIcon size={14} /><span className="hidden sm:inline">Cover Wijzigen</span></button>)}
        </div>
        <div className="px-6 md:px-10 pb-0 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-20 mb-6 md:mb-8">
            <div className="relative md:mr-8 mb-4 md:mb-0 group">
              <div className="relative rounded-2xl border-[6px] border-white shadow-xl overflow-hidden bg-white">
                  <img src={employee.avatar} alt={employee.name} className="w-32 h-32 md:w-40 md:h-40 object-cover" />
                  {isOwnProfile && (<div onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"><Camera className="text-white" size={28} /></div>)}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">{employee.name}</h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2"><Briefcase size={16} className="text-slate-400" /><span>{employee.role}</span></div>
                <div className="flex items-center gap-2"><Building2 size={16} className="text-slate-400" /><span>{employee.departments ? employee.departments.join(', ') : 'Geen afdeling'}</span></div>
                {employee.id === currentUser.id && (<span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Jij</span>)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-4 md:pb-0 border-t border-slate-100 md:border-none pt-4 md:pt-0">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 text-sm font-bold rounded-full transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="h-6 md:h-8"></div>
      </div>
      {activeTab === 'Overzicht' && renderDashboardOverview()}
      {activeTab === 'Carrière' && renderCareerDetails()}
      {activeTab === 'Documenten' && renderDocumentsContent()}
      {activeTab === 'Evaluatie' && renderPerformanceReport()}
      {activeTab === 'Onboarding' && renderOnboardingContent()}
      {activeTab === 'Contact' && renderContactContent()}
      {activeTab === 'HR Dossier' && canViewDossier && renderHRDossier()}
      <Modal isOpen={isSickModalOpen} onClose={() => setIsSickModalOpen(false)} title="Nieuwe Ziekmelding">
          <form onSubmit={handleAddSickLeave} className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800 mb-4 flex items-start gap-3">
                  <Thermometer className="shrink-0 mt-0.5" size={18}/>
                  <div>
                      <span className="font-bold">Protocol Ziekmelding:</span>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Vraag naar vermoedelijke duur.</li>
                          <li>Vraag of er lopende taken overgedragen moeten worden.</li>
                          <li>Wens beterschap, maar vraag niet naar medische details (AVG).</li>
                      </ul>
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type Verzuim</label>
                  <div className="flex gap-2">
                      {['Kort', 'Lang', 'Frequent'].map(type => (
                          <button key={type} type="button" onClick={() => setSickForm({...sickForm, type: type as any})} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${sickForm.type === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{type}</button>
                      ))}
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vermoedelijke Duur</label>
                  <input type="text" placeholder="bv. Paar dagen, 1 week..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none" value={sickForm.duration} onChange={e => setSickForm({...sickForm, duration: e.target.value})} />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input type="checkbox" id="tasksHandover" className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300" checked={sickForm.tasksHandedOver} onChange={e => setSickForm({...sickForm, tasksHandedOver: e.target.checked})} />
                  <label htmlFor="tasksHandover" className="text-sm font-bold text-slate-700">Zijn taken/afspraken overgedragen?</label>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Interne Notitie</label>
                  <textarea rows={3} placeholder="Afspraken over contactmomenten, etc." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none" value={sickForm.notes} onChange={e => setSickForm({...sickForm, notes: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-colors">Ziekmelding Registreren</button>
          </form>
      </Modal>
      <Modal isOpen={isRecoveryModalOpen} onClose={() => setIsRecoveryModalOpen(false)} title="Herstel Melden">
          <form onSubmit={handleReportRecovery} className="space-y-6">
              <div className="bg-green-50 p-4 border border-green-100 rounded-xl text-sm text-green-800 mb-4"><p>Meld de medewerker beter. De ziekmelding wordt hiermee afgesloten.</p></div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hersteldatum</label>
                  <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" value={recoveryDate} onChange={e => setRecoveryDate(e.target.value)} />
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-colors">Herstel Bevestigen</button>
          </form>
      </Modal>
      <Modal isOpen={isLateModalOpen} onClose={() => setIsLateModalOpen(false)} title="Te Laat Melding">
          <form onSubmit={handleAddLateness} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Datum</label>
                      <input type="date" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={lateForm.date} onChange={e => setLateForm({...lateForm, date: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aantal Minuten</label>
                      <input type="number" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={lateForm.minutes} onChange={e => setLateForm({...lateForm, minutes: parseInt(e.target.value)})} />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reden</label>
                  <input type="text" placeholder="bv. Verslapen, file, trein vertraging..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={lateForm.reason} onChange={e => setLateForm({...lateForm, reason: e.target.value})} />
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800"><p className="font-bold flex items-center gap-2"><Info size={16}/> Beleid</p><p className="mt-1">Bij frequent te laat komen (3x per maand) volgt een officiële waarschuwing.</p></div>
              <button type="submit" className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg hover:bg-amber-600 transition-colors">Registreren</button>
          </form>
      </Modal>
      <Modal isOpen={isWarningModalOpen} onClose={() => setIsWarningModalOpen(false)} title="Officiële Waarschuwing">
          <form onSubmit={handleAddWarning} className="space-y-6">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl mb-4"><p className="text-sm text-slate-600">Dit formulier legt een officiële waarschuwing vast in het personeelsdossier. Dit is zichtbaar voor HR en Management.</p></div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ernst</label>
                  <div className="flex gap-2">
                      {['Low', 'Medium', 'High'].map(level => (
                          <button key={level} type="button" onClick={() => setWarningForm({...warningForm, severity: level as any})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${warningForm.severity === level ? (level === 'High' ? 'bg-red-600 text-white border-red-600' : level === 'Medium' ? 'bg-orange-500 text-white border-orange-500' : 'bg-yellow-500 text-white border-yellow-500') : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{level === 'High' ? 'Ernstig' : level === 'Medium' ? 'Matig' : 'Licht'}</button>
                      ))}
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Onderwerp</label>
                  <input type="text" placeholder="bv. Werkweigering, Veiligheidsvoorschriften..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none" value={warningForm.title} onChange={e => setWarningForm({...warningForm, title: e.target.value})} />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Beschrijving Incident</label>
                  <textarea rows={5} placeholder="Beschrijf feitelijk wat er is gebeurd..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none" value={warningForm.description} onChange={e => setWarningForm({...warningForm, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors">Waarschuwing Vastleggen</button>
          </form>
      </Modal>
    </div>
  );
};

export default EmployeeProfile;
