
import React, { useState, useRef } from 'react';
import { Upload, FileText, RefreshCw, AlertTriangle, FileSpreadsheet, ArrowRight, ScanEye, Search, Download } from 'lucide-react';
import { Employee } from '../types';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for PDF worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (typeof window !== 'undefined') {
    const version = pdfjs.version;
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

interface DataAuditPageProps {
  currentUser: Employee;
  onShowToast: (message: string) => void;
}

interface AuditResult {
    id: string;
    reservationNumber: string;
    guestName: string;
    missingFields: string[];
    responsibleEmployee: string;
    checkInTime?: string;
}

const DataAuditPage: React.FC<DataAuditPageProps> = ({ currentUser, onShowToast }) => {
    const [reservationFile, setReservationFile] = useState<File | null>(null);
    const [actionLogFile, setActionLogFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [auditResults, setAuditResults] = useState<AuditResult[] | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const reservationInputRef = useRef<HTMLInputElement>(null);
    const actionLogInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'reservation' | 'actionLog') => {
        if (e.target.files && e.target.files.length > 0) {
            if (type === 'reservation') setReservationFile(e.target.files[0]);
            else setActionLogFile(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'reservation' | 'actionLog') => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (type === 'reservation') setReservationFile(e.dataTransfer.files[0]);
            else setActionLogFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Updated: Returns array of arrays instead of JSON objects to handle headers manually
    const readExcel = (file: File): Promise<any[][]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // FIX: Prioritize sheet named 'Reservations' (case insensitive)
                    // If not found, fallback to the first sheet.
                    let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('reservation'));
                    
                    if (!sheetName) {
                        sheetName = workbook.SheetNames[0];
                    }

                    console.log(`Data Audit: Using Excel sheet '${sheetName}'`);

                    const sheet = workbook.Sheets[sheetName];
                    // header: 1 returns an array of arrays
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
                    resolve(jsonData);
                } catch (err) {
                    console.error("Excel parse error:", err);
                    reject(new Error("Ongeldig Excel formaat"));
                }
            };
            reader.onerror = () => reject(new Error("Fout bij lezen bestand"));
            reader.readAsArrayBuffer(file);
        });
    };

    const readPdfText = async (file: File): Promise<string[]> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
            let allLines: string[] = [];
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                const items = textContent.items.map((item: any) => ({
                    str: item.str,
                    y: item.transform[5],
                    x: item.transform[4]
                })).sort((a: any, b: any) => {
                    // Sort by Y desc (top to bottom), then X asc (left to right)
                    if (Math.abs(a.y - b.y) > 5) return b.y - a.y;
                    return a.x - b.x;
                });

                let currentY = -9999;
                let currentLine = "";
                
                items.forEach((item: any) => {
                     if (currentY !== -9999 && Math.abs(item.y - currentY) > 8) {
                         if(currentLine.trim()) allLines.push(currentLine.trim());
                         currentLine = "";
                     }
                     currentLine += item.str + " ";
                     currentY = item.y;
                });
                if(currentLine.trim()) allLines.push(currentLine.trim());
            }
            return allLines;
        } catch (error: any) {
            console.error("PDF Read Error:", error);
            throw new Error(`Kon PDF niet lezen: ${file.name}`);
        }
    };

    const processAudit = async () => {
        if (!reservationFile || !actionLogFile) return;
        setIsProcessing(true);

        try {
            // 1. Process Excel (Reservations)
            const rawRows = await readExcel(reservationFile);
            
            // --- ROBUST HEADER DETECTION ---
            let headerRowIndex = -1;
            
            // Defines expected headers (lowercase) and possible variations
            const targetHeaders = {
                number: ['number', 'reservering', 'id'],
                email: ['email', 'e-mail'],
                telephone: ['telephone', 'phone', 'telefoon', 'mobiel']
            };

            // Search ALL rows to find the header (removed 50 rows limit)
            for (let i = 0; i < rawRows.length; i++) {
                const row = rawRows[i].map(c => String(c).trim().toLowerCase());
                
                // Check if this row contains 'number' AND 'email' (Telephone is sometimes optional in export settings?)
                // Let's require Number and Email at minimum to identify the header row
                const hasNumber = row.some(cell => targetHeaders.number.includes(cell));
                const hasEmail = row.some(cell => targetHeaders.email.includes(cell));
                
                if (hasNumber && hasEmail) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                // Look for just "Number" as a fallback if Email header is oddly named
                for (let i = 0; i < rawRows.length; i++) {
                    const row = rawRows[i].map(c => String(c).trim().toLowerCase());
                    if (row.some(cell => targetHeaders.number.includes(cell))) {
                        headerRowIndex = i;
                        break;
                    }
                }
            }

            if (headerRowIndex === -1) {
                throw new Error("Kon de kolomkoppen (Number, Email) niet vinden in het tabblad 'Reservations'. Controleer het exportformaat.");
            }

            const headerRow = rawRows[headerRowIndex].map(h => String(h).trim().toLowerCase());
            
            // Helper to find column index
            const findColIndex = (variations: string[]) => {
                return headerRow.findIndex(h => variations.some(v => h === v || h.includes(v)));
            };

            // Map column names to indexes
            const colMap = {
                number: findColIndex(targetHeaders.number),
                firstName: findColIndex(['first name', 'voornaam']),
                lastName: findColIndex(['last name', 'achternaam']),
                email: findColIndex(targetHeaders.email),
                phone: findColIndex(targetHeaders.telephone)
            };

            if (colMap.number === -1) throw new Error("Kolom 'Number' niet gevonden.");

            // Process Data Rows
            const processedReservations = [];
            
            for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row || row.length === 0) continue;

                // Safely access columns
                const id = row[colMap.number] !== undefined ? String(row[colMap.number]).trim() : '';
                if (!id || id.toLowerCase() === 'undefined' || id === '') continue;

                const firstName = colMap.firstName > -1 && row[colMap.firstName] ? row[colMap.firstName] : '';
                const lastName = colMap.lastName > -1 && row[colMap.lastName] ? row[colMap.lastName] : '';
                const email = colMap.email > -1 && row[colMap.email] ? String(row[colMap.email]).trim() : '';
                const phone = colMap.phone > -1 && row[colMap.phone] ? String(row[colMap.phone]).trim() : '';

                // Determine missing fields individually
                const missing = [];
                
                // Email check: must exist, not be empty, not be "undefined" string
                if (!email || email.toLowerCase() === 'undefined' || email === '') {
                    missing.push('Email');
                }
                
                // Phone check: same
                if (!phone || phone.toLowerCase() === 'undefined' || phone === '') {
                    missing.push('Telefoon');
                }

                // Only add to list if something is missing
                if (missing.length > 0) {
                    processedReservations.push({
                        id,
                        name: `${firstName} ${lastName}`.trim() || 'Onbekend',
                        missing
                    });
                }
            }

            // 2. Process PDF (Action Log)
            const pdfLines = await readPdfText(actionLogFile);
            
            // Build a map of Check-in Actions: ReservationID -> Employee
            const checkInMap = new Map<string, { employee: string, time: string }>();
            
            // Regex to find: Name > Stay ID
            // Matches: "Anouk Wieggers > Stay 175424"
            const actionRegex = /^(.+?)\s*>\s*Stay\s*(\d+)/i;
            
            for (let i = 0; i < pdfLines.length; i++) {
                const line = pdfLines[i];
                
                // Look for the state change line indicating check-in
                if (line.includes("State changed from Confirmed to Started")) {
                    // Look backwards for the user action line (up to 10 lines back to be safe)
                    for (let j = 1; j <= 10; j++) {
                        if (i - j < 0) break;
                        const prevLine = pdfLines[i-j];
                        
                        // Try to extract timestamp while looking back
                        const timeMatch = prevLine.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
                        let time = timeMatch ? timeMatch[0] : '';

                        const match = prevLine.match(actionRegex);
                        if (match) {
                            const employeeName = match[1].trim();
                            const resId = match[2].trim();
                            
                            // If we haven't found a timestamp in this line, look at the lines BETWEEN action and state change
                            if (!time) {
                                for (let k = i - j + 1; k < i; k++) {
                                    const intermediateLine = pdfLines[k];
                                    const intermediateTime = intermediateLine.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
                                    if (intermediateTime) {
                                        time = intermediateTime[0];
                                        break;
                                    }
                                }
                            }

                            checkInMap.set(resId, { employee: employeeName, time: time || 'Onbekend' });
                            break; // Stop looking back once found
                        }
                    }
                }
            }

            // 3. Correlate Data
            const results: AuditResult[] = processedReservations.map(res => {
                const checkInData = checkInMap.get(res.id);
                return {
                    id: res.id,
                    reservationNumber: res.id,
                    guestName: res.name,
                    missingFields: res.missing,
                    responsibleEmployee: checkInData ? checkInData.employee : 'Onbekend (Niet gevonden in log)',
                    checkInTime: checkInData ? checkInData.time : undefined
                };
            });

            setAuditResults(results);
            onShowToast(`Audit voltooid. ${results.length} onvolledige dossiers gevonden.`);

        } catch (e: any) {
            console.error("Audit Process Error", e);
            onShowToast(e.message || "Er is een fout opgetreden bij de analyse.");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredResults = auditResults?.filter(res => 
        res.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.responsibleEmployee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.reservationNumber.includes(searchTerm)
    );

    const handleExport = () => {
        if (!auditResults) return;
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(auditResults.map(r => ({
            'Reservering': r.reservationNumber,
            'Gast': r.guestName,
            'Ontbrekende Gegevens': r.missingFields.join(', '),
            'Medewerker': r.responsibleEmployee,
            'Tijdstip Incheck': r.checkInTime || '-'
        })));
        
        XLSX.utils.book_append_sheet(wb, ws, "Data Audit");
        XLSX.writeFile(wb, `Data_Audit_Sanadome_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-xl">
                            <ScanEye className="text-teal-600" size={32} />
                        </div>
                        Data Kwaliteit Audit
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Controleer reserveringen op ontbrekende gegevens (Email/Telefoon).</p>
                </div>
                {auditResults && (
                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setAuditResults(null); setReservationFile(null); setActionLogFile(null); }}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <RefreshCw size={18}/> Nieuwe Audit
                        </button>
                        <button 
                            onClick={handleExport}
                            className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                            <Download size={18}/> Export Excel
                        </button>
                    </div>
                )}
            </div>

            {!auditResults ? (
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        {/* RESERVATION FILE */}
                        <div 
                            className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all h-80 group cursor-pointer ${reservationFile ? 'border-teal-500 bg-teal-50/30' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                            onDrop={(e) => handleDrop(e, 'reservation')}
                            onDragOver={handleDragOver}
                            onClick={() => reservationInputRef.current?.click()}
                        >
                            <input type="file" ref={reservationInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'reservation')} />
                            
                            {reservationFile ? (
                                <div className="animate-in zoom-in duration-300 w-full flex flex-col items-center">
                                    <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                        <FileSpreadsheet size={40}/>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xl mb-1">Reserveringen</h3>
                                    <p className="text-slate-500 font-medium mb-4 max-w-[250px] truncate">{reservationFile.name}</p>
                                </div>
                            ) : (
                                <div className="pointer-events-none">
                                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet size={36}/>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xl mb-2">1. Reservation Report</h3>
                                    <p className="text-slate-400 text-sm">Excel bestand (.xlsx)</p>
                                </div>
                            )}
                        </div>

                        {/* ACTION LOG FILE */}
                        <div 
                            className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all h-80 group cursor-pointer ${actionLogFile ? 'border-teal-500 bg-teal-50/30' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                            onDrop={(e) => handleDrop(e, 'actionLog')}
                            onDragOver={handleDragOver}
                            onClick={() => actionLogInputRef.current?.click()}
                        >
                            <input type="file" ref={actionLogInputRef} className="hidden" accept=".pdf" onChange={(e) => handleFileChange(e, 'actionLog')} />
                            
                            {actionLogFile ? (
                                <div className="animate-in zoom-in duration-300 w-full flex flex-col items-center">
                                    <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                        <FileText size={40}/>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xl mb-1">Action Log</h3>
                                    <p className="text-slate-500 font-medium mb-4 max-w-[250px] truncate">{actionLogFile.name}</p>
                                </div>
                            ) : (
                                <div className="pointer-events-none">
                                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                                        <FileText size={36}/>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xl mb-2">2. Action Log</h3>
                                    <p className="text-slate-400 text-sm">PDF bestand (.pdf)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center">
                        <button 
                            onClick={processAudit}
                            disabled={!reservationFile || !actionLogFile || isProcessing}
                            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-200 bg-slate-900 rounded-2xl hover:bg-slate-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                                    Analyseren...
                                </>
                            ) : (
                                <>
                                    Start Analyse <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform"/>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* STATS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fouten Gevonden</h3>
                            <div className="text-3xl font-bold text-red-600">{auditResults.length}</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Meest Voorkomend</h3>
                            <div className="text-lg font-bold text-slate-900">
                                {auditResults.filter(r => r.missingFields.includes('Email')).length > auditResults.filter(r => r.missingFields.includes('Telefoon')).length ? 'Ontbrekende Email' : 'Ontbrekend Tel.nr'}
                            </div>
                        </div>
                    </div>

                    {/* SEARCH */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <Search className="text-slate-400 ml-2" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Zoek op medewerker, gast of reservering..."
                            className="flex-1 p-2 outline-none text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* RESULTS TABLE */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Reservering</th>
                                    <th className="px-6 py-4">Gast</th>
                                    <th className="px-6 py-4">Ontbrekend</th>
                                    <th className="px-6 py-4">Medewerker (Incheck)</th>
                                    <th className="px-6 py-4">Tijdstip</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredResults?.map((res) => (
                                    <tr key={res.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-700">#{res.reservationNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{res.guestName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {res.missingFields.map(f => (
                                                    <span key={f} className="px-2 py-1 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-bold flex items-center gap-1">
                                                        <AlertTriangle size={10}/> {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {res.responsibleEmployee.includes('Niet gevonden') 
                                                ? <span className="text-slate-400 italic">Niet gevonden</span> 
                                                : <span className="font-bold text-teal-700">{res.responsibleEmployee}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {res.checkInTime || '-'}
                                        </td>
                                    </tr>
                                ))}
                                {filteredResults?.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Geen resultaten gevonden.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataAuditPage;
