

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Scale, Search, Plus, Filter, Euro, AlertCircle, CheckCircle2, 
    FileText, Edit2, Trash2, Save, X, Coffee, BedDouble, Heart, Wrench, HelpCircle
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
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Partial<CompensationPolicy> | null>(null);

    const canManage = hasPermission(currentUser, 'MANAGE_COMPENSATION');

    useEffect(() => {
        loadPolicies();
    }, []);

    const loadPolicies = async () => {
        try {
            const data = await api.getCompensationPolicies();
            setPolicies(data);
        } catch (e) {
            console.error("Failed to load compensation policies", e);
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
        onShowToast("Beleid opgeslagen.");
    };

    const handleDelete = async (id: string) => {
        if (confirm("Weet je zeker dat je deze regel wilt verwijderen?")) {
            await api.deleteCompensationPolicy(id);
            setPolicies(prev => prev.filter(p => p.id !== id));
            onShowToast("Regel verwijderd.");
        }
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

    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            const matchesSearch = 
                p.complaint.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.standardCompensation.toLowerCase().includes(searchTerm.toLowerCase());
            
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
                    <p className="text-slate-500 mt-1">Richtlijnen voor klachtenafhandeling en restituties.</p>
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Zoek op klacht of oplossing..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPolicies.map(policy => {
                    const Icon = CATEGORY_ICONS[policy.category] || HelpCircle;
                    const badgeColor = CATEGORY_COLORS[policy.category] || 'bg-slate-100 text-slate-600';

                    return (
                        <div key={policy.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 group">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${badgeColor}`}>
                                    <Icon size={14} /> {policy.category}
                                </span>
                                {canManage && (
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(policy)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(policy.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">{policy.complaint}</h3>
                            
                            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 mb-4">
                                <div className="text-xs font-bold text-teal-800 uppercase mb-1 flex items-center gap-1">
                                    <CheckCircle2 size={12}/> Standaard Compensatie
                                </div>
                                <p className="text-sm text-teal-900 font-medium">{policy.standardCompensation}</p>
                            </div>

                            <div className="space-y-3 text-sm text-slate-600">
                                {policy.procedure && (
                                    <div>
                                        <span className="font-bold text-slate-900 block text-xs uppercase mb-1">Procedure</span>
                                        <p>{policy.procedure}</p>
                                    </div>
                                )}
                                <div className="flex items-center gap-6 pt-2 border-t border-slate-100 mt-4">
                                    {policy.maxRefundAmount && (
                                        <div className="flex items-center gap-2 font-bold text-slate-900">
                                            <div className="p-1.5 bg-slate-100 rounded-md text-slate-500"><Euro size={14}/></div>
                                            Max. €{policy.maxRefundAmount}
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-400 ml-auto">
                                        Update: {policy.updatedBy} ({policy.updatedAt})
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredPolicies.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Scale size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="font-bold text-slate-900 text-lg">Geen regels gevonden</h3>
                    <p className="text-slate-500 text-sm mt-1">Probeer een andere zoekterm.</p>
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

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Standaard Compensatie</label>
                        <textarea 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-teal-50/30 border-teal-100"
                            rows={2}
                            placeholder="bv. Gratis drankje in de bar"
                            value={editingPolicy?.standardCompensation || ''}
                            onChange={e => setEditingPolicy({...editingPolicy, standardCompensation: e.target.value})}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Procedure / Instructies</label>
                        <textarea 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            rows={3}
                            placeholder="Stappenplan voor de medewerker..."
                            value={editingPolicy?.procedure || ''}
                            onChange={e => setEditingPolicy({...editingPolicy, procedure: e.target.value})}
                        />
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