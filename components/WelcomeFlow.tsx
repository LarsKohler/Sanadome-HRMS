import React, { useState } from 'react';
import { ChevronRight, Check, ArrowRight, UserCheck, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { Employee } from '../types';

interface WelcomeFlowProps {
  employee: Employee;
  onComplete: (updatedEmployee: Employee) => void;
}

const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ employee, onComplete }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

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
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col font-sans overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-600 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-lg">
                
                {/* Stepper Dots */}
                <div className="flex justify-center gap-3 mb-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-teal-500' : 'w-2 bg-slate-700'}`}></div>
                    ))}
                </div>

                {/* Content Container */}
                <div className="min-h-[400px]">
                    
                    {/* STEP 1: WELCOME */}
                    {step === 1 && (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-xl">
                                <Sparkles className="text-teal-400" size={32} />
                            </div>
                            <h1 className="text-4xl font-serif font-bold tracking-tight">Welkom, {employee.name.split(' ')[0]}</h1>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                Je bent uitgenodigd voor het nieuwe medewerkersportaal van Sanadome. 
                                Hier beheer je je verlof, bekijk je je dossier en blijf je op de hoogte.
                            </p>
                        </div>
                    )}

                    {/* STEP 2: SECURITY */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                    <ShieldCheck className="text-teal-400" size={28} />
                                </div>
                                <h2 className="text-2xl font-bold">Beveilig je account</h2>
                                <p className="text-slate-400 text-sm mt-2">Stel een veilig wachtwoord in voor je eerste toegang.</p>
                            </div>

                            <div className="space-y-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nieuw Wachtwoord</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bevestig Wachtwoord</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                {error && (
                                    <div className="text-red-400 text-xs font-bold bg-red-900/20 p-2 rounded flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: READY */}
                    {step === 3 && (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                             <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <UserCheck size={40} />
                            </div>
                            <h2 className="text-3xl font-bold">Je bent er klaar voor!</h2>
                            <p className="text-slate-400">
                                Je profiel is geactiveerd. We hebben alvast wat basisgegevens voor je ingevuld.
                                Kijk gerust rond.
                            </p>
                            
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-left max-w-xs mx-auto mt-8">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={employee.avatar} className="w-10 h-10 rounded-full" alt="Avatar"/>
                                    <div>
                                        <div className="font-bold text-white text-sm">{employee.name}</div>
                                        <div className="text-xs text-slate-500">{employee.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-teal-400 font-bold bg-teal-900/30 p-2 rounded-lg">
                                    <Check size={12} /> Account Actief
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="mt-12 flex justify-end">
                    {step < 3 ? (
                        <button 
                            onClick={handleNext}
                            className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-teal-50 transition-all shadow-lg hover:shadow-teal-900/20 hover:-translate-y-1"
                        >
                            Volgende
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => {
                                // Add password to employee object before completing
                                const updated = { ...employee, password: password || employee.password };
                                onComplete(updated);
                            }}
                            className="group flex items-center gap-3 px-10 py-4 bg-teal-500 text-white rounded-2xl font-bold hover:bg-teal-400 transition-all shadow-lg hover:shadow-teal-900/40 hover:-translate-y-1"
                        >
                            Naar Dashboard
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>

            </div>
        </div>
    </div>
  );
};

export default WelcomeFlow;