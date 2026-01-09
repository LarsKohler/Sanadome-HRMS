
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Package, Search, Plus, Filter, AlertTriangle, RefreshCw, 
    ArrowUpRight, ArrowDownRight, Edit2, Trash2, Save, X, 
    History, TrendingUp, TrendingDown, ClipboardList, ShoppingCart, Box, Tag
} from 'lucide-react';
import { Employee, StockItem, StockLog, StockTransactionType } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface StockControlPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const StockControlPage: React.FC<StockControlPageProps> = ({ currentUser, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'incoming' | 'logs'>('inventory');
    const [items, setItems] = useState<StockItem[]>([]);
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Modals
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<StockItem>>({});
    
    // Quick Count Modal
    const [isCountModalOpen, setIsCountModalOpen] = useState(false);
    const [countTarget, setCountTarget] = useState<StockItem | null>(null);
    const [countValue, setCountValue] = useState(''); // String to handle empty input

    // Cart for Incoming (Delivery)
    const [cart, setCart] = useState<Record<string, number>>({}); 

    const canManage = hasPermission(currentUser, 'MANAGE_STOCK');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [i, l] = await Promise.all([
            api.getStockItems(),
            api.getStockLogs()
        ]);
        setItems(i.sort((a,b) => a.name.localeCompare(b.name)));
        setLogs(l.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
    };

    const categories = useMemo(() => ['All', ...Array.from(new Set(items.map(i => i.category)))], [items]);

    const filteredItems = useMemo(() => {
        return items.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || i.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, categoryFilter]);

    // --- ITEM ACTIONS ---

    const handleOpenCreate = () => {
        setEditingItem({
            id: crypto.randomUUID(),
            name: '',
            category: 'Algemeen',
            currentStock: 0,
            minStock: 5,
            unit: 'Stuks',
            lastUpdated: new Date().toISOString()
        });
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: StockItem) => {
        setEditingItem(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = async (id: string) => {
        if (confirm("Weet je zeker dat je dit artikel wilt verwijderen?")) {
            await api.deleteStockItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
            onShowToast("Artikel verwijderd.");
        }
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem.name) return onShowToast("Naam is verplicht.");

        const item = editingItem as StockItem;
        await api.saveStockItem(item);
        
        setItems(prev => {
            const idx = prev.findIndex(i => i.id === item.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = item;
                return newArr;
            }
            return [...prev, item];
        });

        setIsItemModalOpen(false);
        onShowToast("Artikel opgeslagen.");
    };

    // --- STOCK ACTIONS ---

    const handleOpenCount = (item: StockItem) => {
        setCountTarget(item);
        setCountValue('');
        setIsCountModalOpen(true);
    };

    const confirmCount = async () => {
        if (!countTarget || countValue === '') return;
        
        const newCount = parseInt(countValue);
        const diff = newCount - countTarget.currentStock;
        
        if (diff === 0) {
            setIsCountModalOpen(false);
            return;
        }

        const type: StockTransactionType = diff > 0 ? 'Correction' : 'Usage'; // Or Count if we want to be specific
        // Actually, Count usually implies setting absolute value. Let's log it as 'Count' but maybe differentiate increase/decrease visually later.
        
        const updatedItem = { 
            ...countTarget, 
            currentStock: newCount,
            lastUpdated: new Date().toISOString() 
        };

        const log: StockLog = {
            id: crypto.randomUUID(),
            itemId: updatedItem.id,
            itemName: updatedItem.name,
            change: diff,
            type: 'Count',
            date: new Date().toISOString(),
            user: currentUser.name,
            notes: 'Handmatige telling'
        };

        await api.saveStockItem(updatedItem);
        await api.saveStockLog(log);

        setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        setLogs(prev => [log, ...prev]);
        
        setIsCountModalOpen(false);
        setCountTarget(null);
        onShowToast("Voorraad bijgewerkt.");
    };

    // --- INCOMING DELIVERY ---

    const addToCart = (item: StockItem) => {
        setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    };

    const updateCart = (itemId: string, val: number) => {
        if (val <= 0) {
            const newCart = { ...cart };
            delete newCart[itemId];
            setCart(newCart);
        } else {
            setCart(prev => ({ ...prev, [itemId]: val }));
        }
    };

    const confirmDelivery = async () => {
        const itemIds = Object.keys(cart);
        if (itemIds.length === 0) return;

        const newLogs: StockLog[] = [];
        const updatedItems: StockItem[] = [];

        for (const id of itemIds) {
            const item = items.find(i => i.id === id);
            if (item) {
                const qty = cart[id];
                const updatedItem = {
                    ...item,
                    currentStock: item.currentStock + qty,
                    lastUpdated: new Date().toISOString()
                };
                
                updatedItems.push(updatedItem);
                
                newLogs.push({
                    id: crypto.randomUUID(),
                    itemId: item.id,
                    itemName: item.name,
                    change: qty,
                    type: 'Delivery',
                    date: new Date().toISOString(),
                    user: currentUser.name,
                    notes: 'Nieuwe bestelling ontvangen'
                });

                await api.saveStockItem(updatedItem);
            }
        }

        // Batch save logs locally/api
        for (const log of newLogs) {
            await api.saveStockLog(log);
        }

        setItems(prev => prev.map(i => {
            const updated = updatedItems.find(u => u.id === i.id);
            return updated || i;
        }));
        setLogs(prev => [...newLogs, ...prev]);
        
        setCart({});
        setActiveTab('inventory');
        onShowToast("Levering verwerkt.");
    };

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-xl">
                            <Package className="text-teal-600" size={32} />
                        </div>
                        Voorraadbeheer
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Beheer artikelen, tellingen en bestellingen.</p>
                </div>
                {canManage && (
                    <div className="flex gap-3">
                        <button 
                            onClick={handleOpenCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                        >
                            <Plus size={18} /> Nieuw Artikel
                        </button>
                    </div>
                )}
            </div>

            {/* TABS */}
            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button onClick={() => setActiveTab('inventory')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <ClipboardList size={18}/> Voorraadlijst
                </button>
                <button onClick={() => setActiveTab('incoming')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'incoming' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <ShoppingCart size={18}/> Levering Registreren
                    {Object.keys(cart).length > 0 && <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{Object.keys(cart).length}</span>}
                </button>
                <button onClick={() => setActiveTab('logs')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <History size={18}/> Logboek
                </button>
            </div>

            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Zoek artikel..." 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                                        categoryFilter === cat 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map(item => {
                            const isLowStock = item.currentStock <= item.minStock;
                            return (
                                <div key={item.id} className={`bg-white rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition-all group relative ${isLowStock ? 'border-red-100' : 'border-slate-100'}`}>
                                    {isLowStock && (
                                        <div className="absolute top-4 right-4 text-red-500 animate-pulse" title="Lage voorraad">
                                            <AlertTriangle size={20}/>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                                            <Box size={24}/>
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditItem(item)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-lg mb-1">{item.name}</h3>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded inline-block mb-4">{item.category}</span>

                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className={`text-3xl font-bold ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                                                {item.currentStock}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">
                                                {item.unit} (Min: {item.minStock})
                                            </div>
                                        </div>
                                        
                                        {canManage && (
                                            <button 
                                                onClick={() => handleOpenCount(item)}
                                                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                                            >
                                                Tellen
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                                Geen artikelen gevonden.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'incoming' && (
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Zoek artikel om toe te voegen..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="max-h-[600px] overflow-y-auto">
                                {filteredItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                        <div>
                                            <div className="font-bold text-slate-900">{item.name}</div>
                                            <div className="text-xs text-slate-500">{item.category} • Huidig: {item.currentStock} {item.unit}</div>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(item)}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors"
                                        >
                                            <Plus size={18}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col h-[600px]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingCart size={20} className="text-teal-600"/> Nieuwe Bestelling
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {Object.keys(cart).length === 0 ? (
                                <div className="text-center text-slate-400 italic mt-20">Nog geen items geselecteerd.</div>
                            ) : (
                                Object.entries(cart).map(([id, qty]) => {
                                    const item = items.find(i => i.id === id);
                                    if (!item) return null;
                                    return (
                                        <div key={id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="font-bold text-sm truncate">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.unit}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    className="w-16 p-1 text-center border rounded font-bold text-sm"
                                                    value={qty}
                                                    onChange={(e) => updateCart(id, parseInt(e.target.value) || 0)}
                                                />
                                                <button onClick={() => updateCart(id, 0)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={confirmDelivery}
                                disabled={Object.keys(cart).length === 0}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Levering Verwerken
                            </button>
                        </div>
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
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Aantal</th>
                                <th className="px-6 py-4">Gebruiker</th>
                                <th className="px-6 py-4">Notitie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                        {new Date(log.date).toLocaleString('nl-NL')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{log.itemName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            log.type === 'Delivery' ? 'bg-green-100 text-green-700' :
                                            log.type === 'Count' ? 'bg-blue-100 text-blue-700' :
                                            log.type === 'Usage' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {log.type === 'Delivery' ? 'Levering' : log.type === 'Count' ? 'Telling' : log.type === 'Correction' ? 'Correctie' : 'Verbruik'}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-mono font-bold ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {log.change > 0 ? '+' : ''}{log.change}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{log.user}</td>
                                    <td className="px-6 py-4 text-slate-500 italic truncate max-w-xs">{log.notes || '-'}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Geen activiteit gevonden.</td>
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
                        <input 
                            className="w-full p-3 border border-slate-200 rounded-xl"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                            <input 
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={editingItem.category}
                                onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                                list="categories"
                            />
                            <datalist id="categories">
                                {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}/>)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eenheid</label>
                            <input 
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={editingItem.unit}
                                onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                                placeholder="Stuks, Dozen, etc."
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Huidige Voorraad</label>
                            <input 
                                type="number"
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={editingItem.currentStock}
                                onChange={(e) => setEditingItem({...editingItem, currentStock: parseInt(e.target.value) || 0})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Minimum Voorraad</label>
                            <input 
                                type="number"
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={editingItem.minStock}
                                onChange={(e) => setEditingItem({...editingItem, minStock: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-md">Opslaan</button>
                </form>
            </Modal>

            {/* COUNT MODAL */}
            <Modal isOpen={isCountModalOpen} onClose={() => setIsCountModalOpen(false)} title="Voorraad Tellen">
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                        <h3 className="text-lg font-bold text-slate-900">{countTarget?.name}</h3>
                        <p className="text-slate-500 text-sm">Huidig Systeem: <strong>{countTarget?.currentStock} {countTarget?.unit}</strong></p>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Nieuw Geteld Aantal</label>
                        <input 
                            type="number"
                            className="w-full p-4 text-center text-3xl font-bold border-2 border-teal-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20"
                            value={countValue}
                            onChange={(e) => setCountValue(e.target.value)}
                            autoFocus
                            placeholder="0"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsCountModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Annuleren</button>
                        <button onClick={confirmCount} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-md">Bevestigen</button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default StockControlPage;
