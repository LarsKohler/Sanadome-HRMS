
import React, { useState, useEffect, useMemo } from 'react';
import { 
    BookOpen, Search, Plus, Filter, Tag, Clock, User, ChevronRight, 
    Edit2, Trash2, ArrowLeft, Save, Layout, Shield, Check, Info
} from 'lucide-react';
import { Employee, KnowledgeArticle } from '../types';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';

interface KnowledgeBasePageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ currentUser, onShowToast }) => {
    const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
    const [view, setView] = useState<'list' | 'read' | 'edit'>('list');
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    
    // Editor State
    const [editForm, setEditForm] = useState<Partial<KnowledgeArticle>>({});
    
    const canManage = hasPermission(currentUser, 'MANAGE_KNOWLEDGE');

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        try {
            const data = await api.getKnowledgeArticles();
            setArticles(data);
        } catch (e) {
            console.error("Failed to load KB articles", e);
        }
    };

    // Filter Logic: Search + Category + Visibility Permissions
    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            // 1. Search Check
            const matchesSearch = 
                article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                article.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

            // 2. Category Check
            const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;

            // 3. Permission Check (Crucial!)
            // Manager/Senior with permission sees everything? Or should they see only what applies to them?
            // Usually editors see everything.
            if (canManage) return matchesSearch && matchesCategory;

            // Regular user check
            const roleMatch = article.allowedRoles.includes('All') || article.allowedRoles.includes(currentUser.role);
            const deptMatch = article.allowedDepartments.includes('All') || currentUser.departments.some(d => article.allowedDepartments.includes(d));
            
            return matchesSearch && matchesCategory && (roleMatch || deptMatch); // OR logic typically better here? Or AND? 
            // "Visible to Managers AND Front Office" usually means intersection.
            // But typically access control lists are "Allow if in Role OR in Dept". Let's stick to OR for flexibility.
            // If an article is allowed for "Front Office", any Front Office employee sees it.
        });
    }, [articles, searchTerm, selectedCategory, currentUser, canManage]);

    const categories = useMemo(() => {
        const cats = new Set(articles.map(a => a.category));
        return ['All', ...Array.from(cats)];
    }, [articles]);

    const handleOpenArticle = (article: KnowledgeArticle) => {
        // Increment view count logic could go here
        setSelectedArticle(article);
        setView('read');
    };

    const handleCreateNew = () => {
        setEditForm({
            title: '',
            category: 'Algemeen',
            content: '',
            tags: [],
            allowedRoles: ['All'],
            allowedDepartments: ['All'],
            isPinned: false
        });
        setSelectedArticle(null);
        setView('edit');
    };

    const handleEditArticle = (article: KnowledgeArticle) => {
        setEditForm({ ...article });
        setSelectedArticle(article);
        setView('edit');
    };

    const handleDeleteArticle = async (id: string) => {
        if (confirm("Weet je zeker dat je dit artikel wilt verwijderen?")) {
            await api.deleteKnowledgeArticle(id);
            setArticles(prev => prev.filter(a => a.id !== id));
            if (view === 'read') setView('list');
            onShowToast("Artikel verwijderd.");
        }
    };

    const handleSave = async () => {
        if (!editForm.title || !editForm.content) {
            alert("Titel en inhoud zijn verplicht.");
            return;
        }

        const article: KnowledgeArticle = {
            id: editForm.id || Math.random().toString(36).substr(2, 9),
            title: editForm.title!,
            category: editForm.category || 'Algemeen',
            content: editForm.content!,
            tags: editForm.tags || [],
            authorName: editForm.authorName || currentUser.name,
            authorRole: editForm.authorRole || currentUser.role,
            lastUpdated: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
            allowedRoles: editForm.allowedRoles || ['All'],
            allowedDepartments: editForm.allowedDepartments || ['All'],
            views: editForm.views || 0,
            isPinned: editForm.isPinned || false
        };

        await api.saveKnowledgeArticle(article);
        
        // Refresh local list
        const exists = articles.find(a => a.id === article.id);
        if (exists) {
            setArticles(prev => prev.map(a => a.id === article.id ? article : a));
        } else {
            setArticles(prev => [article, ...prev]);
        }

        setView('list');
        onShowToast("Artikel opgeslagen!");
    };

    // Helper for checkbox lists in editor
    const toggleArrayItem = (field: 'allowedRoles' | 'allowedDepartments', value: string) => {
        const current = editForm[field] || [];
        let updated;
        
        if (value === 'All') {
            // If clicking All, toggle it. If turning On, clear others? Or just set to ['All']?
            // Simple logic: if 'All' is present, it overrides everything.
            updated = current.includes('All') ? [] : ['All'];
        } else {
            // If clicking specific item, remove 'All' if present
            let temp = current.filter(i => i !== 'All');
            if (temp.includes(value)) {
                updated = temp.filter(i => i !== value);
            } else {
                updated = [...temp, value];
            }
        }
        setEditForm({ ...editForm, [field]: updated });
    };

    // --- RENDER VIEWS ---

    if (view === 'edit') {
        return (
            <div className="p-4 md:p-8 w-full max-w-[1200px] mx-auto animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm">
                        <ArrowLeft size={18}/> Annuleren
                    </button>
                    <h2 className="text-2xl font-bold text-slate-900">{editForm.id ? 'Artikel Bewerken' : 'Nieuw Artikel'}</h2>
                    <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
                        <Save size={18}/> Opslaan
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Titel</label>
                            <input 
                                type="text" 
                                className="w-full text-xl font-bold border-b-2 border-slate-100 py-2 focus:outline-none focus:border-teal-500 transition-colors"
                                placeholder="Titel van het protocol..."
                                value={editForm.title}
                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                            />
                            
                            <div className="mt-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inhoud</label>
                                <textarea 
                                    className="w-full h-96 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700 leading-relaxed resize-none"
                                    placeholder="Schrijf hier de uitleg..."
                                    value={editForm.content}
                                    onChange={e => setEditForm({...editForm, content: e.target.value})}
                                />
                                <p className="text-xs text-slate-400 mt-2 text-right">Markdown ondersteuning (basis)</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Settings */}
                    <div className="space-y-6">
                        
                        {/* Meta */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Layout size={18} className="text-teal-600"/> Metadata
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categorie</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                                        placeholder="bv. Front Office"
                                        value={editForm.category}
                                        onChange={e => setEditForm({...editForm, category: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags (komma gescheiden)</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                                        placeholder="bv. kassa, geld, veiligheid"
                                        value={editForm.tags?.join(', ')}
                                        onChange={e => setEditForm({...editForm, tags: e.target.value.split(',').map(t => t.trim())})}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox" 
                                        id="pinned"
                                        checked={editForm.isPinned}
                                        onChange={e => setEditForm({...editForm, isPinned: e.target.checked})}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <label htmlFor="pinned" className="text-sm font-bold text-slate-700">Vastzetten als belangrijk</label>
                                </div>
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Shield size={18} className="text-teal-600"/> Zichtbaarheid
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rollen</label>
                                    <div className="space-y-2">
                                        {['All', 'Manager', 'Senior Medewerker', 'Medewerker'].map(role => (
                                            <label key={role} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={editForm.allowedRoles?.includes(role)}
                                                    onChange={() => toggleArrayItem('allowedRoles', role)}
                                                    className="rounded text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-slate-700">{role === 'All' ? 'Iedereen' : role}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 mt-2">Afdelingen</label>
                                    <div className="space-y-2">
                                        {['All', 'Front Office', 'Reserveringen', 'F&B', 'Management', 'Huishouding'].map(dept => (
                                            <label key={dept} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={editForm.allowedDepartments?.includes(dept)}
                                                    onChange={() => toggleArrayItem('allowedDepartments', dept)}
                                                    className="rounded text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-slate-700">{dept === 'All' ? 'Alle Afdelingen' : dept}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    if (view === 'read' && selectedArticle) {
        return (
            <div className="p-4 md:p-8 w-full max-w-[1000px] mx-auto animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition-colors">
                        <ArrowLeft size={18}/> Terug naar Kennisbank
                    </button>
                    {canManage && (
                        <div className="flex gap-2">
                            <button onClick={() => handleEditArticle(selectedArticle)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 transition-colors">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDeleteArticle(selectedArticle.id)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-red-600 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider rounded-full border border-teal-100">
                                {selectedArticle.category}
                            </span>
                            {selectedArticle.isPinned && (
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-100 flex items-center gap-1">
                                    <Tag size={12}/> Belangrijk
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">{selectedArticle.title}</h1>
                        
                        <div className="flex flex-wrap gap-6 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <User size={16} />
                                <span className="font-medium text-slate-700">{selectedArticle.authorName}</span>
                                <span className="opacity-50">({selectedArticle.authorRole})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                <span>Laatst gewijzigd: {selectedArticle.lastUpdated}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 text-slate-700 leading-relaxed text-lg whitespace-pre-wrap">
                        {selectedArticle.content}
                    </div>

                    <div className="bg-slate-50 p-8 border-t border-slate-100">
                        <h4 className="font-bold text-slate-900 text-sm uppercase mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedArticle.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: List View (Dashboard)
    return (
        <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <BookOpen className="text-teal-600" size={32} />
                        Kennisbank
                    </h1>
                    <p className="text-slate-500 mt-1">Slimme protocollen, handleidingen en uitleg.</p>
                </div>
                {canManage && (
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={18} />
                        Nieuw Artikel
                    </button>
                )}
            </div>

            {/* Search Hero */}
            <div className="relative mb-10 group">
                <div className="absolute inset-0 bg-teal-500/5 rounded-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center">
                    <Search className="ml-4 text-slate-400" size={24} />
                    <input 
                        type="text" 
                        placeholder="Waar ben je naar op zoek? (bv. 'Kassa afsluiten', 'Brand', 'VIP')"
                        className="w-full p-4 text-lg outline-none text-slate-700 placeholder:text-slate-400 font-medium bg-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Categories & Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Categories */}
                <div className="lg:col-span-1 space-y-2">
                    <h3 className="font-bold text-slate-900 px-2 mb-2 flex items-center gap-2"><Filter size={16}/> Categorieën</h3>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-between items-center ${
                                selectedCategory === cat 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                            }`}
                        >
                            {cat}
                            {selectedCategory === cat && <Check size={16} />}
                        </button>
                    ))}
                </div>

                {/* Articles Grid */}
                <div className="lg:col-span-3">
                    {filteredArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredArticles.map(article => (
                                <div 
                                    key={article.id} 
                                    onClick={() => handleOpenArticle(article)}
                                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer group flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-lg group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                            {article.category}
                                        </span>
                                        {article.isPinned && <Tag size={16} className="text-amber-500 fill-amber-500" />}
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors line-clamp-2">
                                        {article.title}
                                    </h3>
                                    
                                    <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1">
                                        {article.content}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-xs text-slate-400 font-medium">
                                        <span>{article.lastUpdated}</span>
                                        <div className="flex items-center gap-1 group-hover:text-teal-600 transition-colors">
                                            Lezen <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                            <Info size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="font-bold text-slate-900 text-lg">Geen artikelen gevonden</h3>
                            <p className="text-slate-500 text-sm mt-1">Probeer een andere zoekterm of categorie.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBasePage;
