
import React from 'react';
import { 
    LayoutDashboard, BookOpen, Trophy, PenTool, 
    LogOut, ChevronRight, GraduationCap
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
    const isManager = hasPermission(currentUser, 'MANAGE_ACADEMY');

    const menuItems = [
        { id: 'dashboard', label: 'Mijn Dashboard', icon: LayoutDashboard },
        { id: 'catalog', label: 'Catalogus', icon: BookOpen },
        { id: 'certificates', label: 'Certificaten', icon: Trophy },
    ];

    if (isManager) {
        menuItems.push({ id: 'builder', label: 'Cursus Beheer', icon: PenTool });
    }

    return (
        <aside className="w-64 bg-indigo-950 text-white flex flex-col h-full border-r border-indigo-900/50 flex-shrink-0 transition-all duration-300">
            {/* BRANDING */}
            <div className="h-20 flex items-center px-6 border-b border-indigo-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
                        <GraduationCap size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-serif text-xl font-bold tracking-tight leading-none text-white">
                            Sana<span className="text-indigo-400">Learn</span>
                        </h1>
                        <p className="text-[10px] text-indigo-300 font-medium uppercase tracking-widest mt-0.5">Academy</p>
                    </div>
                </div>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onChangeView(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all group ${
                            activeView === item.id 
                            ? 'bg-white text-indigo-950 shadow-md' 
                            : 'text-indigo-200 hover:bg-indigo-900/50 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon size={18} className={activeView === item.id ? 'text-indigo-600' : 'text-indigo-400 group-hover:text-white'} />
                            <span>{item.label}</span>
                        </div>
                        {activeView === item.id && <ChevronRight size={14} className="text-indigo-950"/>}
                    </button>
                ))}
            </nav>

            {/* FOOTER / EXIT */}
            <div className="p-4 border-t border-indigo-900/50 bg-indigo-900/20">
                <button 
                    onClick={onExit}
                    className="w-full flex items-center gap-3 px-4 py-3 text-indigo-200 hover:text-white hover:bg-indigo-900/50 rounded-xl transition-colors text-sm font-bold"
                >
                    <LogOut size={18} />
                    <span>Terug naar Sanadome</span>
                </button>
            </div>
        </aside>
    );
};

export default AcademySidebar;
