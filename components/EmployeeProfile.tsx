import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Briefcase, MapPin, 
  Mail, Linkedin, Phone, 
  Camera, Image as ImageIcon,
  Calendar, Clock, AlertCircle, FileText, Download, CheckCircle2,
  TrendingUp, Award, ChevronRight, Flag, Target, ArrowUpRight, History, Layers, Check, PlayCircle, Map, User, Sparkles, Zap, LayoutDashboard, Building2, Users, GraduationCap, MessageSquare, ListTodo, Euro, AlertTriangle, HeartPulse, Plane, ClipboardCheck, Ticket, Circle, Newspaper, Medal, Heart, Shield, Rocket, Crown, ThumbsUp, Lightbulb, Flame, Star, Eye, ArrowLeft, ArrowRight, BookOpen, PenTool, CheckCircle, BarChart3, Save, Trophy
} from 'lucide-react';
import { Employee, LeaveRequest, EmployeeNote, EmployeeDocument, Notification, ViewState, Ticket as TicketType, NewsPost, BadgeDefinition, PersonalDevelopmentGoal, InterimCheckIn } from '../types';
import { Modal } from './Modal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';

interface EmployeeProfileProps {
  employee: Employee; // The profile being viewed
  currentUser: Employee; // The person viewing the profile
  onNext: () => void;
  onPrevious: () => void;
  onChangeView: (view: ViewState) => void;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
  onBack?: () => void; // Function to go back to directory or home
  managers: Employee[];
  latestNews?: NewsPost | null;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
  employee, 
  currentUser,
  onNext, 
  onPrevious,
  onChangeView,
  onUpdateEmployee,
  onAddNotification,
  onShowToast,
  onBack,
  managers,
  latestNews
}) => {
  const [activeTab, setActiveTab] = useState('Overzicht');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  // Growth & Reflection State
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<PersonalDevelopmentGoal | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  
  // Interim Check-in State
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<InterimCheckIn | null>(null);
  const [checkInScore, setCheckInScore] = useState(0);
  const [checkInNotes, setCheckInNotes] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Security Check
  const isOwnProfile = employee.id === currentUser.id;
  const isManager = hasPermission(currentUser, 'MANAGE_EMPLOYEES');
  const canEdit = isOwnProfile || isManager;

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
  
  // Tickets State
  const [myTickets, setMyTickets] = useState<TicketType[]>([]);

  // Badges Definitions State
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>([]);

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

  // Fetch Data for Dashboard and Badges
  useEffect(() => {
      const loadDashboardData = async () => {
          // Only load sensitive data if own profile or manager
          if (isOwnProfile && hasPermission(employee, 'MANAGE_DEBTORS')) {
              try {
                  const debtors = await api.getDebtors();
                  const urgent = debtors.filter(d => {
                      if (d.status === 'Paid' || d.status === 'Blacklist' || d.status === 'New') return false;
                      if (!d.statusDate) return false;
                      const statusDate = new Date(d.statusDate);
                      const diffTime = Math.abs(new Date().getTime() - statusDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays > 14;
                  });
                  setUrgentDebtCount(urgent.length);
              } catch (e) {
                  console.error("Failed to fetch dashboard debt stats", e);
              }
          }

          // Tickets (Own only)
          if (isOwnProfile) {
              try {
                  const allTickets = await api.getTickets();
                  const mine = allTickets
                      .filter(t => t.submittedById === employee.id && t.status !== 'Closed')
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                      .slice(0, 3);
                  setMyTickets(mine);
              } catch (e) {
                  console.error("Failed to load tickets", e);
              }
          }

          // Badges (Always load, public info)
          try {
              const defs = await api.getBadges();
              setBadgeDefinitions(defs);
          } catch (e) {
              console.error("Failed to load badges", e);
          }
      };
      loadDashboardData();
  }, [employee, isOwnProfile]);

  const tabs = useMemo(() => {
    // PUBLIC TABS
    const availableTabs = ['Overzicht'];

    if (isOwnProfile || isManager) {
        // PRIVATE / MANAGEMENT TABS
        availableTabs.push('Carrière');
        availableTabs.push('Groeipad'); // New Growth Path
        availableTabs.push('Evaluatie');
        
        const hasActiveTasks = employee.onboardingTasks && employee.onboardingTasks.length > 0;
        const isStatusActive = employee.onboardingStatus === 'Active';
        const hasActive = isStatusActive && hasActiveTasks;
        const hasHistory = employee.onboardingHistory && employee.onboardingHistory.length > 0;

        if (hasActive || hasHistory) {
            availableTabs.push('Onboarding');
        }
        
        availableTabs.push('Documenten');
    } else {
        // VISITOR TABS
        availableTabs.push('Contact');
    }
    
    return availableTabs;
  }, [employee.onboardingStatus, employee.onboardingHistory, employee.onboardingTasks, isOwnProfile, isManager]);

  useEffect(() => {
      if (!tabs.includes(activeTab)) {
          setActiveTab(tabs[0]);
      }
  }, [tabs, activeTab]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (!isOwnProfile) return; // Security check

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

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const newNote: EmployeeNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: noteTitle,
      category: noteCategory,
      content: noteContent,
      date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
      author: currentUser.name, // Author is the one logged in
      visibleToEmployee: noteVisible,
      impact: noteImpact,
      score: noteImpact === 'Neutral' ? 0 : (noteImpact === 'Negative' ? -Math.abs(noteScore) : Math.abs(noteScore))
    };
    const updatedEmployee = { ...employee, notes: [newNote, ...(employee.notes || [])] };
    onUpdateEmployee(updatedEmployee);
    setIsNoteModalOpen(false);
    setNoteTitle('');
    setNoteContent('');
    setNoteVisible(true);
    setNoteImpact('Neutral');
    setNoteScore(0);
    onShowToast('Notitie toegevoegd.');
  };

  // --- GOAL ACTIONS ---
  
  const handleOpenCheckIn = (goal: PersonalDevelopmentGoal, checkIn: InterimCheckIn) => {
      setSelectedGoal(goal);
      setActiveCheckIn(checkIn);
      setCheckInScore(goal.progress || checkIn.score || 0);
      setCheckInNotes(checkIn.managerNotes || '');
      setIsCheckInModalOpen(true);
  };

  const handleSubmitCheckIn = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGoal || !activeCheckIn) return;

      // Update the specific check-in
      const updatedCheckIns = (selectedGoal.checkIns || []).map(ci => 
          ci.id === activeCheckIn.id 
          ? { ...ci, status: 'Completed' as const, score: checkInScore, managerNotes: checkInNotes, completedDate: new Date().toLocaleDateString('nl-NL') }
          : ci
      );

      // Update the main goal progress
      const updatedGoal = {
          ...selectedGoal,
          checkIns: updatedCheckIns,
          progress: checkInScore // Set main progress to latest score
      };

      // Update employee
      const updatedGoals = (employee.growthGoals || []).map(g => g.id === selectedGoal.id ? updatedGoal : g);
      const updatedEmployee = { ...employee, growthGoals: updatedGoals };
      
      onUpdateEmployee(updatedEmployee);
      api.saveEmployee(updatedEmployee);
      
      setIsCheckInModalOpen(false);
      onShowToast("Tussentijdse evaluatie opgeslagen!");
  };

  const handleAddReflection = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGoal || !reflectionText) return;

      const newReflection = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toLocaleDateString('nl-NL'),
          content: reflectionText,
          author: currentUser.name
      };

      const updatedGoals = (employee.growthGoals || []).map(g => 
          g.id === selectedGoal.id ? { ...g, reflections: [newReflection, ...g.reflections] } : g
      );

      const updatedEmployee = { ...employee, growthGoals: updatedGoals };
      onUpdateEmployee(updatedEmployee);
      api.saveEmployee(updatedEmployee);
      
      setIsReflectionModalOpen(false);
      setReflectionText('');
      onShowToast("Reflectie toegevoegd!");
  };

  // Helper for Badge Icons
  const getBadgeIcon = (iconName: string) => {
      const size = 20;
      switch (iconName) {
          case 'Trophy': return <Trophy size={size} />;
          case 'Star': return <Star size={size} />;
          case 'Medal': return <Medal size={size} />;
          case 'Heart': return <Heart size={size} />;
          case 'Zap': return <Zap size={size} />;
          case 'Shield': return <Shield size={size} />;
          case 'Rocket': return <Rocket size={size} />;
          case 'Crown': return <Crown size={size} />;
          case 'ThumbsUp': return <ThumbsUp size={size} />;
          case 'Lightbulb': return <Lightbulb size={size} />;
          case 'Flame': return <Flame size={size} />;
          case 'Target': return <Target size={size} />;
          case 'Users': return <Users size={size} />;
          case 'Eye': return <Eye size={size} />;
          default: return <Award size={size} />;
      }
  };

  const getBadgeColorClasses = (color: string) => {
      switch (color) {
          case 'yellow': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
          case 'blue': return 'bg-blue-100 text-blue-600 border-blue-200';
          case 'purple': return 'bg-purple-100 text-purple-600 border-purple-200';
          case 'red': return 'bg-red-100 text-red-600 border-red-200';
          case 'green': return 'bg-green-100 text-green-600 border-green-200';
          case 'pink': return 'bg-pink-100 text-pink-600 border-pink-200';
          case 'orange': return 'bg-orange-100 text-orange-600 border-orange-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  // --- RENDER SECTIONS ---

  const renderBadges = () => {
      if (!employee.badges || employee.badges.length === 0) {
          if (!isOwnProfile) return <div className="text-sm text-slate-400 italic p-4">Nog geen badges behaald.</div>;
          return null;
      }

      return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Medal size={16} className="text-teal-600" /> Verzameling & Waardering
              </h3>
              <div className="grid grid-cols-4 gap-3">
                  {employee.badges.map((assigned) => {
                      const def = badgeDefinitions.find(b => b.id === assigned.badgeId);
                      if (!def) return null;
                      
                      return (
                          <div key={assigned.id} className="group relative flex justify-center">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 transition-transform hover:scale-110 cursor-help ${getBadgeColorClasses(def.color)}`}>
                                  {getBadgeIcon(def.icon)}
                              </div>
                              
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                  <div className="font-bold text-sm mb-1">{def.name}</div>
                                  <div className="opacity-90 mb-2 leading-tight">{def.description}</div>
                                  <div className="border-t border-slate-600 pt-2 text-[10px] text-slate-400">
                                      Uitgereikt door {assigned.assignedBy}<br/>
                                      {assigned.assignedAt}
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderDashboardOverview = () => {
      // Calculate Tenure
      const hiredDate = new Date(employee.hiredOn);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - hiredDate.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

      // Actions (Only for owner/manager)
      const openOnboardingTasks = employee.onboardingTasks?.filter(t => t.score !== 100) || [];
      const pendingEvaluations = employee.evaluations?.filter(ev => ev.status === 'EmployeeInput' || ev.status === 'ManagerInput') || [];
      const totalActions = openOnboardingTasks.length + pendingEvaluations.length + urgentDebtCount;

      // Active Growth Goal (The most recent in-progress one)
      // Changed: Show all NON-completed goals (In Progress AND Not Started) to ensure consistency
      const activeGrowthGoal = (employee.growthGoals || [])
          .filter(g => g.status !== 'Completed')
          .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* VITAL STATS ROW (Private/Manager only) */}
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
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                              <Ticket size={22} />
                          </div>
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mijn Tickets</div>
                              <div className="text-lg font-bold text-slate-900">{isOwnProfile ? myTickets.length : '-'}</div>
                          </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-teal-300 transition-colors" onClick={() => onShowToast('Verlof module binnenkort beschikbaar')}>
                          <div className="relative w-12 h-12 flex-shrink-0">
                               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className="text-teal-500" strokeDasharray={`${isOwnProfile ? 60 : 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                               </svg>
                               <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-700">{isOwnProfile ? 25 : '-'}d</div>
                          </div>
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verlof Saldo</div>
                              <div className="text-xs text-slate-500">Beschikbaar</div>
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
                  
                  {/* MAIN COLUMN */}
                  <div className="lg:col-span-2 space-y-6">
                      
                      {/* Active Growth Path Card (NEW) */}
                      {activeGrowthGoal && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                              <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                      <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded uppercase tracking-wide border border-teal-100 flex items-center gap-1">
                                              <TrendingUp size={10} /> Huidig Groeipad
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-400">{activeGrowthGoal.category}</span>
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-900">{activeGrowthGoal.title}</h3>
                                      {/* Find next check-in */}
                                      {(() => {
                                          const next = (activeGrowthGoal.checkIns || []).find(c => c.status === 'Planned');
                                          return next ? (
                                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                  <Clock size={12}/> Volgende evaluatie: <strong>{next.date}</strong>
                                              </p>
                                          ) : (
                                              <p className="text-xs text-slate-500 mt-1">Afrondende fase.</p>
                                          );
                                      })()}
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                      <div className="text-right">
                                          <div className="text-3xl font-bold text-slate-900">{activeGrowthGoal.progress}%</div>
                                          <div className="text-xs text-slate-400 uppercase font-bold">Voortgang</div>
                                      </div>
                                      <button 
                                        onClick={() => setActiveTab('Groeipad')}
                                        className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors"
                                      >
                                          <ChevronRight size={20} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* Action Center (Only Own Profile/Manager) */}
                      {(isOwnProfile || isManager) && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                      <Zap size={16} className="text-amber-500" fill="currentColor" /> Actie Centrum
                                  </h3>
                              </div>
                              
                              <div className="divide-y divide-slate-50">
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

                                  {pendingEvaluations.map(ev => (
                                      <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => onChangeView(ViewState.EVALUATIONS)}>
                                          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                              <ClipboardCheck size={18} />
                                          </div>
                                          <div className="flex-1">
                                              <div className="text-sm font-bold text-slate-900">Evaluatie: {ev.type}</div>
                                              <div className="text-xs text-slate-500">Jouw input wordt verwacht.</div>
                                          </div>
                                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                      </div>
                                  ))}

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

                      {/* Visitor View: About / Bio Section */}
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

                      {/* Recent Documents / Activity (Private) */}
                      {(isOwnProfile || isManager) && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                  <FileText size={16}/> Recente Bestanden
                              </h3>
                              <div className="relative border-l-2 border-slate-100 ml-2 space-y-6 pl-6">
                                  {employee.documents.slice(0, 2).map((doc, i) => (
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

                  {/* SIDEBAR COLUMN */}
                  <div className="space-y-6">
                      
                      {/* BADGES SECTION - Visible to Everyone */}
                      {renderBadges()}

                      {/* Latest News Widget (Own Profile Only) */}
                      {isOwnProfile && latestNews && (
                          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-teal-500 shadow-sm group cursor-pointer overflow-hidden hover:shadow-md transition-shadow" onClick={() => onChangeView(ViewState.NEWS)}>
                              <div className="p-5">
                                  <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                                          <Newspaper size={16} className="text-teal-600" /> Nieuws
                                      </h3>
                                      <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Nieuw</span>
                                  </div>
                                  
                                  {latestNews.image && (
                                      <div className="relative rounded-xl overflow-hidden mb-3 border border-slate-100">
                                          <img src={latestNews.image} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                                      </div>
                                  )}
                                  
                                  <h4 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2 group-hover:text-teal-600 transition-colors">
                                      {latestNews.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                                      {latestNews.shortDescription}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mt-3 pt-3 border-t border-slate-50">
                                      <span>{latestNews.date}</span>
                                      <span>•</span>
                                      <span>Lees meer <ChevronRight size={10} className="inline"/></span>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* Team & Contact (Public) */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Team</h3>
                          <div className="space-y-4">
                              <div className="flex items-center gap-3 group">
                                  <img src="https://ui-avatars.com/api/?name=Dennis+Manager&background=0d9488&color=fff" className="w-10 h-10 rounded-full border border-slate-100" alt="Manager"/>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-slate-900 truncate">Dennis de Manager</div>
                                      <div className="text-xs text-slate-500">Leidinggevende</div>
                                  </div>
                                  <a href="mailto:manager@sanadome.nl" className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                      <Mail size={16} />
                                  </a>
                              </div>
                              {employee.mentor && (
                                  <div className="flex items-center gap-3 group">
                                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-200">
                                          {employee.mentor.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="text-sm font-bold text-slate-900 truncate">{employee.mentor}</div>
                                          <div className="text-xs text-slate-500">Mentor / Buddy</div>
                                      </div>
                                      <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                          <MessageSquare size={16} />
                                      </button>
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

  const renderCareerDetails = () => {
      const departmentDisplay = employee.departments ? employee.departments.join(', ') : 'Geen afdeling';

      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Career Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{employee.role}</h2>
                      <div className="flex flex-wrap gap-3 mb-6">
                          {employee.departments?.map(dept => (
                              <span key={dept} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200">
                                  {dept}
                              </span>
                          ))}
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200">
                              {employee.employmentType}
                          </span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
                          Als {employee.role} ben je verantwoordelijk voor de dagelijkse operatie binnen {departmentDisplay}. 
                          Je rapporteert direct aan de afdelingsmanager.
                      </p>
                  </div>
                  
                  {/* Contract Box - PRIVATE */}
                  <div className="w-full md:w-72 bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-teal-600"><Briefcase size={20}/></div>
                          <div>
                              <div className="text-xs font-bold text-slate-400 uppercase">Contract</div>
                              <div className="text-sm font-bold text-slate-900">Onbepaalde tijd</div>
                          </div>
                      </div>
                      <div className="space-y-2 border-t border-slate-200 pt-4 mt-2">
                          <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Uren p/w</span>
                              <span className="font-bold text-slate-900">38</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Startdatum</span>
                              <span className="font-bold text-slate-900">{employee.hiredOn}</span>
                          </div>
                      </div>
                      <button 
                        onClick={() => onChangeView(ViewState.DOCUMENTS)}
                        className="w-full mt-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-all shadow-sm"
                      >
                          Bekijk Contract
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const renderGrowthPath = () => {
      const activeGoals = (employee.growthGoals || []).filter(g => g.status !== 'Completed');
      const completedGoals = (employee.growthGoals || []).filter(g => g.status === 'Completed');

      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Target className="text-teal-600" size={24}/> Groeipad & Ontwikkeling
                  </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* ACTIVE GOALS */}
                  <div className="lg:col-span-2 space-y-6">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Actieve Doelen</h3>
                      
                      {activeGoals.map(goal => {
                          const nextCheckIn = (goal.checkIns || []).find(c => c.status === 'Planned');
                          const completedCheckIns = (goal.checkIns || []).filter(c => c.status === 'Completed');

                          return (
                              <div key={goal.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-4">
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded uppercase tracking-wide border border-teal-100">{goal.category}</span>
                                              {goal.deadline && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded flex items-center gap-1"><Clock size={10}/> {goal.deadline}</span>}
                                          </div>
                                          <h4 className="font-bold text-lg text-slate-900">{goal.title}</h4>
                                      </div>
                                      <div className="text-right">
                                          <span className="text-2xl font-bold text-slate-900">{goal.progress}%</span>
                                      </div>
                                  </div>

                                  <p className="text-sm text-slate-600 mb-6">{goal.description}</p>

                                  {/* CHECK-IN TIMELINE */}
                                  <div className="relative pt-6 pb-6 border-t border-slate-50 mb-4">
                                      <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-100 z-0"></div>
                                      <div className="flex justify-between relative z-10">
                                          {/* Start Node */}
                                          <div className="flex flex-col items-center">
                                              <div className="w-4 h-4 rounded-full bg-teal-500 border-2 border-white ring-2 ring-teal-100 mb-2"></div>
                                              <span className="text-[10px] text-slate-400">Start</span>
                                              <span className="text-[10px] font-bold text-slate-600">{goal.startDate}</span>
                                          </div>

                                          {/* Interim Check-ins */}
                                          {(goal.checkIns || []).map((checkIn, i) => (
                                              <div key={i} className="flex flex-col items-center group relative">
                                                  <div className={`w-4 h-4 rounded-full border-2 border-white mb-2 transition-all cursor-help
                                                      ${checkIn.status === 'Completed' ? 'bg-teal-500 ring-2 ring-teal-100' : 'bg-white border-slate-300 ring-2 ring-slate-50'}
                                                  `}></div>
                                                  <span className="text-[10px] text-slate-400">Check-in {i+1}</span>
                                                  <span className="text-[10px] font-bold text-slate-600">{checkIn.date}</span>
                                                  
                                                  {/* Tooltip with result */}
                                                  {checkIn.status === 'Completed' && (
                                                      <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity w-32 text-center pointer-events-none">
                                                          Score: {checkIn.score}% <br/>
                                                          <span className="text-[9px] opacity-70">op {checkIn.completedDate}</span>
                                                      </div>
                                                  )}

                                                  {/* Manager Action Button */}
                                                  {isManager && checkIn.status === 'Planned' && (
                                                      <button 
                                                        onClick={() => handleOpenCheckIn(goal, checkIn)}
                                                        className="absolute top-6 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-sm hover:bg-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                      >
                                                          Start Evaluatie
                                                      </button>
                                                  )}
                                              </div>
                                          ))}

                                          {/* End Node */}
                                          <div className="flex flex-col items-center">
                                              <div className="w-4 h-4 rounded-full bg-slate-200 border-2 border-white ring-2 ring-slate-100 mb-2"></div>
                                              <span className="text-[10px] text-slate-400">Eind</span>
                                              <span className="text-[10px] font-bold text-slate-600">{goal.deadline}</span>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Action Plan */}
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                      <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Actieplan</span>
                                      <p className="text-sm text-slate-700 whitespace-pre-line">{goal.actionPlan}</p>
                                  </div>

                                  {/* Reflections */}
                                  <div className="border-t border-slate-100 pt-4">
                                      <div className="flex justify-between items-center mb-4">
                                          <span className="text-xs font-bold text-slate-400 uppercase">Reflecties & Updates</span>
                                          <button 
                                            onClick={() => { setSelectedGoal(goal); setIsReflectionModalOpen(true); }}
                                            className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                          >
                                              <PenTool size={12}/> Toevoegen
                                          </button>
                                      </div>
                                      
                                      {goal.reflections && goal.reflections.length > 0 ? (
                                          <div className="space-y-3">
                                              {goal.reflections.map(ref => (
                                                  <div key={ref.id} className="flex gap-3 text-sm">
                                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-500">
                                                          {ref.author.charAt(0)}
                                                      </div>
                                                      <div className="bg-slate-50 p-3 rounded-tr-xl rounded-b-xl flex-1 border border-slate-100">
                                                          <div className="flex justify-between items-baseline mb-1">
                                                              <span className="font-bold text-slate-700 text-xs">{ref.author}</span>
                                                              <span className="text-[10px] text-slate-400">{ref.date}</span>
                                                          </div>
                                                          <p className="text-slate-600">{ref.content}</p>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <p className="text-xs text-slate-400 italic">Nog geen reflecties toegevoegd.</p>
                                      )}
                                  </div>
                              </div>
                          );
                      })}

                      {activeGoals.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                              <Target size={48} className="mx-auto text-slate-200 mb-4"/>
                              <h3 className="font-bold text-slate-900">Geen actieve doelen</h3>
                              <p className="text-slate-500 text-sm mt-1">Stel samen met je manager nieuwe doelen op tijdens de volgende evaluatie.</p>
                          </div>
                      )}
                  </div>

                  {/* COMPLETED / HISTORY */}
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6">Behaalde Doelen</h3>
                      <div className="space-y-4">
                          {completedGoals.map(goal => (
                              <div key={goal.id} className="bg-white p-4 rounded-xl border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                                  <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-green-100 text-green-600 p-1.5 rounded-full">
                                          <CheckCircle2 size={16}/>
                                      </div>
                                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{goal.title}</h4>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{goal.description}</p>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                                      {goal.category}
                                  </div>
                              </div>
                          ))}
                          {completedGoals.length === 0 && (
                              <p className="text-sm text-slate-400 italic">Nog geen doelen afgerond.</p>
                          )}
                      </div>
                  </div>
              </div>

              {/* Reflection Modal */}
              <Modal
                  isOpen={isReflectionModalOpen}
                  onClose={() => { setIsReflectionModalOpen(false); setSelectedGoal(null); }}
                  title="Reflectie Toevoegen"
              >
                  <form onSubmit={handleAddReflection} className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Doel</span>
                          <p className="font-bold text-slate-900">{selectedGoal?.title}</p>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jouw notitie</label>
                          <textarea 
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="Wat heb je gedaan? Wat ging goed? Wat kan beter?"
                              value={reflectionText}
                              onChange={e => setReflectionText(e.target.value)}
                              autoFocus
                          />
                      </div>

                      <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                          Opslaan
                      </button>
                  </form>
              </Modal>

              {/* Check-In Modal (Manager Only) */}
              <Modal
                  isOpen={isCheckInModalOpen}
                  onClose={() => { setIsCheckInModalOpen(false); setActiveCheckIn(null); }}
                  title="Tussentijdse Evaluatie"
              >
                  <form onSubmit={handleSubmitCheckIn} className="space-y-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="font-bold text-slate-900">{selectedGoal?.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">Geplande datum: {activeCheckIn?.date}</p>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Nieuwe Voortgangsscore</label>
                          <div className="flex items-center gap-4">
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="5"
                                value={checkInScore}
                                onChange={(e) => setCheckInScore(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                              />
                              <span className="text-2xl font-bold text-slate-900 w-16 text-right">{checkInScore}%</span>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evaluatie Notitie</label>
                          <textarea 
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                              placeholder="Wat is er besproken? Wat zijn de vervolgstappen?"
                              value={checkInNotes}
                              onChange={e => setCheckInNotes(e.target.value)}
                          />
                      </div>

                      <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                          <Save size={18}/> Evaluatie Vastleggen
                      </button>
                  </form>
              </Modal>
          </div>
      );
  };

  const renderDocumentsContent = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Personeelsdossier</h3>
          <button 
             onClick={() => onChangeView(ViewState.DOCUMENTS)}
             className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
          >
             Alles bekijken
          </button>
       </div>
       <div className="divide-y divide-slate-100">
          {employee.documents && employee.documents.length > 0 ? (
            employee.documents.slice(0, 5).map(doc => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-teal-600 group-hover:shadow-sm transition-all">
                       <FileText size={20} />
                    </div>
                    <div>
                       <div className="font-bold text-slate-800 text-sm">{doc.name}</div>
                       <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">{doc.category}</span>
                          <span>• {doc.date}</span>
                       </div>
                    </div>
                 </div>
                 <button className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Download size={18} />
                 </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 italic">
               Geen documenten in dossier.
            </div>
          )}
       </div>
    </div>
  );

  const renderPerformanceReport = () => {
     // Prepare Graph Data
     const evaluations = [...(employee.evaluations || [])].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
     const chartData = evaluations
        .filter(ev => ev.status === 'Signed' || ev.status === 'Archived' || ev.overallRating)
        .map(ev => ({
            name: ev.type,
            score: ev.overallRating || 0,
            date: ev.completedAt || ev.createdAt
        }));

     return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Chart Section */}
            {chartData.length > 1 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="text-teal-600" size={20}/>
                        Prestatie Trend
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 5]} hide />
                                <Tooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                    formatter={(value: number) => [value, 'Rating']}
                                />
                                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(employee.evaluations || []).length > 0 ? (
                    employee.evaluations?.map(ev => (
                        <div key={ev.id} className="group relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden" onClick={() => onChangeView(ViewState.EVALUATIONS)}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[100px] -mr-4 -mt-4 transition-all group-hover:bg-teal-50"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                                        ev.overallRating && ev.overallRating >= 4 ? 'bg-green-100 text-green-700' : 
                                        ev.overallRating && ev.overallRating >= 3 ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {ev.overallRating || '-'}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                        ev.status === 'Signed' ? 'bg-green-50 text-green-700 border-green-100' : 
                                        ev.status === 'Review' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        'bg-slate-50 text-slate-500 border-slate-100'
                                    }`}>
                                        {ev.status}
                                    </span>
                                </div>
                                
                                <h4 className="font-bold text-slate-900 text-lg mb-1">{ev.type}</h4>
                                <p className="text-xs text-slate-500 mb-4">{ev.createdAt}</p>
                                
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-teal-600 transition-colors">
                                    Bekijk Rapport <ArrowRight size={14}/>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                        Nog geen evaluaties beschikbaar.
                    </div>
                )}
            </div>
            
            <button 
                onClick={() => onChangeView(ViewState.EVALUATIONS)}
                className="w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors bg-white shadow-sm"
            >
                Ga naar Performance Center
            </button>
        </div>
     );
  };

  const renderOnboardingContent = () => {
     const hasActiveTasks = employee.onboardingTasks && employee.onboardingTasks.length > 0;
     const hasHistory = employee.onboardingHistory && employee.onboardingHistory.length > 0;

     // Even if no active/history, show personalization message
     if (!hasActiveTasks && !hasHistory) {
         return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <PlayCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Nog geen programma</h3>
                <p className="text-slate-500 mt-2">
                    Momenteel volg je nog geen introductieprogramma.
                </p>
            </div>
         );
     }
     
     const totalTasks = employee.onboardingTasks.length;
     const completedTasks = employee.onboardingTasks.filter(t => t.score === 100).length;
     const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
     const currentWeek = employee.onboardingTasks.find(t => t.score !== 100)?.week || 4;
     const nextTask = employee.onboardingTasks.find(t => t.score !== 100);
     let activeTitle = templateTitle || 'Traject Laden...';

     return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hasActiveTasks && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                    <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-teal-100 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></div>
                                    Actief Traject
                                </span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900">{activeTitle}</h3>
                            <p className="text-slate-500 text-xs mt-1">Begeleid door {employee.mentor || 'HR'}</p>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-4xl font-bold text-teal-600">{progress}%</div>
                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wide">Voltooid</div>
                        </div>
                    </div>

                    <div className="w-full h-2 flex gap-1 bg-slate-50">
                        <div className={`h-full rounded-r-full transition-all duration-1000 ${progress >= 25 ? 'bg-teal-500' : 'bg-slate-200'}`} style={{width: '25%'}}></div>
                        <div className={`h-full rounded-full transition-all duration-1000 ${progress >= 50 ? 'bg-teal-500' : 'bg-slate-200'}`} style={{width: '25%'}}></div>
                        <div className={`h-full rounded-full transition-all duration-1000 ${progress >= 75 ? 'bg-teal-500' : 'bg-slate-200'}`} style={{width: '25%'}}></div>
                        <div className={`h-full rounded-l-full transition-all duration-1000 ${progress >= 100 ? 'bg-teal-500' : 'bg-slate-200'}`} style={{width: '25%'}}></div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-4 gap-4 mb-10 relative">
                            <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10 hidden md:block"></div>
                            {[1, 2, 3, 4].map(week => {
                                const isPast = week < currentWeek;
                                const isCurrent = week === currentWeek && progress < 100;
                                const isCompleted = progress === 100;
                                const isActive = isCurrent || (week === 4 && isCompleted);

                                return (
                                    <div key={week} className="flex flex-col items-center text-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4 transition-all bg-white z-10
                                            ${isPast || (isCompleted) ? 'border-teal-500 text-teal-600' : 
                                              isCurrent ? 'border-teal-500 text-teal-600 shadow-lg ring-4 ring-teal-50' : 
                                              'border-slate-200 text-slate-300'}
                                        `}>
                                            {isPast || isCompleted ? <Check size={16} strokeWidth={3}/> : week}
                                        </div>
                                        <div>
                                            <span className={`text-xs font-bold uppercase tracking-wide block ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                                Week {week}
                                            </span>
                                            <span className="text-[10px] text-slate-400 hidden md:block">
                                                {week === 1 ? 'Introductie' : week === 2 ? 'Basis' : week === 3 ? 'Verdieping' : 'Zelfstandig'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col md:flex-row gap-6 items-center">
                            <div className="p-4 bg-white rounded-full shadow-sm text-teal-600">
                                {nextTask ? <Target size={24} /> : <Award size={24}/>}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {nextTask ? 'Volgende Stap' : 'Gefeliciteerd!'}
                                </h4>
                                <div className="text-lg font-bold text-slate-900">
                                    {nextTask ? nextTask.title : 'Alle taken zijn afgerond.'}
                                </div>
                                {nextTask && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{nextTask.description}</p>}
                            </div>
                            <div>
                                <button 
                                    onClick={() => onChangeView(ViewState.ONBOARDING)}
                                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2 text-sm"
                                >
                                    Naar Plan <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {hasHistory && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                            <History size={16}/> Afgeronde Trajecten
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {employee.onboardingHistory?.map(entry => (
                            <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Award size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{entry.templateTitle}</h4>
                                        <p className="text-xs text-slate-500">{entry.startDate} - {entry.endDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs font-bold text-slate-400 uppercase">Score</div>
                                        <div className="font-bold text-green-600">{entry.finalScore}%</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
     );
  };

  const renderContactContent = () => (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-bold text-slate-900 mb-6 text-lg">Contact & Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Bereikbaarheid</h4>
                  <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm">
                              <Mail size={18}/>
                          </div>
                          <div>
                              <div className="text-xs font-bold text-slate-400 uppercase">E-mail</div>
                              <a href={`mailto:${employee.email}`} className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors">{employee.email}</a>
                          </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm">
                              <Phone size={18}/>
                          </div>
                          <div>
                              <div className="text-xs font-bold text-slate-400 uppercase">Telefoon</div>
                              <a href={`tel:${employee.phone}`} className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors">{employee.phone}</a>
                          </div>
                      </div>
                  </div>
              </div>
              <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Rol & Afdeling</h4>
                  <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-xs font-bold text-slate-400 uppercase mb-1">Functie</div>
                          <div className="text-sm font-bold text-slate-900">{employee.role}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-xs font-bold text-slate-400 uppercase mb-1">Afdeling(en)</div>
                          <div className="flex flex-wrap gap-2">
                              {employee.departments.map(dept => (
                                  <span key={dept} className="px-2 py-1 bg-white rounded-md border border-slate-200 text-xs font-medium text-slate-700">
                                      {dept}
                                  </span>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="p-6 lg:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

      {/* Navigation Back (if visitor) */}
      {!isOwnProfile && onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"
          >
              <ArrowLeft size={18} />
              Terug naar overzicht
          </button>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative group/header">
        <div className="h-48 md:h-64 relative overflow-hidden bg-slate-100">
          {employee.banner ? (
            <img src={employee.banner} alt="Banner" className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover/header:scale-105" />
          ) : (
             <div className="w-full h-full bg-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-slate-100 to-slate-200"></div>
             </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          
          {isOwnProfile && (
              <button 
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-4 right-4 px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-md text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2 opacity-0 group-hover/header:opacity-100"
              >
                <ImageIcon size={14} />
                <span className="hidden sm:inline">Cover Wijzigen</span>
              </button>
          )}
        </div>
        
        <div className="px-6 md:px-10 pb-0 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-20 mb-6 md:mb-8">
            <div className="relative md:mr-8 mb-4 md:mb-0 group">
              <div className="relative rounded-2xl border-[6px] border-white shadow-xl overflow-hidden bg-white">
                  <img 
                    src={employee.avatar} 
                    alt={employee.name} 
                    className="w-32 h-32 md:w-40 md:h-40 object-cover"
                  />
                  {isOwnProfile && (
                      <div 
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                      >
                        <Camera className="text-white" size={28} />
                      </div>
                  )}
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">
                  {employee.name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-slate-400" />
                  <span>{employee.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  <span>{employee.departments ? employee.departments.join(', ') : 'Geen afdeling'}</span>
                </div>
                {employee.id === currentUser.id && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Jij</span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-4 md:pb-0 border-t border-slate-100 md:border-none pt-4 md:pt-0">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="h-6 md:h-8"></div>
      </div>

      {/* Content Area */}
      {activeTab === 'Overzicht' && renderDashboardOverview()}
      {activeTab === 'Carrière' && renderCareerDetails()}
      {activeTab === 'Groeipad' && renderGrowthPath()}
      {activeTab === 'Documenten' && renderDocumentsContent()}
      {activeTab === 'Evaluatie' && renderPerformanceReport()}
      {activeTab === 'Onboarding' && renderOnboardingContent()}
      {activeTab === 'Contact' && renderContactContent()}

      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Notitie toevoegen"
      >
        <form onSubmit={handleAddNote} className="space-y-5">
             <p className="text-slate-500 italic">Notitie functionaliteit is beschikbaar via het tabblad 'Documenten'.</p>
             <button type="button" onClick={() => setIsNoteModalOpen(false)} className="w-full py-2 border border-slate-200 rounded-lg font-bold text-slate-600">Sluiten</button>
        </form>
      </Modal>

    </div>
  );
};

export default EmployeeProfile;