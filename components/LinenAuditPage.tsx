import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Truck, Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle, 
    RefreshCw, Download, FileSpreadsheet, X, MousePointerClick, Calendar, Save, History, Trash2, Eye, ArrowRight, Printer, AlertOctagon,
    BarChart3, TrendingUp, Filter, Search, PieChart, ArrowUpRight, ArrowDownRight, LayoutDashboard
} from 'lucide-react';
import { Employee } from '../types';
import { Modal } from './Modal';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell 
} from 'recharts';

// --- PDF.JS INITIALIZATION FIX ---
// Handle potential differences in import structure between Dev and Prod (ESM/CJS)
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// DYNAMIC WORKER LOADING
// Instead of hardcoding the version, we use the version reported by the library itself.
// This prevents "API version does not match Worker version" errors if the package updates.
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const version = pdfjs.version;
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

interface LinenAuditPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

interface LinenItem {
    id: string; // Article Number
    name: string;
    ordered: number;
    delivered: number;
    locations?: string[];
}

interface SavedAudit {
    id: string;
    date: string;
    timestamp?: number; // Added for easier filtering
    deliveryDate: string;
    items: LinenItem[];
    totalOrdered: number;
    totalDelivered: number;
}

const LinenAuditPage: React.FC<LinenAuditPageProps> = ({ currentUser, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'history' | 'analytics'>('new');
    
    // Upload State
    const [orderFile, setOrderFile] = useState<File | null>(null);
    const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
    
    // Analysis State
    const [auditData, setAuditData] = useState<LinenItem[]>([]);
    const [detectedDate, setDetectedDate] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Drag & Drop State
    const [isDraggingOrder, setIsDraggingOrder] = useState(false);
    const [isDraggingDelivery, setIsDraggingDelivery] = useState(false);
    
    // History State
    const [savedAudits, setSavedAudits] = useState<SavedAudit[]>([]);
    const [auditToDelete, setAuditToDelete] = useState<string | null>(null);

    // Analytics State
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedProductId, setSelectedProductId] = useState<string>('All');

    const excelInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    // Load history on mount & Init Date Range
    useEffect(() => {
        const saved = localStorage.getItem('hrms_linen_audits');
        if (saved) {
            try {
                setSavedAudits(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load history", e);
            }
        }

        // Default range: Last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    }, []);

    // --- PARSING LOGIC ---

    const processFiles = async () => {
        if (!orderFile) {
            onShowToast("Upload eerst een bestellijst (Excel).");
            return;
        }
        
        setIsProcessing(true);
        setAuditData([]); 
        setDetectedDate('');

        try {
            const orderItems = await parseExcelOrder(orderFile);
            const { deliveryMap, deliveryDate } = await parsePDFDeliveries(deliveryFiles);
            
            setDetectedDate(deliveryDate);
            const mergedData = mergeAuditData(orderItems, deliveryMap);
            setAuditData(mergedData);
            
            onShowToast("Audit succesvol berekend!");
        } catch (error: any) {
            console.error("Audit error:", error);
            const msg = error instanceof Error ? error.message : 'Onbekende fout';
            onShowToast(`Fout bij verwerken: ${msg}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const parseExcelOrder = (file: File): Promise<Map<string, LinenItem>> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    const itemsMap = new Map<string, LinenItem>();

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i] as any[];
                        if (!row || row.length < 2) continue;
                        const id = String(row[0] || '').trim();
                        const name = String(row[1] || '').trim();
                        let ordered = 0;
                        const qtyVal = row[9]; // Col J
                        
                        if (typeof qtyVal === 'number') ordered = qtyVal;
                        else if (typeof qtyVal === 'string') ordered = parseFloat(qtyVal.replace(',', '.'));

                        if (id && /^\d+$/.test(id) && name) {
                            const safeOrdered = isNaN(ordered) ? 0 : ordered;
                            if (itemsMap.has(id)) {
                                itemsMap.get(id)!.ordered += safeOrdered;
                            } else {
                                itemsMap.set(id, { id, name, ordered: safeOrdered, delivered: 0 });
                            }
                        }
                    }
                    if (itemsMap.size === 0) reject(new Error("Geen geldige regels gevonden in Excel."));
                    else resolve(itemsMap);
                } catch (err: any) { reject(err instanceof Error ? err : new Error('Excel parsing failed')); }
            };
            reader.onerror = () => reject(new Error("Fout bij lezen Excel bestand"));
            reader.readAsArrayBuffer(file);
        });
    };

    const parsePDFDeliveries = async (files: File[]): Promise<{ deliveryMap: Map<string, number>, deliveryDate: string }> => {
        const deliveryMap = new Map<string, number>();
        let foundDate = '';
        const IGNORE_IDS = ['7772', '11172', '0524', '01469238', '2025', '6532', '6503', '31100']; 

        if (files.length === 0) return { deliveryMap, deliveryDate: '' };

        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const version = pdfjs.version;
                
                // Use dynamic versioning for CMaps as well to ensure matching resources
                const loadingTask = pdfjs.getDocument({ 
                    data: arrayBuffer,
                    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
                    cMapPacked: true,
                    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`
                });
                
                const pdf = await loadingTask.promise;
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    if (!textContent || !textContent.items || textContent.items.length === 0) {
                        continue;
                    }

                    // Improved Line Grouping
                    const lines: { y: number, items: { x: number, str: string }[] }[] = [];
                    const tolerance = 8; // Increased tolerance

                    for (const item of (textContent.items as any[])) {
                        // Normalize spaces
                        const str = (item.str || '').replace(/\u00A0/g, ' ').trim();
                        if (!str) continue; 
                        
                        const y = item.transform[5]; 
                        const x = item.transform[4]; 
                        
                        let line = lines.find(l => Math.abs(l.y - y) < tolerance);
                        if (!line) { 
                            line = { y, items: [] }; 
                            lines.push(line); 
                        }
                        line.items.push({ x, str });
                    }
                    
                    // Sort lines top to bottom
                    lines.sort((a, b) => b.y - a.y);

                    for (const line of lines) {
                        // Sort items left to right
                        line.items.sort((a, b) => a.x - b.x);
                        const lineText = line.items.map(item => item.str).join(' ').trim();
                        
                        // Date Extraction
                        if (!foundDate && lineText.includes('Afleverdatum')) {
                            const dateMatch = lineText.match(/(\d{1,2}-\d{1,2}-\d{4})/);
                            if (dateMatch) {
                                foundDate = dateMatch[0];
                            }
                        }
                        
                        if (lineText.includes('Hardenberg') || lineText.includes('Frankrijkweg') || lineText.includes('Debiteurnummer') || lineText.includes('Totaal')) continue;

                        let foundId = '';
                        let foundQty = 0;

                        // Strategy 1: Check First and Last item
                        if (line.items.length >= 2) {
                            const firstStr = line.items[0].str.trim();
                            const lastStr = line.items[line.items.length - 1].str.trim();
                            
                            if (/^\d{4,8}$/.test(firstStr) && /^\d+$/.test(lastStr)) {
                                foundId = firstStr;
                                foundQty = parseInt(lastStr, 10);
                            }
                        }

                        // Strategy 2: Regex fallback
                        if (!foundId) {
                            const match = lineText.match(/^(\d{4,8})\s+.*?\s+(\d+)$/);
                            if (match) { 
                                foundId = match[1]; 
                                foundQty = parseInt(match[2], 10); 
                            }
                        }

                        if (foundId && foundQty > 0) {
                            if (IGNORE_IDS.includes(foundId)) continue; 
                            const current = deliveryMap.get(foundId) || 0;
                            deliveryMap.set(foundId, current + foundQty);
                        }
                    }
                }
            } catch (e: any) { 
                console.error(`Error parsing PDF ${file.name}:`, e);
            }
        }
        return { deliveryMap, deliveryDate: foundDate };
    };

    const mergeAuditData = (orderMap: Map<string, LinenItem>, deliveryMap: Map<string, number>): LinenItem[] => {
        const result: LinenItem[] = [];
        orderMap.forEach((item, id) => {
            const delivered = deliveryMap.get(id) || 0;
            deliveryMap.delete(id); 
            let finalName = item.name;
            if (id === '1022') finalName = 'Theedoek';
            if (finalName.toLowerCase().includes('badjas')) return;
            result.push({ ...item, name: finalName, delivered });
        });
        deliveryMap.forEach((qty, id) => {
            let name = 'Onbekend Artikel';
            if (id === '1022') name = 'Theedoek';
            if (name.toLowerCase().includes('badjas')) return;
            result.push({ id, name, ordered: 0, delivered: qty });
        });
        return result.sort((a, b) => a.id.localeCompare(b.id));
    };

    // --- HISTORY MANAGEMENT ---

    const handleSaveAudit = () => {
        const newRecord: SavedAudit = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toLocaleDateString('nl-NL', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'}),
            timestamp: Date.now(),
            deliveryDate: detectedDate || 'Onbekend',
            items: auditData,
            totalOrdered: auditData.reduce((acc, i) => acc + i.ordered, 0),
            totalDelivered: auditData.reduce((acc, i) => acc + i.delivered, 0)
        };

        const updatedHistory = [newRecord, ...savedAudits];
        setSavedAudits(updatedHistory);
        localStorage.setItem('hrms_linen_audits', JSON.stringify(updatedHistory));
        onShowToast("Audit opgeslagen in geschiedenis.");
    };

    const confirmDeleteAudit = () => {
        if (auditToDelete) {
            const updatedHistory = savedAudits.filter(a => a.id !== auditToDelete);
            setSavedAudits(updatedHistory);
            localStorage.setItem('hrms_linen_audits', JSON.stringify(updatedHistory));
            onShowToast("Audit verwijderd.");
            setAuditToDelete(null);
        }
    };

    const handleLoadAudit = (audit: SavedAudit) => {
        setAuditData(audit.items);
        setDetectedDate(audit.deliveryDate);
        setActiveTab('new');
        onShowToast(`Audit van ${audit.date} geladen.`);
    };

    // --- UI EVENT HANDLERS ---

    const handleOrderDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDraggingOrder(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) setOrderFile(file);
        else onShowToast("Alleen Excel bestanden (.xlsx, .xls) toegestaan.");
    };

    const handleDeliveryDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDraggingDelivery(false);
        const files = Array.from(e.dataTransfer.files).filter((f: File) => f.name.toLowerCase().endsWith('.pdf'));
        if (files.length > 0) setDeliveryFiles(prev => [...prev, ...files]);
        else onShowToast("Sleep PDF bestanden hierheen.");
    };

    const resetAudit = () => {
        setOrderFile(null); setDeliveryFiles([]); setAuditData([]); setDetectedDate('');
        if (excelInputRef.current) excelInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    };

    // --- ANALYTICS LOGIC ---

    const getFilteredAudits = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return savedAudits;
        
        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime() + (24 * 60 * 60 * 1000); // Include end date

        return savedAudits.filter(audit => {
            // Use timestamp if available, else parse date string (fallback)
            let auditTime = audit.timestamp;
            if (!auditTime) {
                // Try parse deliveryDate dd-mm-yyyy
                if (audit.deliveryDate && audit.deliveryDate !== 'Onbekend') {
                    const parts = audit.deliveryDate.split('-');
                    if (parts.length === 3) auditTime = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                }
            }
            if (!auditTime) return true; // Include if unknown date
            return auditTime >= start && auditTime <= end;
        });
    }, [savedAudits, dateRange]);

    const uniqueProducts = useMemo(() => {
        const products = new Map<string, string>();
        savedAudits.forEach(audit => {
            audit.items.forEach(item => products.set(item.id, item.name));
        });
        return Array.from(products.entries()).map(([id, name]) => ({ id, name }));
    }, [savedAudits]);

    const analyticsData = useMemo(() => {
        const filtered = getFilteredAudits;
        
        // 1. KPIs
        const totalAudits = filtered.length;
        let totalOrderedSum = 0;
        let totalDeliveredSum = 0;
        
        filtered.forEach(a => {
            totalOrderedSum += a.totalOrdered;
            totalDeliveredSum += a.totalDelivered;
        });
        
        const fulfilmentRate = totalOrderedSum > 0 ? Math.round((totalDeliveredSum / totalOrderedSum) * 100) : 0;
        const netDifference = totalDeliveredSum - totalOrderedSum;

        // 2. Trend Data
        const trendData = filtered.map(a => ({
            date: a.deliveryDate !== 'Onbekend' ? a.deliveryDate.slice(0, 5) : '?', // dd-mm
            timestamp: a.timestamp || 0,
            Besteld: a.totalOrdered,
            Geleverd: a.totalDelivered
        })).sort((a,b) => a.timestamp - b.timestamp);

        // 3. Deviations Logic
        const itemStats = new Map<string, { name: string, diffSum: number, absDiffSum: number }>();
        
        filtered.forEach(audit => {
            audit.items.forEach(item => {
                const diff = item.delivered - item.ordered;
                const current = itemStats.get(item.id) || { name: item.name, diffSum: 0, absDiffSum: 0 };
                itemStats.set(item.id, {
                    name: item.name,
                    diffSum: current.diffSum + diff,
                    absDiffSum: current.absDiffSum + Math.abs(diff)
                });
            });
        });

        const topDeviations = Array.from(itemStats.values())
            .sort((a, b) => b.absDiffSum - a.absDiffSum)
            .slice(0, 5)
            .map(stat => ({
                name: stat.name.length > 15 ? stat.name.substring(0, 15) + '...' : stat.name,
                Tekort: stat.diffSum < 0 ? Math.abs(stat.diffSum) : 0,
                Overschot: stat.diffSum > 0 ? stat.diffSum : 0
            }));

        // 4. Product Specific Trend
        let productTrend: any[] = [];
        if (selectedProductId !== 'All') {
            productTrend = filtered.map(a => {
                const item = a.items.find(i => i.id === selectedProductId);
                return {
                    date: a.deliveryDate !== 'Onbekend' ? a.deliveryDate.slice(0, 5) : '?',
                    timestamp: a.timestamp || 0,
                    Besteld: item ? item.ordered : 0,
                    Geleverd: item ? item.delivered : 0
                };
            }).sort((a,b) => a.timestamp - b.timestamp);
        }

        return { totalAudits, fulfilmentRate, netDifference, trendData, topDeviations, productTrend };
    }, [getFilteredAudits, selectedProductId]);

    // Totals for current view (New Audit)
    const totalOrderedNow = auditData.reduce((acc, item) => acc + item.ordered, 0);
    const totalDeliveredNow = auditData.reduce((acc, item) => acc + item.delivered, 0);
    const diffTotalNow = totalDeliveredNow - totalOrderedNow;

    return (
        <>
        {/* SCREEN CONTENT (Hidden when printing) */}
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] print:hidden">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 rounded-xl">
                            <Truck className="text-teal-600" size={32} />
                        </div>
                        Linnen Audit
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Controleer leveringen en beheer afwijkingen.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                    {[
                        { id: 'new', label: 'Nieuwe Audit', icon: RefreshCw },
                        { id: 'analytics', label: 'Rapportage', icon: PieChart },
                        { id: 'history', label: 'Geschiedenis', icon: History }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                                activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB 1: NEW AUDIT */}
            {activeTab === 'new' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Upload Section */}
                    {auditData.length === 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                            {/* Order Input Card */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileSpreadsheet className="text-blue-600"/> 1. Bestelling (Excel)
                                </h3>
                                
                                {!orderFile ? (
                                    <div 
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOrder(true); }}
                                        onDragLeave={() => setIsDraggingOrder(false)}
                                        onDrop={handleOrderDrop}
                                        onClick={() => excelInputRef.current?.click()}
                                        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 cursor-pointer transition-all group ${
                                            isDraggingOrder 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
                                        }`}
                                    >
                                        <Upload className={`mb-3 transition-colors ${isDraggingOrder ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} size={32} />
                                        <p className="font-bold text-slate-600 text-sm">Sleep Excel bestand hierheen</p>
                                        <p className="text-xs text-slate-400 mt-1">of klik om te bladeren (.xlsx)</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex flex-col items-center justify-center relative">
                                        <button 
                                            onClick={() => { setOrderFile(null); if(excelInputRef.current) excelInputRef.current.value=''; }}
                                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
                                        >
                                            <X size={20}/>
                                        </button>
                                        <FileSpreadsheet size={48} className="text-blue-500 mb-4" />
                                        <p className="font-bold text-slate-800 text-lg">{orderFile.name}</p>
                                        <p className="text-xs text-blue-600 font-bold mt-1 uppercase tracking-wide">Bestand Gereed</p>
                                    </div>
                                )}
                                <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => { if(e.target.files?.[0]) setOrderFile(e.target.files[0]); }} />
                            </div>

                            {/* Deliveries Input Card */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileText className="text-red-600"/> 2. Leveringen (PDF)
                                </h3>
                                
                                <div className="flex-1 flex flex-col gap-4">
                                    <div 
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingDelivery(true); }}
                                        onDragLeave={() => setIsDraggingDelivery(false)}
                                        onDrop={(e) => {
                                            e.preventDefault(); setIsDraggingDelivery(false);
                                            const files = Array.from(e.dataTransfer.files).filter((f: File) => f.name.toLowerCase().endsWith('.pdf'));
                                            if (files.length > 0) setDeliveryFiles(prev => [...prev, ...files]);
                                            else onShowToast("Sleep PDF bestanden hierheen.");
                                        }}
                                        onClick={() => pdfInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all group min-h-[160px] ${
                                            isDraggingDelivery 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-slate-300 bg-slate-50 hover:border-red-400 hover:bg-red-50/30'
                                        }`}
                                    >
                                        <Upload className={`mb-2 transition-colors ${isDraggingDelivery ? 'text-red-600' : 'text-slate-400 group-hover:text-red-500'}`} size={24} />
                                        <p className="font-bold text-slate-600 text-sm">Sleep PDF leverbonnen hierheen</p>
                                        <p className="text-xs text-slate-400">Je kunt meerdere bestanden tegelijk toevoegen</p>
                                    </div>
                                    <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" multiple onChange={(e) => { if(e.target.files) setDeliveryFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />

                                    {/* File List */}
                                    {deliveryFiles.length > 0 && (
                                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar bg-white rounded-lg">
                                            {deliveryFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm shadow-sm animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <FileText size={16} className="text-red-500 flex-shrink-0"/>
                                                        <span className="truncate font-medium text-slate-700">{file.name}</span>
                                                    </div>
                                                    <button onClick={() => setDeliveryFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded">
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Bar */}
                    {auditData.length === 0 && (
                        <div className="flex justify-center mb-10">
                            <button 
                                onClick={processFiles}
                                disabled={!orderFile || deliveryFiles.length === 0 || isProcessing}
                                className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-lg"
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />}
                                {isProcessing ? 'Analyseren...' : 'Start Audit'}
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {auditData.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                            {/* Summary Header */}
                            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Audit Resultaten</h2>
                                        {detectedDate && (
                                            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                                <Calendar size={14}/> Leverdatum: <span className="font-bold text-slate-700">{detectedDate}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={resetAudit} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm shadow-sm">
                                            Nieuw
                                        </button>
                                        <button onClick={handleSaveAudit} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 text-sm shadow-sm flex items-center gap-2">
                                            <Save size={16}/> Opslaan
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Totaal Besteld</span>
                                        <span className="text-2xl font-bold text-slate-900">{totalOrderedNow}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Totaal Geleverd</span>
                                        <span className={`text-2xl font-bold ${totalDeliveredNow < totalOrderedNow ? 'text-red-600' : 'text-green-600'}`}>{totalDeliveredNow}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Verschil</span>
                                        <span className={`text-2xl font-bold ${diffTotalNow === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                            {diffTotalNow > 0 ? '+' : ''}{diffTotalNow}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Art. Nr</th>
                                            <th className="px-6 py-4">Omschrijving</th>
                                            <th className="px-6 py-4 text-center">Besteld</th>
                                            <th className="px-6 py-4 text-center">Geleverd</th>
                                            <th className="px-6 py-4 text-center">Verschil</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {auditData.map((item) => {
                                            const diff = item.delivered - item.ordered;
                                            let statusClass = 'bg-green-50 text-green-700 border-green-100';
                                            let statusText = 'Correct';
                                            let rowClass = 'hover:bg-slate-50';

                                            if (diff < 0) {
                                                statusClass = 'bg-red-50 text-red-700 border-red-100 font-bold';
                                                statusText = 'Tekort';
                                                rowClass = 'bg-red-50/30 hover:bg-red-50/50';
                                            } else if (diff > 0) {
                                                statusClass = 'bg-amber-50 text-amber-700 border-amber-100 font-bold';
                                                statusText = 'Overschot';
                                                rowClass = 'bg-amber-50/30 hover:bg-amber-50/50';
                                            }

                                            return (
                                                <tr key={item.id} className={`${rowClass} transition-colors`}>
                                                    <td className="px-6 py-4 font-mono text-slate-600">{item.id}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                                                    <td className="px-6 py-4 text-center text-slate-600">{item.ordered}</td>
                                                    <td className="px-6 py-4 text-center text-slate-900 font-bold">{item.delivered}</td>
                                                    <td className={`px-6 py-4 text-center font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                                        {diff > 0 ? '+' : ''}{diff}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide border ${statusClass}`}>
                                                            {statusText}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                                <button 
                                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={18} /> Print Rapport
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ANALYTICS (NEW) */}
            {activeTab === 'analytics' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                    
                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2 text-slate-500 text-sm font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                <Calendar size={16}/>
                                <input 
                                    type="date" 
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                    className="bg-transparent border-none focus:ring-0 text-slate-700 w-28"
                                />
                                <span className="text-slate-300">-</span>
                                <input 
                                    type="date" 
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                    className="bg-transparent border-none focus:ring-0 text-slate-700 w-28"
                                />
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select 
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="All">Alle Producten</option>
                                    {uniqueProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Totaal Audits</h3>
                            <div className="flex items-end justify-between">
                                <span className="text-4xl font-bold text-slate-900">{analyticsData.totalAudits}</span>
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Truck size={20}/></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fulfilment Rate</h3>
                            <div className="flex items-end justify-between">
                                <span className="text-4xl font-bold text-slate-900">{analyticsData.fulfilmentRate}%</span>
                                <div className={`p-2 rounded-lg ${analyticsData.fulfilmentRate >= 95 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {analyticsData.fulfilmentRate >= 95 ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Netto Verschil</h3>
                            <div className="flex items-end justify-between">
                                <span className={`text-4xl font-bold ${analyticsData.netDifference > 0 ? 'text-green-600' : analyticsData.netDifference < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                    {analyticsData.netDifference > 0 ? '+' : ''}{analyticsData.netDifference}
                                </span>
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><AlertOctagon size={20}/></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* CHART 1: Delivery Trend */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="text-teal-600"/> Levering Trend
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analyticsData.trendData}>
                                        <defs>
                                            <linearGradient id="colorOrd" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorDel" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                        <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                        <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                        <Legend />
                                        <Area type="monotone" dataKey="Besteld" stroke="#94a3b8" fillOpacity={1} fill="url(#colorOrd)" strokeDasharray="3 3"/>
                                        <Area type="monotone" dataKey="Geleverd" stroke="#0d9488" fillOpacity={1} fill="url(#colorDel)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2: Top Deviations */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <AlertTriangle className="text-amber-500"/> Top 5 Afwijkingen
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData.topDeviations} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                                        <XAxis type="number" hide/>
                                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                        <Legend />
                                        <Bar dataKey="Tekort" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} stackId="a" />
                                        <Bar dataKey="Overschot" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} stackId="a" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* CHART 3: Product Deep Dive (Conditional) */}
                    {selectedProductId !== 'All' && analyticsData.productTrend.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Search className="text-blue-600"/> Detail Analyse: {uniqueProducts.find(p=>p.id===selectedProductId)?.name}
                                </h3>
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analyticsData.productTrend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                        <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                        <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                        <Legend />
                                        <Line type="monotone" dataKey="Besteld" stroke="#94a3b8" strokeWidth={2} dot={{r:4}}/>
                                        <Line type="monotone" dataKey="Geleverd" stroke="#0d9488" strokeWidth={3} dot={{r:4}}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: HISTORY (Keep existing) */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Aangemaakt Op</th>
                                    <th className="px-6 py-4">Leverdatum</th>
                                    <th className="px-6 py-4">Items</th>
                                    <th className="px-6 py-4 text-center">Totaal Besteld</th>
                                    <th className="px-6 py-4 text-center">Totaal Geleverd</th>
                                    <th className="px-6 py-4 text-right">Acties</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {savedAudits.map(audit => (
                                    <tr key={audit.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900">{audit.date}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                                <Calendar size={12}/> {audit.deliveryDate}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{audit.items.length} regels</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{audit.totalOrdered}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-900">{audit.totalDelivered}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleLoadAudit(audit)}
                                                    className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-200 rounded-lg transition-colors shadow-sm"
                                                    title="Bekijk & Open"
                                                >
                                                    <Eye size={16}/>
                                                </button>
                                                <button 
                                                    onClick={() => setAuditToDelete(audit.id)}
                                                    className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors shadow-sm"
                                                    title="Verwijder"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {savedAudits.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                                            Nog geen opgeslagen audits.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for Deletion */}
            <Modal
                isOpen={!!auditToDelete}
                onClose={() => setAuditToDelete(null)}
                title="Audit Verwijderen"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                        <AlertOctagon className="text-red-600 shrink-0 mt-0.5" size={20}/>
                        <div>
                            <h4 className="font-bold text-red-900 text-sm">Weet je het zeker?</h4>
                            <p className="text-sm text-red-700 mt-1">
                                Deze actie kan niet ongedaan worden gemaakt. De opgeslagen audit en alle bijbehorende data worden permanent verwijderd.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={() => setAuditToDelete(null)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50"
                        >
                            Annuleren
                        </button>
                        <button 
                            onClick={confirmDeleteAudit}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm"
                        >
                            Verwijderen
                        </button>
                    </div>
                </div>
            </Modal>

        </div>

        {/* PRINT TEMPLATE (Only visible when printing) */}
        <div className="hidden print:block font-sans bg-white text-black text-sm">
            <style>{`
                @media print {
                    @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>

            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-800">
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight text-slate-900 mb-1">Linnen Audit</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Rapportage Verschillenanalyse</p>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-xl text-slate-900">Sanadome Nijmegen</h2>
                    <p className="text-slate-500 text-xs">Weg door Jonkerbos 90</p>
                    <p className="text-slate-500 text-xs">6532 SZ Nijmegen</p>
                </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-200">
                <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Geanalyseerd door</span>
                    <span className="font-bold text-slate-900 block">{currentUser.name}</span>
                    <span className="text-xs text-slate-500">{new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Leverdatum (PDF)</span>
                    <span className="font-bold text-slate-900 block">{detectedDate || 'Onbekend'}</span>
                </div>
                <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                    <span className={`font-bold block ${diffTotalNow === 0 ? 'text-green-700' : 'text-slate-900'}`}>
                        {diffTotalNow === 0 ? 'CORRECT' : diffTotalNow > 0 ? `+${diffTotalNow} Overschot` : `${diffTotalNow} Tekort`}
                    </span>
                </div>
            </div>

            {/* Main Table */}
            <div className="mb-8">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="border-b-2 border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2 w-[15%]">Art. Nr</th>
                            <th className="py-2 w-[45%]">Omschrijving</th>
                            <th className="py-2 w-[10%] text-center">Besteld</th>
                            <th className="py-2 w-[10%] text-center">Geleverd</th>
                            <th className="py-2 w-[20%] text-right">Verschil</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {auditData.map((item, index) => {
                            const diff = item.delivered - item.ordered;
                            const isIssue = diff !== 0;
                            return (
                                <tr key={item.id} className={`border-b border-slate-100 ${isIssue ? 'bg-slate-50 font-bold' : ''}`}>
                                    <td className="py-2 pr-2 font-mono text-slate-500">{item.id}</td>
                                    <td className="py-2 pr-2 truncate">{item.name}</td>
                                    <td className="py-2 px-2 text-center">{item.ordered}</td>
                                    <td className="py-2 px-2 text-center">{item.delivered}</td>
                                    <td className="py-2 pl-2 text-right">
                                        {isIssue ? (
                                            <span className={`inline-block px-2 py-0.5 rounded ${diff < 0 ? 'bg-black text-white' : 'border border-black'}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Box (Avoid Page Break inside if possible) */}
            <div className="flex justify-end mb-12 break-inside-avoid">
                <div className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 text-sm uppercase tracking-wider">Samenvatting</h3>
                    <div className="flex justify-between mb-2 text-xs">
                        <span className="text-slate-500">Totaal Besteld:</span>
                        <span className="font-bold">{totalOrderedNow}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-xs">
                        <span className="text-slate-500">Totaal Geleverd:</span>
                        <span className="font-bold">{totalDeliveredNow}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                        <span>Netto Verschil:</span>
                        <span className={diffTotalNow < 0 ? 'text-red-600' : diffTotalNow > 0 ? 'text-slate-900' : 'text-green-600'}>
                            {diffTotalNow > 0 ? '+' : ''}{diffTotalNow}
                        </span>
                    </div>
                </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-12 pt-8 border-t-2 border-slate-900 break-inside-avoid">
                <div>
                    <div className="h-16 border-b border-slate-300 mb-2"></div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Handtekening Manager</span>
                </div>
                <div>
                    <div className="h-16 border-b border-slate-300 mb-2"></div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Datum & Plaats</span>
                </div>
            </div>
        </div>
        </>
    );
};

export default LinenAuditPage;