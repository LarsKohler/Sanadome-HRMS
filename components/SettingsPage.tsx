
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Shield, Search, Check, AlertTriangle, User, Save, RefreshCcw, Lock, Unlock, Briefcase, Plus, X, LayoutGrid, EyeOff, CheckSquare, Square, Eye, Users, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { Employee, Permission, PERMISSION_LABELS, GlobalSettings, ViewState } from '../types';
import { ROLE_PERMISSIONS } from '../utils/permissions';
import { Modal } from './Modal';
import { api } from '../utils/api';

interface SettingsPageProps {
  employees: Employee[];
  currentUser: Employee;
  onUpdateEmployee: (employee: Employee) => void;
  onShowToast: (message: string) => void;
  globalSettings: GlobalSettings | null;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ employees, currentUser, onUpdateEmployee, onShowToast, globalSettings, onUpdateGlobalSettings }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'modules' | 'branding'>('users');
  
  // Selection State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Local state for Role Definitions
  const [roleConfigs, setRoleConfigs] = useState<Record<string, Permission[]>>(ROLE_PERMISSIONS);

  // Module Management State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleConfigForm, setModuleConfigForm] = useState<{
      enabled: boolean;
      accessMode: 'open' | 'restricted';
      hiddenForRoles: string[];
      hiddenForUsers: string[];
      allowedUsers: string[];
  }>({
      enabled: true,
      accessMode: 'open',
      hiddenForRoles: [],
      hiddenForUsers: [],
      allowedUsers: []
  });

  // Branding State
  const [loginImages, setLoginImages] = useState<string[]>([]);
  const [welcomeImages, setWelcomeImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'login' | 'welcome' | null>(null);

  // Module Names Mapping - Defined locally with string literals to prevent import order issues
  const moduleNames: Record<string, string> = {
      'NEWS': 'Nieuws',
      'ACADEMY': 'Academy',
      'KNOWLEDGE_BASE': 'Kennisbank',
      'DIRECTORY': 'Collega\'s',
      'HR_DOSSIER': 'HR Dossiers',
      'CHECKLISTS': 'Checklists',
      'BIKE_RENTAL': 'Fietsverhuur',
      'COMPENSATION': 'Compensatie',
      'ONBOARDING': 'Onboarding',
      'EVALUATIONS': 'Performance',
      'RECRUITMENT': 'Recruitment',
      'DEBT_CONTROL': 'Debiteuren',
      'LINEN_AUDIT': 'Linnen Audit',
      'REPORTS': 'Rapportages',
      'SETTINGS': 'Instellingen',
      'SYSTEM_STATUS': 'Systeemstatus'
  };

  // Initialize selection
  useEffect(() => {
      if (activeTab === 'roles' && !selectedRoleKey) {
          setSelectedRoleKey('Manager');
      }
  }, [activeTab, selectedRoleKey]);

  useEffect(() => {
      if (globalSettings) {
          setLoginImages(globalSettings.loginImages || []);
          setWelcomeImages(globalSettings.welcomeImages || []);
      }
  }, [globalSettings]);

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    return employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // --- HANDLERS FOR USERS ---

  const handleToggleUserPermission = (perm: Permission) => {
      if (!selectedEmployee) return;

      const roleDefaults = roleConfigs[selectedEmployee.role] || [];
      
      // If permission is already in role, we CANNOT turn it off (Additive model)
      if (roleDefaults.includes(perm)) {
          return; 
      }

      const currentCustom = selectedEmployee.customPermissions || [];
      let newPermissions: Permission[];

      if (currentCustom.includes(perm)) {
          // Remove custom permission
          newPermissions = currentCustom.filter(p => p !== perm);
      } else {
          // Add custom permission
          newPermissions = [...currentCustom, perm];
      }

      onUpdateEmployee({ ...selectedEmployee, customPermissions: newPermissions });
  };

  const handleResetUserPermissions = () => {
      if (!selectedEmployee) return;
      onUpdateEmployee({ ...selectedEmployee, customPermissions: [] });
      onShowToast(`Rechten voor ${selectedEmployee.name} hersteld naar standaard.`);
  };

  // --- HANDLERS FOR ROLES ---

  const handleToggleRolePermission = (perm: Permission) => {
      if (!selectedRoleKey) return;

      setRoleConfigs(prev => {
          const currentPerms = prev[selectedRoleKey] || [];
          const hasIt = currentPerms.includes(perm);
          
          let newPerms;
          if (hasIt) {
              newPerms = currentPerms.filter(p => p !== perm);
          } else {
              newPerms = [...currentPerms, perm];
          }

          return { ...prev, [selectedRoleKey]: newPerms };
      });
  };

  const handleSaveRoleConfig = () => {
      onShowToast(`Rol configuratie voor ${selectedRoleKey} opgeslagen. (Let op: dit is een demo state).`);
  };

  // --- HANDLERS FOR MODULES ---

  const getModuleConfig = (viewId: string) => {
      const defaultConf = {
          id: viewId as ViewState,
          name: moduleNames[viewId] || viewId,
          enabled: true,
          accessMode: 'open' as const,
          hiddenForRoles: [],
          hiddenForUsers: [],
          allowedUsers: []
      };

      if (!globalSettings?.modules) return defaultConf;
      return { ...defaultConf, ...globalSettings.modules[viewId] };
  };

  const updateModuleStatus = (viewId: string, enabled: boolean) => {
      const currentConfig = getModuleConfig(viewId);
      const newConfig = { ...currentConfig, enabled };
      
      const newSettings = {
          ...globalSettings,
          modules: {
              ...(globalSettings?.modules || {}),
              [viewId]: newConfig
          }
      };
      
      onUpdateGlobalSettings(newSettings as GlobalSettings);
  };

  const openModuleConfig = (moduleId: string) => {
      const config = getModuleConfig(moduleId);
      setEditingModuleId(moduleId);
      setModuleConfigForm({
          enabled: config.enabled,
          accessMode: config.accessMode || 'open',
          hiddenForRoles: config.hiddenForRoles || [],
          hiddenForUsers: config.hiddenForUsers || [],
          allowedUsers: config.allowedUsers || []
      });
      setIsConfigModalOpen(true);
  };

  const saveModuleConfig = () => {
      if (!editingModuleId) return;
      
      const newSettings = {
          ...globalSettings,
          modules: {
              ...(globalSettings?.modules || {}),
              [editingModuleId]: {
                  id: editingModuleId as ViewState,
                  name: moduleNames[editingModuleId] || editingModuleId,
                  ...moduleConfigForm
              }
          }
      };

      onUpdateGlobalSettings(newSettings as GlobalSettings);
      setIsConfigModalOpen(false);
      onShowToast("Module instellingen opgeslagen.");
  };

  const toggleArrayItem = (arr: string[], item: string) => {
      return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  // --- HANDLERS FOR BRANDING ---

  const triggerImageUpload = (type: 'login' | 'welcome') => {
      setUploadType(type);
      fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !uploadType) return;

      onShowToast("Afbeelding uploaden naar database...");
      try {
          // Explicitly use 'branding' bucket.
          // IMPORTANT: Requires Supabase policy allowing insert to 'branding' bucket.
          const url = await api.uploadFile(file, 'branding');
          
          if (url && url.startsWith('http')) {
              let updatedSettings;
              if (uploadType === 'login') {
                  const updated = [...loginImages, url];
                  setLoginImages(updated);
                  updatedSettings = { ...globalSettings!, loginImages: updated };
              } else {
                  const updated = [...welcomeImages, url];
                  setWelcomeImages(updated);
                  updatedSettings = { ...globalSettings!, welcomeImages: updated };
              }
              onUpdateGlobalSettings(updatedSettings);
              onShowToast("Afbeelding succesvol opgeslagen en toegevoegd.");
          } else {
              console.error("Upload returned invalid URL:", url);
              onShowToast("Upload mislukt: Geen geldige URL ontvangen.");
          }
      } catch (err: any) {
          console.error("Upload Exception:", err);
          onShowToast(`Fout bij uploaden: ${err.message || 'Onbekende fout'}`);
      } finally {
          setUploadType(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const removeImage = (type: 'login' | 'welcome', index: number) => {
      if (type === 'login') {
          const updated = loginImages.filter((_, i) => i !== index);
          setLoginImages(updated);
          onUpdateGlobalSettings({ ...globalSettings!, loginImages: updated });
      } else {
          const updated = welcomeImages.filter((_, i) => i !== index);
          setWelcomeImages(updated);
          onUpdateGlobalSettings({ ...globalSettings!, welcomeImages: updated });
      }
      onShowToast("Afbeelding verwijderd uit lijst.");
  };

  return (
    <div className="p-6 md:p-10 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Shield className="text-teal-600" size={36} />
             Instellingen & Rechten
           </h1>
           <p className="text-slate-500 mt-2 text-lg">Beheer toegangsrechten en systeembrede configuraties.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
          
          {/* TABS */}
          <div className="border-b border-slate-200 px-6 py-4 flex gap-4 bg-white overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <User size={16}/> Gebruikers
              </button>
              <button 
                onClick={() => setActiveTab('roles')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'roles' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <Briefcase size={16}/> Rollen
              </button>
              <button 
                onClick={() => setActiveTab('modules')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'modules' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <LayoutGrid size={16}/> Modules
              </button>
              <button 
                onClick={() => setActiveTab('branding')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'branding' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <ImageIcon size={16}/> Huisstijl
              </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
              
              {/* SIDEBAR LIST (Based on Tab) */}
              {(activeTab === 'users' || activeTab === 'roles') && (
                  <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full overflow-hidden">
                      {activeTab === 'users' && (
                          <div className="flex flex-col h-full">
                              <div className="p-4 border-b border-slate-100">
                                  <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                      <input 
                                        type="text" 
                                        placeholder="Zoek medewerker..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                                      />
                                  </div>
                              </div>
                              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                  {filteredEmployees.map(emp => (
                                      <button 
                                        key={emp.id}
                                        onClick={() => setSelectedEmployeeId(emp.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                                            selectedEmployeeId === emp.id 
                                            ? 'bg-white border border-teal-200 text-teal-800 shadow-sm ring-1 ring-teal-50' 
                                            : 'text-slate-600 hover:bg-white hover:shadow-sm border border-transparent'
                                        }`}
                                      >
                                          <img src={emp.avatar} className="w-8 h-8 rounded-full object-cover border border-slate-100" alt="Av"/>
                                          <span className="truncate flex-1">{emp.name}</span>
                                          {emp.customPermissions && emp.customPermissions.length > 0 && <div className="w-2 h-2 bg-amber-400 rounded-full shadow-sm" title="Aangepaste rechten"></div>}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeTab === 'roles' && (
                          <div className="flex-1 overflow-y-auto p-4 space-y-2">
                              {Object.keys(roleConfigs).map(role => (
                                  <button 
                                    key={role}
                                    onClick={() => setSelectedRoleKey(role)}
                                    className={`w-full text-left px-5 py-4 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
                                        selectedRoleKey === role 
                                        ? 'bg-white border border-purple-200 text-purple-800 shadow-sm ring-1 ring-purple-50' 
                                        : 'text-slate-600 hover:bg-white hover:shadow-sm border border-transparent'
                                    }`}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${selectedRoleKey === role ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'}`}>
                                              <Shield size={18}/>
                                          </div>
                                          <span>{role}</span>
                                      </div>
                                      <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md text-slate-500">
                                          {roleConfigs[role].length}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {/* MAIN CONTENT */}
              <div className="flex-1 bg-white p-8 overflow-y-auto">
                  
                  {activeTab === 'users' ? (
                      selectedEmployee ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <img src={selectedEmployee.avatar} className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white" alt="Avatar"/>
                                        {selectedEmployee.customPermissions && selectedEmployee.customPermissions.length > 0 && (
                                            <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 p-1.5 rounded-full border-2 border-white" title="Aangepaste rechten actief">
                                                <AlertTriangle size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{selectedEmployee.name}</h2>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                                            <span className="bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-600 border border-slate-200">{selectedEmployee.role}</span>
                                            <span>•</span>
                                            <span>{selectedEmployee.departments ? selectedEmployee.departments.join(', ') : 'Geen afdeling'}</span>
                                        </div>
                                    </div>
                                </div>
                                {selectedEmployee.customPermissions && selectedEmployee.customPermissions.length > 0 && (
                                    <button 
                                        onClick={handleResetUserPermissions}
                                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 border border-amber-200"
                                    >
                                        <RefreshCcw size={16} /> Reset
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {(Object.keys(PERMISSION_LABELS) as Permission[]).map(perm => {
                                    const roleDefaults = roleConfigs[selectedEmployee.role] || [];
                                    const customPerms = selectedEmployee.customPermissions || [];
                                    
                                    const isInherited = roleDefaults.includes(perm);
                                    const isCustom = customPerms.includes(perm);
                                    const isEffective = isInherited || isCustom;

                                    return (
                                        <div 
                                            key={perm} 
                                            onClick={() => !isInherited && handleToggleUserPermission(perm)}
                                            className={`group p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between ${
                                                isInherited 
                                                    ? 'bg-slate-50 border-slate-200 cursor-default opacity-80' 
                                                    : isCustom 
                                                        ? 'bg-teal-50 border-teal-200 cursor-pointer shadow-sm'
                                                        : 'bg-white border-slate-100 hover:border-slate-300 cursor-pointer'
                                            }`}
                                        >
                                            <div>
                                                <div className={`font-bold text-sm ${isEffective ? 'text-slate-900' : 'text-slate-400'}`}>
                                                    {PERMISSION_LABELS[perm]}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`text-xs font-mono ${isEffective ? 'text-slate-500' : 'text-slate-300'}`}>
                                                        {perm}
                                                    </div>
                                                    {isInherited && (
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">ROL</span>
                                                    )}
                                                    {isCustom && (
                                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">EXTRA</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {isInherited ? (
                                                <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full" title="Ingeschakeld door Rol">
                                                    <Check size={16} strokeWidth={3}/>
                                                </div>
                                            ) : (
                                                <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                                                    isCustom ? 'bg-teal-500' : 'bg-slate-200'
                                                }`}>
                                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${
                                                        isCustom ? 'translate-x-6' : 'translate-x-0'
                                                    }`}>
                                                        {isCustom && <div className="absolute inset-0 flex items-center justify-center text-teal-500"><Plus size={14} strokeWidth={3}/></div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <User size={48} className="opacity-20"/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-600">Geen gebruiker geselecteerd</h3>
                            <p className="text-lg mt-2">Selecteer een medewerker uit de lijst links.</p>
                        </div>
                      )
                  ) : activeTab === 'roles' ? (
                      selectedRoleKey ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                            <Briefcase size={24} />
                                        </div>
                                        <h2 className="text-3xl font-bold text-slate-900">{selectedRoleKey}</h2>
                                    </div>
                                    <p className="text-slate-500 text-lg">
                                        Standaardrechten voor alle medewerkers met de rol <span className="font-bold text-slate-700">{selectedRoleKey}</span>.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleSaveRoleConfig}
                                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:-translate-y-0.5"
                                >
                                    <Save size={18} /> Opslaan
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {(Object.keys(PERMISSION_LABELS) as Permission[]).map(perm => {
                                    const isActive = (roleConfigs[selectedRoleKey] || []).includes(perm);

                                    return (
                                        <div 
                                            key={perm} 
                                            onClick={() => handleToggleRolePermission(perm)}
                                            className={`group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                                                isActive 
                                                ? 'bg-purple-50/50 border-purple-200 shadow-sm' 
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white text-purple-600 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                                                    {isActive ? <Unlock size={20}/> : <Lock size={20}/>}
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-base ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                                        {PERMISSION_LABELS[perm]}
                                                    </div>
                                                    <div className={`text-xs font-mono mt-1 ${isActive ? 'text-purple-600/70' : 'text-slate-300'}`}>
                                                        {perm}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className={`relative w-16 h-9 rounded-full transition-colors duration-300 ${
                                                isActive ? 'bg-purple-600' : 'bg-slate-200'
                                            }`}>
                                                <div className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-300 transform flex items-center justify-center ${
                                                    isActive ? 'translate-x-7' : 'translate-x-0'
                                                }`}>
                                                    {isActive && <Check size={14} className="text-purple-600" strokeWidth={3}/>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in">
                            <Shield size={64} className="mb-6 opacity-20"/>
                            <h3 className="text-xl font-bold text-slate-600">Geen rol geselecteerd</h3>
                            <p className="text-lg mt-2">Kies een rol uit het menu om de rechten aan te passen.</p>
                        </div>
                      )
                  ) : activeTab === 'modules' ? (
                      /* MODULES TAB */
                      <div className="max-w-6xl mx-auto animate-in fade-in">
                          <div className="flex justify-between items-center mb-6">
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-900">Module Beheer</h2>
                                  <p className="text-slate-500 mt-1">Configureer zichtbaarheid en toegang per module.</p>
                              </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                              <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                      <tr>
                                          <th className="px-6 py-4">Module</th>
                                          <th className="px-6 py-4">Status</th>
                                          <th className="px-6 py-4">Toegangsmodus</th>
                                          <th className="px-6 py-4">Configuratie</th>
                                          <th className="px-6 py-4 text-right">Actie</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-sm">
                                      {Object.keys(moduleNames).map(viewId => {
                                          const config = getModuleConfig(viewId);
                                          const isRestricted = config.accessMode === 'restricted';

                                          return (
                                              <tr key={viewId} className="hover:bg-slate-50 transition-colors">
                                                  <td className="px-6 py-4 font-bold text-slate-900">{moduleNames[viewId]}</td>
                                                  <td className="px-6 py-4">
                                                      <button 
                                                        onClick={() => updateModuleStatus(viewId, !config.enabled)}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                                            config.enabled 
                                                            ? 'bg-green-100 text-green-700 border-green-200' 
                                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}
                                                      >
                                                          {config.enabled ? 'Actief' : 'Uitgeschakeld'}
                                                      </button>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <div className="flex items-center gap-2">
                                                          {isRestricted ? (
                                                              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-xs font-bold">
                                                                  <Lock size={12}/> Besloten
                                                              </span>
                                                          ) : (
                                                              <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-bold">
                                                                  <Unlock size={12}/> Openbaar
                                                              </span>
                                                          )}
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      {isRestricted ? (
                                                          <div className="text-xs text-slate-500 flex items-center gap-1">
                                                              <Users size={12}/> {config.allowedUsers?.length || 0} toegestaan
                                                          </div>
                                                      ) : (
                                                          <div className="text-xs text-slate-500">
                                                              {(config.hiddenForRoles?.length > 0 || config.hiddenForUsers?.length > 0) 
                                                                ? `${config.hiddenForRoles.length} rollen, ${config.hiddenForUsers.length} users verborgen` 
                                                                : 'Zichtbaar voor iedereen'}
                                                          </div>
                                                      )}
                                                  </td>
                                                  <td className="px-6 py-4 text-right">
                                                      <button 
                                                        onClick={() => openModuleConfig(viewId)}
                                                        className="text-indigo-600 font-bold hover:underline text-xs"
                                                      >
                                                          Configureren
                                                      </button>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  ) : (
                      /* BRANDING TAB */
                      <div className="max-w-6xl mx-auto animate-in fade-in">
                          <div className="flex justify-between items-center mb-8">
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-900">Huisstijl</h2>
                                  <p className="text-slate-500 mt-1">Beheer de achtergrondafbeeldingen van het portaal.</p>
                              </div>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </div>

                          <div className="space-y-8">
                              {/* Login Screen Images */}
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                  <div className="flex justify-between items-center mb-6">
                                      <h3 className="text-lg font-bold text-slate-900">Inlogscherm Slideshow</h3>
                                      <button 
                                        onClick={() => triggerImageUpload('login')}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                                      >
                                          <Upload size={14}/> Foto Toevoegen
                                      </button>
                                  </div>
                                  
                                  {loginImages.length > 0 ? (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          {loginImages.map((src, index) => (
                                              <div key={index} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200">
                                                  <img src={src} className="w-full h-full object-cover" alt="Login bg"/>
                                                  <button 
                                                      onClick={() => removeImage('login', index)}
                                                      className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                                  >
                                                      <Trash2 size={16}/>
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic text-sm">
                                          Geen afbeeldingen ingesteld. Standaard Sanadome foto's worden gebruikt.
                                      </div>
                                  )}
                              </div>

                              {/* Welcome Screen Images */}
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                  <div className="flex justify-between items-center mb-6">
                                      <h3 className="text-lg font-bold text-slate-900">Welkom Module Slideshow</h3>
                                      <button 
                                        onClick={() => triggerImageUpload('welcome')}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                                      >
                                          <Upload size={14}/> Foto Toevoegen
                                      </button>
                                  </div>
                                  
                                  {welcomeImages.length > 0 ? (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          {welcomeImages.map((src, index) => (
                                              <div key={index} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200">
                                                  <img src={src} className="w-full h-full object-cover" alt="Welcome bg"/>
                                                  <button 
                                                      onClick={() => removeImage('welcome', index)}
                                                      className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                                  >
                                                      <Trash2 size={16}/>
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic text-sm">
                                          Geen afbeeldingen ingesteld. Standaard Sanadome foto's worden gebruikt.
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* MODULE CONFIG MODAL */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={editingModuleId ? `Configureer ${moduleNames[editingModuleId] || editingModuleId}` : 'Module Configuratie'}
      >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Toegangsmodus</h4>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setModuleConfigForm({...moduleConfigForm, accessMode: 'open'})}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
                            moduleConfigForm.accessMode === 'open' 
                            ? 'border-teal-500 bg-white ring-1 ring-teal-500/20' 
                            : 'border-transparent bg-white hover:bg-slate-100'
                        }`}
                      >
                          <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                              <Unlock size={16} className={moduleConfigForm.accessMode === 'open' ? 'text-teal-600' : 'text-slate-400'}/>
                              Openbaar
                          </div>
                          <p className="text-xs text-slate-500">Iedereen heeft toegang, tenzij specifiek uitgesloten.</p>
                      </button>

                      <button 
                        onClick={() => setModuleConfigForm({...moduleConfigForm, accessMode: 'restricted'})}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
                            moduleConfigForm.accessMode === 'restricted' 
                            ? 'border-amber-500 bg-white ring-1 ring-amber-500/20' 
                            : 'border-transparent bg-white hover:bg-slate-100'
                        }`}
                      >
                          <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                              <Lock size={16} className={moduleConfigForm.accessMode === 'restricted' ? 'text-amber-600' : 'text-slate-400'}/>
                              Besloten
                          </div>
                          <p className="text-xs text-slate-500">Alleen specifieke personen hebben toegang.</p>
                      </button>
                  </div>
              </div>

              {moduleConfigForm.accessMode === 'open' ? (
                  <>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Verbergen voor Rollen</label>
                          <div className="grid grid-cols-2 gap-2">
                              {['Manager', 'Senior Medewerker', 'Medewerker'].map(role => (
                                  <button
                                    key={role}
                                    onClick={() => setModuleConfigForm({...moduleConfigForm, hiddenForRoles: toggleArrayItem(moduleConfigForm.hiddenForRoles, role)})}
                                    className={`px-3 py-2 text-left rounded-lg text-xs font-bold border transition-colors flex justify-between items-center ${
                                        moduleConfigForm.hiddenForRoles.includes(role) 
                                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                        : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                  >
                                      {role}
                                      {moduleConfigForm.hiddenForRoles.includes(role) && <EyeOff size={14}/>}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Verbergen voor Personen</label>
                          <div className="h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                              {employees.map(emp => (
                                  <button
                                    key={emp.id}
                                    onClick={() => setModuleConfigForm({...moduleConfigForm, hiddenForUsers: toggleArrayItem(moduleConfigForm.hiddenForUsers, emp.id)})}
                                    className={`w-full px-3 py-2 text-left rounded-lg text-xs font-bold border transition-colors flex justify-between items-center ${
                                        moduleConfigForm.hiddenForUsers.includes(emp.id) 
                                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                        : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                      <div className="flex items-center gap-2">
                                          <img src={emp.avatar} className="w-5 h-5 rounded-full" alt=""/>
                                          {emp.name}
                                      </div>
                                      {moduleConfigForm.hiddenForUsers.includes(emp.id) && <EyeOff size={14}/>}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </>
              ) : (
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Toestaan voor Personen</label>
                      <div className="h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                          {employees.map(emp => (
                              <button
                                key={emp.id}
                                onClick={() => setModuleConfigForm({...moduleConfigForm, allowedUsers: toggleArrayItem(moduleConfigForm.allowedUsers, emp.id)})}
                                className={`w-full px-3 py-2 text-left rounded-lg text-xs font-bold border transition-colors flex justify-between items-center ${
                                    moduleConfigForm.allowedUsers.includes(emp.id) 
                                    ? 'bg-green-50 border-green-200 text-green-700' 
                                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                  <div className="flex items-center gap-2">
                                      <img src={emp.avatar} className="w-5 h-5 rounded-full" alt=""/>
                                      {emp.name}
                                  </div>
                                  {moduleConfigForm.allowedUsers.includes(emp.id) && <Check size={14}/>}
                              </button>
                          ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">Alleen geselecteerde personen zien deze module in hun menu.</p>
                  </div>
              )}

              <button 
                onClick={saveModuleConfig}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors"
              >
                  Instellingen Toepassen
              </button>
          </div>
      </Modal>

    </div>
  );
};

export default SettingsPage;
