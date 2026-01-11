
import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, LogOut, User, Key, ChevronLeft, AlertCircle } from 'lucide-react';
import { Employee } from '../types';
import { api } from '../utils/api';

interface SessionLockScreenProps {
  currentUser: Employee;
  onUnlock: (password: string) => Promise<boolean>;
  onLogout: () => void;
}

const LOCK_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80", // Abstract flowing fabric/liquid
  "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=1920&q=80", // Texture
];

const SessionLockScreen: React.FC<SessionLockScreenProps> = ({ currentUser, onUnlock, onLogout }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate background images slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % LOCK_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const success = await onUnlock(password);
        if (!success) {
            setError('Onjuist wachtwoord.');
            setIsLoading(false);
        }
        // If success, parent handles removal of lock screen
    } catch (e) {
        setError('Er is een fout opgetreden.');
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex font-sans overflow-hidden bg-white">
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
        {LOCK_IMAGES.map((src, index) => (
           <div 
             key={src}
             className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-70 z-10' : 'opacity-0 z-0'}`}
           >
              <img 
                src={src} 
                alt="Lock Screen Visual" 
                className="w-full h-full object-cover animate-kenburns"
              />
           </div>
        ))}
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20"></div>

        <div className="absolute bottom-0 left-0 p-12 z-30 text-white">
          <div className="w-12 h-12 bg-amber-500/20 backdrop-blur-md text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-lg mb-6">
             <Lock size={24} />
          </div>
          <h2 className="text-4xl font-serif font-bold leading-tight mb-4 drop-shadow-lg">
             Sessie Verlopen
          </h2>
          <p className="text-white/80 text-lg font-light max-w-md">
             Voor uw veiligheid is de sessie vergrendeld na een periode van inactiviteit.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Content */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-slate-50 relative">
        
        <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
            
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center">
                <div className="relative inline-block mb-6">
                    <img 
                        src={currentUser.avatar} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                        alt={currentUser.name}
                    />
                    <div className="absolute bottom-0 right-0 bg-amber-500 border-2 border-white rounded-full p-1.5 text-white">
                        <Lock size={14} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-1">Welkom terug, {currentUser.name.split(' ')[0]}</h1>
                <p className="text-slate-500 text-sm mb-8">Voer uw wachtwoord in om verder te gaan.</p>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="relative group text-left">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-xl border-0 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                            placeholder="Wachtwoord"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm font-bold animate-pulse">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative flex w-full justify-center rounded-xl bg-slate-900 px-3 py-4 text-sm font-bold text-white text-lg shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                    >
                        {isLoading ? 'Verifiëren...' : 'Ontgrendelen'} 
                        {!isLoading && <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>
            </div>

            <div className="mt-8 text-center">
                <button 
                    onClick={onLogout}
                    className="text-slate-500 hover:text-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <LogOut size={16} />
                    Inloggen als andere gebruiker
                </button>
            </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-6 w-full text-center pointer-events-none flex justify-center items-center gap-4">
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} Sanadome Nijmegen. Beveiligde Omgeving.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SessionLockScreen;
