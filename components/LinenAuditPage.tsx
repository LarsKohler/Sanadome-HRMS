
import React, { useState, useRef } from 'react';
import { 
    Truck, Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle, 
    RefreshCw, Download, FileSpreadsheet, X 
} from 'lucide-react';
import { Employee } from '../types';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Config PDF.js worker
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
    locations?: string[]; // Optional: locations from excel
}

const LinenAuditPage: React.FC<LinenAuditPageProps> = ({ currentUser, onShowToast }) => {
    const [orderFile, setOrderFile] = useState<File | null>(null);
    const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
    
    const [auditData, setAuditData] = useState<LinenItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const excelInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    // --- PARSING LOGIC ---

    const processFiles = async () => {
        if (!orderFile) return;
        setIsProcessing(true);
        setAuditData([]); // Reset

        try {
            // 1. Parse Excel Order
            const orderItems = await parseExcelOrder(orderFile);
            
            // 2. Parse PDF Deliveries
            const deliveredItems = await parsePDFDeliveries(deliveryFiles);

            // 3. Merge Data
            const mergedData = mergeAuditData(orderItems, deliveredItems);
            setAuditData(mergedData);
            
            onShowToast("Audit succesvol berekend!");

        } catch (error) {
            console.error("Audit error:", error);
            onShowToast("Er is een fout opgetreden bij het verwerken.");
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
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

                    const itemsMap = new Map<string, LinenItem>();

                    // Assuming structure: Col A=ID, B=Name, Col J(index 9)=Total
                    // Start from row 2 (index 1) or 3 depending on header
                    for (let i = 1; i < jsonData.length; i++) {
                        const row: any = jsonData[i];
                        if (!row || row.length < 2) continue;

                        const id = String(row[0] || '').trim(); // Col A
                        const name = String(row[1] || '').trim(); // Col B
                        
                        // Parse 'totaal besteld' (Col J / index 9 usually)
                        // Safety check: ensure it's a number
                        let ordered = 0;
                        if (row[9] && !isNaN(parseFloat(row[9]))) {
                            ordered = parseFloat(row[9]);
                        } else if (row.length > 2) {
                            // Fallback: search for last number in row if col 9 isn't obvious? 
                            // For now, stick to spec: col 9.
                        }

                        if (id && /^\d+$/.test(id)) {
                            itemsMap.set(id, {
                                id,
                                name,
                                ordered,
                                delivered: 0
                            });
                        }
                    }
                    resolve(itemsMap);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const parsePDFDeliveries = async (files: File[]): Promise<Map<string, number>> => {
        const deliveryMap = new Map<string, number>();

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const textItems = textContent.items.map((item: any) => item.str).join(' ');
                
                // Parse Logic: Look for "ArticleID Description Quantity" pattern
                // Example: "8821 Bad- en keukenlinnen - Baddoek 100"
                // Regex: Find 4-5 digits at start of line (or preceded by space), then text, then digits at end
                
                // We split by newlines or rely on the stream. PDF.js text aggregation can be messy.
                // Robust strategy: Since we know valid article IDs from Excel (ideally), we could search for those.
                // But here we do it independently.
                
                // Let's try matching specific pattern from the OCR example.
                // It seems lines are well structured in the PDF table.
                
                // Regex to find: (ID) (Description) (Count)
                // Note: PDF extraction often loses table structure, resulting in a stream of text.
                // We look for patterns like: "8821 ... 100"
                const regex = /(\d{4,5})\s+(.*?)\s+(\d+)\s*$/gm; 
                
                // However, `textItems` is one big string. The layout preservation in PDF.js is tricky.
                // A better approach with `textItems` is iterating array and reconstructing lines based on Y-coordinate, 
                // but that's complex. 
                // Simpler regex on the big string often works if items are sequential:
                
                // Pattern: (\d{4,5}) (Text) (\d+)
                // We'll try to match specific typical linen IDs (4 digits starting with 8 usually based on example)
                const simpleRegex = /(?:\b|^)(\d{4,5})\b\s+([^\d]+?)\s+(\d+)(?:\b|$)/g;
                
                let match;
                while ((match = simpleRegex.exec(textItems)) !== null) {
                    const id = match[1];
                    // const name = match[2];
                    const quantity = parseInt(match[3], 10);
                    
                    if (!isNaN(quantity)) {
                        const current = deliveryMap.get(id) || 0;
                        deliveryMap.set(id, current + quantity);
                    }
                }
            }
        }
        return deliveryMap;
    };

    const mergeAuditData = (orderMap: Map<string, LinenItem>, deliveryMap: Map<string, number>): LinenItem[] => {
        const result: LinenItem[] = [];

        // 1. Add ordered items
        orderMap.forEach((item, id) => {
            const delivered = deliveryMap.get(id) || 0;
            // Remove from deliveryMap so we know what's left (unexpected items)
            deliveryMap.delete(id);
            
            result.push({
                ...item,
                delivered
            });
        });

        // 2. Add unexpected items (delivered but not in order file)
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

    // --- UI HELPERS ---

    const resetAudit = () => {
        setOrderFile(null);
        setDeliveryFiles([]);
        setAuditData([]);
        if (excelInputRef.current) excelInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    };

    const handleOrderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setOrderFile(e.target.files[0]);
            // Auto-trigger calculation if deliveries already present
            if (deliveryFiles.length > 0) {
                // We need to wait for state update or pass file directly.
                // For simplicity, user clicks "Berekenen" or we use a useEffect trigger.
                // Let's rely on user clicking or auto-trigger via effect if both present.
            }
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
                    <p className="text-slate-500 mt-2 text-lg">Vergelijk bestellingen automatisch met leveringen.</p>
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
                
                {/* Order Input */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileSpreadsheet className="text-blue-600"/> 1. Bestelling (Excel)
                    </h3>
                    
                    {!orderFile ? (
                        <div 
                            onClick={() => excelInputRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                        >
                            <Upload className="text-slate-400 group-hover:text-blue-500 mb-3 transition-colors" size={32} />
                            <p className="font-bold text-slate-600 text-sm">Klik om Excel bestand te kiezen</p>
                            <p className="text-xs text-slate-400 mt-1">.xlsx of .xls</p>
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
                            <p className="font-bold text-slate-800">{orderFile.name}</p>
                            <p className="text-xs text-blue-600 font-bold mt-1">Bestand Gereed</p>
                        </div>
                    )}
                    <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleOrderUpload} />
                </div>

                {/* Deliveries Input */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText className="text-red-600"/> 2. Leveringen (PDF)
                    </h3>
                    
                    <div className="flex-1 flex flex-col gap-4">
                        <div 
                            onClick={() => pdfInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all group min-h-[120px]"
                        >
                            <Upload className="text-slate-400 group-hover:text-red-500 mb-2 transition-colors" size={24} />
                            <p className="font-bold text-slate-600 text-sm">Voeg PDF leverbonnen toe</p>
                            <p className="text-xs text-slate-400">Meerdere bestanden mogelijk</p>
                        </div>
                        <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" multiple onChange={handleDeliveryUpload} />

                        {/* File List */}
                        {deliveryFiles.length > 0 && (
                            <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {deliveryFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
                                        <div className="flex items-center gap-3 truncate">
                                            <FileText size={16} className="text-red-500 flex-shrink-0"/>
                                            <span className="truncate font-medium text-slate-700">{file.name}</span>
                                        </div>
                                        <button onClick={() => removeDeliveryFile(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
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
                    className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-lg"
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
                                    let statusClass = 'bg-green-50 text-green-700';
                                    let statusText = 'Correct';
                                    let rowClass = 'hover:bg-slate-50';

                                    if (diff < 0) {
                                        statusClass = 'bg-red-50 text-red-700 font-bold';
                                        statusText = 'Tekort';
                                        rowClass = 'bg-red-50/30 hover:bg-red-50/50';
                                    } else if (diff > 0) {
                                        statusClass = 'bg-amber-50 text-amber-700 font-bold';
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
                                                <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wide ${statusClass}`}>
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
