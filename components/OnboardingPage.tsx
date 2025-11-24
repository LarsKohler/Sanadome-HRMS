
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, CheckCircle2, User, ChevronDown, MessageSquare, Save, PlayCircle, Eye, EyeOff, Calendar, Clock, Trophy, Check, ArrowRight, Circle } from 'lucide-react';
import { Employee, OnboardingTask, Notification, ViewState, OnboardingWeekData } from '../types';

interface OnboardingPageProps {
  employees: Employee[];
  currentUser: Employee;
  onUpdateEmployee: (employee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
}

const CircularScoreSelector = ({ score, onChange, readOnly }: { score: number, onChange: (newScore: number) => void, readOnly: boolean }) => {
    return (
        <div className="relative w-12 h-12 flex items-center justify-center group shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                    className="text-slate-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                />
                <path
                    className={`${score === 100 ? 'text-green-500' : score > 0 ? 'text-teal-500' : 'text-transparent'} transition-all duration-500 ease-out`}
                    strokeDasharray={`${score}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                />
            </svg>
            
            {!readOnly && (
                <div className="absolute inset-0 flex flex-wrap opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 bg-white/50 backdrop-blur-[1px] rounded-full">
                    <div className="w-1/2 h-1/2" onClick={() => onChange(score === 100 ? 0 : 100)} title="100%"></div>
                    <div className="w-1/2 h-1/2" onClick={() => onChange(score === 25 ? 0 : 25)} title="25%"></div>
                    <div className="w-1/2 h-1/2" onClick={() => onChange(score === 75 ? 0 : 75)} title="75%"></div>
                    <div className="w-1/2 h-1/2" onClick={() => onChange(score === 50 ? 0 : 50)} title="50%"></div>
                </div>
            )}
            
             {score > 0 && score < 100 && (
                 <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 select-none pointer-events-none">
                     {score}
                 </div>
             )}
             {score === 100 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <CheckCircle2 size={20} className="text-green-500 fill-white bg-white rounded-full" />
                 </div>
             )}
             {score === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <Circle size={20} className="text-slate-200" />
                 </div>
             )}
        </div>
    );
};

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  employees,
  currentUser,
  onUpdateEmployee,
  onAddNotification,
  onShowToast
}) => {
  const isManager = currentUser.role === 'Manager';
  const isSenior = currentUser.role === 'Senior Medewerker';
  const canEdit = isManager || isSenior;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [openTaskNoteId, setOpenTaskNoteId] = useState<string | null>(null); 
  const [isEmployeeSelectorOpen, setIsEmployeeSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isManager && employees.length > 0 && selectedEmployeeId === currentUser.id) {
        setSelectedEmployeeId(employees[0].id);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsEmployeeSelectorOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || currentUser;

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (!isManager && !isSenior) {
      return list.filter(e => e.id === currentUser.id);
    }
    if (searchTerm) {
      list = list.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return list;
  }, [employees, searchTerm, isManager, isSenior, currentUser.id]);

  const tasksByWeek = useMemo(() => {
    const tasks = selectedEmployee.onboardingTasks || [];
    const grouped: Record<number, OnboardingTask[]> = { 1: [], 2: [], 3: [], 4: [] };
    tasks.forEach(t => {
        if (grouped[t.week]) grouped[t.week].push(t);
    });
    return grouped;
  }, [selectedEmployee]);

  const progress = useMemo(() => {
      const tasks = selectedEmployee.onboardingTasks || [];
      if (tasks.length === 0) return 0;
      const totalScore = tasks.reduce((acc, t) => acc + (t.score || 0), 0);
      return Math.round(totalScore / tasks.length);
  }, [selectedEmployee]);

  // Determine current active week based on completion
  const activeWeek = useMemo(() => {
      for(let w = 1; w <= 4; w++) {
          const tasks = tasksByWeek[w] || [];
          if (tasks.some(t => t.score !== 100)) return w;
      }
      return 4; // All done
  }, [tasksByWeek]);

  const handleScoreChange = (taskId: string, score: number) => {
      if (!canEdit) return;
      
      const updatedTasks = (selectedEmployee.onboardingTasks || []).map(t => {
        if (t.id === taskId) {
            const isCompleted = score === 100;
            return {
                ...t,
                score: score,
                completed: isCompleted,
                completedBy: score > 0 ? currentUser.name : undefined,
                completedDate: score > 0 ? new Date().toLocaleDateString('nl-NL') : undefined
            };
        }
        return t;
    });

    const updatedEmployee = { ...selectedEmployee, onboardingTasks: updatedTasks };
    onUpdateEmployee(updatedEmployee);

    if (score === 100) {
        if (selectedEmployee.id !== currentUser.id) {
             const taskTitle = selectedEmployee.onboardingTasks.find(t => t.id === taskId)?.title;
             const notification: Notification = {
                id: Math.random().toString(36).substr(2, 9),
                recipientId: selectedEmployee.id,
                senderName: currentUser.name,
                type: 'Onboarding',
                title: 'Taak afgerond',
                message: `${currentUser.name} heeft "${taskTitle}" afgevinkt.`,
                date: 'Zojuist',
                read: false,
                targetView: ViewState.ONBOARDING
             };
             onAddNotification(notification);
        }
    }
  };

  const handleUpdateTaskNote = (taskId: string, note: string) => {
      const updatedTasks = (selectedEmployee.onboardingTasks || []).map(t => {
        if (t.id === taskId) {
            return { ...t, notes: note };
        }
        return t;
      });
      onUpdateEmployee({ ...selectedEmployee, onboardingTasks: updatedTasks });
  };

  const handleToggleNoteVisibility = (taskId: string) => {
      const updatedTasks = (selectedEmployee.onboardingTasks || []).map(t => {
        if (t.id === taskId) {
            const newVisibility = !t.notesVisibleToEmployee;
            return { ...t, notesVisibleToEmployee: newVisibility };
        }
        return t;
      });
      onUpdateEmployee({ ...selectedEmployee, onboardingTasks: updatedTasks });
  };

  const handleUpdateWeekNote = (week: number, note: string) => {
      const existingWeeks = selectedEmployee.onboardingWeeks || [];
      let updatedWeeks = [...existingWeeks];
      const weekIndex = updatedWeeks.findIndex(w => w.week === week);
      
      if (weekIndex >= 0) {
          updatedWeeks[weekIndex] = { ...updatedWeeks[weekIndex], managerNotes: note };
      } else {
          updatedWeeks.push({ week, managerNotes: note, status: 'Open' });
      }

      onUpdateEmployee({ ...selectedEmployee, onboardingWeeks: updatedWeeks });
  };

  const getWeekData = (week: number): OnboardingWeekData | undefined => {
      return (selectedEmployee.onboardingWeeks || []).find(w => w.week === week);
  };

  const handleChangeStatus = (status: 'Active' | 'Completed' | 'Pending') => {
      const updatedEmployee = { ...selectedEmployee, onboardingStatus: status };
      onUpdateEmployee(updatedEmployee);
      onShowToast(status === 'Active' ? 'Onboarding gestart!' : status === 'Completed' ? 'Onboarding afgerond!' : 'Status gewijzigd');
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full animate-in fade-in duration-500 max-w-[2400px] mx-auto min-h-[calc(100vh-80px)]">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Onboarding & Groei</h1>
           <p className="text-slate-500 mt-1">Begeleid nieuwe collega's naar een succesvolle start.</p>
        </div>

        {(isManager || isSenior) && (
          <div className="relative z-20" ref={selectorRef}>
             <button 
                onClick={() => setIsEmployeeSelectorOpen(!isEmployeeSelectorOpen)}
                className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all min-w-[280px] justify-between group"
             >
                <div className="flex items-center gap-3">
                    <img src={selectedEmployee.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="Avatar"/>
                    <div className="text-left">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Geselecteerd</div>
                        <div className="text-sm font-bold text-slate-800">{selectedEmployee.name}</div>
                    </div>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isEmployeeSelectorOpen ? 'rotate-180' : ''}`} />
             </button>

             {isEmployeeSelectorOpen && (
                 <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                     <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Zoek medewerker..." 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                     </div>
                     <div className="max-h-[300px] overflow-y-auto">
                        {filteredEmployees.map(emp => (
                            <button
                                key={emp.id}
                                onClick={() => {
                                    setSelectedEmployeeId(emp.id);
                                    setIsEmployeeSelectorOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedEmployeeId === emp.id ? 'bg-teal-50/50' : ''}`}
                            >
                                <img src={emp.avatar} className="w-8 h-8 rounded-full object-cover" alt={emp.name}/>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-bold truncate ${selectedEmployeeId === emp.id ? 'text-teal-900' : 'text-slate-900'}`}>{emp.name}</div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                         {emp.role}
                                         {emp.onboardingStatus === 'Active' && <span className="w-2 h-2 bg-teal-500 rounded-full ml-1"></span>}
                                    </div>
                                </div>
                                {selectedEmployeeId === emp.id && <Check size={16} className="text-teal-600"/>}
                            </button>
                        ))}
                     </div>
                 </div>
             )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Column: Status Card */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-slate-900"></div>
                  
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="relative mb-4">
                          <img src={selectedEmployee.avatar} className="w-20 h-20 rounded-2xl object-cover shadow-sm border-2 border-white" alt="Avatar"/>
                          <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-2 border-white ${selectedEmployee.onboardingStatus === 'Active' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              {selectedEmployee.onboardingStatus === 'Completed' ? <Trophy size={14}/> : <Clock size={14}/>}
                          </div>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h2>
                      <p className="text-sm text-slate-500 font-medium">{selectedEmployee.role}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Mentor</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.mentor || 'Geen'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Startdatum</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.hiredOn}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Status</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedEmployee.onboardingStatus === 'Active' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                              {selectedEmployee.onboardingStatus || 'Pending'}
                          </span>
                      </div>
                  </div>

                  {canEdit && (
                      <div className="mt-8 pt-6 border-t border-slate-50">
                          {selectedEmployee.onboardingStatus === 'Active' ? (
                              <button onClick={() => handleChangeStatus('Completed')} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                  <Trophy size={16}/> Afronden
                              </button>
                          ) : selectedEmployee.onboardingStatus === 'Pending' ? (
                                <button onClick={() => handleChangeStatus('Active')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                    <PlayCircle size={16}/> Starten
                                </button>
                          ) : (
                                <button onClick={() => handleChangeStatus('Active')} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                                    Heropenen
                                </button>
                          )}
                      </div>
                  )}
              </div>

              {/* Progress Circle Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-6">
                  <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-teal-500 transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-slate-900">{progress}%</div>
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-900">Voortgang</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {progress === 100 ? "Onboarding compleet!" : "Blijf zo doorgaan."}
                      </p>
                  </div>
              </div>
          </div>

          {/* Right Column: Timeline Journey */}
          <div className="lg:col-span-3">
              {(selectedEmployee.onboardingStatus === 'Pending' && !canEdit) ? (
                 <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                         <Clock size={40} />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900">Nog niet gestart</h3>
                     <p className="text-slate-500 mt-2 max-w-sm mx-auto">De manager heeft het onboarding programma nog niet geactiveerd. Neem contact op met je leidinggevende.</p>
                 </div>
              ) : (
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[600px]">
                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-8 bottom-8 left-[19px] w-0.5 bg-slate-100 z-0"></div>

                        {[1, 2, 3, 4].map((week) => {
                            const tasks = tasksByWeek[week] || [];
                            const weekData = getWeekData(week);
                            const completedCount = tasks.filter(t => t.score === 100).length;
                            const totalCount = tasks.length;
                            const isAllDone = totalCount > 0 && completedCount === totalCount;
                            const isCurrent = activeWeek === week;
                            const isFuture = activeWeek < week;

                            return (
                                <div key={week} className={`relative z-10 mb-12 last:mb-0 ${isFuture ? 'opacity-50 grayscale' : ''}`}>
                                    {/* Timeline Node */}
                                    <div className="flex items-start gap-6">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-4 border-white flex-shrink-0
                                            ${isAllDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-teal-600 text-white ring-4 ring-teal-50' : 'bg-white text-slate-300 border-slate-100'}
                                        `}>
                                            {isAllDone ? <Check size={20} strokeWidth={3}/> : week}
                                        </div>
                                        
                                        <div className="flex-1 pt-1">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900">
                                                        Week {week}: {
                                                            week === 1 ? 'Introductie & Basis' :
                                                            week === 2 ? 'Gastencontact & Check-in' :
                                                            week === 3 ? 'Verdieping & Check-out' :
                                                            'Zelfstandigheid & Afronding'
                                                        }
                                                    </h3>
                                                    <p className="text-sm font-medium text-slate-400 mt-1">{completedCount}/{totalCount} taken afgerond</p>
                                                </div>
                                                {isAllDone && (
                                                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <CheckCircle2 size={12}/> Voltooid
                                                    </span>
                                                )}
                                            </div>

                                            {/* Tasks List */}
                                            <div className="space-y-3">
                                                {tasks.map(task => (
                                                    <div key={task.id} className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                                                        task.score === 100 
                                                        ? 'bg-slate-50 border-slate-100' 
                                                        : 'bg-white border-slate-200 hover:border-teal-200 hover:shadow-sm'
                                                    }`}>
                                                        <div className="mt-0.5">
                                                            <CircularScoreSelector 
                                                                score={task.score || 0} 
                                                                onChange={(val) => handleScoreChange(task.id, val)} 
                                                                readOnly={!canEdit}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{task.category}</span>
                                                                        {task.completedBy && (
                                                                            <span className="text-[10px] text-slate-400 font-medium">via {task.completedBy}</span>
                                                                        )}
                                                                    </div>
                                                                    <h4 className={`font-bold text-sm ${task.score === 100 ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                                        {task.title}
                                                                    </h4>
                                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {(canEdit || (task.notes && task.notesVisibleToEmployee)) && (
                                                                        <button 
                                                                            onClick={() => setOpenTaskNoteId(openTaskNoteId === task.id ? null : task.id)}
                                                                            className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${
                                                                                task.notes ? 'text-teal-600 bg-teal-50' : 'text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100'
                                                                            }`}
                                                                        >
                                                                            <MessageSquare size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Task Note / Feedback Area */}
                                                            {(openTaskNoteId === task.id || (task.notes && task.notesVisibleToEmployee && !isManager)) && (
                                                                <div className={`mt-3 pt-3 border-t border-dashed border-slate-200 animate-in slide-in-from-top-1 ${!openTaskNoteId && !task.notes ? 'hidden' : ''}`}>
                                                                    {canEdit ? (
                                                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1"><MessageSquare size={10}/> Feedback</span>
                                                                                <button 
                                                                                    onClick={() => handleToggleNoteVisibility(task.id)}
                                                                                    className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${task.notesVisibleToEmployee ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}
                                                                                >
                                                                                    {task.notesVisibleToEmployee ? <Eye size={10}/> : <EyeOff size={10}/>}
                                                                                    {task.notesVisibleToEmployee ? 'Openbaar' : 'Privé'}
                                                                                </button>
                                                                            </div>
                                                                            <textarea 
                                                                                className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                                                                rows={2}
                                                                                placeholder="Typ feedback..."
                                                                                value={task.notes || ''}
                                                                                onChange={(e) => handleUpdateTaskNote(task.id, e.target.value)}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                                            <span className="font-bold text-slate-400 block mb-1 text-[10px] uppercase tracking-wider">Notitie van Manager</span>
                                                                            <p className="text-xs text-slate-700 italic">"{task.notes}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Week Review Block */}
                                            {(!isFuture && !isAllDone) || (weekData?.managerNotes) ? (
                                                <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                        <MessageSquare size={14}/> Week Evaluatie
                                                    </h4>
                                                    {canEdit ? (
                                                        <div className="relative">
                                                            <textarea 
                                                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium text-slate-700 shadow-sm"
                                                                rows={2}
                                                                placeholder="Schrijf een korte evaluatie voor deze week..."
                                                                value={weekData?.managerNotes || ''}
                                                                onChange={(e) => handleUpdateWeekNote(week, e.target.value)}
                                                            />
                                                            <div className="absolute bottom-3 right-3">
                                                                <button onClick={() => onShowToast('Evaluatie opgeslagen')} className="p-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-white text-teal-600 shadow-sm transition-colors">
                                                                    <Save size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-slate-600 italic">
                                                            {weekData?.managerNotes || 'Nog geen evaluatie beschikbaar.'}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : null}

                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>
              )}
          </div>
      </div>

    </div>
  );
};

export default OnboardingPage;
