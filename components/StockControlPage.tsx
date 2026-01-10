
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Package, Search, Plus, Filter, AlertTriangle, RefreshCw, 
    Edit2, Trash2, Save, X, History, TrendingUp, TrendingDown, 
    ClipboardList, ShoppingCart, Box, Truck, Check, Calendar, ArrowRight, FolderOpen, ChevronLeft
} from 'lucide-react';
import { Employee, StockItem, StockLog, StockOrder, StockOrderItem } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface StockControlPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const DEFAULT_CATEGORIES = [
    'Algemeen', 
    'Kantoor', 
    'F&B', 
    'Schoonmaak', 
    'Technische Dienst', 
    'Receptie', 
    'Drukwerk', 
    'Merchandise',
    'Wellness'
];

const StockControlPage: React.FC<StockControlPageProps> = ({ currentUser, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'logs'>('inventory');
    const [items, setItems] = useState<StockItem[]>([]);
    const [orders, setOrders] = useState<StockOrder[]>([]);
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Modals
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<StockItem>>({});
    const [isCustomCategory, setIsCustomCategory] = useState(false); // New state for input toggle

    const [isCountModalOpen, setIsCountModalOpen] = useState(false);
    const [countTarget, setCountTarget] = useState<StockItem | null>(null);
    const [countValue, setCountValue] = useState(''); 
    
    // Permission check
    const canManage = hasPermission(currentUser, 'MANAGE_STOCK');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [i, l, o] = await Promise.all([
            api.getStockItems(),
            api.getStockLogs(),
            api.getStockOrders()
        ]);
        setItems(i.sort((a,b) => a.name.localeCompare(b.name)));
        setLogs(l.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setOrders(o.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoading(false);
    };

    const categories = useMemo(() => {
        const cats = new Set<string>(DEFAULT_CATEGORIES);
        // Add any categories that exist in items but not in defaults
        items.forEach(i => cats.add(i.category));
        return ['All', ...Array.from(cats).sort()];
    }, [items]);

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
            itemsPerBox: 1, 
            lastUpdated: new Date().toISOString()
        });
        setIsCustomCategory(false);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: StockItem) => {
        setEditingItem(item);
        setIsCustomCategory(false);
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
        if (!editingItem.category) return onShowToast("Categorie is verplicht.");

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

    // --- COUNTING ---

    const handleOpenCount = (item: StockItem) => {
        setCountTarget(item);
        setCountValue(item.currentStock.toString());
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

    // --- ORDERING LOGIC ---

    const handleAddToPending = async (item: StockItem) => {
        // Find existing pending order or create new one in memory
        const pendingOrder = orders.find(o => o.status === 'Pending');
        
        let newItems: StockOrderItem[] = [];
        let orderId = pendingOrder?.id || crypto.randomUUID();

        if (pendingOrder) {
            newItems = [...pendingOrder.items];
            const existingItemIndex = newItems.findIndex(i => i.itemId === item.id);
            if (existingItemIndex >= 0) {
                newItems[existingItemIndex].quantity += 1;
            } else {
                newItems.push({
                    itemId: item.id,
                    name: item.name,
                    quantity: 1, // Default 1 box/unit
                    unit: (item.itemsPerBox && item.itemsPerBox > 1) ? 'Doos' : 'Stuk'
                });
            }
        } else {
            newItems = [{
                itemId: item.id,
                name: item.name,
                quantity: 1,
                unit: (item.itemsPerBox && item.itemsPerBox > 1) ? 'Doos' : 'Stuk'
            }];
        }

        const order: StockOrder = {
            id: orderId,
            items: newItems,
            status: 'Pending',
            createdAt: pendingOrder ? pendingOrder.createdAt : new Date().toISOString(),
            createdBy: pendingOrder ? pendingOrder.createdBy : currentUser.name
        };

        // SAVE TO DB IMMEDIATELY
        await api.saveStockOrder(order);
        
        setOrders(prev => {
            const idx = prev.findIndex(o => o.id === order.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = order;
                return newArr;
            }
            return [order, ...prev];
        });
        
        onShowToast(`${item.name} toegevoegd aan wensenlijst.`);
    };

    const handlePlaceOrder = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedOrder: StockOrder = {
            ...order,
            status: 'Ordered',
            orderedAt: new Date().toISOString()
        };

        await api.saveStockOrder(updatedOrder);
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        onShowToast("Bestelling geplaatst!");
    };

    const handleReceiveOrder = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Update Stock
        const newLogs: StockLog[] = [];
        const updatedItems = [...items];

        for (const orderItem of order.items) {
            const itemIndex = updatedItems.findIndex(i => i.id === orderItem.itemId);
            if (itemIndex >= 0) {
                const stockItem = updatedItems[itemIndex];
                const multiplier = (stockItem.itemsPerBox && stockItem.itemsPerBox > 1) ? stockItem.itemsPerBox : 1;
                const totalQty = orderItem.quantity * multiplier;

                const updatedStockItem = {
                    ...stockItem,
                    currentStock: stockItem.currentStock + totalQty,
                    lastUpdated: new Date().toISOString()
                };

                // Update array in memory
                updatedItems[itemIndex] = updatedStockItem;

                // Save individual item to DB
                await api.saveStockItem(updatedStockItem);

                newLogs.push({
                    id: crypto.randomUUID(),
                    itemId: stockItem.id,
                    itemName: stockItem.name,
                    change: totalQty,
                    type: 'Delivery',
                    date: new Date().toISOString(),
                    user: currentUser.name,
                    notes: `Bestelling ontvangen: ${orderItem.quantity}x ${orderItem.unit}`
                });
            }
        }

        // Update Order Status
        const updatedOrder: StockOrder = {
            ...order,
            status: 'Received',
            receivedAt: new Date().toISOString(),
            receivedBy: currentUser.name
        };

        await api.saveStockOrder(updatedOrder);
        
        // Save Logs
        for (const log of newLogs) {
            await api.saveStockLog(log);
        }

        setItems(updatedItems);
        setLogs(prev => [...newLogs, ...prev]);
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        
        onShowToast("Bestelling binnengemeld en voorraad bijgewerkt.");
    };

    const handleDeleteOrder = async (id: string) => {
        if(confirm("Weet je zeker dat je deze bestelling wilt verwijderen?")) {
            await api.deleteStockOrder(id);
            setOrders(prev => prev.filter(o => o.id !== id));
            onShowToast("Bestelling verwijderd.");
        }
    };

    const updateOrderItemQuantity = async (orderId: string, itemId: string, delta: number) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(i => {
            if (i.itemId === itemId) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        });

        const updatedOrder = { ...order, items: updatedItems };
        
        // SAVE TO DB
        await api.saveStockOrder(updatedOrder);
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    };

    const removeOrderItem = async (orderId: string, itemId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.filter(i => i.itemId !== itemId);
        
        if (updatedItems.length === 0) {
            handleDeleteOrder(orderId);
        } else {
            const updatedOrder = { ...order, items: updatedItems };
            // SAVE TO DB
            await api.saveStockOrder(updatedOrder);
            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        }
    };

    // --- LOG DELETION ---
    const handleDeleteLog = async (logId: string) => {
        if (confirm("Weet je zeker dat je dit logboekitem wilt verwijderen?")) {
            await api.deleteStockLog(logId);
            setLogs(prev => prev.filter(l => l.id !== logId));
            onShowToast("Logboekitem verwijderd.");
        }
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
                    <p className="text-slate-500 mt-2 text-lg">Beheer voorraad receptie en bestellingen.</p>
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
                    <ClipboardList size={18}/> Voorraad Receptie
                </button>
                <button onClick={() => setActiveTab('orders')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <ShoppingCart size={18}/> Bestellingen
                    {orders.filter(o => o.status === 'Pending').length > 0 && <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{orders.filter(o => o.status === 'Pending').length}</span>}
                </button>
                <button onClick={() => setActiveTab('logs')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <History size={18}/> Logboek
                </button>
            </div>

            {/* INVENTORY TAB */}
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

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Artikel</th>
                                    <th className="px-6 py-4">Huidig</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Acties</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredItems.map(item => {
                                    const isLow = item.currentStock <= item.minStock;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{item.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    {item.category}
                                                    {item.itemsPerBox && item.itemsPerBox > 1 && (
                                                        <span className="bg-slate-100 px-1.5 rounded border border-slate-200">Per doos: {item.itemsPerBox}st</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-base text-slate-800">
                                                {item.currentStock} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isLow ? (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">
                                                        <AlertTriangle size={12}/> Laag ({item.minStock})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">
                                                        <Check size={12}/> Voldoende
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canManage && (
                                                        <button 
                                                            onClick={() => handleOpenCount(item)}
                                                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50"
                                                        >
                                                            Tellen
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleAddToPending(item)}
                                                        className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 font-bold text-xs rounded-lg hover:bg-teal-100"
                                                    >
                                                        + Bestellen
                                                    </button>
                                                    {canManage && (
                                                        <button onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-slate-700"><Edit2 size={16}/></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
                <div className="space-y-8">
                    {/* PENDING ORDERS (Wensenlijst) */}
                    {orders.some(o => o.status === 'Pending') && (
                        <div className="bg-white rounded-2xl border border-teal-200 shadow-md overflow-hidden">
                            <div className="bg-teal-50 px-6 py-4 border-b border-teal-100 flex justify-between items-center">
                                <h3 className="font-bold text-teal-900 flex items-center gap-2">
                                    <ClipboardList size={20}/> Wensenlijst (Nog niet besteld)
                                </h3>
                                <button onClick={() => handleDeleteOrder(orders.find(o => o.status === 'Pending')?.id!)} className="text-teal-700 hover:text-red-600">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {orders.filter(o => o.status === 'Pending').map(order => (
                                    <div key={order.id} className="p-6">
                                        <div className="mb-4 text-xs text-slate-500">
                                            Aangemaakt op {new Date(order.createdAt).toLocaleDateString()} door {order.createdBy}
                                        </div>
                                        <div className="space-y-2 mb-6">
                                            {order.items.map(item => (
                                                <div key={item.itemId} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                                    <span className="font-bold text-slate-700">{item.name}</span>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                                                            <button onClick={() => updateOrderItemQuantity(order.id, item.itemId, -1)} className="text-slate-400 hover:text-slate-700"><TrendingDown size={16}/></button>
                                                            <span className="font-mono w-8 text-center">{item.quantity}</span>
                                                            <button onClick={() => updateOrderItemQuantity(order.id, item.itemId, 1)} className="text-slate-400 hover:text-slate-700"><TrendingUp size={16}/></button>
                                                        </div>
                                                        <span className="text-xs text-slate-500 w-12">{item.unit}</span>
                                                        <button onClick={() => removeOrderItem(order.id, item.itemId)} className="text-slate-300 hover:text-red-500"><X size={16}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => handlePlaceOrder(order.id)}
                                                className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 flex items-center gap-2"
                                            >
                                                Bestelling Plaatsen <ArrowRight size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ORDERED (Onderweg) */}
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mt-8">
                        <Truck size={20} className="text-blue-500"/> Onderweg (Besteld)
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {orders.filter(o => o.status === 'Ordered').map(order => (
                            <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">Besteld</span>
                                        <span className="text-xs text-slate-500">op {new Date(order.orderedAt!).toLocaleDateString()}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {order.items.map(item => (
                                            <div key={item.itemId} className="text-sm text-slate-700 flex justify-between border-b border-slate-50 py-1 last:border-0">
                                                <span>{item.name}</span>
                                                <span className="font-bold text-slate-900">{item.quantity} {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center gap-2">
                                    <button 
                                        onClick={() => handleReceiveOrder(order.id)}
                                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Box size={16}/> Binnenmelden
                                    </button>
                                    <button onClick={() => handleDeleteOrder(order.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline text-center">Annuleren & Verwijderen</button>
                                </div>
                            </div>
                        ))}
                         {orders.filter(o => o.status === 'Ordered').length === 0 && (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                Geen lopende bestellingen.
                            </div>
                        )}
                    </div>

                    {/* HISTORY (Ontvangen) */}
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mt-8">
                        <History size={20} className="text-slate-400"/> Historie (Ontvangen)
                    </h3>
                     <div className="grid grid-cols-1 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                        {orders.filter(o => o.status === 'Received').slice(0, 5).map(order => (
                            <div key={order.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 mb-1">Ontvangen: {new Date(order.receivedAt!).toLocaleDateString()} door {order.receivedBy}</div>
                                    <div className="text-sm text-slate-700">{order.items.length} artikelen ({order.items.map(i => i.name).join(', ').substring(0, 50)}...)</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Voltooid</span>
                                    <button onClick={() => handleDeleteOrder(order.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
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
                                <th className="px-6 py-4 text-right"></th>
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
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDeleteLog(log.id)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Geen activiteit gevonden.</td>
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
                            
                            {!isCustomCategory ? (
                                <div className="flex gap-2">
                                    <select 
                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                        value={editingItem.category}
                                        onChange={(e) => {
                                            if (e.target.value === 'NEW_CAT') {
                                                setIsCustomCategory(true);
                                                setEditingItem({...editingItem, category: ''});
                                            } else {
                                                setEditingItem({...editingItem, category: e.target.value});
                                            }
                                        }}
                                    >
                                        <option value="">Selecteer...</option>
                                        {categories.filter(c => c !== 'All').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="NEW_CAT" className="font-bold">+ Nieuwe Categorie...</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                        <input 
                                            className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl text-sm"
                                            placeholder="Nieuwe categorienaam..."
                                            value={editingItem.category}
                                            onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                                            autoFocus
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsCustomCategory(false)}
                                        className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                                        title="Terug naar lijst"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                            )}
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
                    
                    {/* ITEMS PER BOX CONFIG */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aantal per doos</label>
                        <input 
                            type="number"
                            className="w-full p-3 border border-slate-200 rounded-xl"
                            value={editingItem.itemsPerBox || 1}
                            onChange={(e) => setEditingItem({...editingItem, itemsPerBox: parseInt(e.target.value) || 1})}
                            min={1}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Vul 1 in als dit artikel niet per doos gaat.</p>
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Nieuw Geteld Aantal (Totaal Stuks)</label>
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
