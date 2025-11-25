
import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Phone, UserPlus, Pencil, Trash2, Lock, Copy, ExternalLink, Check, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Employee } from '../types';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface EmployeeDirectoryProps {
  employees: Employee[];
  currentUser: Employee;
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onSimulateOnboarding?: (employee: Employee) => void;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ 
  employees, 
  currentUser,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onSimulateOnboarding
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [recentlyAddedEmployee, setRecentlyAddedEmployee] = useState<Employee | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Medewerker',
    department: 'Engineering',
    location: 'London',
    hiredOn: '',
    employmentType: 'Full-Time'
  });

  // Check Permission
  const canManage = hasPermission(currentUser, 'MANAGE_EMPLOYEES');

  useEffect(() => {
    const handleClickOutside = () => setActiveActionId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
      if (toastMessage) {
          const timer = setTimeout(() => setToastMessage(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toastMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openEditModal = (employee: Employee) => {
    const nameParts = employee.name.split(' ');
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.join(' ');

    setSelectedEmployee(employee);
    setFormData({
      firstName,
      lastName,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      department: employee.department,
      location: employee.location,
      hiredOn: '', 
      employmentType: employee.employmentType || 'Full-Time'
    });
    setIsEditModalOpen(true);
    setActiveActionId(null);
  };

  const openDeleteModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteModalOpen(true);
    setActiveActionId(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const updatedEmployee: Employee = {
      ...selectedEmployee,
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      department: formData.department,
      location: formData.location,
      employmentType: formData.employmentType,
      hiredOn: formData.hiredOn ? new Date(formData.hiredOn).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : selectedEmployee.hiredOn
    };

    onUpdateEmployee(updatedEmployee);
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
    resetForm();
  };

  const handleDeleteConfirm = () => {
    if (selectedEmployee) {
      onDeleteEmployee(selectedEmployee.id);
      setIsDeleteModalOpen(false);
      setSelectedEmployee(null);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'Medewerker',
      department: 'Engineering',
      location: 'London',
      hiredOn: '',
      employmentType: 'Full-Time'
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newId = Math.random().toString(36).substr(2, 9);
    const fullName = `${formData.firstName} ${formData.lastName}`;
    const dateObj = formData.hiredOn ? new Date(formData.hiredOn) : new Date();
    const formattedDate = dateObj.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });

    const newEmployee: Employee = {
      id: newId,
      name: fullName,
      role: formData.role,
      department: formData.department,
      location: formData.location,
      email: formData.email,
      phone: formData.phone, 
      linkedin: fullName,
      avatar: `https://ui-avatars.com/api/?name=${formData.firstName}+${formData.lastName}&background=random`,
      hiredOn: formattedDate,
      employmentType: formData.employmentType,
      accountStatus: 'Pending',
      onboardingStatus: 'Pending',
      leaveBalances: [
        { type: 'Annual Leave', entitled: 25, taken: 0 },
        { type: 'Sick Leave', entitled: 10, taken: 0 },
        { type: 'Without Pay', entitled: 0, taken: 0 }
      ],
      leaveRequests: [],
      documents: [],
      notes: [],
      onboardingTasks: [] 
    };

    onAddEmployee(newEmployee);
    setRecentlyAddedEmployee(newEmployee);
    setIsAddModalOpen(false);
    setIsSuccessModalOpen(true);
    resetForm();
  };

  const handleCopyLink = (id?: string) => {
      const targetId = id || recentlyAddedEmployee?.id;
      if (!targetId) return;

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sanadome-hrms.vercel.app';
      const link = `${baseUrl}/welcome/${targetId.substring(0,8)}`;
      
      navigator.clipboard.writeText(link).catch(() => {});
      
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);

      if (id) {
          setToastMessage("Uitnodigingslink gekopieerd");
          setActiveActionId(null);
      }
  };

  const getInviteLink = (id: string) => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sanadome-hrms.vercel.app';
      return `${baseUrl}/welcome/${id.substring(0,8)}`;
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full animate-in fade-in duration-500 max-w-[2400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Collega's</h1>
           <p className="text-slate-500 mt-1">Beheer het team van Sanadome.</p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => {
               resetForm();
               setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 w-full md:w-auto justify-center"
          >
            <UserPlus size={18} />
            Nieuwe medewerker
          </button>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Zoek op naam, rol..." 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filteren
          </button>
          <select className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors">
            <option>Alle afdelingen</option>
            <option>Engineering</option>
            <option>Product</option>
            <option>UX</option>
            <option>Sales</option>
            <option>Marketing</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 text-slate-700">Medewerker</th>
                <th className="px-6 py-4 text-slate-700">Rol & Status</th>
                <th className="px-6 py-4 text-slate-700">Afdeling</th>
                <th className="px-6 py-4 text-slate-700">Locatie</th>
                <th className="px-6 py-4 text-slate-700">Contact</th>
                {canManage && <th className="px-6 py-4 text-right text-slate-700">Acties</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50 transition-colors group relative">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                          <img 
                            src={employee.avatar} 
                            alt={employee.name} 
                            className={`w-11 h-11 rounded-full object-cover border-2 ${employee.accountStatus === 'Inactive' ? 'grayscale opacity-60 border-slate-200' : 'border-white shadow-sm'}`}
                          />
                          {employee.accountStatus === 'Pending' && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 border-2 border-white rounded-full shadow-sm" title="Te bevestigen"></div>
                          )}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${employee.accountStatus === 'Inactive' ? 'text-slate-500' : 'text-slate-900'}`}>{employee.name}</div>
                        <div className="text-xs text-slate-500">{employee.employmentType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700 mb-1.5">{employee.role}</div>
                    {employee.accountStatus === 'Pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">
                            <Clock size={10} strokeWidth={3} /> Te bevestigen
                        </span>
                    )}
                    {employee.accountStatus === 'Active' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 uppercase tracking-wide">
                            <CheckCircle2 size={10} strokeWidth={3} /> Actief
                        </span>
                    )}
                    {employee.accountStatus === 'Inactive' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">
                            <XCircle size={10} strokeWidth={3} /> Inactief
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {employee.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    {employee.location}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${employee.email}`} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title={employee.email}>
                        <Mail size={16} />
                      </a>
                      {employee.phone && (
                        <a href={`tel:${employee.phone}`} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title={employee.phone}>
                          <Phone size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                  
                  {canManage && (
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionId(activeActionId === employee.id ? null : employee.id);
                        }}
                        className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${activeActionId === employee.id ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {activeActionId === employee.id && (
                        <div className="absolute right-8 top-10 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-200 text-left">
                          
                          {employee.accountStatus === 'Pending' && (
                              <>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyLink(employee.id);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors font-medium"
                                >
                                    <Copy size={14} />
                                    Kopieer uitnodiging
                                </button>
                                <div className="h-px bg-slate-50 my-1"></div>
                              </>
                          )}

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(employee);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors font-medium"
                          >
                            <Pencil size={14} />
                            Bewerk medewerker
                          </button>
                          <div className="h-px bg-slate-50 my-1"></div>
                          <button 
                             onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(employee);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                          >
                            <Trash2 size={14} />
                            Verwijderen
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
          <div>Toont <span className="font-bold text-slate-700">{employees.length}</span> medewerkers</div>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 disabled:opacity-50 text-xs font-bold hover:bg-slate-50" disabled>Vorige</button>
            <button className="px-4 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 disabled:opacity-50 text-xs font-bold hover:bg-slate-50" disabled>Volgende</button>
          </div>
        </div>
      </div>

      {canManage && (
        <>
        <Modal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          title="Nieuwe medewerker"
        >
          {/* Form content same as before */}
          <form onSubmit={handleAddSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Voornaam</label>
                <input 
                  type="text" 
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  placeholder="Voornaam"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Achternaam</label>
                <input 
                  type="text" 
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  placeholder="Achternaam"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mailadres</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  placeholder="naam@sanadome.nl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefoonnummer</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  placeholder="+31 6..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                >
                  <option value="Medewerker">Medewerker</option>
                  <option value="Senior Medewerker">Senior Medewerker</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dienstverband</label>
                <select 
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                >
                  <option value="Full-Time">Voltijd (Full-Time)</option>
                  <option value="Part-Time">Deeltijd (Part-Time)</option>
                  <option value="Contract">Contractbasis</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Startdatum</label>
              <input 
                type="date" 
                name="hiredOn"
                required
                value={formData.hiredOn}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Afdeling</label>
                <select 
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="UX">UX</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kantoorlocatie</label>
                <select 
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                >
                  <option value="London">London</option>
                  <option value="New York">New York</option>
                  <option value="Berlin">Berlin</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-6 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuleren
              </button>
              <button 
                type="submit"
                className="px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-sm"
              >
                Opslaan
              </button>
            </div>
          </form>
        </Modal>

        <Modal 
             isOpen={isSuccessModalOpen}
             onClose={() => setIsSuccessModalOpen(false)}
             title="Medewerker toegevoegd"
          >
             <div className="text-center space-y-6 py-4">
                 <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-sm border border-teal-100">
                     <UserPlus size={36} />
                 </div>
                 
                 <div>
                     <h3 className="text-xl font-bold font-serif text-slate-900">Verstuur uitnodiging</h3>
                     <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">
                         Deel deze link met <strong>{recentlyAddedEmployee?.name}</strong> om de onboarding te starten.
                     </p>
                 </div>

                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-inner">
                     <code className="text-xs text-slate-600 flex-1 truncate font-mono">
                         {recentlyAddedEmployee ? getInviteLink(recentlyAddedEmployee.id) : '...'}
                     </code>
                     <button 
                        onClick={() => handleCopyLink(recentlyAddedEmployee?.id)}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Kopieer link"
                     >
                         {inviteLinkCopied ? <Check size={16} className="text-teal-600"/> : <Copy size={16} />}
                     </button>
                 </div>

                 <div className="flex flex-col gap-3 pt-2">
                     <button 
                        onClick={() => {
                            if (onSimulateOnboarding && recentlyAddedEmployee) {
                                onSimulateOnboarding(recentlyAddedEmployee);
                            }
                        }}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]"
                     >
                         <ExternalLink size={18} /> Direct naar Onboarding
                     </button>
                     <button 
                        onClick={() => setIsSuccessModalOpen(false)}
                        className="text-sm text-slate-400 hover:text-slate-800 font-medium py-2"
                     >
                         Overslaan en sluiten
                     </button>
                 </div>
             </div>
          </Modal>

        <Modal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          title="Bewerk medewerker"
        >
          <form onSubmit={handleEditSubmit} className="space-y-5">
             <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Voornaam</label>
                <input 
                  type="text" 
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Achternaam</label>
                <input 
                  type="text" 
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mailadres</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                />
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefoonnummer</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuleren
              </button>
              <button 
                type="submit"
                className="px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-sm"
              >
                Opslaan
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Medewerker verwijderen"
        >
           <div className="space-y-6 py-2">
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-full text-red-600 mt-0.5">
                      <Trash2 size={20} />
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-red-900">Let op!</h4>
                      <p className="text-sm text-red-800 mt-1">
                        Weet u zeker dat u <strong>{selectedEmployee?.name}</strong> wilt verwijderen? 
                        Deze actie is onomkeerbaar.
                      </p>
                  </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuleren
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="px-6 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-sm"
                >
                  Verwijderen
                </button>
              </div>
           </div>
        </Modal>
        </>
      )}
      
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
           <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
               <Check size={18} className="text-teal-400"/>
               <span className="font-medium text-sm">{toastMessage}</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
