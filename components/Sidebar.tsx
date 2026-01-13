
import React, { useState, useEffect } from 'react';
import { 
  Home, User, CheckSquare, Users, Calendar, 
  UserPlus, FileText, PieChart, 
  Settings, ChevronLeft, FileBarChart, Newspaper, UserCheck, ClipboardList, X, ClipboardCheck, Activity, Shield, Euro, Medal, BookOpen, Truck, ChevronDown, ChevronRight, GraduationCap, Scale, ListTodo, FolderOpen, LogOut, MessageCircleWarning, ScanEye, Package, ShieldCheck
} from 'lucide-react';
import { ViewState, Employee, Permission, GlobalSettings } from '../types';
import { hasPermission, isModuleEnabled } from '../utils/permissions';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  id: ViewState;
  permission?: Permission;
  badge?: string;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  user?: Employee; 
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void; 
  systemVersion?: string;
  globalSettings: GlobalSettings | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, isOpen, onClose, onLogout, systemVersion = 'v1.0', globalSettings }) => {
  
  // Sections configuration
  const sections: SidebarSection[] = [
    {
      label: 'Algemeen',
      items: [
        { icon: User, label: 'Mijn Profiel', id: ViewState.HOME },
        { icon: Newspaper, label: 'Nieuws', id: ViewState.NEWS, permission: 'VIEW_NEWS' },
        { icon: GraduationCap, label: 'Academy', id: ViewState.ACADEMY, permission: 'VIEW_ACADEMY' },
        { icon: BookOpen, label: 'Kennisbank', id: ViewState.KNOWLEDGE_BASE, permission: 'VIEW_KNOWLEDGE_BASE' },
        { icon: Users, label: 'Collega\'s', id: ViewState.DIRECTORY, permission: 'VIEW_DIRECTORY' },
      ]
    },
    {
      label: 'Receptie Tools',
      items: [
        { icon: ListTodo, label: 'Checklists', id: ViewState.CHECKLISTS, permission: 'VIEW_CHECKLISTS' }, 
        { icon: Scale, label: 'Compensatie', id: ViewState.COMPENSATION, permission: 'VIEW_COMPENSATION' }, 
        { icon: Package, label: 'Voorraad', id: ViewState.STOCK_CONTROL, permission: 'MANAGE_STOCK' }, 
      ]
    },
    {
      label: 'HR & Team',
      items: [
        { icon: FolderOpen, label: 'HR Dossier', id: ViewState.HR_DOSSIER, permission: 'MANAGE_EMPLOYEES' },
        { icon: UserCheck, label: 'Onboarding', id: ViewState.ONBOARDING, permission: 'VIEW_ONBOARDING' },
        { icon: ClipboardCheck, label: 'Performance', id: ViewState.EVALUATIONS, permission: 'MANAGE_EVALUATIONS' },
        { icon: UserPlus, label: 'Recruitment', id: ViewState.RECRUITMENT, permission: 'MANAGE_RECRUITMENT' },
      ]
    },
    {
      label: 'Management Tools',
      items: [
        { icon: CheckSquare, label: 'Takenlijst', id: ViewState.TODO_LIST, permission: 'VIEW_TASKS' },
        { icon: MessageCircleWarning, label: 'Klachten', id: ViewState.COMPLAINTS, permission: 'MANAGE_COMPLAINTS' },
        { icon: Euro, label: 'Debiteuren', id: ViewState.DEBT_CONTROL, permission: 'MANAGE_DEBTORS' },
        { icon: ScanEye, label: 'Data Audit', id: ViewState.DATA_AUDIT, permission: 'VIEW_REPORTS' }, 
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

  // State for expanded section (String instead of Object to enforce single open section)
  // Default to 'Algemeen'
  const [expandedSection, setExpandedSection] = useState<string>('Algemeen');

  // Effect to automatically expand the section containing the current view
  useEffect(() => {
      const foundSection = sections.find(section => 
          section.items.some(item => item.id === currentView)
      );

      if (foundSection) {
          setExpandedSection(foundSection.label);
      }
  }, [currentView]);

  const toggleSection = (label: string) => {
    // If clicking the already open section, close it (optional, or keep it open). 
    // Here we allow toggling closed, or switching to another.
    setExpandedSection(prev => prev === label ? '' : label);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 print:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-0
          h-full lg:h-screen w-[280px] 
          bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800
          transform transition-transform duration-300 ease-in-out
          flex flex-col print:hidden shadow-2xl lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* HEADER / LOGO */}
        <div className="h-20 flex items-center px-6 border-b border-slate-50 dark:border-slate-800 flex-shrink-0">
             <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                   <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                     Mijn<span className="text-indigo-600">Sanadome</span>
                   </h1>
                </div>
                <div className="ml-auto lg:hidden">
                    <button onClick={onClose} className="text-slate-400">
                        <X size={20}/>
                    </button>
                </div>
             </div>
        </div>

        {/* SCROLLABLE NAVIGATION */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
            {sections.map((section) => {
              const visibleItems = section.items.filter(item => {
                  const hasPerm = !item.permission || hasPermission(user || null, item.permission, globalSettings?.roles);
                  let moduleEnabled = true;
                  if (Object.values(ViewState).includes(item.id as ViewState)) {
                      moduleEnabled = isModuleEnabled(item.id as ViewState, user || null, globalSettings);
                  }
                  return hasPerm && moduleEnabled;
              });
              
              if (visibleItems.length === 0) return null;
              
              // Check if THIS section is the one expanded
              const isExpanded = expandedSection === section.label;

              return (
                <div key={section.label}>
                  <button 
                    onClick={() => toggleSection(section.label)}
                    className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider mb-2 px-3 py-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {section.label}
                    <ChevronRight size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      {visibleItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                                if (typeof item.id === 'string' && !Object.values(ViewState).includes(item.id as any)) {
                                    onChangeView(item.id as any);
                                } else {
                                    onChangeView(item.id as ViewState);
                                }
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className={`
                              w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                              ${isActive 
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' 
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              {/* Icon Container for alignment */}
                              <div className={`
                                w-6 h-6 flex items-center justify-center transition-colors
                                ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 group-hover:text-slate-600'}
                              `}>
                                 <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                              </div>
                              <span className="text-sm">{item.label}</span>
                            </div>
                            
                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-indigo-600 rounded-r-full"></div>
                            )}

                            {item.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
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
        </div>

        {/* FOOTER USER CARD */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
             <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                 <div className="flex items-center gap-3 mb-3">
                     <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                         {user?.avatar ? (
                             <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="User"/>
                         ) : (
                             <span>{user?.name?.charAt(0)}</span>
                         )}
                     </div>
                     <div className="min-w-0">
                         <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{user?.name}</div>
                         <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.role}</div>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg mb-3">
                     <ShieldCheck size={14} className="text-green-600 dark:text-green-400"/>
                     <span className="text-xs font-bold text-green-700 dark:text-green-300">Veilige Sessie</span>
                 </div>

                 {onLogout && (
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 text-xs font-bold py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                    >
                        <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform"/> Uitloggen
                    </button>
                 )}
             </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
