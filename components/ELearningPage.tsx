
import React, { useState, useEffect, useMemo } from 'react';
import { 
    GraduationCap, Play, CheckCircle2, Clock, 
    ArrowRight, BookOpen, Plus, LayoutGrid, 
    List, MoreHorizontal, Trash2, Edit2, 
    User, Search, AlertTriangle, ShieldCheck, 
    FileText, Video, HelpCircle, X, ChevronRight, Save, Calendar,
    RefreshCw, Trophy, Layout, Image as ImageIcon, CheckSquare, ArrowLeft, BarChart3, Upload
} from 'lucide-react';
import { Employee, TrainingModule, AssignedTraining, Notification, ViewState, TrainingStep, QuizQuestion } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface ELearningPageProps {
    currentUser: Employee;
    employees: Employee[];
    onUpdateEmployee: (employee: Employee) => void;
    onShowToast: (message: string) => void;
    onAddNotification: (notification: Notification) => void;
}

const ELearningPage: React.FC<ELearningPageProps> = ({ 
    currentUser, employees, onUpdateEmployee, onShowToast, onAddNotification 
}) => {
    const [viewMode, setViewMode] = useState<'catalog' | 'player' | 'studio' | 'analytics'>('catalog');
    const [trainings, setTrainings] = useState<TrainingModule[]>([]);
    
    // Player State
    const [activeTrainingId, setActiveTrainingId] = useState<string | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [isTrainingComplete, setIsTrainingComplete] = useState(false);

    // Studio (Builder) State
    const [editingModule, setEditingModule] = useState<Partial<TrainingModule> | null>(null);
    const [activeStepId, setActiveStepId] = useState<string | null>(null);

    // Assign Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTargetId, setAssignTargetId] = useState<string | null>(null); // Training ID to assign

    // Robust Permission Check
    const isManager = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';
    const canManage = isManager || hasPermission(currentUser, 'MANAGE_TRAININGS');

    useEffect(() => {
        loadTrainings();
    }, []);

    const loadTrainings = async () => {
        try {
            const data = await api.getTrainings();
            setTrainings(data);
        } catch (e) {
            console.error("Failed to load trainings", e);
        }
    };

    // Derived State
    const myAssignments = useMemo(() => {
        return currentUser.trainings || [];
    }, [currentUser]);

    const activeAssignment = useMemo(() => {
        if (!activeTrainingId) return null;
        return myAssignments.find(a => a.trainingId === activeTrainingId);
    }, [activeTrainingId, myAssignments]);

    const activeTrainingModule = useMemo(() => {
        if (!activeTrainingId) return null;
        return trainings.find(t => t.id === activeTrainingId);
    }, [activeTrainingId, trainings]);

    // --- ACTIONS: PLAYER ---

    const startTraining = (trainingId: string) => {
        // Check if assigned, if not assign it now (self-enrollment)
        let assignment = myAssignments.find(a => a.trainingId === trainingId);
        
        if (!assignment) {
            assignment = {
                id: Math.random().toString(36).substr(2, 9),
                trainingId,
                employeeId: currentUser.id,
                status: 'In Progress',
                progress: 0,
                currentStepIndex: 0,
                assignedDate: new Date().toLocaleDateString('nl-NL')
            };
            const updatedUser = {
                ...currentUser,
                trainings: [...(currentUser.trainings || []), assignment]
            };
            onUpdateEmployee(updatedUser);
        }

        setActiveTrainingId(trainingId);
        setCurrentStepIndex(assignment.currentStepIndex || 0);
        setIsTrainingComplete(assignment.status === 'Completed');
        setViewMode('player');
    };

    const handleStepComplete = async () => {
        if (!activeTrainingModule || !activeAssignment) return;

        const nextIndex = currentStepIndex + 1;
        const totalSteps = activeTrainingModule.steps.length;
        const progress = Math.round((nextIndex / totalSteps) * 100);

        if (nextIndex < totalSteps) {
            setCurrentStepIndex(nextIndex);
            const updatedAssignment: AssignedTraining = {
                ...activeAssignment,
                currentStepIndex: nextIndex,
                progress: progress,
                status: 'In Progress'
            };
            updateUserAssignment(updatedAssignment);
        } else {
            setIsTrainingComplete(true);
            const updatedAssignment: AssignedTraining = {
                ...activeAssignment,
                currentStepIndex: nextIndex - 1,
                progress: 100,
                status: 'Completed',
                completedDate: new Date().toLocaleDateString('nl-NL')
            };
            updateUserAssignment(updatedAssignment);
            
            if (activeTrainingModule.recurrence !== 'None') {
                onShowToast(`Training voltooid! Volgende herhaling wordt automatisch ingepland.`);
            }
        }
    };

    const updateUserAssignment = (assignment: AssignedTraining) => {
        const otherAssignments = (currentUser.trainings || []).filter(a => a.id !== assignment.id);
        const updatedUser = {
            ...currentUser,
            trainings: [...otherAssignments, assignment]
        };
        onUpdateEmployee(updatedUser);
    };

    const handleQuizAnswer = (questionId: string, optionIndex: number) => {
        setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    // --- ACTIONS: STUDIO (BUILDER) ---

    const handleCreateNewModule = () => {
        const newModule: Partial<TrainingModule> = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Nieuwe Training',
            description: '',
            category: 'General',
            recurrence: 'None',
            targetRoles: ['All'],
            coverImage: '',
            steps: [],
            createdAt: new Date().toLocaleDateString('nl-NL'),
            createdBy: currentUser.name
        };
        setEditingModule(newModule);
        setActiveStepId('settings');
        setViewMode('studio');
    };

    const handleEditModule = (module: TrainingModule) => {
        setEditingModule({ ...module });
        setActiveStepId('settings');
        setViewMode('studio');
    };

    const handleAddStep = (type: 'Video' | 'Text' | 'Quiz' | 'PDF') => {
        if (!editingModule) return;
        const newStep: TrainingStep = {
            id: Math.random().toString(36).substr(2, 9),
            title: `Nieuwe ${type} stap`,
            type: type,
            content: '',
            durationMinutes: 5,
            quizData: type === 'Quiz' ? [] : undefined
        };
        const updatedSteps = [...(editingModule.steps || []), newStep];
        setEditingModule({ ...editingModule, steps: updatedSteps });
        setActiveStepId(newStep.id);
    };

    const handleUpdateStep = (stepId: string, updates: Partial<TrainingStep>) => {
        if (!editingModule || !editingModule.steps) return;
        const updatedSteps = editingModule.steps.map(s => s.id === stepId ? { ...s, ...updates } : s);
        setEditingModule({ ...editingModule, steps: updatedSteps });
    };

    const handleDeleteStep = (stepId: string) => {
        if (!editingModule || !editingModule.steps) return;
        const updatedSteps = editingModule.steps.filter(s => s.id !== stepId);
        setEditingModule({ ...editingModule, steps: updatedSteps });
        if (activeStepId === stepId) setActiveStepId('settings');
    };

    const handleSaveModule = async () => {
        if (!editingModule || !editingModule.title) {
            onShowToast("Titel is verplicht.");
            return;
        }
        
        const moduleToSave = editingModule as TrainingModule; // Cast as complete
        await api.saveTraining(moduleToSave);
        
        // Update local list
        setTrainings(prev => {
            const idx = prev.findIndex(t => t.id === moduleToSave.id);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = moduleToSave;
                return copy;
            }
            return [...prev, moduleToSave];
        });

        onShowToast("Training opgeslagen!");
        setViewMode('catalog');
    };

    const handleAssignTraining = (employeeIds: string[]) => {
        if (!assignTargetId) return;
        
        employeeIds.forEach(empId => {
            const emp = employees.find(e => e.id === empId);
            if (emp) {
                if (emp.trainings?.some(t => t.trainingId === assignTargetId && t.status !== 'Completed')) return;

                const assignment: AssignedTraining = {
                    id: Math.random().toString(36).substr(2, 9),
                    trainingId: assignTargetId,
                    employeeId: emp.id,
                    status: 'Not Started',
                    progress: 0,
                    currentStepIndex: 0,
                    assignedDate: new Date().toLocaleDateString('nl-NL')
                };

                const updatedEmp = {
                    ...emp,
                    trainings: [...(emp.trainings || []), assignment]
                };
                onUpdateEmployee(updatedEmp);

                const trainingTitle = trainings.find(t => t.id === assignTargetId)?.title;
                onAddNotification({
                    id: Math.random().toString(36).substr(2, 9),
                    recipientId: emp.id,
                    senderName: currentUser.name,
                    type: 'Training',
                    title: 'Training Toegewezen',
                    message: `Je bent ingeschreven voor "${trainingTitle}".`,
                    date: 'Zojuist',
                    read: false,
                    targetView: ViewState.ELEARNING
                });
            }
        });

        setIsAssignModalOpen(false);
        setAssignTargetId(null);
        onShowToast(`Training toegewezen.`);
    };

    // --- RENDERERS ---

    const renderCatalog = () => (
        <div className="space-y-10 animate-in fade-in pb-20">
            {/* Header / Hero */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <GraduationCap className="text-teal-600" size={36} />
                        Sanadome Academy
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Blijf leren, groeien en excelleren.</p>
                </div>
                
                {canManage && (
                    <div className="flex gap-3">
                        <button 
                            onClick={handleCreateNewModule}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} />
                            Nieuwe Training
                        </button>
                    </div>
                )}
            </div>

            {/* My Active Trainings */}
            {myAssignments.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Play size={20} className="text-teal-600"/> Verder Leren
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myAssignments.map(assignment => {
                            const module = trainings.find(t => t.id === assignment.trainingId);
                            if (!module) return null;
                            const isCompleted = assignment.status === 'Completed';
                            
                            return (
                                <div key={assignment.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col h-full">
                                    <div className="h-40 bg-slate-200 relative overflow-hidden">
                                        {module.coverImage ? (
                                            <img src={module.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Cover"/>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                                <GraduationCap size={40} className="text-slate-400"/>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 text-white">
                                            <span className="text-[10px] font-bold bg-white/20 backdrop-blur px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block border border-white/30">
                                                {module.category}
                                            </span>
                                            <h3 className="font-bold text-lg leading-tight">{module.title}</h3>
                                        </div>
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {module.steps.reduce((acc, s) => acc + s.durationMinutes, 0)} min</span>
                                            <span className={isCompleted ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>{isCompleted ? 'Voltooid' : 'Bezig'}</span>
                                        </div>
                                        
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                                            <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${assignment.progress}%` }}></div>
                                        </div>

                                        <div className="mt-auto">
                                            <button 
                                                onClick={() => startTraining(module.id)}
                                                className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {isCompleted ? 'Opnieuw Bekijken' : 'Verdergaan'} <ArrowRight size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Catalog Grid */}
            <div className={`${myAssignments.length > 0 ? 'pt-8 border-t border-slate-200' : ''}`}>
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <LayoutGrid size={20} className="text-teal-600"/> Alle Trainingen
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trainings.map(module => {
                        const isAssigned = myAssignments.some(a => a.trainingId === module.id);
                        if (isAssigned) return null; // Already shown above

                        return (
                            <div key={module.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 hover:border-teal-300 transition-colors cursor-pointer group flex flex-col h-full" onClick={() => startTraining(module.id)}>
                                <div className="h-32 rounded-xl overflow-hidden relative bg-slate-100 mb-3">
                                    {module.coverImage ? (
                                        <img src={module.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Cover"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32}/></div>
                                    )}
                                    {canManage && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditModule(module); }}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg text-slate-600 hover:text-teal-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit2 size={14}/>
                                        </button>
                                    )}
                                </div>
                                <div className="px-3 pb-3 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{module.category}</span>
                                        {module.recurrence !== 'None' && <RefreshCw size={12} className="text-blue-500"/>}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2">{module.title}</h3>
                                    
                                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50">
                                        <span className="text-xs text-slate-400 font-medium">{module.steps.length} lessen</span>
                                        {canManage ? (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setAssignTargetId(module.id); setIsAssignModalOpen(true); }}
                                                className="text-xs font-bold text-slate-500 hover:text-teal-600 bg-slate-50 px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                                            >
                                                Toewijzen
                                            </button>
                                        ) : (
                                            <span className="text-xs font-bold text-teal-600 group-hover:underline">Starten</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderStudio = () => {
        if (!editingModule) return null;
        
        const activeStep = editingModule.steps?.find(s => s.id === activeStepId);

        return (
            <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in duration-300">
                {/* Studio Header */}
                <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode('catalog')} className="p-2 hover:bg-slate-50 rounded-full text-slate-500">
                            <ArrowLeft size={20}/>
                        </button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-sm">Sanadome Course Studio</h2>
                            <p className="text-xs text-slate-500">{editingModule.title || 'Naamloze training'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSaveModule} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-md">
                            <Save size={16}/> Opslaan & Sluiten
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Sidebar: Structure */}
                    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Structuur</h3>
                            <button 
                                onClick={() => setActiveStepId('settings')}
                                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${activeStepId === 'settings' ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                    <Layout size={16}/>
                                </div>
                                <span className="font-bold text-sm">Basisinstellingen</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {editingModule.steps?.map((step, idx) => (
                                <div 
                                    key={step.id}
                                    onClick={() => setActiveStepId(step.id)}
                                    className={`group p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${activeStepId === step.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-800 truncate">{step.title}</div>
                                        <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                                            {step.type === 'Video' && <Video size={10}/>}
                                            {step.type === 'Quiz' && <HelpCircle size={10}/>}
                                            {step.type === 'Text' && <FileText size={10}/>}
                                            {step.type}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50">
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Stap toevoegen</span>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => handleAddStep('Text')} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:text-teal-600 flex flex-col items-center gap-1 text-[10px] font-bold transition-all">
                                    <FileText size={16}/> Tekst
                                </button>
                                <button onClick={() => handleAddStep('Video')} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:text-teal-600 flex flex-col items-center gap-1 text-[10px] font-bold transition-all">
                                    <Video size={16}/> Video
                                </button>
                                <button onClick={() => handleAddStep('Quiz')} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:text-teal-600 flex flex-col items-center gap-1 text-[10px] font-bold transition-all">
                                    <HelpCircle size={16}/> Quiz
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Editor */}
                    <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto">
                            {activeStepId === 'settings' && (
                                <div className="space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <h2 className="text-xl font-bold text-slate-900 mb-6">Algemene Informatie</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Training Titel</label>
                                            <input 
                                                type="text" 
                                                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={editingModule.title}
                                                onChange={e => setEditingModule({...editingModule, title: e.target.value})}
                                                placeholder="Bv. Brandveiligheid 2024"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Korte Omschrijving</label>
                                            <textarea 
                                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                rows={3}
                                                value={editingModule.description}
                                                onChange={e => setEditingModule({...editingModule, description: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                                            <select 
                                                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                                value={editingModule.category}
                                                onChange={e => setEditingModule({...editingModule, category: e.target.value})}
                                            >
                                                <option value="General">Algemeen</option>
                                                <option value="Safety">Veiligheid</option>
                                                <option value="Hospitality">Gastvrijheid</option>
                                                <option value="Systems">Systemen (IT)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Herhaling</label>
                                            <select 
                                                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                                value={editingModule.recurrence}
                                                onChange={e => setEditingModule({...editingModule, recurrence: e.target.value as any})}
                                            >
                                                <option value="None">Eenmalig</option>
                                                <option value="Yearly">Jaarlijks (Automatisch)</option>
                                                <option value="Monthly">Maandelijks</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cover Afbeelding URL</label>
                                            <div className="flex gap-4">
                                                <input 
                                                    type="text" 
                                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm"
                                                    value={editingModule.coverImage}
                                                    onChange={e => setEditingModule({...editingModule, coverImage: e.target.value})}
                                                    placeholder="https://..."
                                                />
                                                {editingModule.coverImage && (
                                                    <img src={editingModule.coverImage} className="w-16 h-12 rounded-lg object-cover border border-slate-200" alt="Preview"/>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStep && (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Bewerk Stap</h2>
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{activeStep.type}</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Titel van de stap</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full p-3 border border-slate-200 rounded-xl font-bold"
                                                    value={activeStep.title}
                                                    onChange={e => handleUpdateStep(activeStep.id, { title: e.target.value })}
                                                />
                                            </div>
                                            
                                            {activeStep.type === 'Text' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inhoud (Markdown supported)</label>
                                                    <textarea 
                                                        className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm font-mono leading-relaxed"
                                                        value={activeStep.content}
                                                        onChange={e => handleUpdateStep(activeStep.id, { content: e.target.value })}
                                                        placeholder="# Koptekst..."
                                                    />
                                                </div>
                                            )}

                                            {activeStep.type === 'Video' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video URL (YouTube/Vimeo)</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm mb-4"
                                                        value={activeStep.content}
                                                        onChange={e => handleUpdateStep(activeStep.id, { content: e.target.value })}
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                    />
                                                    {activeStep.content && (
                                                        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-md">
                                                            <iframe 
                                                                width="100%" 
                                                                height="100%" 
                                                                src={activeStep.content.replace('watch?v=', 'embed/')} 
                                                                title="Preview"
                                                                frameBorder="0"
                                                            ></iframe>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeStep.type === 'Quiz' && (
                                                <div className="space-y-4">
                                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                                                        Voeg vragen toe om de kennis van de medewerker te testen.
                                                    </div>
                                                    
                                                    {activeStep.quizData?.map((q, qIdx) => (
                                                        <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                                                            <button 
                                                                onClick={() => {
                                                                    const newQuizData = activeStep.quizData?.filter(x => x.id !== q.id);
                                                                    handleUpdateStep(activeStep.id, { quizData: newQuizData });
                                                                }}
                                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"
                                                            >
                                                                <X size={16}/>
                                                            </button>
                                                            
                                                            <div className="mb-3">
                                                                <label className="text-xs font-bold text-slate-400 uppercase">Vraag {qIdx + 1}</label>
                                                                <input 
                                                                    className="w-full p-2 mt-1 border border-slate-200 rounded-lg text-sm font-bold"
                                                                    value={q.question}
                                                                    onChange={e => {
                                                                        const newData = [...(activeStep.quizData || [])];
                                                                        newData[qIdx].question = e.target.value;
                                                                        handleUpdateStep(activeStep.id, { quizData: newData });
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                                                {q.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="flex items-center gap-2">
                                                                        <button 
                                                                            onClick={() => {
                                                                                const newData = [...(activeStep.quizData || [])];
                                                                                newData[qIdx].correctOptionIndex = oIdx;
                                                                                handleUpdateStep(activeStep.id, { quizData: newData });
                                                                            }}
                                                                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${q.correctOptionIndex === oIdx ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300'}`}
                                                                        >
                                                                            {q.correctOptionIndex === oIdx && <CheckCircle2 size={12}/>}
                                                                        </button>
                                                                        <input 
                                                                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs"
                                                                            value={opt}
                                                                            onChange={e => {
                                                                                const newData = [...(activeStep.quizData || [])];
                                                                                newData[qIdx].options[oIdx] = e.target.value;
                                                                                handleUpdateStep(activeStep.id, { quizData: newData });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button 
                                                        onClick={() => {
                                                            const newQ: QuizQuestion = {
                                                                id: Math.random().toString(),
                                                                question: 'Nieuwe vraag?',
                                                                options: ['Antwoord A', 'Antwoord B', 'Antwoord C'],
                                                                correctOptionIndex: 0
                                                            };
                                                            handleUpdateStep(activeStep.id, { quizData: [...(activeStep.quizData || []), newQ] });
                                                        }}
                                                        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-xs hover:border-teal-400 hover:text-teal-600 transition-colors"
                                                    >
                                                        + Vraag Toevoegen
                                                    </button>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Geschatte Duur (min)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-24 p-2 border border-slate-200 rounded-xl text-sm"
                                                    value={activeStep.durationMinutes}
                                                    onChange={e => handleUpdateStep(activeStep.id, { durationMinutes: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlayer = () => {
        if (!activeTrainingModule || !activeAssignment) return null;
        const currentStep = activeTrainingModule.steps[currentStepIndex];

        return (
            <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                {/* Minimal Header */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode('catalog')} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                            <X size={20}/>
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-900 text-sm md:text-base">{activeTrainingModule.title}</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${((currentStepIndex + 1) / activeTrainingModule.steps.length) * 100}%` }}></div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stap {currentStepIndex + 1} / {activeTrainingModule.steps.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Focus Mode Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center bg-slate-50">
                    <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
                        
                        {isTrainingComplete ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 animate-in zoom-in duration-500">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                    <div className="relative w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner ring-8 ring-green-50">
                                        <Trophy size={64} />
                                    </div>
                                </div>
                                <h1 className="text-4xl font-bold text-slate-900 mb-4">Gefeliciteerd!</h1>
                                <p className="text-lg text-slate-600 mb-8 max-w-md">
                                    Je hebt de training <strong>"{activeTrainingModule.title}"</strong> succesvol afgerond. Je voortgang is opgeslagen.
                                </p>
                                <button onClick={() => setViewMode('catalog')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                                    Terug naar overzicht
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-8 md:p-12 flex-1">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                                        {currentStep.type === 'Video' && <Video size={12}/>}
                                        {currentStep.type === 'Text' && <FileText size={12}/>}
                                        {currentStep.type === 'Quiz' && <HelpCircle size={12}/>}
                                        {currentStep.type} • {currentStep.durationMinutes} min
                                    </span>
                                    
                                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 leading-tight">{currentStep.title}</h1>

                                    <div className="prose prose-slate prose-lg max-w-none mb-10">
                                        {currentStep.type === 'Text' && (
                                            <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{currentStep.content}</div>
                                        )}
                                        {currentStep.type === 'Video' && (
                                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-slate-100">
                                                <iframe 
                                                    width="100%" 
                                                    height="100%" 
                                                    src={currentStep.content?.replace('watch?v=', 'embed/')} 
                                                    title="Video Player"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        )}
                                        {currentStep.type === 'Quiz' && (
                                            <div className="space-y-8 max-w-2xl">
                                                {currentStep.quizData?.map((q, idx) => (
                                                    <div key={q.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                                        <h4 className="font-bold text-slate-900 mb-4 text-lg">{idx + 1}. {q.question}</h4>
                                                        <div className="space-y-3">
                                                            {q.options.map((opt, optIdx) => (
                                                                <button
                                                                    key={optIdx}
                                                                    onClick={() => handleQuizAnswer(q.id, optIdx)}
                                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                                                                        quizAnswers[q.id] === optIdx 
                                                                        ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-md' 
                                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <span className="font-medium">{opt}</span>
                                                                    {quizAnswers[q.id] === optIdx && <CheckCircle2 size={20} className="text-teal-600"/>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                    <button 
                                        disabled={currentStepIndex === 0}
                                        onClick={() => setCurrentStepIndex(prev => prev - 1)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                                    >
                                        Vorige
                                    </button>
                                    <button 
                                        onClick={handleStepComplete}
                                        className="px-8 py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:-translate-y-0.5"
                                    >
                                        {currentStepIndex === activeTrainingModule.steps.length - 1 ? 'Afronden' : 'Volgende Stap'} 
                                        <ChevronRight size={20}/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            {viewMode === 'studio' ? renderStudio() : viewMode === 'player' ? renderPlayer() : renderCatalog()}

            {/* ASSIGN MODAL */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Training Toewijzen"
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <p className="text-sm text-slate-500 mb-4">Selecteer medewerkers om deze training aan toe te wijzen.</p>
                    <div className="space-y-2">
                        {employees.filter(e => e.id !== currentUser.id).map(emp => (
                            <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <img src={emp.avatar} className="w-8 h-8 rounded-full" alt="Av"/>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                                        <div className="text-xs text-slate-500">{emp.role}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleAssignTraining([emp.id])}
                                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                                >
                                    Toewijzen
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ELearningPage;
