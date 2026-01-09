
import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, Key, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';
import { Employee } from '../types';

interface ResetPasswordPageProps {
    employeeId: string;
}

const RESET_IMAGES = [
  "https://images.unsplash.com/photo-1571896349842-6e5a513e610a?auto=format&fit=crop&w=1920&q=80", // Calm office
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80", // Modern space
];

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ employeeId }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0: Intro, 1: Form, 2: Success
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % RESET_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch employee details
  useEffect(() => {
      const fetchEmp = async () => {
          try {
              const emps = await api.getEmployees();
              // Robust matching
              const found = emps.find(e => e.id === employeeId || e.id.startsWith(employeeId)); 
              if (found) {
                  setEmployee(found);
              } else {
                  setError("Medewerker niet gevonden.");
              }
          } catch (e) {
              setError("Fout bij verbinden met server.");
          }
      };
      if (employeeId) fetchEmp();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      if (newPassword.length < 4) {
          setError("Wachtwoord moet minimaal 4 tekens zijn.");
          setIsLoading(false);
          return;
      }

      if (newPassword !== confirmPassword) {
          setError("Wachtwoorden komen niet overeen.");
          setIsLoading(false);
          return;
      }

      if (!employee) {
          setError("Geen medewerker data gevonden.");
          setIsLoading(false);
          return;
      }

      try {
          const updatedEmployee: Employee = { 
              ...employee, 
              password: newPassword,
              accountStatus: 'Active' // Ensure account is active after reset
          };
          
          const success = await api.saveEmployee(updatedEmployee);
          
          if (success) {
              setStep(2);
          } else {
              setError("Opslaan mislukt. Controleer je verbinding.");
          }
      } catch (err) {
          console.error(err);
          setError("Er is iets misgegaan bij het opslaan.");
      } finally {
          setIsLoading(false);
      }
  };

  if (!employee && !error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                  <p className="text-slate-500 text-sm">Gegevens laden...</p>
              </div>
          </div>
      );
  }

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
        {RESET_IMAGES.map((src, index) => (
           <div 
             key={src}
             className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-70 z-10' : 'opacity-0 z-0'}`}
           >
              <img 
                src={src} 
                alt="Visual" 
                className="w-full h-full object-cover animate-kenburns"
              />
           </div>
        ))}
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20"></div>

        <div className="absolute bottom-0 left-0 p-12 z-30 text-white">
          <div className="w-12 h-12 bg-slate-900/50 backdrop-blur-md text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center shadow-lg mb-6">
             <Key size={24} />
          </div>
          <h2 className="text-4xl font-serif font-bold leading-tight mb-4 drop-shadow-lg">
             Een frisse start.
          </h2>
          <p className="text-white/80 text-lg font-light max-w-md">
             Beveilig je account met een sterk wachtwoord om toegang te houden tot Sanadome HRMS.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-slate-50 relative">
        
        <div className="w-full max-w-md">
            
            {/* STEP 0: INTRO */}
            {step === 0 && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <ShieldCheck size={36} />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-slate-900">Welkom, {employee?.name.split(' ')[0]}!</h2>
                            <p className="text-slate-500 text-lg">
                                We helpen je graag bij het instellen van een nieuw wachtwoord. Dit duurt maar een minuutje.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">1</div>
                                <span className="text-slate-700 font-medium">Veilige toegang tot je gegevens</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">2</div>
                                <span className="text-slate-700 font-medium">Persoonlijk en vertrouwelijk</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => setStep(1)}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                        >
                            Starten <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 1: FORM */}
            {step === 1 && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                    <div className="mb-8 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                            Nieuw Wachtwoord
                        </h1>
                        <p className="text-slate-500 font-medium">Kies een sterk wachtwoord voor je account.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                    Wachtwoord
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="block w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                                        placeholder="••••••••"
                                        autoFocus
                                    />
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
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-4 animate-in slide-in-from-top-2 flex items-center gap-3 border border-red-100">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(0)}
                                className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Terug
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !newPassword || !confirmPassword}
                                className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Opslaan...' : 'Wachtwoord Wijzigen'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* STEP 2: SUCCESS */}
            {step === 2 && (
                <div className="text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50">
                        <CheckCircle2 size={48} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Wachtwoord gewijzigd!</h2>
                        <p className="text-slate-500 mt-2 text-lg">Je account is nu bijgewerkt en beveiligd.</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto">
                        <p className="text-slate-600 text-sm">
                            Je kunt nu inloggen met je emailadres <strong>{employee?.email}</strong> en je nieuwe wachtwoord.
                        </p>
                    </div>

                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-8"
                    >
                        Naar Inlogscherm <ArrowRight size={18} />
                    </button>
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

export default ResetPasswordPage;
