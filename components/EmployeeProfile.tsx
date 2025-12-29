
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
    /* Fixed typo: setDates is not a method on Date, should be setDate */
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
  const canViewDossier = isManager; 

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
                  const urgent = debtors.filter(d => {
                      if (d.status === 'Paid' || d.status === 'Correction' || d.status === 'Cashlist') return false;
                      if (!d.statusDate) return false;
                      const statusDate = new Date(d.statusDate);
                      const now = new Date();
                      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (d.status === 'Final Notice') return diffDays > 14;
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
          meta: { severity: warningForm.severity }
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
      const totalActions = (employee.onboardingTasks?.filter(t => t.score !== 100).length || 0) + (employee.evaluations?.filter(ev => ev.status === 'EmployeeInput' || ev.status === 'ManagerInput').length || 0) + urgentDebtCount;

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
                  </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                      {(isOwnProfile || isManager) && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                  <FileText size={16}/> Recente Bestanden
                              </h3>
                              <div className="relative border-l-2 border-slate-100 ml-2 space-y-6 pl-6">
                                  {employee.documents?.slice(0, 2).map((doc, i) => (
                                      <div key={i} className="relative group">
                                          <div className="absolute -left-[31px] top-0 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white group-hover:scale-125 transition-transform"></div>
                                          <p className="text-xs text-slate-400 font-bold mb-0.5">{doc.date}</p>
                                          <div className="flex justify-between items-center pr-4">
                                              <div>
                                                  <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                                                  <p className="text-xs text-slate-500">{doc.category}</p>
                                              </div>
                                              {doc.url && (
                                                <button onClick={() => window.open(doc.url, '_blank')} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                                    <Download size={14} />
                                                </button>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const renderHRDossier = () => (
      <div className="p-8 text-center text-slate-400">Gebruik de tab 'HR Dossier' in het hoofdmenu voor de volledige slide-out ervaring.</div>
  );

  const renderDocumentsContent = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Personeelsdossier</h3>
          <button onClick={() => onChangeView(ViewState.HR_DOSSIER)} className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors">Dossier Beheren</button>
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
                 {doc.url && (
                    <button 
                        onClick={() => window.open(doc.url, '_blank')}
                        className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <Download size={18} />
                    </button>
                 )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 italic">Geen documenten in dossier.</div>
          )}
       </div>
    </div>
  );

  const renderPerformanceReport = () => (<div className="p-8 text-center text-slate-400 italic">Evaluatie overzicht</div>);
  const renderCareerDetails = () => (<div className="p-8 text-center text-slate-400 italic">Carrière details</div>);
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
    </div>
  );
};

export default EmployeeProfile;
