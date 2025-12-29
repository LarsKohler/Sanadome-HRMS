
import React, { useState, useEffect, useMemo } from 'react';
import { 
    CheckSquare, Plus, Search, Filter, Clock, CheckCircle2, 
    AlertCircle, Trash2, Calendar, User, Users, ChevronDown, 
    MoreHorizontal, Share2, ArrowRight, Save, X, Edit2, 
    AlertTriangle, Layout, Check, Square, MoreVertical, MessageSquare, ListChecks,
    ChevronRight, ArrowDown, History, Info, Send, Archive, Activity, Circle, Globe
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
    'High': 'bg-red-50 text-red-700 border-red-100',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
    'Low': 'bg-blue-50 text-blue-700 border-blue-100'
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

        // Sync back to storage if some were deleted
        if (validTasks.length !== data.length) {
            // For each actually removed task, we should delete it from DB
            const removed = data.filter(t => !validTasks.includes(t));
            for (const r of removed) {
                await api.deleteTask(r.id);
            }
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

        // Add activity log
        const updateLog: TaskUpdate = {
            id: crypto.randomUUID(),
            author: currentUser.name,
            content: `📍 Status gewijzigd naar: ${newStatus === 'Completed' ? 'Voltooid (Gearchiveerd)' : 'Open'}`,
            createdAt: new Date().toISOString()
        };
        updatedTask.updates = [updateLog, ...(updatedTask.updates || [])];

        await api.saveTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
        if (selectedTask?.id === task.id) setSelectedTask(updatedTask);
        
        onShowToast(newStatus === 'Completed' ? "Taak naar archief verplaatst." : "Taak heropend.");
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
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                            <CheckSquare size={32} />
                        </div>
                        Mijn Taken
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Productiviteit en delegatie voor het hele team.</p>
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
                        activeTab === 'mine' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
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
                            activeTab === 'team' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Users size={18} /> Team Taken
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] ml-1">
                            {tasks.filter(t => (t.isGeneral || t.shareWithTeam) && t.status !== 'Completed').length}
                        </span>
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('archive')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'archive' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
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
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                {activeTab !== 'archive' && (
                    <div className="flex gap-2">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
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
                        className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-sm group hover:shadow-md cursor-pointer flex flex-col ${task.status === 'Completed' ? 'opacity-60 border-slate-100' : 'border-slate-200 hover:border-blue-400'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(task); }}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                        task.status === 'Completed' 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'bg-white border-slate-200 hover:border-blue-400'
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
                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
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
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded" title="Gedeeld met het team">
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
                            {activeTab === 'archive' ? 'Het archief is leeg. Voltooide taken blijven hier 7 dagen zichtbaar.' : 'Alles is bijgewerkt! Geen openstaande punten gevonden.'}
                        </p>
                        {activeTab !== 'archive' && (
                            <button 
                                onClick={() => openCreateTask(activeTab)}
                                className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all"
                            >
                                Voeg een taak toe
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ENHANCED DETAIL MODAL (Slide-out Style) */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Taak Beheren"
            >
                {selectedTask && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleToggleStatus(selectedTask)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                                        selectedTask.status === 'Completed' 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                    }`}
                                >
                                    {selectedTask.status === 'Completed' ? <><CheckCircle2 size={18}/> Voltooid</> : <><Circle size={18}/> Markeren als Klaar</>}
                                </button>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                    {selectedTask.priority} Priority
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingTask(selectedTask); setIsTaskModalOpen(true); setIsDetailModalOpen(false); }} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all"><Trash2 size={18}/></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                            {/* Main Info Column */}
                            <div className="lg:col-span-2 space-y-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">{selectedTask.title}</h2>
                                    <p className="text-slate-500 text-lg leading-relaxed whitespace-pre-wrap">{selectedTask.description || 'Geen uitgebreide omschrijving.'}</p>
                                </div>

                                {/* Subtasks Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                            <ListChecks size={22} className="text-blue-600"/> 
                                            Subtaken 
                                            <span className="text-slate-400 font-medium text-sm ml-1">
                                                ({selectedTask.subtasks?.filter(s=>s.completed).length}/{selectedTask.subtasks?.length || 0})
                                            </span>
                                        </h3>
                                        {getTaskProgress(selectedTask) !== null && (
                                            <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-0.5 rounded-full">{getTaskProgress(selectedTask)}%</span>
                                        )}
                                    </div>

                                    <div className="space-y-2 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        {(selectedTask.subtasks || []).map(st => (
                                            <div 
                                                key={st.id} 
                                                onClick={() => handleToggleSubtask(st.id)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all bg-white ${
                                                    st.completed ? 'border-transparent opacity-60' : 'border-white hover:border-blue-200 shadow-sm'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${st.completed ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-200 group-hover:border-blue-300'}`}>
                                                    {st.completed && <Check size={14} strokeWidth={4}/>}
                                                </div>
                                                <span className={`text-sm font-bold flex-1 ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{st.title}</span>
                                            </div>
                                        ))}
                                        
                                        <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                                            <input 
                                                type="text" 
                                                value={newSubtaskTitle}
                                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                placeholder="Voeg een stap toe..."
                                                className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
                                            />
                                            <button 
                                                disabled={!newSubtaskTitle.trim()} 
                                                className="bg-slate-900 text-white px-6 rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all font-bold"
                                            >
                                                <Plus size={20}/>
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Updates Section (Activity Feed) */}
                                <div>
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg mb-6">
                                        <MessageSquare size={22} className="text-blue-600"/> 
                                        Updates & Feed
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {/* Input field at top of feed */}
                                        <div className="flex gap-4 items-start bg-blue-50/50 p-4 rounded-3xl border border-blue-100 mb-8 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">{currentUser.name.charAt(0)}</div>
                                            <div className="flex-1 space-y-3">
                                                <textarea 
                                                    value={newUpdateText}
                                                    onChange={(e) => setNewUpdateText(e.target.value)}
                                                    placeholder="Deel een update of plaats een opmerking..."
                                                    rows={3}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-slate-700 placeholder:text-slate-400 resize-none"
                                                />
                                                <div className="flex justify-end pt-2 border-t border-blue-100">
                                                    <button 
                                                        onClick={handleAddUpdate}
                                                        disabled={!newUpdateText.trim()}
                                                        className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all text-xs font-bold flex items-center gap-2"
                                                    >
                                                        <Send size={14}/> Versturen
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {(selectedTask.updates || []).length > 0 ? (
                                                selectedTask.updates?.map(update => (
                                                    <div key={update.id} className="relative flex gap-4 animate-in slide-in-from-bottom-2">
                                                        <div className="flex flex-col items-center flex-shrink-0">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${update.author === currentUser.name ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                                {update.author.charAt(0)}
                                                            </div>
                                                            <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                                                        </div>
                                                        <div className="pb-6 flex-1">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-slate-900">{update.author}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold">{new Date(update.createdAt).toLocaleString('nl-NL', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">{update.content}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                    <Info size={32} className="mx-auto text-slate-300 mb-3 opacity-50"/>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nog geen updates</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Column (Metadata) */}
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Info size={14}/> Informatie
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100"><User size={20}/></div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Eigenaar</div>
                                                <div className="text-sm font-bold text-slate-800">{selectedTask.createdBy}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100"><Users size={20}/></div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Toegewezen</div>
                                                <div className="text-sm font-bold text-slate-800">{selectedTask.assigneeName || 'Algemeen'}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-slate-100"><Calendar size={20}/></div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Deadline</div>
                                                <div className="text-sm font-bold text-slate-800">{selectedTask.dueDate || 'Geen datum'}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"><Clock size={20}/></div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Aangemaakt</div>
                                                <div className="text-sm font-bold text-slate-800">{new Date(selectedTask.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedTask.shareWithTeam && (
                                    <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden group">
                                        <Share2 className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" size={80}/>
                                        <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Globe size={14}/> Team Taak</h4>
                                        <p className="text-sm text-blue-100 font-medium">Deze taak is zichtbaar voor alle Managers en Seniors in de gedeelde lijst.</p>
                                    </div>
                                )}

                                {selectedTask.status === 'Completed' && selectedTask.completedAt && (
                                    <div className="bg-green-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden group">
                                        <CheckCircle2 className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" size={80}/>
                                        <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Check size={14}/> Voltooid</h4>
                                        <p className="text-sm text-green-100 font-medium">Voltooid op {new Date(selectedTask.completedAt).toLocaleDateString()}.</p>
                                        <p className="text-[10px] text-green-200 mt-4 uppercase font-black">Verwijdering over {Math.max(1, 7 - Math.floor((new Date().getTime() - new Date(selectedTask.completedAt).getTime()) / (1000 * 60 * 60 * 24)))} dagen</p>
                                    </div>
                                )}
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
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                            placeholder="Wat moet er gebeuren?"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omschrijving</label>
                        <textarea 
                            rows={4}
                            value={editingTask?.description || ''}
                            onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all"
                            placeholder="Voeg optionele details toe..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioriteit</label>
                            <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
                                {(['Low', 'Medium', 'High'] as TaskPriority[]).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setEditingTask({...editingTask, priority: p})}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                            editingTask?.priority === p 
                                            ? (p === 'High' ? 'bg-red-500 text-white' : p === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white')
                                            : 'text-slate-500 hover:bg-white hover:text-slate-900'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Deadline</label>
                            <input 
                                type="date" 
                                value={editingTask?.dueDate || ''}
                                onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* DELEGATION SETTINGS */}
                    <div className="bg-slate-900 p-6 rounded-3xl space-y-6">
                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <Users size={12}/> Samenwerken & Zichtbaarheid
                        </h4>
                        
                        <div className="space-y-4">
                            <label className="flex items-center gap-4 cursor-pointer group p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${editingTask?.shareWithTeam ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/20 text-transparent'}`}>
                                    <Check size={16} strokeWidth={4}/>
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
                                <div>
                                    <span className="block text-sm font-bold text-white">Delen met Team</span>
                                    <span className="text-[10px] text-slate-400">Zichtbaar voor alle Seniors & Managers</span>
                                </div>
                            </label>

                            {isSeniorOrManager && (
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Toewijzen aan Medewerker</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-sm font-bold text-white appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editingTask?.assigneeId || ''}
                                            onChange={(e) => setEditingTask({
                                                ...editingTask, 
                                                assigneeId: e.target.value || undefined,
                                                isGeneral: e.target.value ? false : editingTask?.isGeneral
                                            })}
                                        >
                                            <option value="">Niet toegewezen (Iedereen)</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={() => setIsTaskModalOpen(false)}
                            className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            Annuleren
                        </button>
                        <button 
                            type="submit"
                            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95"
                        >
                            <Save size={20}/> Taak Opslaan
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TodoListPage;
