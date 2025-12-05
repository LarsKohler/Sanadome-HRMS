
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ClipboardCheck, Plus, Search, Calendar, User, ArrowRight, Play, CheckCircle, Clock, 
    AlertCircle, BarChart3, ChevronRight, MessageSquare, BrainCircuit, X, Target, PenTool, TrendingUp, AlertTriangle, FileCheck, Star, Split, Lock, Unlock, Eye, EyeOff, Printer, PenLine, History, ArrowLeft, Check, TrendingDown, Minus, BookOpen, Compass, Trash2, CalendarDays, Activity, Signal, Edit, Save, MoreHorizontal, Flag, Milestone, Trophy, FileText, Settings, LayoutDashboard, Wallet, Link as LinkIcon, ExternalLink, Info
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

  // Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1=Reflection, 2=Scores, 3=Finalize
  
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

  // Signatures State
  const [isSigning, setIsSigning] = useState(false);

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
          const statusPriority: Record<string, number> = { 'Review': 1, 'ManagerInput': 2, 'EmployeeInput': 3, 'Planned': 4, 'Signed': 5, 'Archived': 6 };
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

  const handleDeleteEvaluation = (evaluation: EvaluationCycle) => {
      if (!confirm("Weet je zeker dat je deze evaluatiecyclus wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;

      const targetEmp = employees.find(e => e.id === evaluation.employeeId);
      if (!targetEmp) return;

      const updatedEvaluations = (targetEmp.evaluations || []).filter(ev => ev.id !== evaluation.id);
      
      onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations });
      onShowToast("Evaluatiecyclus verwijderd.");
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

      // Check if signed, then promote Development Goals to Profile Goals AND schedule next quarter
      if (updates.status === 'Signed') {
          const evalToSign = updatedEvaluations.find(ev => ev.id === evaluation.id);
          
          // 1. Promote Goals
          if (evalToSign && evalToSign.developmentPlan) {
              const newProfileGoals = evalToSign.developmentPlan.map(g => ({
                  ...g,
                  status: 'In Progress' as const, // Activate them
                  startDate: new Date().toLocaleDateString('nl-NL'),
                  linkedEvaluationId: evaluation.id
              }));
              
              // Add to existing goals
              const updatedGoals = [...(targetEmp.growthGoals || []), ...newProfileGoals];
              
              // 2. Schedule Next Evaluation (3 months later)
              const nextDate = new Date();
              nextDate.setMonth(nextDate.getMonth() + 3);
              const formattedNextDate = nextDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });

              const nextEvaluation: EvaluationCycle = {
                  id: crypto.randomUUID(),
                  employeeId: targetEmp.id,
                  managerId: currentUser.id,
                  type: 'Quarterly',
                  status: 'Planned',
                  createdAt: new Date().toLocaleDateString('nl-NL'),
                  plannedDate: formattedNextDate,
                  scores: EVALUATION_TEMPLATES.FRONT_OFFICE.map(t => ({
                      ...t,
                      employeeScore: 0,
                      managerScore: 0
                  })),
                  goals: [],
                  developmentPlan: [],
                  signatures: []
              };
              
              // Push next evaluation to list
              updatedEvaluations = [...updatedEvaluations, nextEvaluation];

              onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations, growthGoals: updatedGoals });
              return;
          }
      }

      onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations });
  };

  // Pure function to calculate check-in dates
  const calculateCheckInDates = (startDate: Date, endDate: Date, level: 'Low' | 'Medium' | 'High'): InterimCheckIn[] => {
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If end date is in the past or same day, return empty
      if (diffDays <= 0) return [];

      // RULE 1: Very short duration (< 14 days) -> Always 1 check-in halfway
      if (diffDays < 14) {
          const midDate = new Date(startDate.getTime() + diffTime / 2);
           return [{
              id: 'preview-1',
              date: midDate.toLocaleDateString('nl-NL'),
              status: 'Planned',
              score: 0
          }];
      }

      // RULE 2: Frequency based on Support Level
      // Aim: 
      // High = ~3x month (Every 10 days)
      // Medium = ~2x month (Every 14 days / Bi-weekly) - REQUESTED
      // Low = ~1x month (Every 28 days)
      let intervalDays = 28; 
      switch (level) {
          case 'High': intervalDays = 10; break; 
          case 'Medium': intervalDays = 14; break; 
          case 'Low': intervalDays = 28; break; 
      }

      const checkIns: InterimCheckIn[] = [];
      // Start the first check-in after one interval
      let currentDate = new Date(startDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
      let idCounter = 1;

      // Generate check-ins while current date is comfortably before deadline (buffer of 3 days)
      // This prevents a check-in appearing on the day before the deadline
      while (currentDate.getTime() < (endDate.getTime() - (3 * 24 * 60 * 60 * 1000))) {
          checkIns.push({
              id: `preview-${idCounter++}`,
              date: currentDate.toLocaleDateString('nl-NL'),
              status: 'Planned',
              score: 0
          });
          currentDate = new Date(currentDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
      }
      
      // RULE 3: Fallback
      // If the logic resulted in 0 check-ins (e.g. Duration 20 days, Interval 28 days),
      // we still want at least one check-in halfway.
      if (checkIns.length === 0) {
           const midDate = new Date(startDate.getTime() + diffTime / 2);
           return [{
              id: 'preview-fallback',
              date: midDate.toLocaleDateString('nl-NL'),
              status: 'Planned',
              score: 0
          }];
      }

      return checkIns;
  };

  // Effect to update preview schedule whenever inputs change
  useEffect(() => {
      if (showPlanBuilder && newDevGoal.deadline) {
          const now = new Date();
          const deadlineDate = new Date(newDevGoal.deadline);
          if (!isNaN(deadlineDate.getTime())) {
              const schedule = calculateCheckInDates(now, deadlineDate, supportLevel);
              setPreviewSchedule(schedule);
          } else {
              setPreviewSchedule([]);
          }
      } else {
          setPreviewSchedule([]);
      }
  }, [newDevGoal.deadline, supportLevel, showPlanBuilder]);

  const handleAddDevelopmentGoal = (evaluation: EvaluationCycle) => {
      if (!newDevGoal.title || !newDevGoal.deadline) {
          onShowToast("Titel en deadline zijn verplicht.");
          return;
      }
      
      const deadlineDate = new Date(newDevGoal.deadline);
      const now = new Date();
      
      // Use the previewed schedule but generate permanent IDs
      const finalCheckIns = previewSchedule.map(ci => ({
          ...ci,
          id: Math.random().toString(36).substr(2, 9)
      }));

      const goal: PersonalDevelopmentGoal = {
          id: Math.random().toString(36).substr(2, 9),
          title: newDevGoal.title || 'Nieuw Doel',
          description: newDevGoal.description || '',
          actionPlan: newDevGoal.actionPlan || '',
          category: newDevGoal.category || 'General',
          status: 'Not Started',
          progress: 0,
          startDate: now.toLocaleDateString('nl-NL'),
          deadline: deadlineDate.toLocaleDateString('nl-NL'),
          supportLevel: supportLevel,
          reflections: [],
          checkIns: finalCheckIns
      };

      handleUpdateEvaluation(evaluation, { developmentPlan: [...(evaluation.developmentPlan || []), goal] });
      setNewDevGoal({ title: '', category: 'General', actionPlan: '' });
      setSupportLevel('Medium'); 
      setShowPlanBuilder(false);
      onShowToast("Doel en planning opgeslagen.");
  };

  const handleAddFromLibrary = (evaluation: EvaluationCycle, libItem: PersonalDevelopmentGoal) => {
      setNewDevGoal({
          ...libItem,
          isLibraryItem: true
      });
      setIsLibraryModalOpen(false);
      setShowPlanBuilder(true); // Open builder to set deadline
      onShowToast("Gekozen uit bibliotheek. Stel nu de deadline en intensiteit in.");
  };

  const handleRemoveGoal = (evaluation: EvaluationCycle, goalId: string) => {
      const updated = (evaluation.developmentPlan || []).filter(g => g.id !== goalId);
      handleUpdateEvaluation(evaluation, { developmentPlan: updated });
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

      // Check for Notifications
      if (originalGoal) {
          // Deadline Changed
          if (originalGoal.deadline !== managingGoalData.goal.deadline) {
              onAddNotification({
                  id: Math.random().toString(36).substr(2, 9),
                  recipientId: emp.id,
                  senderName: currentUser.name,
                  type: 'Evaluation',
                  title: 'Groeipad Bijgewerkt',
                  message: `De deadline voor "${managingGoalData.goal.title}" is gewijzigd naar ${managingGoalData.goal.deadline}.`,
                  date: 'Zojuist',
                  read: false,
                  targetView: ViewState.HOME
              });
          }
      }
      onShowToast("Wijzigingen opgeslagen.");
      setViewMode('dashboard');
      setManagingGoalData(null);
  };

  const renderPlanning = () => {
      if (!isManager) {
          return (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                  <Calendar size={48} className="text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Geen toegang</h3>
                  <p className="text-slate-500">Alleen managers hebben toegang tot de planning.</p>
              </div>
          );
      }

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
                              const isUnlockable = true; // Managers can see all in planning
                              // Check if date is in the past or close
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
                              } else {
                                  statusColor = 'text-blue-600 bg-blue-50 border-blue-100';
                                  statusText = 'Toekomstig';
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
                                                  // Force start / unlock
                                                  handleUpdateEvaluation(item.evaluation, { status: 'EmployeeInput' });
                                                  onShowToast("Evaluatie geopend voor medewerker.");
                                              }}
                                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors shadow-sm"
                                          >
                                              Nu Starten
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

  const renderTrajectoryCockpit = () => {
      if (!managingGoalData) return null;
      
      const { goal, employeeId } = managingGoalData;
      const emp = employees.find(e => e.id === employeeId);
      if (!emp) return null;

      // Calculations
      const budgetTotal = goal.budget?.allocated || 0;
      const budgetSpent = goal.budget?.spent || 0;
      const budgetLeft = budgetTotal - budgetSpent;
      const budgetPercent = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;

      return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                  <button onClick={() => { setViewMode('dashboard'); setManagingGoalData(null); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm">
                      <ArrowLeft size={18} /> Terug naar overzicht
                  </button>
                  <div className="flex gap-2">
                      <button onClick={handleSaveGoalChanges} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-colors">
                          <Save size={18} /> Wijzigingen Opslaan
                      </button>
                  </div>
              </div>

              {/* Main Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
                  
                  {/* Sidebar */}
                  <div className="w-full lg:w-72 bg-slate-50 border-r border-slate-200 p-6">
                      <div className="flex items-center gap-4 mb-8">
                          <img src={emp.avatar} className="w-12 h-12 rounded-full border border-slate-200" alt="Av"/>
                          <div>
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-xs text-slate-500">Traject Management</div>
                          </div>
                      </div>

                      <nav className="space-y-2">
                          {[
                              { id: 'overview', label: 'Overzicht', icon: LayoutDashboard },
                              { id: 'planning', label: 'Planning & Check-ins', icon: Calendar },
                              { id: 'budget', label: 'Budget & Kosten', icon: Wallet },
                              { id: 'resources', label: 'Resources & Links', icon: LinkIcon },
                              { id: 'logs', label: 'Logboek', icon: FileText },
                          ].map(item => (
                              <button
                                key={item.id}
                                onClick={() => setCockpitTab(item.id as any)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${
                                    cockpitTab === item.id 
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                }`}
                              >
                                  <item.icon size={18} /> {item.label}
                              </button>
                          ))}
                      </nav>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-8 bg-white overflow-y-auto">
                      
                      {cockpitTab === 'overview' && (
                          <div className="space-y-8">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Doelstelling</label>
                                  <input 
                                    className="text-2xl font-bold text-slate-900 w-full border-none focus:ring-0 p-0 placeholder:text-slate-300"
                                    value={goal.title}
                                    onChange={(e) => setManagingGoalData({ ...managingGoalData, goal: { ...goal, title: e.target.value } })}
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                                      <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium"
                                        value={goal.category}
                                        onChange={(e) => setManagingGoalData({ ...managingGoalData, goal: { ...goal, category: e.target.value } })}
                                      >
                                          <option>General</option>
                                          <option>Leadership</option>
                                          <option>Technical</option>
                                          <option>Soft Skills</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Deadline</label>
                                      <input 
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium"
                                        value={safeDateToInput(goal.deadline)}
                                        onChange={(e) => {
                                            const newDate = new Date(e.target.value).toLocaleDateString('nl-NL');
                                            setManagingGoalData({ ...managingGoalData, goal: { ...goal, deadline: newDate } });
                                        }}
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omschrijving & Context</label>
                                  <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm min-h-[100px]"
                                    value={goal.description}
                                    onChange={(e) => setManagingGoalData({ ...managingGoalData, goal: { ...goal, description: e.target.value } })}
                                  />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Actieplan</label>
                                  <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm min-h-[150px]"
                                    value={goal.actionPlan}
                                    onChange={(e) => setManagingGoalData({ ...managingGoalData, goal: { ...goal, actionPlan: e.target.value } })}
                                  />
                              </div>
                          </div>
                      )}

                      {cockpitTab === 'budget' && (
                          <div className="space-y-8">
                              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                                  <h3 className="font-bold text-lg mb-6">Budget Overzicht</h3>
                                  <div className="flex gap-8">
                                      <div>
                                          <div className="text-slate-400 text-xs font-bold uppercase mb-1">Gealloceerd</div>
                                          <div className="text-3xl font-bold">€ {budgetTotal}</div>
                                      </div>
                                      <div className="w-px bg-slate-700"></div>
                                      <div>
                                          <div className="text-slate-400 text-xs font-bold uppercase mb-1">Besteed</div>
                                          <div className="text-3xl font-bold text-amber-400">€ {budgetSpent}</div>
                                      </div>
                                      <div className="w-px bg-slate-700"></div>
                                      <div>
                                          <div className="text-slate-400 text-xs font-bold uppercase mb-1">Resterend</div>
                                          <div className={`text-3xl font-bold ${budgetLeft < 0 ? 'text-red-400' : 'text-green-400'}`}>€ {budgetLeft}</div>
                                      </div>
                                  </div>
                                  <div className="mt-6 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                      <div className={`h-full ${budgetPercent > 100 ? 'bg-red-500' : 'bg-teal-500'}`} style={{width: `${Math.min(budgetPercent, 100)}%`}}></div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Budget Toewijzen (€)</label>
                                      <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                        value={goal.budget?.allocated || 0}
                                        onChange={(e) => setManagingGoalData({ ...managingGoalData, goal: { ...goal, budget: { ...goal.budget, allocated: parseFloat(e.target.value) || 0, spent: goal.budget?.spent || 0 } } })}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Huidige Uitgaven (€)</label>
                                      <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                        value={goal.budget?.spent || 0}
                                        onChange={(e) => setManagingGoalData({ ...managingGoalData, goal: { ...goal, budget: { ...goal.budget, spent: parseFloat(e.target.value) || 0, allocated: goal.budget?.allocated || 0 } } })}
                                      />
                                  </div>
                              </div>
                          </div>
                      )}

                      {cockpitTab === 'resources' && (
                          <div className="space-y-6">
                              <div className="flex gap-4">
                                  <input 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm"
                                    placeholder="Titel (bv. Cursus Materiaal)"
                                    value={newResource.title}
                                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                                  />
                                  <input 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm"
                                    placeholder="URL / Link"
                                    value={newResource.url}
                                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                                  />
                                  <button 
                                    onClick={() => {
                                        if (newResource.title && newResource.url) {
                                            const res: TrajectoryResource = {
                                                id: Math.random().toString(36).substr(2, 9),
                                                title: newResource.title,
                                                url: newResource.url,
                                                type: 'Link'
                                            };
                                            setManagingGoalData({ ...managingGoalData, goal: { ...goal, resources: [...(goal.resources || []), res] } });
                                            setNewResource({ title: '', url: '' });
                                        }
                                    }}
                                    className="bg-slate-900 text-white px-4 rounded-xl font-bold text-sm"
                                  >
                                      Toevoegen
                                  </button>
                              </div>

                              <div className="space-y-2">
                                  {goal.resources?.map(res => (
                                      <div key={res.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                                  <LinkIcon size={16} />
                                              </div>
                                              <a href={res.url} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 text-sm hover:underline flex items-center gap-1">
                                                  {res.title} <ExternalLink size={10} className="text-slate-400"/>
                                              </a>
                                          </div>
                                          <button 
                                            onClick={() => {
                                                const updated = goal.resources?.filter(r => r.id !== res.id);
                                                setManagingGoalData({ ...managingGoalData, goal: { ...goal, resources: updated } });
                                            }}
                                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  ))}
                                  {(!goal.resources || goal.resources.length === 0) && (
                                      <div className="text-center py-10 text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-xl">
                                          Nog geen resources toegevoegd.
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* Other tabs omitted for brevity but follow same pattern */}
                  </div>
              </div>
          </div>
      );
  };

  const renderDashboard = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex gap-4 mb-4">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Evaluaties</button>
              <button onClick={() => setActiveTab('planning')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Planning</button>
              <button onClick={() => setActiveTab('trajectories')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'trajectories' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Lopende Trajecten</button>
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
                              <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-600 transition-colors"/>
                          </div>
                      ))}
                      {activeEvaluations.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                              <ClipboardCheck size={48} className="mx-auto text-slate-200 mb-4"/>
                              <p className="text-slate-500">Geen actieve evaluaties.</p>
                          </div>
                      )}
                  </div>

                  {/* Sidebar / Quick Actions */}
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
                    <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-teal-300 cursor-pointer transition-all group" onClick={() => handleAddFromLibrary(activeEvaluationData.evaluation, item)}>
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
