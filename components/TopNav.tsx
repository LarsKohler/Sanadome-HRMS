

import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, ChevronDown, Lock, LogOut, CheckCircle2, Pin, Menu, Cloud, Database, Shield, User, Briefcase } from 'lucide-react';
import { Employee, Notification, ViewState } from '../types';

interface TopNavProps {
  user?: Employee;
  onLogout: () => void;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onMarkSingleRead: (id: string) => void;
  onToggleMobileMenu: () => void;
  onNavigate: (view: ViewState) => void;
  isLive: boolean;
  onDebugRoleSwitch?: (role: string) => void; // Kept for type compatibility but unused in UI
}

const TopNav: React.FC<TopNavProps> = ({ 
  user, 
  onLogout, 
  notifications, 
  onNotificationClick,
  onMarkAllRead,
  onMarkSingleRead,
  onToggleMobileMenu,
  onNavigate,
  isLive
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const sortedNotifications = [...notifications].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 transition-all duration-300">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl"
        >
          <Menu size={24} />
        </button>

        {/* Breadcrumb or Page Title Placeholder (Optional, kept minimal) */}
        <div className="hidden md:block text-slate-400 font-medium text-sm">
            Welkom terug, <span className="text-slate-900 font-bold">{user?.name.split(' ')[0]}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-5">
        
        <div className="flex items-center gap-1 lg:gap-3">
          
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`p-2 rounded-full hover:bg-slate-50 relative transition-colors ${isNotifOpen ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 top-14 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm">
                  <h3 className="font-bold text-slate-900">Notificaties</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={onMarkAllRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-bold"
                    >
                      Markeer alles als gelezen
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-slate-400 text-sm">
                      <Bell size={32} className="mx-auto mb-3 opacity-20" />
                      Geen nieuwe meldingen
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {sortedNotifications.map((notif) => (
                        <li 
                          key={notif.id} 
                          onClick={() => {
                            onNotificationClick(notif);
                            setIsNotifOpen(false);
                          }}
                          className={`px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors relative group 
                            ${notif.isPinned ? 'bg-amber-50/40' : !notif.read ? 'bg-teal-50/20' : ''}
                          `}
                        >
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 mt-1">
                                {notif.isPinned ? (
                                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shadow-sm border border-amber-200">
                                        <Pin size={14} className="fill-current" />
                                    </div>
                                ) : (
                                    <div className={`w-2.5 h-2.5 mt-2 rounded-full ${!notif.read ? 'bg-teal-500 shadow-sm shadow-teal-200' : 'bg-slate-200'}`}></div>
                                )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className={`text-sm ${!notif.read || notif.isPinned ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                  {notif.title}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 pr-2 leading-relaxed font-medium">
                                {notif.message}
                              </p>
                              <div className="flex justify-between items-center mt-3">
                                <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">
                                  {notif.date} • {notif.senderName}
                                </p>
                                {!notif.read && !notif.isPinned && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMarkSingleRead(notif.id);
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-2 py-1 rounded transition-colors"
                                  >
                                    <CheckCircle2 size={12} />
                                    Gelezen
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          
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

            <div className="absolute right-0 top-14 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-50 md:hidden bg-slate-50/50">
                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors first:rounded-t-xl last:rounded-b-xl"
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