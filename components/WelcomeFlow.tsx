import React, { useState, useRef } from 'react';
import { ChevronRight, Check, ArrowRight, UserCheck, ShieldCheck, Sparkles, Smartphone, Lock, Camera } from 'lucide-react';
import { Employee } from '../types';

interface WelcomeFlowProps {
  employee: Employee;
  onComplete: (updatedEmployee: Employee) => void;
}

const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ employee, onComplete }) => {
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    phone: employee.phone || '',
    avatar: employee.avatar || ''
  });

  const IMAGES = {
      WELCOME: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80",
      FEATURES_DEFAULT: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1920&q=80",
      PERSONALIZE: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1920&q=80",
      SECURITY: "https://images.unsplash.com/photo-1563013544-824cf1ea18cd?auto=format&fit=crop&w=1920&q=80",
      COMPLETE: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80"
  };

  const handleNext = () => {
      setIsExiting(true);
      setTimeout(() => {
          setStep(prev => prev + 1);
          setIsExiting(false);
      }, 400);
  };

  const handleComplete = () => {
      const updatedEmployee = {
          ...employee,
          phone: formData.phone,
          avatar: formData.avatar,
          // In a real app, we would handle password change securely here
      };
      onComplete(updatedEmployee);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setFormData(prev => ({ ...prev, avatar: url }));
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex bg-slate-900 font-sans overflow-hidden">
       {/* Left Panel - Visuals */}
       <div className="hidden lg:block w-[45%] relative overflow-hidden bg-black">
          <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${step === 0 ? 'opacity-60 z-10' : 'opacity-0 z-0'}`}>
              <img src={IMAGES.WELCOME} alt="Welcome" className="w-full h-full object-cover" />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${step === 1 ? 'opacity-60 z-10' : 'opacity-0 z-0'}`}>
              <img src={IMAGES.FEATURES_DEFAULT} alt="Features" className="w-full h-full object-cover" />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${step === 2 ? 'opacity-60 z-10' : 'opacity-0 z-0'}`}>
              <img src={IMAGES.PERSONALIZE} alt="Personalize" className="w-full h-full object-cover" />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${step === 3 ? 'opacity-60 z-10' : 'opacity-0 z-0'}`}>
              <img src={IMAGES.SECURITY} alt="Security" className="w-full h-full object-cover" />
          </div>
           <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${step === 4 ? 'opacity-60 z-10' : 'opacity-0 z-0'}`}>
              <img src={IMAGES.COMPLETE} alt="Complete" className="w-full h-full object-cover" />
          </div>
          
          <div className="absolute bottom-0 left-0 p-12 z-30 text-white">
              <h2 className="text-4xl font-serif italic mb-4 drop-shadow-lg">
                  {step === 0 && '"Welkom thuis bij Sanadome."'}
                  {step === 1 && '"Alles wat je nodig hebt."'}
                  {step === 2 && '"Laat zien wie je bent."'}
                  {step === 3 && '"Veiligheid voorop."'}
                  {step === 4 && '"Je bent er klaar voor."'}
              </h2>
          </div>
       </div>

       {/* Right Panel - Content */}
       <div className="w-full lg:w-[55%] bg-white relative flex flex-col items-center justify-center p-8 md:p-20">
           <div className={`max-w-lg w-full transition-all duration-500 ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
               
               {step === 0 && (
                   <div className="space-y-6">
                       <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6">
                           <Sparkles size={32} />
                       </div>
                       <h1 className="text-4xl font-bold text-slate-900">Welkom, {employee.name.split(' ')[0]}!</h1>
                       <p className="text-lg text-slate-600 leading-relaxed">
                           Fijn dat je er bent. We hebben een nieuw portaal voor je klaarstaan om je werk bij Sanadome makkelijker en leuker te maken.
                       </p>
                       <p className="text-slate-500 font-medium">
                           Laten we in een paar stappen je account instellen.
                       </p>
                       <div className="pt-8">
                           <button onClick={handleNext} className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-3">
                               Start setup <ArrowRight size={20} />
                           </button>
                       </div>
                   </div>
               )}

               {step === 1 && (
                   <div className="space-y-8">
                       <h2 className="text-3xl font-bold text-slate-900">Wat kun je verwachten?</h2>
                       <div className="space-y-4">
                           <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                               <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><UserCheck size={20} /></div>
                               <div>
                                   <h3 className="font-bold text-slate-900">Personeelsdossier</h3>
                                   <p className="text-sm text-slate-600">Beheer je documenten, loonstroken en contracten op één plek.</p>
                               </div>
                           </div>
                           <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                               <div className="bg-green-100 text-green-600 p-2 rounded-lg"><Smartphone size={20} /></div>
                               <div>
                                   <h3 className="font-bold text-slate-900">Verlof & Verzuim</h3>
                                   <p className="text-sm text-slate-600">Vraag eenvoudig vakantie aan en zie direct je saldo.</p>
                               </div>
                           </div>
                           <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                               <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><ShieldCheck size={20} /></div>
                               <div>
                                   <h3 className="font-bold text-slate-900">Onboarding</h3>
                                   <p className="text-sm text-slate-600">Volg je voortgang en taken tijdens je inwerkperiode.</p>
                               </div>
                           </div>
                       </div>
                       <button onClick={handleNext} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                           Volgende stap
                       </button>
                   </div>
               )}

               {step === 2 && (
                   <div className="space-y-8">
                       <h2 className="text-3xl font-bold text-slate-900">Profiel personaliseren</h2>
                       
                       <div className="flex justify-center">
                           <div className="relative group">
                               <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md">
                                   <img src={formData.avatar || employee.avatar} alt="Profile" className="w-full h-full object-cover" />
                               </div>
                               <button 
                                   onClick={() => fileInputRef.current?.click()}
                                   className="absolute bottom-0 right-0 p-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                               >
                                   <Camera size={18} />
                               </button>
                               <input 
                                   type="file" 
                                   ref={fileInputRef} 
                                   accept="image/*" 
                                   className="hidden" 
                                   onChange={handleImageUpload}
                               />
                           </div>
                       </div>

                       <div className="space-y-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefoonnummer</label>
                               <input 
                                   type="tel" 
                                   value={formData.phone}
                                   onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                   className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                   placeholder="+31 6 12345678"
                               />
                           </div>
                       </div>

                       <button onClick={handleNext} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                           Opslaan & Doorgaan
                       </button>
                   </div>
               )}

               {step === 3 && (
                   <div className="space-y-8">
                       <h2 className="text-3xl font-bold text-slate-900">Account Beveiligen</h2>
                       <p className="text-slate-600">Stel een nieuw wachtwoord in om je account te beveiligen.</p>

                       <div className="space-y-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nieuw Wachtwoord</label>
                               <div className="relative">
                                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                   <input 
                                       type="password" 
                                       value={formData.password}
                                       onChange={(e) => setFormData({...formData, password: e.target.value})}
                                       className="w-full p-4 pl-12 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
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
                                       value={formData.confirmPassword}
                                       onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                       className="w-full p-4 pl-12 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                       placeholder="••••••••"
                                   />
                               </div>
                           </div>
                       </div>

                       <div className="pt-4">
                           <button onClick={handleNext} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                               Instellen & Verder
                           </button>
                           <button onClick={handleNext} className="w-full py-4 mt-2 text-slate-400 text-sm font-bold hover:text-slate-600">
                               Overslaan (Later instellen)
                           </button>
                       </div>
                   </div>
               )}

               {step === 4 && (
                   <div className="text-center space-y-8">
                       <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                           <Check size={48} strokeWidth={3} />
                       </div>
                       <h2 className="text-4xl font-bold text-slate-900">Je bent er helemaal klaar voor!</h2>
                       <p className="text-lg text-slate-600 max-w-md mx-auto">
                           Je account is succesvol ingesteld. Klik hieronder om naar je persoonlijke dashboard te gaan.
                       </p>
                       <div className="pt-8">
                           <button 
                               onClick={handleComplete}
                               className="px-10 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center gap-2 mx-auto"
                           >
                               Naar Dashboard <ChevronRight size={20} />
                           </button>
                       </div>
                   </div>
               )}

           </div>
       </div>
    </div>
  );
};

export default WelcomeFlow;