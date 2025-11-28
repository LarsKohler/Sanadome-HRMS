
import React, { useState, useEffect } from 'react';
import { 
    Medal, Plus, Search, Trash2, Award, Check, User, Calendar, 
    Trophy, Star, Heart, Zap, Shield, Rocket, Crown, ThumbsUp, Lightbulb, Flame, Target, Users, Eye,
    LayoutGrid, List, X
} from 'lucide-react';
import { Employee, BadgeDefinition, AssignedBadge, BadgeIconKey, BadgeColor } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface BadgeManagerProps {
    currentUser: Employee;
    employees: Employee[];
    onUpdateEmployee: (employee: Employee) => void;
    onShowToast: (message: string) => void;
}

const BADGE_ICONS: Record<BadgeIconKey, React.ElementType> = {
    'Trophy': Trophy,
    'Star': Star,
    'Medal': Medal,
    'Heart': Heart,
    'Zap': Zap,
    'Shield': Shield,
    'Rocket': Rocket,
    'Crown': Crown,
    'ThumbsUp': ThumbsUp,
    'Lightbulb': Lightbulb,
    'Flame': Flame,
    'Target': Target,
    'Users': Users,
    'Eye': Eye
};

const BADGE_COLORS: Record<BadgeColor, string> = {
    'yellow': 'bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200',
    'blue': 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200',
    'purple': 'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-200',
    'red': 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
    'green': 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200',
    'pink': 'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200',
    'orange': 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200',
    'slate': 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
};

