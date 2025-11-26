
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Briefcase, MapPin, 
  Mail, Linkedin, Phone, 
  Camera, Image as ImageIcon,
  Calendar, Clock, AlertCircle, FileText, Download, CheckCircle2,
  TrendingUp, Award, ChevronRight, Flag, Target, ArrowUpRight, History, Layers, Check, PlayCircle, Map, User, Sparkles, Zap, LayoutDashboard, Building2, Users, GraduationCap, MessageSquare, ListTodo, Euro, AlertTriangle
} from 'lucide-react';
import { Employee, LeaveRequest, EmployeeNote, EmployeeDocument, Notification, ViewState } from '../types';
import { Modal } from './Modal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';

interface EmployeeProfileProps {
  employee: Employee;
  onNext: () => void;
  onPrevious: () => void;
  onChangeView: (view: ViewState) => void;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
  managers: Employee[];
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
  employee, 
  onNext, 
  onPrevious,
  onChangeView,
  onUpdateEmployee,
  onAddNotification,
  onShowToast,
  managers
}) => {
  const [activeTab, setActiveTab] = useState('Overzicht');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident'>('General');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisible, setNoteVisible] = useState(true);
  const [noteImpact, setNoteImpact] = useState<'Positive' | 'Negative' | 'Neutral'>('Neutral');
  const [noteScore, setNoteScore] = useState(0); // 0-5

  // Onboarding Template State
  const [templateTitle, setTemplateTitle] = useState<string>('');

  // Debt Control State (for Dashboard)
  const [urgentDebtCount, setUrgentDebtCount] = useState(0);

  // Load Template Name correctly
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
      
      if (employee.onboardingStatus === 'Active') {
          fetchTemplateName();
      }
  }, [employee.activeTemplateId, employee.onboardingStatus, employee.onboardingTasks]);

  // Fetch Debt Control Stats if user has permission
  useEffect(() => {
      const checkDebtors = async () => {
          if (hasPermission(employee, 'MANAGE_DEBTORS')) {
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
      };
      checkDebtors();
  }, [employee]);

  const tabs = useMemo(() => {
    const baseTabs = ['Overzicht', 'Carrière', 'Evaluatie'];
    
    const hasActiveTasks = employee.onboardingTasks && employee.onboardingTasks.length > 0;
    const isStatusActive = employee.onboardingStatus === 'Active';
    const hasActive = isStatusActive && hasActiveTasks;
    const hasHistory = employee.onboardingHistory && employee.onboardingHistory.length > 0;

    if (hasActive || hasHistory) {
        baseTabs.push('Onboarding');
    }
    
    // Removed 'Verlof' as requested
    baseTabs.push('Documenten');
    return baseTabs;
  }, [employee.onboardingStatus, employee.onboardingHistory, employee.onboardingTasks]);

  useEffect(() => {
      if (!tabs.includes(activeTab)) {
          setActiveTab(tabs[0]);
      }
  }, [tabs, activeTab]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
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
      author: employee.name,
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

  // --- COMPONENT RENDERS ---

  const renderDashboardOverview = () => {
      // Calculate Tenure
      const hiredDate = new Date(employee.hiredOn);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - hiredDate.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

      // Open Actions Logic
      const openOnboardingTasks = employee.onboardingTasks?.filter(t => t.score !== 100) || [];
      const pendingEvaluations = employee.evaluations?.filter(ev => ev.status === 'EmployeeInput' || ev.status === 'ManagerInput') || [];
      
      const hasOpenActions = openOnboardingTasks.length > 0 || pendingEvaluations.length > 0 || urgentDebtCount > 0;

      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Light Hero Welcome */}
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -mr-16 -mt-16"></div>
                  <div className="relative z-10">
                      <h2 className="text-3xl font-serif font-bold mb-2 text-slate-900">Welkom terug, {employee.name.split(' ')[0]}</h2>
                      <p className="text-slate-500 mb-6 max-w-xl leading-relaxed">
                          Fijn dat je er bent. Hier is een overzicht van jouw actuele status, taken en voortgang binnen Sanadome.
                      </p>
                      <div className="flex gap-3">
                          <button onClick={() => onChangeView(ViewState.DOCUMENTS)} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2">
                              <FileText size={16} /> Mijn Dossier
                          </button>
                      </div>
                  </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Open Actions Block - Replaces 'Next Action' */}
                  <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-teal-200 transition-colors">
                      <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                                  <ListTodo size={20} />
                              </div>
                              <div>
                                  <div className="text-sm font-bold text-slate-900">Openstaande Acties</div>
                              </div>
                          </div>
                          {hasOpenActions && (
                              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">
                                  {openOnboardingTasks.length + pendingEvaluations.length + (urgentDebtCount > 0 ? 1 : 0)}
                              </span>
                          )}
                      </div>
                      
                      <div className="flex-1">
                          {hasOpenActions ? (
                              <div className="space-y-3">
                                  {/* DEBT CONTROL ALERT */}
                                  {urgentDebtCount > 0 && (
                                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100 animate-pulse">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                                  <AlertTriangle size={16} />
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-red-800">Debiteuren Beheer</div>
                                                  <div className="text-xs text-red-600">{urgentDebtCount} dossiers vereisen direct actie (>14 dgn)</div>
                                              </div>
                                          </div>
                                          <button 
                                            onClick={() => onChangeView(ViewState.DEBT_CONTROL)} 
                                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                              Bekijken
                                          </button>
                                      </div>
                                  )}

                                  {pendingEvaluations.slice(0, 2).map(ev => (
                                      <div key={ev.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                          <div className="flex items-center gap-3">
                                              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                              <div>
                                                  <div className="text-sm font-bold text-slate-800">Evaluatie: {ev.type}</div>
                                                  <div className="text-xs text-slate-500">Jouw input wordt verwacht</div>
                                              </div>
                                          </div>
                                          <button onClick={() => onChangeView(ViewState.EVALUATIONS)} className="text-xs font-bold text-teal-600 hover:underline">Starten</button>
                                      </div>
                                  ))}
                                  {openOnboardingTasks.slice(0, 3).map(task => (
                                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                          <div className="flex items-center gap-3">
                                              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                                              <div>
                                                  <div className="text-sm font-bold text-slate-800">{task.title}</div>
                                                  <div className="text-xs text-slate-500">Week {task.week} • {task.category}</div>
                                              </div>
                                          </div>
                                          <button onClick={() => onChangeView(ViewState.ONBOARDING)} className="text-xs font-bold text-slate-400 hover:text-teal-600">Bekijken</button>
                                      </div>
                                  ))}
                                  {(openOnboardingTasks.length + pendingEvaluations.length) > 4 && (
                                      <div className="text-center text-xs text-slate-400 pt-1">En meer...</div>
                                  )}
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center py-4">
                                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2">
                                      <CheckCircle2 size={20} />
                                  </div>
                                  <p className="text-slate-900 font-bold text-sm">Er staan geen open acties.</p>
                                  <p className="text-slate-500 text-xs">Je bent helemaal bij!</p>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Tenure Stat */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-purple-200 transition-colors">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dienstverband</div>
                              <div className="text-3xl font-bold text-slate-900 mt-1">
                                  {diffYears > 0 ? `${diffYears} Jaar` : `${diffMonths} Maanden`}
                              </div>
                          </div>
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                              <Award size={24} />
                          </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-4">Startdatum: {employee.hiredOn}</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Activity / Timeline */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <h3 className="font-bold text-slate-900">Activiteiten Tijdlijn</h3>
                          <button className="text-xs font-bold text-teal-600 hover:underline">Bekijk alles</button>
                      </div>
                      <div className="p-6">
                          <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                              {/* Mock Activity Items based on profile data */}
                              {employee.documents.slice(0, 2).map((doc, idx) => (
                                  <div key={`doc-${idx}`} className="relative pl-8">
                                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-white ring-1 ring-blue-200"></div>
                                      <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">{doc.date}</span>
                                          <p className="text-sm font-bold text-slate-900">Nieuw document toegevoegd</p>
                                          <p className="text-sm text-slate-500 mt-0.5">"{doc.name}" is toegevoegd aan je dossier.</p>
                                      </div>
                                  </div>
                              ))}
                              {employee.onboardingStatus === 'Completed' && (
                                  <div className="relative pl-8">
                                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-100 border-2 border-white ring-1 ring-green-200"></div>
                                      <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Recent</span>
                                          <p className="text-sm font-bold text-slate-900">Onboarding Afgerond</p>
                                          <p className="text-sm text-slate-500 mt-0.5">Gefeliciteerd met het afronden van je introductie!</p>
                                      </div>
                                  </div>
                              )}
                              <div className="relative pl-8">
                                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-200"></div>
                                  <div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">{employee.hiredOn}</span>
                                      <p className="text-sm font-bold text-slate-900">Start Dienstverband</p>
                                      <p className="text-sm text-slate-500 mt-0.5">Eerste werkdag bij Sanadome.</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-6">
                      {/* Contact Card */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                          <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Contactgegevens</h3>
                          <div className="space-y-4">
                              <div className="flex items-center gap-3 group">
                                  <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:text-teal-600 transition-colors"><Mail size={16}/></div>
                                  <div className="overflow-hidden">
                                      <div className="text-xs text-slate-400 font-bold uppercase">Email</div>
                                      <div className="text-sm font-medium text-slate-900 truncate">{employee.email}</div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 group">
                                  <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:text-teal-600 transition-colors"><Phone size={16}/></div>
                                  <div>
                                      <div className="text-xs text-slate-400 font-bold uppercase">Telefoon</div>
                                      <div className="text-sm font-medium text-slate-900">{employee.phone}</div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 group">
                                  <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:text-teal-600 transition-colors"><MapPin size={16}/></div>
                                  <div>
                                      <div className="text-xs text-slate-400 font-bold uppercase">Locatie</div>
                                      <div className="text-sm font-medium text-slate-900">{employee.location}</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderCareerDetails = () => {
      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Career Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{employee.role}</h2>
                      <div className="flex flex-wrap gap-3 mb-6">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200">
                              {employee.department}
                          </span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide border border-slate-200">
                              {employee.employmentType}
                          </span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
                          Als {employee.role} ben je verantwoordelijk voor de dagelijkse operatie binnen {employee.department}. 
                          Je rapporteert direct aan de afdelingsmanager.
                      </p>
                  </div>
                  
                  {/* Contract Box */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Team Context */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <Users size={20} className="text-teal-600"/> Mijn Team
                      </h3>
                      <div className="space-y-6">
                          {/* Manager */}
                          <div className="flex items-center gap-4">
                              <img src="https://ui-avatars.com/api/?name=Dennis+Manager&background=0d9488&color=fff" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt="Manager"/>
                              <div className="flex-1">
                                  <div className="text-sm font-bold text-slate-900">Dennis de Manager</div>
                                  <div className="text-xs text-slate-500">Leidinggevende</div>
                              </div>
                              <a href="mailto:manager@sanadome.nl" className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                  <Mail size={18}/>
                              </a>
                          </div>
                          {/* Mentor */}
                          {employee.mentor && (
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg border-2 border-white shadow-sm">
                                      {employee.mentor.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                      <div className="text-sm font-bold text-slate-900">{employee.mentor}</div>
                                      <div className="text-xs text-slate-500">Mentor / Buddy</div>
                                  </div>
                                  <button className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                                      <MessageSquare size={18}/>
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Skills / Tags (Mock) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <Sparkles size={20} className="text-teal-600"/> Vaardigheden & Complimenten
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-6">
                          {['Gastvrijheid', 'Front Office', 'IDu PMS', 'Engels', 'Teamplayer'].map(tag => (
                              <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                                  {tag}
                              </span>
                          ))}
                      </div>
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                              <Award size={16} className="text-green-600"/>
                              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Recent Compliment</span>
                          </div>
                          <p className="text-sm text-slate-700 italic">"Geweldig gehandeld tijdens de drukte gisteren!"</p>
                      </div>
                  </div>
              </div>
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

  const renderPerformanceReport = () => (
     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Award className="text-teal-600" size={20}/>
              Recente Evaluaties
           </h3>
           <div className="space-y-4">
              {(employee.evaluations || []).length > 0 ? (
                 employee.evaluations?.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                             ev.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                             {ev.overallRating || '-'}
                          </div>
                          <div>
                             <div className="font-bold text-slate-900">{ev.type}</div>
                             <div className="text-xs text-slate-500">{ev.createdAt} • {ev.status}</div>
                          </div>
                       </div>
                       <button className="text-slate-400 hover:text-teal-600">
                          <ChevronRight size={20} />
                       </button>
                    </div>
                 ))
              ) : (
                 <p className="text-slate-500 italic text-sm">Nog geen evaluaties afgerond.</p>
              )}
           </div>
           <button 
             onClick={() => onChangeView(ViewState.EVALUATIONS)}
             className="w-full mt-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
           >
              Ga naar Performance Center
           </button>
        </div>
     </div>
  );

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
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Score</div>
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

  return (
    <div className="p-6 lg:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative group/header">
        <div className="h-48 md:h-64 relative overflow-hidden bg-slate-100">
          {employee.banner ? (
            <img src={employee.banner} alt="Banner" className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover/header:scale-105" />
          ) : (
             <div className="w-full h-full bg-slate-200 relative overflow-hidden">
                  {/* Light gradient placeholder if no banner */}
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-slate-100 to-slate-200"></div>
             </div>
          )}
          
          {/* Subtle dark overlay only for text contrast if needed, but keeping it very light now */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          
          <button 
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-4 right-4 px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-md text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2 opacity-0 group-hover/header:opacity-100"
          >
            <ImageIcon size={14} />
            <span className="hidden sm:inline">Cover Wijzigen</span>
          </button>
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
                  <div 
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  >
                    <Camera className="text-white" size={28} />
                  </div>
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
                  <MapPin size={16} className="text-slate-400" />
                  <span>{employee.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  <span>{employee.department}</span>
                </div>
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
      {activeTab === 'Documenten' && renderDocumentsContent()}
      {activeTab === 'Evaluatie' && renderPerformanceReport()}
      {activeTab === 'Onboarding' && renderOnboardingContent()}

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
