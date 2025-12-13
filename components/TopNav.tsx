

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ChevronDown, Lock, LogOut, CheckCircle2, Menu, Cloud, Database, Shield, User, Briefcase, Ticket, X, Trash2 } from 'lucide-react';
import { Employee, ViewState } from '../types';

interface TopNavProps {
  user?: Employee;
  onLogout: () => void;
  onToggleMobileMenu: () => void;
  onNavigate: (view: ViewState) => void;
  isLive: boolean;
  onOpenFeedbackModal: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ 
  user, 
  onLogout, 
  onToggleMobileMenu,
  onNavigate,
  isLive,
  onOpenFeedbackModal
}) => {
  return (
    <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 transition-all duration-300 print:hidden">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex items-center gap-2 lg:gap-5">
        
        <div className="flex items-center gap-1 lg:gap-3">
          
          {/* User Menu */}
          <div className="relative group h-16 flex items-center lg:ml-2">
            <div className="flex items-center gap-2 lg:gap-3 cursor-pointer py-2 pl-2 pr-1 rounded-xl hover:bg-slate-50 transition-colors">
              <img 
                src={user?.avatar || "https://picsum.photos/100/100?grayscale"} 
                alt="User" 
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-100"
              />
              <div className="hidden lg:block leading-tight">
                <div className="text-sm font-bold text-slate-800">{user?.name || 'Gast'}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{user?.role || 'Bezoeker'}</div>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden lg:block group-hover:text-slate-600 transition-colors ml-1" />
            </div>

            <div className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-50 md:hidden bg-slate-50/50">
                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              
              <button 
                onClick={() => onNavigate(ViewState.HOME)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <User size={16} />
                Mijn Profiel
              </button>

              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Uitloggen
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default TopNav;