const BadgeManager: React.FC<BadgeManagerProps> = ({ currentUser, employees, onUpdateEmployee, onShowToast }) => {
    const [badges, setBadges] = useState<BadgeDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'library' | 'assignments'>('library');
    
    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    
    // Form States
    const [newBadge, setNewBadge] = useState<Partial<BadgeDefinition>>({ icon: 'Star', color: 'yellow' });
    const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
    const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadBadges();
    }, []);

    const loadBadges = async () => {
        setIsLoading(true);
        try {
            const data = await api.getBadges();
            setBadges(data);
        } catch (e) {
            console.error("Failed to load badges", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBadge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBadge.name || !newBadge.description) return;

        const badge: BadgeDefinition = {
            id: Math.random().toString(36).substr(2, 9),
            name: newBadge.name,
            description: newBadge.description,
            icon: newBadge.icon as BadgeIconKey,
            color: newBadge.color as BadgeColor,
            createdAt: new Date().toLocaleDateString('nl-NL')
        };

        await api.saveBadge(badge);
        setBadges([...badges, badge]);
        setIsCreateModalOpen(false);
        setNewBadge({ icon: 'Star', color: 'yellow', name: '', description: '' });
        onShowToast('Nieuwe badge aangemaakt!');
    };

    const handleDeleteBadge = async (id: string) => {
        if (confirm('Weet je zeker dat je deze badge definitief wilt verwijderen uit het systeem?')) {
            await api.deleteBadge(id);
            setBadges(badges.filter(b => b.id !== id));
            onShowToast('Badge definitie verwijderd.');
        }
    };

    const handleAssignBadge = async () => {
        if (!selectedBadgeId || !targetEmployeeId) return;
        
        const targetEmployee = employees.find(e => e.id === targetEmployeeId);
        if (!targetEmployee) return;

        // Check if already assigned
        if (targetEmployee.badges?.some(b => b.badgeId === selectedBadgeId)) {
            onShowToast('Deze medewerker heeft deze badge al.');
            return;
        }

        const assignedBadge: AssignedBadge = {
            id: Math.random().toString(36).substr(2, 9),
            badgeId: selectedBadgeId,
            assignedBy: currentUser.name,
            assignedById: currentUser.id,
            assignedAt: new Date().toLocaleDateString('nl-NL')
        };

        const updatedEmployee = {
            ...targetEmployee,
            badges: [...(targetEmployee.badges || []), assignedBadge]
        };

        onUpdateEmployee(updatedEmployee);
        await api.saveEmployee(updatedEmployee);
        
        setIsAssignModalOpen(false);
        setTargetEmployeeId('');
        onShowToast(`Badge uitgereikt aan ${targetEmployee.name}!`);
    };

    const handleRevokeBadge = async (employeeId: string, assignedBadgeId: string) => {
        if(!confirm("Weet je zeker dat je deze badge wilt intrekken bij de medewerker?")) return;

        const targetEmployee = employees.find(e => e.id === employeeId);
        if (!targetEmployee) return;

        const updatedBadges = targetEmployee.badges?.filter(b => b.id !== assignedBadgeId) || [];
        const updatedEmployee = { ...targetEmployee, badges: updatedBadges };

        onUpdateEmployee(updatedEmployee);
        await api.saveEmployee(updatedEmployee);
        onShowToast("Badge succesvol ingetrokken.");
    };

    const openAssignModal = (badgeId: string) => {
        setSelectedBadgeId(badgeId);
        setIsAssignModalOpen(true);
    };

    const filteredEmployees = employees.filter(e => e.id !== currentUser.id && e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Employees who have badges (for overview tab)
    const employeesWithBadges = employees.filter(e => e.badges && e.badges.length > 0 && e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Medal className="text-teal-600" size={32} />
                        Badges & Waardering
                    </h1>
                    <p className="text-slate-500 mt-1">Beheer en reik waarderingsbadges uit aan het team.</p>
                </div>
                
                {activeTab === 'library' && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={18} />
                        Nieuwe Badge
                    </button>
                )}
            </div>

            {/* TABS */}
            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'library' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <LayoutGrid size={18} /> Badge Bibliotheek
                </button>
                <button 
                    onClick={() => setActiveTab('assignments')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'assignments' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <List size={18} /> Toewijzingen ({employeesWithBadges.length})
                </button>
            </div>

            {/* LIBRARY TAB */}
            {activeTab === 'library' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {badges.map(badge => {
                        const Icon = BADGE_ICONS[badge.icon];
                        return (
                            <div key={badge.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center group hover:shadow-md transition-shadow">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 border-2 ${BADGE_COLORS[badge.color]}`}>
                                    <Icon size={32} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-1">{badge.name}</h3>
                                <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[2.5rem]">{badge.description}</p>
                                
                                <div className="mt-auto w-full grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => openAssignModal(badge.id)}
                                        className="py-2 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Award size={14} /> Uitreiken
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteBadge(badge.id)}
                                        className="py-2 px-4 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} /> Verwijder
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {badges.length === 0 && !isLoading && (
                        <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                            <Medal size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Nog geen badges aangemaakt.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === 'assignments' && (
                <div className="space-y-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Zoek medewerker..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {employeesWithBadges.map(emp => (
                            <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full border border-slate-100" />
                                    <div>
                                        <h3 className="font-bold text-slate-900">{emp.name}</h3>
                                        <p className="text-xs text-slate-500">{emp.role}</p>
                                    </div>
                                    <span className="ml-auto bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                                        {emp.badges?.length || 0}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {emp.badges?.map(assigned => {
                                        const def = badges.find(b => b.id === assigned.badgeId);
                                        if(!def) return null;
                                        const Icon = BADGE_ICONS[def.icon];

                                        return (
                                            <div key={assigned.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 group">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${BADGE_COLORS[def.color]}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 truncate">{def.name}</div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {assigned.assignedAt} • {assigned.assignedBy}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRevokeBadge(emp.id, assigned.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Badge intrekken"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {employeesWithBadges.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                                <Award size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Geen medewerkers met badges gevonden.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CREATE BADGE MODAL */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Nieuwe Badge Ontwerpen"
            >
                <form onSubmit={handleCreateBadge} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Naam</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                            placeholder="bv. Klantheld"
                            value={newBadge.name}
                            onChange={(e) => setNewBadge({...newBadge, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Beschrijving</label>
                        <textarea 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            placeholder="Waarvoor wordt deze badge uitgereikt?"
                            rows={2}
                            value={newBadge.description}
                            onChange={(e) => setNewBadge({...newBadge, description: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Kies Icoon</label>
                        <div className="grid grid-cols-6 gap-2">
                            {(Object.keys(BADGE_ICONS) as BadgeIconKey[]).map(iconKey => {
                                const Icon = BADGE_ICONS[iconKey];
                                return (
                                    <button
                                        type="button"
                                        key={iconKey}
                                        onClick={() => setNewBadge({...newBadge, icon: iconKey})}
                                        className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                                            newBadge.icon === iconKey 
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-110' 
                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Kies Kleur</label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(BADGE_COLORS) as BadgeColor[]).map(color => (
                                <button
                                    type="button"
                                    key={color}
                                    onClick={() => setNewBadge({...newBadge, color})}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                                        newBadge.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                                    } ${color === 'yellow' ? 'bg-yellow-400 border-yellow-500' : 
                                       color === 'blue' ? 'bg-blue-400 border-blue-500' :
                                       color === 'purple' ? 'bg-purple-400 border-purple-500' :
                                       color === 'red' ? 'bg-red-400 border-red-500' :
                                       color === 'green' ? 'bg-green-400 border-green-500' :
                                       color === 'pink' ? 'bg-pink-400 border-pink-500' :
                                       color === 'orange' ? 'bg-orange-400 border-orange-500' :
                                       'bg-slate-400 border-slate-500'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors">
                        Badge Aanmaken
                    </button>
                </form>
            </Modal>

            {/* ASSIGN BADGE MODAL */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => { setIsAssignModalOpen(false); setTargetEmployeeId(''); }}
                title="Badge Uitreiken"
            >
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                        {selectedBadgeId && (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${BADGE_COLORS[badges.find(b => b.id === selectedBadgeId)?.color || 'slate']}`}>
                                {React.createElement(BADGE_ICONS[badges.find(b => b.id === selectedBadgeId)?.icon || 'Star'], { size: 24 })}
                            </div>
                        )}
                        <div>
                            <div className="font-bold text-slate-900">{badges.find(b => b.id === selectedBadgeId)?.name}</div>
                            <div className="text-xs text-slate-500">Wordt uitgereikt door: {currentUser.name}</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Zoek Collega</label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder="Naam..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {filteredEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setTargetEmployeeId(emp.id)}
                                    className={`w-full text-left p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${targetEmployeeId === emp.id ? 'bg-teal-50 text-teal-900' : ''}`}
                                >
                                    <img src={emp.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="Avatar"/>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold">{emp.name}</div>
                                        <div className="text-xs opacity-60">{emp.role}</div>
                                    </div>
                                    {targetEmployeeId === emp.id && <Check size={16} className="text-teal-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleAssignBadge}
                        disabled={!targetEmployeeId}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Uitreiken
                    </button>
                </div>
            </Modal>

        </div>
    );
};

export default BadgeManager;
