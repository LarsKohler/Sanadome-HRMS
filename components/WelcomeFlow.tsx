
import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, Check, ArrowRight, ShieldCheck, Sparkles, Lock, 
  LayoutDashboard, Loader2, AlertCircle, 
  BookOpen, Trophy, Users, Ticket, FileText, 
  GraduationCap, MessageSquare
} from 'lucide-react';
import { Employee } from '../types';

interface WelcomeFlowProps {
  employee: Employee;
  onComplete: (updatedEmployee: Employee) => Promise<void> | void;
  customImages?: string[];
}

const DEFAULT_WELCOME_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80", // Resort Exterior
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1920&q=80", // Hotel Lobby
  "https://images.unsplash.com/photo-1600334019640-1c205ae9919b?auto=format&fit=crop&w=1920&q=80", // Wellness
];

const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ employee, onComplete, customImages }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const activeImages = (customImages && customImages.length > 0) ? customImages : DEFAULT_WELCOME_IMAGES;

  // Rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % activeImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeImages.length]);

  const handleNext = () => {
    // Validation for Password Step (Step 3)
    if (step === 3) {
       if (password.length < 4) {
           setError('Wachtwoord moet minimaal 4 tekens zijn.');
           return;
       }
       if (password !== confirmPassword) {
           setError('Wachtwoorden komen niet overeen.');
           return;
       }
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleFinish = async () => {
      setIsProcessing(true);
      setError('');
      try {
          const updated: Employee = { 
              ...employee, 
              password: password || employee.password || 'sanadome123',
              accountStatus: 'Active'
          };
          
          await onComplete(updated);
      } catch (e: any) {
          console.error("Error completing welcome flow", e);
          setError(e.message || 'Fout bij opslaan: Database update mislukt.');
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex font-sans overflow-hidden bg-white">
        <style>{`
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        .animate-kenburns {
          animation: kenburns 20s ease-out infinite alternate;
        }
      `}</style>

        {/* LEFT PANEL: Visuals (45%) */}
        <div className="hidden lg:block lg:w-[45%] relative overflow-hidden bg-slate-900">
            {activeImages.map((src, index) => (
                <div 
                    key={src}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-70 z-10' : 'opacity-0 z-0'}`}
                >
                    <img 
                        src={src} 
                        alt="Welcome Visual" 
                        className="w-full h-full object-cover animate-kenburns"
                    />
                </div>
            ))}
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20"></div>

            <div className="absolute bottom-0 left-0 p-12 z-30 text-white">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/20 shadow-lg">
                    <Sparkles className="text-teal-400" size={24} />
                </div>
                <h2 className="text-4xl font-serif font-bold leading-tight mb-4 drop-shadow-lg">
                    Welkom bij de familie,<br/>{employee.name.split(' ')[0]}.
                </h2>
                <p className="text-white/80 text-lg font-light max-w-md">
                    Je reis bij Sanadome begint hier. We hebben een compleet platform ingericht voor jouw groei en succes.
                </p>
            </div>
        </div>

        {/* RIGHT PANEL: Interaction (55%) */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-white relative">
            
            {/* Stepper */}
            <div className="absolute top-10 right-10 flex gap-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-teal-600' : 'w-2 bg-slate-200'}`}></div>
                ))}
            </div>

            <div className="w-full max-w-lg">
                
                {/* STEP 1: INTRO */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700 text-center lg:text-left">
                        <div>
                            <span className="text-teal-600 font-bold text-sm uppercase tracking-wider mb-2 block">Mijn Sanadome HRMS</span>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Jouw digitale thuisbasis</h1>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                Dit portaal is meer dan alleen administratie. Het is de plek waar je werkt aan je ontwikkeling, in contact blijft met je team en toegang hebt tot alle kennis van onze organisatie.
                            </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-teal-600">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-1">Alles op één plek</h4>
                                <p className="text-sm text-slate-500">Van je rooster en verlof tot je persoonlijke groeipad en bedrijfsnieuws.</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleNext}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                        >
                            Ontdek de mogelijkheden <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>
                )}

                {/* STEP 2: FEATURE SHOWCASE (NEW) */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="text-center lg:text-left">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Wat kun je verwachten?</h2>
                            <p className="text-slate-500">Een overzicht van de modules waar jij toegang tot krijgt.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card 1: Growth */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-purple-50/50 to-transparent hover:border-purple-200 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Trophy size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">Groei & Performance</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Houd je voortgang bij via <span className="font-semibold text-purple-700">Evaluaties</span>, verdien <span className="font-semibold text-purple-700">Badges</span> voor goed werk en volg je <span className="font-semibold text-purple-700">Onboarding</span>.
                                </p>
                            </div>

                            {/* Card 2: Team */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-blue-50/50 to-transparent hover:border-blue-200 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Users size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">Team & Cultuur</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Lees het laatste <span className="font-semibold text-blue-700">Nieuws</span>, geef je mening in <span className="font-semibold text-blue-700">Surveys</span> en vind je collega's in het smoelenboek.
                                </p>
                            </div>

                            {/* Card 3: Support */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-50/50 to-transparent hover:border-amber-200 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <BookOpen size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">Kennis & Support</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Raadpleeg de <span className="font-semibold text-amber-700">Kennisbank</span> voor protocollen of meld technische problemen via het <span className="font-semibold text-amber-700">Ticket Systeem</span>.
                                </p>
                            </div>

                            {/* Card 4: Admin */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-teal-50/50 to-transparent hover:border-teal-200 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">Administratie</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Beheer je <span className="font-semibold text-teal-700">Documenten</span>, bekijk je contract en houd je persoonsgegevens up-to-date.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={handleNext}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            Account Activeren <ArrowRight size={18}/>
                        </button>
                    </div>
                )}

                {/* STEP 3: SECURITY */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Kies je wachtwoord</h2>
                            <p className="text-slate-500 text-sm mt-2">Om je toegang te beveiligen, vragen we je een persoonlijk wachtwoord in te stellen.</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nieuw Wachtwoord</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-medium"
                                        placeholder="••••••••"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bevestig Wachtwoord</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            {error && (
                                <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleNext}
                            disabled={!password || password !== confirmPassword}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Opslaan & Verder
                        </button>
                    </div>
                )}

                {/* STEP 4: READY */}
                {step === 4 && (
                    <div className="text-center space-y-8 animate-in zoom-in duration-500">
                         <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50">
                            <Check size={48} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Je bent er helemaal klaar voor!</h2>
                            <p className="text-slate-500 mt-2 text-lg">
                                Bedankt voor het instellen van je account. <br/>We wensen je heel veel succes en plezier bij Sanadome.
                            </p>
                        </div>
                        
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left shadow-sm max-w-sm mx-auto">
                            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                                <img src={employee.avatar} className="w-12 h-12 rounded-full shadow-sm object-cover" alt="Avatar"/>
                                <div>
                                    <div className="font-bold text-slate-900">{employee.name}</div>
                                    <div className="text-xs text-slate-500">{employee.role}</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><Check size={12} strokeWidth={3}/></div>
                                    Profiel geactiveerd
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><Check size={12} strokeWidth={3}/></div>
                                    Wachtwoord beveiligd
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><Check size={12} strokeWidth={3}/></div>
                                    Toegang tot dashboard
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800 text-sm font-medium animate-in slide-in-from-bottom-2">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={handleFinish}
                            disabled={isProcessing}
                            className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> Verwerken...
                                </>
                            ) : (
                                <>
                                    Naar Dashboard <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default WelcomeFlow;
