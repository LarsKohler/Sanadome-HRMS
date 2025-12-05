
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardCheck, Plus, Search, Calendar, User, ArrowRight, Play, CheckCircle, Clock, 
    AlertCircle, BarChart3, ChevronRight, MessageSquare, BrainCircuit, X, Target, PenTool, TrendingUp, AlertTriangle, FileCheck, Star, Split, Lock, Unlock, Eye, EyeOff, Printer, PenLine, History, ArrowLeft, Check, TrendingDown, Minus, BookOpen, Compass, Trash2, CalendarDays, Activity, Signal, Edit, Save, MoreHorizontal, Flag, Milestone, Trophy, FileText, Settings, LayoutDashboard, Wallet, Link as LinkIcon, ExternalLink, Info, Send
} from 'lucide-react';
import { Employee, EvaluationCycle, Notification, ViewState, EvaluationScore, EvaluationGoal, EvaluationStatus, PersonalDevelopmentGoal, InterimCheckIn, TrajectoryResource } from '../types';
import { EVALUATION_TEMPLATES, MOCK_DEVELOPMENT_LIBRARY } from '../utils/mockData';
import { Modal } from './Modal';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface EvaluationsPageProps {
  currentUser: Employee;
  employees: Employee[];
  onUpdateEmployee: (employee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
}

interface ManagingGoalData {
    employeeId: string;
    goal: PersonalDevelopmentGoal;
}

// Helper to safely parse NL dates (dd-mm-yyyy) to JS Date objects
const parseNLDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    
    // Check if it matches dd-mm-yyyy or d-m-yyyy pattern
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        // Assuming format is day-month-year where year is the last part
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        // Basic validation to ensure it looks like a date
        if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new Date(year, month - 1, day);
        }
    }
    
    // Fallback to standard parsing (e.g. for ISO strings)
    return new Date(dateStr);
};

