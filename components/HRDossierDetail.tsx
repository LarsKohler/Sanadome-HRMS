
import React, { useState, useRef, useMemo } from 'react';
import { 
    X, User, Calendar, Phone, Mail, MapPin, 
    Briefcase, Clock, AlertTriangle, Thermometer, 
    FileText, Plus, CheckCircle2, MessageSquare, 
    Trash2, ShieldAlert, History, Paperclip, 
    ChevronDown, Save, Edit2, Upload, Download, ArrowUpRight, Eye, Heart
} from 'lucide-react';
import { Employee, DossierEntry, EmployeeNote, DossierEntryType, EmployeeDocument } from '../types';
import { Modal } from './Modal';
import { api } from '../utils/api';

interface HRDossierDetailProps {
    employee: Employee;
    currentUser: Employee;
    onUpdate: (employee: Employee) => void;
    onClose: () => void;
    onShowToast: (msg: string) => void;
}

const HRDossierDetail: React.FC<HRDossierDetailProps> = ({ employee, currentUser, onUpdate, onClose, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'timeline' | 'files'>('timeline');
    
    // Filtering
    const [timelineFilter, setTimelineFilter] = useState<'All' | 'Sick' | 'Late' | 'Warning' | 'Note' | 'Compliment'>('All');

    // Modal States
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<DossierEntryType | 'Note'>('Note');
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editingSource, setEditingSource] = useState<'dossier' | 'note' | null>(null);
    
    // Form States
    const [noteForm, setNoteForm] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
    const [sickForm, setSickForm] = useState({ type: 'Kort', tasksHandedOver: false });
    const [warningForm, setWarningForm] = useState({ severity: 'Low' });

    // File Upload Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STATISTICS ---
    const stats = useMemo(() => {
        const dossier = employee.dossier || [];
        const sickCount = dossier.filter(e => e.type === 'Sick').length;
        const activeSick = dossier.find(e => e.type === 'Sick' && !e.endDate);
        const lateCount = dossier.filter(e => e.type === 'Late').length;
        const warningCount = dossier.filter(e => e.type === 'Warning').length;
        const complimentCount = dossier.filter(e => e.type === 'Compliment').length;
        const notesCount = employee.notes ? employee.notes.length : 0;

        return { sickCount, activeSick, lateCount, warningCount, notesCount, complimentCount };
    }, [employee]);

    // --- ACTIONS ---

    const resetForms = () => {
        setNoteForm({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
        setSickForm({ type: 'Kort', tasksHandedOver: false });
        setWarningForm({ severity: 'Low' });
        setEditingEntryId(null);
        setEditingSource(null);
    };

    const openActionModal = (type: DossierEntryType | 'Note', existingEntry: any = null, source: 'dossier' | 'note' | null = null) => {
        setActionType(type);
        setEditingEntryId(existingEntry ? existingEntry.id : null);
        setEditingSource(source);

        if (existingEntry) {
            setNoteForm({
                title: existingEntry.title || existingEntry.type,
                content: existingEntry.description || existingEntry.content,
                date: existingEntry.date.split('-').reverse().join('-') // Convert DD-MM-YYYY back to YYYY-MM-DD for input
            });
            
            if (type === 'Sick' && existingEntry.meta) {
                setSickForm({
                    type: existingEntry.meta.sickType || 'Kort',
                    tasksHandedOver: existingEntry.meta.tasksHandedOver || false
                });
            }
            if (type === 'Warning' && existingEntry.meta) {
                setWarningForm({
                    severity: existingEntry.meta.severity || 'Low'
                });
            }
        } else {
            resetForms();
            // Pre-fill generic titles
            let title = '';
            if (type === 'Sick') title = 'Ziekmelding';
            else if (type === 'Warning') title = 'Officiële Waarschuwing';
            else if (type === 'Compliment') title = 'Compliment';
            
            setNoteForm(prev => ({ ...prev, title }));
        }
        setIsActionModalOpen(true);
    };

    const handleSaveEntry = (e: React.FormEvent) => {
        e.preventDefault();
        
        let updatedEmployee = { ...employee };
        const formattedDate = new Date(noteForm.date).toLocaleDateString('nl-NL');

        if (actionType === 'Note') {
            const noteData: EmployeeNote = {
                id: editingEntryId || crypto.randomUUID(),
                title: noteForm.title || 'Interne Notitie',
                category: 'General',
                content: noteForm.content,
                date: formattedDate,
                author: currentUser.name,
                visibleToEmployee: false,
                impact: 'Neutral'
            };

            if (editingEntryId) {
                updatedEmployee.notes = (updatedEmployee.notes || []).map(n => n.id === editingEntryId ? { ...n, ...noteData } : n);
            } else {
                updatedEmployee.notes = [noteData, ...(updatedEmployee.notes || [])];
            }

        } else {
            const dossierData: DossierEntry = {
                id: editingEntryId || crypto.randomUUID(),
                type: actionType as DossierEntryType,
                date: formattedDate,
                title: noteForm.title || (actionType === 'Sick' ? 'Ziekmelding' : actionType === 'Warning' ? 'Officiële Waarschuwing' : actionType === 'Compliment' ? 'Compliment' : 'Notitie'),
                description: noteForm.content,
                loggedBy: currentUser.name,
                meta: actionType === 'Sick' ? { sickType: sickForm.type as any, tasksHandedOver: sickForm.tasksHandedOver } :
                      actionType === 'Warning' ? { severity: warningForm.severity as any } : undefined
            };

            // Preserve endDate if editing existing sick entry
            if (editingEntryId && actionType === 'Sick') {
                const existing = employee.dossier?.find(e => e.id === editingEntryId);
                if (existing?.endDate) dossierData.endDate = existing.endDate;
            }

            if (editingEntryId) {
                updatedEmployee.dossier = (updatedEmployee.dossier || []).map(d => d.id === editingEntryId ? { ...d, ...dossierData } : d);
            } else {
                updatedEmployee.dossier = [dossierData, ...(updatedEmployee.dossier || [])];
            }
        }

        onUpdate(updatedEmployee);
        onShowToast(editingEntryId ? "Item bijgewerkt." : "Item toegevoegd aan dossier.");
        setIsActionModalOpen(false);
        resetForms();
    };

    const handleDeleteEntry = (id: string, source: 'dossier' | 'note') => {
        if (!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;

        let updatedEmployee = { ...employee };
        
        if (source === 'dossier') {
            const entryToDelete = employee.dossier?.find(e => e.id === id);
            
            // SMART LOGIC: If deleting a 'Recovery', re-open the corresponding sick leave
            if (entryToDelete && entryToDelete.type === 'Recovery') {
                updatedEmployee.dossier = (updatedEmployee.dossier || []).map(e => {
                    // Check if this is a sick entry that ended on the same date as the recovery being deleted
                    if (e.type === 'Sick' && e.endDate === entryToDelete.date) {
                         const { endDate, ...rest } = e; // Remove endDate property to make it active
                         return rest as DossierEntry;
                    }
                    return e;
                });
                onShowToast("Herstelmelding verwijderd. Ziekte heropend.");
            } else {
                onShowToast("Item verwijderd.");
            }

            // Remove the actual entry
            updatedEmployee.dossier = (updatedEmployee.dossier || []).filter(e => e.id !== id);
        } else {
            updatedEmployee.notes = (updatedEmployee.notes || []).filter(n => n.id !== id);
            onShowToast("Notitie verwijderd.");
        }
        
        onUpdate(updatedEmployee);
    };

    const handleResolveSick = (entryId: string) => {
        const updatedDossier = (employee.dossier || []).map(entry => {
            if (entry.id === entryId) {
                return { ...entry, endDate: new Date().toLocaleDateString('nl-NL') };
            }
            return entry;
        });
        
        const recoveryEntry: DossierEntry = {
            id: crypto.randomUUID(),
            type: 'Recovery',
            date: new Date().toLocaleDateString('nl-NL'),
            title: 'Hersteld gemeld',
            description: 'Medewerker is hersteld gemeld.',
            loggedBy: currentUser.name
        };

        onUpdate({ ...employee, dossier: [recoveryEntry, ...updatedDossier] });
        onShowToast("Ziekteperiode afgesloten.");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        onShowToast("Bestand uploaden...");
        try {
            const url = await api.uploadFile(file);
            if (url) {
                const newDoc: EmployeeDocument = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
                    category: 'Dossier',
                    date: new Date().toLocaleDateString('nl-NL'),
                    size: (file.size / 1024).toFixed(0) + ' KB',
                    uploadedBy: currentUser.name
                };
                const updatedEmployee = { ...employee, documents: [newDoc, ...(employee.documents || [])] };
                onUpdate(updatedEmployee);
                onShowToast("Document toegevoegd aan dossier.");
            }
        } catch (error) {
            console.error(error);
            onShowToast("Upload mislukt.");
        }
    };

    const handleDeleteDocument = (docId: string) => {
        if (!confirm("Document verwijderen?")) return;
        const updatedDocs = (employee.documents || []).filter(d => d.id !== docId);
        onUpdate({ ...employee, documents: updatedDocs });
        onShowToast("Document verwijderd.");
    };

    // --- RENDERERS ---

    const renderTimeline = () => {
        // Combine Dossier Entries AND Notes into one timeline
        let allItems = [
            ...(employee.dossier || []).map(d => ({ ...d, source: 'dossier', sortDate: new Date(d.date.split('-').reverse().join('-')) })),
            ...(employee.notes || []).map(n => ({ ...n, source: 'note', sortDate: new Date(n.date.split('-').reverse().join('-')), type: 'Note', description: n.content, loggedBy: n.author }))
        ].sort((a,b) => b.sortDate.getTime() - a.sortDate.getTime());

        // --- FILTERING ---
        if (timelineFilter !== 'All') {
            allItems = allItems.filter(item => {
                if (timelineFilter === 'Note' && item.source === 'note') return true;
                if (timelineFilter === 'Compliment' && item.type === 'Compliment') return true;
                return item.type === timelineFilter;
            });
        }

        return (
            <div className="space-y-8">
                {/* STATS DASHBOARD - UPDATED FOR BETTER FIT (5 Columns) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
                        <div className="flex items-center gap-2 z-10">
                            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Thermometer size={16}/></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Ziekte</span>
                        </div>
                        <div className="z-10">
                            <div className="text-2xl font-bold text-slate-900">{stats.sickCount}x</div>
                        </div>
                        {stats.activeSick && (
                            <div className="absolute bottom-0 left-0 w-full bg-red-50 px-4 py-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="text-[10px] font-bold text-red-700 uppercase">Actief</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={16}/></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Te Laat</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{stats.lateCount}x</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><AlertTriangle size={16}/></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title="Waarschuwingen">Waarschuwing</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{stats.warningCount}x</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><Heart size={16}/></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title="Complimenten">Complimenten</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{stats.complimentCount}x</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><MessageSquare size={16}/></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Notities</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{stats.notesCount}</div>
                    </div>
                </div>

                {/* FILTER BAR */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'All', label: 'Alles Toon' },
                        { id: 'Sick', label: 'Ziekte', icon: Thermometer },
                        { id: 'Late', label: 'Te Laat', icon: Clock },
                        { id: 'Warning', label: 'Waarschuwing', icon: AlertTriangle },
                        { id: 'Compliment', label: 'Compliment', icon: Heart },
                        { id: 'Note', label: 'Notities', icon: MessageSquare },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setTimelineFilter(f.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                                timelineFilter === f.id 
                                ? 'bg-slate-900 text-white border-slate-900' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {f.icon && <f.icon size={12}/>}
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* TIMELINE ITEMS */}
                {allItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-2xl">
                        Geen items gevonden met dit filter.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {allItems.map((item: any) => (
                            <div key={item.id} className="relative pl-8 group">
                                {/* Connector Line */}
                                <div className="absolute left-3.5 top-8 bottom-[-24px] w-0.5 bg-slate-200 group-last:hidden"></div>
                                
                                {/* Icon */}
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                                    item.type === 'Sick' ? 'bg-red-50 border-red-200 text-red-600' :
                                    item.type === 'Warning' ? 'bg-slate-900 border-slate-700 text-white' :
                                    item.type === 'Recovery' ? 'bg-green-50 border-green-200 text-green-600' :
                                    item.type === 'Compliment' ? 'bg-green-50 border-green-200 text-green-600' :
                                    'bg-white border-slate-200 text-slate-400'
                                }`}>
                                    {item.type === 'Sick' && <Thermometer size={14} />}
                                    {item.type === 'Warning' && <AlertTriangle size={14} />}
                                    {item.type === 'Recovery' && <CheckCircle2 size={14} />}
                                    {item.type === 'Note' && <MessageSquare size={14} />}
                                    {item.type === 'Late' && <Clock size={14} />}
                                    {item.type === 'Compliment' && <Heart size={14} fill="currentColor" />}
                                </div>

                                {/* Content Card */}
                                <div className={`border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group/card relative ${
                                    item.type === 'Compliment' ? 'bg-green-50/30 border-green-100' : 'bg-white border-slate-200'
                                }`}>
                                    {/* Edit/Delete Actions (Hover) */}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-2">
                                        {item.type !== 'Recovery' && (
                                            <button 
                                                onClick={() => openActionModal(item.type, item, item.source)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Bewerken"
                                            >
                                                <Edit2 size={14}/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDeleteEntry(item.id, item.source)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Verwijderen"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-2 pr-12">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${item.type === 'Compliment' ? 'text-green-800' : 'text-slate-900'}`}>{item.title}</span>
                                                {item.type === 'Sick' && !item.endDate && (
                                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Actief</span>
                                                )}
                                                {item.source === 'note' && (
                                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Notitie</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {item.date} • Door: {item.loggedBy || item.author}
                                            </div>
                                        </div>
                                        {item.type === 'Sick' && !item.endDate && (
                                            <button 
                                                onClick={() => handleResolveSick(item.id)}
                                                className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-bold hover:bg-green-100 transition-colors"
                                            >
                                                Beter Melden
                                            </button>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {item.description || item.content}
                                    </p>

                                    {/* Meta Data Display */}
                                    {item.meta && (
                                        <div className="mt-3 pt-3 border-t border-slate-50 flex gap-4 text-xs text-slate-500">
                                            {item.meta.severity && (
                                                <span className="flex items-center gap-1">
                                                    <ShieldAlert size={12} className={item.meta.severity === 'High' ? 'text-red-500' : 'text-amber-500'}/> 
                                                    Ernst: {item.meta.severity}
                                                </span>
                                            )}
                                            {item.meta.sickType && (
                                                <span className="flex items-center gap-1">
                                                    <Thermometer size={12}/> Type: {item.meta.sickType}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={employee.avatar} className="w-14 h-14 rounded-xl object-cover border-2 border-slate-100 shadow-sm" alt="Avatar"/>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${employee.onboardingStatus === 'Active' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">{employee.name}</h2>
                        <p className="text-sm text-slate-500">{employee.role} • {employee.departments[0]}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* LEFT SIDEBAR (Static Info) */}
                <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto flex-shrink-0">
                    
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Snel Acties</h3>
                        <div className="space-y-2">
                            <button onClick={() => openActionModal('Note')} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-3 transition-colors">
                                <MessageSquare size={16} className="text-blue-500"/> Notitie
                            </button>
                            <button onClick={() => openActionModal('Compliment')} className="w-full text-left px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold text-sm flex items-center gap-3 transition-colors">
                                <Heart size={16} className="text-green-600"/> Compliment
                            </button>
                            <button onClick={() => openActionModal('Sick')} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 font-bold text-sm flex items-center gap-3 transition-colors">
                                <Thermometer size={16} className="text-red-500"/> Ziek Melden
                            </button>
                            <button onClick={() => openActionModal('Late')} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-700 font-bold text-sm flex items-center gap-3 transition-colors">
                                <Clock size={16} className="text-amber-500"/> Te Laat
                            </button>
                            <button onClick={() => openActionModal('Warning')} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-700 font-bold text-sm flex items-center gap-3 transition-colors">
                                <AlertTriangle size={16} className="text-amber-500"/> Waarschuwing
                            </button>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contract & Dienstverband</h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center gap-3 text-slate-700">
                                <Calendar size={16} className="text-slate-400"/>
                                <div>
                                    <span className="block text-xs text-slate-400">In dienst sinds</span>
                                    <span className="font-medium">{employee.hiredOn}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700">
                                <Briefcase size={16} className="text-slate-400"/>
                                <div>
                                    <span className="block text-xs text-slate-400">Type Contract</span>
                                    <span className="font-medium">{employee.employmentType}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700">
                                <Clock size={16} className="text-slate-400"/>
                                <div>
                                    <span className="block text-xs text-slate-400">Uren per week</span>
                                    <span className="font-medium">38 uur</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contact</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3 text-slate-700 p-2 hover:bg-slate-50 rounded-lg -ml-2">
                                <Mail size={16} className="text-slate-400"/>
                                <span className="truncate">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 p-2 hover:bg-slate-50 rounded-lg -ml-2">
                                <Phone size={16} className="text-slate-400"/>
                                <span>{employee.phone || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 p-2 hover:bg-slate-50 rounded-lg -ml-2">
                                <MapPin size={16} className="text-slate-400"/>
                                <span>Nijmegen, NL</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT CONTENT (Tabs & Timeline) */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                    <div className="border-b border-slate-200 px-8 bg-white sticky top-0 z-10">
                        <div className="flex gap-8">
                            <button 
                                onClick={() => setActiveTab('timeline')}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'timeline' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <History size={16}/> Tijdlijn & Dossier
                            </button>
                            <button 
                                onClick={() => setActiveTab('files')}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'files' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Paperclip size={16}/> Documenten
                            </button>
                        </div>
                    </div>

                    <div className="p-8 overflow-y-auto flex-1">
                        {activeTab === 'timeline' && (
                            <div className="max-w-3xl">
                                {renderTimeline()}
                            </div>
                        )}
                        {activeTab === 'files' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-900">Bestanden</h3>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                                        <Upload size={14}/> Uploaden
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {employee.documents?.map(doc => (
                                        <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer group relative">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    <FileText size={20}/>
                                                </div>
                                                <button onClick={() => handleDeleteDocument(doc.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1 truncate">{doc.name}</h4>
                                            <p className="text-xs text-slate-500">{doc.date} • {doc.size}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 rounded text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1">
                                                    <Eye size={12}/> Bekijk
                                                </button>
                                                <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 rounded text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1">
                                                    <Download size={12}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!employee.documents || employee.documents.length === 0) && (
                                        <div className="col-span-full py-12 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl">
                                            Geen documenten in dit dossier.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ACTION MODAL */}
            <Modal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                title={editingEntryId ? `Wijzig ${actionType === 'Note' ? 'Notitie' : 'Dossier Item'}` : (actionType === 'Sick' ? 'Ziekmelding Registreren' : actionType === 'Warning' ? 'Officiële Waarschuwing' : actionType === 'Late' ? 'Te Laat Melding' : actionType === 'Compliment' ? 'Compliment Geven' : 'Nieuwe Notitie')}
            >
                <form onSubmit={handleSaveEntry} className="space-y-6">
                    {/* Common Date Field */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Datum</label>
                        <input 
                            type="date"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            value={noteForm.date}
                            onChange={e => setNoteForm({...noteForm, date: e.target.value})}
                        />
                    </div>

                    {/* Dynamic Fields */}
                    {actionType === 'Sick' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type Verzuim</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={sickForm.type}
                                    onChange={e => setSickForm({...sickForm, type: e.target.value})}
                                >
                                    <option value="Kort">Kort</option>
                                    <option value="Lang">Lang</option>
                                    <option value="Frequent">Frequent</option>
                                </select>
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={sickForm.tasksHandedOver}
                                        onChange={e => setSickForm({...sickForm, tasksHandedOver: e.target.checked})}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Taken overgedragen?</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {actionType === 'Warning' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ernst</label>
                            <div className="flex gap-2">
                                {['Low', 'Medium', 'High'].map(lvl => (
                                    <button
                                        type="button"
                                        key={lvl}
                                        onClick={() => setWarningForm({ severity: lvl })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border ${warningForm.severity === lvl ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(actionType === 'Note' || actionType === 'Warning' || actionType === 'Late' || actionType === 'Compliment') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Onderwerp / Titel</label>
                            <input 
                                type="text"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder={actionType === 'Warning' ? 'Reden van waarschuwing' : actionType === 'Compliment' ? 'Waarvoor is dit compliment?' : 'Korte titel'}
                                value={noteForm.title}
                                onChange={e => setNoteForm({...noteForm, title: e.target.value})}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            {actionType === 'Note' ? 'Inhoud Notitie' : 'Toelichting / Verslag'}
                        </label>
                        <textarea 
                            required
                            rows={4}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Typ hier de details..."
                            value={noteForm.content}
                            onChange={e => setNoteForm({...noteForm, content: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsActionModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">Annuleren</button>
                        <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md hover:bg-slate-800 transition-colors flex items-center gap-2">
                            <Save size={16}/> Opslaan
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HRDossierDetail;
