
import React, { useState, useMemo } from 'react';
import { 
    ClipboardCheck, Plus, Search, Calendar, User, ArrowRight, Play, CheckCircle, Clock, 
    AlertCircle, BarChart3, ChevronRight, MessageSquare, BrainCircuit, X, Target, PenTool, TrendingUp, AlertTriangle, FileCheck, Star, Split, Lock, Unlock, Eye, EyeOff, Printer, PenLine, History, ArrowLeft, Check, TrendingDown, Minus, BookOpen, Compass, Trash2, CalendarDays
} from 'lucide-react';
import { Employee, EvaluationCycle, Notification, ViewState, EvaluationScore, EvaluationGoal, EvaluationStatus, PersonalDevelopmentGoal, InterimCheckIn } from '../types';
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

const EvaluationsPage: React.FC<EvaluationsPageProps> = ({
  currentUser,
  employees,
  onUpdateEmployee,
  onAddNotification,
  onShowToast
}) => {
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  
  // Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createType, setCreateType] = useState<'Month 1' | 'Month 3' | 'Annual' | 'Performance'>('Annual');

  // Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1=Reflection, 2=Scores, 3=Finalize
  
  // Development Plan State (Now in Report View)
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [newDevGoal, setNewDevGoal] = useState<Partial<PersonalDevelopmentGoal>>({ title: '', category: 'General', actionPlan: '' });
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);

  // Signatures State
  const [isSigning, setIsSigning] = useState(false);

  const isManager = currentUser.role === 'Manager';

  // Consolidate all evaluations
  const allEvaluations = useMemo(() => {
      const list: { evaluation: EvaluationCycle, employee: Employee }[] = [];
      employees.forEach(emp => {
          (emp.evaluations || []).forEach(ev => {
              if (isManager || emp.id === currentUser.id) {
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
          return new Date(b.evaluation.createdAt).getTime() - new Date(a.evaluation.createdAt).getTime();
      });
  }, [employees, isManager, currentUser.id]);

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

      const updatedEvaluations = (targetEmp.evaluations || []).map(ev => 
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

      // Check if signed, then promote Development Goals to Profile Goals
      if (updates.status === 'Signed') {
          const evalToSign = updatedEvaluations.find(ev => ev.id === evaluation.id);
          if (evalToSign && evalToSign.developmentPlan) {
              const newProfileGoals = evalToSign.developmentPlan.map(g => ({
                  ...g,
                  status: 'In Progress' as const, // Activate them
                  startDate: new Date().toLocaleDateString('nl-NL'),
                  linkedEvaluationId: evaluation.id
              }));
              
              // Add to existing goals
              const updatedGoals = [...(targetEmp.growthGoals || []), ...newProfileGoals];
              onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations, growthGoals: updatedGoals });
              return;
          }
      }

      onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations });
  };

  // Auto-generate check-ins based on deadline
  const generateCheckIns = (startDate: Date, endDate: Date): InterimCheckIn[] => {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let count = 2;
      if (diffDays > 180) count = 4; // > 6 months = 4 check-ins
      
      const checkIns: InterimCheckIn[] = [];
      const interval = diffTime / (count + 1);

      for (let i = 1; i <= count; i++) {
          const date = new Date(startDate.getTime() + (interval * i));
          checkIns.push({
              id: Math.random().toString(36).substr(2, 9),
              date: date.toLocaleDateString('nl-NL'),
              status: 'Planned',
              score: 0
          });
      }
      return checkIns;
  };

  const handleAddDevelopmentGoal = (evaluation: EvaluationCycle) => {
      if (!newDevGoal.title || !newDevGoal.deadline) {
          onShowToast("Titel en deadline zijn verplicht.");
          return;
      }
      
      const deadlineDate = new Date(newDevGoal.deadline);
      const now = new Date();
      
      // Auto generate check-ins
      const generatedCheckIns = generateCheckIns(now, deadlineDate);

      const goal: PersonalDevelopmentGoal = {
          id: Math.random().toString(36).substr(2, 9),
          title: newDevGoal.title || 'Nieuw Doel',
          description: newDevGoal.description || '',
          actionPlan: newDevGoal.actionPlan || '',
          category: newDevGoal.category || 'General',
          status: 'Not Started',
          progress: 0,
          startDate: now.toLocaleDateString('nl-NL'),
          deadline: newDevGoal.deadline || '',
          reflections: [],
          checkIns: generatedCheckIns
      };

      handleUpdateEvaluation(evaluation, { developmentPlan: [...(evaluation.developmentPlan || []), goal] });
      setNewDevGoal({ title: '', category: 'General', actionPlan: '' });
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
      onShowToast("Gekozen uit bibliotheek. Stel nu de deadline in.");
  };

  const handleRemoveGoal = (evaluation: EvaluationCycle, goalId: string) => {
      const updated = (evaluation.developmentPlan || []).filter(g => g.id !== goalId);
      handleUpdateEvaluation(evaluation, { developmentPlan: updated });
  };

  const handleSign = async () => {
      if (!activeEvaluationData) return;
      const { evaluation } = activeEvaluationData;
      
      const role = isManager ? 'Manager' : 'Employee';
      // Check if already signed
      if (evaluation.signatures.some(s => s.role === role)) {
          onShowToast('Je hebt dit document al ondertekend.');
          return;
      }

      const newSignature = {
          signedBy: currentUser.name,
          signedById: currentUser.id,
          signedAt: new Date().toLocaleDateString('nl-NL'),
          role: role as 'Manager' | 'Employee'
      };

      const updatedSignatures = [...evaluation.signatures, newSignature];
      let newStatus = evaluation.status;

      // If both signed, archive
      const hasManager = updatedSignatures.some(s => s.role === 'Manager');
      const hasEmployee = updatedSignatures.some(s => s.role === 'Employee');
      
      if (hasManager && hasEmployee) {
          newStatus = 'Signed';
          onShowToast('Evaluatie volledig ondertekend en afgerond!');
      } else {
          onShowToast('Handtekening geplaatst. Wachten op andere partij.');
      }

      handleUpdateEvaluation(evaluation, { 
          signatures: updatedSignatures,
          status: newStatus,
          completedAt: newStatus === 'Signed' ? new Date().toLocaleDateString('nl-NL') : undefined
      });
  };

  // --- RENDER HELPERS ---

  const getStatusLabel = (status: EvaluationStatus) => {
      switch(status) {
          case 'EmployeeInput': return 'Zelfreflectie';
          case 'ManagerInput': return 'Beoordeling';
          case 'Review': return 'Bespreking';
          case 'Signed': return 'Ondertekend';
          case 'Archived': return 'Gearchiveerd';
          default: return status;
      }
  };

  // --- 9-GRID & TREND RENDERERS ---

  const renderNineGrid = (rating: number, potential: 'Low' | 'Medium' | 'High') => {
      // Logic for placement
      let x = 0;
      if (rating >= 4) x = 2; // High
      else if (rating >= 3) x = 1; // Med
      else x = 0; // Low

      let y = 0;
      if (potential === 'High') y = 0; // Top
      else if (potential === 'Medium') y = 1; // Middle
      else y = 2; // Bottom

      const cells = [
          ['Future Star', 'High Impact Star', 'Super Star'],
          ['Inconsistent', 'Core Employee', 'Trusted Pro'],
          ['Risk', 'Effective', 'Experienced']
      ];

      return (
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4 text-center">Talent Matrix (9-Grid)</h4>
              <div className="grid grid-rows-3 gap-1 h-64 relative">
                  {/* Y-Axis Label */}
                  <div className="absolute -left-8 top-0 h-full flex flex-col justify-between py-8 text-xs font-bold text-slate-400">
                      <span>Hoog</span>
                      <span>Midden</span>
                      <span>Laag</span>
                  </div>
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-slate-900">POTENTIEEL</div>

                  {[0, 1, 2].map(row => (
                      <div key={row} className="grid grid-cols-3 gap-1">
                          {[0, 1, 2].map(col => {
                              const isTarget = row === y && col === x;
                              return (
                                  <div key={col} className={`relative border rounded flex items-center justify-center text-xs font-bold transition-all ${
                                      isTarget ? 'bg-teal-600 text-white shadow-lg scale-105 z-10 border-teal-700' : 'bg-white text-slate-300 border-slate-100'
                                  }`}>
                                      {cells[row][col]}
                                      {isTarget && <div className="absolute -top-2 -right-2 bg-white text-teal-600 rounded-full p-1 shadow-sm"><CheckCircle size={14}/></div>}
                                  </div>
                              );
                          })}
                      </div>
                  ))}
              </div>
              <div className="flex justify-between px-2 text-xs font-bold text-slate-400 mt-2 relative">
                  <span>Laag</span>
                  <span>Midden</span>
                  <span>Hoog</span>
                  <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-slate-900">PRESTATIE</div>
              </div>
          </div>
      );
  };

  const renderTrend = (history: EvaluationCycle[]) => {
      // Sort by date old to new
      const sorted = [...history].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // We assume last 3
      const recent = sorted.slice(-4);
      if (recent.length < 2) return null; // Need at least 2 points for a trend

      const current = recent[recent.length - 1];
      const previous = recent[recent.length - 2];
      
      const diff = (current.overallRating || 0) - (previous.overallRating || 0);
      const isPositive = diff > 0;
      
      return (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Trend</div>
                  <div className={`text-sm font-bold flex items-center gap-1 ${isPositive ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                      {isPositive ? <TrendingUp size={16}/> : diff < 0 ? <TrendingDown size={16}/> : <Minus size={16}/>}
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} vs vorige
                  </div>
              </div>
              {/* Mini Sparkline Visualization (Abstract) */}
              <div className="flex items-end gap-1 h-8">
                  {recent.map((ev, i) => (
                      <div 
                        key={i} 
                        className={`w-2 rounded-t-sm ${ev.id === current.id ? 'bg-teal-500' : 'bg-slate-300'}`} 
                        style={{ height: `${((ev.overallRating || 0) / 5) * 100}%` }}
                      ></div>
                  ))}
              </div>
          </div>
      );
  };

  // --- VIEWS ---

  const renderDashboard = () => (
      <div className="space-y-8 animate-in fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                   <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                       <BarChart3 className="text-teal-600" size={32} />
                       Performance Center
                   </h1>
                   <p className="text-slate-500 mt-1">Beheer evaluatiecycli, doelstellingen en voortgang.</p>
               </div>
               {isManager && (
                   <button 
                     onClick={() => setIsCreateModalOpen(true)}
                     className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                   >
                       <Plus size={18}/> Start Nieuwe Cyclus
                   </button>
               )}
          </div>

          {/* Active Cycles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allEvaluations.map(({ evaluation, employee }) => {
                  const percent = 
                    evaluation.status === 'EmployeeInput' ? 25 :
                    evaluation.status === 'ManagerInput' ? 50 :
                    evaluation.status === 'Review' ? 75 : 100;
                  
                  const isActionRequired = 
                    (isManager && evaluation.status === 'ManagerInput') ||
                    (!isManager && evaluation.status === 'EmployeeInput') ||
                    (evaluation.status === 'Review' && !evaluation.signatures.some(s => s.signedById === currentUser.id));

                  return (
                      <div 
                        key={evaluation.id} 
                        onClick={() => { setSelectedEvaluationId(evaluation.id); setWizardStep(1); }}
                        className={`group bg-white rounded-2xl border p-6 shadow-sm cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${isActionRequired ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-200'}`}
                      >
                          {isActionRequired && (
                              <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                                  ACTIE VEREIST
                              </div>
                          )}
                          
                          <div className="flex items-center gap-4 mb-4">
                              <img src={employee.avatar} className="w-12 h-12 rounded-full border-2 border-slate-100" alt="Avatar"/>
                              <div>
                                  <h3 className="font-bold text-slate-900">{employee.name}</h3>
                                  <p className="text-xs text-slate-500">{evaluation.type}</p>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                  <span>{getStatusLabel(evaluation.status)}</span>
                                  <span>{percent}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 transition-all duration-1000" style={{width: `${percent}%`}}></div>
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                      <Calendar size={12}/> {evaluation.createdAt}
                                  </span>
                                  <span className="text-xs font-bold text-teal-600 group-hover:underline">Open Dossier</span>
                              </div>
                          </div>
                      </div>
                  );
              })}
              {allEvaluations.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                      <ClipboardCheck size={48} className="mx-auto mb-4 opacity-20"/>
                      <p>Nog geen evaluaties gestart.</p>
                  </div>
              )}
          </div>
      </div>
  );

  const renderWizard = () => {
      if (!activeEvaluationData) return null;
      const { evaluation, employee } = activeEvaluationData;
      
      const isReviewMode = evaluation.status === 'Review' || evaluation.status === 'Signed' || evaluation.status === 'Archived';
      const isMyTurn = (isManager && evaluation.status === 'ManagerInput') || (!isManager && evaluation.status === 'EmployeeInput');
      
      // If completed/review, show the Official Report View
      if (isReviewMode) return renderOfficialReport(evaluation, employee);

      // If waiting for other
      if (!isMyTurn) {
          return (
              <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm mt-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <Clock size={48} className="text-slate-400"/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Wachten op input...</h2>
                  <p className="text-slate-600 mb-8 max-w-md mx-auto">
                      Het dossier is momenteel bij {evaluation.status === 'ManagerInput' ? 'de manager' : 'de medewerker'}. 
                      Je ontvangt een notificatie zodra het jouw beurt is.
                  </p>
                  <button onClick={() => setSelectedEvaluationId(null)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50">
                      Terug naar overzicht
                  </button>
              </div>
          );
      }

      // --- WIZARD INTERFACE ---
      return (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
              {/* Wizard Header */}
              <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50 py-4 z-20 border-b border-slate-200/50 backdrop-blur-sm">
                  <button onClick={() => setSelectedEvaluationId(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                      <ArrowLeft size={18} /> Opslaan & Sluiten
                  </button>
                  
                  <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-full shadow-sm border border-slate-200">
                      {[1, 2, 3].map(step => (
                          <div key={step} className="flex items-center">
                              <button 
                                onClick={() => setWizardStep(step as any)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    wizardStep === step ? 'bg-teal-600 text-white scale-110' : 
                                    wizardStep > step ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                  {wizardStep > step ? <Check size={14}/> : step}
                              </button>
                              {step < 3 && <div className={`w-8 h-0.5 mx-2 ${wizardStep > step ? 'bg-teal-200' : 'bg-slate-200'}`}></div>}
                          </div>
                      ))}
                  </div>

                  <button 
                    onClick={() => {
                        if (wizardStep < 3) setWizardStep(prev => prev + 1 as any);
                        else {
                            // Finalize
                            const nextStatus = isManager ? 'Review' : 'ManagerInput';
                            handleUpdateEvaluation(evaluation, { status: nextStatus });
                            onShowToast(isManager ? 'Evaluatie afgerond en klaar voor gesprek!' : 'Verzonden naar manager!');
                            setSelectedEvaluationId(null);
                        }
                    }}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                      {wizardStep === 3 ? 'Afronden' : 'Volgende Stap'} <ArrowRight size={16}/>
                  </button>
              </div>

              {/* Wizard Content */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[600px]">
                  
                  {/* Step 1: Reflection */}
                  {wizardStep === 1 && (
                      <div className="p-8 lg:p-12">
                          <h2 className="text-2xl font-bold text-slate-900 mb-2">Terugblik & Reflectie</h2>
                          <p className="text-slate-500 mb-8">Neem de tijd om terug te kijken op de afgelopen periode.</p>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              {/* Left: Input */}
                              <div className="space-y-6">
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-3">Algemeen Gevoel</label>
                                      <textarea 
                                        className="w-full h-32 rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="Hoe heb je de afgelopen periode ervaren?"
                                        defaultValue={isManager ? evaluation.managerGeneralFeedback : evaluation.employeeGeneralFeedback}
                                        onBlur={e => handleUpdateEvaluation(evaluation, { [isManager ? 'managerGeneralFeedback' : 'employeeGeneralFeedback']: e.target.value })}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-green-700 mb-3 flex items-center gap-2"><TrendingUp size={16}/> Successen (Wins)</label>
                                      <textarea 
                                        className="w-full h-32 rounded-xl border border-green-100 p-4 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none bg-green-50/30 focus:bg-white transition-colors"
                                        placeholder="Waar ben je trots op?"
                                        defaultValue={isManager ? evaluation.managerWins : evaluation.employeeWins}
                                        onBlur={e => handleUpdateEvaluation(evaluation, { [isManager ? 'managerWins' : 'employeeWins']: e.target.value })}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-amber-700 mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Uitdagingen (Struggles)</label>
                                      <textarea 
                                        className="w-full h-32 rounded-xl border border-amber-100 p-4 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none bg-amber-50/30 focus:bg-white transition-colors"
                                        placeholder="Wat was lastig of kan beter?"
                                        defaultValue={isManager ? evaluation.managerStruggles : evaluation.employeeStruggles}
                                        onBlur={e => handleUpdateEvaluation(evaluation, { [isManager ? 'managerStruggles' : 'employeeStruggles']: e.target.value })}
                                      />
                                  </div>
                              </div>

                              {/* Right: Context (Only for Manager) */}
                              {isManager && (
                                  <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 h-fit">
                                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                          <User size={18} className="text-slate-400"/> Input van {employee.name}
                                      </h3>
                                      <div className="space-y-6 text-sm text-slate-600">
                                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Algemeen</span>
                                              <p className="italic">"{evaluation.employeeGeneralFeedback || 'Nog niet ingevuld'}"</p>
                                          </div>
                                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                              <span className="text-xs font-bold text-green-600 uppercase block mb-1">Wins</span>
                                              <p className="italic">"{evaluation.employeeWins || 'Nog niet ingevuld'}"</p>
                                          </div>
                                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                              <span className="text-xs font-bold text-amber-600 uppercase block mb-1">Struggles</span>
                                              <p className="italic">"{evaluation.employeeStruggles || 'Nog niet ingevuld'}"</p>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {/* Step 2: Scores (Split View) */}
                  {wizardStep === 2 && (
                      <div className="flex h-full min-h-[600px]">
                          {/* Manager sees Employee Answers on left (Read Only) */}
                          {isManager && (
                              <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-8 overflow-y-auto">
                                  <h3 className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-6 sticky top-0 bg-slate-50 py-2 z-10">
                                      Input Medewerker
                                  </h3>
                                  <div className="space-y-8">
                                      {evaluation.scores.map((score, idx) => (
                                          <div key={idx} className="opacity-80">
                                              <p className="font-bold text-slate-700 text-sm mb-2">{score.topic}</p>
                                              <div className="flex items-center gap-2 mb-2">
                                                  <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg font-bold text-slate-900 shadow-sm">
                                                      {score.employeeScore}/5
                                                  </div>
                                              </div>
                                              {score.employeeComment && (
                                                  <p className="text-xs text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">"{score.employeeComment}"</p>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Active Input Area */}
                          <div className={`flex-1 p-8 lg:p-12 overflow-y-auto ${!isManager ? 'max-w-3xl mx-auto' : ''}`}>
                              <h2 className="text-2xl font-bold text-slate-900 mb-6">Competentie Beoordeling</h2>
                              <div className="space-y-10">
                                  {evaluation.scores.map((score, idx) => (
                                      <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-teal-300 hover:shadow-md">
                                          <div className="flex justify-between items-start mb-4">
                                              <div>
                                                  <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded uppercase tracking-wide">{score.category}</span>
                                                  <h3 className="font-bold text-lg text-slate-900 mt-1">{score.topic}</h3>
                                              </div>
                                              
                                              {/* Gap Alert for Manager */}
                                              {isManager && Math.abs(score.managerScore - score.employeeScore) >= 2 && score.managerScore > 0 && (
                                                  <div className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-3 py-1.5 rounded-full animate-in fade-in">
                                                      <Split size={14}/> Inzicht Verschil
                                                  </div>
                                              )}
                                          </div>

                                          <div className="mb-4">
                                              <div className="flex items-center gap-2">
                                                  {[1, 2, 3, 4, 5].map(val => {
                                                      const currentVal = isManager ? score.managerScore : score.employeeScore;
                                                      return (
                                                          <button
                                                            key={val}
                                                            onClick={() => {
                                                                const newScores = [...evaluation.scores];
                                                                newScores[idx] = { 
                                                                    ...newScores[idx], 
                                                                    [isManager ? 'managerScore' : 'employeeScore']: val 
                                                                };
                                                                handleUpdateEvaluation(evaluation, { scores: newScores });
                                                            }}
                                                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center ${
                                                                currentVal === val 
                                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-110' 
                                                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                                                            }`}
                                                          >
                                                              {val}
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                              <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                                                  <span>Ontwikkelbaar</span>
                                                  <span>Rolmodel</span>
                                              </div>
                                          </div>

                                          <div className="relative">
                                              <textarea 
                                                className="w-full rounded-xl border border-slate-100 p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 focus:bg-white transition-colors h-20 resize-none pr-10"
                                                placeholder="Toelichting (optioneel)..."
                                                defaultValue={isManager ? score.managerComment : score.employeeComment}
                                                onBlur={e => {
                                                    const newScores = [...evaluation.scores];
                                                    newScores[idx] = { 
                                                        ...newScores[idx], 
                                                        [isManager ? 'managerComment' : 'employeeComment']: e.target.value 
                                                    };
                                                    handleUpdateEvaluation(evaluation, { scores: newScores });
                                                }}
                                              />
                                              <div className="absolute right-3 top-3 group/tip">
                                                  <PenTool size={16} className="text-slate-300 group-hover/tip:text-teal-500 cursor-help"/>
                                                  <div className="absolute right-0 top-6 w-48 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover/tip:block z-10">
                                                      Tip: Wees specifiek en geef voorbeelden.
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Step 3: Finalize (Manager Only) */}
                  {wizardStep === 3 && (
                      <div className="p-8 lg:p-12 max-w-3xl mx-auto">
                          {isManager ? (
                              <div className="space-y-10">
                                  {/* Potential Rating */}
                                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                                      <h3 className="font-bold text-slate-900 mb-2">Groeipotentieel Inschatting</h3>
                                      <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
                                          Schat in hoe waarschijnlijk het is dat de medewerker doorgroeit naar een zwaardere rol binnen 1-2 jaar.
                                      </p>
                                      <div className="flex justify-center gap-4">
                                          {['Low', 'Medium', 'High'].map(level => (
                                              <button
                                                key={level}
                                                onClick={() => handleUpdateEvaluation(evaluation, { potential: level as any })}
                                                className={`px-6 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                                    evaluation.potential === level 
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                }`}
                                              >
                                                  {level === 'Low' && 'Laag / Stabiel'}
                                                  {level === 'Medium' && 'Midden / Groei'}
                                                  {level === 'High' && 'Hoog / Topper'}
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  {/* Private Notes */}
                                  <div>
                                      <div className="flex items-center gap-2 mb-4">
                                          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Lock size={20}/></div>
                                          <h2 className="text-xl font-bold text-slate-900">Privé Notities</h2>
                                      </div>
                                      <textarea 
                                        className="w-full h-32 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                        placeholder="Typ hier notities voor jezelf..."
                                        defaultValue={evaluation.privateManagerNotes}
                                        onBlur={e => handleUpdateEvaluation(evaluation, { privateManagerNotes: e.target.value })}
                                      />
                                  </div>
                              </div>
                          ) : (
                              <div className="text-center mb-10">
                                  <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600">
                                      <CheckCircle size={48}/>
                                  </div>
                                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Klaar om te versturen?</h2>
                                  <p className="text-slate-600">
                                      Je hebt alle stappen doorlopen. Als je op 'Afronden' klikt, kan de manager jouw input bekijken.
                                  </p>
                              </div>
                          )}
                          
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-10">
                              <h3 className="font-bold text-slate-900 mb-2 text-center">Samenvatting</h3>
                              <div className="flex justify-center gap-8">
                                  <div className="text-center">
                                      <span className="block text-3xl font-bold text-slate-900">{evaluation.scores.filter(s => (isManager ? s.managerScore : s.employeeScore) > 0).length}</span>
                                      <span className="text-xs text-slate-500 uppercase tracking-wide">Ingevuld</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderOfficialReport = (evaluation: EvaluationCycle, employee: Employee) => {
      // Radar Data
      const radarData = evaluation.scores.map(s => ({
          subject: s.topic.length > 15 ? s.topic.substring(0, 15) + '...' : s.topic,
          Medewerker: s.employeeScore,
          Manager: s.managerScore,
          fullMark: 5
      }));

      const mySignature = evaluation.signatures.find(s => s.signedById === currentUser.id);
      const overallRating = evaluation.overallRating || 0;
      const history = (employee.evaluations || []).filter(e => e.status === 'Signed' || e.status === 'Archived' || e.id === evaluation.id);

      return (
          <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-24">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-8 print:hidden">
                  <button onClick={() => setSelectedEvaluationId(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                      <ArrowLeft size={18} /> Terug
                  </button>
                  <div className="flex gap-3">
                      <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2">
                          <Printer size={18}/> Print
                      </button>
                      {!mySignature && evaluation.status === 'Review' && (
                          <button 
                            onClick={handleSign}
                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 flex items-center gap-2 animate-pulse"
                          >
                              <PenLine size={18}/> Ondertekenen
                          </button>
                      )}
                  </div>
              </div>

              {/* PAPER DOCUMENT */}
              <div className="bg-white shadow-2xl rounded-sm min-h-[1000px] p-12 lg:p-16 relative text-slate-900 print:shadow-none print:p-0 print:border-none">
                  {/* Watermark/Status */}
                  {evaluation.status === 'Signed' && (
                      <div className="absolute top-12 right-12 border-4 border-green-600 text-green-600 px-6 py-2 font-black text-2xl uppercase opacity-30 transform rotate-12 pointer-events-none">
                          GETEKEND
                      </div>
                  )}

                  {/* Header */}
                  <div className="border-b-2 border-slate-900 pb-8 mb-12 flex justify-between items-start">
                      <div>
                          <h1 className="text-4xl font-serif font-bold mb-2">Evaluatierapport</h1>
                          <p className="text-slate-500 uppercase tracking-widest text-sm font-bold">{evaluation.type} Cyclus</p>
                      </div>
                      <div className="text-right">
                          <div className="font-bold text-xl">Sanadome Nijmegen</div>
                          <div className="text-sm text-slate-500">{new Date().getFullYear()}</div>
                      </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-12 mb-12">
                      <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Medewerker</h3>
                          <div className="flex items-center gap-4">
                              <img src={employee.avatar} className="w-16 h-16 rounded-xl object-cover border border-slate-200 print:hidden" alt="Avatar"/>
                              <div>
                                  <div className="font-bold text-lg">{employee.name}</div>
                                  <div className="text-slate-500">{employee.role}</div>
                                  <div className="text-sm text-slate-400 mt-1">{employee.departments.join(', ')}</div>
                              </div>
                          </div>
                      </div>
                      <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Resultaat</h3>
                          <div className="flex gap-4">
                              <div className="bg-slate-900 text-white p-3 rounded-lg text-center min-w-[80px]">
                                  <span className="block text-2xl font-bold">{overallRating}</span>
                                  <span className="text-[10px] uppercase tracking-wider opacity-70">Rating</span>
                              </div>
                              {/* Trend Widget */}
                              {renderTrend(history)}
                          </div>
                      </div>
                  </div>

                  {/* 9-Grid & Radar */}
                  <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                      {evaluation.potential && renderNineGrid(overallRating, evaluation.potential)}
                      
                      <div className="h-64 relative">
                           <h4 className="font-bold text-slate-900 mb-2 text-center text-sm uppercase tracking-wide">Competentie Profiel</h4>
                           <ResponsiveContainer width="100%" height="100%">
                               <RadarChart cx="50%" cy="55%" outerRadius="75%" data={radarData}>
                                   <PolarGrid stroke="#e2e8f0" />
                                   <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
                                   <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                   <Radar name="Medewerker" dataKey="Medewerker" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                                   <Radar name="Manager" dataKey="Manager" stroke="#0f172a" fill="#0f172a" fillOpacity={0.4} />
                                   <Legend wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                               </RadarChart>
                           </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Scores Table */}
                  <div className="mb-12">
                      <h3 className="font-bold text-lg text-slate-900 mb-4 border-b border-slate-200 pb-2">Detailscores</h3>
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="text-slate-400 text-left border-b border-slate-100">
                                  <th className="font-medium py-2">Competentie</th>
                                  <th className="font-medium py-2 text-center w-24">Medewerker</th>
                                  <th className="font-medium py-2 text-center w-24">Manager</th>
                                  <th className="font-medium py-2 w-1/3">Toelichting</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {evaluation.scores.map((s, i) => (
                                  <tr key={i}>
                                      <td className="py-3 pr-4 font-medium text-slate-800">{s.topic}</td>
                                      <td className="py-3 text-center text-slate-500">{s.employeeScore}</td>
                                      <td className="py-3 text-center font-bold text-slate-900">{s.managerScore}</td>
                                      <td className="py-3 pl-4 text-slate-600 italic text-xs">
                                          {s.managerComment && <div className="mb-1">"{s.managerComment}"</div>}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* GROWTH PLAN MODULE - NEW in Review Phase */}
                  <div className="mb-16 bg-slate-50 p-8 rounded-xl border border-slate-100 relative group/plan">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                              <Target size={20} className="text-teal-600"/> Groeipad & Traject Planning
                          </h3>
                          {isManager && evaluation.status === 'Review' && (
                              <button 
                                onClick={() => { setIsLibraryModalOpen(true); setShowPlanBuilder(false); }}
                                className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors shadow-sm"
                              >
                                  + Groeipad Plannen
                              </button>
                          )}
                      </div>

                      {showPlanBuilder && (
                          <div className="bg-white p-5 rounded-lg shadow-sm border border-teal-200 mb-6 animate-in slide-in-from-top-2">
                              <h4 className="font-bold text-slate-900 text-sm mb-3">Stel Deadline in voor: {newDevGoal.title}</h4>
                              <p className="text-xs text-slate-500 mb-4">Op basis van de deadline genereren we automatisch de tussentijdse evaluatiemomenten.</p>
                              
                              <div className="flex items-end gap-3">
                                  <div className="flex-1">
                                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Streefdatum</label>
                                      <input 
                                        type="date" 
                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                        value={newDevGoal.deadline || ''}
                                        onChange={(e) => setNewDevGoal({...newDevGoal, deadline: e.target.value})}
                                      />
                                  </div>
                                  <button 
                                    onClick={() => handleAddDevelopmentGoal(evaluation)}
                                    className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg text-sm hover:bg-teal-700 h-10"
                                  >
                                      Genereer Planning
                                  </button>
                                  <button onClick={() => setShowPlanBuilder(false)} className="px-3 py-2 text-slate-400 hover:text-red-500">
                                      <X size={18}/>
                                  </button>
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-1 gap-6">
                          {evaluation.developmentPlan?.map(goal => (
                              <div key={goal.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
                                  <div className="flex justify-between items-start mb-3">
                                      <div>
                                          <h4 className="font-bold text-slate-900 text-base">{goal.title}</h4>
                                          <p className="text-sm text-slate-600 mt-1">{goal.description}</p>
                                      </div>
                                      <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-1 rounded uppercase tracking-wide border border-teal-100">
                                          {goal.category}
                                      </span>
                                  </div>
                                  
                                  {/* Timeline Visualization inside report */}
                                  <div className="mt-6 border-t border-slate-50 pt-4">
                                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">Geplande Evaluatiemomenten</h5>
                                      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                                          {/* SAFEGUARD: Using (goal.checkIns || []).map to prevent crash */}
                                          {(goal.checkIns || []).map((ci, idx) => (
                                              <div key={idx} className="flex-shrink-0 flex flex-col items-center min-w-[80px]">
                                                  <div className="w-3 h-3 rounded-full bg-slate-200 mb-2 border-2 border-white ring-1 ring-slate-100"></div>
                                                  <span className="text-[10px] font-bold text-slate-600">{ci.date}</span>
                                                  <span className="text-[9px] text-slate-400 uppercase">Check-in {idx+1}</span>
                                              </div>
                                          ))}
                                          <div className="h-px bg-slate-200 flex-1 mx-2"></div>
                                          <div className="flex-shrink-0 flex flex-col items-center min-w-[80px]">
                                              <div className="w-3 h-3 rounded-full bg-slate-900 mb-2"></div>
                                              <span className="text-[10px] font-bold text-slate-900">{goal.deadline}</span>
                                              <span className="text-[9px] text-slate-400 uppercase">Deadline</span>
                                          </div>
                                      </div>
                                  </div>

                                  {isManager && evaluation.status === 'Review' && (
                                      <button 
                                        onClick={() => handleRemoveGoal(evaluation, goal.id)}
                                        className="absolute top-4 right-12 text-slate-300 hover:text-red-500 transition-colors p-1"
                                        title="Plan verwijderen"
                                      >
                                          <Trash2 size={16}/>
                                      </button>
                                  )}
                              </div>
                          ))}
                          {(!evaluation.developmentPlan || evaluation.developmentPlan.length === 0) && (
                              <p className="text-slate-400 italic text-center text-sm py-4">
                                  Nog geen groeipad vastgesteld. Gebruik de knop hierboven om een traject te starten.
                              </p>
                          )}
                      </div>
                  </div>

                  {/* Signatures Area */}
                  <div className="grid grid-cols-2 gap-20 pt-8 border-t-2 border-slate-900">
                      <div>
                          <div className="h-24 border-b border-slate-300 mb-2 flex items-center justify-center relative bg-slate-50/30">
                              {evaluation.signatures.find(s => s.role === 'Manager') ? (
                                  <>
                                      <div className="absolute inset-0 border-4 border-slate-900 opacity-10 rotate-3"></div>
                                      <div className="font-script text-3xl text-slate-900 transform -rotate-3 z-10">
                                          {evaluation.signatures.find(s => s.role === 'Manager')?.signedBy}
                                      </div>
                                      <div className="absolute bottom-1 right-2 text-[10px] text-slate-400 font-mono">DIGITALLY SIGNED</div>
                                  </>
                              ) : (
                                  <div className="text-xs text-slate-300">Handtekening Manager</div>
                              )}
                          </div>
                          <div className="font-bold text-slate-900">Manager</div>
                          <div className="text-xs text-slate-500">
                              {evaluation.signatures.find(s => s.role === 'Manager')?.signedAt || '...'}
                          </div>
                      </div>
                      <div>
                          <div className="h-24 border-b border-slate-300 mb-2 flex items-center justify-center relative bg-slate-50/30">
                              {evaluation.signatures.find(s => s.role === 'Employee') ? (
                                  <>
                                      <div className="absolute inset-0 border-4 border-slate-900 opacity-10 -rotate-2"></div>
                                      <div className="font-script text-3xl text-slate-900 transform rotate-2 z-10">
                                          {evaluation.signatures.find(s => s.role === 'Employee')?.signedBy}
                                      </div>
                                      <div className="absolute bottom-1 right-2 text-[10px] text-slate-400 font-mono">DIGITALLY SIGNED</div>
                                  </>
                              ) : (
                                  <div className="text-xs text-slate-300">Handtekening Medewerker</div>
                              )}
                          </div>
                          <div className="font-bold text-slate-900">Medewerker</div>
                          <div className="text-xs text-slate-500">
                              {evaluation.signatures.find(s => s.role === 'Employee')?.signedAt || '...'}
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      );
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
        {selectedEvaluationId ? renderWizard() : renderDashboard()}

        <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Nieuwe Evaluatie Starten"
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Medewerker</label>
                    <select 
                        className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                        value={createEmployeeId}
                        onChange={(e) => setCreateEmployeeId(e.target.value)}
                    >
                        <option value="">Selecteer medewerker...</option>
                        {employees.filter(e => e.id !== currentUser.id).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type Evaluatie</label>
                    <select 
                        className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                        value={createType}
                        onChange={(e) => setCreateType(e.target.value as any)}
                    >
                        <option value="Month 1">Maand 1 Evaluatie</option>
                        <option value="Month 3">Maand 3 Evaluatie</option>
                        <option value="Annual">Jaarlijkse Beoordeling</option>
                        <option value="Performance">Performance Review</option>
                    </select>
                </div>
                <button 
                    onClick={handleCreateEvaluation}
                    disabled={!createEmployeeId}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    Start Cyclus
                </button>
            </div>
        </Modal>

        {/* Development Library Picker Modal */}
        <Modal
            isOpen={isLibraryModalOpen}
            onClose={() => setIsLibraryModalOpen(false)}
            title="Development Library"
        >
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <p className="text-sm text-slate-500 mb-6">Selecteer een voorgeprogrammeerd ontwikkeldoel.</p>
                <div className="space-y-4">
                    {MOCK_DEVELOPMENT_LIBRARY.map(libItem => (
                        <div 
                            key={libItem.id} 
                            onClick={() => {
                                if (activeEvaluationData) {
                                    handleAddFromLibrary(activeEvaluationData.evaluation, libItem);
                                }
                            }}
                            className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md cursor-pointer transition-all bg-white group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-900 group-hover:text-teal-700">{libItem.title}</h4>
                                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{libItem.category}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{libItem.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default EvaluationsPage;
