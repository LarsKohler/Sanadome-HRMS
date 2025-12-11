
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardCheck, Calendar as CalendarIcon, User, ArrowRight, CheckCircle2, 
    MessageSquare, Star, Lock, Unlock, TrendingUp, TrendingDown, 
    MoreVertical, Clock, Check, AlertCircle, Search, PenTool,
    ChevronRight, LayoutDashboard, History, Plus, Trash2, Edit2, Settings, AlertTriangle, FileText, Printer, Save, Copy, X, BarChart3, ChevronDown, ChevronLeft, Bell
} from 'lucide-react';
import { Employee, EvaluationCycle, Notification, ViewState, EvaluationStatus, EvaluationTemplate } from '../types';
import { hasPermission } from '../utils/permissions';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface EvaluationsPageProps {
  currentUser: Employee;
  employees: Employee[];
  onUpdateEmployee: (employee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
}

const getStatusLabel = (status: EvaluationStatus) => {
    switch (status) {
        case 'Planned': return 'Ingepland';
        case 'EmployeeInput': return 'Zelfreflectie';
        case 'ManagerInput': return 'Beoordeling Manager';
        case 'Review': return 'Bespreking';
        case 'Signed': return 'Afgerond';
        case 'Archived': return 'Gearchiveerd';
        default: return status;
    }
};

const getStatusStep = (status: EvaluationStatus) => {
    switch (status) {
        case 'Planned': return 0;
        case 'EmployeeInput': return 1;
        case 'ManagerInput': return 2;
        case 'Review': return 3;
        case 'Signed': 
        case 'Archived': return 4;
        default: return 0;
    }
};

const EvaluationsPage: React.FC<EvaluationsPageProps> = ({
  currentUser,
  employees,
  onUpdateEmployee,
  onAddNotification,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'planning' | 'templates' | 'archive'>('active');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Template State
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EvaluationTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ employeeId: '', templateId: '', date: '' });

  // Confirmation States
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteEvaluationId, setDeleteEvaluationId] = useState<{evalId: string, empId: string} | null>(null);

  const isManager = hasPermission(currentUser, 'MANAGE_EVALUATIONS');

  useEffect(() => {
      loadTemplates();
  }, []);

  const loadTemplates = async () => {
      const data = await api.getEvaluationTemplates();
      setTemplates(data);
  };

  // --- DATA PREPARATION ---

  const allEvaluations = useMemo(() => {
      const list: { evaluation: EvaluationCycle, employee: Employee }[] = [];
      employees.forEach(emp => {
          if (isManager || emp.id === currentUser.id) {
              (emp.evaluations || []).forEach(ev => {
                  list.push({ evaluation: ev, employee: emp });
              });
          }
      });
      // Sort by date desc
      return list.sort((a, b) => new Date(b.evaluation.createdAt).getTime() - new Date(a.evaluation.createdAt).getTime());
  }, [employees, isManager, currentUser.id]);

  const filteredList = useMemo(() => {
      return allEvaluations.filter(({ evaluation, employee }) => {
          const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || evaluation.type.toLowerCase().includes(searchTerm.toLowerCase());
          
          if (!matchesSearch) return false;

          if (activeTab === 'planning') return evaluation.status === 'Planned';
          if (activeTab === 'archive') return evaluation.status === 'Signed' || evaluation.status === 'Archived';
          if (activeTab === 'active') return ['EmployeeInput', 'ManagerInput', 'Review'].includes(evaluation.status);
          return false;
      });
  }, [allEvaluations, activeTab, searchTerm]);

  const selectedData = useMemo(() => {
      if (!selectedEvaluationId) return null;
      return allEvaluations.find(i => i.evaluation.id === selectedEvaluationId);
  }, [selectedEvaluationId, allEvaluations]);

  // --- CALENDAR LOGIC ---

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
      
      const res = [];
      // Add empty slots for days before start of month (Monday start)
      const emptySlots = firstDay === 0 ? 6 : firstDay - 1;
      for (let i = 0; i < emptySlots; i++) res.push(null);
      for (let i = 1; i <= days; i++) res.push(new Date(year, month, i));
      return res;
  };

  const changeMonth = (delta: number) => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // --- DRAG AND DROP LOGIC ---

  const handleDragStart = (e: React.DragEvent, evalId: string) => {
      e.dataTransfer.setData("text/plain", evalId);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
      e.preventDefault();
      const evalId = e.dataTransfer.getData("text/plain");
      
      const targetItem = allEvaluations.find(item => item.evaluation.id === evalId);
      if (!targetItem) return;

      const { evaluation, employee } = targetItem;
      const newDateStr = targetDate.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

      if (evaluation.plannedDate === newDateStr) return; // No change

      // Update Evaluation
      const updatedEval = { ...evaluation, plannedDate: newDateStr };
      const updatedEmployeeEvals = (employee.evaluations || []).map(ev => ev.id === evalId ? updatedEval : ev);
      const updatedEmployee = { ...employee, evaluations: updatedEmployeeEvals };

      // Optimistic Update
      onUpdateEmployee(updatedEmployee);
      await api.saveEvaluation(updatedEval);

      // Notification
      onShowToast(`Evaluatie verplaatst naar ${newDateStr}`);
      
      const notification: Notification = {
          id: crypto.randomUUID(),
          recipientId: employee.id, // Explicit recipient
          senderName: currentUser.name,
          type: 'Evaluation',
          title: '📅 Evaluatie Verplaatst',
          message: `Je geplande evaluatie is verplaatst naar ${newDateStr}.`,
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS,
          targetEmployeeId: employee.id,
          isPinned: true
      };
      
      // Use the passed handler to ensure state update + API save
      onAddNotification(notification);
  };

  // --- TEMPLATE MANAGEMENT ---

  const handleCreateTemplate = () => {
      const newTemplate: EvaluationTemplate = {
          id: crypto.randomUUID(),
          title: 'Nieuw Evaluatie Formulier',
          description: '',
          sections: [
              { id: crypto.randomUUID(), title: 'Algemene Vaardigheden', questions: [{ id: crypto.randomUUID(), text: 'Vraag 1' }] }
          ],
          createdAt: new Date().toLocaleDateString('nl-NL'),
          updatedAt: new Date().toLocaleDateString('nl-NL')
      };
      setEditingTemplate(newTemplate);
      setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
      if (!editingTemplate) return;
      await api.saveEvaluationTemplate(editingTemplate);
      await loadTemplates();
      setIsTemplateModalOpen(false);
      onShowToast("Template opgeslagen.");
  };

  const confirmDeleteTemplate = async () => {
      if (deleteTemplateId) {
          await api.deleteEvaluationTemplate(deleteTemplateId);
          await loadTemplates();
          setDeleteTemplateId(null);
          onShowToast("Template verwijderd.");
      }
  };

  const updateTemplateSection = (idx: number, field: string, value: any) => {
      if (!editingTemplate) return;
      const sections = [...editingTemplate.sections];
      sections[idx] = { ...sections[idx], [field]: value };
      setEditingTemplate({ ...editingTemplate, sections });
  };

  const addTemplateSection = () => {
      if (!editingTemplate) return;
      setEditingTemplate({
          ...editingTemplate,
          sections: [...editingTemplate.sections, { id: crypto.randomUUID(), title: 'Nieuwe Sectie', questions: [] }]
      });
  };

  const addTemplateQuestion = (sectionIdx: number) => {
      if (!editingTemplate) return;
      const sections = [...editingTemplate.sections];
      sections[sectionIdx].questions.push({ id: crypto.randomUUID(), text: 'Nieuwe vraag' });
      setEditingTemplate({ ...editingTemplate, sections });
  };

  const updateTemplateQuestion = (sectionIdx: number, qIdx: number, text: string) => {
      if (!editingTemplate) return;
      const sections = [...editingTemplate.sections];
      sections[sectionIdx].questions[qIdx].text = text;
      setEditingTemplate({ ...editingTemplate, sections });
  };

  // --- ASSIGNMENT LOGIC ---

  const handleAssignEvaluation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!assignForm.employeeId || !assignForm.templateId || !assignForm.date) return;

      const template = templates.find(t => t.id === assignForm.templateId);
      const employee = employees.find(emp => emp.id === assignForm.employeeId);
      
      if (!template || !employee) return;

      const scores = [];
      template.sections.forEach(section => {
          section.questions.forEach(q => {
              scores.push({
                  category: section.title,
                  topic: q.text,
                  employeeScore: 0,
                  managerScore: 0
              });
          });
      });

      const formattedDate = new Date(assignForm.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const newEvaluation: EvaluationCycle = {
          id: crypto.randomUUID(),
          employeeId: employee.id,
          managerId: currentUser.id,
          type: template.title,
          templateId: template.id,
          status: 'Planned',
          createdAt: new Date().toLocaleDateString('nl-NL'),
          plannedDate: formattedDate,
          scores: scores,
          goals: [],
          signatures: []
      };

      await api.saveEvaluation(newEvaluation);
      const updatedEvals = [...(employee.evaluations || []), newEvaluation];
      onUpdateEmployee({ ...employee, evaluations: updatedEvals });

      // Notify Employee
      const notification: Notification = {
          id: crypto.randomUUID(),
          recipientId: employee.id,
          senderName: currentUser.name,
          type: 'Evaluation',
          title: 'Nieuwe Evaluatie Gepland',
          message: `Er is een evaluatie (${template.title}) ingepland voor ${formattedDate}.`,
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS,
          targetEmployeeId: employee.id
      };
      
      onAddNotification(notification);

      setIsAssignModalOpen(false);
      onShowToast("Evaluatie ingepland!");
      setAssignForm({ employeeId: '', templateId: '', date: '' });
  };

  // --- EVALUATION ACTIONS ---

  const updateEvaluation = (employee: Employee, evaluationId: string, updates: Partial<EvaluationCycle>) => {
      const updatedEvaluations = (employee.evaluations || []).map(ev => 
          ev.id === evaluationId ? { ...ev, ...updates } : ev
      );
      const targetEval = updatedEvaluations.find(ev => ev.id === evaluationId);
      
      // DEEP COPY to ensure React state update works reliably
      const updatedEmployee = { ...employee, evaluations: updatedEvaluations };
      
      onUpdateEmployee(updatedEmployee);
      if (targetEval) api.saveEvaluation(targetEval);
  };

  const handleStartEarly = (data: { evaluation: EvaluationCycle, employee: Employee }) => {
      updateEvaluation(data.employee, data.evaluation.id, { status: 'EmployeeInput' });
      onShowToast("Evaluatie geopend. Medewerker heeft bericht ontvangen.");
      
      const notification: Notification = {
          id: crypto.randomUUID(),
          recipientId: data.employee.id,
          senderName: currentUser.name,
          type: 'Evaluation',
          title: '🚀 Evaluatie Gestart',
          message: 'Je evaluatie is vrijgegeven. Je kunt nu starten met je zelfreflectie.',
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS,
          targetEmployeeId: data.employee.id,
          isPinned: true
      };
      onAddNotification(notification);
  };

  const handleSubmitEmployee = () => {
      if (!selectedData) return;
      updateEvaluation(selectedData.employee, selectedData.evaluation.id, { status: 'ManagerInput' });
      onShowToast("Zelfreflectie ingediend.");
      
      const notification: Notification = {
          id: crypto.randomUUID(),
          recipientId: selectedData.evaluation.managerId,
          senderName: selectedData.employee.name,
          type: 'Evaluation',
          title: 'Zelfreflectie Ingediend',
          message: `${selectedData.employee.name} heeft de zelfreflectie afgerond. Jouw beurt.`,
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS
      };
      onAddNotification(notification);
  };

  const handleSubmitManager = () => {
      if (!selectedData) return;
      updateEvaluation(selectedData.employee, selectedData.evaluation.id, { status: 'Review' });
      onShowToast("Beoordeling opgeslagen. Klaar voor bespreking.");
      
      const notification: Notification = {
          id: crypto.randomUUID(),
          recipientId: selectedData.employee.id,
          senderName: currentUser.name,
          type: 'Evaluation',
          title: 'Evaluatie Beoordeeld',
          message: 'De manager heeft de evaluatie ingevuld. Het rapport is beschikbaar voor de bespreking.',
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS
      };
      onAddNotification(notification);
  };

  const handleSignOff = () => {
      if (!selectedData) return;
      const completedEval = { 
          ...selectedData.evaluation,
          status: 'Signed' as const,
          completedAt: new Date().toLocaleDateString('nl-NL')
      };
      
      const updatedEvals = (selectedData.employee.evaluations || []).map(ev => 
          ev.id === selectedData.evaluation.id ? completedEval : ev
      );
      
      onUpdateEmployee({ ...selectedData.employee, evaluations: updatedEvals });
      api.saveEvaluation(completedEval);
      onShowToast("Evaluatie afgerond en gearchiveerd.");
  };

  const confirmDeleteEvaluation = async () => {
      if (deleteEvaluationId) {
          const { evalId, empId } = deleteEvaluationId;
          const employee = employees.find(e => e.id === empId);
          if (employee) {
              const updatedEvals = (employee.evaluations || []).filter(e => e.id !== evalId);
              onUpdateEmployee({ ...employee, evaluations: updatedEvals });
              api.deleteEvaluation(evalId);
              onShowToast("Evaluatie verwijderd.");
              if (selectedEvaluationId === evalId) setSelectedEvaluationId(null);
          }
          setDeleteEvaluationId(null);
      }
  };

  const handleScoreChange = (index: number, field: string, value: any) => {
      if (!selectedData) return;
      const scores = [...selectedData.evaluation.scores];
      scores[index] = { ...scores[index], [field]: value };
      updateEvaluation(selectedData.employee, selectedData.evaluation.id, { scores });
  };

  const handleTextChange = (field: string, value: string) => {
      if (!selectedData) return;
      updateEvaluation(selectedData.employee, selectedData.evaluation.id, { [field]: value });
  };

  // --- RENDER HELPERS ---

  const renderCalendar = () => {
      const days = getDaysInMonth(currentMonth);
      const monthName = currentMonth.toLocaleString('nl-NL', { month: 'long', year: 'numeric' });
      
      // Get all upcoming planned items globally
      const allPlannedUpcoming = allEvaluations
        .filter(item => item.evaluation.status === 'Planned' && item.evaluation.plannedDate)
        .sort((a,b) => {
            // Helper to parse DD-MM-YYYY
            const parse = (d: string) => {
                const parts = d.split('-');
                return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0])).getTime();
            };
            return parse(a.evaluation.plannedDate!) - parse(b.evaluation.plannedDate!);
        })
        .filter(item => {
             // Only show future or today
             const parts = item.evaluation.plannedDate!.split('-');
             const d = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
             const today = new Date();
             today.setHours(0,0,0,0);
             return d >= today;
        });

      return (
          <div className="flex flex-col lg:flex-row h-full gap-6">
              
              {/* MAIN CALENDAR */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <h3 className="text-xl font-bold text-slate-900 capitalize flex items-center gap-2">
                              <CalendarIcon size={20} className="text-slate-400"/>
                              {monthName}
                          </h3>
                          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 hover:text-slate-800"><ChevronLeft size={18}/></button>
                              <div className="w-px bg-slate-200 my-1"></div>
                              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 hover:text-slate-800"><ChevronRight size={18}/></button>
                          </div>
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-3">
                          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm"></div> Gepland</span>
                          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div> Actief</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                      {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => (
                          <div key={d} className="py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{d}</div>
                      ))}
                  </div>

                  <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200">
                      {days.map((date, idx) => {
                          if (!date) return <div key={idx} className="bg-slate-50/30 min-h-[120px]"></div>;
                          
                          const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          const dayEvals = filteredList.filter(item => item.evaluation.plannedDate === dateStr);
                          const isToday = new Date().toDateString() === date.toDateString();

                          return (
                              <div 
                                key={idx} 
                                className={`bg-white p-2 min-h-[120px] relative transition-colors group flex flex-col
                                    ${isToday ? 'bg-blue-50/20' : 'hover:bg-slate-50'}
                                `}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, date)}
                              >
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>
                                          {date.getDate()}
                                      </span>
                                      {dayEvals.length > 0 && <span className="text-[9px] font-bold text-slate-300">{dayEvals.length} items</span>}
                                  </div>
                                  
                                  <div className="space-y-1.5 flex-1">
                                      {dayEvals.map(({ evaluation, employee }) => {
                                          const isActive = ['EmployeeInput', 'ManagerInput'].includes(evaluation.status);
                                          return (
                                              <div 
                                                key={evaluation.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, evaluation.id)}
                                                onClick={() => setSelectedEvaluationId(evaluation.id)}
                                                className={`
                                                    p-2 rounded-md border-l-4 text-xs shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md
                                                    bg-white border border-slate-100
                                                    ${isActive ? 'border-l-blue-500' : 'border-l-amber-400'}
                                                `}
                                              >
                                                  <div className="font-bold text-slate-800 truncate leading-tight">{employee.name}</div>
                                                  <div className="text-[9px] text-slate-400 truncate">{evaluation.type}</div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* UPCOMING SIDEBAR */}
              <div className="w-full lg:w-80 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[750px]">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                              <Clock size={16} className="text-slate-400"/> Aankomend
                          </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {allPlannedUpcoming.length > 0 ? (
                              allPlannedUpcoming.map(({evaluation, employee}) => (
                                  <div 
                                    key={evaluation.id}
                                    onClick={() => setSelectedEvaluationId(evaluation.id)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                                  >
                                      <div className="flex items-center gap-3 mb-2">
                                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 border border-slate-200">
                                              {employee.name.charAt(0)}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="font-bold text-slate-900 text-sm truncate">{employee.name}</div>
                                              <div className="text-xs text-slate-500 truncate">{employee.role}</div>
                                          </div>
                                      </div>
                                      <div className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg group-hover:bg-teal-50 transition-colors">
                                          <span className="font-medium text-slate-600">{evaluation.plannedDate}</span>
                                          <span className="text-slate-400 truncate max-w-[80px]">{evaluation.type}</span>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-10 px-4 text-slate-400 text-sm italic">
                                  Geen evaluaties gepland in de nabije toekomst.
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderReportView = (data: { evaluation: EvaluationCycle, employee: Employee }) => {
      const { evaluation, employee } = data;
      
      const totalScore = evaluation.scores.reduce((acc, s) => acc + (s.managerScore || 0), 0);
      const maxScore = evaluation.scores.length * 5;
      const percentage = Math.round((totalScore / maxScore) * 100);

      return (
          <div className="h-full bg-slate-50 p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto bg-white rounded-none md:rounded-2xl shadow-lg print:shadow-none print:w-full overflow-hidden">
                  <div className="p-8 border-b-4 border-teal-600 bg-slate-50 flex justify-between items-start print:bg-white">
                      <div>
                          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Evaluatie Rapport</h1>
                          <p className="text-slate-500 text-sm font-medium">{evaluation.type}</p>
                      </div>
                      <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">{employee.name}</div>
                          <div className="text-xs text-slate-500">{employee.role}</div>
                          <div className="mt-2 text-xs font-mono text-slate-400">Ref: {evaluation.id.slice(0,8)}</div>
                      </div>
                  </div>

                  <div className="p-8">
                      <div className="grid grid-cols-3 gap-6 mb-10">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Datum Afgerond</div>
                              <div className="font-bold text-slate-900">{evaluation.completedAt || '-'}</div>
                          </div>
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manager</div>
                              <div className="font-bold text-slate-900">{currentUser.name}</div>
                          </div>
                          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center">
                              <div className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">Score</div>
                              <div className="font-bold text-teal-800 text-xl">{percentage}% ({totalScore}/{maxScore})</div>
                          </div>
                      </div>

                      <div className="mb-10">
                          <h3 className="font-bold text-slate-900 text-lg mb-4 border-b border-slate-200 pb-2">Competenties</h3>
                          <div className="space-y-6">
                              {evaluation.scores.map((score, idx) => (
                                  <div key={idx} className="flex gap-4 items-start">
                                      <div className="w-1/3">
                                          <div className="text-xs font-bold text-slate-400 uppercase">{score.category}</div>
                                          <div className="font-bold text-slate-800">{score.topic}</div>
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                  <div 
                                                    className={`h-full ${score.managerScore >= 4 ? 'bg-green-500' : score.managerScore === 3 ? 'bg-amber-400' : 'bg-red-400'}`} 
                                                    style={{width: `${(score.managerScore / 5) * 100}%`}}
                                                  ></div>
                                              </div>
                                              <span className="font-bold text-slate-900 w-6 text-right">{score.managerScore}</span>
                                          </div>
                                          {score.managerComment && (
                                              <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                                                  "{score.managerComment}"
                                              </p>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-10">
                          <div>
                              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2"><TrendingUp size={16} className="text-green-600"/> Successen</h3>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{evaluation.managerWins || evaluation.employeeWins || 'Geen input.'}</p>
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2"><TrendingDown size={16} className="text-amber-600"/> Aandachtspunten</h3>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{evaluation.managerStruggles || evaluation.employeeStruggles || 'Geen input.'}</p>
                          </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-10">
                          <h3 className="font-bold text-slate-900 mb-2">Samenvatting & Conclusie</h3>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{evaluation.managerGeneralFeedback || 'Geen conclusie genoteerd.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-20 pt-10 border-t border-slate-200">
                          <div>
                              <div className="h-16 border-b border-slate-300 mb-2 relative">
                                  {evaluation.completedAt && (
                                      <div className="absolute bottom-2 left-0 font-handwriting text-2xl text-slate-600 transform -rotate-2">
                                          {currentUser.name}
                                      </div>
                                  )}
                              </div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Manager ({currentUser.name})</p>
                              <p className="text-xs text-slate-400">{evaluation.completedAt}</p>
                          </div>
                          <div>
                              <div className="h-16 border-b border-slate-300 mb-2 relative">
                                  {evaluation.completedAt && (
                                      <div className="absolute bottom-2 left-0 font-handwriting text-2xl text-slate-600 transform rotate-1">
                                          {employee.name}
                                      </div>
                                  )}
                              </div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Medewerker ({employee.name})</p>
                              <p className="text-xs text-slate-400">{evaluation.completedAt}</p>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div className="flex justify-center mt-8 gap-4 print:hidden pb-10">
                  <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                      <Printer size={18} /> Print Rapport
                  </button>
              </div>
          </div>
      );
  };

  const renderDetailOverlay = () => {
      if (!selectedData) return null;
      const { evaluation, employee } = selectedData;
      const step = getStatusStep(evaluation.status);
      const isMyProfile = employee.id === currentUser.id;
      const canEditEmployee = isMyProfile && evaluation.status === 'EmployeeInput';
      const canEditManager = isManager && evaluation.status === 'ManagerInput';
      const isReviewMode = evaluation.status === 'Review';

      return (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEvaluationId(null)}></div>
              <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  
                  {/* HEADER */}
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                      <div className="flex items-center gap-6">
                          <div className="relative">
                              <img src={employee.avatar} className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100" alt="Avatar"/>
                              <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-2 border-white ${evaluation.status === 'Signed' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                  {evaluation.status === 'Signed' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                              </div>
                          </div>
                          <div>
                              <h2 className="text-2xl font-bold text-slate-900">{evaluation.type}</h2>
                              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                  <User size={14}/> {employee.name}
                                  <span className="text-slate-300">•</span>
                                  <CalendarIcon size={14}/> {evaluation.plannedDate || evaluation.createdAt}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex gap-3 items-center">
                          {evaluation.status === 'Planned' && isManager && (
                              <button onClick={() => handleStartEarly(selectedData)} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow hover:bg-slate-800 transition-colors flex items-center gap-2">
                                  <Unlock size={16}/> Starten
                              </button>
                          )}
                          {canEditEmployee && (
                              <button onClick={handleSubmitEmployee} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl shadow hover:bg-blue-700 transition-colors flex items-center gap-2">
                                  Indienen <ArrowRight size={16}/>
                              </button>
                          )}
                          {canEditManager && (
                              <button onClick={handleSubmitManager} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl shadow hover:bg-purple-700 transition-colors flex items-center gap-2">
                                  Naar Bespreking <MessageSquare size={16}/>
                              </button>
                          )}
                          {isReviewMode && isManager && (
                              <button onClick={handleSignOff} className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-xl shadow hover:bg-green-700 transition-colors flex items-center gap-2">
                                  <CheckCircle2 size={16}/> Ondertekenen
                              </button>
                          )}
                          <div className="w-px h-8 bg-slate-100 mx-2"></div>
                          <button onClick={() => setSelectedEvaluationId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
                      </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/50">
                      {['Signed', 'Archived'].includes(evaluation.status) ? (
                          renderReportView(selectedData)
                      ) : (
                          <div className="p-8">
                              {/* Stepper */}
                              <div className="mb-10 max-w-3xl mx-auto">
                                  <div className="flex justify-between items-center relative">
                                      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
                                      <div className="absolute left-0 top-1/2 h-1 bg-blue-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${step * 25}%` }}></div>
                                      
                                      {['Ingepland', 'Zelfreflectie', 'Beoordeling', 'Bespreking', 'Afgerond'].map((label, idx) => {
                                          const active = idx <= step;
                                          return (
                                              <div key={idx} className="flex flex-col items-center gap-2 bg-slate-50/50 px-2">
                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                                      active ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 bg-white text-slate-300'
                                                  }`}>
                                                      {idx < step ? <Check size={16} strokeWidth={3}/> : <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-blue-500' : 'bg-slate-300'}`}></div>}
                                                  </div>
                                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>

                              {evaluation.status === 'Planned' ? (
                                  <div className="flex flex-col items-center justify-center py-20 text-center">
                                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                                          <Lock size={32} />
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-900">Nog even geduld</h3>
                                      <p className="text-slate-500 mt-2 mb-6 max-w-md">
                                          Deze evaluatie staat gepland voor <strong>{evaluation.plannedDate}</strong>. 
                                          Het formulier wordt automatisch vrijgegeven.
                                      </p>
                                  </div>
                              ) : (
                                  <div className="max-w-4xl mx-auto space-y-8">
                                      {/* Competencies */}
                                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                              <h4 className="font-bold text-slate-900">Competenties & Scores</h4>
                                              <div className="flex gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider mr-4">
                                                  <span className="w-24 text-center">Medewerker</span>
                                                  <span className="w-24 text-center">Manager</span>
                                              </div>
                                          </div>
                                          <div className="divide-y divide-slate-100">
                                              {evaluation.scores.map((score, idx) => (
                                                  <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                                                      <div className="flex justify-between items-start mb-4">
                                                          <div className="flex-1 pr-8">
                                                              <div className="text-xs font-bold text-slate-400 uppercase mb-1">{score.category}</div>
                                                              <div className="font-bold text-slate-900">{score.topic}</div>
                                                          </div>
                                                          <div className="flex gap-8">
                                                              {/* Employee Input */}
                                                              <div className="w-24 flex justify-center">
                                                                  {canEditEmployee ? (
                                                                      <select 
                                                                        value={score.employeeScore}
                                                                        onChange={(e) => handleScoreChange(idx, 'employeeScore', parseInt(e.target.value))}
                                                                        className="bg-slate-100 border-transparent rounded-lg font-bold text-slate-900 focus:ring-blue-500 cursor-pointer"
                                                                      >
                                                                          <option value="0">-</option>
                                                                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                                                      </select>
                                                                  ) : (
                                                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${score.employeeScore > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                                                          {score.employeeScore || '-'}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              {/* Manager Input */}
                                                              <div className="w-24 flex justify-center">
                                                                  {canEditManager ? (
                                                                      <select 
                                                                        value={score.managerScore}
                                                                        onChange={(e) => handleScoreChange(idx, 'managerScore', parseInt(e.target.value))}
                                                                        className="bg-slate-100 border-transparent rounded-lg font-bold text-slate-900 focus:ring-purple-500 cursor-pointer"
                                                                      >
                                                                          <option value="0">-</option>
                                                                          {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                                                      </select>
                                                                  ) : (
                                                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                                                                          evaluation.status === 'EmployeeInput' ? 'bg-slate-50 text-slate-200' :
                                                                          score.managerScore > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                                                                      }`}>
                                                                          {evaluation.status === 'EmployeeInput' ? '?' : score.managerScore || '-'}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          </div>
                                                      </div>
                                                      
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                          {(canEditEmployee || score.employeeComment) && (
                                                              <div className="relative">
                                                                  {canEditEmployee ? (
                                                                      <textarea 
                                                                        placeholder="Licht je score toe..."
                                                                        className="w-full bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-300 resize-none"
                                                                        rows={2}
                                                                        value={score.employeeComment || ''}
                                                                        onChange={(e) => handleScoreChange(idx, 'employeeComment', e.target.value)}
                                                                      />
                                                                  ) : (
                                                                      <div className="bg-blue-50/30 border border-blue-100 p-3 rounded-xl text-sm text-slate-600 italic">
                                                                          "{score.employeeComment}"
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          )}
                                                          {(canEditManager || (score.managerComment && evaluation.status !== 'EmployeeInput')) && (
                                                              <div className="relative">
                                                                  {canEditManager ? (
                                                                      <textarea 
                                                                        placeholder="Feedback manager..."
                                                                        className="w-full bg-purple-50/50 border border-purple-100 rounded-xl p-3 text-sm focus:outline-none focus:border-purple-300 resize-none"
                                                                        rows={2}
                                                                        value={score.managerComment || ''}
                                                                        onChange={(e) => handleScoreChange(idx, 'managerComment', e.target.value)}
                                                                      />
                                                                  ) : (
                                                                      <div className={`bg-purple-50/30 border border-purple-100 p-3 rounded-xl text-sm text-slate-600 italic ${evaluation.status === 'EmployeeInput' ? 'opacity-50 blur-sm' : ''}`}>
                                                                          {evaluation.status === 'EmployeeInput' ? "Feedback verborgen" : `"${score.managerComment}"`}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>

                                      {/* Open Questions */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                                              <div className="flex items-center gap-2 mb-4 text-green-700">
                                                  <TrendingUp size={20}/>
                                                  <h4 className="font-bold">Successen & Wins</h4>
                                              </div>
                                              {canEditEmployee ? (
                                                  <textarea 
                                                    className="w-full h-40 p-4 bg-green-50/30 border border-green-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 text-sm resize-none"
                                                    placeholder="Waar ben je trots op?"
                                                    value={evaluation.employeeWins || ''}
                                                    onChange={(e) => handleTextChange('employeeWins', e.target.value)}
                                                  />
                                              ) : (
                                                  <div className="p-4 bg-green-50/30 border border-green-100 rounded-xl text-sm text-slate-700 min-h-[160px]">
                                                      {evaluation.employeeWins || 'Geen input.'}
                                                  </div>
                                              )}
                                          </div>

                                          <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm">
                                              <div className="flex items-center gap-2 mb-4 text-amber-700">
                                                  <TrendingDown size={20}/>
                                                  <h4 className="font-bold">Uitdagingen</h4>
                                              </div>
                                              {canEditEmployee ? (
                                                  <textarea 
                                                    className="w-full h-40 p-4 bg-amber-50/30 border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm resize-none"
                                                    placeholder="Wat kon er beter?"
                                                    value={evaluation.employeeStruggles || ''}
                                                    onChange={(e) => handleTextChange('employeeStruggles', e.target.value)}
                                                  />
                                              ) : (
                                                  <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl text-sm text-slate-700 min-h-[160px]">
                                                      {evaluation.employeeStruggles || 'Geen input.'}
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      {(canEditManager || evaluation.managerGeneralFeedback) && (
                                          <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
                                              <h4 className="font-bold text-purple-900 mb-4">Samenvatting & Conclusie Manager</h4>
                                              {canEditManager ? (
                                                  <textarea 
                                                    className="w-full h-32 p-4 bg-purple-50/30 border border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm resize-none"
                                                    placeholder="Eindconclusie en afspraken..."
                                                    value={evaluation.managerGeneralFeedback || ''}
                                                    onChange={(e) => handleTextChange('managerGeneralFeedback', e.target.value)}
                                                  />
                                              ) : (
                                                  <div className={`p-4 bg-purple-50/30 border border-purple-100 rounded-xl text-sm text-slate-700 min-h-[128px] ${evaluation.status === 'EmployeeInput' ? 'blur-sm' : ''}`}>
                                                      {evaluation.managerGeneralFeedback || 'Nog geen conclusie.'}
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    <ClipboardCheck className="text-teal-600" size={32} />
                    Performance & Evaluaties
                </h1>
                <p className="text-slate-500 mt-1">Beheer functioneringsgesprekken en groei.</p>
            </div>

            <div className="flex items-center gap-3">
                {isManager && (
                    <>
                        <button 
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all"
                        >
                            <CalendarIcon size={16}/> Inplannen
                        </button>
                        <button 
                            onClick={handleCreateTemplate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm shadow-sm transition-all"
                        >
                            <Plus size={16}/> Nieuw Template
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* TABS & FILTERS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
            <div className="border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2">
                    {[
                        { id: 'active', label: 'Actief & Lopende' },
                        ...(isManager ? [{ id: 'planning', label: 'Planning & Kalender' }, { id: 'templates', label: 'Templates' }] : []),
                        { id: 'archive', label: 'Archief' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab !== 'templates' && activeTab !== 'planning' && (
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Zoek evaluatie..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                )}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 bg-slate-50/50 p-6 md:p-8 overflow-y-auto">
                
                {/* PLANNING CALENDAR */}
                {activeTab === 'planning' && (
                    renderCalendar()
                )}

                {/* TEMPLATES VIEW */}
                {activeTab === 'templates' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div 
                            onClick={handleCreateTemplate}
                            className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all min-h-[250px] group"
                        >
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 group-hover:scale-110 transition-transform">
                                <Plus size={32} />
                            </div>
                            <h3 className="font-bold text-slate-600 group-hover:text-teal-600">Nieuw Template</h3>
                        </div>
                        {templates.map(tpl => (
                            <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                                        <ClipboardCheck size={24} />
                                    </div>
                                    <button onClick={() => setDeleteTemplateId(tpl.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-2">{tpl.title}</h3>
                                <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[2.5rem]">{tpl.description || 'Geen beschrijving'}</p>
                                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">{tpl.sections.length} Secties</span>
                                    <button 
                                        onClick={() => { setEditingTemplate(tpl); setIsTemplateModalOpen(true); }}
                                        className="text-sm font-bold text-teal-600 hover:underline flex items-center gap-1"
                                    >
                                        <Edit2 size={14}/> Bewerken
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* LIST VIEWS (Active, Archive) */}
                {activeTab !== 'templates' && activeTab !== 'planning' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredList.map(({ evaluation, employee }) => {
                            const isPlanned = evaluation.status === 'Planned';
                            const isSigned = evaluation.status === 'Signed' || evaluation.status === 'Archived';
                            const statusColor = isPlanned ? 'bg-amber-100 text-amber-800' :
                                              isSigned ? 'bg-green-100 text-green-800' :
                                              evaluation.status === 'Review' ? 'bg-purple-100 text-purple-800' :
                                              'bg-blue-100 text-blue-800';

                            return (
                                <div 
                                    key={evaluation.id}
                                    onClick={() => setSelectedEvaluationId(evaluation.id)}
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-400 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    {isManager && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeleteEvaluationId({ evalId: evaluation.id, empId: employee.id }); }}
                                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    )}

                                    <div className="flex items-center gap-4 mb-4">
                                        <img src={employee.avatar} className="w-12 h-12 rounded-full object-cover border border-slate-100" alt="Avatar"/>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm leading-tight">{employee.name}</h4>
                                            <p className="text-xs text-slate-500">{evaluation.type}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-slate-50 pt-4 mt-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                                            {getStatusLabel(evaluation.status)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                            <CalendarIcon size={12}/> {evaluation.plannedDate || evaluation.createdAt}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredList.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                                <LayoutDashboard size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Geen evaluaties gevonden.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* DETAIL OVERLAY */}
        {renderDetailOverlay()}

        {/* MODALS */}
        {/* TEMPLATE EDITOR */}
        <Modal 
            isOpen={isTemplateModalOpen} 
            onClose={() => setIsTemplateModalOpen(false)} 
            title="Template Bewerken"
        >
            {editingTemplate && (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Titel</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg font-bold"
                            value={editingTemplate.title}
                            onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omschrijving</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg text-sm"
                            value={editingTemplate.description}
                            onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-4">
                        {editingTemplate.sections.map((section, sIdx) => (
                            <div key={section.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between mb-2">
                                    <input 
                                        className="bg-transparent font-bold text-slate-800 text-sm border-b border-transparent focus:border-blue-500 outline-none"
                                        value={section.title}
                                        onChange={(e) => updateTemplateSection(sIdx, 'title', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {section.questions.map((q, qIdx) => (
                                        <div key={q.id} className="flex gap-2">
                                            <input 
                                                className="flex-1 text-sm p-2 border rounded bg-white"
                                                value={q.text}
                                                onChange={(e) => updateTemplateQuestion(sIdx, qIdx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <button onClick={() => addTemplateQuestion(sIdx)} className="text-xs text-blue-600 font-bold hover:underline">+ Vraag Toevoegen</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={addTemplateSection} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-bold text-xs hover:border-blue-400 hover:text-blue-600">
                            + Sectie Toevoegen
                        </button>
                    </div>

                    <button onClick={handleSaveTemplate} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Opslaan</button>
                </div>
            )}
        </Modal>

        {/* ASSIGNMENT MODAL */}
        <Modal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            title="Evaluatie Inplannen"
        >
            <form onSubmit={handleAssignEvaluation} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Medewerker</label>
                    <select 
                        className="w-full p-3 border rounded-xl bg-white"
                        value={assignForm.employeeId}
                        onChange={(e) => setAssignForm({...assignForm, employeeId: e.target.value})}
                        required
                    >
                        <option value="">Selecteer medewerker...</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Template</label>
                    <select 
                        className="w-full p-3 border rounded-xl bg-white"
                        value={assignForm.templateId}
                        onChange={(e) => setAssignForm({...assignForm, templateId: e.target.value})}
                        required
                    >
                        <option value="">Selecteer formulier...</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Geplande Datum</label>
                    <input 
                        type="date"
                        className="w-full p-3 border rounded-xl"
                        value={assignForm.date}
                        onChange={(e) => setAssignForm({...assignForm, date: e.target.value})}
                        required
                    />
                </div>
                <button type="submit" className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">Inplannen</button>
            </form>
        </Modal>

        {/* DELETE CONFIRMATION MODALS */}
        <Modal
            isOpen={!!deleteTemplateId}
            onClose={() => setDeleteTemplateId(null)}
            title="Template Verwijderen"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">Weet je zeker dat je dit evaluatie template wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setDeleteTemplateId(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Annuleren</button>
                    <button onClick={confirmDeleteTemplate} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-red-700 transition-colors">Verwijderen</button>
                </div>
            </div>
        </Modal>

        <Modal
            isOpen={!!deleteEvaluationId}
            onClose={() => setDeleteEvaluationId(null)}
            title="Evaluatie Verwijderen"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">Weet je zeker dat je deze evaluatie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setDeleteEvaluationId(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Annuleren</button>
                    <button onClick={confirmDeleteEvaluation} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-red-700 transition-colors">Verwijderen</button>
                </div>
            </div>
        </Modal>

    </div>
  );
};

export default EvaluationsPage;
