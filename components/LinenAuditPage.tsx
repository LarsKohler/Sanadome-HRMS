
import React, { useState, useRef } from 'react';
import { 
    Truck, Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle, 
    RefreshCw, Download, FileSpreadsheet, X, MousePointerClick 
} from 'lucide-react';
import { Employee } from '../types';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
// Using CDN to ensure availability without complex build steps
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

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

const LinenAuditPage: React.FC<LinenAuditPageProps> = ({ currentUser, onShowToast }) => {
    const [orderFile, setOrderFile] = useState<File | null>(null);
    const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
    
    const [auditData, setAuditData] = useState<LinenItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Drag & Drop State
    const [isDraggingOrder, setIsDraggingOrder] = useState(false);
    const [isDraggingDelivery, setIsDraggingDelivery] = useState(false);
    
    const excelInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    // --- PARSING LOGIC ---

    const processFiles = async () => {
        if (!orderFile) {
            onShowToast("Upload eerst een bestellijst (Excel).");
            return;
        }
        
        setIsProcessing(true);
        setAuditData([]); // Reset

        try {
            console.log("Starting processing...");
            
            // 1. Parse Excel Order
            const orderItems = await parseExcelOrder(orderFile);
            console.log("Excel parsed:", orderItems.size, "items");
            
            // 2. Parse PDF Deliveries
            const deliveredItems = await parsePDFDeliveries(deliveryFiles);
            console.log("PDFs parsed:", deliveredItems.size, "unique items found");

            // 3. Merge Data
            const mergedData = mergeAuditData(orderItems, deliveredItems);
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
                    
                    // Assume first sheet
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    
                    // Convert to array of arrays
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                    const itemsMap = new Map<string, LinenItem>();

                    // User Specification:
                    // Col A (Index 0) = Article Number
                    // Col B (Index 1) = Name
                    // Col J (Index 9) = Total Count
                    
                    // We skip header row(s). We look for rows where Col A is numeric.
                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i] as any[];
                        if (!row || row.length < 2) continue;

                        const id = String(row[0] || '').trim(); // Col A
                        const name = String(row[1] || '').trim(); // Col B
                        
                        // Look for Quantity in Index 9 (Column J)
                        let ordered = 0;
                        const qtyVal = row[9]; 
                        
                        if (typeof qtyVal === 'number') {
                            ordered = qtyVal;
                        } else if (typeof qtyVal === 'string') {
                            // Handle European number format (dot as thousands separator, comma as decimal, or vice versa depending on locale context)
                            // Assuming simple integer counts here based on context
                            ordered = parseFloat(qtyVal.replace(',', '.'));
                        }

                        // Validation: ID must be numeric-ish (e.g. 8821) and Name must exist
                        if (id && /^\d+$/.test(id) && name) {
                            itemsMap.set(id, {
                                id,
                                name,
                                ordered: isNaN(ordered) ? 0 : ordered,
                                delivered: 0
                            });
                        }
                    }
                    
                    if (itemsMap.size === 0) {
                        reject(new Error("Geen geldige regels gevonden in Excel. Controleer of kolom A artikelnummers en kolom J aantallen bevat."));
                    } else {
                        resolve(itemsMap);
                    }
                } catch (err: any) {
                    reject(err instanceof Error ? err : new Error('Excel parsing failed'));
                }
            };
            reader.onerror = () => reject(new Error("Fout bij lezen Excel bestand"));
            reader.readAsArrayBuffer(file);
        });
    };

    const parsePDFDeliveries = async (files: File[]): Promise<Map<string, number>> => {
        const deliveryMap = new Map<string, number>();

        if (files.length === 0) return deliveryMap;

        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    // Group items by Y position to reconstruct lines
                    const lines: { y: number, items: { x: number, str: string }[] }[] = [];
                    // Increased tolerance to 8 to catch items slightly misaligned
                    const tolerance = 8; 

                    for (const item of (textContent.items as any[])) {
                        const str = item.str.trim();
                        if (!str) continue; // Skip empty strings

                        const y = item.transform[5]; // transform[5] is Y coordinate
                        const x = item.transform[4]; // transform[4] is X coordinate

                        // Find existing line group
                        let line = lines.find(l => Math.abs(l.y - y) < tolerance);
                        if (!line) {
                            line = { y, items: [] };
                            lines.push(line);
                        }
                        line.items.push({ x, str });
                    }

                    // Process each reconstructed line
                    for (const line of lines) {
                        // Sort items by X coordinate (Left to Right)
                        line.items.sort((a, b) => a.x - b.x);
                        
                        // Join text items to form the line string
                        const lineText = line.items.map(item => item.str).join(' ').trim();

                        // Regex to match: 
                        // Start with ID (digits) -> Any Text -> End with Quantity (digits)
                        // Example: "8821 Bad- en keukenlinnen - Baddoek 56"
                        const match = lineText.match(/^(\d{4,6})\b\s+(.+?)\s+(\d+)$/);
                        
                        if (match) {
                            const id = match[1];
                            const quantity = parseInt(match[3], 10);
                            
                            if (!isNaN(quantity)) {
                                const current = deliveryMap.get(id) || 0;
                                deliveryMap.set(id, current + quantity);
                            }
                        }
                    }
                }
            } catch (e: any) {
                console.error(`Error parsing PDF ${file.name}:`, e);
                // Continue with other files even if one fails
            }
        }
        return deliveryMap;
    };

    const mergeAuditData = (orderMap: Map<string, LinenItem>, deliveryMap: Map<string, number>): LinenItem[] => {
        const result: LinenItem[] = [];

        // 1. Process items from the Order (Excel)
        orderMap.forEach((item, id) => {
            const delivered = deliveryMap.get(id) || 0;
            deliveryMap.delete(id); // Remove matched items from delivery map
            
            result.push({
                ...item,
                delivered
            });
        });

        // 2. Add unexpected items (Delivered but not in Excel)
        deliveryMap.forEach((qty, id) => {
            result.push({
                id,
                name: 'Onbekend Artikel (Niet op bestellijst)',
                ordered: 0,
                delivered: qty
            });
        });

        return result.sort((a, b) => a.id.localeCompare(b.id));
    };

    // --- UI EVENT HANDLERS ---

    const handleOrderDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOrder(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            setOrderFile(file);
        } else {
            onShowToast("Alleen Excel bestanden (.xlsx, .xls) toegestaan.");
        }
    };

    const handleDeliveryDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingDelivery(false);
        const files = Array.from(e.dataTransfer.files).filter((f: File) => f.name.toLowerCase().endsWith('.pdf'));
        if (files.length > 0) {
            setDeliveryFiles(prev => [...prev, ...files]);
        } else {
            onShowToast("Sleep PDF bestanden hierheen.");
        }
    };

    const handleOrderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setOrderFile(e.target.files[0]);
        }
    };

    const handleDeliveryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setDeliveryFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeDeliveryFile = (index: number) => {
        setDeliveryFiles(prev => prev.filter((_, i) => i !== index));
    };

    const resetAudit = () => {
        setOrderFile(null);
        setDeliveryFiles([]);
        setAuditData([]);
        if (excelInputRef.current) excelInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    };

    // Calculate totals
    const totalOrdered = auditData.reduce((acc, item) => acc + item.ordered, 0);
    const totalDelivered = auditData.reduce((acc, item) => acc + item.delivered, 0);

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 rounded-xl">
                            <Truck className="text-teal-600" size={32} />
                        </div>
                        Linnen Audit
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Sleep bestanden om bestellingen met leveringen te vergelijken.</p>
                </div>
                
                <div className="flex gap-3">
                    {auditData.length > 0 && (
                        <button 
                            onClick={resetAudit}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <RefreshCw size={18} /> Nieuwe Audit
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Section */}
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
                                onClick={() => { setOrderFile(null); setAuditData([]); if(excelInputRef.current) excelInputRef.current.value=''; }}
                                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
                            >
                                <X size={20}/>
                            </button>
                            <FileSpreadsheet size={48} className="text-blue-500 mb-4" />
                            <p className="font-bold text-slate-800 text-lg">{orderFile.name}</p>
                            <p className="text-xs text-blue-600 font-bold mt-1 uppercase tracking-wide">Bestand Gereed</p>
                        </div>
                    )}
                    <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleOrderUpload} />
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
                            onDrop={handleDeliveryDrop}
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
                        <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" multiple onChange={handleDeliveryUpload} />

                        {/* File List */}
                        {deliveryFiles.length > 0 && (
                            <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar bg-white rounded-lg">
                                {deliveryFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm shadow-sm animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center gap-3 truncate">
                                            <FileText size={16} className="text-red-500 flex-shrink-0"/>
                                            <span className="truncate font-medium text-slate-700">{file.name}</span>
                                        </div>
                                        <button onClick={() => removeDeliveryFile(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded">
                                            <X size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
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

            {/* Results */}
            {auditData.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    {/* Summary Header */}
                    <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-400 uppercase">Totaal Besteld</span>
                            <span className="text-2xl font-bold text-slate-900">{totalOrdered}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-400 uppercase">Totaal Geleverd</span>
                            <span className={`text-2xl font-bold ${totalDelivered < totalOrdered ? 'text-red-600' : 'text-green-600'}`}>{totalDelivered}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-400 uppercase">Verschil</span>
                            <span className={`text-2xl font-bold ${totalDelivered - totalOrdered === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                {totalDelivered - totalOrdered > 0 ? '+' : ''}{totalDelivered - totalOrdered}
                            </span>
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
                            <Download size={18} /> Opslaan / Print Rapport
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LinenAuditPage;
