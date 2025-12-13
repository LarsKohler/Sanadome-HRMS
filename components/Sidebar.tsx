
import React, { useState, useEffect } from 'react';
import { 
  Home, User, CheckSquare, Users, Calendar, 
  UserPlus, FileText, PieChart, 
  Settings, ChevronLeft, FileBarChart, Newspaper, UserCheck, ClipboardList, X, ClipboardCheck, Activity, Shield, Euro, Medal, BookOpen, Truck, ChevronDown, ChevronRight, Bike, GraduationCap, Scale, ListTodo
} from 'lucide-react';
import { ViewState, Employee, Permission, GlobalSettings } from '../types';
import { hasPermission, isModuleEnabled } from '../utils/permissions';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  user?: Employee; 
  isOpen: boolean;
  onClose: () => void;
  systemVersion?: string;
  globalSettings: GlobalSettings | null; // NEW PROP
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

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, isOpen, onClose, systemVersion = 'v1.0', globalSettings }) => {
  
  // Sections configuration
  const sections: SidebarSection[] = [
    {
      label: 'Algemeen',
      items: [
        { icon: User, label: 'Mijn Profiel', id: ViewState.HOME },
        { icon: Newspaper, label: 'Nieuws', id: ViewState.NEWS },
        { icon: GraduationCap, label: 'Academy', id: ViewState.ACADEMY },
        { icon: BookOpen, label: 'Kennisbank', id: ViewState.KNOWLEDGE_BASE },
        { icon: Users, label: 'Collega\'s', id: ViewState.DIRECTORY },
      ]
    },
    {
      label: 'Receptie Tools',
      items: [
        { icon: ListTodo, label: 'Checklists', id: ViewState.CHECKLISTS }, 
        { icon: Bike, label: 'Fietsverhuur', id: ViewState.BIKE_RENTAL, permission: 'MANAGE_RENTALS' },
        { icon: Scale, label: 'Compensatie', id: ViewState.COMPENSATION }, 
      ]
    },
    {
      label: 'HR & Team',
      items: [
        { icon: UserCheck, label: 'Onboarding', id: ViewState.ONBOARDING },
        { icon: ClipboardCheck, label: 'Performance', id: ViewState.EVALUATIONS, permission: 'MANAGE_EVALUATIONS' },
        { icon: UserPlus, label: 'Recruitment', id: ViewState.RECRUITMENT, permission: 'MANAGE_RECRUITMENT' },
        { icon: FileText, label: 'Documenten', id: ViewState.DOCUMENTS }, 
      ]
    },
    {
      label: 'Management Tools',
      items: [
        { icon: Euro, label: 'Debiteuren', id: ViewState.DEBT_CONTROL, permission: 'MANAGE_DEBTORS' },
        { icon: Truck, label: 'Linnen Audit', id: ViewState.LINEN_AUDIT, permission: 'MANAGE_OPERATIONS' },
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

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Effect to automatically expand the section containing the current view
  useEffect(() => {
      const newExpanded: Record<string, boolean> = {};
      
      sections.forEach(section => {
          const containsActive = section.items.some(item => item.id === currentView);
          if (containsActive) {
              newExpanded[section.label] = true;
          }
      });

      setExpandedSections(prev => ({ ...prev, ...newExpanded }));
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
          flex flex-col print:hidden shadow-xl lg:shadow-none
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
          <div className="flex items-center gap-2 px-2 mb-10">
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
          <nav className="space-y-4">
            {sections.map((section) => {
              // 1. Check Permissions
              // 2. Check Global Module Settings (Deactivation)
              const visibleItems = section.items.filter(item => {
                  const hasPerm = !item.permission || hasPermission(user, item.permission);
                  // Check if module is enabled globally for this user
                  let moduleEnabled = true;
                  if (Object.values(ViewState).includes(item.id as ViewState)) {
                      moduleEnabled = isModuleEnabled(item.id as ViewState, user || null, globalSettings);
                  }
                  return hasPerm && moduleEnabled;
              });
              
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedSections[section.label];

              return (
                <div key={section.label} className="select-none">
                  <button 
                    onClick={() => toggleSection(section.label)}
                    className={`flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider mb-2 px-3 py-2 rounded-lg transition-colors ${isExpanded ? 'text-slate-800 bg-slate-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    {section.label}
                    <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      {visibleItems.map((item) => {
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
                              w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ml-1
                              ${isActive 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-600'} />
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
