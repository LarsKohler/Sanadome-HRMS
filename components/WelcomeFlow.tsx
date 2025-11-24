
import React, { useState, useEffect } from 'react';
import { ChevronRight, Check, ArrowRight, ShieldCheck, Sparkles, Lock, Calendar, FileText, Users, Trophy, LayoutDashboard, BookOpen } from 'lucide-react';
import { Employee } from '../types';

interface WelcomeFlowProps {
  employee: Employee;
  onComplete: (updatedEmployee: Employee) => void;
}

const WELCOME_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80", // Resort Exterior
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1920&q=80", // Hotel Lobby
  "https://images.unsplash.com/photo-1600334019640-1c205ae9919b?auto=format&fit=crop&w=1920&q=80", // Wellness
];

const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ employee, onComplete }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % WELCOME_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    if (step === 2) {
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
            {WELCOME_IMAGES.map((src, index) => (
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
                    Je reis bij Sanadome begint hier. We hebben alles klaargezet voor een vliegende start.
                </p>
            </div>
        </div>

        {/* RIGHT PANEL: Interaction (55%) */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-white relative">
            
            {/* Stepper */}
            <div className="absolute top-10 right-10 flex gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-teal-600' : 'w-2 bg-slate-200'}`}></div>
                ))}
            </div>

            <div className="w-full max-w-md">
                
                {/* STEP 1: INTRO & FEATURES */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Jouw digitale werkplek</h1>
                            <p className="text-slate-500">Dit is jouw persoonlijke portaal. Hier regel je alles rondom je werk, groei en team.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-100 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm border border-slate-100">
                                    <LayoutDashboard size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Alles in één overzicht</h3>
                                    <p className="text-xs text-slate-500">Verlof aanvragen, loonstroken bekijken en je rooster checken.</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-purple-100 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm border border-slate-100">
                                    <Trophy size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Onboarding & Groei</h3>
                                    <p className="text-xs text-slate-500">Volg je inwerktraject, bekijk evaluaties en stel doelen.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                                    <Users size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Team & Nieuws</h3>
                                    <p className="text-xs text-slate-500">Blijf op de hoogte van evenementen en updates.</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleNext}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                        >
                            Aan de slag <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>
                )}

                {/* STEP 2: SECURITY */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Account beveiligen</h2>
                            <p className="text-slate-500 text-sm mt-2">Kies een veilig wachtwoord voor je persoonlijke toegang.</p>
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
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    {error}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleNext}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all"
                        >
                            Opslaan & Verder
                        </button>
                    </div>
                )}

                {/* STEP 3: READY */}
                {step === 3 && (
                    <div className="text-center space-y-8 animate-in zoom-in duration-500">
                         <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50">
                            <Check size={48} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Alles is gereed!</h2>
                            <p className="text-slate-500 mt-2">
                                Je account is succesvol geactiveerd. <br/>Welkom bij het team.
                            </p>
                        </div>
                        
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left shadow-sm">
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
                                    Profiel aangemaakt
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><Check size={12} strokeWidth={3}/></div>
                                    Wachtwoord ingesteld
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600"><Check size={12} strokeWidth={3}/></div>
                                    Toegang tot portaal
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                const updated = { ...employee, password: password || employee.password };
                                onComplete(updated);
                            }}
                            className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                            Naar Dashboard <ArrowRight size={18} />
                        </button>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default WelcomeFlow;
