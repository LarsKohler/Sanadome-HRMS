
import React from 'react';
import { 
    LayoutDashboard, BookOpen, Trophy, PenTool, 
    LogOut, ChevronRight, GraduationCap, Users, BarChart3, Settings
} from 'lucide-react';
import { Employee } from '../types';
import { hasPermission } from '../utils/permissions';

interface AcademySidebarProps {
    activeView: string;
    onChangeView: (view: any) => void;
    onExit: () => void;
    currentUser: Employee;
}

const AcademySidebar: React.FC<AcademySidebarProps> = ({ activeView, onChangeView, onExit, currentUser }) => {
    const isManager = hasPermission(currentUser, 'MANAGE_ACADEMY') || currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

    const learnerItems = [
        { id: 'dashboard', label: 'Mijn Dashboard', icon: LayoutDashboard },
        { id: 'catalog', label: 'Catalogus', icon: BookOpen },
        { id: 'certificates', label: 'Mijn Certificaten', icon: Trophy },
    ];

    const adminItems = [
        { id: 'manage-courses', label: 'Cursus Beheer', icon: PenTool },
        { id: 'manage-students', label: 'Studenten & Voortgang', icon: Users },
        { id: 'manage-analytics', label: 'Rapportages', icon: BarChart3 },
    ];

    return (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 transition-all duration-300 shadow-sm z-20">
            {/* BRANDING */}
            <div className="h-20 flex items-center px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <h1 className="font-serif text-xl font-bold tracking-tight leading-none text-slate-900">
                            Sana<span className="text-indigo-600">Learn</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Academy</p>
                    </div>
                </div>
            </div>

            {/* NAVIGATION */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
                
                {/* Learner Section */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Student</h3>
                    <nav className="space-y-1">
                        {learnerItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onChangeView(item.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all group ${
                                    activeView === item.id 
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={activeView === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                                    <span>{item.label}</span>
                                </div>
                                {activeView === item.id && <ChevronRight size={14} className="text-indigo-400"/>}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Admin Section */}
                {isManager && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Beheer Portaal</h3>
                        <nav className="space-y-1">
                            {adminItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onChangeView(item.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all group ${
                                        activeView === item.id 
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className={activeView === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                                        <span>{item.label}</span>
                                    </div>
                                    {activeView === item.id && <ChevronRight size={14} className="text-indigo-400"/>}
                                </button>
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* USER PROFILE & EXIT */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <img src={currentUser.avatar} className="w-9 h-9 rounded-full object-cover border border-slate-200" alt="User" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
                        <div className="text-xs text-slate-500 truncate">{currentUser.role}</div>
                    </div>
                </div>

                <button 
                    onClick={onExit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl transition-colors text-sm font-bold shadow-sm"
                >
                    <LogOut size={16} />
                    <span>Terug naar Sanadome</span>
                </button>
            </div>
        </aside>
    );
};

export default AcademySidebar;