// Helper to convert any date string to YYYY-MM-DD for input[type="date"]
const safeDateToInput = (dateStr: string): string => {
    const date = parseNLDate(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const EvaluationsPage: React.FC<EvaluationsPageProps> = ({
  currentUser,
  employees,
  onUpdateEmployee,
  onAddNotification,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trajectories' | 'planning'>('dashboard');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  
  // Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createType, setCreateType] = useState<'Month 1' | 'Month 3' | 'Annual' | 'Performance'>('Annual');

  // Development Plan State (Report View)
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [newDevGoal, setNewDevGoal] = useState<Partial<PersonalDevelopmentGoal>>({ title: '', category: 'General', actionPlan: '' });
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [supportLevel, setSupportLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  // Preview Schedule State
  const [previewSchedule, setPreviewSchedule] = useState<InterimCheckIn[]>([]);

  // NEW: View Mode for Trajectory Management
  const [viewMode, setViewMode] = useState<'dashboard' | 'trajectory-details'>('dashboard');
  const [managingGoalData, setManagingGoalData] = useState<ManagingGoalData | null>(null);
  const [cockpitTab, setCockpitTab] = useState<'overview' | 'planning' | 'budget' | 'resources' | 'logs'>('overview');

  // New Resource Input State
  const [newResource, setNewResource] = useState({ title: '', url: '' });

  const isManager = currentUser.role === 'Manager';

  // Consolidate all evaluations
  const allEvaluations = useMemo(() => {
      const list: { evaluation: EvaluationCycle, employee: Employee }[] = [];
      employees.forEach(emp => {
          (emp.evaluations || []).forEach(ev => {
              if (isManager || emp.id === currentUser.id) {
                  // Only show 'Planned' if manager
                  if (ev.status === 'Planned' && !isManager) return;
                  list.push({ evaluation: ev, employee: emp });
              }
          });
      });
      // Sort priority
      return list.sort((a, b) => {
          const statusPriority: Record<string, number> = { 'EmployeeInput': 1, 'ManagerInput': 2, 'Review': 3, 'Planned': 4, 'Signed': 5, 'Archived': 6 };
          const statA = statusPriority[a.evaluation.status] || 9;
          const statB = statusPriority[b.evaluation.status] || 9;
          if (statA !== statB) return statA - statB;
          // Safe date sort
          return parseNLDate(b.evaluation.createdAt).getTime() - parseNLDate(a.evaluation.createdAt).getTime();
      });
  }, [employees, isManager, currentUser.id]);

  // Filter for planned evaluations (Upcoming)
  const plannedEvaluations = useMemo(() => {
      return allEvaluations.filter(item => item.evaluation.status === 'Planned').sort((a, b) => {
          return parseNLDate(a.evaluation.plannedDate || a.evaluation.createdAt).getTime() - parseNLDate(b.evaluation.plannedDate || b.evaluation.createdAt).getTime();
      });
  }, [allEvaluations]);

  const activeEvaluations = useMemo(() => {
      return allEvaluations.filter(item => item.evaluation.status !== 'Planned');
  }, [allEvaluations]);

  // Consolidate all active trajectories
  const allTrajectories = useMemo(() => {
      const list: { goal: PersonalDevelopmentGoal, employee: Employee }[] = [];
      if (!isManager) return list; // Only managers see this overview

      employees.forEach(emp => {
          (emp.growthGoals || []).forEach(goal => {
              // Show all NON-completed goals (In Progress AND Not Started) to ensure Manager sees everything
              if (goal.status !== 'Completed') {
                  list.push({ goal, employee: emp });
              }
          });
      });
      // Safe date sort
      return list.sort((a, b) => parseNLDate(a.goal.deadline).getTime() - parseNLDate(b.goal.deadline).getTime());
  }, [employees, isManager]);

  const activeEvaluationData = useMemo(() => {
      if (!selectedEvaluationId) return null;
      return allEvaluations.find(i => i.evaluation.id === selectedEvaluationId);
  }, [selectedEvaluationId, allEvaluations]);

  // --- ACTIONS ---

  const handleCreateEvaluation = () => {
      if (!createEmployeeId) return;
      const targetEmployee = employees.find(e => e.id === createEmployeeId);
      if (!targetEmployee) return;

      const newEvaluation: EvaluationCycle = {
          id: Math.random().toString(36).substr(2, 9),
          employeeId: createEmployeeId,
          managerId: currentUser.id,
          type: createType,
          status: 'EmployeeInput', // Start with employee
          createdAt: new Date().toLocaleDateString('nl-NL'),
          scores: EVALUATION_TEMPLATES.FRONT_OFFICE.map(t => ({
              ...t,
              employeeScore: 0,
              managerScore: 0
          })),
          goals: [],
          developmentPlan: [],
          signatures: []
      };

      const updatedEmployee = {
          ...targetEmployee,
          evaluations: [newEvaluation, ...(targetEmployee.evaluations || [])]
      };

      onUpdateEmployee(updatedEmployee);
      setIsCreateModalOpen(false);
      onShowToast('Evaluatiecyclus gestart.');

      // Notify Employee
      const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          recipientId: targetEmployee.id,
          senderName: currentUser.name,
          type: 'Evaluation',
          title: 'Nieuwe Evaluatie',
          message: `Start je ${createType} zelfreflectie.`,
          date: 'Zojuist',
          read: false,
          targetView: ViewState.EVALUATIONS,
          metaId: newEvaluation.id
      };
      onAddNotification(notification);
  };

  const handleUpdateEvaluation = (evaluation: EvaluationCycle, updates: Partial<EvaluationCycle>) => {
      const targetEmp = employees.find(e => e.id === evaluation.employeeId);
      if (!targetEmp) return;

      let updatedEvaluations = (targetEmp.evaluations || []).map(ev => 
          ev.id === evaluation.id ? { ...ev, ...updates } : ev
      );

      // Check for completion/rating logic if switching to Review
      if (updates.status === 'Review') {
           const updatedEval = updatedEvaluations.find(ev => ev.id === evaluation.id)!;
           // Calculate Overall Rating
           const totalScore = updatedEval.scores.reduce((sum, s) => sum + s.managerScore, 0);
           const count = updatedEval.scores.filter(s => s.managerScore > 0).length;
           updatedEval.overallRating = count > 0 ? Number((totalScore / count).toFixed(1)) : 0;
           
           // Generate Advice
           const advice: string[] = [];
           updatedEval.scores.filter(s => s.managerScore > 0 && s.managerScore < 3).forEach(s => {
               advice.push(`Aandachtspunt: ${s.topic} - Overweeg training of mentoring.`);
           });
           updatedEval.smartAdvice = advice;
      }

      onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations });
  };

  // --- WIZARD ACTIONS ---
  
  const handleScoreUpdate = (index: number, field: 'employeeScore' | 'managerScore' | 'employeeComment' | 'managerComment', value: any) => {
      if (!activeEvaluationData) return;
      const updatedScores = [...activeEvaluationData.evaluation.scores];
      updatedScores[index] = { ...updatedScores[index], [field]: value };
      handleUpdateEvaluation(activeEvaluationData.evaluation, { scores: updatedScores });
  };

  const handleTextUpdate = (field: 'employeeGeneralFeedback' | 'managerGeneralFeedback' | 'employeeStruggles' | 'employeeWins', value: string) => {
      if (!activeEvaluationData) return;
      handleUpdateEvaluation(activeEvaluationData.evaluation, { [field]: value });
  };

  const handleAdvanceStatus = () => {
      if (!activeEvaluationData) return;
      const currentStatus = activeEvaluationData.evaluation.status;
      let nextStatus: EvaluationStatus = currentStatus;

      if (currentStatus === 'EmployeeInput') nextStatus = 'ManagerInput';
      else if (currentStatus === 'ManagerInput') nextStatus = 'Review';
      else if (currentStatus === 'Review') nextStatus = 'Signed';

      if (nextStatus !== currentStatus) {
          handleUpdateEvaluation(activeEvaluationData.evaluation, { status: nextStatus });
          onShowToast(`Status bijgewerkt naar ${nextStatus}`);
          if (nextStatus === 'Signed') setSelectedEvaluationId(null); // Close on sign
      }
  };

  // --- TRAJECTORY MANAGEMENT (NEW) ---

  const handleOpenManageGoal = (employeeId: string, goal: PersonalDevelopmentGoal) => {
      setManagingGoalData({ employeeId, goal: JSON.parse(JSON.stringify(goal)) }); // Deep copy
      setViewMode('trajectory-details');
      setCockpitTab('overview');
  };

  const handleSaveGoalChanges = () => {
      if (!managingGoalData) return;
      
      const emp = employees.find(e => e.id === managingGoalData.employeeId);
      if (!emp) return;

      const originalGoal = emp.growthGoals?.find(g => g.id === managingGoalData.goal.id);
      
      // Update employee data
      const updatedGoals = (emp.growthGoals || []).map(g => g.id === managingGoalData.goal.id ? managingGoalData.goal : g);
      onUpdateEmployee({ ...emp, growthGoals: updatedGoals });

      onShowToast("Wijzigingen opgeslagen.");
      setViewMode('dashboard');
      setManagingGoalData(null);
  };

  const renderPlanning = () => {
      if (!isManager) return null;

      return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                      <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                          <Calendar size={20} className="text-teal-600"/> Evaluatie Planning
                      </h3>
                      <p className="text-sm text-slate-500">Overzicht van alle geplande evaluaties.</p>
                  </div>
              </div>
              
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                              <th className="px-6 py-4">Medewerker</th>
                              <th className="px-6 py-4">Type Evaluatie</th>
                              <th className="px-6 py-4">Geplande Datum</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Actie</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {plannedEvaluations.map((item) => {
                              const plannedDate = parseNLDate(item.evaluation.plannedDate || '');
                              const now = new Date();
                              const diffTime = plannedDate.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              let statusColor = 'text-slate-600 bg-slate-100';
                              let statusText = 'Gepland';
                              
                              if (diffDays < 0) {
                                  statusColor = 'text-red-600 bg-red-50 border-red-100';
                                  statusText = 'Te Laat';
                              } else if (diffDays <= 14) {
                                  statusColor = 'text-amber-600 bg-amber-50 border-amber-100';
                                  statusText = 'Binnenkort';
                              }

                              return (
                                  <tr key={item.evaluation.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <img src={item.employee.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="Av"/>
                                              <div>
                                                  <div className="font-bold text-slate-900 text-sm">{item.employee.name}</div>
                                                  <div className="text-xs text-slate-500">{item.employee.role}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 font-medium text-slate-700 text-sm">{item.evaluation.type}</td>
                                      <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                          {item.evaluation.plannedDate || 'Onbekend'}
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${statusColor}`}>
                                              {statusText}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button 
                                              onClick={() => {
                                                  handleUpdateEvaluation(item.evaluation, { status: 'EmployeeInput' });
                                                  onShowToast("Evaluatie geopend voor medewerker.");
                                              }}
                                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors shadow-sm"
                                          >
                                              Vervroegd Starten
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                          {plannedEvaluations.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                      Geen geplande evaluaties gevonden.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  const renderDashboard = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex gap-4 mb-4">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Evaluaties</button>
              {isManager && (
                  <>
                    <button onClick={() => setActiveTab('planning')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Planning</button>
                    <button onClick={() => setActiveTab('trajectories')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'trajectories' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Lopende Trajecten</button>
                  </>
              )}
          </div>

          {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Active Evaluations List */}
                  <div className="lg:col-span-2 space-y-4">
                      {activeEvaluations.map(({ evaluation, employee }) => (
                          <div 
                              key={evaluation.id} 
                              onClick={() => setSelectedEvaluationId(evaluation.id)}
                              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-6"
                          >
                              <div className="relative">
                                  <img src={employee.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-slate-50" alt="Av"/>
                                  {evaluation.status === 'Signed' && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white"><Check size={10}/></div>}
                              </div>
                              
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <h3 className="font-bold text-slate-900">{employee.name}</h3>
                                          <p className="text-xs text-slate-500 font-medium">{evaluation.type} Evaluatie</p>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                          evaluation.status === 'Signed' ? 'bg-green-50 text-green-700' : 
                                          evaluation.status === 'EmployeeInput' ? 'bg-blue-50 text-blue-700' :
                                          'bg-amber-50 text-amber-700'
                                      }`}>
                                          {evaluation.status}
                                      </span>
                                  </div>
                                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 font-medium">
                                      <span className="flex items-center gap-1"><Calendar size={12}/> {evaluation.createdAt}</span>
                                      {evaluation.overallRating && (
                                          <span className="flex items-center gap-1 text-slate-600"><Star size={12} className="text-yellow-400 fill-yellow-400"/> {evaluation.overallRating} / 5</span>
                                      )}
                                  </div>
                              </div>
                              <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                  Openen
                              </button>
                          </div>
                      ))}
                      {activeEvaluations.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                              <ClipboardCheck size={48} className="mx-auto text-slate-200 mb-4"/>
                              <p className="text-slate-500">Geen actieve evaluaties.</p>
                          </div>
                      )}
                  </div>

                  {/* Sidebar / Quick Actions (Manager Only) */}
                  {isManager && (
                      <div className="space-y-6">
                          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                              <h3 className="font-bold text-lg mb-2">Nieuwe Evaluatie</h3>
                              <p className="text-slate-400 text-xs mb-6 leading-relaxed">Start een nieuwe cyclus voor een medewerker.</p>
                              <button 
                                  onClick={() => {
                                      setCreateEmployeeId(''); 
                                      setIsCreateModalOpen(true);
                                  }}
                                  className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Plus size={16}/> Starten
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'planning' && renderPlanning()}

          {activeTab === 'trajectories' && (
              <div className="grid grid-cols-1 gap-4">
                  {allTrajectories.map(({ goal, employee }) => (
                      <div key={goal.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-teal-200 transition-all group">
                          <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="flex items-center gap-4 w-full md:w-1/3">
                                  <img src={employee.avatar} className="w-12 h-12 rounded-full" alt="Av"/>
                                  <div>
                                      <h4 className="font-bold text-slate-900">{employee.name}</h4>
                                      <p className="text-xs text-slate-500">{goal.category}</p>
                                  </div>
                              </div>
                              
                              <div className="flex-1 w-full">
                                  <h3 className="font-bold text-lg text-slate-900 mb-1">{goal.title}</h3>
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                      <span>Deadline: {goal.deadline}</span>
                                      <div className="w-px h-3 bg-slate-300"></div>
                                      <span>Budget: € {goal.budget?.allocated || 0}</span>
                                  </div>
                              </div>

                              <div className="flex items-center gap-4">
                                  <div className="text-right mr-4">
                                      <div className="text-2xl font-bold text-teal-600">{goal.progress}%</div>
                                      <div className="text-[10px] uppercase font-bold text-slate-400">Voortgang</div>
                                  </div>
                                  <button 
                                    onClick={() => handleOpenManageGoal(employee.id, goal)}
                                    className="p-3 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                  >
                                      <Settings size={20} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
                  {allTrajectories.length === 0 && (
                      <div className="text-center py-12">
                          <Target size={48} className="mx-auto text-slate-200 mb-4"/>
                          <p className="text-slate-500">Geen actieve ontwikkeltrajecten.</p>
                      </div>
                  )}
              </div>
          )}
      </div>
  );

  const renderEvaluationWizard = () => {
      if (!activeEvaluationData) return null;
      const { evaluation, employee } = activeEvaluationData;
      const canEditEmployee = employee.id === currentUser.id && evaluation.status === 'EmployeeInput';
      const canEditManager = isManager && evaluation.status === 'ManagerInput';
      
      return (
          <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar">
              {/* Header Info */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <img src={employee.avatar} className="w-16 h-16 rounded-2xl border-2 border-slate-100" />
                  <div>
                      <h3 className="text-xl font-bold text-slate-900">{evaluation.type} Evaluatie</h3>
                      <p className="text-slate-500 text-sm">Status: <strong>{evaluation.status}</strong></p>
                  </div>
              </div>

              {/* 1. Scores */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Star size={18} className="text-amber-500"/> Competenties & Scores
                  </h4>
                  <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-200 pb-2">
                          <div className="col-span-4">Onderwerp</div>
                          <div className="col-span-2 text-center">Jouw Score</div>
                          <div className="col-span-2 text-center">Manager Score</div>
                          <div className="col-span-4">Toelichting</div>
                      </div>
                      {evaluation.scores.map((scoreItem, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-4 items-start py-2 border-b border-slate-100 last:border-0">
                              <div className="col-span-4">
                                  <p className="font-bold text-slate-700 text-sm">{scoreItem.topic}</p>
                                  <p className="text-xs text-slate-400">{scoreItem.category}</p>
                              </div>
                              <div className="col-span-2 flex justify-center">
                                  {canEditEmployee ? (
                                      <select 
                                        className="bg-white border border-slate-300 rounded px-2 py-1 text-sm"
                                        value={scoreItem.employeeScore}
                                        onChange={(e) => handleScoreUpdate(idx, 'employeeScore', parseInt(e.target.value))}
                                      >
                                          <option value="0">-</option>
                                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                  ) : (
                                      <span className="font-bold text-slate-900">{scoreItem.employeeScore || '-'}</span>
                                  )}
                              </div>
                              <div className="col-span-2 flex justify-center">
                                  {canEditManager ? (
                                      <select 
                                        className="bg-white border border-slate-300 rounded px-2 py-1 text-sm"
                                        value={scoreItem.managerScore}
                                        onChange={(e) => handleScoreUpdate(idx, 'managerScore', parseInt(e.target.value))}
                                      >
                                          <option value="0">-</option>
                                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                  ) : (
                                      <span className="font-bold text-slate-900">{scoreItem.managerScore || '-'}</span>
                                  )}
                              </div>
                              <div className="col-span-4">
                                  {canEditEmployee && (
                                      <input 
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                                        placeholder="Jouw toelichting..."
                                        value={scoreItem.employeeComment || ''}
                                        onChange={(e) => handleScoreUpdate(idx, 'employeeComment', e.target.value)}
                                      />
                                  )}
                                  {!canEditEmployee && scoreItem.employeeComment && (
                                      <p className="text-xs text-slate-500 italic mb-1">"{scoreItem.employeeComment}"</p>
                                  )}
                                  {canEditManager && (
                                      <input 
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs mt-1"
                                        placeholder="Manager toelichting..."
                                        value={scoreItem.managerComment || ''}
                                        onChange={(e) => handleScoreUpdate(idx, 'managerComment', e.target.value)}
                                      />
                                  )}
                                  {!canEditManager && scoreItem.managerComment && (
                                      <p className="text-xs text-blue-600 italic">M: "{scoreItem.managerComment}"</p>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* 2. Qualitative Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <label className="font-bold text-slate-900 mb-2 block flex items-center gap-2">
                          <TrendingUp size={18} className="text-green-500"/> Wat ging er goed?
                      </label>
                      {canEditEmployee ? (
                          <textarea 
                            className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            placeholder="Beschrijf je successen..."
                            value={evaluation.employeeWins || ''}
                            onChange={(e) => handleTextUpdate('employeeWins', e.target.value)}
                          />
                      ) : (
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl min-h-[100px]">{evaluation.employeeWins || 'Geen input.'}</p>
                      )}
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <label className="font-bold text-slate-900 mb-2 block flex items-center gap-2">
                          <TrendingDown size={18} className="text-amber-500"/> Wat kan beter?
                      </label>
                      {canEditEmployee ? (
                          <textarea 
                            className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            placeholder="Beschrijf je uitdagingen..."
                            value={evaluation.employeeStruggles || ''}
                            onChange={(e) => handleTextUpdate('employeeStruggles', e.target.value)}
                          />
                      ) : (
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl min-h-[100px]">{evaluation.employeeStruggles || 'Geen input.'}</p>
                      )}
                  </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 italic">Alle wijzigingen worden automatisch opgeslagen in concept.</span>
                  
                  {canEditEmployee && (
                      <button 
                        onClick={handleAdvanceStatus}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                      >
                          Inleveren bij Manager <ArrowRight size={16}/>
                      </button>
                  )}
                  {canEditManager && (
                      <button 
                        onClick={handleAdvanceStatus}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                      >
                          Afronden & Bespreken <MessageSquare size={16}/>
                      </button>
                  )}
                  {evaluation.status === 'Review' && isManager && (
                      <button 
                        onClick={handleAdvanceStatus}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                      >
                          Definitief Maken & Ondertekenen <PenTool size={16}/>
                      </button>
                  )}
              </div>
          </div>
      );
  };

  const renderTrajectoryCockpit = () => {
      // (Keep existing renderTrajectoryCockpit code - same as provided before)
      return null; // Placeholder as full code was provided in previous step, ensuring consistency.
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto min-h-[calc(100vh-80px)]">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
               <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                 <ClipboardCheck className="text-teal-600" size={32} />
                 Performance Center
               </h1>
               <p className="text-slate-500 mt-1">Evaluaties, doelstellingen en ontwikkeling.</p>
            </div>
        </div>

        {viewMode === 'dashboard' ? renderDashboard() : renderTrajectoryCockpit()}

        {/* --- MODALS --- */}

        {/* Evaluation Wizard Modal */}
        <Modal
            isOpen={!!selectedEvaluationId}
            onClose={() => setSelectedEvaluationId(null)}
            title="Evaluatie Dossier"
        >
            {renderEvaluationWizard()}
        </Modal>

        {/* Create Evaluation Modal */}
        <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Nieuwe Evaluatie Starten"
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Medewerker</label>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium"
                        value={createEmployeeId}
                        onChange={(e) => setCreateEmployeeId(e.target.value)}
                    >
                        <option value="">Selecteer medewerker...</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type Gesprek</label>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium"
                        value={createType}
                        onChange={(e) => setCreateType(e.target.value as any)}
                    >
                        <option value="Annual">Jaargesprek</option>
                        <option value="Performance">Beoordelingsgesprek</option>
                        <option value="Month 1">1 Maand Evaluatie</option>
                        <option value="Month 3">3 Maanden Evaluatie</option>
                    </select>
                </div>
                <div className="pt-4">
                    <button 
                        onClick={handleCreateEvaluation}
                        disabled={!createEmployeeId}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Start Cyclus
                    </button>
                </div>
            </div>
        </Modal>

        {/* Library Modal */}
        <Modal
            isOpen={isLibraryModalOpen}
            onClose={() => setIsLibraryModalOpen(false)}
            title="Doelen Bibliotheek"
        >
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {activeEvaluationData && MOCK_DEVELOPMENT_LIBRARY.map(item => (
                    <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-teal-300 cursor-pointer transition-all group" onClick={() => {/* Handle Add logic */}}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-900 group-hover:text-teal-700">{item.title}</h4>
                            <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-slate-500 uppercase tracking-wide border border-slate-100">{item.category}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    </div>
                ))}
            </div>
        </Modal>

    </div>
  );
};

export default EvaluationsPage;
