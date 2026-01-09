
import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, Key, CheckCircle2 } from 'lucide-react';
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % RESET_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch employee details (mocked)
  useEffect(() => {
      const fetchEmp = async () => {
          const emps = await api.getEmployees();
          // In real app, search by ID. Here we match prop
          const found = emps.find(e => e.id.startsWith(employeeId)); // Matching partial ID from URL often used in demos
          if (found) setEmployee(found);
      };
      fetchEmp();
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
          setError("Medewerker niet gevonden.");
          setIsLoading(false);
          return;
      }

      try {
          const updatedEmployee = { ...employee, password: newPassword };
          await api.saveEmployee(updatedEmployee);
          setSuccess(true);
      } catch (err) {
          setError("Er is iets misgegaan bij het opslaan.");
      } finally {
          setIsLoading(false);
      }
  };

  if (!employee && !success) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
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
             Stel een nieuw wachtwoord in om weer veilig toegang te krijgen tot jouw Sanadome omgeving.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-slate-50 relative">
        
        <div className="w-full max-w-md animate-in slide-in-from-right-8 fade-in duration-500">
            
            {success ? (
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50 animate-in zoom-in duration-300">
                        <CheckCircle2 size={40} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Wachtwoord gewijzigd!</h2>
                        <p className="text-slate-500 mt-2 text-lg">Je kunt nu inloggen met je nieuwe wachtwoord.</p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-8"
                    >
                        Naar Inlogscherm <ArrowRight size={18} />
                    </button>
                </div>
            ) : (
                <>
                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                            Hey {employee?.name.split(' ')[0]} 👋
                        </h1>
                        <p className="text-slate-500 font-medium">Kies een nieuw wachtwoord voor je account.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                    Nieuw Wachtwoord
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

                        <button
                            type="submit"
                            disabled={isLoading || !newPassword || !confirmPassword}
                            className="group relative flex w-full justify-center rounded-xl bg-slate-900 px-3 py-4 text-sm font-bold text-white text-lg shadow-lg hover:bg-slate-800 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Opslaan...' : 'Wachtwoord Wijzigen'}
                        </button>
                    </form>
                </>
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
