import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Briefcase, MapPin, 
  Mail, Linkedin, Phone, 
  Camera, Image as ImageIcon,
  Calendar, Clock, AlertCircle, FileText, Download, CheckCircle2,
  TrendingUp, Award, Award as CertificateIcon, ChevronRight, Flag, Target, ArrowUpRight, History, Layers, Check, PlayCircle, Map, User, Sparkles, Zap, LayoutDashboard, Building2, Users, GraduationCap, MessageSquare, ListTodo, Euro, AlertTriangle, HeartPulse, Plane, ClipboardCheck, Circle, Newspaper, Heart, Shield, Rocket, Crown, ThumbsUp, Lightbulb, Flame, Star, Eye, ArrowLeft, ArrowRight, BookOpen, PenTool, CheckCircle, BarChart3, Save, Trophy, Lock, Pencil, Medal, Calendar as CalendarIcon, Thermometer, FolderOpen, Info, RefreshCw, Globe, ExternalLink, BedDouble, X, Activity, Search as SearchIcon
} from 'lucide-react';
import { Employee, EmployeeNote, EmployeeDocument, ViewState, NewsPost, EvaluationCycle, BadgeIconKey, BadgeColor, AssignedBadge, AcademyCourse, AcademyProgress, Applicant, DossierEntry, Debtor } from '../types';
import { Modal } from './Modal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';
import { GoogleGenAI, Type } from "@google/genai";

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
    'green': 'bg-green-100 text-green-700 border-green-200',
    'pink': 'bg-pink-100 text-pink-600 border-pink-200',
    'orange': 'bg-orange-100 text-orange-600 border-orange-200',
    'slate': 'bg-slate-100 text-slate-600 border-slate-200'
};

interface EmployeeProfileProps {
  employee: Employee;
  currentUser: Employee;
  applicants?: Applicant[];
  onNext: () => void;
  onPrevious: () => void;
  onChangeView: (view: ViewState) => void;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  onShowToast: (message: string) => void;
  onBack?: () => void;
  managers: Employee[];
  latestNews?: NewsPost | null;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
  employee, 
  currentUser,
  onUpdateEmployee,
  onShowToast,
  onChangeView,
  onBack
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = employee.id === currentUser.id;

  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [combinedBadges, setCombinedBadges] = useState<any[]>([]);

  // AI Availability State
  const [availabilityData, setAvailabilityData] = useState<{
      booked: number;
      total: number;
      status: string;
      level: 'low' | 'medium' | 'high';
      lastUpdated: string;
      sources?: { title: string, uri: string }[];
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStep, setScanningStep] = useState<string>('');
  const [scanError, setScanError] = useState(false);

  useEffect(() => {
      const fetchTemplateName = async () => {
          if (employee.activeTemplateId) {
              try {
                  const templates = await api.getTemplates();
                  const found = templates.find(t => t.id === employee.activeTemplateId);
                  if (found) setTemplateTitle(found.title);
              } catch (e) {
                  setTemplateTitle('Inwerktraject');
              }
          }
      };
      if (employee.onboardingStatus === 'Active') fetchTemplateName();
  }, [employee.activeTemplateId, employee.onboardingStatus]);

  useEffect(() => {
      const fetchBadges = async () => {
          const manualBadges = employee.badges || [];
          let displayBadges: any[] = [];
          const badgeDefinitions = await api.getBadges(); 
          manualBadges.forEach(b => {
              const def = badgeDefinitions.find(d => d.id === b.badgeId);
              if (def) displayBadges.push({ ...def, date: b.assignedAt });
          });
          const progress = await api.getAcademyProgress();
          const courses = await api.getAcademyCourses();
          const myProgress = progress.filter(p => p.employeeId === employee.id && p.isBadgeEarned);
          myProgress.forEach(p => {
              const course = courses.find(c => c.id === p.courseId);
              if (course?.badgeConfig?.enabled) {
                  displayBadges.push({ ...course.badgeConfig, date: p.completedDate });
              }
          });
          setCombinedBadges(displayBadges);
      };
      fetchBadges();
  }, [employee.id, employee.badges]);

