
import React, { useState, useMemo } from 'react';
import { Shield, Search, Check, AlertTriangle, User, Save, RefreshCcw, Lock, Unlock } from 'lucide-react';
import { Employee, Permission, PERMISSION_LABELS } from '../types';
import { ROLE_PERMISSIONS, hasPermission, getEffectivePermissions } from '../utils/permissions';

interface SettingsPageProps {
  employees: Employee[];
  currentUser: Employee;
  onUpdateEmployee: (employee: Employee) => void;
  onShowToast: (message: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ employees, currentUser, onUpdateEmployee, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    return employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Helper to toggle a permission for the selected user
  const handleTogglePermission = (perm: Permission) => {
      if (!selectedEmployee) return;

      const currentPermissions = selectedEmployee.customPermissions 
          ? [...selectedEmployee.customPermissions] 
          : [...(ROLE_PERMISSIONS[selectedEmployee.role] || [])]; // Initialize with defaults if undefined

      if (currentPermissions.includes(perm)) {
          // Remove permission
          const updated = currentPermissions.filter(p => p !== perm);
          onUpdateEmployee({ ...selectedEmployee, customPermissions: updated });
      } else {
          // Add permission
          const updated = [...currentPermissions, perm];
          onUpdateEmployee({ ...selectedEmployee, customPermissions: updated });
      }
  };

  const handleResetPermissions = () => {
      if (!selectedEmployee) return;
      // Resetting customPermissions to undefined makes it fall back to Role defaults
      onUpdateEmployee({ ...selectedEmployee, customPermissions: undefined });
      onShowToast(`Rechten voor ${selectedEmployee.name} hersteld naar standaard.`);
  };

  // Get display status of a permission
  const getPermissionStatus = (perm: Permission) => {
      if (!selectedEmployee) return 'disabled';
      
      const isCustom = !!selectedEmployee.customPermissions;
      const hasPerm = hasPermission(selectedEmployee, perm);
      const defaultHasPerm = (ROLE_PERMISSIONS[selectedEmployee.role] || []).includes(perm);

      if (!isCustom) {
          return defaultHasPerm ? 'default-on' : 'default-off';
      }
      return hasPerm ? 'custom-on' : 'custom-off';
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Shield className="text-teal-600" size={32} />
             Instellingen & Rechten
           </h1>
           <p className="text-slate-500 mt-1">Beheer toegang en permissies per gebruiker of rol.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Sidebar / Navigation */}
          <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 p-4">
              <div className="space-y-1">
                  <button 
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                      <User size={18} className="mr-3"/> Gebruikers Specifiek
                  </button>
                  <button 
                    onClick={() => setActiveTab('roles')}
                    className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'roles' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                      <Shield size={18} className="mr-3"/> Rollen & Defaults
                  </button>
              </div>

              {activeTab === 'users' && (
                  <div className="mt-8">
                      <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Zoek medewerker..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                      </div>
                      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                          {filteredEmployees.map(emp => (
                              <button 
                                key={emp.id}
                                onClick={() => setSelectedEmployeeId(emp.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors ${selectedEmployeeId === emp.id ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-200/50 text-slate-600'}`}
                              >
                                  <img src={emp.avatar} className="w-6 h-6 rounded-full object-cover" alt="Av"/>
                                  <span className="truncate">{emp.name}</span>
                                  {emp.customPermissions && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full ml-auto" title="Aangepaste rechten"></div>}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 md:p-10 bg-white overflow-y-auto">
              
              {/* USER PERMISSIONS TAB */}
              {activeTab === 'users' && (
                  <>
                    {selectedEmployee ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <img src={selectedEmployee.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100" alt="Avatar"/>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h2>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">{selectedEmployee.role}</span>
                                            {selectedEmployee.department}
                                        </div>
                                    </div>
                                </div>
                                {selectedEmployee.customPermissions && (
                                    <button 
                                        onClick={handleResetPermissions}
                                        className="text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCcw size={14} /> Herstel naar Rol Standaard
                                    </button>
                                )}
                            </div>

                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold mb-1">Rechten Beheer</p>
                                    <p className="opacity-80">
                                        Hieronder zie je de actieve rechten. Een <span className="font-bold">blauw</span> vinkje betekent geërfd van de rol. 
                                        Een <span className="font-bold text-teal-600">groen</span> vinkje is een specifieke toewijzing.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {(Object.keys(PERMISSION_LABELS) as Permission[]).map(perm => {
                                    const status = getPermissionStatus(perm);
                                    const isActive = status === 'default-on' || status === 'custom-on';
                                    const isCustom = status === 'custom-on' || status === 'custom-off';

                                    return (
                                        <div 
                                            key={perm} 
                                            onClick={() => handleTogglePermission(perm)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                                                isActive 
                                                ? (isCustom ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-blue-200') 
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{PERMISSION_LABELS[perm]}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5 opacity-60">{perm}</div>
                                            </div>
                                            
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isActive ? (isCustom ? 'bg-teal-500' : 'bg-slate-400') : 'bg-slate-200'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <User size={48} className="mb-4 opacity-20"/>
                            <p className="text-lg font-medium">Selecteer een gebruiker om rechten te beheren.</p>
                        </div>
                    )}
                  </>
              )}

              {/* ROLES OVERVIEW TAB */}
              {activeTab === 'roles' && (
                  <div className="animate-in fade-in">
                      <h2 className="text-xl font-bold text-slate-900 mb-2">Standaard Rol Definities</h2>
                      <p className="text-slate-500 mb-8 text-sm">Dit zijn de standaardrechten per rol. Pas individuele gebruikers aan in het andere tabblad.</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                              <div key={role} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                  <div className="bg-slate-900 text-white p-4">
                                      <h3 className="font-bold text-lg">{role}</h3>
                                      <p className="text-xs text-slate-400 mt-1">{perms.length} rechten actief</p>
                                  </div>
                                  <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                                      {(Object.keys(PERMISSION_LABELS) as Permission[]).map(perm => {
                                          const hasIt = perms.includes(perm);
                                          return (
                                              <div key={perm} className={`flex items-center gap-3 text-sm ${hasIt ? 'text-slate-800' : 'text-slate-300 line-through'}`}>
                                                  {hasIt ? <Check size={14} className="text-green-500"/> : <Lock size={14}/>}
                                                  {PERMISSION_LABELS[perm]}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

          </div>
      </div>
    </div>
  );
};

export default SettingsPage;
