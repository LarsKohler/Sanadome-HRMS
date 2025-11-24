
import React, { useState, useRef, useMemo } from 'react';
import { 
  Briefcase, MapPin, 
  Mail, Linkedin, Phone, 
  Camera, Image as ImageIcon,
  Calendar, Clock, AlertCircle, FileText, Download, CheckCircle2,
  TrendingUp, Award, ChevronRight
} from 'lucide-react';
import { Employee, LeaveRequest, EmployeeNote, EmployeeDocument, Notification, ViewState } from '../types';
import { Modal } from './Modal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { api } from '../utils/api';

interface EmployeeProfileProps {
  employee: Employee;
  onNext: () => void;
  onPrevious: () => void;
  onChangeView: (view: ViewState) => void;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
  managers: Employee[];
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
  employee, 
  onNext, 
  onPrevious,
  onChangeView,
  onUpdateEmployee,
  onAddNotification,
  onShowToast,
  managers
}) => {
  const [activeTab, setActiveTab] = useState('Time off');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [leaveType, setLeaveType] = useState<'Annual Leave' | 'Sick Leave' | 'Without Pay'>('Annual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(1);

  // Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident'>('General');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisible, setNoteVisible] = useState(true);
  const [noteImpact, setNoteImpact] = useState<'Positive' | 'Negative' | 'Neutral'>('Neutral');
  const [noteScore, setNoteScore] = useState(0); // 0-5

  const isViewerManager = employee.role === 'Manager'; 

  const tabs = useMemo(() => {
    const baseTabs = ['Persoonlijk', 'Functie', 'Evaluatie'];
    if (employee.onboardingStatus === 'Active') {
        baseTabs.push('Onboarding');
    }
    baseTabs.push('Time off', 'Documenten', 'Meer');
    return baseTabs;
  }, [employee.onboardingStatus]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowToast(`${type === 'avatar' ? 'Profielfoto' : 'Banner'} uploaden...`);

    try {
        const publicUrl = await api.uploadFile(file);
        
        if (publicUrl) {
            const updatedEmployee = { ...employee, [type]: publicUrl };
            onUpdateEmployee(updatedEmployee);
            onShowToast(`${type === 'avatar' ? 'Profielfoto' : 'Banner'} succesvol bijgewerkt.`);
        } else {
             onShowToast('Uploaden mislukt. Probeer het opnieuw.');
        }
    } catch (error) {
        console.error("Upload error", error);
        onShowToast('Er is een fout opgetreden bij het uploaden.');
    }
  };

  const handleRecordLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      type: leaveType,
      startDate: new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      endDate: new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      amount: Number(amount),
      status: 'Pending'
    };

    const updatedBalances = employee.leaveBalances.map(b => {
      if (b.type === leaveType) {
        return { ...b, taken: b.taken + Number(amount) };
      }
      return b;
    });

    const updatedEmployee = {
      ...employee,
      leaveBalances: updatedBalances,
      leaveRequests: [newRequest, ...employee.leaveRequests]
    };

    onUpdateEmployee(updatedEmployee);
    setIsLeaveModalOpen(false);
    setStartDate('');
    setEndDate('');
    setAmount(1);
    onShowToast('Verlofaanvraag succesvol ingediend.');

    const manager = managers[0];
    if (manager) {
        const notification: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            recipientId: manager.id,
            senderName: employee.name,
            type: 'LeaveRequest',
            title: 'Nieuwe verlofaanvraag',
            message: `${employee.name} heeft ${amount} dagen ${leaveType} aangevraagd.`,
            date: 'Zojuist',
            read: false,
            targetView: ViewState.HOME,
            targetEmployeeId: employee.id
        };
        onAddNotification(notification);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const newNote: EmployeeNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: noteTitle,
      category: noteCategory,
      content: noteContent,
      date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
      author: employee.name,
      visibleToEmployee: noteVisible,
      impact: noteImpact,
      score: noteImpact === 'Neutral' ? 0 : (noteImpact === 'Negative' ? -Math.abs(noteScore) : Math.abs(noteScore))
    };
    const updatedEmployee = { ...employee, notes: [newNote, ...(employee.notes || [])] };
    onUpdateEmployee(updatedEmployee);
    setIsNoteModalOpen(false);
    setNoteTitle('');
    setNoteContent('');
    setNoteVisible(true);
    setNoteImpact('Neutral');
    setNoteScore(0);
    onShowToast('Notitie toegevoegd.');
  };

  // --- RESTORED CONTENT RENDERS ---

  const renderTimeOffContent = () => {
    const annualLeave = employee.leaveBalances.find(b => b.type === 'Annual Leave') || { entitled: 0, taken: 0 };
    const sickLeave = employee.leaveBalances.find(b => b.type === 'Sick Leave') || { entitled: 0, taken: 0 };
    
    const remaining = annualLeave.entitled - annualLeave.taken;
    const pieData = [
      { name: 'Opgenomen', value: annualLeave.taken, color: '#0f172a' }, // Slate 900
      { name: 'Resterend', value: remaining, color: '#0d9488' } // Teal 600
    ];

    return (
      <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Annual Leave Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-700">Vakantiedagen</h3>
                <p className="text-xs text-slate-400">Jaarlijks saldo</p>
              </div>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Calendar size={20} />
              </div>
            </div>
            
            <div className="flex items-end gap-4">
              <div className="relative w-24 h-24">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={35}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                        ))}
                      </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-900 text-lg">
                    {remaining}
                 </div>
              </div>
              <div>
                 <div className="text-3xl font-bold text-slate-900">{annualLeave.entitled}</div>
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Totaal Dagen</div>
                 <div className="mt-2 text-xs text-slate-500">
                    <span className="font-bold text-slate-900">{annualLeave.taken}</span> opgenomen
                 </div>
              </div>
            </div>
          </div>

          {/* Sick Leave Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-700">Verzuim</h3>
                <p className="text-xs text-slate-400">Ziektedagen dit jaar</p>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle size={20} />
              </div>
            </div>
            
            <div className="mt-4">
               <div className="text-4xl font-bold text-slate-900">{sickLeave.taken}</div>
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Dagen Ziek</div>
            </div>

            <div className="mt-6 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
               <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min((sickLeave.taken / 10) * 100, 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right">Bradford Factor: {Math.pow(sickLeave.taken, 2) * 1}</p>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => setIsLeaveModalOpen(true)}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Calendar size={18} />
          Verlof Aanvragen
        </button>

        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Aanvraag Historie</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-white border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Periode</th>
                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Dagen</th>
                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {employee.leaveRequests.length > 0 ? (
                    employee.leaveRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{req.type}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{req.startDate} - {req.endDate}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{req.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                            req.status === 'Approved' ? 'bg-green-50 text-green-700' :
                            req.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {req.status === 'Approved' ? 'Goedgekeurd' : req.status === 'Pending' ? 'In Behandeling' : 'Geweigerd'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                        Geen aanvragen gevonden.
                      </td>
                    </tr>
                  )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  };

  const renderDocumentsContent = () => (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Personeelsdossier</h3>
          <button 
             onClick={() => onChangeView(ViewState.DOCUMENTS)}
             className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
          >
             Alles bekijken
          </button>
       </div>
       <div className="divide-y divide-slate-100">
          {employee.documents && employee.documents.length > 0 ? (
            employee.documents.slice(0, 5).map(doc => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-teal-600 group-hover:shadow-sm transition-all">
                       <FileText size={20} />
                    </div>
                    <div>
                       <div className="font-bold text-slate-800 text-sm">{doc.name}</div>
                       <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">{doc.category}</span>
                          <span>• {doc.date}</span>
                       </div>
                    </div>
                 </div>
                 <button className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Download size={18} />
                 </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 italic">
               Geen documenten in dossier.
            </div>
          )}
       </div>
    </div>
  );

  const renderPerformanceReport = () => (
     <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Award className="text-teal-600" size={20}/>
              Recente Evaluaties
           </h3>
           <div className="space-y-4">
              {(employee.evaluations || []).length > 0 ? (
                 employee.evaluations?.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                             ev.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                             {ev.overallRating || '-'}
                          </div>
                          <div>
                             <div className="font-bold text-slate-900">{ev.type}</div>
                             <div className="text-xs text-slate-500">{ev.createdAt} • {ev.status}</div>
                          </div>
                       </div>
                       <button className="text-slate-400 hover:text-teal-600">
                          <ChevronRight size={20} />
                       </button>
                    </div>
                 ))
              ) : (
                 <p className="text-slate-500 italic text-sm">Nog geen evaluaties afgerond.</p>
              )}
           </div>
           <button 
             onClick={() => onChangeView(ViewState.EVALUATIONS)}
             className="w-full mt-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
           >
              Ga naar Performance Center
           </button>
        </div>
     </div>
  );

  const renderOnboardingCompact = () => {
     if (!employee.onboardingTasks || employee.onboardingTasks.length === 0) return null;
     
     const total = employee.onboardingTasks.length;
     const completed = employee.onboardingTasks.filter(t => t.score === 100).length;
     const progress = Math.round((completed / total) * 100);

     return (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-4">
               <div>
                  <h3 className="font-bold text-slate-900">Onboarding Voortgang</h3>
                  <p className="text-xs text-slate-500 mt-1">Huidig traject: {employee.role}</p>
               </div>
               <div className="text-3xl font-bold text-teal-600">{progress}%</div>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
               <div className="bg-teal-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="space-y-3">
               {employee.onboardingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-3 text-sm">
                     <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        task.score === 100 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'
                     }`}>
                        <CheckCircle2 size={12} />
                     </div>
                     <span className={task.score === 100 ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}>
                        {task.title}
                     </span>
                  </div>
               ))}
            </div>
            
            <button 
             onClick={() => onChangeView(ViewState.ONBOARDING)}
             className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition-colors shadow-md"
           >
              Bekijk volledig plan
           </button>
        </div>
     );
  };

  return (
    <div className="p-6 lg:p-8 w-full w-full mx-auto animate-in fade-in duration-500">
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative">
        <div className="h-32 md:h-48 relative group overflow-hidden bg-slate-900">
          {employee.banner ? (
            <img src={employee.banner} alt="Banner" className="w-full h-full object-cover opacity-90" />
          ) : (
             <div className="w-full h-full bg-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-teal-900/40 to-slate-900/40"></div>
             </div>
          )}
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500"></div>
          
          <button 
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-4 right-4 md:top-6 md:right-6 px-4 py-2 bg-white/90 hover:bg-white text-slate-800 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 backdrop-blur-md"
          >
            <ImageIcon size={14} />
            <span className="hidden sm:inline">Cover wijzigen</span>
          </button>
        </div>
        
        <div className="px-6 md:px-10 pb-2 relative">
          <div className="flex flex-col md:flex-row items-center md:items-start -mt-12 mb-8">
            <div className="relative md:mr-8 group mb-4 md:mb-0">
              <div className="relative">
                <div className="relative rounded-2xl border-4 border-white shadow-lg">
                    <img 
                    src={employee.avatar} 
                    alt={employee.name} 
                    className="w-32 h-32 md:w-36 md:h-36 rounded-xl object-cover bg-white"
                    />
                </div>
                
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer border-4 border-transparent"
                >
                  <Camera className="text-white" size={28} />
                </div>
              </div>
            </div>
            
            <div className="flex-1 pt-0 md:pt-4 md:mt-16 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-1.5 text-slate-900">
                  {employee.name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-6 mt-1 text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-slate-400" />
                  <span>{employee.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{employee.location}</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wide border border-slate-200">
                  {employee.department}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 md:gap-8 border-t border-slate-100 pt-1 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'border-teal-600 text-teal-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        {activeTab === 'Time off' && renderTimeOffContent()}
        {activeTab === 'Documenten' && renderDocumentsContent()}
        {activeTab === 'Evaluatie' && renderPerformanceReport()}
        {activeTab === 'Onboarding' && renderOnboardingCompact()}
        
        {(activeTab === 'Persoonlijk' || activeTab === 'Functie' || activeTab === 'Meer' || activeTab === 'Uren') && (
             <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                         <Briefcase size={32} />
                     </div>
                     <h3 className="font-bold text-slate-900 text-lg">Profiel Details</h3>
                     <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        De uitgebreide profiel details voor {activeTab} zijn momenteel in ontwikkeling.
                        Bekijk de andere tabbladen voor actuele informatie.
                     </p>
                 </div>
             </div>
        )}

        {/* Right Sidebar - Info */}
        <div className="lg:col-span-1 order-first lg:order-last">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8 sticky top-24">
            <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contactgegevens</h4>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm group">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                        <Mail size={18} />
                        </div>
                        <a href={`mailto:${employee.email}`} className="text-slate-700 hover:text-teal-600 font-medium truncate transition-colors">{employee.email}</a>
                    </div>

                    <div className="flex items-center gap-4 text-sm group">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Linkedin size={18} />
                        </div>
                        <a href="#" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">{employee.linkedin}</a>
                    </div>

                    <div className="flex items-center gap-4 text-sm group">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                        <Phone size={18} />
                        </div>
                        <span className="text-slate-700 font-medium">{employee.phone}</span>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dienstverband</h4>
                <div className="space-y-5">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Datum in dienst</div>
                        <div className="text-sm font-bold text-slate-900">{employee.hiredOn}</div>
                    </div>
                    
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Contract type</div>
                        <div className="text-sm font-bold text-slate-900">{employee.employmentType}</div>
                    </div>

                    <div>
                        <div className="text-xs text-slate-500 mb-1">Functie</div>
                        <div className="text-sm font-bold text-slate-900">{employee.role}</div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)}
        title={`Verlof aanvragen`}
      >
        <form onSubmit={handleRecordLeave} className="space-y-5">
           <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type Verlof</label>
               <select 
                 className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                 value={leaveType}
                 onChange={(e) => setLeaveType(e.target.value as any)}
               >
                   <option value="Annual Leave">Vakantie (Annual Leave)</option>
                   <option value="Sick Leave">Ziekte (Sick Leave)</option>
                   <option value="Without Pay">Onbetaald Verlof</option>
               </select>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Van</label>
                   <input 
                     type="date" 
                     required
                     className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                   />
               </div>
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tot en met</label>
                   <input 
                     type="date" 
                     required
                     className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                   />
               </div>
           </div>

           <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aantal Dagen</label>
               <input 
                 type="number" 
                 step="0.5"
                 min="0.5"
                 required
                 className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                 value={amount}
                 onChange={(e) => setAmount(Number(e.target.value))}
               />
           </div>

           <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors">
               Aanvraag Versturen
           </button>
        </form>
      </Modal>

      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Notitie toevoegen"
      >
        <form onSubmit={handleAddNote} className="space-y-5">
             {/* Form content same as DocumentPage for consistency */}
             <p className="text-slate-500 italic">Notitie functionaliteit is beschikbaar via het tabblad 'Documenten'.</p>
             <button type="button" onClick={() => setIsNoteModalOpen(false)} className="w-full py-2 border border-slate-200 rounded-lg font-bold text-slate-600">Sluiten</button>
        </form>
      </Modal>

    </div>
  );
};

export default EmployeeProfile;
