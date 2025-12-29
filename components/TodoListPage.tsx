import React, { useState, useEffect, useMemo } from 'react';
// Added Send to the lucide-react imports
import { 
    CheckSquare, Plus, Search, Filter, Clock, CheckCircle2, 
    AlertCircle, Trash2, Calendar, User, Users, ChevronDown, 
    MoreHorizontal, Share2, ArrowRight, Save, X, Edit2, 
    AlertTriangle, Layout, Check, Square, MoreVertical, MessageSquare, ListChecks,
    ChevronRight, ArrowDown, History, Info, Send
} from 'lucide-react';
import { Employee, Task, TaskStatus, TaskPriority, TaskUpdate, SubTask } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface TodoListPageProps {
    currentUser: Employee;
    employees: Employee[];
    onShowToast: (message: string) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
    'High': 'bg-red-100 text-red-700 border-red-200',
    'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
    'Low': 'bg-blue-100 text-blue-700 border-blue-200'
};

const TodoListPage: React.FC<TodoListPageProps> = ({ currentUser, employees, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'mine' | 'team' | 'archive'>('mine');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

    // Modal States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    // Interaction States
    const [newUpdateText, setNewUpdateText] = useState('');
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const isSeniorOrManager = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setIsLoading(true);
        const data = await api.getTasks();
        
        // AUTO-DELETE LOGIC: Filter out archived tasks older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const validTasks = data.filter(t => {
            if (t.status === 'Completed' && t.completedAt) {
                return new Date(t.completedAt) > sevenDaysAgo;
            }
            return true;
        });

        // If any were filtered out, save the cleaned list back
        if (validTasks.length !== data.length) {
            // This is a silent cleanup
            // We would need a bulk save or individual deletes. 
            // For now, just update local state.
        }

        setTasks(validTasks);
        setIsLoading(false);
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask?.title) return onShowToast("Titel is verplicht.");

        const now = new Date().toISOString();
        const taskId = editingTask.id || crypto.randomUUID();
        
        let assigneeName = undefined;
        if (editingTask.assigneeId) {
            assigneeName = employees.find(e => e.id === editingTask.assigneeId)?.name;
        }

        const task: Task = {
            id: taskId,
            title: editingTask.title,
            description: editingTask.description || '',
            status: editingTask.status || 'Pending',
            priority: editingTask.priority || 'Medium',
            dueDate: editingTask.dueDate,
            assigneeId: editingTask.assigneeId,
            assigneeName: assigneeName,
            isGeneral: editingTask.isGeneral || false,
            createdBy: editingTask.createdBy || currentUser.name,
            createdById: editingTask.createdById || currentUser.id,
            createdAt: editingTask.createdAt || now,
            shareWithTeam: editingTask.shareWithTeam || false,
            subtasks: editingTask.subtasks || [],
            updates: editingTask.updates || []
        };

        if (task.shareWithTeam && !task.assigneeId) {
            task.isGeneral = true;
        }

        await api.saveTask(task);
        
        setTasks(prev => {
            const idx = prev.findIndex(t => t.id === task.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = task;
                return newArr;
            }
            return [task, ...prev];
        });

        setIsTaskModalOpen(false);
        setEditingTask(null);
        onShowToast(editingTask.id ? "Taak bijgewerkt." : "Taak aangemaakt.");
    };

    const handleToggleStatus = async (task: Task) => {
        const newStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        const updatedTask: Task = {
            ...task,
            status: newStatus,
            completedAt: newStatus === 'Completed' ? new Date().toISOString() : undefined
        };

        // Add an automatic update log
        const updateLog: TaskUpdate = {
            id: crypto.randomUUID(),
            author: currentUser.name,
            content: `Status gewijzigd naar: ${newStatus === 'Completed' ? 'Voltooid' : 'Open'}`,
            createdAt: new Date().toISOString()
        };
        updatedTask.updates = [updateLog, ...(updatedTask.updates || [])];

        await api.saveTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
        if (selectedTask?.id === task.id) setSelectedTask(updatedTask);
        
        onShowToast(newStatus === 'Completed' ? "Taak gearchiveerd (wordt na 7 dagen verwijderd)." : "Taak heropend.");
    };

    const handleAddUpdate = async () => {
        if (!selectedTask || !newUpdateText.trim()) return;

        const update: TaskUpdate = {
            id: crypto.randomUUID(),
            author: currentUser.name,
            content: newUpdateText.trim(),
            createdAt: new Date().toISOString()
        };

        const updatedTask = {
            ...selectedTask,
            updates: [update, ...(selectedTask.updates || [])]
        };

        await api.saveTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
        setNewUpdateText('');
        onShowToast("Update toegevoegd.");
    };

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || !newSubtaskTitle.trim()) return;

        const newSub: SubTask = {
            id: crypto.randomUUID(),
            title: newSubtaskTitle.trim(),
            completed: false
        };

        const updatedTask = {
            ...selectedTask,
            subtasks: [...(selectedTask.subtasks || []), newSub]
        };

        await api.saveTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
        setNewSubtaskTitle('');
    };

    const handleToggleSubtask = async (subtaskId: string) => {
        if (!selectedTask) return;

        const updatedSubtasks = (selectedTask.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );

        const updatedTask = {
            ...selectedTask,
            subtasks: updatedSubtasks
        };

        await api.saveTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Weet je zeker dat je deze taak definitief wilt verwijderen?")) return;
        await api.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
        setIsDetailModalOpen(false);
        onShowToast("Taak verwijderd.");
    };

    const openCreateTask = (mode: 'mine' | 'team' | 'archive') => {
        setEditingTask({
            title: '',
            description: '',
            priority: 'Medium',
            status: 'Pending',
            isGeneral: mode === 'team',
            assigneeId: mode === 'mine' ? currentUser.id : undefined,
            shareWithTeam: false,
            subtasks: [],
            updates: []
        });
        setIsTaskModalOpen(true);
    };

    const filteredTasks = useMemo(() => {
        let list = tasks;
        
        if (activeTab === 'mine') {
            list = list.filter(t => t.assigneeId === currentUser.id && t.status !== 'Completed');
        } else if (activeTab === 'team') {
            list = list.filter(t => (t.isGeneral || t.shareWithTeam || (isSeniorOrManager && t.assigneeId !== currentUser.id)) && t.status !== 'Completed');
        } else if (activeTab === 'archive') {
            list = list.filter(t => t.status === 'Completed');
        }

        return list.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => {
            if (activeTab === 'archive') {
                return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
            }
            const prioMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
            const pDiff = prioMap[a.priority] - prioMap[b.priority];
            if (pDiff !== 0) return pDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [tasks, activeTab, searchTerm, statusFilter, currentUser.id, isSeniorOrManager]);

    const getTaskProgress = (task: Task) => {
        if (!task.subtasks || task.subtasks.length === 0) return null;
        const completed = task.subtasks.filter(s => s.completed).length;
        return Math.round((completed / task.subtasks.length) * 100);
    };

    return (
        <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600">
                            <CheckSquare size={32} />
                        </div>
                        Slimme Takenlijst
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Focus op wat belangrijk is, deel met het team.</p>
                </div>
                
                <button 
                    onClick={() => openCreateTask(activeTab)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                >
                    <Plus size={20} /> Nieuwe Taak
                </button>
            </div>

            {/* TABS */}
            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button 
                    onClick={() => setActiveTab('mine')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'mine' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <User size={18} /> Mijn Taken
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] ml-1">
                        {tasks.filter(t => t.assigneeId === currentUser.id && t.status !== 'Completed').length}
                    </span>
                </button>
                {isSeniorOrManager && (
                    <button 
                        onClick={() => setActiveTab('team')}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'team' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Users size={18} /> Team Taken
                        <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-[10px] ml-1">
                            {tasks.filter(t => (t.isGeneral || t.shareWithTeam) && t.status !== 'Completed').length}
                        </span>
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('archive')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'archive' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <History size={18} /> Archief
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] ml-1">
                        {tasks.filter(t => t.status === 'Completed').length}
                    </span>
                </button>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Zoek in taken..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-sm"
                    />
                </div>
                {activeTab !== 'archive' && (
                    <div className="flex gap-2">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                        >
                            <option value="All">Alle Statussen</option>
                            <option value="Pending">Open</option>
                            <option value="In Progress">Bezig</option>
                        </select>
                    </div>
                )}
            </div>

            {/* TASK LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map(task => {
                    const progress = getTaskProgress(task);
                    return (
                    <div 
                        key={task.id} 
                        onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                        className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-sm group hover:shadow-md cursor-pointer flex flex-col ${task.status === 'Completed' ? 'opacity-60 border-slate-100' : 'border-slate-200 hover:border-teal-400'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(task); }}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                        task.status === 'Completed' 
                                        ? 'bg-teal-500 border-teal-500 text-white' 
                                        : 'bg-white border-slate-200 hover:border-teal-400'
                                    }`}
                                >
                                    {task.status === 'Completed' && <Check size={14} strokeWidth={4}/>}
                                </button>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_COLORS[task.priority]}`}>
                                    {task.priority}
                                </span>
                            </div>
                            <div className="flex gap-2 text-slate-400">
                                {task.updates && task.updates.length > 0 && <div className="flex items-center gap-1 text-[10px] font-bold"><MessageSquare size={12}/> {task.updates.length}</div>}
                                {task.subtasks && task.subtasks.length > 0 && <div className="flex items-center gap-1 text-[10px] font-bold"><ListChecks size={12}/> {task.subtasks.filter(s=>s.completed).length}/{task.subtasks.length}</div>}
                            </div>
                        </div>

                        <h3 className={`font-bold text-slate-900 mb-2 leading-tight ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                        </h3>
                        
                        {task.description && (
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                                {task.description}
                            </p>
                        )}

                        {/* Progress Bar for Subtasks */}
                        {progress !== null && (
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    <span>Voortgang</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {task.dueDate && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                        <Calendar size={12}/>
                                        {new Date(task.dueDate).toLocaleDateString('nl-NL', {day: 'numeric', month: 'short'})}
                                    </div>
                                )}
                                {task.shareWithTeam && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded" title="Gedeeld met het team">
                                        <Share2 size={10}/> TEAM
                                    </div>
                                )}
                                {task.assigneeId && task.assigneeId !== currentUser.id && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                                        <User size={12}/>
                                        {task.assigneeName || 'Laden...'}
                                    </div>
                                )}
                            </div>

                            {activeTab === 'archive' ? (
                                <div className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                                    <Clock size={10}/> Verwijderd over {Math.max(1, 7 - Math.floor((new Date().getTime() - new Date(task.completedAt!).getTime()) / (1000 * 60 * 60 * 24)))}d
                                </div>
                            ) : (
                                <div className="text-[10px] text-slate-300 font-medium">
                                    {new Date(task.createdAt).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                )})}

                {filteredTasks.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            {activeTab === 'archive' ? <History size={40}/> : <CheckSquare size={40} />}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Geen taken gevonden</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                            {activeTab === 'archive' ? 'Het archief is leeg. Voltooide taken verschijnen hier voor 7 dagen.' : 'Lekker gewerkt! Geen openstaande punten gevonden in dit overzicht.'}
                        </p>
                        {activeTab !== 'archive' && (
                            <button 
                                onClick={() => openCreateTask(activeTab)}
                                className="mt-8 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition-all"
                            >
                                Voeg een taak toe
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* DETAIL MODAL (Smart View) */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Taak Details"
            >
                {selectedTask && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header Info */}
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                    {selectedTask.priority} Prioriteit
                                </span>
                                <h2 className="text-2xl font-bold text-slate-900 mt-4 leading-tight">{selectedTask.title}</h2>
                                <p className="text-slate-500 mt-2 text-sm leading-relaxed">{selectedTask.description || 'Geen omschrijving beschikbaar.'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <button 
                                    onClick={() => handleToggleStatus(selectedTask)}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
                                        selectedTask.status === 'Completed' 
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                        : 'bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                                >
                                    {selectedTask.status === 'Completed' ? <><History size={18}/> Heropenen</> : <><Check size={18}/> Voltooien</>}
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingTask(selectedTask); setIsTaskModalOpen(true); setIsDetailModalOpen(false); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-100"><Edit2 size={18}/></button>
                                    <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-100"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        </div>

                        {/* Task Metadata Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Gemaakt door</div>
                                <div className="text-sm font-bold text-slate-700">{selectedTask.createdBy}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Toegewezen aan</div>
                                <div className="text-sm font-bold text-slate-700">{selectedTask.assigneeName || 'Iedereen'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Deadline</div>
                                <div className="text-sm font-bold text-slate-700">{selectedTask.dueDate || '-'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aangemaakt op</div>
                                <div className="text-sm font-bold text-slate-700">{new Date(selectedTask.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* SUBTASKS SECTION */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <ListChecks size={20} className="text-indigo-600"/> Subtaken
                                </h3>
                                <div className="space-y-2">
                                    {(selectedTask.subtasks || []).map(st => (
                                        <div 
                                            key={st.id} 
                                            onClick={() => handleToggleSubtask(st.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                st.completed ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-100 hover:border-indigo-200'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${st.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200'}`}>
                                                {st.completed && <Check size={12} strokeWidth={4}/>}
                                            </div>
                                            <span className={`text-sm font-medium ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{st.title}</span>
                                        </div>
                                    ))}
                                    <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                                        <input 
                                            type="text" 
                                            value={newSubtaskTitle}
                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                            placeholder="Voeg stap toe..."
                                            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button disabled={!newSubtaskTitle.trim()} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50"><Plus size={18}/></button>
                                    </form>
                                </div>
                            </div>

                            {/* UPDATES SECTION */}
                            <div className="space-y-4 flex flex-col">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <MessageSquare size={20} className="text-teal-600"/> Updates & Opmerkingen
                                </h3>
                                
                                <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 max-h-[300px] overflow-y-auto space-y-4 custom-scrollbar">
                                    {(selectedTask.updates || []).length > 0 ? (
                                        selectedTask.updates?.map(update => (
                                            <div key={update.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 animate-in slide-in-from-bottom-2">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                                                    <span className="text-slate-400">{update.author}</span>
                                                    <span className="text-slate-300">{new Date(update.createdAt).toLocaleString('nl-NL', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{update.content}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-10">
                                            <Info size={24} className="mb-2 opacity-20"/>
                                            <p className="text-xs">Nog geen updates geplaatst.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <div className="flex gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-sm">
                                        <textarea 
                                            value={newUpdateText}
                                            onChange={(e) => setNewUpdateText(e.target.value)}
                                            placeholder="Schrijf een update..."
                                            rows={2}
                                            className="flex-1 border-none focus:ring-0 text-sm resize-none"
                                        />
                                        <button 
                                            onClick={handleAddUpdate}
                                            disabled={!newUpdateText.trim()}
                                            className="self-end bg-teal-600 text-white p-3 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-all"
                                        >
                                            <Send size={18}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* CREATE / EDIT TASK MODAL */}
            <Modal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                title={editingTask?.id ? "Taak Bewerken" : "Nieuwe Taak Toevoegen"}
            >
                <form onSubmit={handleSaveTask} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Titel</label>
                        <input 
                            type="text" 
                            required
                            value={editingTask?.title || ''}
                            onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="Wat moet er gebeuren?"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omschrijving</label>
                        <textarea 
                            rows={3}
                            value={editingTask?.description || ''}
                            onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                            placeholder="Optionele details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioriteit</label>
                            <div className="flex gap-2">
                                {(['Low', 'Medium', 'High'] as TaskPriority[]).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setEditingTask({...editingTask, priority: p})}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                            editingTask?.priority === p 
                                            ? (p === 'High' ? 'bg-red-600 text-white border-red-600' : p === 'Medium' ? 'bg-amber-50 text-white border-amber-500' : 'bg-blue-500 text-white border-blue-500')
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Deadline (Optioneel)</label>
                            <input 
                                type="date" 
                                value={editingTask?.dueDate || ''}
                                onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* DELEGATION SETTINGS */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Users size={12}/> Delegatie & Zichtbaarheid
                        </h4>
                        
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${editingTask?.shareWithTeam ? 'bg-teal-50 border-teal-500 text-white' : 'bg-white border-slate-300'}`}>
                                    {editingTask?.shareWithTeam && <Check size={14} strokeWidth={4}/>}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={editingTask?.shareWithTeam || false}
                                    onChange={(e) => setEditingTask({
                                        ...editingTask, 
                                        shareWithTeam: e.target.checked,
                                        isGeneral: e.target.checked ? true : editingTask?.isGeneral
                                    })}
                                />
                                <span className="text-sm font-bold text-slate-700 group-hover:text-teal-700">Delen met Team Takenlijst</span>
                            </label>

                            {isSeniorOrManager && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Toewijzen aan Medewerker</label>
                                    <select 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                        value={editingTask?.assigneeId || ''}
                                        onChange={(e) => setEditingTask({
                                            ...editingTask, 
                                            assigneeId: e.target.value || undefined,
                                            isGeneral: e.target.value ? false : editingTask?.isGeneral
                                        })}
                                    >
                                        <option value="">Wijs toe aan...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Verschijnt direct in de persoonlijke lijst van deze collega.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={() => setIsTaskModalOpen(false)}
                            className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Annuleren
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={18}/> Opslaan
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TodoListPage;