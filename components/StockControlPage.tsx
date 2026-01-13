
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Package, Search, Plus, Filter, RefreshCw, AlertTriangle, 
    Trash2, Edit2, History, ChevronRight, Save, X, 
    TrendingUp, TrendingDown, LayoutGrid, EyeOff
} from 'lucide-react';
import { Employee, StockItem, StockLog, GlobalSettings } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface StockControlPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    globalSettings: GlobalSettings | null;
    onUpdateGlobalSettings: (settings: GlobalSettings) => void;
}

const DEFAULT_CATEGORIES = ['Office', 'F&B', 'Housekeeping', 'Technische Dienst', 'Linnen', 'Algemeen', 'Overig'];

const StockControlPage: React.FC<StockControlPageProps> = ({ currentUser, onShowToast, globalSettings, onUpdateGlobalSettings }) => {
    const [items, setItems] = useState<StockItem[]>([]);
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'inventory' | 'logs'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Modals
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<StockItem>>({});
    
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionItem, setTransactionItem] = useState<StockItem | null>(null);
    const [transactionType, setTransactionType] = useState<'In' | 'Out'>('Out');
    const [transactionAmount, setTransactionAmount] = useState<string>('');
    const [transactionNote, setTransactionNote] = useState('');

    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [i, l] = await Promise.all([
                api.getStockItems(),
                api.getStockLogs()
            ]);
            setItems(i);
            setLogs(l.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (e) {
            console.error("Error loading stock data", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter categories based on settings
    const visibleCategories = useMemo(() => {
        const hidden = globalSettings?.stock?.hiddenCategories || [];
        // Combine default with any custom categories found in items
        const usedCategories = Array.from(new Set(items.map(i => i.category)));
        const all = Array.from(new Set([...DEFAULT_CATEGORIES, ...usedCategories]));
        return all.filter(c => !hidden.includes(c));
    }, [items, globalSettings]);

    const filteredItems = useMemo(() => {
        return items.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, selectedCategory]);

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem.name || !editingItem.category) return;

        const newItem: StockItem = {
            id: editingItem.id || Math.random().toString(36).substr(2, 9),
            name: editingItem.name,
            category: editingItem.category,
            currentStock: editingItem.currentStock || 0,
            minStock: editingItem.minStock || 0,
            unit: editingItem.unit || 'stuks',
            sourceType: editingItem.sourceType || 'Internal',
            lastUpdated: new Date().toISOString()
        };

        await api.saveStockItem(newItem);
        
        setItems(prev => {
            const index = prev.findIndex(i => i.id === newItem.id);
            if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = newItem;
                return newArr;
            }
            return [...prev, newItem];
        });

        setIsItemModalOpen(false);
        onShowToast(editingItem.id ? "Artikel bijgewerkt." : "Artikel toegevoegd.");
    };

    const handleDeleteItem = async (id: string) => {
        if(confirm("Weet je zeker dat je dit artikel wilt verwijderen?")) {
            await api.deleteStockItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
            onShowToast("Artikel verwijderd.");
        }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionItem || !transactionAmount) return;

        const amount = parseInt(transactionAmount);
        const change = transactionType === 'In' ? amount : -amount;
        const newStock = Math.max(0, transactionItem.currentStock + change);

        const updatedItem = { ...transactionItem, currentStock: newStock, lastUpdated: new Date().toISOString() };
        await api.saveStockItem(updatedItem);

        const log: StockLog = {
            id: Math.random().toString(36).substr(2, 9),
            itemId: transactionItem.id,
            itemName: transactionItem.name,
            change: change,
            type: transactionType === 'In' ? 'Delivery' : 'Usage',
            date: new Date().toISOString(),
            user: currentUser.name,
            notes: transactionNote
        };
        await api.saveStockLog(log);

        setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        setLogs(prev => [log, ...prev]);
        
        setIsTransactionModalOpen(false);
        setTransactionAmount('');
        setTransactionNote('');
        onShowToast("Voorraad bijgewerkt.");
    };

    const executeDeleteCategory = async () => {
        if (!categoryToDelete) return;

        // 1. Move items to 'Algemeen' in local state immediately (Optimistic UI)
        const updatedItems = items.map(i => {
            if (i.category === categoryToDelete) {
                return { ...i, category: 'Algemeen' };
            }
            return i;
        });
        setItems(updatedItems);

        // 2. Perform API calls to save item changes in DB
        const itemsToMove = items.filter(i => i.category === categoryToDelete);
        for (const item of itemsToMove) {
            await api.saveStockItem({ ...item, category: 'Algemeen' });
        }

        // 3. Handle Persistence of the Category Deletion
        // If it's a DEFAULT category, we must explicitly hide it to "delete" it from view
        if (DEFAULT_CATEGORIES.includes(categoryToDelete)) {
            const currentHidden = globalSettings?.stock?.hiddenCategories || [];
            
            if (!currentHidden.includes(categoryToDelete)) {
                const newHidden = [...currentHidden, categoryToDelete];
                
                // Construct a safe settings object, ensuring we don't crash if globalSettings is null
                const newSettings: GlobalSettings = {
                    ...(globalSettings || {
                        modules: {},
                        branding: { loginImages: [] },
                        roles: {}
                    }),
                    stock: {
                        ...(globalSettings?.stock || {}),
                        hiddenCategories: newHidden
                    }
                } as GlobalSettings;

                onUpdateGlobalSettings(newSettings);
            }
        } 
        
        onShowToast(`Categorie '${categoryToDelete}' verwijderd. Artikelen verplaatst naar Algemeen.`);
        setCategoryToDelete(null);
        setSelectedCategory('All');
    };

    const openCreateModal = () => {
        setEditingItem({ category: 'Office', unit: 'stuks', currentStock: 0, minStock: 5 });
        setIsItemModalOpen(true);
    };

    const openEditModal = (item: StockItem) => {
        setEditingItem(item);
        setIsItemModalOpen(true);
    };

    const openTransactionModal = (item: StockItem, type: 'In' | 'Out') => {
        setTransactionItem(item);
        setTransactionType(type);
        setTransactionAmount('');
        setTransactionNote('');
        setIsTransactionModalOpen(true);
    };

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Package className="text-teal-600" size={32} />
                        Voorraadbeheer
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Beheer voorraden en mutaties.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={openCreateModal} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all">
                        <Plus size={18}/> Nieuw Artikel
                    </button>
                </div>
            </div>

            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button onClick={() => setActiveTab('inventory')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <LayoutGrid size={18}/> Voorraadlijst
                </button>
                <button onClick={() => setActiveTab('logs')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <History size={18}/> Mutaties
                </button>
            </div>

            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Zoek artikel..." 
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar max-w-full md:max-w-2xl">
                            <button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${selectedCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                                Alles
                            </button>
                            {visibleCategories.map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedCategory !== 'All' && selectedCategory !== 'Algemeen' && (
                        <div className="flex justify-end">
                            <button onClick={() => setCategoryToDelete(selectedCategory)} className="text-red-500 text-xs font-bold hover:text-red-700 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors">
                                <Trash2 size={12}/> Categorie verwijderen
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Artikel</th>
                                    <th className="px-6 py-4">Categorie</th>
                                    <th className="px-6 py-4">Voorraad</th>
                                    <th className="px-6 py-4">Min. Voorraad</th>
                                    <th className="px-6 py-4 text-right">Acties</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 group">
                                        <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                                        <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">{item.category}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${item.currentStock <= item.minStock ? 'text-red-600' : 'text-slate-900'}`}>{item.currentStock} {item.unit}</span>
                                                {item.currentStock <= item.minStock && <AlertTriangle size={14} className="text-red-500" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{item.minStock} {item.unit}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openTransactionModal(item, 'In')} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Bijboeken"><Plus size={16}/></button>
                                                <button onClick={() => openTransactionModal(item, 'Out')} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Afboeken"><TrendingDown size={16}/></button>
                                                <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Geen artikelen gevonden.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Datum</th>
                                <th className="px-6 py-4">Artikel</th>
                                <th className="px-6 py-4">Mutatie</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Door</th>
                                <th className="px-6 py-4">Notitie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{new Date(log.date).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{log.itemName}</td>
                                    <td className={`px-6 py-4 font-bold ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {log.change > 0 ? `+${log.change}` : log.change}
                                    </td>
                                    <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600">{log.type}</span></td>
                                    <td className="px-6 py-4 text-slate-600">{log.user}</td>
                                    <td className="px-6 py-4 text-slate-500 italic">{log.notes || '-'}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nog geen mutaties.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ITEM MODAL */}
            <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem.id ? "Artikel Bewerken" : "Nieuw Artikel"}>
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Naam</label>
                        <input className="w-full p-3 border rounded-xl" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required placeholder="Artikelnaam..."/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                            <input list="category-list" className="w-full p-3 border rounded-xl" value={editingItem.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} required placeholder="Selecteer of typ..."/>
                            <datalist id="category-list">
                                {visibleCategories.map(c => <option key={c} value={c}/>)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eenheid</label>
                            <input className="w-full p-3 border rounded-xl" value={editingItem.unit || ''} onChange={e => setEditingItem({...editingItem, unit: e.target.value})} placeholder="stuks, doos, kg..."/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Huidige Voorraad</label>
                            <input type="number" className="w-full p-3 border rounded-xl" value={editingItem.currentStock} onChange={e => setEditingItem({...editingItem, currentStock: parseInt(e.target.value)})} required/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Min. Voorraad</label>
                            <input type="number" className="w-full p-3 border rounded-xl" value={editingItem.minStock} onChange={e => setEditingItem({...editingItem, minStock: parseInt(e.target.value)})} required/>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800">Opslaan</button>
                </form>
            </Modal>

            {/* TRANSACTION MODAL */}
            <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title={transactionType === 'In' ? 'Voorraad Bijboeken' : 'Voorraad Afboeken'}>
                <form onSubmit={handleTransaction} className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                        <div className="text-sm font-bold text-slate-900">{transactionItem?.name}</div>
                        <div className="text-xs text-slate-500">Huidig: {transactionItem?.currentStock} {transactionItem?.unit}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aantal</label>
                        <input type="number" min="1" className="w-full p-3 border rounded-xl font-bold" value={transactionAmount} onChange={e => setTransactionAmount(e.target.value)} autoFocus required/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notitie (Optioneel)</label>
                        <input className="w-full p-3 border rounded-xl" value={transactionNote} onChange={e => setTransactionNote(e.target.value)} placeholder="Reden..."/>
                    </div>
                    <button type="submit" className={`w-full py-3 text-white font-bold rounded-xl shadow-lg ${transactionType === 'In' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                        {transactionType === 'In' ? 'Bijboeken' : 'Afboeken'}
                    </button>
                </form>
            </Modal>

            {/* DELETE CATEGORY CONFIRMATION */}
            <Modal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} title="Categorie Verwijderen">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                        <AlertTriangle className="text-red-600 shrink-0" size={20}/>
                        <p className="text-sm text-red-800">
                            Weet je zeker dat je de categorie <strong>{categoryToDelete}</strong> wilt verwijderen? 
                            Alle artikelen in deze categorie worden verplaatst naar de categorie <strong>'Algemeen'</strong>.
                        </p>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setCategoryToDelete(null)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-bold text-sm">Annuleren</button>
                        <button onClick={executeDeleteCategory} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm">Verwijderen & Verplaatsen</button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default StockControlPage;
