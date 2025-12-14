
import React, { useState, useMemo } from 'react';
import { 
    FolderOpen, Search, Filter, AlertTriangle, Thermometer, Clock, 
    ChevronRight, CheckCircle2, User, X
} from 'lucide-react';
import { Employee, DossierEntry } from '../types';
import { Modal } from './Modal';
import EmployeeProfile from './EmployeeProfile';

interface HRDossierPageProps {
    employees: Employee[];
    currentUser: Employee;
    onUpdateEmployee: (employee: Employee) => void;
    onShowToast: (message: string) => void;
}

const HRDossierPage: React.FC<HRDossierPageProps> = ({ employees, currentUser, onUpdateEmployee, onShowToast }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Sick' | 'Warnings'>('All');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    // --- AGGREGATED STATS ---
    const stats = useMemo(() => {
        let sickCount = 0;
        let warningCount = 0;
        let latesThisMonth = 0;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        employees.forEach(emp => {
            const dossier = emp.dossier || [];
            
            // Check active sick
            const isSick = dossier.some(e => e.type === 'Sick' && !e.endDate);
            if (isSick) sickCount++;

            // Count warnings (Total)
            warningCount += dossier.filter(e => e.type === 'Warning').length;

            // Count lates (This month)
            latesThisMonth += dossier.filter(e => {
                if (e.type !== 'Late') return false;
                const d = new Date(e.date.split('-').reverse().join('-')); // approx parsing
                return d >= firstDayOfMonth;
            }).length;
        });

        return { sickCount, warningCount, latesThisMonth };
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                emp.role.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            const dossier = emp.dossier || [];
            const isSick = dossier.some(e => e.type === 'Sick' && !e.endDate);
            const hasWarnings = dossier.some(e => e.type === 'Warning');

            if (filterStatus === 'Sick') return isSick;
            if (filterStatus === 'Warnings') return hasWarnings;

            return true;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [employees, searchTerm, filterStatus]);

    // Handle opening detail view
    const handleViewDetail = (empId: string) => {
        setSelectedEmployeeId(empId);
    };

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

    // Render the detail view as a Modal wrapper around the EmployeeProfile (forced to Dossier tab context conceptually, though we reuse the component)
    // Actually, EmployeeProfile handles its own tabs. We can pass a prop to default to a tab if we wanted, but sticking to standard behavior is fine.
    
    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <FolderOpen className="text-teal-600" size={32} />
                        HR Dossiers
                    </h1>
                    <p className="text-slate-500 mt-1">Centraal overzicht van verzuim en functioneren.</p>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                        <Thermometer size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Huidig Verzuim</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.sickCount} Medewerkers</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Te Laat (Deze Maand)</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.latesThisMonth} Meldingen</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-slate-100 text-slate-600 rounded-xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waarschuwingen (Totaal)</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.warningCount} Dossiers</div>
                    </div>
                </div>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Zoek op naam of rol..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button 
                        onClick={() => setFilterStatus('All')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'All' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Alle Dossiers
                    </button>
                    <button 
                        onClick={() => setFilterStatus('Sick')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'Sick' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Nu Ziek ({stats.sickCount})
                    </button>
                    <button 
                        onClick={() => setFilterStatus('Warnings')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'Warnings' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Met Waarschuwing
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Medewerker</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Dossier Highlights</th>
                            <th className="px-6 py-4 text-right">Actie</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map(emp => {
                            const dossier = emp.dossier || [];
                            const isSick = dossier.some(e => e.type === 'Sick' && !e.endDate);
                            const recentWarning = dossier.find(e => e.type === 'Warning'); // Just take one for highlight
                            
                            return (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleViewDetail(emp.id)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={emp.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-200" alt="Avatar"/>
                                            <div>
                                                <div className="font-bold text-slate-900">{emp.name}</div>
                                                <div className="text-xs text-slate-500">{emp.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isSick ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                <Thermometer size={12}/> Ziek
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                <CheckCircle2 size={12}/> Actief
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {dossier.length === 0 && <span className="text-slate-400 text-sm italic">Geen items</span>}
                                            
                                            {/* Indicators */}
                                            {recentWarning && (
                                                <div className="text-xs flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                    <AlertTriangle size={12} className="text-amber-500"/> Waarschuwing ({recentWarning.date})
                                                </div>
                                            )}
                                            {dossier.filter(e => e.type === 'Late').length > 0 && (
                                                <div className="text-xs flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                    <Clock size={12} className="text-slate-500"/> {dossier.filter(e => e.type === 'Late').length}x Te laat
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-teal-600 transition-colors">
                                            <ChevronRight size={20}/>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredEmployees.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Geen medewerkers gevonden.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* DETAIL MODAL (Reusing Employee Profile Component for consistency) */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEmployeeId(null)}></div>
                    <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            <EmployeeProfile 
                                employee={selectedEmployee}
                                currentUser={currentUser}
                                onUpdateEmployee={onUpdateEmployee}
                                onShowToast={onShowToast}
                                onChangeView={() => {}} // No-op for navigation inside modal
                                onNext={() => {}} 
                                onPrevious={() => {}}
                                managers={[]}
                                onBack={() => setSelectedEmployeeId(null)}
                            />
                        </div>
                        <button 
                            onClick={() => setSelectedEmployeeId(null)}
                            className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 backdrop-blur-md transition-all shadow-sm z-50"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default HRDossierPage;
