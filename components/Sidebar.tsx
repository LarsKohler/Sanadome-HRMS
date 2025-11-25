

import React from 'react';
import { 
  Home, User, CheckSquare, Users, Calendar, 
  UserPlus, Trophy, FileText, PieChart, 
  Settings, ChevronLeft, FileBarChart, Newspaper, UserCheck, ClipboardList, X, ClipboardCheck, Activity, Shield, Euro
} from 'lucide-react';
import { ViewState, Employee } from '../types';
import { hasPermission } from '../utils/permissions';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  user?: Employee; // Changed from userRole to user object for permission check
  isOpen: boolean;
  onClose: () => void;
  systemVersion?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, isOpen, onClose, systemVersion = 'v1.0' }) => {
  // Define all items
  const allItems = [
    { icon: User, label: 'Mijn Profiel', id: ViewState.HOME },
    { icon: Newspaper, label: 'Nieuws', id: ViewState.NEWS }, 
    { icon: UserCheck, label: 'Onboarding', id: ViewState.ONBOARDING },
    { icon: ClipboardList, label: 'Surveys', id: ViewState.SURVEYS },
    { icon: ClipboardCheck, label: 'Evaluaties', id: ViewState.EVALUATIONS }, 
    { icon: CheckSquare, label: 'Taken', id: 'tasks', badge: 2 },
    { icon: Users, label: 'Collega\'s', id: ViewState.DIRECTORY },
    { icon: Calendar, label: 'Kalender', id: 'calendar' },
    { icon: UserPlus, label: 'Recruitment', id: 'recruitment' },
    { icon: Trophy, label: 'Performance', id: 'performance' },
    { icon: Calendar, label: 'Aanwezigheid', id: 'attendance' },
    { icon: FileText, label: 'Documenten', id: ViewState.DOCUMENTS }, 
    { icon: Euro, label: 'Debiteuren', id: ViewState.DEBT_CONTROL, permission: 'MANAGE_DEBTORS' },
    { icon: FileBarChart, label: 'Cases', id: 'cases' },
    { icon: PieChart, label: 'Rapportages', id: ViewState.REPORTS, permission: 'VIEW_REPORTS' },
    { icon: Activity, label: 'Systeemstatus', id: ViewState.SYSTEM_STATUS, permission: 'VIEW_SYSTEM_STATUS' },
    { icon: Shield, label: 'Instellingen', id: ViewState.SETTINGS, permission: 'MANAGE_SETTINGS' },
  ];

  // Filter items based on permissions
  const menuItems = allItems.filter(item => {
    if (item.permission) {
        // Explicit permission check
        return hasPermission(user || null, item.permission as any);
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed lg:sticky top-0 lg:top-20 left-0 z-50 lg:z-0
          h-full lg:h-[calc(100vh-80px)] w-72 
          bg-white border-r border-slate-200 
          transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="py-6 px-4 flex-1 overflow-y-auto no-scrollbar">
          
          {/* Mobile Close Button */}
          <div className="flex justify-end lg:hidden mb-4">
             <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
               <X size={24} />
             </button>
          </div>

          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              const isClickable = Object.values(ViewState).includes(item.id as ViewState);

              return (
                <li key={item.label}>
                  <button
                    onClick={() => {
                      if (isClickable) {
                        onChangeView(item.id as ViewState);
                        onClose(); // Close menu on selection for mobile
                      }
                    }}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'text-teal-900 bg-teal-50 border border-teal-100 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <item.icon size={20} className={`mr-3 transition-colors ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={isActive ? 'font-bold' : ''}>{item.label}</span>
                    {item.badge && (
                      <span className={`ml-auto py-0.5 px-2 rounded-md text-[10px] font-bold ${isActive ? 'bg-teal-200/50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          
          <div className="mt-8 pt-6 border-t border-slate-100 px-2 space-y-1">
             {/* Regular Settings link if needed, or merge with Permission settings */}
             <button className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
               <Settings size={20} className="mr-3 text-slate-400" />
               Voorkeuren
             </button>
             <button className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
               <ChevronLeft size={20} className="mr-3 text-slate-400" />
               Inklappen
             </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 text-center bg-slate-50/30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                &copy; {new Date().getFullYear()} MijnSanadome
            </p>
            <p className="text-[10px] font-mono text-slate-300 mt-1">
                {systemVersion}
            </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;