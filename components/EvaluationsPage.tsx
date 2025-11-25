
import React, { useState, useMemo } from 'react';
import { 
    ClipboardCheck, Plus, Search, Calendar, User, ArrowRight, Play, CheckCircle, Clock, 
    AlertCircle, BarChart3, ChevronRight, MessageSquare, BrainCircuit, X, Target, PenTool, TrendingUp, AlertTriangle, FileCheck, Star
} from 'lucide-react';
import { Employee, EvaluationCycle, Notification, ViewState, EvaluationScore, EvaluationGoal } from '../types';
import { EVALUATION_TEMPLATES } from '../utils/mockData';
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
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', deadline: '' });

  const isManager = currentUser.role === 'Manager';

  // Consolidate all evaluations from all employees into one list for the dashboard
  const allEvaluations = useMemo(() => {
      const list: { evaluation: EvaluationCycle, employee: Employee }[] = [];
      employees.forEach(emp => {
          (emp.evaluations || []).forEach(ev => {
              // Filtering: Employees only see their own, Managers see all
              if (isManager || emp.id === currentUser.id) {
                  list.push({ evaluation: ev, employee: emp });
              }
          });
      });
      // Sort: Pending first, then by date
      return list.sort((a, b) => {
          const statusPriority = { 'ManagerInput': 1, 'EmployeeInput': 1, 'Review': 2, 'Planned': 3, 'Completed': 4 };
          const statusDiff = (statusPriority[a.evaluation.status as keyof typeof statusPriority] || 5) - (statusPriority[b.evaluation.status as keyof typeof statusPriority] || 5);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.evaluation.createdAt).getTime() - new Date(a.evaluation.createdAt).getTime();
      });
  }, [employees, isManager, currentUser.id]);

  const activeEvaluationData = useMemo(() => {
      if (!selectedEvaluationId) return null;
      return allEvaluations.find(i => i.evaluation.id === selectedEvaluationId);
  }, [selectedEvaluationId, allEvaluations]);

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
          message: `Er staat een ${createType} evaluatie voor je klaar. Vul deze in voor het gesprek.`,
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

      // Check if ready for report logic
      const updatedEval = updatedEvaluations.find(ev => ev.id === evaluation.id)!;

      // Logic: If completing conversation, calculate overall
      if (updates.status === 'Completed') {
           // Generating Report logic
           const lowScores = updatedEval.scores.filter(s => s.managerScore > 0 && s.managerScore < 3);
           const advice: string[] = [];
           lowScores.forEach(s => {
               if (s.topic.includes('IDu')) advice.push('Extra training inplannen bij Janique voor IDu PMS.');
               if (s.topic.includes('Upselling')) advice.push('Meelopen met Senior tijdens check-in piekuren.');
               if (s.topic.includes('Kassa')) advice.push('Kassa-procedures handboek opnieuw doornemen.');
           });
           updatedEval.smartAdvice = advice;
           updatedEval.completedAt = new Date().toLocaleDateString('nl-NL');
           
           // Calculate Overall Rating
           const totalScore = updatedEval.scores.reduce((sum, s) => sum + s.managerScore, 0);
           const count = updatedEval.scores.filter(s => s.managerScore > 0).length;
           updatedEval.overallRating = count > 0 ? Number((totalScore / count).toFixed(1)) : 0;
      }

      onUpdateEmployee({ ...targetEmp, evaluations: updatedEvaluations });
  };

  const handleAddGoal = (evaluation: EvaluationCycle) => {
      if (!newGoal.title) return;
      
      const goal: EvaluationGoal = {
          id: Math.random().toString(36).substr(2, 9),
          title: newGoal.title,
          description: newGoal.description,
          deadline: newGoal.deadline,
          status: 'Proposed'
      };
      
      handleUpdateEvaluation(evaluation, { goals: [...(evaluation.goals || []), goal] });
      setNewGoal({ title: '', description: '', deadline: '' });
  };

  const renderReport = () => {
      if (!activeEvaluationData) return null;
      const { evaluation, employee } = activeEvaluationData;

      const radarData = evaluation.scores.map(s => ({
          subject: s.topic,
          Medewerker: s.employeeScore,
          Manager: s.managerScore,
          fullMark: 5
      }));

      return (
          <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setSelectedEvaluationId(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
                      <ArrowRight size={16} className="rotate-180"/> Terug naar overzicht
                  </button>
                  <h1 className="text-2xl font-bold text-slate-900">Evaluatierapport</h1>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Radar Chart */}
                  <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                       <h3 className="font-bold text-slate-900 mb-4">Competentie Analyse</h3>
                       <div className="h-64 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                   <PolarGrid stroke="#e2e8f0" />
                                   <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                                   <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                   <Radar name={employee.name} dataKey="Medewerker" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} />
                                   <Radar name="Manager" dataKey="Manager" stroke="#0f172a" fill="#0f172a" fillOpacity={0.3} />
                                   <Legend />
                               </RadarChart>
                           </ResponsiveContainer>
                       </div>
                  </div>

                  {/* Scores Table/List */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-4">Detail Scores</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                          {evaluation.scores.map((score, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                  <div>
                                      <div className="text-xs font-bold text-slate-400 uppercase">{score.category}</div>
                                      <div className="font-bold text-slate-900">{score.topic}</div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="text-right">
                                          <div className="text-xs text-slate-400">Medewerker</div>
                                          <div className="font-bold text-teal-600">{score.employeeScore}</div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-xs text-slate-400">Manager</div>
                                          <div className="font-bold text-slate-900">{score.managerScore}</div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Feedback Section */}
                  <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-6">Feedback & Reflectie</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Medewerker ({employee.name})</h4>
                              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic">"{evaluation.employeeGeneralFeedback || 'Geen toelichting'}"</div>
                              
                              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                  <div className="text-xs font-bold text-green-700 uppercase mb-1">Wins</div>
                                  <p className="text-sm text-slate-700">{evaluation.employeeWins || '-'}</p>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Manager</h4>
                              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic">"{evaluation.managerGeneralFeedback || 'Geen toelichting'}"</div>
                              
                              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                  <div className="text-xs font-bold text-green-700 uppercase mb-1">Wins</div>
                                  <p className="text-sm text-slate-700">{evaluation.managerWins || '-'}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderDashboard = () => (
      <div className="space-y-8">
          {/* Header & KPIs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                   <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Performance Center</h1>
                   <p className="text-slate-500 mt-1">Monitor groei, doelstellingen en evaluaties.</p>
               </div>
               {isManager && (
                   <div className="flex gap-3">
                       <button 
                         onClick={() => setIsCreateModalOpen(true)}
                         className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
                       >
                           <Plus size={18}/> Nieuwe Cyclus
                       </button>
                   </div>
               )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20}/></div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Actie Vereist</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                      {allEvaluations.filter(e => 
                          (isManager && e.evaluation.status === 'ManagerInput') || 
                          (!isManager && e.evaluation.status === 'EmployeeInput')
                      ).length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Openstaande evaluaties</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Target size={20}/></div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Gem. Score</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                      {isManager ? '4.2' : (currentUser.evaluations?.[0]?.overallRating || '-')}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Schaal van 5</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileCheck size={20}/></div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Afgerond (YTD)</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                      {allEvaluations.filter(e => e.evaluation.status === 'Completed').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Dit jaar</p>
              </div>
          </div>

          {/* Evaluations List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                   <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Lopende & Recente Evaluaties</h3>
               </div>
               <table className="w-full text-left">
                   <thead className="bg-white border-b border-slate-200">
                       <tr>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Medewerker</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Startdatum</th>
                           <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                           <th className="px-6 py-4 text-right"></th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {allEvaluations.map(({ evaluation, employee }) => {
                           const isMyTurn = (isManager && evaluation.status === 'ManagerInput') || 
                                            (!isManager && evaluation.status === 'EmployeeInput');
                           
                           return (
                               <tr key={evaluation.id} className="hover:bg-slate-50 transition-colors group">
                                   <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                           <img src={employee.avatar} className="w-8 h-8 rounded-full object-cover" alt="Avatar"/>
                                           <span className="text-sm font-bold text-slate-900">{employee.name}</span>
                                       </div>
                                   </td>
                                   <td className="px-6 py-4">
                                       <span className="inline-flex px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                           {evaluation.type}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 text-sm text-slate-500 font-medium">{evaluation.createdAt}</td>
                                   <td className="px-6 py-4">
                                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                                           evaluation.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                           evaluation.status === 'Review' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                           isMyTurn ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                                           'bg-slate-100 text-slate-500 border-slate-200'
                                       }`}>
                                           {evaluation.status === 'Completed' && <CheckCircle size={12}/>}
                                           {evaluation.status === 'Review' && <MessageSquare size={12}/>}
                                           {(evaluation.status === 'EmployeeInput' || evaluation.status === 'ManagerInput') && <Clock size={12}/>}
                                           
                                           {evaluation.status === 'EmployeeInput' ? 'Wachten op Medewerker' :
                                            evaluation.status === 'ManagerInput' ? 'Wachten op Manager' :
                                            evaluation.status === 'Review' ? 'Klaar voor gesprek' :
                                            evaluation.status === 'Completed' ? 'Afgerond' : 'Gepland'}
                                       </div>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                       <button 
                                         onClick={() => {
                                             setWizardStep(1);
                                             setSelectedEvaluationId(evaluation.id);
                                         }}
                                         className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm ${
                                             isMyTurn 
                                             ? 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5' 
                                             : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                         }`}
                                       >
                                           {isMyTurn ? 'Invullen' : 'Bekijken'}
                                       </button>
                                   </td>
                               </tr>
                           );
                       })}
                   </tbody>
               </table>
               {allEvaluations.length === 0 && (
                   <div className="text-center py-20 text-slate-400">
                       <ClipboardCheck size={48} className="mx-auto mb-4 opacity-20"/>
                       <p>Geen evaluaties gevonden.</p>
                   </div>
               )}
          </div>
      </div>
  );

  const renderWizard = () => {
      if (!activeEvaluationData) return null;
      const { evaluation, employee } = activeEvaluationData;
      const isMyInput = (isManager && evaluation.status === 'ManagerInput') || (!isManager && evaluation.status === 'EmployeeInput');
      const isCompleted = evaluation.status === 'Completed' || evaluation.status === 'Review';

      // If it's review/completed, show report instead
      if (isCompleted) return renderReport();

      // If waiting for other party
      if (!isMyInput) {
          return (
              <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock size={48} className="text-slate-400"/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Even geduld...</h2>
                  <p className="text-slate-600 mb-8">
                      We wachten momenteel op de input van {evaluation.status === 'ManagerInput' ? 'de manager' : 'de medewerker'}. 
                      Zodra dit is ingevuld, wordt het rapport gegenereerd.
                  </p>
                  <button onClick={() => setSelectedEvaluationId(null)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50">
                      Terug naar overzicht
                  </button>
              </div>
          );
      }

      return (
          <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setSelectedEvaluationId(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
                      <ArrowRight size={16} className="rotate-180"/> Opslaan & Sluiten
                  </button>
                  
                  {/* Stepper */}
                  <div className="flex items-center gap-2">
                      {[1, 2, 3].map(step => (
                          <div key={step} className={`flex items-center gap-2 ${wizardStep === step ? 'opacity-100' : 'opacity-40'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep === step ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  {step}
                              </div>
                              <span className="text-xs font-bold hidden sm:block">
                                  {step === 1 ? 'Reflectie' : step === 2 ? 'Competenties' : 'Doelen'}
                              </span>
                              {step < 3 && <div className="w-8 h-px bg-slate-300 mx-2"></div>}
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                  <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                      <div>
                          <h2 className="text-xl font-bold text-slate-900">
                              {wizardStep === 1 && 'Stap 1: Terugblik & Reflectie'}
                              {wizardStep === 2 && 'Stap 2: Competenties & Skills'}
                              {wizardStep === 3 && 'Stap 3: Toekomst & Doelen'}
                          </h2>
                          <p className="text-sm text-slate-500">
                              {wizardStep === 1 && 'Hoe heb je de afgelopen periode ervaren?'}
                              {wizardStep === 2 && 'Beoordeel de specifieke vaardigheden.'}
                              {wizardStep === 3 && 'Welke afspraken maken we voor de toekomst?'}
                          </p>
                      </div>
                      <div className="text-right hidden sm:block">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Medewerker</div>
                          <div className="font-bold text-slate-800">{employee.name}</div>
                      </div>
                  </div>

                  <div className="p-8 flex-1 overflow-y-auto">
                      
                      {/* STEP 1: REFLECTION */}
                      {wizardStep === 1 && (
                          <div className="space-y-8 animate-in fade-in">
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 mb-3">Algemene ervaring</label>
                                  <p className="text-xs text-slate-500 mb-2">Hoe kijk je terug op de afgelopen periode in het algemeen?</p>
                                  <textarea 
                                    className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[120px] bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="Typ hier je antwoord..."
                                    defaultValue={isManager ? evaluation.managerGeneralFeedback : evaluation.employeeGeneralFeedback}
                                    onBlur={(e) => {
                                        const field = isManager ? 'managerGeneralFeedback' : 'employeeGeneralFeedback';
                                        handleUpdateEvaluation(evaluation, { [field]: e.target.value });
                                    }}
                                  />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div>
                                      <label className="block text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                                          <TrendingUp size={18}/> Wat ging goed? (Wins)
                                      </label>
                                      <textarea 
                                        className="w-full rounded-xl border border-green-100 p-4 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[150px] bg-green-50/30 focus:bg-white transition-colors"
                                        placeholder="Successen, complimenten..."
                                        defaultValue={isManager ? evaluation.managerWins : evaluation.employeeWins}
                                        onBlur={(e) => {
                                            const field = isManager ? 'managerWins' : 'employeeWins';
                                            handleUpdateEvaluation(evaluation, { [field]: e.target.value });
                                        }}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                                          <AlertTriangle size={18}/> Uitdagingen (Struggles)
                                      </label>
                                      <textarea 
                                        className="w-full rounded-xl border border-amber-100 p-4 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[150px] bg-amber-50/30 focus:bg-white transition-colors"
                                        placeholder="Lastige situaties, leerpunten..."
                                        defaultValue={isManager ? evaluation.managerStruggles : evaluation.employeeStruggles}
                                        onBlur={(e) => {
                                            const field = isManager ? 'managerStruggles' : 'employeeStruggles';
                                            handleUpdateEvaluation(evaluation, { [field]: e.target.value });
                                        }}
                                      />
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* STEP 2: SCORES */}
                      {wizardStep === 2 && (
                          <div className="space-y-6 animate-in fade-in">
                              {evaluation.scores.map((scoreItem, idx) => (
                                  <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 transition-colors">
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                          <div className="flex-1">
                                              <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wide mb-1 bg-teal-50 inline-block px-2 py-0.5 rounded">{scoreItem.category}</div>
                                              <div className="font-bold text-lg text-slate-900">{scoreItem.topic}</div>
                                              <p className="text-xs text-slate-400 mt-1">Beoordeel op een schaal van 1 tot 5</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {[1, 2, 3, 4, 5].map(val => {
                                                  const currentVal = isManager ? scoreItem.managerScore : scoreItem.employeeScore;
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
                                                        className={`w-12 h-12 rounded-xl font-bold text-sm transition-all border-2 flex flex-col items-center justify-center ${
                                                            currentVal === val 
                                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-110' 
                                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                                                        }`}
                                                      >
                                                          <span className="text-lg">{val}</span>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}

                      {/* STEP 3: GOALS */}
                      {wizardStep === 3 && (
                          <div className="space-y-8 animate-in fade-in">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                      <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Target size={18}/> Nieuw Doel</h4>
                                      <div className="space-y-4">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doelstelling</label>
                                              <input 
                                                type="text" 
                                                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="Bv. Senior worden"
                                                value={newGoal.title}
                                                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Omschrijving</label>
                                              <textarea 
                                                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                rows={2}
                                                placeholder="Wat moet er gebeuren?"
                                                value={newGoal.description}
                                                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deadline</label>
                                              <input 
                                                type="text" 
                                                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="Bv. Q4 2023"
                                                value={newGoal.deadline}
                                                onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                                              />
                                          </div>
                                          <button 
                                            onClick={() => handleAddGoal(evaluation)}
                                            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
                                          >
                                              Toevoegen
                                          </button>
                                      </div>
                                  </div>

                                  <div className="space-y-4">
                                      <h4 className="font-bold text-slate-900 mb-4">Gestelde Doelen</h4>
                                      {evaluation.goals?.length === 0 && (
                                          <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                              Nog geen doelen toegevoegd.
                                          </div>
                                      )}
                                      {evaluation.goals?.map(goal => (
                                          <div key={goal.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                              <div className="flex justify-between items-start">
                                                  <h5 className="font-bold text-slate-900">{goal.title}</h5>
                                                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{goal.deadline}</span>
                                              </div>
                                              <p className="text-sm text-slate-600 mt-1">{goal.description}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center">
                      <button 
                          disabled={wizardStep === 1}
                          onClick={() => setWizardStep(prev => prev - 1 as any)}
                          className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 disabled:opacity-50 transition-colors"
                      >
                          Vorige
                      </button>
                      {wizardStep < 3 ? (
                          <button 
                              onClick={() => setWizardStep(prev => prev + 1 as any)}
                              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                              Volgende
                          </button>
                      ) : (
                          <button 
                              onClick={() => {
                                  const newStatus = isManager ? 'Completed' : 'ManagerInput';
                                  handleUpdateEvaluation(evaluation, { status: newStatus });
                                  onShowToast(isManager ? 'Evaluatie afgerond!' : 'Verzonden naar manager!');
                                  setSelectedEvaluationId(null);
                              }}
                              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
                          >
                              {isManager ? <CheckCircle size={16}/> : <ArrowRight size={16}/>}
                              {isManager ? 'Afronden' : 'Verzenden'}
                          </button>
                      )}
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
    </div>
  );
};

export default EvaluationsPage;
