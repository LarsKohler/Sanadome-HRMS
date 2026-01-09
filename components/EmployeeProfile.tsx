
import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, MapPin, Mail, Phone, Camera, Image as ImageIcon,
  Calendar, Clock, AlertCircle, CheckCircle2, TrendingUp, ChevronRight, 
  ArrowRight, Heart, Star, Trophy, ArrowLeft, Building2,
  Newspaper, LayoutDashboard, ClipboardCheck, ListTodo,
  ExternalLink, Bell, AlertTriangle, User, Medal, Save, Users, Eye
} from 'lucide-react';
import { Employee, ViewState, NewsPost, BadgeIconKey, BadgeColor } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

const BADGE_ICONS: Record<BadgeIconKey, React.ElementType> = {
    'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Heart': Heart, 'Zap': TrendingUp, 'Shield': CheckCircle2,
    'Rocket': ArrowRight, 'Crown': Trophy, 'ThumbsUp': Heart, 'Lightbulb': Star, 'Flame': TrendingUp,
    'Target': CheckCircle2, 'Users': Users, 'Eye': Eye
};

const BADGE_COLORS: Record<BadgeColor, string> = {
    'yellow': 'bg-yellow-100 text-yellow-600 border-yellow-200',
    'blue': 'bg-blue-100 text-blue-600 border-blue-200',
    'purple': 'bg-purple-100 text-purple-600 border-purple-200',
    'red': 'bg-red-100 text-red-600 border-red-200',
    'green': 'bg-green-100 text-green-700 border-green-200',
    'pink': 'bg-pink-100 text-pink-600 border-pink-200',
    'orange': 'bg-orange-100 text-orange-600 border-orange-200',
    'slate': 'bg-slate-100 text-slate-600 border-slate-200'
};

interface EmployeeProfileProps {
  employee: Employee;
  currentUser: Employee;
  applicants?: any[];
  onNext: () => void;
  onPrevious: () => void;
  onChangeView: (view: ViewState) => void;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  onShowToast: (message: string) => void;
  onBack?: () => void;
  managers: Employee[];
  recentNews?: NewsPost[]; 
  latestNews?: NewsPost | null; 
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
  employee, 
  currentUser,
  onUpdateEmployee,
  onShowToast,
  onChangeView,
  onBack,
  recentNews
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = employee.id === currentUser.id;

  const [combinedBadges, setCombinedBadges] = useState<any[]>([]);

