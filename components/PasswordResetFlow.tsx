
import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check, ArrowRight, Key, Waves, ChevronLeft } from 'lucide-react';
import { Employee } from '../types';
import { api } from '../utils/api';

interface PasswordResetFlowProps {
  employeeId: string;
  onComplete: () => void;
}

const RESET_IMAGES = [
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1920&q=80", // Luxury Pool Evening
  "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?auto=format&fit=crop&w=1920&q=80", // Serene Spa
];

const PasswordResetFlow: React.FC<PasswordResetFlowProps> = ({ employeeId, onComplete }) => {
  const [step, setStep] = useState<'loading' | 'verify' | 'reset' | 'success'>('loading');
  const [employeeName, setEmployeeName] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Load employee data for greeting
  useEffect(() => {
      const fetchEmployee = async () => {
          try {
              const employees = await api.getEmployees();
              const target = employees.find(e => e.id === employeeId);
              if (target) {
                  setEmployeeName(target.name.split(' ')[0]); // Get first name
                  setStep('verify');
              } else {
                  setError('Gebruiker niet gevonden.');
              }
          } catch (e) {
              console.error(e);
              setError('Kon gegevens niet laden.');
          }
      };
      fetchEmployee();
  }, [employeeId]);

  // Rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % RESET_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
        setError('Wachtwoord moet minimaal 4 tekens zijn.');
        return;
    }
    if (password !== confirmPassword) {
        setError('Wachtwoorden komen niet overeen.');
        return;
    }

    setIsLoading(true);
    try {
        const employees = await api.getEmployees();
        const emp = employees.find(e => e.id === employeeId);
        
        if (!emp) {
            setError('Gebruiker niet gevonden.');
            setIsLoading(false);
            return;
        }

        const updated: Employee = { ...emp, password: password, accountStatus: 'Active' };
        await api.saveEmployee(updated);
        
        setStep('success');
    } catch (e) {
        setError('Er is iets misgegaan. Probeer het later opnieuw.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans overflow-hidden">
      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        .animate-kenburns {
          animation: kenburns 20s ease-out infinite alternate;
        }
      `}</style>

      {/* LEFT PANEL: Visuals */}
      <div className="hidden lg:block lg:w-[45%] relative overflow-hidden bg-slate-900">
        {/* Stacked Images for Cross-fade */}
        {RESET_IMAGES.map((src, index) => (
           <div 
             key={src}
             className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-70 z-10' : 'opacity-0 z-0'}`}
           >
              <img 
                src={src} 
                alt="Reset Visual" 
                className="w-full h-full object-cover animate-kenburns"
              />
           </div>
        ))}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20"></div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 p-12 z-30 text-white">
          <div className="w-14 h-14 bg-teal-600/90 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-900/30 mb-6">
             <Key size={28} strokeWidth={2.5} />
          </div>
          
          <h2 className="text-4xl font-serif font-bold leading-tight mb-4 drop-shadow-lg">
             Hey {employeeName || 'Collega'},<br/>tijd voor iets nieuws.
          </h2>
          <p className="text-white/80 text-lg font-light max-w-md">
             Beveilig je account met een nieuw wachtwoord zodat je weer snel aan de slag kunt.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Content */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-white relative">
         
         <div className="w-full max-w-md">
            
            {/* Header Logo for Mobile/Desktop */}
            <div className="mb-10 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                    <div className="p-1.5 bg-teal-600 rounded-lg text-white lg:hidden">
                        <Waves size={16} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Mijn<span className="text-teal-600">Sanadome</span>.
                    </h1>
                </div>
            </div>

            {step === 'loading' && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 text-sm">Gegevens laden...</p>
                </div>
            )}

            {step === 'verify' && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                        <h3 className="font-bold text-slate-900 text-lg mb-2">Wachtwoord Herstellen</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Je staat op het punt om een nieuw wachtwoord in te stellen voor je account. Zorg ervoor dat je een veilig wachtwoord kiest.
                        </p>
                    </div>

                    <button 
                        onClick={() => setStep('reset')}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                    >
                        Start Herstel <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full mt-4 py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
                    >
                        Annuleren
                    </button>
                </div>
            )}

            {step === 'reset' && (
                <form onSubmit={handleReset} className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Nieuw Wachtwoord</h2>
                        <p className="text-slate-500 text-sm">Kies een wachtwoord van minimaal 4 tekens.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                Nieuw Wachtwoord
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border-0 bg-slate-50 py-4 pl-12 pr-12 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                                    placeholder="Nieuw wachtwoord"
                                    autoFocus
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                </button>
                            </div>
                        </div>
                        
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                Bevestig Wachtwoord
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                                <input 
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full rounded-xl border-0 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                                    placeholder="Bevestig wachtwoord"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm font-medium text-red-600 bg-red-50 p-4 rounded-xl flex items-center gap-3 border border-red-100">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        >
                            {isLoading ? 'Opslaan...' : 'Wachtwoord Opslaan'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setStep('verify')}
                            className="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
                        >
                            Terug
                        </button>
                    </div>
                </form>
            )}

            {step === 'success' && (
                <div className="text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-green-50 mb-4">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Gelukt!</h2>
                        <p className="text-slate-500 text-lg">Je wachtwoord is succesvol aangepast.<br/>Je kunt nu inloggen met je nieuwe gegevens.</p>
                    </div>
                    <div className="pt-6">
                        <button 
                            onClick={onComplete}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 group"
                        >
                            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> Naar Inloggen
                        </button>
                    </div>
                </div>
            )}
         
         </div>

         {/* Footer */}
         <div className="absolute bottom-6 w-full text-center pointer-events-none flex justify-center items-center gap-4">
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} Sanadome Nijmegen. Secure Environment.
            </p>
         </div>

      </div>
    </div>
  );
};

export default PasswordResetFlow;
