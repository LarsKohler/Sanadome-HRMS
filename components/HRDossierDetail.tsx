
import React, { useState } from 'react';
import { 
    X, User, Calendar, Phone, Mail, MapPin, 
    Briefcase, Clock, AlertTriangle, Thermometer, 
    FileText, Plus, CheckCircle2, MessageSquare, 
    Trash2, ShieldAlert, History, Paperclip, 
    ChevronDown, Save
} from 'lucide-react';
import { Employee, DossierEntry, EmployeeNote, DossierEntryType } from '../types';
import { Modal } from './Modal';

interface HRDossierDetailProps {
    employee: Employee;
    currentUser: Employee;
    onUpdate: (employee: Employee) => void;
    onClose: () => void;
    onShowToast: (msg: string) => void;
}

const HRDossierDetail: React.FC<HRDossierDetailProps> = ({ employee, currentUser, onUpdate, onClose, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'timeline' | 'info' | 'files'>('timeline');
    
    // Modal States
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<DossierEntryType | 'Note'>('Note');
    
    // Form States
    const [noteForm, setNoteForm] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
    const [sickForm, setSickForm] = useState({ type: 'Kort', tasksHandedOver: false });
    const [warningForm, setWarningForm] = useState({ severity: 'Low' });

    // --- ACTIONS ---

    const handleSaveEntry = (e: React.FormEvent) => {
        e.preventDefault();
        
        let updatedEmployee = { ...employee };

        if (actionType === 'Note') {
            const newNote: EmployeeNote = {
                id: crypto.randomUUID(),
                title: noteForm.title || 'Interne Notitie',
                category: 'General',
                content: noteForm.content,
                date: new Date(noteForm.date).toLocaleDateString('nl-NL'),
                author: currentUser.name,
                visibleToEmployee: false, // HR Notes are private by default in this view
                impact: 'Neutral'
            };
            updatedEmployee.notes = [newNote, ...(updatedEmployee.notes || [])];
        } else {
            const newEntry: DossierEntry = {
                id: crypto.randomUUID(),
                type: actionType as DossierEntryType,
                date: new Date(noteForm.date).toLocaleDateString('nl-NL'),
                title: noteForm.title || (actionType === 'Sick' ? 'Ziekmelding' : actionType === 'Warning' ? 'Officiële Waarschuwing' : 'Notitie'),
                description: noteForm.content,
                loggedBy: currentUser.name,
                meta: actionType === 'Sick' ? { sickType: sickForm.type as any, tasksHandedOver: sickForm.tasksHandedOver } :
                      actionType === 'Warning' ? { severity: warningForm.severity as any } : undefined
            };
            updatedEmployee.dossier = [newEntry, ...(updatedEmployee.dossier || [])];
        }

        onUpdate(updatedEmployee);
        onShowToast("Item toegevoegd aan dossier.");
        setIsActionModalOpen(false);
        resetForms();
    };

    const handleResolveSick = (entryId: string) => {
        const updatedDossier = (employee.dossier || []).map(entry => {
            if (entry.id === entryId) {
                return { ...entry, endDate: new Date().toLocaleDateString('nl-NL') };
            }
            return entry;
        });
        
        // Add recovery entry
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

    const resetForms = () => {
        setNoteForm({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
        setSickForm({ type: 'Kort', tasksHandedOver: false });
        setWarningForm({ severity: 'Low' });
    };

    const openActionModal = (type: DossierEntryType | 'Note') => {
        setActionType(type);
        setNoteForm(prev => ({ ...prev, title: type === 'Sick' ? 'Ziekmelding' : type === 'Warning' ? 'Officiële Waarschuwing' : '' }));
        setIsActionModalOpen(true);
    };

    // --- RENDERERS ---

    const renderTimeline = () => {
        // Combine Dossier Entries AND Notes into one timeline
        const allItems = [
            ...(employee.dossier || []).map(d => ({ ...d, source: 'dossier', sortDate: new Date(d.date.split('-').reverse().join('-')) })),
            ...(employee.notes || []).map(n => ({ ...n, source: 'note', sortDate: new Date(n.date.split('-').reverse().join('-')), type: 'Note', description: n.content, loggedBy: n.author }))
        ].sort((a,b) => b.sortDate.getTime() - a.sortDate.getTime());

        if (allItems.length === 0) return <div className="p-8 text-center text-slate-400 italic">Nog geen dossier items.</div>;

        return (
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
                            'bg-white border-slate-200 text-slate-400'
                        }`}>
                            {item.type === 'Sick' && <Thermometer size={14} />}
                            {item.type === 'Warning' && <AlertTriangle size={14} />}
                            {item.type === 'Recovery' && <CheckCircle2 size={14} />}
                            {item.type === 'Note' && <MessageSquare size={14} />}
                            {item.type === 'Late' && <Clock size={14} />}
                        </div>

                        {/* Content Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{item.title}</span>
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
                            <button onClick={() => openActionModal('Sick')} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 font-bold text-sm flex items-center gap-3 transition-colors">
                                <Thermometer size={16} className="text-red-500"/> Ziek Melden
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {employee.documents?.map(doc => (
                                    <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <FileText size={20}/>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-1 truncate">{doc.name}</h4>
                                        <p className="text-xs text-slate-500">{doc.date} • {doc.size}</p>
                                    </div>
                                ))}
                                {(!employee.documents || employee.documents.length === 0) && (
                                    <div className="col-span-full py-12 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl">
                                        Geen documenten in dit dossier.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ACTION MODAL */}
            <Modal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                title={actionType === 'Sick' ? 'Ziekmelding Registreren' : actionType === 'Warning' ? 'Officiële Waarschuwing' : 'Nieuwe Notitie'}
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

                    {(actionType === 'Note' || actionType === 'Warning') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Onderwerp / Titel</label>
                            <input 
                                type="text"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder={actionType === 'Warning' ? 'Reden van waarschuwing' : 'Korte titel'}
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
