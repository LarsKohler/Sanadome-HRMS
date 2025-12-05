
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    ClipboardCheck, Calendar, User, ArrowRight, CheckCircle2, 
    MessageSquare, Star, Lock, Unlock, TrendingUp, TrendingDown, 
    MoreVertical, Clock, Check, AlertCircle, Search, Filter, PenTool,
    ChevronRight, LayoutDashboard, History, Plus, Trash2, Edit2, Settings, AlertTriangle
} from 'lucide-react';
import { Employee, EvaluationCycle, Notification, ViewState, EvaluationStatus } from '../types';
import { EVALUATION_TEMPLATES } from '../utils/mockData';
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

// Helper to parse DD-MM-YYYY
const parseNLDate = (dateStr?: string): Date => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
};

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
  const [activeTab, setActiveTab] = useState<'active' | 'planning' | 'archive'>('active');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Management State
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
      id: string;
      type: string;
      plannedDate: string;
      status: EvaluationStatus;
  } | null>(null);

  const isManager = hasPermission(currentUser, 'MANAGE_EVALUATIONS');

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
              setShowSettingsMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      return list.sort((a, b) => {
          // Sort by date descending usually, but for planning ascending
          const dateA = parseNLDate(a.evaluation.plannedDate || a.evaluation.createdAt);
          const dateB = parseNLDate(b.evaluation.plannedDate || b.evaluation.createdAt);
          return dateB.getTime() - dateA.getTime();
      });
  }, [employees, isManager, currentUser.id]);

  const filteredList = useMemo(() => {
      return allEvaluations.filter(({ evaluation, employee }) => {
          const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase());
          
          if (!matchesSearch) return false;

          if (activeTab === 'planning') return evaluation.status === 'Planned';
          if (activeTab === 'archive') return evaluation.status === 'Signed' || evaluation.status === 'Archived';
          // Active
          return ['EmployeeInput', 'ManagerInput', 'Review'].includes(evaluation.status);
      });
  }, [allEvaluations, activeTab, searchTerm]);

  const selectedData = useMemo(() => {
      if (!selectedEvaluationId) return null;
      return allEvaluations.find(i => i.evaluation.id === selectedEvaluationId);
  }, [selectedEvaluationId, allEvaluations]);

  // --- ACTIONS ---

  const updateEvaluation = (employee: Employee, evaluationId: string, updates: Partial<EvaluationCycle>) => {
      const updatedEvaluations = (employee.evaluations || []).map(ev => 
          ev.id === evaluationId ? { ...ev, ...updates } : ev
      );
      
      const targetEval = updatedEvaluations.find(ev => ev.id === evaluationId);
      
      // Update locally for smooth UI - Ensure we pass a full fresh object
      onUpdateEmployee({ ...employee, evaluations: updatedEvaluations });
      
      // Persist directly to DB table
      if (targetEval) {
          api.saveEvaluation(targetEval);
      }
  };

  // --- MANAGEMENT ACTIONS ---

  const handleDeleteEvaluation = async () => {
      if (!selectedData || !isManager) return;
      
      if (confirm(`Weet je zeker dat je de evaluatie van ${selectedData.employee.name} definitief wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
          const { evaluation, employee } = selectedData;
          
          // Remove from local state
          const updatedEvaluations = (employee.evaluations || []).filter(ev => ev.id !== evaluation.id);
          const updatedEmployee = { ...employee, evaluations: updatedEvaluations };
          
          // Optimistic update
          onUpdateEmployee(updatedEmployee);
          setSelectedEvaluationId(null);
          setShowSettingsMenu(false);
          
          // Delete from DB
          await api.deleteEvaluation(evaluation.id);
          onShowToast("Evaluatie succesvol verwijderd.");
      }
  };

  const handleEditOpen = () => {
      if (!selectedData) return;
      // Convert NL date to Input Date format (YYYY-MM-DD)
      const dateObj = parseNLDate(selectedData.evaluation.plannedDate || selectedData.evaluation.createdAt);
      // Fallback if parsing failed
      const safeDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();
      const isoDate = safeDate.toISOString().split('T')[0];

      setEditFormData({
          id: selectedData.evaluation.id,
          type: selectedData.evaluation.type,
          plannedDate: isoDate,
          status: selectedData.evaluation.status
      });
      setIsEditModalOpen(true);
      setShowSettingsMenu(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedData || !editFormData) return;

      const formattedDate = new Date(editFormData.plannedDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

      updateEvaluation(selectedData.employee, editFormData.id, {
          type: editFormData.type as any,
          plannedDate: formattedDate,
          status: editFormData.status
      });

      setIsEditModalOpen(false);
      onShowToast("Evaluatie details bijgewerkt.");
  };

  // --- WORKFLOW ACTIONS ---

  const handleStartEarly = (data: { evaluation: EvaluationCycle, employee: Employee }) => {
      // Force status update
      updateEvaluation(data.employee, data.evaluation.id, { status: 'EmployeeInput' });
      onShowToast("Evaluatie geopend. Medewerker heeft bericht ontvangen.");
      
      onAddNotification({
          id: crypto.randomUUID(),
          recipientId: data.employee.id,
          senderName: currentUser.name,
          type: 'Evaluation',
          title: 'Evaluatie Gestart',
          message: 'Je evaluatie is vrijgegeven. Je kunt nu starten met je zelfreflectie.',
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS
      });
  };

  const handleSubmitEmployee = () => {
      if (!selectedData) return;
      updateEvaluation(selectedData.employee, selectedData.evaluation.id, { status: 'ManagerInput' });
      onShowToast("Zelfreflectie ingediend.");
      
      onAddNotification({
          id: crypto.randomUUID(),
          recipientId: selectedData.evaluation.managerId,
          senderName: selectedData.employee.name,
          type: 'Evaluation',
          title: 'Zelfreflectie Ingediend',
          message: `${selectedData.employee.name} heeft de zelfreflectie afgerond. Jouw beurt.`,
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS
      });
  };

  const handleSubmitManager = () => {
      if (!selectedData) return;
      updateEvaluation(selectedData.employee, selectedData.evaluation.id, { status: 'Review' });
      onShowToast("Beoordeling opgeslagen. Klaar voor bespreking.");

      onAddNotification({
          id: crypto.randomUUID(),
          recipientId: selectedData.employee.id,
          senderName: currentUser.name,
          type: 'Evaluation',
          title: 'Evaluatie Beoordeeld',
          message: 'De manager heeft de evaluatie ingevuld. Het rapport is beschikbaar voor de bespreking.',
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS
      });
  };

  const handleSignOff = () => {
      if (!selectedData) return;
      
      // 1. Mark current as Signed
      const completedDate = new Date();
      
      // Create new updated object
      const completedEval = { 
          ...selectedData.evaluation,
          status: 'Signed' as const,
          completedAt: completedDate.toLocaleDateString('nl-NL')
      };

      // 2. Schedule NEXT cycle (+3 months)
      let nextEvaluation: EvaluationCycle | null = null;
      if (selectedData.evaluation.type === 'Quarterly' || selectedData.evaluation.type === 'Month 3') {
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 3);
          
          nextEvaluation = {
              id: crypto.randomUUID(),
              employeeId: selectedData.employee.id,
              managerId: currentUser.id,
              type: 'Quarterly',
              status: 'Planned',
              createdAt: new Date().toLocaleDateString('nl-NL'),
              plannedDate: nextDate.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              scores: EVALUATION_TEMPLATES.FRONT_OFFICE.map(t => ({ ...t, employeeScore: 0, managerScore: 0 })),
              goals: [],
              signatures: [],
              developmentPlan: []
          };
      }

      // Update Local State
      const updatedEvals = (selectedData.employee.evaluations || []).map(ev => 
          ev.id === selectedData.evaluation.id ? completedEval : ev
      );
      if (nextEvaluation) updatedEvals.push(nextEvaluation);

      const updatedEmployee = {
          ...selectedData.employee,
          evaluations: updatedEvals
      };
      
      onUpdateEmployee(updatedEmployee);
      
      // PERSIST DIRECTLY
      api.saveEvaluation(completedEval);
      if (nextEvaluation) api.saveEvaluation(nextEvaluation);

      if (nextEvaluation) {
          onShowToast("Evaluatie afgerond. De volgende cyclus is automatisch gepland.");
      } else {
          onShowToast("Evaluatie afgerond.");
      }
      
      setSelectedEvaluationId(null);
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

  const renderSidebarItem = (item: { evaluation: EvaluationCycle, employee: Employee }) => {
      const { evaluation, employee } = item;
      const isSelected = selectedEvaluationId === evaluation.id;
      const isPlanned = evaluation.status === 'Planned';
      
      let dateLabel = evaluation.createdAt;
      if (isPlanned && evaluation.plannedDate) dateLabel = `Gepland: ${evaluation.plannedDate}`;
      
      return (
          <div 
            key={evaluation.id}
            onClick={() => setSelectedEvaluationId(evaluation.id)}
            className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
          >
              <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-900 text-sm">{employee.name}</span>
                  {isPlanned && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {evaluation.type}
                      </span>
                  )}
              </div>
              <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{dateLabel}</span>
                  {!isPlanned && (
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                          evaluation.status === 'EmployeeInput' ? 'bg-amber-100 text-amber-700' :
                          evaluation.status === 'ManagerInput' ? 'bg-purple-100 text-purple-700' :
                          evaluation.status === 'Review' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                      }`}>
                          {getStatusLabel(evaluation.status)}
                      </span>
                  )}
              </div>
          </div>
      );
  };

  const renderDetailView = () => {
      if (!selectedData) {
          return (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <LayoutDashboard size={48} className="mb-4 opacity-20"/>
                  <p>Selecteer een evaluatie uit de lijst.</p>
              </div>
          );
      }

      const { evaluation, employee } = selectedData;
      const step = getStatusStep(evaluation.status);
      const isMyProfile = employee.id === currentUser.id;
      
      // Permission Checks
      const canEditEmployee = isMyProfile && evaluation.status === 'EmployeeInput';
      const canEditManager = isManager && evaluation.status === 'ManagerInput';
      const isReviewMode = evaluation.status === 'Review';
      const isReadOnly = evaluation.status === 'Signed' || evaluation.status === 'Archived';

      return (
          <div className="h-full flex flex-col bg-white">
              {/* Header */}
              <div className="p-6 border-b border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                          <img src={employee.avatar} className="w-16 h-16 rounded-xl object-cover border border-slate-100" />
                          <div>
                              <h2 className="text-2xl font-bold text-slate-900">{evaluation.type} Evaluatie</h2>
                              <div className="flex items-center gap-2 text-slate-500 text-sm">
                                  <User size={14}/> {employee.name}
                                  <span className="text-slate-300">•</span>
                                  <Calendar size={14}/> {evaluation.plannedDate || evaluation.createdAt}
                              </div>
                          </div>
                      </div>
                      
                      {/* Workflow & Management Actions */}
                      <div className="flex gap-3 items-center">
                          {evaluation.status === 'Planned' && isManager && (
                              <button 
                                onClick={() => handleStartEarly(selectedData)}
                                className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow hover:bg-slate-800 transition-colors flex items-center gap-2"
                              >
                                  <Unlock size={16}/> Vervroegd Starten
                              </button>
                          )}
                          
                          {canEditEmployee && (
                              <button 
                                onClick={handleSubmitEmployee}
                                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                  Indienen <ArrowRight size={16}/>
                              </button>
                          )}

                          {canEditManager && (
                              <button 
                                onClick={handleSubmitManager}
                                className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl shadow hover:bg-purple-700 transition-colors flex items-center gap-2"
                              >
                                  Naar Bespreking <MessageSquare size={16}/>
                              </button>
                          )}

                          {isReviewMode && isManager && (
                              <button 
                                onClick={handleSignOff}
                                className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-xl shadow hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                  <CheckCircle2 size={16}/> Ondertekenen & Afronden
                              </button>
                          )}

                          {/* MANAGER DROPDOWN */}
                          {isManager && (
                              <div className="relative ml-2" ref={settingsMenuRef}>
                                  <button 
                                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                      <MoreVertical size={20} />
                                  </button>
                                  {showSettingsMenu && (
                                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                          <button 
                                            onClick={handleEditOpen}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                          >
                                              <Edit2 size={14}/> Details Bewerken
                                          </button>
                                          <button 
                                            onClick={handleDeleteEvaluation}
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                                          >
                                              <Trash2 size={14}/> Verwijderen
                                          </button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Stepper */}
                  <div className="relative flex justify-between items-center max-w-3xl mx-auto">
                      <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                      <div className="absolute left-0 top-1/2 h-1 bg-blue-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${step * 25}%` }}></div>
                      
                      {['Ingepland', 'Zelfreflectie', 'Beoordeling', 'Bespreking', 'Afgerond'].map((label, idx) => {
                          const active = idx <= step;
                          return (
                              <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                      active ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-300'
                                  }`}>
                                      {idx < step ? <Check size={16} strokeWidth={3}/> : <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-blue-500' : 'bg-slate-300'}`}></div>}
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                  {evaluation.status === 'Planned' ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                              <Lock size={40} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Nog even geduld</h3>
                          <p className="text-slate-500 mt-2 mb-6">
                              Deze evaluatie staat gepland voor <strong>{evaluation.plannedDate}</strong>. 
                              Het formulier wordt 2 weken van tevoren automatisch vrijgegeven.
                          </p>
                          {isManager && (
                              <p className="text-xs text-slate-400 bg-white p-3 rounded-lg border border-slate-200">
                                  Als manager kun je dit proces nu al handmatig starten via de knop hierboven.
                              </p>
                          )}
                      </div>
                  ) : (
                      <div className="max-w-4xl mx-auto space-y-8">
                          
                          {/* Competencies Grid */}
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
                                                            className="bg-slate-100 border-transparent rounded-lg font-bold text-slate-900 focus:ring-blue-500"
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
                                                  {/* Manager Input (Hidden for Employee in early stage) */}
                                                  <div className="w-24 flex justify-center">
                                                      {canEditManager ? (
                                                          <select 
                                                            value={score.managerScore}
                                                            onChange={(e) => handleScoreChange(idx, 'managerScore', parseInt(e.target.value))}
                                                            className="bg-slate-100 border-transparent rounded-lg font-bold text-slate-900 focus:ring-purple-500"
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
                                          
                                          {/* Comments */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {/* Emp Comment */}
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
                                              {/* Mgr Comment */}
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
          </div>
      );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
        {/* SIDEBAR LIST */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800">Evaluaties</h2>
                    {isManager && (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{filteredList.length}</span>
                    )}
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                        Actief
                    </button>
                    {isManager && (
                        <button 
                            onClick={() => setActiveTab('planning')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'planning' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                        >
                            Planning
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('archive')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'archive' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                        Archief
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Zoek medewerker..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filteredList.length > 0 ? (
                    filteredList.map(renderSidebarItem)
                ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        Geen evaluaties gevonden.
                    </div>
                )}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-hidden">
            {renderDetailView()}
        </div>

        {/* EDIT MODAL */}
        <Modal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            title="Evaluatie Details Bewerken"
        >
            {editFormData && (
                <form onSubmit={handleSaveEdit} className="space-y-6">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 text-amber-800 text-sm">
                        <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                        <p>Let op: Het handmatig wijzigen van de status kan de workflow verstoren. Gebruik dit alleen indien nodig.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Datum</label>
                        <input 
                            type="date" 
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                            value={editFormData.plannedDate}
                            onChange={(e) => setEditFormData({...editFormData, plannedDate: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                        <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                            value={editFormData.type}
                            onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                        >
                            <option value="Quarterly">Kwartaal Evaluatie</option>
                            <option value="Annual">Jaarlijkse Beoordeling</option>
                            <option value="Month 1">Maand 1</option>
                            <option value="Month 3">Maand 3</option>
                            <option value="Performance">Performance Review</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status (Force Override)</label>
                        <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                            value={editFormData.status}
                            onChange={(e) => setEditFormData({...editFormData, status: e.target.value as EvaluationStatus})}
                        >
                            <option value="Planned">Planned (Ingepland)</option>
                            <option value="EmployeeInput">EmployeeInput (Zelfreflectie)</option>
                            <option value="ManagerInput">ManagerInput (Beoordeling)</option>
                            <option value="Review">Review (Bespreking)</option>
                            <option value="Signed">Signed (Afgerond)</option>
                            <option value="Archived">Archived (Gearchiveerd)</option>
                        </select>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                        Opslaan
                    </button>
                </form>
            )}
        </Modal>
    </div>
  );
};

export default EvaluationsPage;
