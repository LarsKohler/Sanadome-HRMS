
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    ClipboardCheck, Calendar, User, ArrowRight, CheckCircle2, 
    MessageSquare, Star, Lock, Unlock, TrendingUp, TrendingDown, 
    MoreVertical, Clock, Check, AlertCircle, Search, Filter, PenTool,
    ChevronRight, LayoutDashboard, History, Plus, Trash2, Edit2, Settings, AlertTriangle, FileText, Printer, Save, Copy
} from 'lucide-react';
import { Employee, EvaluationCycle, Notification, ViewState, EvaluationStatus, EvaluationTemplate, EvaluationTemplateSection } from '../types';
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
  const [activeTab, setActiveTab] = useState<'active' | 'planning' | 'templates' | 'archive'>('active');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Management State
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // Template State
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EvaluationTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ employeeId: '', templateId: '', date: '' });

  // Edit Evaluation Meta Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
      id: string;
      type: string;
      plannedDate: string;
      status: EvaluationStatus;
  } | null>(null);

  const isManager = hasPermission(currentUser, 'MANAGE_EVALUATIONS');

  useEffect(() => {
      loadTemplates();
  }, []);

  const loadTemplates = async () => {
      const data = await api.getEvaluationTemplates();
      setTemplates(data);
  };

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
          if (activeTab === 'active') return ['EmployeeInput', 'ManagerInput', 'Review'].includes(evaluation.status);
          return false;
      });
  }, [allEvaluations, activeTab, searchTerm]);

  const selectedData = useMemo(() => {
      if (!selectedEvaluationId) return null;
      return allEvaluations.find(i => i.evaluation.id === selectedEvaluationId);
  }, [selectedEvaluationId, allEvaluations]);

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

  const handleDeleteTemplate = async (id: string) => {
      if (confirm("Weet je zeker dat je dit template wilt verwijderen?")) {
          await api.deleteEvaluationTemplate(id);
          await loadTemplates();
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

      // Transform Template to Scores
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

      const newEvaluation: EvaluationCycle = {
          id: crypto.randomUUID(),
          employeeId: employee.id,
          managerId: currentUser.id,
          type: template.title, // Store title for display
          templateId: template.id,
          status: 'Planned',
          createdAt: new Date().toLocaleDateString('nl-NL'),
          plannedDate: new Date(assignForm.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          scores: scores,
          goals: [],
          signatures: [],
          developmentPlan: []
      };

      // Save
      await api.saveEvaluation(newEvaluation);
      const updatedEvals = [...(employee.evaluations || []), newEvaluation];
      onUpdateEmployee({ ...employee, evaluations: updatedEvals });

      setIsAssignModalOpen(false);
      onShowToast("Evaluatie ingepland!");
      setAssignForm({ employeeId: '', templateId: '', date: '' });
  };

  // --- EXISTING LOGIC (UPDATED) ---

  const updateEvaluation = (employee: Employee, evaluationId: string, updates: Partial<EvaluationCycle>) => {
      const updatedEvaluations = (employee.evaluations || []).map(ev => 
          ev.id === evaluationId ? { ...ev, ...updates } : ev
      );
      const targetEval = updatedEvaluations.find(ev => ev.id === evaluationId);
      onUpdateEmployee({ ...employee, evaluations: updatedEvaluations });
      if (targetEval) api.saveEvaluation(targetEval);
  };

  const handleStartEarly = (data: { evaluation: EvaluationCycle, employee: Employee }) => {
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

  // --- VIEWS ---

  const renderTemplates = () => (
      <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                onClick={handleCreateTemplate}
                className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all min-h-[250px]"
              >
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                      <Plus size={32} />
                  </div>
                  <h3 className="font-bold text-slate-600">Nieuw Template</h3>
              </div>
              {templates.map(tpl => (
                  <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                              <ClipboardCheck size={24} />
                          </div>
                          <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg mb-2">{tpl.title}</h3>
                      <p className="text-sm text-slate-500 mb-6 line-clamp-2">{tpl.description || 'Geen beschrijving'}</p>
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
      </div>
  );

  const renderReportView = (data: { evaluation: EvaluationCycle, employee: Employee }) => {
      const { evaluation, employee } = data;
      
      const totalScore = evaluation.scores.reduce((acc, s) => acc + (s.managerScore || 0), 0);
      const maxScore = evaluation.scores.length * 5;
      const percentage = Math.round((totalScore / maxScore) * 100);

      return (
          <div className="h-full bg-slate-50 p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto bg-white rounded-none md:rounded-2xl shadow-lg print:shadow-none print:w-full overflow-hidden">
                  
                  {/* Report Header */}
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
                      {/* Summary Stats */}
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

                      {/* Scores List */}
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

                      {/* Feedback Sections */}
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

                      {/* Conclusion */}
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-10">
                          <h3 className="font-bold text-slate-900 mb-2">Samenvatting & Conclusie</h3>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{evaluation.managerGeneralFeedback || 'Geen conclusie genoteerd.'}</p>
                      </div>

                      {/* Signatures */}
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
              
              <div className="flex justify-center mt-8 gap-4 print:hidden">
                  <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                      <Printer size={18} /> Print Rapport
                  </button>
              </div>
          </div>
      );
  };

  const renderDetailView = () => {
      if (!selectedData) return null;
      
      const { evaluation, employee } = selectedData;
      
      // If signed, show report
      if (['Signed', 'Archived'].includes(evaluation.status)) {
          return renderReportView(selectedData);
      }

      const step = getStatusStep(evaluation.status);
      const isMyProfile = employee.id === currentUser.id;
      
      const canEditEmployee = isMyProfile && evaluation.status === 'EmployeeInput';
      const canEditManager = isManager && evaluation.status === 'ManagerInput';
      const isReviewMode = evaluation.status === 'Review';

      return (
          <div className="h-full flex flex-col bg-white">
              {/* Interactive Form Header */}
              <div className="p-6 border-b border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                          <img src={employee.avatar} className="w-16 h-16 rounded-xl object-cover border border-slate-100" />
                          <div>
                              <h2 className="text-2xl font-bold text-slate-900">{evaluation.type}</h2>
                              <div className="flex items-center gap-2 text-slate-500 text-sm">
                                  <User size={14}/> {employee.name}
                                  <span className="text-slate-300">•</span>
                                  <Calendar size={14}/> {evaluation.plannedDate || evaluation.createdAt}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex gap-3 items-center">
                          {evaluation.status === 'Planned' && isManager && (
                              <button onClick={() => handleStartEarly(selectedData)} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow hover:bg-slate-800 transition-colors flex items-center gap-2">
                                  <Unlock size={16}/> Vervroegd Starten
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
                                  <CheckCircle2 size={16}/> Ondertekenen & Afronden
                              </button>
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

              {/* Form Content */}
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
                                                  {/* Manager Input */}
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
                                              {/* Mgr Comment - Hidden during employee input */}
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
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800">Evaluaties</h2>
                    {isManager && (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{filteredList.length}</span>
                    )}
                </div>
                
                {/* Tabs */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                        Actief
                    </button>
                    {isManager && (
                        <>
                            <button 
                                onClick={() => setActiveTab('planning')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'planning' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                            >
                                Planning
                            </button>
                            <button 
                                onClick={() => setActiveTab('templates')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'templates' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                            >
                                Templates
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setActiveTab('archive')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'archive' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                        Archief
                    </button>
                </div>

                {activeTab !== 'templates' && (
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
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'templates' ? (
                    <div className="p-4 space-y-2">
                        <button 
                            onClick={handleCreateTemplate}
                            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm mb-4"
                        >
                            + Nieuw Template
                        </button>
                        {templates.map(tpl => (
                            <div key={tpl.id} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer text-sm" onClick={() => { setEditingTemplate(tpl); setIsTemplateModalOpen(true); }}>
                                <div className="font-bold text-slate-900">{tpl.title}</div>
                                <div className="text-xs text-slate-500">{tpl.sections.length} secties</div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'planning' ? (
                    <div className="p-4 space-y-2">
                        <button 
                            onClick={() => setIsAssignModalOpen(true)}
                            className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm mb-4"
                        >
                            + Evaluatie Inplannen
                        </button>
                        {filteredList.map(item => (
                            <div 
                                key={item.evaluation.id}
                                onClick={() => setSelectedEvaluationId(item.evaluation.id)}
                                className={`p-3 border-l-4 rounded cursor-pointer ${selectedEvaluationId === item.evaluation.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="font-bold text-sm">{item.employee.name}</div>
                                <div className="text-xs text-slate-500">{item.evaluation.type}</div>
                                <div className="text-xs text-slate-400 mt-1">{item.evaluation.plannedDate}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    filteredList.map(item => (
                        <div 
                            key={item.evaluation.id}
                            onClick={() => setSelectedEvaluationId(item.evaluation.id)}
                            className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedEvaluationId === item.evaluation.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-900 text-sm">{item.employee.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">{item.evaluation.type}</span>
                                <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                                    item.evaluation.status === 'EmployeeInput' ? 'bg-amber-100 text-amber-700' :
                                    item.evaluation.status === 'ManagerInput' ? 'bg-purple-100 text-purple-700' :
                                    item.evaluation.status === 'Review' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {getStatusLabel(item.evaluation.status)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'templates' ? (
                renderTemplates()
            ) : selectedData ? (
                renderDetailView()
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <LayoutDashboard size={48} className="mb-4 opacity-20"/>
                    <p>Selecteer een item uit de lijst.</p>
                </div>
            )}
        </div>

        {/* --- MODALS --- */}

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

    </div>
  );
};

export default EvaluationsPage;
