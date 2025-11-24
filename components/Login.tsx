
import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, User, Key, ChevronLeft, Mail } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => boolean;
}

const LOGIN_IMAGES = [
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1920&q=80", // Spa/Pool
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80", // Exterior Night
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1920&q=80", // Luxury Lounge
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Rotate images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % LOGIN_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for realism
    setTimeout(() => {
      const success = onLogin(email, password);
      if (!success) {
        setError('Ongeldig e-mailadres of wachtwoord.');
        setIsLoading(false);
      }
    }, 800);
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
        {LOGIN_IMAGES.map((src, index) => (
           <div 
             key={src}
             className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-70 z-10' : 'opacity-0 z-0'}`}
           >
              <img 
                src={src} 
                alt="Login Visual" 
                className="w-full h-full object-cover animate-kenburns"
              />
           </div>
        ))}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-20"></div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 p-12 z-30 text-white">
          <div className="w-12 h-12 bg-slate-900/50 backdrop-blur-md text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center shadow-lg mb-6">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
             </svg>
          </div>
          {/* QUOTE STAYS SERIF */}
          <h2 className="text-4xl font-serif font-bold leading-tight mb-4 drop-shadow-lg">
             "Gastvrijheid begint<br/>bij onszelf."
          </h2>
          <p className="text-white/80 text-lg font-light max-w-md">
             Welkom terug in jouw digitale werkomgeving. Beheer je zaken, blijf op de hoogte en groei met ons mee.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Content */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-8 md:p-16 bg-slate-50 relative">
        
        {/* VIEW 1: LOGIN FORM */}
        {!showForgotPassword && (
            <div className="w-full max-w-md animate-in slide-in-from-left-8 fade-in duration-500">
            
            <div className="mb-10 text-center lg:text-left">
                {/* LOGO & TITLE SANS SERIF */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                Mijn<span className="text-teal-600">Sanadome</span>.
                </h1>
                <p className="text-slate-500 font-medium">Log in om verder te gaan naar het portaal.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                        E-mailadres
                    </label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                        <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                        placeholder="naam@sanadome.nl"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                        Wachtwoord
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                        <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all font-medium"
                        placeholder="••••••••"
                        />
                    </div>
                </div>
                </div>

                <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-slate-600">
                    Onthoud mij
                    </label>
                </div>

                <div className="text-sm">
                    <button 
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="font-bold text-teal-600 hover:text-teal-500"
                    >
                        Wachtwoord vergeten?
                    </button>
                </div>
                </div>

                {error && (
                <div className="rounded-lg bg-red-50 p-4 animate-in slide-in-from-top-2 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                )}

                <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative flex w-full justify-center rounded-xl bg-slate-900 px-3 py-4 text-sm font-bold text-white text-lg shadow-lg hover:bg-slate-800 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Verifiëren...</span>
                        </div>
                    ) : (
                    <span className="flex items-center gap-2">
                        Inloggen <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    )}
                </button>
                </div>
            </form>
            </div>
        )}

        {/* VIEW 2: FORGOT PASSWORD */}
        {showForgotPassword && (
            <div className="w-full max-w-md animate-in slide-in-from-right-8 fade-in duration-500">
                <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Key size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Wachtwoord Herstellen</h2>
                    
                    <div className="text-slate-600 text-sm leading-relaxed mb-8 space-y-4">
                        <p className="font-medium">
                            Om veiligheidsredenen is het niet mogelijk om zelfstandig je wachtwoord te resetten via dit portaal.
                        </p>
                        
                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 text-left space-y-4">
                            <p className="font-bold text-slate-800 border-b border-slate-200 pb-2">Neem contact op met:</p>
                            
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 bg-white border border-slate-200 rounded-full text-slate-500">
                                    <User size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Lars Kohler</p>
                                    <p className="text-xs text-slate-500 font-medium">Front Office Manager</p>
                                    <a href="mailto:lars.kohler@sanadome.nl" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-bold">
                                        <Mail size={10} /> lars.kohler@sanadome.nl
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 bg-white border border-slate-200 rounded-full text-slate-500">
                                    <User size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Janique Vink</p>
                                    <p className="text-xs text-slate-500 font-medium">Assistent Front Office Manager</p>
                                    <a href="mailto:janique.vink@sanadome.nl" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-bold">
                                        <Mail size={10} /> janique.vink@sanadome.nl
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-xs text-slate-400 font-medium">
                            Zij kunnen een tijdelijk wachtwoord voor je aanmaken.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                    >
                        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
                        Terug naar inloggen
                    </button>
                </div>
            </div>
        )}

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

export default Login;
