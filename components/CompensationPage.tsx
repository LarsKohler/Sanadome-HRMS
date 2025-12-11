
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Scale, Search, Plus, Filter, Euro, AlertCircle, CheckCircle2, 
    FileText, Edit2, Trash2, Save, X, Coffee, BedDouble, Heart, Wrench, HelpCircle, 
    Copy, ChevronDown, ChevronUp, AlertTriangle, MessageSquare
} from 'lucide-react';
import { Employee, CompensationPolicy, CompensationCategory } from '../types';
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
    const [policies, setPolicies] = useState<CompensationPolicy[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CompensationCategory | 'All'>('All');
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Partial<CompensationPolicy> | null>(null);

    const canManage = hasPermission(currentUser, 'MANAGE_COMPENSATION');

    useEffect(() => {
        loadPolicies();
    }, []);

    const loadPolicies = async () => {
        setIsLoading(true);
        try {
            const data = await api.getCompensationPolicies();
            setPolicies(data);
        } catch (e) {
            console.error("Failed to load compensation policies", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
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
        
        // Optimistic update
        setPolicies(prev => {
            const index = prev.findIndex(p => p.id === policy.id);
            if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = policy;
                return newArr;
            }
            return [policy, ...prev];
        });

        setIsModalOpen(false);
        setEditingPolicy(null);
        onShowToast("Beleid succesvol opgeslagen.");
    };

    const handleDelete = async (id: string) => {
        if (confirm("Weet je zeker dat je deze regel wilt verwijderen?")) {
            await api.deleteCompensationPolicy(id);
            setPolicies(prev => prev.filter(p => p.id !== id));
            onShowToast("Regel verwijderd.");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        onShowToast("Gekopieerd naar klembord!");
    };

    const openCreateModal = () => {
        setEditingPolicy({
            category: 'Kamer',
            complaint: '',
            standardCompensation: '',
            procedure: '',
            authorizedRoles: ['All']
        });
        setIsModalOpen(true);
    };

    const openEditModal = (policy: CompensationPolicy) => {
        setEditingPolicy(policy);
        setIsModalOpen(true);
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

    return (
        <div className="p-6 md:p-10 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Scale className="text-teal-600" size={32} />
                        Compensatie Register
                    </h1>
                    <p className="text-slate-500 mt-1">Slimme richtlijnen voor klachtenafhandeling en restituties.</p>
                </div>
                
                {canManage && (
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={18} />
                        Nieuwe Regel
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center sticky top-0 z-10">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Zoek op klacht, oplossing of trefwoord..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
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
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 gap-6">
                {filteredPolicies.map(policy => {
                    const Icon = CATEGORY_ICONS[policy.category] || HelpCircle;
                    const badgeColor = CATEGORY_COLORS[policy.category] || 'bg-slate-100 text-slate-600';
                    const isExpanded = expandedPolicyId === policy.id;

                    return (
                        <div key={policy.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            {/* Card Header (Click to expand) */}
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

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
                                    <div className="border-t border-slate-100 pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        
                                        {/* Standard Solution */}
                                        <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-5">
                                            <h4 className="font-bold text-teal-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <CheckCircle2 size={16}/> Standaard Oplossing
                                            </h4>
                                            <p className="text-teal-800 text-sm font-medium leading-relaxed">{policy.standardCompensation}</p>
                                        </div>

                                        {/* Procedure */}
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

                                    {/* Footer Actions */}
                                    <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
                                        <div className="text-xs text-slate-400">
                                            Aangepast door: <strong>{policy.updatedBy}</strong>
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(policy); }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-colors"
                                                >
                                                    <Edit2 size={14}/> Bewerken
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(policy.id); }}
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
            </div>

            {filteredPolicies.length === 0 && !isLoading && (
                <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Scale size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                    <h3 className="font-bold text-slate-900 text-lg">Geen regels gevonden</h3>
                    <p className="text-slate-500 text-sm mt-1">Er zijn nog geen policies die voldoen aan je zoekopdracht.</p>
                    {canManage && (
                        <button onClick={openCreateModal} className="mt-6 text-teal-600 font-bold hover:underline">
                            Nieuwe regel toevoegen
                        </button>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="text-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Beleid laden...</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPolicy?.id ? "Compensatie Bewerken" : "Nieuwe Compensatie Regel"}
            >
                <form onSubmit={handleSave} className="space-y-6">
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
                        <p className="text-[10px] text-slate-400 mt-1">Dit veld kan eenvoudig gekopieerd worden door de medewerker.</p>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                        <Save size={18}/> Opslaan
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default CompensationPage;
