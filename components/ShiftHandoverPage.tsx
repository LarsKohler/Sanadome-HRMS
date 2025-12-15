
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Plus, Printer, Edit2, Trash2, ArrowRightLeft, 
    ChevronLeft, ChevronRight, AlertTriangle, Users, Save, X, Lock
} from 'lucide-react';
import { Employee, ShiftHandoverItem } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface ShiftHandoverPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const ShiftHandoverPage: React.FC<ShiftHandoverPageProps> = ({ currentUser, onShowToast }) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<ShiftHandoverItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Permissions
    const isSeniorOrManager = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<ShiftHandoverItem>>({
        category: 'Specific',
        priority: 'Normal',
        target: '',
        content: ''
    });

    useEffect(() => {
        loadItems();
    }, [selectedDate]);

    const loadItems = async () => {
        setLoading(true);
        const data = await api.getShiftHandoverItems(selectedDate);
        setItems(data);
        setLoading(false);
    };

    const handleDateChange = (delta: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleOpenCreate = () => {
        setEditingItem({
            id: undefined,
            category: 'Specific', // Default to Specific for everyone
            priority: 'Normal',
            target: '',
            content: '',
            date: selectedDate
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item: ShiftHandoverItem) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Weet je zeker dat je dit item wilt verwijderen vanaf deze datum?")) {
            // Soft delete using the current selected date as the expiry point
            await api.deleteShiftHandoverItem(id, selectedDate);
            setItems(prev => prev.filter(i => i.id !== id));
            onShowToast("Item verwijderd.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem.content) return onShowToast("Bericht is verplicht.");

        // Force category to Specific if user doesn't have permission for General
        const finalCategory = !isSeniorOrManager ? 'Specific' : (editingItem.category as 'General' | 'Specific');

        const newItem: ShiftHandoverItem = {
            id: editingItem.id || crypto.randomUUID(),
            date: editingItem.date || selectedDate,
            content: editingItem.content,
            category: finalCategory,
            target: editingItem.target,
            authorName: editingItem.authorName || currentUser.name,
            priority: editingItem.priority as 'High' | 'Normal',
            createdAt: editingItem.createdAt || new Date().toISOString(),
            expiryDate: editingItem.expiryDate // Preserve existing expiry if editing
        };

        await api.saveShiftHandoverItem(newItem);
        
        // Optimistic update
        setItems(prev => {
            const idx = prev.findIndex(i => i.id === newItem.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = newItem;
                return newArr;
            }
            return [...prev, newItem];
        });

        setIsModalOpen(false);
        onShowToast("Opgeslagen.");
    };

    const generalItems = useMemo(() => items.filter(i => i.category === 'General'), [items]);
    const specificItems = useMemo(() => items.filter(i => i.category === 'Specific'), [items]);

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] print:p-0 print:m-0 print:bg-white print:h-auto print:min-h-0 relative">
            
            {/* SCREEN HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-xl">
                            <ArrowRightLeft className="text-teal-600" size={32} />
                        </div>
                        Shift Overdracht
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Digitale overdracht en belangrijke meldingen.</p>
                </div>
                
                <div className="flex gap-3 items-center">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1">
                        <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600">
                            <ChevronLeft size={20} />
                        </button>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 w-32 text-center cursor-pointer"
                        />
                        <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button 
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Toevoegen</span>
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <Printer size={18} />
                    </button>
                </div>
            </div>

            {/* PRINT HEADER (Visible only in print) */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 mb-2">SHIFT OVERDRACHT</h1>
                        <p className="text-slate-600 font-medium">Sanadome Hotel & Spa Nijmegen</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Datum</p>
                        <p className="text-xl font-bold text-slate-900">{new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* GENERAL SECTION */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm print:border-2 print:border-slate-900 print:rounded-none print:shadow-none break-inside-avoid">
                    <div className="bg-amber-50 px-6 py-4 border-b-2 border-slate-200 flex justify-between items-center print:bg-slate-100 print:border-slate-900 print:px-4 print:py-2">
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 print:text-black print:uppercase print:text-base">
                            <AlertTriangle size={20} className="text-amber-500 print:hidden"/> Belangrijke Meldingen
                        </h3>
                        {!isSeniorOrManager && <Lock size={16} className="text-slate-400 print:hidden" title="Alleen Seniors/Managers mogen dit bewerken"/>}
                    </div>
                    <div className="p-6 space-y-4 print:p-4">
                        {generalItems.length > 0 ? (
                            generalItems.map(item => (
                                <div key={item.id} className="relative group pl-4 border-l-4 border-amber-400 print:border-slate-900">
                                    <div className="print:hidden absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {isSeniorOrManager && (
                                            <>
                                                <button onClick={() => handleEdit(item)} className="text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-slate-800 font-medium whitespace-pre-wrap print:text-black text-sm leading-relaxed">{item.content}</p>
                                    <div className="text-xs text-slate-400 mt-1 print:text-slate-600 print:mt-0.5">
                                        {item.date !== selectedDate && <span className="font-bold mr-1">[{new Date(item.date).toLocaleDateString('nl-NL', {day: 'numeric', month: 'short'})}]</span>}
                                        Geplaatst door: {item.authorName}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-sm text-center py-4">Geen algemene meldingen.</p>
                        )}
                    </div>
                </div>

                {/* SPECIFIC SECTION */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm print:border-2 print:border-slate-900 print:rounded-none print:shadow-none break-inside-avoid">
                    <div className="bg-slate-50 px-6 py-4 border-b-2 border-slate-200 print:bg-slate-100 print:border-slate-900 print:px-4 print:py-2">
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 print:text-black print:uppercase print:text-base">
                            <Users size={20} className="text-blue-500 print:hidden"/> Gerichte Meldingen
                        </h3>
                    </div>
                    
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b-2 border-slate-200 print:bg-white print:border-slate-900 text-xs font-bold uppercase text-slate-500 print:text-black">
                            <tr>
                                <th className="px-6 py-3 w-1/4 border-r border-slate-200 print:border-slate-900 print:px-2 print:py-2">Gericht aan</th>
                                <th className="px-6 py-3 w-1/6 border-r border-slate-200 print:border-slate-900 print:px-2 print:py-2">Ingevuld door</th>
                                <th className="px-6 py-3 print:px-2 print:py-2">Melding</th>
                                <th className="px-6 py-3 w-16 text-right print:hidden"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 print:divide-slate-900">
                            {specificItems.length > 0 ? (
                                specificItems.map(item => (
                                    <tr key={item.id} className="group hover:bg-slate-50 print:hover:bg-white">
                                        <td className="px-6 py-4 border-r border-slate-200 print:border-slate-900 print:px-2 print:py-2 align-top text-sm font-bold text-slate-800 print:text-black">
                                            {item.target || '-'}
                                            <div className="text-xs font-normal text-slate-400 mt-1">
                                                {new Date(item.date).toLocaleDateString('nl-NL', {day: 'numeric', month: 'short'})}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-200 print:border-slate-900 print:px-2 print:py-2 align-top text-sm text-slate-600 print:text-black">
                                            {item.authorName}
                                        </td>
                                        <td className="px-6 py-4 align-top text-sm text-slate-800 print:text-black whitespace-pre-wrap print:px-2 print:py-2 leading-relaxed">
                                            {item.content}
                                        </td>
                                        <td className="px-6 py-4 text-right print:hidden align-top">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(item)} className="text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic text-sm">Geen gerichte meldingen.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PRINT FOOTER */}
            <div className="hidden print:flex fixed bottom-0 left-0 w-full justify-between items-center text-[10px] text-slate-500 border-t border-slate-300 pt-2 pb-4">
                <span>MijnSanadome HRMS &copy; {new Date().getFullYear()}</span>
                <span>Gegenereerd op: {new Date().toLocaleString('nl-NL')}</span>
                <span className="uppercase">Vertrouwelijk Document</span>
            </div>

            {/* EDIT MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem.id ? "Wijzig Melding" : "Nieuwe Melding"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="bg-slate-50 p-1 rounded-lg flex p-1 border border-slate-200 mb-4">
                        <button 
                            type="button" 
                            disabled={!isSeniorOrManager}
                            onClick={() => setEditingItem({...editingItem, category: 'General'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                                editingItem.category === 'General' 
                                ? 'bg-white shadow text-slate-900' 
                                : isSeniorOrManager ? 'text-slate-500 hover:text-slate-700' : 'text-slate-300 cursor-not-allowed'
                            }`}
                        >
                            {isSeniorOrManager ? '' : <Lock size={12}/>} Algemeen / Belangrijk
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setEditingItem({...editingItem, category: 'Specific'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${editingItem.category === 'Specific' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Gericht aan...
                        </button>
                    </div>

                    {editingItem.category === 'Specific' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gericht aan</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                                placeholder="bv. Iedereen t/m 19 dec, of Nachtdienst"
                                value={editingItem.target}
                                onChange={(e) => setEditingItem({...editingItem, target: e.target.value})}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Melding</label>
                        <textarea 
                            rows={5}
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="Typ hier de notitie..."
                            value={editingItem.content}
                            onChange={(e) => setEditingItem({...editingItem, content: e.target.value})}
                            required
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Annuleren</button>
                        <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg flex items-center gap-2">
                            <Save size={16}/> Opslaan
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Print Styles Override */}
            <style>{`
                @media print {
                    @page { margin: 15mm; size: A4; }
                    html, body { 
                        height: auto; 
                        overflow: visible; 
                        background: white; 
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    /* Hide everything not in this component */
                    aside, header, nav, .sidebar { display: none !important; }
                    
                    /* Reset layout */
                    .max-w-\\[2400px\\] { max-width: none !important; margin: 0 !important; padding: 0 !important; }
                    
                    /* Ensure colors print correctly */
                    * { border-color: #cbd5e1 !important; }
                    .print\\:border-slate-900 { border-color: #0f172a !important; }
                    
                    /* Improve typography for print */
                    body { font-family: 'Inter', sans-serif; font-size: 12pt; }
                }
            `}</style>
        </div>
    );
};

export default ShiftHandoverPage;
