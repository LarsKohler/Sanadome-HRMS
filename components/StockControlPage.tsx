
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Package, Search, Plus, Filter, AlertTriangle, RefreshCw, 
    Edit2, Trash2, Save, X, History, TrendingUp, TrendingDown, 
    ClipboardList, ShoppingCart, Box, Truck, Check, Calendar, ArrowRight, FolderOpen, ChevronLeft, Settings, Tag, Building2, PlayCircle, ChevronRight, StopCircle, Upload, FileText, Paperclip, Send, ExternalLink, Mail, ShieldCheck, ListFilter, User
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
    
    // Category Management
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    
    // GENERAL COUNTING MODE STATE
    const [isCountSelectionOpen, setIsCountSelectionOpen] = useState(false); // NEW: Selection modal
    const [isCountingMode, setIsCountingMode] = useState(false);
    const [countingCategories, setCountingCategories] = useState<string[]>([]);
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [groupedItems, setGroupedItems] = useState<Record<string, StockItem[]>>({});
    const [categoryCounts, setCategoryCounts] = useState<Record<string, string>>({}); // itemId -> value
    const [countTypeLabel, setCountTypeLabel] = useState('');

    // ORDERING STATES
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [activeOrderTarget, setActiveOrderTarget] = useState<StockOrder | null>(null);
    const [orderFile, setOrderFile] = useState<File | null>(null);
    const [isUploadingOrder, setIsUploadingOrder] = useState(false);
    const [noSlipAvailable, setNoSlipAvailable] = useState(false); 
    
    // Approval States
    const [ccConfirmed, setCcConfirmed] = useState(false);
    const [managementApproved, setManagementApproved] = useState(false);
    
    const orderInputRef = useRef<HTMLInputElement>(null);

    // Hidden Categories (Persisted)
    const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hrms_hidden_stock_categories');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

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
        const cats = new Set<string>();
        DEFAULT_CATEGORIES.forEach(c => {
            if (!hiddenCategories.includes(c)) cats.add(c);
        });
        items.forEach(i => cats.add(i.category));
        cats.add('Algemeen');
        return ['All', ...Array.from(cats).sort()];
    }, [items, hiddenCategories]);

    const activeCategories = useMemo(() => {
        const counts: Record<string, number> = {};
        DEFAULT_CATEGORIES.forEach(c => {
             if (!hiddenCategories.includes(c)) counts[c] = 0;
        });
        items.forEach(i => {
            counts[i.category] = (counts[i.category] || 0) + 1;
        });
        return Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0]));
    }, [items, hiddenCategories]);

    // Get unique list of existing suppliers for autocomplete
    const existingSuppliers = useMemo(() => {
        const suppliers = new Set<string>();
        items.forEach(i => {
            // Collect ALL source names that are likely suppliers (External)
            if (i.sourceName) {
                suppliers.add(i.sourceName);
            }
        });
        return Array.from(suppliers).sort();
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
            itemsPerBox: 1, // Default invisible
            sourceType: 'External', 
            sourceName: '',
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
        if (!editingItem.sourceName) return onShowToast("Leverancier of Afdeling is verplicht.");

        if (hiddenCategories.includes(editingItem.category)) {
             const newHidden = hiddenCategories.filter(c => c !== editingItem.category);
             setHiddenCategories(newHidden);
             localStorage.setItem('hrms_hidden_stock_categories', JSON.stringify(newHidden));
        }

        const item = {
            ...editingItem,
            unit: editingItem.unit || 'Stuks', // Use entered unit or default
            itemsPerBox: 1 // Force default
        } as StockItem;

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

    // --- CATEGORY ACTIONS ---
    const handleRenameCategory = async () => {
        if (!categoryToRename || !newCategoryName.trim()) return;
        const itemsToUpdate = items.filter(i => i.category === categoryToRename);
        if (itemsToUpdate.length === 0) { setCategoryToRename(null); return; }

        if (confirm(`Weet je zeker dat je de categorie '${categoryToRename}' wilt hernoemen naar '${newCategoryName}' voor ${itemsToUpdate.length} artikelen?`)) {
            if (hiddenCategories.includes(newCategoryName)) {
                 const newHidden = hiddenCategories.filter(c => c !== newCategoryName);
                 setHiddenCategories(newHidden);
                 localStorage.setItem('hrms_hidden_stock_categories', JSON.stringify(newHidden));
            }
            const updatedItems: StockItem[] = [];
            for (const item of itemsToUpdate) {
                const updated = { ...item, category: newCategoryName };
                await api.saveStockItem(updated);
                updatedItems.push(updated);
            }
            setItems(prev => prev.map(i => {
                if (i.category === categoryToRename) {
                    return { ...i, category: newCategoryName };
                }
                return i;
            }));
            onShowToast(`Categorie hernoemd. ${itemsToUpdate.length} artikelen bijgewerkt.`);
            setCategoryToRename(null);
            setNewCategoryName('');
        }
    };

    const handleDeleteCategoryClick = (cat: string) => {
        if (cat === 'Algemeen') { return onShowToast("De categorie 'Algemeen' kan niet verwijderd worden."); }
        setCategoryToDelete(cat);
    };

    const executeDeleteCategory = async () => {
        if (!categoryToDelete) return;
        const itemsToMove = items.filter(i => i.category === categoryToDelete);
        for (const item of itemsToMove) {
            const updated = { ...item, category: 'Algemeen' };
            await api.saveStockItem(updated);
        }
        setItems(prev => prev.map(i => {
            if (i.category === categoryToDelete) { return { ...i, category: 'Algemeen' }; }
            return i;
        }));
        if (!hiddenCategories.includes(categoryToDelete)) {
            const newHidden = [...hiddenCategories, categoryToDelete];
            setHiddenCategories(newHidden);
            localStorage.setItem('hrms_hidden_stock_categories', JSON.stringify(newHidden));
        }
        onShowToast(`Categorie '${categoryToDelete}' verwijderd. Artikelen verplaatst naar Algemeen.`);
        setCategoryToDelete(null);
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
        if (diff === 0) { setIsCountModalOpen(false); return; }

        const updatedItem = { ...countTarget, currentStock: newCount, lastUpdated: new Date().toISOString() };
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

    // --- GENERAL COUNTING ---
    const startGeneralCount = (type: 'All' | 'Internal' | 'External') => {
        let filteredForCount = items;
        let label = 'Algemene Telling';

        if (type === 'Internal') {
            filteredForCount = items.filter(i => i.sourceType === 'Internal');
            label = 'Interne Telling';
        } else if (type === 'External') {
            filteredForCount = items.filter(i => i.sourceType === 'External');
            label = 'Externe Telling';
        }

        const grouped: Record<string, StockItem[]> = {};
        filteredForCount.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });

        const sortedCats = Object.keys(grouped).sort();
        if (sortedCats.length === 0) return onShowToast("Geen artikelen gevonden voor deze telling.");
        
        setGroupedItems(grouped);
        setCountingCategories(sortedCats);
        setCurrentCategoryIndex(0);
        setCategoryCounts({}); 
        setCountTypeLabel(label);
        setIsCountSelectionOpen(false);
        setIsCountingMode(true);
    };

    const handleCategoryCountChange = (itemId: string, val: string) => {
        setCategoryCounts(prev => ({ ...prev, [itemId]: val }));
    };

    const handleNextCategory = async () => {
        const currentCat = countingCategories[currentCategoryIndex];
        const categoryItems = groupedItems[currentCat] || [];
        const updates: StockItem[] = [];
        const newLogs: StockLog[] = [];

        categoryItems.forEach(item => {
            const inputVal = categoryCounts[item.id];
            if (inputVal !== undefined) {
                const newStock = inputVal === '' ? 0 : parseInt(inputVal);
                if (newStock !== item.currentStock) {
                    const diff = newStock - item.currentStock;
                    const updatedItem = { ...item, currentStock: newStock, lastUpdated: new Date().toISOString() };
                    updates.push(updatedItem);
                    newLogs.push({
                        id: crypto.randomUUID(),
                        itemId: updatedItem.id,
                        itemName: updatedItem.name,
                        change: diff,
                        type: 'Count',
                        date: new Date().toISOString(),
                        user: currentUser.name,
                        notes: countTypeLabel
                    });
                }
            }
        });

        if (updates.length > 0) {
            await Promise.all(updates.map(u => api.saveStockItem(u)));
            await Promise.all(newLogs.map(l => api.saveStockLog(l)));
            setItems(prev => {
                const map = new Map(prev.map(i => [i.id, i]));
                updates.forEach(u => map.set(u.id, u));
                return Array.from(map.values());
            });
            setLogs(prev => [...newLogs, ...prev]);
        }

        if (currentCategoryIndex < countingCategories.length - 1) {
            setCurrentCategoryIndex(prev => prev + 1);
            setCategoryCounts({});
            const listContainer = document.getElementById('counting-list-container');
            if (listContainer) listContainer.scrollTop = 0;
        } else {
            setIsCountingMode(false);
            onShowToast("Telling voltooid!");
        }
    };

    const handlePrevCategory = () => {
        if (currentCategoryIndex > 0) {
            setCurrentCategoryIndex(prev => prev - 1);
            setCategoryCounts({}); 
        }
    };

    const handleExitCountMode = () => {
        if (confirm("Wil je de telling afbreken? Voortgang van vorige categorieën is opgeslagen.")) {
            setIsCountingMode(false);
        }
    };

    // --- ORDERING LOGIC ---

    const handleAddToPending = async (item: StockItem) => {
        const sourceName = item.sourceName || 'Onbekend';
        
        // Find existing pending order SPECIFICALLY for this supplier/department
        const pendingOrder = orders.find(o => o.status === 'Pending' && o.supplier === sourceName);
        
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
                    quantity: 1, 
                    unit: item.unit || 'Stuk'
                });
            }
        } else {
            newItems = [{
                itemId: item.id,
                name: item.name,
                quantity: 1,
                unit: item.unit || 'Stuk'
            }];
        }

        const order: StockOrder = {
            id: orderId,
            items: newItems,
            status: 'Pending',
            createdAt: pendingOrder ? pendingOrder.createdAt : new Date().toISOString(),
            createdBy: pendingOrder ? pendingOrder.createdBy : currentUser.name,
            supplier: sourceName,
            orderType: item.sourceType
        };

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
        
        onShowToast(`${item.name} toegevoegd aan bestelling voor ${sourceName}.`);
    };

    const handleOpenOrderModal = (order: StockOrder) => {
        setActiveOrderTarget(order);
        setOrderFile(null);
        setNoSlipAvailable(false);
        setCcConfirmed(false); // Reset CC check
        setManagementApproved(false); // Reset Management check
        setIsOrderModalOpen(true);
    };

    const handleOrderFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setOrderFile(e.target.files[0]);
            setNoSlipAvailable(false); // Can't have both
        }
    };

    const handleConfirmOrder = async () => {
        if (!activeOrderTarget) return;

        // Final Validation check (redundant but safe)
        if (!ccConfirmed) return;
        if (activeOrderTarget.orderType === 'External' && !managementApproved) return;
        if (activeOrderTarget.orderType === 'External' && !orderFile && !noSlipAvailable) return;

        setIsUploadingOrder(true);
        let publicUrl = undefined;

        // If External and file provided, upload
        if (activeOrderTarget.orderType === 'External' && orderFile) {
            try {
                publicUrl = await api.uploadFile(orderFile);
            } catch (e) {
                console.error("Upload failed", e);
                onShowToast("Uploaden bestelbon mislukt, bestelling niet geplaatst.");
                setIsUploadingOrder(false);
                return;
            }
        }

        const updatedOrder: StockOrder = {
            ...activeOrderTarget,
            status: 'Ordered',
            orderedAt: new Date().toISOString(),
            attachmentUrl: publicUrl,
            notes: noSlipAvailable ? 'Geen bestelbon beschikbaar (Telefonisch/Mail)' : undefined
        };

        await api.saveStockOrder(updatedOrder);

        // CREATE LOGS FOR ORDER PLACEMENT
        // Even though stock doesn't change, we want to see "Ordered" in the log
        const newLogs: StockLog[] = activeOrderTarget.items.map(item => ({
            id: crypto.randomUUID(),
            itemId: item.itemId,
            itemName: item.name,
            change: 0, // No stock change
            type: 'Correction', // Use 'Correction' as a catch-all for non-movement events
            date: new Date().toISOString(),
            user: currentUser.name,
            notes: `Besteld bij ${activeOrderTarget.supplier} (Aantal: ${item.quantity})`
        }));
        await Promise.all(newLogs.map(l => api.saveStockLog(l)));
        
        setLogs(prev => [...newLogs, ...prev]);
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        
        setIsUploadingOrder(false);
        setIsOrderModalOpen(false);
        setActiveOrderTarget(null);
        setOrderFile(null);

        onShowToast(updatedOrder.orderType === 'External' ? 'Bestelling geplaatst!' : 'Interne aanvraag verstuurd!');
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
                // REMOVED MULTIPLIER LOGIC
                const totalQty = orderItem.quantity; 

                const updatedStockItem = {
                    ...stockItem,
                    currentStock: stockItem.currentStock + totalQty,
                    lastUpdated: new Date().toISOString()
                };
                updatedItems[itemIndex] = updatedStockItem;
                await api.saveStockItem(updatedStockItem);

                newLogs.push({
                    id: crypto.randomUUID(),
                    itemId: stockItem.id,
                    itemName: stockItem.name,
                    change: totalQty,
                    type: 'Delivery',
                    date: new Date().toISOString(),
                    user: currentUser.name,
                    notes: `Ontvangen van ${order.supplier} (Door: ${currentUser.name})`
                });
            }
        }

        const updatedOrder: StockOrder = {
            ...order,
            status: 'Received',
            receivedAt: new Date().toISOString(),
            receivedBy: currentUser.name
        };

        await api.saveStockOrder(updatedOrder);
        for (const log of newLogs) { await api.saveStockLog(log); }

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

    // --- COUNTING MODE RENDERER ---
    const renderCountingMode = () => {
        const currentCatName = countingCategories[currentCategoryIndex];
        const categoryItems = groupedItems[currentCatName] || [];
        const progress = Math.round(((currentCategoryIndex) / countingCategories.length) * 100);
        
        return (
            <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in fade-in duration-300">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={handleExitCountMode} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                            <X size={24}/>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-900">Voorraad Tellen</h2>
                                <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">{countTypeLabel}</span>
                            </div>
                            <p className="text-sm text-slate-500">Categorie {currentCategoryIndex + 1} van {countingCategories.length}</p>
                        </div>
                    </div>
                    <div className="w-48 hidden md:block">
                         <div className="flex justify-between text-xs text-slate-500 mb-1">
                             <span>Voortgang</span>
                             <span>{progress}%</span>
                         </div>
                         <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                             <div className="h-full bg-teal-500 transition-all duration-300" style={{width: `${progress}%`}}></div>
                         </div>
                    </div>
                </div>

                {/* Main Content - SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8" id="counting-list-container">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="text-center mb-6">
                             <span className="bg-slate-200 text-slate-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide">
                                {currentCatName}
                            </span>
                        </div>

                        {categoryItems.map(item => (
                            <div key={item.id} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">{item.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <span className="text-slate-400">Huidig: {item.currentStock} {item.unit}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number"
                                        inputMode="numeric" 
                                        pattern="[0-9]*"
                                        className="w-24 md:w-32 p-3 md:p-4 text-center text-xl md:text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all bg-slate-50 focus:bg-white"
                                        placeholder="0"
                                        value={categoryCounts[item.id] || ''}
                                        onChange={(e) => handleCategoryCountChange(item.id, e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <span className="text-sm font-bold text-slate-400 w-8">{item.unit || 'Stuks'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-white border-t border-slate-200 p-6 flex gap-4 justify-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button 
                        onClick={handlePrevCategory}
                        disabled={currentCategoryIndex === 0}
                        className="px-6 py-4 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ChevronLeft size={24}/> Vorige
                    </button>
                    
                    <button 
                        onClick={handleNextCategory}
                        className="flex-1 max-w-md px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {currentCategoryIndex === countingCategories.length - 1 ? (
                            <>Afronden <Check size={24}/></>
                        ) : (
                            <>Volgende Categorie <ChevronRight size={24}/></>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    if (isCountingMode) {
        return renderCountingMode();
    }

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
                            onClick={() => setIsCountSelectionOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <PlayCircle size={18} /> Telling Starten
                        </button>
                        <button 
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                        >
                            <Tag size={18} /> Categorieën
                        </button>
                        <button 
                            onClick={handleOpenCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all"
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
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Huidig</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Acties</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredItems.map(item => {
                                    // Change logic: only < minStock is low
                                    const isLow = item.currentStock < item.minStock;
                                    const isInternal = item.sourceType === 'Internal';
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{item.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isInternal ? (
                                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs border border-amber-100 font-medium">
                                                        <Building2 size={12}/> {item.sourceName}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100 font-medium">
                                                        <Truck size={12}/> {item.sourceName}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-base text-slate-800">
                                                {item.currentStock} <span className="text-xs text-slate-400 font-normal ml-1">{item.unit}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isLow ? (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">
                                                        <AlertTriangle size={12}/> Laag (&lt;{item.minStock})
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
                                                        <>
                                                            <button onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-slate-700"><Edit2 size={16}/></button>
                                                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                                        </>
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
                    {/* PENDING ORDERS (Grouped) */}
                    {orders.some(o => o.status === 'Pending') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {orders.filter(o => o.status === 'Pending').map(order => {
                                 const isInternal = order.orderType === 'Internal';
                                 return (
                                     <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
                                         <div className={`px-6 py-4 border-b flex justify-between items-center ${isInternal ? 'bg-amber-50 border-amber-100' : 'bg-teal-50 border-teal-100'}`}>
                                             <div>
                                                 <h3 className={`font-bold flex items-center gap-2 ${isInternal ? 'text-amber-900' : 'text-teal-900'}`}>
                                                     {isInternal ? <Building2 size={18}/> : <Truck size={18}/>}
                                                     {order.supplier}
                                                 </h3>
                                                 <p className={`text-xs ${isInternal ? 'text-amber-700' : 'text-teal-700'}`}>
                                                     {isInternal ? 'Interne Aanvraag' : 'Externe Bestelling'}
                                                 </p>
                                             </div>
                                             <button onClick={() => handleDeleteOrder(order.id)} className="text-slate-400 hover:text-red-500">
                                                 <Trash2 size={18}/>
                                             </button>
                                         </div>
                                         <div className="p-4 flex-1">
                                             <div className="space-y-2 mb-6">
                                                 {order.items.map(item => (
                                                     <div key={item.itemId} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-sm">
                                                         <span className="font-bold text-slate-700">{item.name}</span>
                                                         <div className="flex items-center gap-2">
                                                             <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                 <button onClick={() => updateOrderItemQuantity(order.id, item.itemId, -1)} className="text-slate-400 hover:text-slate-700"><TrendingDown size={14}/></button>
                                                                 <span className="font-mono w-6 text-center">{item.quantity}</span>
                                                                 <button onClick={() => updateOrderItemQuantity(order.id, item.itemId, 1)} className="text-slate-400 hover:text-slate-700"><TrendingUp size={14}/></button>
                                                             </div>
                                                             <span className="text-xs text-slate-400 w-8">{item.unit}</span>
                                                             <button onClick={() => removeOrderItem(order.id, item.itemId)} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                         <div className="p-4 bg-slate-50 border-t border-slate-100">
                                             <button 
                                                 onClick={() => handleOpenOrderModal(order)}
                                                 className={`w-full py-2.5 font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 ${isInternal ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                                             >
                                                 {isInternal ? 'Aanvragen' : 'Plaatsen'} <ArrowRight size={18}/>
                                             </button>
                                         </div>
                                     </div>
                                 );
                             })}
                        </div>
                    )}

                    {/* ORDERED (Onderweg) */}
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mt-8">
                        <Truck size={20} className="text-blue-500"/> Onderweg (Besteld)
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {orders.filter(o => o.status === 'Ordered').map(order => (
                            <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">Besteld</span>
                                        <span className="font-bold text-slate-800">{order.supplier}</span>
                                        <span className="text-xs text-slate-500">op {new Date(order.orderedAt!).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        {order.items.length} artikelen ({order.items.map(i => i.name).join(', ').substring(0, 50)}...)
                                    </div>
                                    {order.notes && (
                                        <div className="text-xs text-amber-600 mt-1 italic flex items-center gap-1">
                                            <AlertTriangle size={10} /> {order.notes}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    {order.attachmentUrl && (
                                        <a 
                                            href={order.attachmentUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-teal-600 font-bold text-sm hover:underline bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100"
                                        >
                                            <Paperclip size={14}/> Bekijk Bon
                                        </a>
                                    )}
                                    <button 
                                        onClick={() => handleReceiveOrder(order.id)}
                                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Box size={16}/> Binnenmelden
                                    </button>
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
                                    <div className="text-xs font-bold text-slate-500 mb-1">
                                        Ontvangen: {new Date(order.receivedAt!).toLocaleDateString()} • {order.supplier}
                                        <span className="block font-normal text-slate-400">Door: {order.receivedBy}</span>
                                    </div>
                                    <div className="text-sm text-slate-700">{order.items.length} artikelen</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {order.attachmentUrl && (
                                        <a href={order.attachmentUrl} target="_blank" className="text-slate-400 hover:text-teal-600"><Paperclip size={16}/></a>
                                    )}
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
                                    <td className={`px-6 py-4 font-mono font-bold ${log.change > 0 ? 'text-green-600' : log.change < 0 ? 'text-red-600' : 'text-slate-400'}`}>
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
                    
                    {/* SOURCE SELECTION */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Bron / Herkomst</label>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="sourceType"
                                    checked={editingItem.sourceType === 'External'}
                                    onChange={() => setEditingItem({...editingItem, sourceType: 'External'})}
                                    className="text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-sm font-bold text-slate-700">Extern (Leverancier)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="sourceType"
                                    checked={editingItem.sourceType === 'Internal'}
                                    onChange={() => setEditingItem({...editingItem, sourceType: 'Internal'})}
                                    className="text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-sm font-bold text-slate-700">Intern (Afdeling)</span>
                            </label>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                 {editingItem.sourceType === 'External' ? 'Leverancier Naam' : 'Afdeling Naam'}
                             </label>
                             <div className="relative">
                                 {editingItem.sourceType === 'External' ? <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/> : <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>}
                                 <input 
                                     className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm bg-white"
                                     placeholder={editingItem.sourceType === 'External' ? "bv. Makro, Hanos" : "bv. Keuken, Technische Dienst"}
                                     value={editingItem.sourceName || ''}
                                     onChange={(e) => setEditingItem({...editingItem, sourceName: e.target.value})}
                                     list="supplier-options"
                                     required
                                     autoComplete="off"
                                 />
                                 <datalist id="supplier-options" key={existingSuppliers.join(',')}>
                                     {existingSuppliers.map(sup => <option key={sup} value={sup} />)}
                                 </datalist>
                             </div>
                        </div>
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
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Huidige Voorraad</label>
                            <input 
                                type="number"
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={editingItem.currentStock}
                                onChange={(e) => setEditingItem({...editingItem, currentStock: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eenheid</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                placeholder="bv. Stuks, Dozen"
                                value={editingItem.unit || ''}
                                onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                                list="unit-options"
                            />
                            <datalist id="unit-options">
                                <option value="Stuks"/>
                                <option value="Dozen"/>
                                <option value="Zakken"/>
                                <option value="Flessen"/>
                                <option value="Pakken"/>
                            </datalist>
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

            {/* COUNT SELECTION MODAL */}
            <Modal isOpen={isCountSelectionOpen} onClose={() => setIsCountSelectionOpen(false)} title="Telling Starten">
                <div className="space-y-4">
                    <p className="text-slate-500 text-sm">Wat wil je gaan tellen?</p>
                    <button 
                        onClick={() => startGeneralCount('All')}
                        className="w-full p-4 border rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors group"
                    >
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600">Alles Tellen</span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600"/>
                    </button>
                    <button 
                        onClick={() => startGeneralCount('Internal')}
                        className="w-full p-4 border rounded-xl flex items-center justify-between hover:bg-amber-50 hover:border-amber-200 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Building2 size={16}/></div>
                            <span className="font-bold text-slate-900 group-hover:text-amber-800">Alleen Interne Items</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-800"/>
                    </button>
                    <button 
                        onClick={() => startGeneralCount('External')}
                        className="w-full p-4 border rounded-xl flex items-center justify-between hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Truck size={16}/></div>
                            <span className="font-bold text-slate-900 group-hover:text-blue-800">Alleen Externe Items (Leveranciers)</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-800"/>
                    </button>
                </div>
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

            {/* CATEGORY MANAGEMENT MODAL */}
            <Modal isOpen={isCategoryModalOpen} onClose={() => { setIsCategoryModalOpen(false); setCategoryToRename(null); setNewCategoryName(''); }} title="Categorieën Beheren">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {categoryToRename ? (
                        <div className="animate-in fade-in">
                            <div className="mb-4 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                <p className="text-sm text-blue-800">Je staat op het punt om <strong>'{categoryToRename}'</strong> te hernoemen. Dit past alle artikelen in deze categorie aan.</p>
                            </div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nieuwe Naam</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                autoFocus
                                placeholder="Nieuwe naam..."
                            />
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setCategoryToRename(null)} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50">Annuleren</button>
                                <button onClick={handleRenameCategory} disabled={!newCategoryName.trim()} className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-sm disabled:opacity-50">Opslaan</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 mb-2">Klik op het potloodje om te hernoemen, of prullenbak om te verwijderen.</p>
                            {activeCategories.map(([cat, count]) => (
                                <div key={cat} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                                    <div>
                                        <span className="font-bold text-slate-800 text-sm">{cat}</span>
                                        <span className="text-xs text-slate-400 ml-2">({count} items)</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => { setCategoryToRename(cat); setNewCategoryName(cat); }}
                                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                            title="Hernoemen"
                                        >
                                            <Edit2 size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteCategoryClick(cat)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Verwijderen"
                                            disabled={cat === 'Algemeen'}
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
            
            {/* DELETE CATEGORY CONFIRMATION MODAL */}
            <Modal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} title="Categorie Verwijderen">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20}/>
                        <div>
                             <h4 className="text-sm font-bold text-red-900">Let op!</h4>
                             <p className="text-sm text-red-800 mt-1">
                                 Weet je zeker dat je de categorie <strong>'{categoryToDelete}'</strong> wilt verwijderen?
                             </p>
                             <p className="text-xs text-red-700 mt-2">
                                 Alle artikelen in deze categorie worden verplaatst naar <strong>'Algemeen'</strong>.
                             </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                         <button 
                             onClick={() => setCategoryToDelete(null)}
                             className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors"
                         >
                             Annuleren
                         </button>
                         <button 
                             onClick={executeDeleteCategory}
                             className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 shadow-sm transition-colors"
                         >
                             Verwijderen & Verplaatsen
                         </button>
                    </div>
                </div>
            </Modal>

            {/* PLACE ORDER MODAL */}
            <Modal 
                isOpen={isOrderModalOpen} 
                onClose={() => setIsOrderModalOpen(false)} 
                title={activeOrderTarget?.orderType === 'External' ? 'Bestelling Plaatsen' : 'Intern Aanvragen'}
            >
                <div className="space-y-6">
                    {activeOrderTarget?.orderType === 'External' ? (
                        <>
                            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                                <h4 className="font-bold text-teal-900 text-sm mb-2 flex items-center gap-2">
                                    <Truck size={16}/> {activeOrderTarget.supplier}
                                </h4>
                                <p className="text-teal-700 text-xs leading-relaxed">
                                    Upload de bestelbon (PDF/Excel) om de bestelling te bevestigen.
                                </p>
                            </div>
                            
                            <div 
                                onClick={() => !isUploadingOrder && !noSlipAvailable && orderInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all group ${noSlipAvailable ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-slate-300 cursor-pointer hover:border-teal-500 hover:bg-slate-50'}`}
                            >
                                <input type="file" ref={orderInputRef} className="hidden" accept=".pdf,.jpg,.png,.xlsx" onChange={handleOrderFileUpload} disabled={noSlipAvailable} />
                                {orderFile ? (
                                    <div className="text-center">
                                        <FileText size={32} className="text-teal-600 mx-auto mb-2"/>
                                        <p className="font-bold text-slate-900">{orderFile.name}</p>
                                        <p className="text-xs text-slate-500">Klik om te wijzigen</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Upload size={32} className="text-slate-400 mx-auto mb-2 group-hover:text-teal-600 transition-colors"/>
                                        <p className="font-bold text-slate-700">Bestelbon Uploaden</p>
                                        <p className="text-xs text-slate-400">PDF, Excel of Afbeelding</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 px-1">
                                <input 
                                    type="checkbox" 
                                    id="noSlip"
                                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                    checked={noSlipAvailable}
                                    onChange={(e) => {
                                        setNoSlipAvailable(e.target.checked);
                                        if(e.target.checked) setOrderFile(null);
                                    }}
                                />
                                <label htmlFor="noSlip" className="text-sm font-bold text-slate-600 cursor-pointer select-none">
                                    Geen bestelbon beschikbaar (Telefonisch/Mail)
                                </label>
                            </div>

                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                <div className="mt-0.5"><ShieldCheck size={18} className="text-red-600"/></div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                            checked={managementApproved}
                                            onChange={(e) => setManagementApproved(e.target.checked)}
                                        />
                                        <span className="text-sm font-bold text-red-800 select-none">
                                            Ik bevestig dat er toestemming is van het management om deze bestelling te plaatsen.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 text-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 size={32}/>
                            </div>
                            <h4 className="font-bold text-amber-900 text-lg mb-2">Aanvraag voor {activeOrderTarget?.supplier}</h4>
                            <p className="text-amber-800 text-sm mb-4">
                                Je staat op het punt deze artikelen intern door te geven aan de afdeling. <br/>Zij zullen de verdere afhandeling verzorgen.
                            </p>
                        </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <div className="mt-0.5"><Mail size={18} className="text-blue-600"/></div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={ccConfirmed}
                                    onChange={(e) => setCcConfirmed(e.target.checked)}
                                />
                                <span className="text-sm font-bold text-blue-800 select-none">
                                    Lars, Janique en Mila zijn toegevoegd aan de CC.
                                </span>
                            </label>
                            <p className="text-xs text-blue-600 mt-1 ml-6">Zij ontvangen automatisch een kopie van deze bestelling/aanvraag.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Annuleren</button>
                        <button 
                            onClick={handleConfirmOrder} 
                            disabled={
                                (!ccConfirmed) ||
                                (activeOrderTarget?.orderType === 'External' && (!managementApproved || (!orderFile && !noSlipAvailable))) ||
                                isUploadingOrder
                            }
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isUploadingOrder ? 'Bezig...' : (activeOrderTarget?.orderType === 'External' ? 'Bestelling Bevestigen' : 'Aanvraag Versturen')} <Send size={16}/>
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default StockControlPage;
