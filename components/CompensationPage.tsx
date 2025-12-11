


import React, { useState, useEffect, useMemo } from 'react';
import { 
    Scale, Search, Plus, Filter, Euro, AlertCircle, CheckCircle2, 
    FileText, Edit2, Trash2, Save, X, Coffee, BedDouble, Heart, Wrench, HelpCircle, 
    Copy, ChevronDown, ChevronUp, AlertTriangle, MessageSquare, List, History
} from 'lucide-react';
import { Employee, CompensationPolicy, CompensationCategory, CompensationLog } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface CompensationPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const CATEGORY_ICONS: Record<CompensationCategory, React.ElementType> = {
    'Kamer': BedDouble,
    'F&B': Coffee,
    'Wellness': Heart,
    'Service': HelpCircle,
    'Overig': Wrench
};

const CATEGORY_COLORS: Record<CompensationCategory, string> = {
    'Kamer': 'bg-blue-100 text-blue-700',
    'F&B': 'bg-amber-100 text-amber-700',
    'Wellness': 'bg-teal-100 text-teal-700',
    'Service': 'bg-purple-100 text-purple-700',
    'Overig': 'bg-slate-100 text-slate-700'
};

const CompensationPage: React.FC<CompensationPageProps> = ({ currentUser, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'policies' | 'history'>('policies');
    const [policies, setPolicies] = useState<CompensationPolicy[]>([]);
    const [logs, setLogs] = useState<CompensationLog[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CompensationCategory | 'All'>('All');
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

    // Policy Modal State
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Partial<CompensationPolicy> | null>(null);

    // Register Log Modal State
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [newLog, setNewLog] = useState<{
        guestName: string;
        reservationNumber: string;
        policyId: string; // 'custom' or actual ID
        customDetails: string;
        reason: string;
        cost: string;
    }>({
        guestName: '',
        reservationNumber: '',
        policyId: '', 
        customDetails: '',
        reason: '',
        cost: ''
    });

    const canManage = hasPermission(currentUser, 'MANAGE_COMPENSATION');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [polData, logData] = await Promise.all([
                api.getCompensationPolicies(),
                api.getCompensationLogs()
            ]);
            setPolicies(polData);
            setLogs(logData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (e) {
            console.error("Failed to load compensation data", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- POLICY ACTIONS ---

    const handleSavePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPolicy?.complaint || !editingPolicy?.standardCompensation) {
            onShowToast("Vul alle verplichte velden in.");
            return;
        }

        const policy: CompensationPolicy = {
            id: editingPolicy.id || Math.random().toString(36).substr(2, 9),
            category: editingPolicy.category || 'Overig',
            complaint: editingPolicy.complaint,
            standardCompensation: editingPolicy.standardCompensation,
            procedure: editingPolicy.procedure || '',
            maxRefundAmount: editingPolicy.maxRefundAmount,
            authorizedRoles: editingPolicy.authorizedRoles || ['Manager'],
            updatedAt: new Date().toLocaleDateString('nl-NL'),
            updatedBy: currentUser.name
        };

        await api.saveCompensationPolicy(policy);
        
        setPolicies(prev => {
            const index = prev.findIndex(p => p.id === policy.id);
            if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = policy;
                return newArr;
            }
            return [policy, ...prev];
        });

        setIsPolicyModalOpen(false);
        setEditingPolicy(null);
        onShowToast("Beleid succesvol opgeslagen.");
    };

    const handleDeletePolicy = async (id: string) => {
        if (confirm("Weet je zeker dat je deze regel wilt verwijderen?")) {
            await api.deleteCompensationPolicy(id);
            setPolicies(prev => prev.filter(p => p.id !== id));
            onShowToast("Regel verwijderd.");
        }
    };

    // --- LOG ACTIONS ---

    const handleOpenRegister = () => {
        setNewLog({
            guestName: '',
            reservationNumber: '',
            policyId: '',
            customDetails: '',
            reason: '',
            cost: ''
        });
        setIsLogModalOpen(true);
    };

    const handleSaveLog = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newLog.guestName || !newLog.policyId) {
            onShowToast("Vul alle verplichte velden in.");
            return;
        }

        let details = '';
        if (newLog.policyId === 'custom') {
            if (!newLog.customDetails || !newLog.reason) {
                onShowToast("Bij maatwerk zijn details en reden verplicht.");
                return;
            }
            details = newLog.customDetails;
        } else {
            const policy = policies.find(p => p.id === newLog.policyId);
            details = policy ? policy.standardCompensation : 'Onbekend';
        }

        const logEntry: CompensationLog = {
            id: Math.random().toString(36).substr(2, 9),
            guestName: newLog.guestName,
            reservationNumber: newLog.reservationNumber,
            policyId: newLog.policyId === 'custom' ? undefined : newLog.policyId,
            compensationGiven: details,
            reason: newLog.reason,
            cost: newLog.cost ? parseFloat(newLog.cost) : undefined,
            givenBy: currentUser.name,
            givenById: currentUser.id,
            date: new Date().toISOString()
        };

        await api.saveCompensationLog(logEntry);
        setLogs(prev => [logEntry, ...prev]);
        setIsLogModalOpen(false);
        onShowToast("Compensatie geregistreerd.");
    };

    // --- HELPERS ---

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        onShowToast("Gekopieerd naar klembord!");
    };

    const openCreatePolicyModal = () => {
        setEditingPolicy({
            category: 'Kamer',
            complaint: '',
            standardCompensation: '',
            procedure: '',
            authorizedRoles: ['All']
        });
        setIsPolicyModalOpen(true);
    };

    const openEditPolicyModal = (policy: CompensationPolicy) => {
        setEditingPolicy(policy);
        setIsPolicyModalOpen(true);
    };

    const toggleExpand = (id: string) => {
        setExpandedPolicyId(expandedPolicyId === id ? null : id);
    };

    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            const matchesSearch = 
                p.complaint.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.standardCompensation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.procedure.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [policies, searchTerm, selectedCategory]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => 
            l.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.reservationNumber.includes(searchTerm) ||
            l.compensationGiven.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [logs, searchTerm]);

    const totalGivenThisMonth = useMemo(() => {
        const now = new Date();
        return logs
            .filter(l => {
                const d = new Date(l.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((acc, curr) => acc + (curr.cost || 0), 0);
    }, [logs]);

    return (
        <div className="p-6 md:p-10 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Scale className="text-teal-600" size={32} />
                        Compensatie Beheer
                    </h1>
                    <p className="text-slate-500 mt-1">Beleid, registratie en inzicht in coulance.</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleOpenRegister}
                        className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={18} />
                        Registreren
                    </button>
                    {canManage && activeTab === 'policies' && (
                        <button 
                            onClick={openCreatePolicyModal}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            <Plus size={18} />
                            Nieuwe Regel
                        </button>
                    )}
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button 
                    onClick={() => setActiveTab('policies')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'policies' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <List size={18} /> Beleid & Regels
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'history' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <History size={18} /> Uitgegeven Compensaties
                </button>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center sticky top-0 z-10">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={activeTab === 'policies' ? "Zoek op klacht, oplossing..." : "Zoek op gastnaam, reservering..."} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
                {activeTab === 'policies' && (
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                        {['All', 'Kamer', 'F&B', 'Wellness', 'Service', 'Overig'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                                    selectedCategory === cat 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {cat === 'All' ? 'Alles' : cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* POLICY VIEW */}
            {activeTab === 'policies' && (
                <div className="grid grid-cols-1 gap-6">
                    {filteredPolicies.map(policy => {
                        const Icon = CATEGORY_ICONS[policy.category] || HelpCircle;
                        const badgeColor = CATEGORY_COLORS[policy.category] || 'bg-slate-100 text-slate-600';
                        const isExpanded = expandedPolicyId === policy.id;

                        return (
                            <div key={policy.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                <div className="p-6 cursor-pointer" onClick={() => toggleExpand(policy.id)}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`p-3 rounded-xl flex-shrink-0 ${badgeColor}`}>
                                                <Icon size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor.replace('bg-', 'text-').split(' ')[1]}`}>
                                                        {policy.category}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">• Laatst gewijzigd: {policy.updatedAt}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900">{policy.complaint}</h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                            {policy.maxRefundAmount ? (
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Max. Restitutie</div>
                                                    <div className="font-bold text-slate-900 text-lg">€ {policy.maxRefundAmount},-</div>
                                                </div>
                                            ) : (
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Compensatie</div>
                                                    <div className="font-bold text-slate-900 text-sm">Natura / Service</div>
                                                </div>
                                            )}
                                            <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-slate-100' : 'rotate-0'}`}>
                                                <ChevronDown size={20} className="text-slate-400"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
                                        <div className="border-t border-slate-100 pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-5">
                                                <h4 className="font-bold text-teal-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                                    <CheckCircle2 size={16}/> Standaard Oplossing
                                                </h4>
                                                <p className="text-teal-800 text-sm font-medium leading-relaxed">{policy.standardCompensation}</p>
                                            </div>

                                            <div className="relative">
                                                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                                    <FileText size={16}/> Procedure & Script
                                                </h4>
                                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                    {policy.procedure || "Geen specifieke procedure beschreven."}
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(policy.procedure); }}
                                                    className="absolute top-0 right-0 p-2 text-slate-400 hover:text-teal-600 transition-colors"
                                                    title="Kopieer tekst"
                                                >
                                                    <Copy size={16}/>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
                                            <div className="text-xs text-slate-400">
                                                Aangepast door: <strong>{policy.updatedBy}</strong>
                                            </div>
                                            {canManage && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); openEditPolicyModal(policy); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-colors"
                                                    >
                                                        <Edit2 size={14}/> Bewerken
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeletePolicy(policy.id); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors"
                                                    >
                                                        <Trash2 size={14}/> Verwijderen
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredPolicies.length === 0 && !isLoading && (
                        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                            Geen beleidsregels gevonden.
                        </div>
                    )}
                </div>
            )}

            {/* HISTORY VIEW */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Stats */}
                    {canManage && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Totaal Waarde (Deze Maand)</h3>
                                <div className="text-3xl font-bold text-slate-900 mt-1">€ {totalGivenThisMonth.toFixed(2)}</div>
                            </div>
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <Euro size={24} />
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Datum</th>
                                    <th className="px-6 py-4">Gast</th>
                                    <th className="px-6 py-4">Compensatie</th>
                                    <th className="px-6 py-4">Reden</th>
                                    <th className="px-6 py-4">Medewerker</th>
                                    <th className="px-6 py-4 text-right">Waarde</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {new Date(log.date).toLocaleDateString('nl-NL')} <span className="text-xs text-slate-400">{new Date(log.date).toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'})}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{log.guestName}</div>
                                            <div className="text-xs text-slate-500 font-mono">#{log.reservationNumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700">{log.compensationGiven}</div>
                                            {log.policyId && !log.policyId.startsWith('custom') && (
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Volgens beleid</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 italic max-w-xs truncate">
                                            "{log.reason}"
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {log.givenBy}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                                            {log.cost ? `€ ${log.cost.toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                            Geen logs gevonden.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT POLICY MODAL */}
            <Modal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                title={editingPolicy?.id ? "Compensatie Bewerken" : "Nieuwe Compensatie Regel"}
            >
                <form onSubmit={handleSavePolicy} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
                                value={editingPolicy?.category}
                                onChange={e => setEditingPolicy({...editingPolicy, category: e.target.value as any})}
                            >
                                {Object.keys(CATEGORY_ICONS).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Max. Restitutie (€)</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="0.00"
                                value={editingPolicy?.maxRefundAmount || ''}
                                onChange={e => setEditingPolicy({...editingPolicy, maxRefundAmount: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Klacht / Situatie</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="bv. Kamer niet schoon bij aankomst"
                            value={editingPolicy?.complaint || ''}
                            onChange={e => setEditingPolicy({...editingPolicy, complaint: e.target.value})}
                            required
                        />
                    </div>

                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                        <label className="block text-xs font-bold text-teal-800 uppercase mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> Standaard Compensatie</label>
                        <textarea 
                            className="w-full p-3 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                            rows={2}
                            placeholder="bv. Gratis drankje in de bar"
                            value={editingPolicy?.standardCompensation || ''}
                            onChange={e => setEditingPolicy({...editingPolicy, standardCompensation: e.target.value})}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><MessageSquare size={12}/> Procedure / Script</label>
                        <textarea 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            rows={4}
                            placeholder="Beschrijf de stappen voor de medewerker..."
                            value={editingPolicy?.procedure || ''}
                            onChange={e => setEditingPolicy({...editingPolicy, procedure: e.target.value})}
                        />
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                        <Save size={18}/> Opslaan
                    </button>
                </form>
            </Modal>

            {/* REGISTER LOG MODAL */}
            <Modal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                title="Compensatie Registreren"
            >
                <form onSubmit={handleSaveLog} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gast Naam</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                                value={newLog.guestName}
                                onChange={e => setNewLog({...newLog, guestName: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reserveringsnr.</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                value={newLog.reservationNumber}
                                onChange={e => setNewLog({...newLog, reservationNumber: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kies Beleid / Oplossing</label>
                        <select 
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-white mb-3"
                            value={newLog.policyId}
                            onChange={e => setNewLog({...newLog, policyId: e.target.value})}
                            required
                        >
                            <option value="">Selecteer situatie...</option>
                            <option value="custom">-- Maatwerk / Anders --</option>
                            {policies.map(p => (
                                <option key={p.id} value={p.id}>{p.category}: {p.complaint}</option>
                            ))}
                        </select>

                        {newLog.policyId && newLog.policyId !== 'custom' && (
                            <div className="text-sm text-teal-700 bg-teal-50 p-3 rounded border border-teal-100">
                                <strong>Standaard:</strong> {policies.find(p => p.id === newLog.policyId)?.standardCompensation}
                            </div>
                        )}

                        {newLog.policyId === 'custom' && (
                            <textarea 
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                rows={2}
                                placeholder="Wat is er aangeboden?"
                                value={newLog.customDetails}
                                onChange={e => setNewLog({...newLog, customDetails: e.target.value})}
                                required
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reden / Toelichting</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="Waarom is dit gegeven?"
                                value={newLog.reason}
                                onChange={e => setNewLog({...newLog, reason: e.target.value})}
                                required={newLog.policyId === 'custom'}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Waarde (€)</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="0.00"
                                value={newLog.cost}
                                onChange={e => setNewLog({...newLog, cost: e.target.value})}
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold shadow-md hover:bg-teal-700 transition-colors">
                        Registreren
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default CompensationPage;