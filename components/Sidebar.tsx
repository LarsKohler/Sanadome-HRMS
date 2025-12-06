
import React, { useState, useEffect } from 'react';
import { 
  Home, User, CheckSquare, Users, Calendar, 
  UserPlus, Trophy, FileText, PieChart, 
  Settings, ChevronLeft, FileBarChart, Newspaper, UserCheck, ClipboardList, X, ClipboardCheck, Activity, Shield, Euro, Medal, BookOpen, Truck, ChevronDown, ChevronRight, Bike
} from 'lucide-react';
import { ViewState, Employee, Permission } from '../types';
import { hasPermission } from '../utils/permissions';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  user?: Employee; 
  isOpen: boolean;
  onClose: () => void;
  systemVersion?: string;
}

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  id: string | ViewState;
  badge?: number | string;
  permission?: Permission;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, isOpen, onClose, systemVersion = 'v1.0' }) => {
  
  // Sections configuration
  const sections: SidebarSection[] = [
    {
      label: 'Algemeen',
      items: [
        { icon: User, label: 'Mijn Profiel', id: ViewState.HOME },
        { icon: Newspaper, label: 'Nieuws', id: ViewState.NEWS },
        { icon: BookOpen, label: 'Kennisbank', id: ViewState.KNOWLEDGE_BASE },
        { icon: CheckSquare, label: 'Taken', id: 'tasks', badge: 2 },
        { icon: Users, label: 'Collega\'s', id: ViewState.DIRECTORY },
        { icon: Calendar, label: 'Kalender', id: 'calendar', permission: 'VIEW_CALENDAR' },
      ]
    },
    {
      label: 'Receptie Tools',
      items: [
        { icon: Bike, label: 'Fietsverhuur', id: ViewState.BIKE_RENTAL, permission: 'MANAGE_RENTALS' },
      ]
    },
    {
      label: 'HR & Team',
      items: [
        { icon: UserCheck, label: 'Onboarding', id: ViewState.ONBOARDING },
        { icon: ClipboardList, label: 'Surveys', id: ViewState.SURVEYS },
        { icon: ClipboardCheck, label: 'Performance', id: ViewState.EVALUATIONS, permission: 'MANAGE_EVALUATIONS' },
        { icon: UserPlus, label: 'Recruitment', id: ViewState.RECRUITMENT, permission: 'MANAGE_RECRUITMENT' },
        { icon: Medal, label: 'Badges', id: ViewState.BADGES, permission: 'MANAGE_BADGES' },
        { icon: Calendar, label: 'Aanwezigheid', id: 'attendance', permission: 'MANAGE_ATTENDANCE' },
        { icon: FileText, label: 'Documenten', id: ViewState.DOCUMENTS }, 
      ]
    },
    {
      label: 'Management Tools',
      items: [
        { icon: Euro, label: 'Debiteuren', id: ViewState.DEBT_CONTROL, permission: 'MANAGE_DEBTORS' },
        { icon: Truck, label: 'Linnen Audit', id: ViewState.LINEN_AUDIT, permission: 'MANAGE_OPERATIONS' },
        { icon: FileBarChart, label: 'Cases', id: 'cases', permission: 'MANAGE_CASES' },
        { icon: PieChart, label: 'Rapportages', id: ViewState.REPORTS, permission: 'VIEW_REPORTS' },
      ]
    },
    {
      label: 'Systeem',
      items: [
        { icon: Activity, label: 'Systeemstatus', id: ViewState.SYSTEM_STATUS, permission: 'VIEW_SYSTEM_STATUS' },
        { icon: Shield, label: 'Instellingen', id: ViewState.SETTINGS, permission: 'MANAGE_SETTINGS' },
      ]
    }
  ];

  // Initialize expanded sections: Open by default to ensure visibility
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      'Algemeen': true,
      'Receptie Tools': true,
      'HR & Team': true,
      'Management Tools': true, 
      'Systeem': false
  });

  // Auto-expand the section containing the current view
  useEffect(() => {
      for (const section of sections) {
          if (section.items.some(item => item.id === currentView)) {
              setExpandedSections(prev => ({
                  ...prev,
                  [section.label]: true
              }));
              break;
          }
      }
  }, [currentView]);

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 print:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-0
          h-full lg:h-screen w-72 
          bg-white border-r border-slate-200 
          transform transition-transform duration-300 ease-in-out
          flex flex-col print:hidden
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

          {/* Logo in Sidebar */}
          <div className="flex items-center gap-2 px-2 mb-8">
              <div className="text-teal-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
              </div>
              <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                    Mijn<span className="text-teal-600">Sanadome</span>
                  </h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Medewerkers</p>
              </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-6">
            {sections.map((section) => {
              // Check if section has any visible items based on permissions
              const hasVisibleItems = section.items.some(item => !item.permission || hasPermission(user, item.permission));
              
              if (!hasVisibleItems) return null;

              return (
                <div key={section.label}>
                  <button 
                    onClick={() => toggleSection(section.label)}
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 hover:text-slate-600 transition-colors"
                  >
                    {section.label}
                    {expandedSections[section.label] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  
                  {expandedSections[section.label] && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {section.items.map((item) => {
                        // Permission Check
                        if (item.permission && !hasPermission(user, item.permission)) {
                            return null;
                        }

                        const isActive = currentView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                                if (typeof item.id === 'string' && !Object.values(ViewState).includes(item.id as any)) {
                                    onChangeView(item.id as any); // fallback
                                } else {
                                    onChangeView(item.id as ViewState);
                                }
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className={`
                              w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group
                              ${isActive 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon size={20} className={isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-600'} />
                              <span className="font-bold text-sm">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer / Version */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400">
                <span>Versie {systemVersion}</span>
                <span>© {new Date().getFullYear()}</span>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
