import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ListTodo, Plus, Trash2, Edit2, Save, X, CheckSquare, 
    Type, ToggleLeft, ArrowLeft, History, PlayCircle, Eye, AlertTriangle, Check, ChevronRight, Layout, GripVertical, ArrowUp, ArrowDown, Filter, Shield, Calendar, Image as ImageIcon, Star, List, PenTool, Upload, ChevronDown, MoreHorizontal, Settings
} from 'lucide-react';
import { Employee, ChecklistTemplate, ChecklistItem, ChecklistSubmission, ChecklistItemType } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface ChecklistsPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const ChecklistsPage: React.FC<ChecklistsPageProps> = ({ currentUser, onShowToast }) => {
    const [view, setView] = useState<'list' | 'player' | 'builder' | 'history'>('list');
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [submissions, setSubmissions] = useState<ChecklistSubmission[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    
    // Builder State
    const [editingTemplate, setEditingTemplate] = useState<Partial<ChecklistTemplate>>({});
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null); // For builder details
    
    // Player State
    const [activeSubmission, setActiveSubmission] = useState<ChecklistSubmission | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // History State
    const [viewingSubmission, setViewingSubmission] = useState<ChecklistSubmission | null>(null);

    const isManager = hasPermission(currentUser, 'MANAGE_CHECKLISTS');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const t = await api.getChecklistTemplates();
        const s = await api.getChecklistSubmissions();
        setTemplates(t);
        setSubmissions(s);
    };

    const categories = useMemo(() => {
        const cats = new Set(templates.map(t => t.category || 'Algemeen'));
        return ['All', ...Array.from(cats)];
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesCategory = activeCategory === 'All' || (t.category || 'Algemeen') === activeCategory;
            // Check roles
            const myRole = currentUser.role;
            const matchesRole = !t.targetRoles || t.targetRoles.length === 0 || t.targetRoles.includes(myRole) || isManager;
            
            return matchesCategory && matchesRole;
        });
    }, [templates, activeCategory, currentUser, isManager]);

    // --- BUILDER LOGIC ---

    const handleCreateTemplate = () => {
        setEditingTemplate({
            id: crypto.randomUUID(),
            title: 'Nieuwe Checklist',
            description: '',
            category: 'Algemeen',
            targetRoles: [],
            items: [],
            createdBy: currentUser.name,
            isActive: true,
            createdAt: new Date().toLocaleDateString('nl-NL')
        });
        setView('builder');
    };

    const handleEditTemplate = (tpl: ChecklistTemplate) => {
        setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
        setView('builder');
    };

    const handleDeleteTemplate = async (id: string) => {
        if(confirm("Weet je zeker dat je deze checklist wilt verwijderen?")) {
            await api.deleteChecklistTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            onShowToast("Checklist verwijderd.");
        }
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate.title) return onShowToast("Titel is verplicht.");
        
        const template = editingTemplate as ChecklistTemplate;
        await api.saveChecklistTemplate(template);
        
        // Refresh local list
        setTemplates(prev => {
            const idx = prev.findIndex(t => t.id === template.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = template;
                return newArr;
            }
            return [...prev, template];
        });
        
        setView('list');
        onShowToast("Checklist opgeslagen.");
    };

    const addItemToTemplate = (type: ChecklistItemType) => {
        const newItem: ChecklistItem = {
            id: crypto.randomUUID(),
            text: type === 'header' ? 'Nieuwe Sectie' : 'Nieuwe vraag',
            type,
            required: type !== 'header',
            isCritical: false,
            explanationRequiredOn: type === 'yes_no' ? 'no' : null,
            options: (type === 'select' || type === 'multi_select') ? ['Optie 1', 'Optie 2'] : undefined,
            explanationLabel: 'Toelichting'
        };
        setEditingTemplate(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
        // Auto expand new item for editing if complex
        if (['select', 'multi_select', 'yes_no'].includes(type)) {
            setExpandedItemId(newItem.id);
        }
    };

    const updateTemplateItem = (itemId: string, updates: Partial<ChecklistItem>) => {
        setEditingTemplate(prev => ({
            ...prev,
            items: prev.items?.map(i => i.id === itemId ? { ...i, ...updates } : i)
        }));
    };

    const removeTemplateItem = (itemId: string) => {
        setEditingTemplate(prev => ({
            ...prev,
            items: prev.items?.filter(i => i.id !== itemId)
        }));
    };

    const moveTemplateItem = (index: number, direction: 'up' | 'down') => {
        if (!editingTemplate.items) return;
        const newItems = [...editingTemplate.items];
        if (direction === 'up' && index > 0) {
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
        }
        setEditingTemplate(prev => ({ ...prev, items: newItems }));
    };

    const toggleRoleTarget = (role: string) => {
        const current = editingTemplate.targetRoles || [];
        const updated = current.includes(role) 
            ? current.filter(r => r !== role) 
            : [...current, role];
        setEditingTemplate(prev => ({ ...prev, targetRoles: updated }));
    };

    // --- PLAYER LOGIC ---

    const handleStartChecklist = (template: ChecklistTemplate) => {
        // Check if draft exists
        const draft = submissions.find(s => s.templateId === template.id && s.status === 'Draft' && s.submittedById === currentUser.id);
        
        if (draft) {
            setActiveSubmission(draft);
        } else {
            const newSubmission: ChecklistSubmission = {
                id: crypto.randomUUID(),
                templateId: template.id,
                templateSnapshot: template,
                submittedBy: currentUser.name,
                submittedById: currentUser.id,
                status: 'Draft',
                responses: {},
                startedAt: new Date().toISOString()
            };
            setActiveSubmission(newSubmission);
            api.saveChecklistSubmission(newSubmission); // Init save
        }
        setView('player');
    };

    const handleResponseChange = (itemId: string, value: any) => {
        if (!activeSubmission) return;
        
        setActiveSubmission(prev => {
            if (!prev) return null;
            return {
                ...prev,
                responses: { ...prev.responses, [itemId]: value }
            };
        });
    };

    const handleFileUpload = async (itemId: string, file: File) => {
        setIsUploading(true);
        try {
            const url = await api.uploadFile(file);
            if (url) {
                handleResponseChange(itemId, url);
                onShowToast("Foto geüpload.");
            }
        } catch (e) {
            console.error(e);
            onShowToast("Fout bij uploaden.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSign = (itemId: string) => {
        const signature = `Ondertekend door ${currentUser.name} op ${new Date().toLocaleString()}`;
        handleResponseChange(itemId, signature);
    };

    // Auto-save effect
    useEffect(() => {
        if (view !== 'player' || !activeSubmission) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);
            await api.saveChecklistSubmission(activeSubmission);
            setIsSaving(false);
        }, 2000); // 2 sec debounce

        return () => clearTimeout(timer);
    }, [activeSubmission, view]);

    const handleCompleteChecklist = async () => {
        if (!activeSubmission) return;
        
        // Validate required
        const template = activeSubmission.templateSnapshot || templates.find(t => t.id === activeSubmission.templateId);
        if (!template) return;

        const missing = template.items.filter(i => {
            if (i.type === 'header') return false;
            // Check if required OR critical (critical implies required here)
            const isMandatory = i.required || i.isCritical;
            if (!isMandatory) return false;
            
            const val = activeSubmission.responses[i.id];
            if (i.type === 'multi_select') return !val || val.length === 0;
            return !val; // Standard truthy check covers bool, string, etc.
        });
        
        if (missing.length > 0) {
            const criticalMissing = missing.some(i => i.isCritical);
            if (criticalMissing) {
                alert(`Er zijn kritieke punten niet ingevuld! Deze moeten worden afgevinkt.`);
                return;
            }
            onShowToast(`Nog ${missing.length} verplichte velden invullen.`);
            return;
        }

        const completedSubmission: ChecklistSubmission = {
            ...activeSubmission,
            status: 'Completed',
            completedAt: new Date().toISOString()
        };

        await api.saveChecklistSubmission(completedSubmission);
        
        // Update list
        setSubmissions(prev => {
            const idx = prev.findIndex(s => s.id === completedSubmission.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = completedSubmission;
                return newArr;
            }
            return [...prev, completedSubmission];
        });

        setView('list');
        onShowToast("Checklist afgerond en opgeslagen!");
    };

    // --- RENDERERS ---

    const renderBuilder = () => (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Checklist Editor</h2>
                        <p className="text-slate-500 text-sm">Sleep en bewerk vragen.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">Annuleren</button>
                    <button onClick={handleSaveTemplate} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-800 flex items-center gap-2 transition-all">
                        <Save size={18}/> Opslaan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                {/* LEFT: Structure & Items */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Bouwstenen</h3>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => addItemToTemplate('header')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><Type size={14}/> Kop</button>
                            <button onClick={() => addItemToTemplate('checkbox')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><CheckSquare size={14}/> Check</button>
                            <button onClick={() => addItemToTemplate('text')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><Type size={14}/> Tekst</button>
                            <button onClick={() => addItemToTemplate('yes_no')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><ToggleLeft size={14}/> Ja/Nee</button>
                            <button onClick={() => addItemToTemplate('select')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><ChevronDown size={14}/> Lijst</button>
                            <button onClick={() => addItemToTemplate('multi_select')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><List size={14}/> Multi</button>
                            <button onClick={() => addItemToTemplate('date')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><Calendar size={14}/> Datum</button>
                            <button onClick={() => addItemToTemplate('file')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><ImageIcon size={14}/> Foto</button>
                            <button onClick={() => addItemToTemplate('rating')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><Star size={14}/> Score</button>
                            <button onClick={() => addItemToTemplate('signature')} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-teal-600 flex items-center gap-1 shadow-sm"><PenTool size={14}/> Krabbel</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                        {editingTemplate.items?.map((item, idx) => (
                            <div key={item.id} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 group transition-all ${item.type === 'header' ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
                                <div className="flex gap-4 items-start">
                                    <div className="flex flex-col gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveTemplateItem(idx, 'up')} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"><ArrowUp size={14}/></button>
                                        <button onClick={() => moveTemplateItem(idx, 'down')} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"><ArrowDown size={14}/></button>
                                    </div>
                                    
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            className={`w-full bg-transparent border-none p-0 focus:ring-0 ${item.type === 'header' ? 'text-lg font-bold text-slate-800 placeholder:text-slate-400' : 'font-medium text-slate-900 placeholder:text-slate-300'}`}
                                            value={item.text}
                                            onChange={e => updateTemplateItem(item.id, { text: e.target.value })}
                                            placeholder={item.type === 'header' ? 'Sectie Titel' : 'Vraag stelling...'}
                                        />
                                        
                                        {item.type !== 'header' && (
                                            <input 
                                                className="w-full bg-transparent text-xs text-slate-500 border-none p-0 focus:ring-0 placeholder:text-slate-300"
                                                value={item.description || ''}
                                                onChange={e => updateTemplateItem(item.id, { description: e.target.value })}
                                                placeholder="Voeg hier een beschrijving of instructie toe..."
                                            />
                                        )}
                                        
                                        {item.type !== 'header' && (
                                            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-50 items-center">
                                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.required}
                                                        onChange={e => updateTemplateItem(item.id, { required: e.target.checked })}
                                                        className="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                                                    /> 
                                                    <span className="text-xs font-bold text-slate-600">Verplicht</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.isCritical}
                                                        onChange={e => updateTemplateItem(item.id, { isCritical: e.target.checked })}
                                                        className="rounded text-red-600 focus:ring-red-500 border-slate-300"
                                                    /> 
                                                    <span className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertTriangle size={10}/> Kritiek Punt</span>
                                                </label>
                                                
                                                <button 
                                                    onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                                    className="ml-auto text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                                >
                                                    <Settings size={12}/> Opties {expandedItemId === item.id ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded">{item.type}</span>
                                        <button onClick={() => removeTemplateItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>

                                {/* Expanded Settings Area */}
                                {expandedItemId === item.id && item.type !== 'header' && (
                                    <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-100 animate-in slide-in-from-top-1 text-sm space-y-4">
                                        {(item.type === 'select' || item.type === 'multi_select') && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opties (gescheiden door komma)</label>
                                                <input 
                                                    className="w-full border border-slate-300 rounded p-2 text-sm"
                                                    value={item.options?.join(', ') || ''}
                                                    onChange={e => updateTemplateItem(item.id, { options: e.target.value.split(',').map(s=>s.trim()) })}
                                                    placeholder="Optie 1, Optie 2, Optie 3"
                                                />
                                            </div>
                                        )}

                                        {item.type === 'yes_no' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Uitleg nodig bij:</label>
                                                    <select 
                                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                                        value={item.explanationRequiredOn || ''}
                                                        onChange={e => updateTemplateItem(item.id, { explanationRequiredOn: e.target.value as any || null })}
                                                    >
                                                        <option value="">Nooit</option>
                                                        <option value="yes">Ja</option>
                                                        <option value="no">Nee</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vraagstelling bij toelichting</label>
                                                    <input 
                                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                                        value={item.explanationLabel || ''}
                                                        onChange={e => updateTemplateItem(item.id, { explanationLabel: e.target.value })}
                                                        placeholder="Bv. Waarom is dit niet in orde?"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {editingTemplate.items?.length === 0 && (
                            <div className="text-center py-20 text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-xl">
                                Nog geen vragen toegevoegd. Klik op de knoppen hierboven om te beginnen.
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Settings */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
                    <h3 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Layout size={16}/> Instellingen
                    </h3>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Titel Checklist</label>
                            <input 
                                className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
                                value={editingTemplate.title}
                                onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
                                placeholder="Naam van de checklist..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                            <select 
                                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 cursor-pointer"
                                value={editingTemplate.category || 'Algemeen'}
                                onChange={e => setEditingTemplate({...editingTemplate, category: e.target.value})}
                            >
                                <option value="Algemeen">Algemeen</option>
                                <option value="Front Office">Front Office</option>
                                <option value="Huishouding">Huishouding</option>
                                <option value="F&B">F&B</option>
                                <option value="Veiligheid">Veiligheid</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Beschrijving</label>
                            <textarea 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none bg-slate-50"
                                value={editingTemplate.description}
                                onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                                placeholder="Waarvoor dient deze lijst?"
                                rows={3}
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <Shield size={12}/> Zichtbaar voor Rollen
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Manager', 'Senior Medewerker', 'Medewerker'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => toggleRoleTarget(role)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                            editingTemplate.targetRoles?.includes(role)
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Leeg = Zichtbaar voor iedereen.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPlayer = () => {
        if (!activeSubmission) return null;
        const template = activeSubmission.templateSnapshot || templates.find(t => t.id === activeSubmission.templateId);
        if (!template) return <div>Template niet gevonden</div>;

        // Calculate progress
        const totalItems = template.items.filter(i => i.type !== 'header').length;
        const completedItems = template.items.filter(i => i.type !== 'header' && activeSubmission.responses[i.id]).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return (
            <div className="max-w-3xl mx-auto animate-in fade-in pb-20">
                {/* Header Card */}
                <div className="flex items-center justify-between mb-6 sticky top-4 z-20 bg-slate-50/90 backdrop-blur py-2">
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <ArrowLeft size={18}/> Terug
                    </button>
                    {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm"><History size={12}/> Opslaan...</span>}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-8">
                    <div className="bg-slate-50 p-8 border-b border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 shadow-sm">{template.category || 'Algemeen'}</span>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-slate-900">{progress}%</div>
                                <div className="text-xs text-slate-400 font-bold uppercase">Voltooid</div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{template.title}</h1>
                        <p className="text-slate-500">{template.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-200 rounded-full mt-6 overflow-hidden">
                            <div className="h-full bg-teal-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {template.items.map(item => {
                            if (item.type === 'header') {
                                return <h3 key={item.id} className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mt-8 pt-4 flex items-center gap-2"><Layout size={18} className="text-slate-400"/> {item.text}</h3>;
                            }

                            const val = activeSubmission.responses[item.id];
                            
                            // Handling Yes/No Logic with Explanation
                            const isExplanationNeeded = item.type === 'yes_no' && item.explanationRequiredOn && 
                                                        ((item.explanationRequiredOn === 'yes' && val === true) || (item.explanationRequiredOn === 'no' && val === false));

                            return (
                                <div key={item.id} className={`space-y-3 p-4 rounded-xl transition-colors ${item.isCritical && !val ? 'bg-red-50 border border-red-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <label className="font-medium text-slate-900 block">
                                                {item.text} 
                                                {item.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>
                                            {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                                        </div>
                                        {item.isCritical && (
                                            <div className="group relative">
                                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1 cursor-help">
                                                    <AlertTriangle size={10}/> Kritiek
                                                </span>
                                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-10">
                                                    Dit punt is essentieel voor de veiligheid of kwaliteit en moet correct worden ingevuld.
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {item.type === 'text' && (
                                        <input 
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                                            value={val || ''}
                                            onChange={e => handleResponseChange(item.id, e.target.value)}
                                            placeholder="Antwoord..."
                                        />
                                    )}

                                    {item.type === 'checkbox' && (
                                        <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${val ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${val ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-300'}`}>
                                                {val && <Check size={14} strokeWidth={3}/>}
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="hidden"
                                                checked={!!val}
                                                onChange={e => handleResponseChange(item.id, e.target.checked)}
                                            />
                                            <span className={`text-sm font-bold ${val ? 'text-teal-900' : 'text-slate-600'}`}>Gedaan / Akkoord</span>
                                        </label>
                                    )}

                                    {item.type === 'yes_no' && (
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleResponseChange(item.id, true)}
                                                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${val === true ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                                                >
                                                    Ja
                                                </button>
                                                <button 
                                                    onClick={() => handleResponseChange(item.id, false)}
                                                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${val === false ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                                                >
                                                    Nee
                                                </button>
                                            </div>
                                            
                                            {isExplanationNeeded && (
                                                <div className="animate-in slide-in-from-top-2 fade-in bg-amber-50 p-4 rounded-xl border border-amber-100">
                                                    <label className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={12}/> {item.explanationLabel || 'Toelichting vereist'}</label>
                                                    <textarea 
                                                        className="w-full p-3 text-sm border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                                        rows={2}
                                                        placeholder="Typ hier..."
                                                        value={activeSubmission.responses[`${item.id}_expl`] || ''}
                                                        onChange={e => handleResponseChange(`${item.id}_expl`, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {item.type === 'select' && (
                                        <select 
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                                            value={val || ''}
                                            onChange={e => handleResponseChange(item.id, e.target.value)}
                                        >
                                            <option value="">Selecteer een optie...</option>
                                            {item.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}

                                    {item.type === 'multi_select' && (
                                        <div className="space-y-2">
                                            {item.options?.map(opt => {
                                                const selected = (val || []).includes(opt);
                                                return (
                                                    <label key={opt} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selected ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-300'}`}>
                                                            {selected && <Check size={14} strokeWidth={3}/>}
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden"
                                                            checked={selected}
                                                            onChange={(e) => {
                                                                const current = val || [];
                                                                const newVal = e.target.checked ? [...current, opt] : current.filter((x: string) => x !== opt);
                                                                handleResponseChange(item.id, newVal);
                                                            }}
                                                        />
                                                        <span className="text-sm text-slate-700">{opt}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {item.type === 'rating' && (
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => handleResponseChange(item.id, star)}
                                                    className={`p-2 rounded-lg transition-colors ${val >= star ? 'text-yellow-400' : 'text-slate-200 hover:text-yellow-200'}`}
                                                >
                                                    <Star size={24} fill="currentColor"/>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {item.type === 'date' && (
                                        <input 
                                            type="datetime-local"
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                                            value={val || ''}
                                            onChange={e => handleResponseChange(item.id, e.target.value)}
                                        />
                                    )}

                                    {item.type === 'file' && (
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                                            <input 
                                                type="file" 
                                                ref={el => fileInputRefs.current[item.id] = el}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(item.id, e.target.files[0])}
                                            />
                                            {val ? (
                                                <div className="relative group">
                                                    <img src={val} className="h-32 mx-auto rounded-lg shadow-sm object-cover" />
                                                    <button onClick={() => handleResponseChange(item.id, null)} className="absolute top-2 right-2 bg-white/90 p-1 rounded text-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                                                </div>
                                            ) : (
                                                <div className="cursor-pointer" onClick={() => !isUploading && fileInputRefs.current[item.id]?.click()}>
                                                    <ImageIcon size={24} className="mx-auto text-slate-300 mb-2"/>
                                                    <p className="text-xs text-slate-500 font-bold">{isUploading ? 'Uploaden...' : 'Klik om foto te uploaden'}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {item.type === 'signature' && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                                            {val ? (
                                                <div className="text-teal-700 font-bold text-sm bg-teal-50 p-2 rounded border border-teal-100 flex items-center justify-center gap-2">
                                                    <Check size={16}/> {val}
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleSign(item.id)}
                                                    className="w-full py-3 bg-white border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-teal-400 hover:text-teal-600 font-bold text-sm transition-all"
                                                >
                                                    <PenTool size={16} className="inline mr-2"/> Klik om digitaal te ondertekenen
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end sticky bottom-0 z-10 backdrop-blur-md bg-opacity-90">
                        <button 
                            onClick={handleCompleteChecklist}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <Check size={20}/> Afronden
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderList = () => (
        <div className="p-8 max-w-[2400px] mx-auto animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <ListTodo className="text-teal-600" size={32} />
                        Checklists
                    </h1>
                    <p className="text-slate-500 mt-1">Dagelijkse taken en controles.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('history')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all">
                        <History size={18}/> Archief
                    </button>
                    {isManager && (
                        <button onClick={handleCreateTemplate} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow hover:bg-slate-800 flex items-center gap-2 transition-all">
                            <Plus size={18}/> Nieuwe Lijst
                        </button>
                    )}
                </div>
            </div>

            {/* Category Tabs */}
            <div className="mb-8 overflow-x-auto pb-2">
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                                activeCategory === cat 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {cat === 'All' ? 'Alle Categorieën' : cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(tpl => {
                    // Check for existing draft
                    const draft = submissions.find(s => s.templateId === tpl.id && s.status === 'Draft' && s.submittedById === currentUser.id);
                    const lastCompleted = submissions
                        .filter(s => s.templateId === tpl.id && s.status === 'Completed')
                        .sort((a,b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime())[0];

                    return (
                        <div key={tpl.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all group flex flex-col h-full cursor-pointer" onClick={() => handleStartChecklist(tpl)}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                                    <ListTodo size={24}/>
                                </div>
                                {isManager && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleEditTemplate(tpl); }} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg"><Edit2 size={16}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mb-1 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">{tpl.category || 'Algemeen'}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{tpl.title}</h3>
                            <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2">{tpl.description || 'Geen beschrijving.'}</p>
                            
                            {lastCompleted && (
                                <div className="text-xs text-slate-400 mb-4 flex items-center gap-1 p-2 bg-slate-50 rounded-lg">
                                    <History size={12}/> Laatst: {new Date(lastCompleted.completedAt!).toLocaleDateString()}
                                </div>
                            )}

                            <button 
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    draft 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                                }`}
                            >
                                {draft ? (
                                    <>Verder met concept <ChevronRight size={16}/></>
                                ) : (
                                    <>Starten <PlayCircle size={16}/></>
                                )}
                            </button>
                        </div>
                    );
                })}
                {filteredTemplates.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                        Geen checklists gevonden in deze categorie.
                    </div>
                )}
            </div>
        </div>
    );

    const renderHistory = () => {
        const completedSubmissions = submissions.filter(s => s.status === 'Completed').sort((a,b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

        return (
            <div className="p-8 max-w-[2400px] mx-auto animate-in fade-in">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-white rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">Checklist Archief</h1>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Checklist</th>
                                <th className="px-6 py-4">Categorie</th>
                                <th className="px-6 py-4">Ingevuld Door</th>
                                <th className="px-6 py-4">Datum</th>
                                <th className="px-6 py-4 text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {completedSubmissions.map(sub => {
                                const tpl = sub.templateSnapshot || templates.find(t => t.id === sub.templateId);
                                const tplTitle = tpl?.title || 'Onbekend';
                                const cat = tpl?.category || '-';

                                return (
                                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-900">{tplTitle}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{cat}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{sub.submittedBy}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(sub.completedAt!).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setViewingSubmission(sub)}
                                                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                            >
                                                <Eye size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {completedSubmissions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Geen historie gevonden.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- VIEW CONTROLLER ---

    if (view === 'builder') return renderBuilder();
    if (view === 'player') return renderPlayer();
    if (view === 'history') return renderHistory();

    return (
        <>
            {renderList()}
            
            {/* HISTORY DETAIL MODAL */}
            <Modal isOpen={!!viewingSubmission} onClose={() => setViewingSubmission(null)} title="Ingevulde Checklist">
                {viewingSubmission && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500">Ingevuld door:</span>
                                <span className="font-bold text-slate-900">{viewingSubmission.submittedBy}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Voltooid op:</span>
                                <span className="font-bold text-slate-900">{new Date(viewingSubmission.completedAt!).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {(viewingSubmission.templateSnapshot?.items || templates.find(t=>t.id===viewingSubmission.templateId)?.items || []).map(item => {
                                if (item.type === 'header') return <h4 key={item.id} className="font-bold text-slate-800 border-b pb-1 mt-4">{item.text}</h4>;
                                
                                const val = viewingSubmission.responses[item.id];
                                return (
                                    <div key={item.id} className="bg-white p-3 border border-slate-200 rounded-lg">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="text-sm font-medium text-slate-700">{item.text}</div>
                                            {item.isCritical && <AlertTriangle size={14} className="text-red-500"/>}
                                        </div>
                                        <div className="text-sm">
                                            {item.type === 'checkbox' && (val ? <span className="text-green-600 font-bold flex items-center gap-1"><Check size={14}/> Gedaan</span> : <span className="text-red-400">Niet gedaan</span>)}
                                            {item.type === 'yes_no' && (
                                                <div className="space-y-1">
                                                    <span className={`font-bold ${val ? 'text-green-600' : 'text-amber-600'}`}>{val ? 'Ja' : 'Nee'}</span>
                                                    {viewingSubmission.responses[`${item.id}_expl`] && (
                                                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded italic">"{viewingSubmission.responses[`${item.id}_expl`]}"</div>
                                                    )}
                                                </div>
                                            )}
                                            {item.type === 'text' && <span className="text-slate-900">{val || '-'}</span>}
                                            {item.type === 'multi_select' && (
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(val) ? val.map((v: string) => <span key={v} className="bg-slate-100 px-2 py-0.5 rounded text-xs">{v}</span>) : '-'}
                                                </div>
                                            )}
                                            {item.type === 'file' && val && (
                                                <a href={val} target="_blank" rel="noopener noreferrer" className="text-teal-600 underline text-xs">Bekijk Bestand</a>
                                            )}
                                            {item.type === 'rating' && <div className="flex text-yellow-400 gap-1">{[...Array(val)].map((_, i) => <Star key={i} size={12} fill="currentColor"/>)}</div>}
                                            {item.type === 'signature' && <span className="font-mono text-xs text-green-700">{val}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={() => setViewingSubmission(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Sluiten</button>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default ChecklistsPage;