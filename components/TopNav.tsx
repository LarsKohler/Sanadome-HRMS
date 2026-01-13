
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Lock, User, FileText, Layout, ChevronRight, X } from 'lucide-react';
import { Employee, ViewState, NewsPost, GlobalSettings, Permission } from '../types';
import { hasPermission, isModuleEnabled } from '../utils/permissions';

interface TopNavProps {
  user?: Employee;
  onLogout: () => void;
  onToggleMobileMenu: () => void;
  onNavigate: (view: ViewState) => void;
  isLive: boolean;
  onOpenFeedbackModal: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  currentViewTitle: string;
  onLockSession: () => void;
  globalSettings: GlobalSettings | null;
  
  // Data for Global Search
  searchData?: {
    employees: Employee[];
    news: NewsPost[];
  };
  onSelectProfile?: (id: string) => void;
}

interface SearchResult {
  id: string;
  type: 'Page' | 'Employee' | 'News';
  title: string;
  subtitle?: string;
  action: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ 
  user,
  onToggleMobileMenu,
  currentViewTitle,
  onLockSession,
  onNavigate,
  searchData,
  onSelectProfile,
  globalSettings
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const found: SearchResult[] = [];

    // 1. Search Pages (With Permission Checks)
    // Define pages with their required permission (optional) and ViewState ID
    const pages: { id: ViewState; label: string; reqPerm?: Permission }[] = [
      { id: ViewState.HOME, label: 'Mijn Profiel' },
      { id: ViewState.NEWS, label: 'Nieuws', reqPerm: 'VIEW_NEWS' },
      { id: ViewState.DIRECTORY, label: 'Collega Directory', reqPerm: 'VIEW_DIRECTORY' },
      { id: ViewState.ACADEMY, label: 'Academy', reqPerm: 'VIEW_ACADEMY' },
      { id: ViewState.RECRUITMENT, label: 'Recruitment', reqPerm: 'MANAGE_RECRUITMENT' },
      { id: ViewState.EVALUATIONS, label: 'Evaluaties', reqPerm: 'MANAGE_EVALUATIONS' }, // Simplified: Managers usually search this
      { id: ViewState.STOCK_CONTROL, label: 'Voorraadbeheer', reqPerm: 'MANAGE_STOCK' },
      { id: ViewState.REPORTS, label: 'Rapportages', reqPerm: 'VIEW_REPORTS' },
      { id: ViewState.CHECKLISTS, label: 'Checklists', reqPerm: 'VIEW_CHECKLISTS' },
      { id: ViewState.DEBT_CONTROL, label: 'Debiteuren', reqPerm: 'MANAGE_DEBTORS' },
    ];

    pages.forEach(page => {
      // Check 1: Is the module enabled in settings?
      const moduleEnabled = isModuleEnabled(page.id, user, globalSettings);
      
      // Check 2: Does the user have the specific permission required for this page?
      const hasPerm = !page.reqPerm || hasPermission(user, page.reqPerm, globalSettings?.roles);

      if (moduleEnabled && hasPerm && page.label.toLowerCase().includes(query)) {
        found.push({
          id: page.id,
          type: 'Page',
          title: page.label,
          subtitle: 'Ga naar pagina',
          action: () => onNavigate(page.id)
        });
      }
    });

    // 2. Search Employees (Only if has VIEW_DIRECTORY permission)
    if (searchData?.employees && hasPermission(user, 'VIEW_DIRECTORY', globalSettings?.roles)) {
      searchData.employees.forEach(emp => {
        if (emp.name.toLowerCase().includes(query) || emp.role.toLowerCase().includes(query)) {
          found.push({
            id: emp.id,
            type: 'Employee',
            title: emp.name,
            subtitle: emp.role,
            action: () => onSelectProfile && onSelectProfile(emp.id)
          });
        }
      });
    }

    // 3. Search News (Only if has VIEW_NEWS permission)
    if (searchData?.news && hasPermission(user, 'VIEW_NEWS', globalSettings?.roles)) {
      searchData.news.forEach(item => {
        if (item.title.toLowerCase().includes(query)) {
          found.push({
            id: item.id,
            type: 'News',
            title: item.title,
            subtitle: item.date,
            action: () => onNavigate(ViewState.NEWS) // Could be enhanced to open specific news item
          });
        }
      });
    }

    setResults(found.slice(0, 8)); // Limit to 8 results
    setIsSearchOpen(true);
  }, [searchQuery, searchData, onNavigate, onSelectProfile, user, globalSettings]);

  const handleResultClick = (result: SearchResult) => {
    result.action();
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Page': return <Layout size={16} className="text-slate-400" />;
      case 'Employee': return <User size={16} className="text-slate-400" />;
      case 'News': return <FileText size={16} className="text-slate-400" />;
      default: return <Search size={16} className="text-slate-400" />;
    }
  };

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 transition-all duration-300 print:hidden">
      
      {/* LEFT: Title & Mobile Toggle */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
        >
          <Menu size={24} />
        </button>
        
        <h2 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">
          {currentViewTitle}
        </h2>
      </div>

      {/* RIGHT: Search & Actions */}
      <div className="flex items-center gap-3 lg:gap-5">
        
        {/* Functional Search Bar */}
        <div className="relative hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Zoeken..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if(searchQuery) setIsSearchOpen(true); }}
              className="pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 transition-all focus:w-80"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && results.length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="py-2">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultaten</div>
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {getIcon(result.type)}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{result.title}</div>
                        {result.subtitle && <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
           
           {isSearchOpen && searchQuery && results.length === 0 && (
             <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 text-center text-sm text-slate-500">
               Geen resultaten gevonden voor "{searchQuery}"
             </div>
           )}
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

        <div className="flex items-center gap-2">
          {/* Lock Screen - Icons removed per request */}
          <button 
            onClick={onLockSession}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-2"
          >
            <Lock size={16} />
            <span className="hidden lg:inline">Vergrendelen</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
