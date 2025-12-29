
import React, { useState, useEffect, useMemo } from 'react';
import { 
    CheckSquare, Plus, Search, Filter, Clock, CheckCircle2, 
    AlertCircle, Trash2, Calendar, User, Users, ChevronDown, 
    MoreHorizontal, Share2, ArrowRight, Save, X, Edit2, 
    AlertTriangle, Layout, Check, Square, MoreVertical
} from 'lucide-react';
import { Employee, Task, TaskStatus, TaskPriority, ViewState } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

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
    const [activeTab, setActiveTab] = useState<'mine' | 'team'>('mine');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');

    // Modal States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

    const isSeniorOrManager = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setIsLoading(true);
        const data = await api.getTasks();
        setTasks(data);
        setIsLoading(false);
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask?.title) return onShowToast("Titel is verplicht.");

        const now = new Date().toISOString();
        const taskId = editingTask.id || crypto.randomUUID();
        
        // Find assignee name if ID is present
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
            createdBy: currentUser.name,
            createdById: currentUser.id,
            createdAt: editingTask.createdAt || now,
            shareWithTeam: editingTask.shareWithTeam || false
        };

        // Rule: If shared with team, also make it general if it was personal
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

        await api.saveTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
        onShowToast(newStatus === 'Completed' ? "Taak voltooid!" : "Taak heropend.");
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) return;
        await api.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
        onShowToast("Taak verwijderd.");
    };

    const openCreateTask = (mode: 'mine' | 'team') => {
        setEditingTask({
            title: '',
            description: '',
            priority: 'Medium',
            status: 'Pending',
            isGeneral: mode === 'team',
            assigneeId: mode === 'mine' ? currentUser.id : undefined,
            shareWithTeam: false
        });
        setIsTaskModalOpen(true);
    };

    const filteredTasks = useMemo(() => {
        let list = tasks;
        
        // Tab Filtering
        if (activeTab === 'mine') {
            list = list.filter(t => t.assigneeId === currentUser.id);
        } else {
            // General tasks OR tasks created by me shared with team OR tasks assigned to others (if I am manager)
            list = list.filter(t => t.isGeneral || t.shareWithTeam || (isSeniorOrManager && t.assigneeId !== currentUser.id));
        }

        // Search & Status
        return list.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => {
            // Sort by priority then date
            const prioMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
            const pDiff = prioMap[a.priority] - prioMap[b.priority];
            if (pDiff !== 0) return pDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [tasks, activeTab, searchTerm, statusFilter, currentUser.id, isSeniorOrManager]);

    return (
        <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 rounded-xl">
                            <CheckSquare className="text-teal-600" size={32} />
                        </div>
                        Takenlijst
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Productiviteit en delegatie voor het team.</p>
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
                <div className="flex gap-2">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                    >
                        <option value="All">Alle Statussen</option>
                        <option value="Pending">Open</option>
                        <option value="In Progress">Bezig</option>
                        <option value="Completed">Voltooid</option>
                    </select>
                </div>
            </div>

            {/* TASK LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map(task => (
                    <div key={task.id} className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-sm group hover:shadow-md ${task.status === 'Completed' ? 'opacity-60 border-slate-100' : 'border-slate-200 hover:border-teal-400'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleToggleStatus(task)}
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
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                        </div>

                        <h3 className={`font-bold text-slate-900 mb-2 leading-tight ${task.status === 'Completed' ? 'line-through' : ''}`}>
                            {task.title}
                        </h3>
                        
                        {task.description && (
                            <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">
                                {task.description}
                            </p>
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

                            <div className="text-[10px] text-slate-300 font-medium">
                                {new Date(task.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredTasks.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckSquare size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Geen taken gevonden</h3>
                        <p className="text-slate-500 mt-1">Lekker gewerkt! Geen openstaande punten gevonden.</p>
                        <button 
                            onClick={() => openCreateTask(activeTab)}
                            className="mt-6 text-teal-600 font-bold hover:underline"
                        >
                            Voeg een taak toe
                        </button>
                    </div>
                )}
            </div>

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
                                            ? (p === 'High' ? 'bg-red-600 text-white border-red-600' : p === 'Medium' ? 'bg-amber-500 text-white border-amber-500' : 'bg-blue-500 text-white border-blue-500')
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
                            {/* Option 1: Share with Team (General List) */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${editingTask?.shareWithTeam ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-300'}`}>
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

                            {/* Option 2: Assign to someone specific */}
                            {isSeniorOrManager && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Toewijzen aan Medewerker</label>
                                    <select 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                        value={editingTask?.assigneeId || ''}
                                        onChange={(e) => setEditingTask({
                                            ...editingTask, 
                                            assigneeId: e.target.value || undefined,
                                            isGeneral: e.target.value ? false : editingTask?.isGeneral // If assigned to someone, it's personal but trackable
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
