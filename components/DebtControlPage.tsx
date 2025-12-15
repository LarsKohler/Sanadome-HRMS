import React, { useState, useEffect, useMemo } from 'react';
import { 
    Euro, Search, Plus, Filter, FileCheck, Printer, AlertTriangle, 
    CheckCircle2, Trash2, Edit2, FileText, ChevronRight, X, Calendar, Download 
} from 'lucide-react';
import { Employee, Debtor, DebtorStatus } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface DebtControlPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const DebtControlPage: React.FC<DebtControlPageProps> = ({ currentUser, onShowToast }) => {
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<DebtorStatus | 'All'>('All');
    
    // Create/Edit State
    const [isCreating, setIsCreating] = useState(false);
    const [newDebtor, setNewDebtor] = useState<Partial<Debtor>>({
        reservationNumber: '',
        firstName: '',
        lastName: '',
        amount: 0,
        email: '',
        phone: '',
        status: 'New'
    });

    // WIK Letter State
    const [wikTarget, setWikTarget] = useState<Debtor | null>(null);
    const [wikDateInput, setWikDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [wikLanguage, setWikLanguage] = useState<'nl' | 'en' | 'de'>('nl');

    // Confirmation Modal
    const [confirmModalState, setConfirmModalState] = useState<{
        isOpen: boolean;
        title: string;
        message?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, title: '' });

    useEffect(() => {
        loadDebtors();
    }, []);

    const loadDebtors = async () => {
        setIsLoading(true);
        try {
            const data = await api.getDebtors();
            setDebtors(data);
        } catch (e) {
            console.error("Failed to load debtors", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDebtor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDebtor.reservationNumber || !newDebtor.lastName || !newDebtor.amount) {
            onShowToast("Vul alle verplichte velden in.");
            return;
        }

        const debtor: Debtor = {
            id: crypto.randomUUID(),
            reservationNumber: newDebtor.reservationNumber,
            firstName: newDebtor.firstName || '',
            lastName: newDebtor.lastName,
            email: newDebtor.email,
            phone: newDebtor.phone,
            address: '', // Optional in UI for now
            amount: Number(newDebtor.amount),
            status: 'New',
            statusDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            importedAt: new Date().toISOString(),
            notes: []
        };

        // Note: api.saveDebtors typically expects an array for bulk, 
        // but here we just prepend and save the whole list or we could implement addDebtor in api.
        const updatedList = [debtor, ...debtors];
        await api.saveDebtors(updatedList); 
        
        setDebtors(updatedList);
        setIsCreating(false);
        setNewDebtor({ reservationNumber: '', firstName: '', lastName: '', amount: 0, email: '', phone: '', status: 'New' });
        onShowToast("Dossier aangemaakt.");
    };

    const handleDeleteDebtor = async (id: string) => {
        const updatedList = debtors.filter(d => d.id !== id);
        // Using deleteDebtor from API if available, or save updated list
        await api.deleteDebtor(id);
        setDebtors(updatedList);
        onShowToast("Dossier verwijderd.");
        closeConfirmModal();
    };

    const confirmDelete = (id: string) => {
        setConfirmModalState({
            isOpen: true,
            title: "Dossier Verwijderen",
            message: "Weet je zeker dat je dit dossier wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
            onConfirm: () => handleDeleteDebtor(id)
        });
    };

    const closeConfirmModal = () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
    };

    const generateWIKLetter = () => {
        // Mock generation
        onShowToast(`WIK brief (${wikLanguage.toUpperCase()}) gegenereerd voor ${wikTarget?.lastName}`);
        setWikTarget(null);
        // In a real app, this would generate a PDF
    };

    const filteredDebtors = useMemo(() => {
        return debtors.filter(d => {
            const matchesSearch = 
                d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                d.reservationNumber.includes(searchTerm);
            const matchesStatus = filterStatus === 'All' || d.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [debtors, searchTerm, filterStatus]);

    const totalAmount = useMemo(() => filteredDebtors.reduce((acc, curr) => acc + curr.amount, 0), [filteredDebtors]);

    return (
        <div className="p-6 md:p-10 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl">
                            <Euro className="text-rose-600" size={32} />
                        </div>
                        Debiteuren Beheer
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Overzicht van openstaande posten en opvolging.</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                    >
                        <Plus size={18} /> Nieuw Dossier
                    </button>
                </div>
            </div>

            {/* CREATE MODE */}
            {isCreating && (
                <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Nieuw Dossier Starten</h3>
                        <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-8">
                        <form onSubmit={handleCreateDebtor} className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reserveringsnummer *</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={newDebtor.reservationNumber}
                                        onChange={e => setNewDebtor({...newDebtor, reservationNumber: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Openstaand Bedrag *</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={newDebtor.amount}
                                        onChange={e => setNewDebtor({...newDebtor, amount: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Voornaam</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={newDebtor.firstName}
                                        onChange={e => setNewDebtor({...newDebtor, firstName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Achternaam *</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={newDebtor.lastName}
                                        onChange={e => setNewDebtor({...newDebtor, lastName: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                                    <input 
                                        type="email" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={newDebtor.email}
                                        onChange={e => setNewDebtor({...newDebtor, email: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefoon</label>
                                    <input 
                                        type="tel" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={newDebtor.phone}
                                        onChange={e => setNewDebtor({...newDebtor, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all">
                                    Dossier Aanmaken
                                </button>
                            </div>
                        </form>
                        
                        <div className="w-full md:w-1/3 bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                            <FileCheck size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 text-sm">Vul de gegevens links in om een nieuw dossier te starten.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* DASHBOARD & LIST */}
            {!isCreating && (
                <>
                    {/* STATS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Totaal Openstaand</div>
                            <div className="text-3xl font-bold text-rose-600">€ {totalAmount.toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Dossiers</div>
                            <div className="text-3xl font-bold text-slate-900">{filteredDebtors.length}</div>
                        </div>
                    </div>

                    {/* FILTER BAR */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Zoek op naam of nummer..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                            {['All', 'New', '1st Reminder', '2nd Reminder', 'Final Notice', 'Paid', 'Cashlist'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                                        filterStatus === status 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {status === 'All' ? 'Alles' : status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Gast</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Bedrag</th>
                                        <th className="px-6 py-4">Reservering</th>
                                        <th className="px-6 py-4">Laatste Actie</th>
                                        <th className="px-6 py-4 text-right">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredDebtors.map(debtor => (
                                        <tr key={debtor.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{debtor.lastName}, {debtor.firstName}</div>
                                                <div className="text-xs text-slate-500">{debtor.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                                    debtor.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                    debtor.status === 'Cashlist' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                    'bg-rose-50 text-rose-700 border-rose-100'
                                                }`}>
                                                    {debtor.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                                € {debtor.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                                #{debtor.reservationNumber}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(debtor.statusDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setWikTarget(debtor)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Genereer WIK Brief"
                                                    >
                                                        <Printer size={16}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => confirmDelete(debtor.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Verwijderen"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredDebtors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                                Geen dossiers gevonden.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* WIK LETTER MODAL */}
            <Modal
                isOpen={!!wikTarget}
                onClose={() => setWikTarget(null)}
                title={`WIK Brief Genereren: ${wikTarget?.lastName}`}
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <Printer className="text-blue-600 mt-0.5" size={20}/>
                        <div className="text-sm text-blue-800">
                            <p className="font-bold">Aanmaning (WIK) Genereren</p>
                            <p>Selecteer de datum van de oorspronkelijke factuur om de brief te genereren.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Factuurdatum</label>
                        <input 
                            type="date"
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            value={wikDateInput}
                            onChange={(e) => setWikDateInput(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Taal</label>
                        <div className="flex gap-2">
                            {['nl', 'en', 'de'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setWikLanguage(lang as any)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                        wikLanguage === lang 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={() => setWikTarget(null)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Annuleren
                        </button>
                        <button 
                            onClick={generateWIKLetter}
                            disabled={!wikDateInput}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Printer size={16}/> Genereren & Printen
                        </button>
                    </div>
                </div>
            </Modal>

            {/* CONFIRMATION MODAL */}
            <Modal
                isOpen={confirmModalState.isOpen}
                onClose={closeConfirmModal}
                title={confirmModalState.title}
            >
                <div className="space-y-4">
                    {confirmModalState.message && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18}/>
                            <p className="text-sm text-red-800">{confirmModalState.message}</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={closeConfirmModal}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50"
                        >
                            Annuleren
                        </button>
                        <button 
                            onClick={() => { confirmModalState.onConfirm && confirmModalState.onConfirm(); }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-red-700"
                        >
                            Verwijderen
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default DebtControlPage;