  // Phone Edit State
  const [isEditPhoneModalOpen, setIsEditPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState(employee.phone || '');

  // Load Badges logic
  useEffect(() => {
      const fetchBadges = async () => {
          const manualBadges = employee.badges || [];
          let displayBadges: any[] = [];
          const badgeDefinitions = await api.getBadges(); 
          manualBadges.forEach(b => {
              const def = badgeDefinitions.find(d => d.id === b.badgeId);
              if (def) displayBadges.push({ ...def, date: b.assignedAt, reason: b.reason });
          });
          const progress = await api.getAcademyProgress();
          const courses = await api.getAcademyCourses();
          const myProgress = progress.filter(p => p.employeeId === employee.id && p.isBadgeEarned);
          myProgress.forEach(p => {
              const course = courses.find(c => c.id === p.courseId);
              if (course?.badgeConfig?.enabled) {
                  displayBadges.push({ ...course.badgeConfig, date: p.completedDate, reason: 'Cursus voltooid' });
              }
          });
          setCombinedBadges(displayBadges);
      };
      fetchBadges();
  }, [employee.id, employee.badges]);

  // Image Upload Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (!isOwnProfile) return; 
    const file = e.target.files?.[0];
    if (!file) return;
    onShowToast(`${type === 'avatar' ? 'Profielfoto' : 'Banner'} uploaden...`);
    try {
        const publicUrl = await api.uploadFile(file);
        if (publicUrl) {
            onUpdateEmployee({ ...employee, [type]: publicUrl });
            onShowToast(`${type === 'avatar' ? 'Profielfoto' : 'Banner'} bijgewerkt.`);
        }
    } catch (error) {
        onShowToast('Fout bij uploaden.');
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const updatedEmployee = { ...employee, phone: phoneInput };
      
      // 1. Update UI immediately
      onUpdateEmployee(updatedEmployee);
      
      // 2. Persist to DB
      try {
          await api.saveEmployee(updatedEmployee);
          onShowToast("Telefoonnummer opgeslagen!");
          setIsEditPhoneModalOpen(false);
      } catch (err) {
          console.error(err);
          onShowToast("Fout bij opslaan.");
      }
  };

  // --- ACTIONS LOGIC ---
  const actions = [];
  
  // 1. Onboarding
  if (employee.onboardingStatus === 'Active') {
      const incompleteTasks = employee.onboardingTasks?.filter(t => !t.completed).length || 0;
      if (incompleteTasks > 0) {
          actions.push({
              id: 'onboarding',
              type: 'urgent',
              title: 'Onboarding Hervatten',
              description: `Je hebt nog ${incompleteTasks} openstaande taken.`,
              icon: LayoutDashboard,
              action: () => onChangeView(ViewState.ONBOARDING),
              color: 'bg-teal-50 text-teal-700 border-teal-200'
          });
      }
  }

  // 2. Evaluations
  const openEval = employee.evaluations?.find(e => e.status === 'EmployeeInput');
  if (openEval) {
      actions.push({
          id: 'evaluation',
          type: 'urgent',
          title: 'Zelfreflectie Vereist',
          description: `Jouw input wordt verwacht voor "${openEval.type}".`,
          icon: ClipboardCheck,
          action: () => onChangeView(ViewState.EVALUATIONS),
          color: 'bg-purple-50 text-purple-700 border-purple-200'
      });
  }

  // 3. Profile Completion (Gamification)
  if (!employee.phone) {
      actions.push({
          id: 'profile-phone',
          type: 'info',
          title: 'Profiel Completeren',
          description: 'Voeg je telefoonnummer toe voor betere bereikbaarheid.',
          icon: Phone,
          action: () => {
              setPhoneInput(''); // Reset or keep empty
              setIsEditPhoneModalOpen(true);
          },
          color: 'bg-amber-50 text-amber-700 border-amber-200'
      });
  }

  // --- CALCULATIONS ---
  const hiredDate = new Date(employee.hiredOn.split('-').reverse().join('-'));
  const diffTime = Math.abs(new Date().getTime() - hiredDate.getTime());
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
  const tenureString = diffYears > 0 ? `${diffYears}j ${diffMonths}m` : `${diffMonths} maanden`;

  const obTasks = employee.onboardingTasks || [];
  const obProgress = obTasks.length > 0 ? Math.round((obTasks.filter(t => t.score === 100).length / obTasks.length) * 100) : 0;

  const compliments = employee.dossier?.filter(d => d.type === 'Compliment').sort((a,b) => b.date.localeCompare(a.date)) || [];

  return (
    <div className="p-4 md:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* Hidden Inputs for Upload */}
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

      {/* HEADER / BANNER */}
      <div className="relative mb-8">
          <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              {/* Banner Area */}
              <div className="h-48 md:h-80 relative group/banner">
                  {employee.banner ? (
                      <img src={employee.banner} className="w-full h-full object-cover" alt="Banner"/>
                  ) : (
                      <div className="w-full h-full bg-gradient-to-r from-slate-200 to-slate-300"></div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover/banner:bg-black/10 transition-colors"></div>
                  
                  {isOwnProfile && (
                      <button 
                        onClick={() => bannerInputRef.current?.click()}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all opacity-0 group-hover/banner:opacity-100"
                      >
                          <ImageIcon size={16}/> Wijzig Cover
                      </button>
                  )}

                  {onBack && !isOwnProfile && (
                      <button onClick={onBack} className="absolute top-4 left-4 bg-white/80 hover:bg-white backdrop-blur text-slate-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                          <ArrowLeft size={16}/> Terug
                      </button>
                  )}
              </div>

              {/* Profile Info Bar */}
              <div className="px-6 md:px-10 pb-6">
                  <div className="flex flex-col md:flex-row items-end -mt-12 md:-mt-16 gap-6">
                      
                      {/* Avatar */}
                      <div className="relative group/avatar flex-shrink-0">
                          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-[6px] border-white shadow-lg overflow-hidden bg-white">
                              <img src={employee.avatar} className="w-full h-full object-cover" alt={employee.name}/>
                          </div>
                          {isOwnProfile && (
                              <button 
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-3xl m-1.5"
                              >
                                  <Camera className="text-white" size={24}/>
                              </button>
                          )}
                      </div>

                      {/* Text Info */}
                      <div className="flex-1 pb-2 w-full">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{employee.name}</h1>
                                  <p className="text-lg text-slate-500 font-medium flex items-center gap-2 mt-1">
                                      {employee.role}
                                      <span className="text-slate-300">•</span>
                                      <span className="text-slate-400 text-base">{employee.departments?.[0]}</span>
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: INFO & STATS */}
          <div className="space-y-6">
              {/* Personal Info Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <User size={18} className="text-teal-600"/> Persoonlijk
                  </h3>
                  <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <Mail size={16} className="text-slate-400"/>
                          <span className="text-slate-600 truncate">{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <Phone size={16} className="text-slate-400"/>
                          <span className="text-slate-600">{employee.phone || 'Geen nummer'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <Building2 size={16} className="text-slate-400"/>
                          <span className="text-slate-600">{employee.departments.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <MapPin size={16} className="text-slate-400"/>
                          <span className="text-slate-600">Nijmegen, NL</span>
                      </div>
                  </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="text-2xl font-bold text-slate-900 mb-1">{tenureString.split(' ')[0]}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dienstjaren</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="text-2xl font-bold text-slate-900 mb-1">{combinedBadges.length}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badges</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="text-2xl font-bold text-slate-900 mb-1">{compliments.length}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complimenten</div>
                  </div>
              </div>
          </div>

          {/* CENTER COLUMN: ACTIONS & PROGRESS */}
          <div className="space-y-6">
              {/* ACTION CENTER */}
              {actions.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 fade-in">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Bell size={18} className="text-amber-500 fill-amber-500"/> Openstaande Acties
                      </h3>
                      <div className="space-y-4">
                          {actions.map(action => (
                              <div key={action.id} className={`p-4 rounded-2xl border flex items-start gap-4 shadow-sm transition-all hover:shadow-md ${action.color}`}>
                                  <div className="p-2 bg-white rounded-xl shadow-sm bg-opacity-60">
                                      <action.icon size={20} />
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-sm mb-1">{action.title}</h4>
                                      <p className="text-xs opacity-80 mb-3">{action.description}</p>
                                      <button 
                                        onClick={action.action}
                                        className="bg-white bg-opacity-80 hover:bg-opacity-100 text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2"
                                      >
                                          Actie Ondernemen <ArrowRight size={12}/>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* ONBOARDING PROGRESS */}
              {employee.onboardingStatus === 'Active' && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                          <div>
                              <h3 className="font-bold text-slate-900">Onboarding</h3>
                              <p className="text-xs text-slate-500">Je bent goed op weg!</p>
                          </div>
                          <span className="text-2xl font-bold text-teal-600">{obProgress}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                          <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${obProgress}%` }}></div>
                      </div>
                      <button 
                        onClick={() => onChangeView(ViewState.ONBOARDING)}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                          Ga naar taken <ArrowRight size={14}/>
                      </button>
                  </div>
              )}

              {/* TIMELINE / COMPLIMENTS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Heart size={18} className="text-rose-500"/> Complimenten & Badges
                  </h3>
                  
                  <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                      {/* Combine Badges and Compliments into a single feed */}
                      {[
                          ...combinedBadges.map(b => ({ ...b, type: 'badge' })),
                          ...compliments.map(c => ({ ...c, type: 'compliment' }))
                      ].sort((a,b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
                       .slice(0, 5) // Show top 5
                       .map((item, idx) => (
                          <div key={idx} className="relative pl-10">
                              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10 ${item.type === 'badge' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                                  {item.type === 'badge' ? <Medal size={14}/> : <Heart size={14} fill="currentColor"/>}
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-slate-800">{item.type === 'badge' ? item.name : 'Compliment'}</span>
                                      <span className="text-[10px] text-slate-400">{item.date}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                      {item.type === 'badge' 
                                        ? (item.reason ? `Badge behaald: ${item.reason}` : `Badge behaald: ${item.description}`) 
                                        : `"${item.description}"`}
                                  </p>
                              </div>
                          </div>
                      ))}
                      
                      {[...combinedBadges, ...compliments].length === 0 && (
                          <div className="text-center py-8 pl-0">
                              <p className="text-xs text-slate-400 italic">Nog geen activiteiten.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: NEWS & UPDATES */}
          <div className="space-y-6">
              {/* News Feed */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Newspaper size={18} className="text-blue-600"/> Laatste Nieuws
                  </h3>
                  
                  <div className="space-y-4">
                      {recentNews && recentNews.length > 0 ? (
                          recentNews.map(news => (
                              <div 
                                key={news.id} 
                                onClick={() => onChangeView(ViewState.NEWS)}
                                className="group cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition-colors -mx-3"
                              >
                                  {news.image && (
                                      <div className="h-32 w-full rounded-lg overflow-hidden mb-3 bg-slate-100 relative">
                                          <img 
                                            src={news.image} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                                            alt={news.title}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60';
                                            }}
                                          />
                                      </div>
                                  )}
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{news.date}</span>
                                      {news.isPinned && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                                  </div>
                                  <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{news.title}</h4>
                                  <p className="text-xs text-slate-500 line-clamp-2">{news.shortDescription}</p>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-8 text-slate-400 text-xs italic">Geen nieuwsberichten.</div>
                      )}
                  </div>
                  
                  <button 
                    onClick={() => onChangeView(ViewState.NEWS)}
                    className="w-full mt-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                      Alle Nieuwsberichten
                  </button>
              </div>

              {/* Quick Links / Help */}
              <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Trophy size={80}/>
                  </div>
                  <h3 className="font-bold text-lg mb-2 relative z-10">SanaLearn Academy</h3>
                  <p className="text-indigo-200 text-xs mb-4 relative z-10 leading-relaxed max-w-[200px]">
                      Ontwikkel je vaardigheden en verdien badges.
                  </p>
                  <button 
                    onClick={() => onChangeView(ViewState.ACADEMY)}
                    className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors relative z-10 flex items-center gap-2"
                  >
                      Naar Academy <ExternalLink size={12}/>
                  </button>
              </div>
          </div>
      </div>

      {/* PHONE EDIT MODAL */}
      <Modal 
          isOpen={isEditPhoneModalOpen} 
          onClose={() => setIsEditPhoneModalOpen(false)} 
          title="Profiel Completeren"
      >
          <form onSubmit={handleSavePhone} className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={20}/>
                  </div>
                  <div>
                      <h4 className="font-bold text-amber-800 text-sm">Voeg je nummer toe</h4>
                      <p className="text-xs text-amber-700 leading-relaxed">
                          We gebruiken dit nummer om je te bereiken voor belangrijke updates of roosterwijzigingen.
                      </p>
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefoonnummer</label>
                  <input 
                      type="tel"
                      required
                      placeholder="06 1234 5678"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                      autoFocus
                  />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                  <button 
                      type="button" 
                      onClick={() => setIsEditPhoneModalOpen(false)} 
                      className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                  >
                      Later
                  </button>
                  <button 
                      type="submit" 
                      className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg shadow-md hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                      <Save size={16}/> Opslaan
                  </button>
              </div>
          </form>
      </Modal>

    </div>
  );
};

export default EmployeeProfile;