  // --- AUTOMATED ROOM SCAN LOGIC (HIGH SPEED OPTIMIZED) ---
  const fetchRoomAvailability = async (silent = false) => {
      if (!isOwnProfile) return;
      if (!silent) {
          setIsScanning(true);
          setScanError(false);
      }
      
      const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      
      try {
          setScanningStep('Radar opstarten...');
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Parallel UI feedback steps
          const timer1 = setTimeout(() => setScanningStep('Sanadome.nl scannen...'), 1200);
          const timer2 = setTimeout(() => setScanningStep('Live voorraad checken...'), 3500);
          const timer3 = setTimeout(() => setScanningStep('Data verifiëren...'), 6000);

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `SNELHEID PRIORITEIT. Scan Sanadome Nijmegen beschikbaarheid voor VANDAAG (${today}). Totaal kamers: 106. Zoek specifiek naar "Sold Out" of "Nog X kamers". Als sold out, booked = 106. Als bijv. "Nog 2 kamers beschikbaar", booked = 104. Reageer direct met schone JSON.`,
              config: {
                  tools: [{ googleSearch: {} }],
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          booked: { type: Type.INTEGER, description: "Aantal bezette kamers (0-106)" },
                          level: { type: Type.STRING, enum: ["low", "medium", "high"] },
                          status: { type: Type.STRING, description: "Korte status (bv: Bijna volgeboekt)" }
                      },
                      required: ["booked", "level", "status"]
                  }
              },
          });

          clearTimeout(timer1);
          clearTimeout(timer2);
          clearTimeout(timer3);

          const rawText = response.text;
          if (!rawText) throw new Error("Geen respons");

          const cleanJson = rawText.replace(/```json|```/g, '').trim();
          const result = JSON.parse(cleanJson);
          
          const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
              ?.filter(chunk => chunk.web)
              .map(chunk => ({ title: chunk.web.title, uri: chunk.web.uri })) || [];

          setAvailabilityData({
              booked: result.booked > 106 ? 106 : result.booked,
              total: 106,
              status: result.status,
              level: result.level,
              lastUpdated: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
              sources: groundingSources.slice(0, 2)
          });
          setScanError(false);
      } catch (e) {
          console.error("Availability Scan Error:", e);
          if (!silent) setScanError(true);
      } finally {
          setIsScanning(false);
          setScanningStep('');
      }
  };

  useEffect(() => {
      if (isOwnProfile) {
          fetchRoomAvailability();
          // Elke 5 minuten verversen is genoeg voor kamers, verhoogt betrouwbaarheid
          const interval = setInterval(() => fetchRoomAvailability(true), 300000);
          return () => clearInterval(interval);
      }
  }, [isOwnProfile]);

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

  const renderDashboardOverview = () => {
      const evaluations = employee.evaluations || [];
      const signedEvals = evaluations.filter(e => e.status === 'Signed');
      const avgScore = signedEvals.length > 0 
        ? Math.round(signedEvals.reduce((acc, ev) => {
            const total = ev.scores.reduce((sAcc, s) => sAcc + (s.managerScore || 0), 0);
            const max = ev.scores.length * 5;
            return acc + (total / max * 100);
          }, 0) / signedEvals.length)
        : null;

      const obTasks = employee.onboardingTasks || [];
      const obProgress = obTasks.length > 0 ? Math.round((obTasks.filter(t => t.score === 100).length / obTasks.length) * 100) : null;
      const compliments = employee.dossier?.filter(d => d.type === 'Compliment').sort((a,b) => b.date.localeCompare(a.date)) || [];

      const openActions = [];
      evaluations.forEach(ev => {
          if (isOwnProfile && ev.status === 'EmployeeInput') {
              openActions.push({ title: 'Zelfreflectie invullen', desc: `Evaluatie: ${ev.type}`, type: 'Evaluation', date: ev.plannedDate });
          }
      });
      if (isOwnProfile && employee.onboardingStatus === 'Active') {
          const pendingTasks = obTasks.filter(t => !t.completed).length;
          if (pendingTasks > 0) {
              openActions.push({ title: 'Onboarding taken', desc: `Nog ${pendingTasks} taken deze week`, type: 'Onboarding' });
          }
      }

      const hiredDate = new Date(employee.hiredOn.split('-').reverse().join('-'));
      const diffTime = Math.abs(new Date().getTime() - hiredDate.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));

      const occupancyPercentage = availabilityData ? Math.round((availabilityData.booked / availabilityData.total) * 100) : 0;

      return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
              {/* TOP KPI ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  {/* LIVE ROOM AVAILABILITY WIDGET (REMASTERED) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-teal-300 transition-all relative overflow-hidden h-32">
                      <div className="flex items-center justify-between mb-1 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg group-hover:scale-110 transition-transform ${isScanning ? 'bg-teal-500 text-white animate-pulse' : availabilityData?.booked && availabilityData.booked >= 100 ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
                                <BedDouble size={18} />
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                Kamer Bezetting
                                {isScanning && <span className="flex h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping"></span>}
                            </div>
                        </div>
                        {isScanning && <Activity size={12} className="text-teal-500 animate-pulse" />}
                      </div>
                      
                      {isScanning && !availabilityData ? (
                          <div className="flex-1 flex flex-col justify-end py-1">
                              <div className="flex items-center gap-2 mb-2">
                                  <RefreshCw size={14} className="animate-spin text-teal-500" />
                                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{scanningStep}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-200 animate-shimmer" style={{ width: '40%', background: 'linear-gradient(90deg, #f1f5f9 0%, #2dd4bf 50%, #f1f5f9 100%)', backgroundSize: '200% 100%' }}></div>
                              </div>
                          </div>
                      ) : scanError ? (
                          <div className="flex-1 flex flex-col justify-end">
                              <div className="text-red-500 flex items-center gap-1.5 text-xs font-bold mb-1">
                                  <AlertCircle size={14}/> Connectie Fout
                              </div>
                              <button onClick={() => fetchRoomAvailability()} className="text-[10px] font-bold text-slate-400 hover:text-teal-600 flex items-center gap-1 uppercase tracking-widest">
                                  <RefreshCw size={10}/> Probeer Opnieuw
                              </button>
                          </div>
                      ) : availabilityData ? (
                          <div className="flex-1 flex flex-col justify-end animate-in fade-in zoom-in-95">
                              <div className="flex items-baseline justify-between mb-1">
                                  <div className="text-xl font-black text-slate-900 leading-none">
                                      {availabilityData.booked}<span className="text-slate-300 text-sm font-bold">/106</span>
                                  </div>
                                  <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${availabilityData.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                      {occupancyPercentage}%
                                  </div>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${availabilityData.level === 'high' ? 'bg-red-500' : availabilityData.level === 'medium' ? 'bg-amber-500' : 'bg-teal-500'}`} 
                                    style={{ width: `${occupancyPercentage}%` }}
                                  ></div>
                              </div>
                              <div className="flex items-center justify-between gap-2 overflow-hidden">
                                  <div className="text-[9px] text-slate-400 font-bold uppercase truncate flex-1">
                                      {isScanning ? <span className="text-teal-500 italic">Verversen...</span> : availabilityData.status}
                                  </div>
                                  {!isScanning && (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {availabilityData.sources?.map((s, idx) => (
                                            <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5 font-bold" title={s.title} onClick={(e) => e.stopPropagation()}>
                                                <Globe size={10}/>
                                            </a>
                                        ))}
                                    </div>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <div className="flex-1 flex flex-col justify-end">
                               <div className="h-6 w-24 bg-slate-100 rounded animate-pulse mb-2"></div>
                               <div className="h-1.5 w-full bg-slate-100 rounded animate-pulse"></div>
                          </div>
                      )}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-sky-300 transition-all h-32">
                      <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
                          <CertificateIcon size={24} />
                      </div>
                      <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance</div>
                          <div className="text-xl font-bold text-slate-900">{avgScore ? `${avgScore}%` : 'N.v.t.'}</div>
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-indigo-300 transition-all h-32">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                          <Medal size={24} />
                      </div>
                      <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badges</div>
                          <div className="text-xl font-bold text-slate-900">{combinedBadges.length}</div>
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-rose-300 transition-all h-32">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
                          <Heart size={24} />
                      </div>
                      <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complimenten</div>
                          <div className="text-xl font-bold text-slate-900">{compliments.length}x</div>
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-amber-300 transition-all h-32">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                          <Clock size={24} />
                      </div>
                      <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dienstverband</div>
                          <div className="text-xl font-bold text-slate-900">
                             {diffYears > 0 ? `${diffYears}j ${diffMonths}m` : `${diffMonths}m`}
                          </div>
                      </div>
                  </div>
              </div>

              {/* OPEN ACTIONS */}
              {openActions.length > 0 && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-4 border-b border-slate-100 bg-amber-50/30 flex items-center gap-2">
                          <AlertCircle size={18} className="text-amber-600" />
                          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Openstaande Acties</h3>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {openActions.map((action, i) => (
                              <button 
                                key={i}
                                onClick={() => action.type === 'Evaluation' ? onChangeView(ViewState.EVALUATIONS) : onChangeView(ViewState.ONBOARDING)}
                                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-sky-400 hover:shadow-md transition-all text-left group"
                              >
                                  <div className="flex items-center gap-4">
                                      <div className={`p-2 rounded-xl ${action.type === 'Evaluation' ? 'bg-purple-50 text-purple-600' : 'bg-sky-50 text-sky-600'}`}>
                                          {action.type === 'Evaluation' ? <ClipboardCheck size={20}/> : <ListTodo size={20}/>}
                                      </div>
                                      <div>
                                          <div className="font-bold text-slate-900 text-sm">{action.title}</div>
                                          <div className="text-xs text-slate-500">{action.desc}</div>
                                      </div>
                                  </div>
                                  <ChevronRight size={18} className="text-slate-300 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                      {employee.onboardingStatus === 'Active' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-sky-600">
                                <GraduationCap size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">Mijn Inwerktraject</h3>
                                        <p className="text-sm text-slate-500">{templateTitle || 'Onboarding'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-sky-600">{obProgress}%</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Voortgang</div>
                                    </div>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-8 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-1000" style={{ width: `${obProgress}%` }}></div>
                                </div>
                                <button onClick={() => onChangeView(ViewState.ONBOARDING)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
                                    Verder met inwerken <ArrowRight size={16}/>
                                </button>
                            </div>
                        </div>
                      )}

                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                  <Sparkles className="text-rose-500" size={18}/> Successen & Complimenten
                              </h3>
                          </div>
                          <div className="p-8 space-y-6">
                              {compliments.length > 0 ? (
                                compliments.slice(0, 3).map((comp, idx) => (
                                    <div key={idx} className="relative pl-8 group">
                                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-rose-100 border-2 border-rose-500 z-10"></div>
                                        <div className="absolute left-[7px] top-4 bottom-[-24px] w-0.5 bg-slate-100 group-last:hidden"></div>
                                        <div className="bg-rose-50/20 p-5 rounded-2xl border border-rose-100/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-rose-900 text-sm">{comp.title}</h4>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{comp.date}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed italic">"{comp.description}"</p>
                                        </div>
                                    </div>
                                ))
                              ) : (
                                  <div className="py-12 text-center">
                                      <Heart className="mx-auto text-slate-200 mb-4" size={48} strokeWidth={1} />
                                      <p className="text-slate-400 italic text-sm">Zodra je complimenten ontvangt in je dossier, verschijnen ze hier.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="space-y-8">
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 h-full">
                          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                              <Trophy size={16} className="text-amber-500"/> Mijn Badges
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                              {combinedBadges.slice(0, 6).map((badge, idx) => {
                                  const Icon = BADGE_ICONS[badge.icon] || Star;
                                  return (
                                      <div key={idx} className="flex flex-col items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all relative cursor-help">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 border-2 transition-transform group-hover:rotate-12 ${BADGE_COLORS[badge.color] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                              <Icon size={24} />
                                          </div>
                                          <div className="text-[11px] font-bold text-slate-900 text-center leading-tight line-clamp-1">{badge.name}</div>
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                              {badge.description}
                                          </div>
                                      </div>
                                  );
                              })}
                              {combinedBadges.length === 0 && (
                                  <div className="col-span-2 py-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                                      <Award size={32} strokeWidth={1} />
                                      <span className="text-[10px] font-bold uppercase mt-2">Nog geen badges</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
      {!isOwnProfile && onBack && (<button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-6 transition-colors"><ArrowLeft size={18} />Terug naar overzicht</button>)}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative group/header">
        <div className="h-48 md:h-64 relative overflow-hidden bg-slate-100">
          {employee.banner ? (<img src={employee.banner} alt="Banner" className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover/header:scale-105" />) : (<div className="w-full h-full bg-slate-200 relative overflow-hidden"><div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-slate-100 to-slate-200"></div></div>)}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          {isOwnProfile && (<button onClick={() => bannerInputRef.current?.click()} className="absolute top-4 right-4 px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-md text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2 opacity-0 group-hover/header:opacity-100"><ImageIcon size={14} /><span className="hidden sm:inline">Cover Wijzigen</span></button>)}
        </div>
        <div className="px-6 md:px-10 pb-6 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-20 mb-2">
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
        </div>
      </div>

      {renderDashboardOverview()}
    </div>
  );
};

export default EmployeeProfile;