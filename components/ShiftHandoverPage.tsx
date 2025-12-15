
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Plus, Printer, Edit2, Trash2, ArrowRightLeft, 
    ChevronLeft, ChevronRight, AlertTriangle, Users, Save, X
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
            category: 'Specific',
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
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            await api.deleteShiftHandoverItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
            onShowToast("Item verwijderd.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem.content) return onShowToast("Bericht is verplicht.");

        const newItem: ShiftHandoverItem = {
            id: editingItem.id || crypto.randomUUID(),
            date: editingItem.date || selectedDate,
            content: editingItem.content,
            category: editingItem.category as 'General' | 'Specific',
            target: editingItem.target,
            authorName: editingItem.authorName || currentUser.name,
            priority: editingItem.priority as 'High' | 'Normal',
            createdAt: editingItem.createdAt || new Date().toISOString()
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

            {/* PRINT HEADER */}
            <div className="hidden print:block text-center mb-8 pt-4">
                <h1 className="text-2xl font-bold uppercase tracking-widest text-black mb-2">SHIFT OVERDRACHT</h1>
                <h2 className="text-xl font-bold text-black">{new Date(selectedDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            </div>

            <div className="space-y-8">
                {/* GENERAL SECTION */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm print:border-2 print:border-black print:rounded-none print:shadow-none">
                    <div className="bg-slate-50 px-6 py-4 border-b-2 border-slate-200 flex justify-between items-center print:bg-white print:border-black print:px-4 print:py-2">
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 print:text-black print:uppercase">
                            <AlertTriangle size={20} className="text-amber-500 print:hidden"/> Belangrijke Meldingen
                        </h3>
                    </div>
                    <div className="p-6 space-y-4 print:p-4">
                        {generalItems.length > 0 ? (
                            generalItems.map(item => (
                                <div key={item.id} className="relative group pl-4 border-l-4 border-amber-400 print:border-black">
                                    <div className="print:hidden absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button onClick={() => handleEdit(item)} className="text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                    <p className="text-slate-800 font-medium whitespace-pre-wrap print:text-black text-sm">{item.content}</p>
                                    <div className="text-xs text-slate-400 mt-1 print:hidden">Door: {item.authorName}</div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-sm text-center py-4">Geen algemene meldingen.</p>
                        )}
                    </div>
                </div>

                {/* SPECIFIC SECTION */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm print:border-2 print:border-black print:rounded-none print:shadow-none">
                    <div className="bg-slate-50 px-6 py-4 border-b-2 border-slate-200 print:bg-white print:border-black print:px-4 print:py-2">
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 print:text-black print:uppercase">
                            <Users size={20} className="text-blue-500 print:hidden"/> Gerichte Meldingen
                        </h3>
                    </div>
                    
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b-2 border-slate-200 print:bg-white print:border-black text-xs font-bold uppercase text-slate-500 print:text-black">
                            <tr>
                                <th className="px-6 py-3 w-1/4 border-r border-slate-200 print:border-black print:px-2 print:py-1">Gericht aan/datum</th>
                                <th className="px-6 py-3 w-1/6 border-r border-slate-200 print:border-black print:px-2 print:py-1">Ingevuld door</th>
                                <th className="px-6 py-3 print:px-2 print:py-1">Melding</th>
                                <th className="px-6 py-3 w-16 text-right print:hidden"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 print:divide-black">
                            {specificItems.length > 0 ? (
                                specificItems.map(item => (
                                    <tr key={item.id} className="group hover:bg-slate-50 print:hover:bg-white">
                                        <td className="px-6 py-4 border-r border-slate-200 print:border-black print:px-2 print:py-2 align-top text-sm font-bold text-slate-800 print:text-black">
                                            {item.target || '-'}
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-200 print:border-black print:px-2 print:py-2 align-top text-sm text-slate-600 print:text-black">
                                            {item.authorName}
                                        </td>
                                        <td className="px-6 py-4 align-top text-sm text-slate-800 print:text-black whitespace-pre-wrap print:px-2 print:py-2">
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

            {/* EDIT MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem.id ? "Wijzig Melding" : "Nieuwe Melding"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="bg-slate-50 p-1 rounded-lg flex p-1 border border-slate-200 mb-4">
                        <button 
                            type="button" 
                            onClick={() => setEditingItem({...editingItem, category: 'General'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${editingItem.category === 'General' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Algemeen / Belangrijk
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
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gericht aan / Datum</label>
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
                    @page { margin: 10mm; size: A4; }
                    html, body { height: auto; overflow: visible; background: white; }
                    
                    /* Hide everything not in this component */
                    aside, header, nav, .sidebar { display: none !important; }
                    
                    /* Reset layout */
                    .max-w-\\[2400px\\] { max-width: none !important; margin: 0 !important; padding: 0 !important; }
                    
                    /* High contrast borders */
                    * { border-color: #000 !important; }
                }
            `}</style>
        </div>
    );
};

export default ShiftHandoverPage;
