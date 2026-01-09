
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, ArrowRight, ShieldCheck, Key } from 'lucide-react';
import { Employee } from '../types';
import { api } from '../utils/api';

interface PasswordResetFlowProps {
  employeeId: string;
  onComplete: () => void;
}

const PasswordResetFlow: React.FC<PasswordResetFlowProps> = ({ employeeId, onComplete }) => {
  const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
        // Fetch fresh employee data to make sure we exist
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      
      {/* Background Visuals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-teal-600/20 blur-[120px] rounded-full"></div>
          <div className="absolute top-1/2 right-0 w-2/3 h-2/3 bg-purple-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Header Graphic */}
        <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
             <div className="relative z-10 w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                 <Key className="text-teal-400" size={32} />
             </div>
        </div>

        <div className="p-8">
            
            {step === 'verify' && (
                <div className="text-center space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Wachtwoord Herstellen</h2>
                    <p className="text-slate-500 text-sm">
                        Je staat op het punt om een nieuw wachtwoord in te stellen voor je Sanadome account.
                    </p>
                    <button 
                        onClick={() => setStep('reset')}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        Starten <ArrowRight size={18} />
                    </button>
                </div>
            )}

            {step === 'reset' && (
                <form onSubmit={handleReset} className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900">Nieuw Wachtwoord</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Nieuw wachtwoord"
                                autoFocus
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Bevestig wachtwoord"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                            <ShieldAlert size={14}/> {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
                    >
                        {isLoading ? 'Opslaan...' : 'Wachtwoord Opslaan'}
                    </button>
                </form>
            )}

            {step === 'success' && (
                <div className="text-center space-y-6 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Check size={40} strokeWidth={4} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Gelukt!</h2>
                        <p className="text-slate-500 text-sm mt-2">Je wachtwoord is aangepast. Je kunt nu inloggen.</p>
                    </div>
                    <button 
                        onClick={onComplete}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                    >
                        Naar Inloggen
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

// Helper icon
const ShieldAlert = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default PasswordResetFlow;
