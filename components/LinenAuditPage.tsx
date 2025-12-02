
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, RefreshCw, Printer, AlertTriangle, CheckCircle2, FileCheck, X, ArrowRight, Trash2, FileSpreadsheet, Ban, Save, History, BarChart3, TrendingDown, TrendingUp, PieChart, ChevronLeft, Eye, Edit2, Database } from 'lucide-react';
import { Employee } from '../types';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { Modal } from './Modal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend } from 'recharts';

// Fix for PDF worker - Dynamically match the worker version to the library version
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (typeof window !== 'undefined') {
    const version = pdfjs.version;
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

interface LinenAuditPageProps {
  currentUser: Employee;
  onShowToast: (message: string) => void;
}

interface AuditItem {
  id: string;
  name: string;
  ordered: number;
  delivered: number;
}

interface SavedReport {
    id: string;
    date: string;
    items: AuditItem[];
    totalDiff: number;
    accuracy: number;
}

const LinenAuditPage: React.FC<LinenAuditPageProps> = ({ currentUser, onShowToast }) => {
  const [activeView, setActiveView] = useState<'upload' | 'report' | 'dashboard' | 'archive'>('upload');
  
  // File State
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data State
  const [auditData, setAuditData] = useState<AuditItem[] | null>(null);
  const [auditDate, setAuditDate] = useState<string>('');

  // Exclusion State
  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [newExclusionId, setNewExclusionId] = useState('');

  // Item Mapping State (For Unknown Items)
  const [itemMappings, setItemMappings] = useState<Record<string, string>>({});
  const [isNameEditModalOpen, setIsNameEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{id: string, name: string} | null>(null);

  // Archive State
  const [archivedReports, setArchivedReports] = useState<SavedReport[]>([]);

  const orderInputRef = useRef<HTMLInputElement>(null);
  const deliveryInputRef = useRef<HTMLInputElement>(null);

  // Load persisted settings
  useEffect(() => {
      const savedExclusions = localStorage.getItem('linen_exclusions');
      if (savedExclusions) setExcludedIds(JSON.parse(savedExclusions));

      const savedReports = localStorage.getItem('linen_archive');
      if (savedReports) setArchivedReports(JSON.parse(savedReports));

      const savedMappings = localStorage.getItem('linen_item_mappings');
      if (savedMappings) setItemMappings(JSON.parse(savedMappings));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'order' | 'delivery') => {
      if (e.target.files && e.target.files.length > 0) {
          if (type === 'order') {
              setOrderFile(e.target.files[0]);
          } else {
              setDeliveryFiles(prev => [...prev, ...Array.from(e.target.files!)]);
          }
      }
      e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'order' | 'delivery') => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          if (type === 'order') {
              setOrderFile(e.dataTransfer.files[0]);
          } else {
              setDeliveryFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
          }
      }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };

  // --- PARSING LOGIC ---

  const readExcel = (file: File): Promise<any[][]> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const data = e.target?.result;
                  // Use 'array' type for robustness with binary data
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
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

  const readPdfText = async (file: File): Promise<string> => {
      try {
          const arrayBuffer = await file.arrayBuffer();
          // Explicitly cast to Uint8Array for pdfjs
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              
              const items = textContent.items.filter((item: any) => item.str !== undefined).map((item: any) => ({
                  str: item.str,
                  x: item.transform[4],
                  y: item.transform[5],
                  h: item.height
              }));

              // Sort by Y (top to bottom) then X (left to right)
              items.sort((a: any, b: any) => {
                  const yDiff = Math.abs(a.y - b.y);
                  if (yDiff > 5) return b.y - a.y; 
                  return a.x - b.x; 
              });

              let currentY = -9999;
              let pageText = '';
              
              items.forEach((item: any) => {
                  if (currentY !== -9999 && Math.abs(item.y - currentY) > 5) {
                      pageText += '\n'; 
                  } else if (currentY !== -9999) {
                      pageText += ' '; 
                  }
                  pageText += item.str;
                  currentY = item.y;
              });

              fullText += pageText + '\n';
          }
          return fullText;
      } catch (error: any) {
          console.error("PDF Read Error details:", error);
          const fileName = decodeURIComponent(file.name);
          throw new Error(`Kon PDF niet lezen: ${fileName}. Is het bestand beschadigd? (${error.message})`);
      }
  };

  const parseOrderSheet = async (file: File): Promise<Map<string, {name: string, qty: number}>> => {
      const rows = await readExcel(file);
      const orders = new Map<string, {name: string, qty: number}>();

      const cleanId = (val: any) => {
          if (val === null || val === undefined) return '';
          return String(val).trim();
      };
      
      const getNum = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
          return 0;
      };

      const exceptionRowIndices = [23, 24, 25, 26, 33, 34, 35, 36]; 

      rows.forEach((row, index) => {
          if (index < 5) return; 
          if (exceptionRowIndices.includes(index)) return; 

          // Safe access to columns
          const id = row.length > 0 ? cleanId(row[0]) : ''; 
          const name = row.length > 1 ? String(row[1] || 'Artikel') : 'Artikel'; 
          const qty = row.length > 9 ? getNum(row[9]) : 0; 

          if (id && id.length >= 4 && qty > 0) {
              orders.set(id, { name, qty: (orders.get(id)?.qty || 0) + qty });
          }
      });

      // Handle Container Items (Row 23) - Safe Access
      if (rows.length > 23) {
          const rowWellness = rows[23];
          const containerCount = rowWellness && rowWellness.length > 8 ? getNum(rowWellness[8]) : 0;
          if (containerCount > 0) {
              const items = [
                  { id: '88211', count: 80, name: 'Baddoek Beige' },
                  { id: '88071', count: 25, name: 'Washand Beige' },
                  { id: '88051', count: 60, name: 'Saunalaken Beige' }
              ];
              items.forEach(item => {
                  const total = item.count * containerCount;
                  orders.set(item.id, { 
                      name: orders.get(item.id)?.name || item.name, 
                      qty: (orders.get(item.id)?.qty || 0) + total 
                  });
              });
          }
      }

      // Handle Other Container Rows
      [33, 34, 35, 36].forEach(idx => {
          if (rows.length > idx) {
              const row = rows[idx];
              if (row) {
                  const id = row.length > 0 ? cleanId(row[0]) : ''; 
                  const name = row.length > 1 ? String(row[1] || 'Container Item') : 'Container Item';
                  const perContainer = row.length > 2 ? getNum(row[2]) : 0; 
                  const containers = row.length > 8 ? getNum(row[8]) : 0; 
                  
                  if (id && containers > 0) {
                      const total = perContainer * containers;
                      orders.set(id, { 
                          name: orders.get(id)?.name || name, 
                          qty: (orders.get(id)?.qty || 0) + total 
                      });
                  }
              }
          }
      });

      return orders;
  };

  const parseDeliveryFiles = async (files: File[]): Promise<Map<string, { qty: number, name: string }>> => {
      const delivered = new Map<string, { qty: number, name: string }>();

      for (const file of files) {
          let text = '';
          
          if (file.name.toLowerCase().endsWith('.pdf')) {
              text = await readPdfText(file);
          } else {
              const rows = await readExcel(file);
              text = rows.map(r => r.join(' ')).join('\n');
          }

          // Regex to find ID, Name, Quantity
          // Group 1: ID (4+ digits)
          // Group 2: Name (text in between, non-greedy)
          // Group 3: Quantity (digits at end)
          const regex = /(\d{4,})\s+(.*?)\s+(\d+)\s*$/gm;
          let match;

          while ((match = regex.exec(text)) !== null) {
              const id = match[1].trim();
              const extractedName = match[2].trim();
              const qty = parseInt(match[3], 10);
              
              if (id && !isNaN(qty)) {
                  const current = delivered.get(id);
                  delivered.set(id, { 
                      qty: (current?.qty || 0) + qty,
                      // Capture name only if we don't have one, or if this one looks better (longer)
                      name: current?.name || extractedName
                  });
              }
          }
      }
      return delivered;
  };

  const generateReport = async () => {
      if (!orderFile || deliveryFiles.length === 0) return;
      setIsProcessing(true);

      try {
          // Parse Order Sheet (Excel)
          let orderMap = new Map();
          try {
             orderMap = await parseOrderSheet(orderFile);
          } catch (e: any) {
             console.error("Order Sheet Error", e);
             throw new Error("Fout bij lezen bestelbon: " + e.message);
          }

          // Parse Delivery Files (PDFs/Excel)
          let deliveryMap = new Map();
          try {
             deliveryMap = await parseDeliveryFiles(deliveryFiles);
          } catch (e: any) {
             console.error("Delivery Files Error", e);
             throw e; // Rethrow actual error (e.g. PDF Error)
          }

          const allIds = new Set([...orderMap.keys(), ...deliveryMap.keys()]);
          const results: AuditItem[] = [];

          allIds.forEach(id => {
              // CHECK EXCLUSION
              if (excludedIds.includes(id)) return;

              const orderInfo = orderMap.get(id);
              const ordered = orderInfo?.qty || 0;
              
              const deliveryInfo = deliveryMap.get(id);
              const delivered = deliveryInfo?.qty || 0;
              const deliveryName = deliveryInfo?.name;
              
              // CHECK CUSTOM MAPPING (for unknown items)
              const mappedName = itemMappings[id];
              
              // Logic: Order Name > Mapped Name > Delivery Name > "Onbekend"
              // Fallback to delivery name if available and no official order name
              const name = orderInfo?.name || mappedName || deliveryName || 'Onbekend Artikel';
              
              if (ordered > 0 || delivered > 0) {
                  results.push({
                      id,
                      name,
                      ordered,
                      delivered
                  });
              }
          });

          results.sort((a, b) => a.id.localeCompare(b.id));

          setAuditData(results);
          setAuditDate(new Date().toLocaleDateString('nl-NL'));
          setActiveView('report');
          onShowToast("Audit succesvol voltooid.");

      } catch (e: any) {
          console.error("Generate Report Error", e);
          onShowToast(e.message || "Er is een onbekende fout opgetreden.");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- EXCLUSION LOGIC ---
  const addExclusion = () => {
      if (newExclusionId && !excludedIds.includes(newExclusionId)) {
          const updated = [...excludedIds, newExclusionId];
          setExcludedIds(updated);
          localStorage.setItem('linen_exclusions', JSON.stringify(updated));
          setNewExclusionId('');
      }
  };

  const removeExclusion = (id: string) => {
      const updated = excludedIds.filter(x => x !== id);
      setExcludedIds(updated);
      localStorage.setItem('linen_exclusions', JSON.stringify(updated));
  };

  // --- ITEM MAPPING LOGIC ---
  const openEditNameModal = (item: AuditItem) => {
      setEditingItem({ id: item.id, name: item.name });
      setIsNameEditModalOpen(true);
  };

  const saveItemName = () => {
      if (!editingItem) return;
      const newMappings = { ...itemMappings, [editingItem.id]: editingItem.name };
      setItemMappings(newMappings);
      localStorage.setItem('linen_item_mappings', JSON.stringify(newMappings));
      
      // Update current data view
      if (auditData) {
          setAuditData(auditData.map(i => i.id === editingItem.id ? { ...i, name: editingItem.name } : i));
      }
      
      setIsNameEditModalOpen(false);
      onShowToast("Artikelnaam opgeslagen.");
  };

  // --- ARCHIVE LOGIC ---
  const saveReportToArchive = () => {
      if (!auditData) return;
      
      const totalOrdered = auditData.reduce((sum, item) => sum + item.ordered, 0);
      const totalDelivered = auditData.reduce((sum, item) => sum + item.delivered, 0);
      const diffTotal = totalDelivered - totalOrdered;
      
      // Calculate simplistic accuracy score (items with 0 diff / total items)
      const correctItems = auditData.filter(i => i.ordered === i.delivered).length;
      const accuracy = auditData.length > 0 ? Math.round((correctItems / auditData.length) * 100) : 0;

      const report: SavedReport = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toLocaleString('nl-NL'),
          items: auditData,
          totalDiff: diffTotal,
          accuracy
      };

      const updatedArchive = [report, ...archivedReports];
      setArchivedReports(updatedArchive);
      localStorage.setItem('linen_archive', JSON.stringify(updatedArchive));
      onShowToast("Rapport opgeslagen in archief.");
  };

  const deleteReport = (id: string) => {
      if(confirm('Weet je zeker dat je dit rapport wilt verwijderen?')) {
          const updated = archivedReports.filter(r => r.id !== id);
          setArchivedReports(updated);
          localStorage.setItem('linen_archive', JSON.stringify(updated));
      }
  };

  const loadReport = (report: SavedReport) => {
      setAuditData(report.items);
      setAuditDate(report.date.split(' ')[0]); // Approx date
      setActiveView('report');
  };

  // --- ANALYSIS LOGIC ---
  const analysisData = useMemo(() => {
      if (!auditData) return null;
      
      const shortages = [...auditData]
        .map(i => ({ ...i, diff: i.delivered - i.ordered }))
        .filter(i => i.diff < 0)
        .sort((a, b) => a.diff - b.diff) // Most negative first
        .slice(0, 5);

      const surplus = [...auditData]
        .map(i => ({ ...i, diff: i.delivered - i.ordered }))
        .filter(i => i.diff > 0)
        .sort((a, b) => b.diff - a.diff) // Most positive first
        .slice(0, 5);

      const totalOrdered = auditData.reduce((sum, item) => sum + item.ordered, 0);
      const totalDelivered = auditData.reduce((sum, item) => sum + item.delivered, 0);
      const diffTotal = totalDelivered - totalOrdered;
      
      const correctItems = auditData.filter(i => i.ordered === i.delivered).length;
      const accuracy = auditData.length > 0 ? Math.round((correctItems / auditData.length) * 100) : 0;

      return { shortages, surplus, totalOrdered, totalDelivered, diffTotal, accuracy };
  }, [auditData]);

  // --- RENDER HELPERS ---

  const totalOrdered = auditData?.reduce((sum, item) => sum + item.ordered, 0) || 0;
  const totalDelivered = auditData?.reduce((sum, item) => sum + item.delivered, 0) || 0;
  const diffTotal = totalDelivered - totalOrdered;

  const renderDashboard = () => {
      if (!analysisData) return <div className="p-8 text-center text-slate-400">Genereer eerst een rapport.</div>;

      return (
          <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-2">Totaal Besteld</div>
                      <div className="text-3xl font-bold text-slate-900">{analysisData.totalOrdered}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-2">Totaal Geleverd</div>
                      <div className="text-3xl font-bold text-slate-900">{analysisData.totalDelivered}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-2">Netto Verschil</div>
                      <div className={`text-3xl font-bold ${analysisData.diffTotal === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analysisData.diffTotal > 0 ? `+${analysisData.diffTotal}` : analysisData.diffTotal}
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-2">Nauwkeurigheid</div>
                      <div className="text-3xl font-bold text-teal-600">{analysisData.accuracy}%</div>
                      <div className="text-xs text-slate-400 mt-1">Artikelen correct</div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <TrendingDown className="text-red-500" size={20}/> Top 5 Tekorten
                      </h3>
                      <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart layout="vertical" data={analysisData.shortages}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                                  <XAxis type="number" hide/>
                                  <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} interval={0}/>
                                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                                  <Bar dataKey="diff" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} name="Tekort"/>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <TrendingUp className="text-green-500" size={20}/> Top 5 Overschotten
                      </h3>
                      <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart layout="vertical" data={analysisData.surplus}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                                  <XAxis type="number" hide/>
                                  <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} interval={0}/>
                                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                                  <Bar dataKey="diff" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} name="Overschot"/>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderArchive = () => (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                      <th className="px-6 py-4">Datum</th>
                      <th className="px-6 py-4">Resultaat</th>
                      <th className="px-6 py-4">Nauwkeurigheid</th>
                      <th className="px-6 py-4 text-right">Acties</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                  {archivedReports.map(report => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{report.date}</td>
                          <td className={`px-6 py-4 font-bold ${report.totalDiff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {report.totalDiff > 0 ? `+${report.totalDiff}` : report.totalDiff}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{report.accuracy}%</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              <button onClick={() => loadReport(report)} className="p-2 border border-slate-200 rounded-lg hover:bg-white text-teal-600 hover:border-teal-200 transition-colors">
                                  <Eye size={16}/>
                              </button>
                              <button onClick={() => deleteReport(report.id)} className="p-2 border border-slate-200 rounded-lg hover:bg-white text-red-500 hover:border-red-200 transition-colors">
                                  <Trash2 size={16}/>
                              </button>
                          </td>
                      </tr>
                  ))}
                  {archivedReports.length === 0 && (
                      <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Geen rapporten in archief.</td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>
  );

  return (
    <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] print:p-0 print:m-0 print:h-auto print:bg-white print:overflow-visible">
      
      {/* HEADER (Screen Only) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 print:hidden">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <div className="p-2 bg-teal-50 rounded-xl">
                <FileText className="text-teal-600" size={32} />
             </div>
             Linnen Audit
           </h1>
           <p className="text-slate-500 mt-2 text-lg">Vergelijk Moderna bestelbon met leverbonnen.</p>
        </div>
        <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsExclusionModalOpen(true)}
               className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
             >
               <Ban size={18}/> Uitsluitingen
             </button>
             {auditData && (
                 <>
                     <button 
                       onClick={() => {
                           setOrderFile(null);
                           setDeliveryFiles([]);
                           setAuditData(null);
                           setAuditDate('');
                           setActiveView('upload');
                       }}
                       className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                     >
                       <RefreshCw size={18}/> Nieuw
                     </button>
                     <button 
                        onClick={saveReportToArchive}
                        className="px-4 py-2.5 bg-teal-50 border border-teal-200 text-teal-700 font-bold rounded-xl shadow-sm hover:bg-teal-100 transition-all flex items-center gap-2"
                     >
                        <Save size={18}/> Opslaan
                     </button>
                     <button 
                       onClick={() => window.print()}
                       className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                     >
                       <Printer size={18}/> Print
                     </button>
                 </>
             )}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 mb-8 flex gap-8 print:hidden">
          <button 
            onClick={() => setActiveView('upload')}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'upload' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Upload size={18}/> Upload
          </button>
          {auditData && (
              <>
                <button 
                    onClick={() => setActiveView('report')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'report' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FileText size={18}/> Rapportage
                </button>
                <button 
                    onClick={() => setActiveView('dashboard')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <BarChart3 size={18}/> Analyse & Cijfers
                </button>
              </>
          )}
          <button 
            onClick={() => setActiveView('archive')}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'archive' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <History size={18}/> Archief
          </button>
      </div>

      {/* VIEWS */}
      
      {activeView === 'upload' && !auditData && (
          <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* ORDER FILE */}
                  <div 
                    className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all h-80 group cursor-pointer ${orderFile ? 'border-teal-500 bg-teal-50/30' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                    onDrop={(e) => handleDrop(e, 'order')}
                    onDragOver={handleDragOver}
                    onClick={() => orderInputRef.current?.click()}
                  >
                      <input type="file" ref={orderInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'order')} />
                      
                      {orderFile ? (
                          <div className="animate-in zoom-in duration-300 w-full flex flex-col items-center">
                              <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                  <FileCheck size={40}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-xl mb-1">Bestelblad</h3>
                              <p className="text-slate-500 font-medium mb-4 max-w-[250px] truncate">{orderFile.name}</p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setOrderFile(null); }}
                                className="text-red-500 text-sm font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                  <Trash2 size={14}/> Verwijderen
                              </button>
                          </div>
                      ) : (
                          <div className="pointer-events-none">
                              <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                                  <FileSpreadsheet size={36}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-xl mb-2">1. Bestelblad (Excel)</h3>
                              <p className="text-slate-400 text-sm">Sleep Excel bestand hierheen</p>
                          </div>
                      )}
                  </div>

                  {/* DELIVERY FILES */}
                  <div 
                    className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center text-center transition-all h-80 group cursor-pointer ${deliveryFiles.length > 0 ? 'border-teal-500 bg-teal-50/30' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                    onDrop={(e) => handleDrop(e, 'delivery')}
                    onDragOver={handleDragOver}
                    onClick={() => deliveryInputRef.current?.click()}
                  >
                      <input type="file" ref={deliveryInputRef} className="hidden" multiple accept=".pdf,.xlsx,.csv" onChange={(e) => handleFileChange(e, 'delivery')} />
                      
                      {deliveryFiles.length > 0 ? (
                          <div className="w-full h-full flex flex-col pointer-events-auto cursor-default">
                              <div className="flex items-center justify-center gap-3 mb-4">
                                  <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center shadow-sm">
                                      <FileCheck size={24}/>
                                  </div>
                                  <div className="text-left">
                                      <h3 className="font-bold text-slate-900 text-lg">Leverbonnen</h3>
                                      <p className="text-teal-600 text-xs font-bold">{deliveryFiles.length} bestand(en)</p>
                                  </div>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto custom-scrollbar w-full px-2 space-y-2 mb-4">
                                  {deliveryFiles.map((file, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white/80 p-3 rounded-xl border border-teal-100 shadow-sm text-sm">
                                          <span className="truncate w-48 text-slate-700 font-medium text-left">{file.name}</span>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setDeliveryFiles(prev => prev.filter((_, i) => i !== idx)); }}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50"
                                          >
                                              <X size={16}/>
                                          </button>
                                      </div>
                                  ))}
                              </div>
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); deliveryInputRef.current?.click(); }}
                                className="mx-auto text-teal-600 text-xs font-bold hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors border border-teal-200 bg-white"
                              >
                                  + Meer toevoegen
                              </button>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full pointer-events-none">
                              <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                                  <Upload size={36}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-xl mb-2">2. Leverbon(nen)</h3>
                              <p className="text-slate-400 text-sm">Sleep PDF bestanden hierheen</p>
                          </div>
                      )}
                  </div>
              </div>

              <div className="text-center">
                  <button 
                    onClick={generateReport}
                    disabled={!orderFile || deliveryFiles.length === 0 || isProcessing}
                    className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-200 bg-slate-900 rounded-2xl hover:bg-slate-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
                  >
                      {isProcessing ? (
                          <>
                              <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                              Bezig met berekenen...
                          </>
                      ) : (
                          <>
                              Genereer Rapport <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform"/>
                          </>
                      )}
                  </button>
              </div>
          </div>
      )}

      {activeView === 'report' && auditData && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
              
              {/* Report Header (Screen) */}
              <div className="bg-slate-50 border-b border-slate-200 p-8 flex justify-between items-center print:hidden">
                  <div className="flex gap-12">
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Datum Audit</p>
                          <p className="font-bold text-slate-900 text-xl">{auditDate}</p>
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Resultaat</p>
                          <p className={`font-bold text-xl flex items-center gap-2 ${diffTotal === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diffTotal > 0 ? `+${diffTotal} Overschot` : `${diffTotal} Tekort`}
                              {diffTotal !== 0 && <AlertTriangle size={20}/>}
                          </p>
                      </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                      <p>Totaal Besteld: <span className="font-bold text-slate-900">{totalOrdered}</span></p>
                      <p>Totaal Geleverd: <span className="font-bold text-slate-900">{totalDelivered}</span></p>
                  </div>
              </div>

              {/* PRINT HEADER (Hidden on Screen) */}
              <div className="hidden print:block p-8 border-b-2 border-black">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h1 className="text-3xl font-black text-black mb-1">LINNEN AUDIT RAPPORT</h1>
                          <p className="text-lg font-medium text-gray-600">Moderna Verschillenanalyse</p>
                      </div>
                      <div className="text-right">
                          <h2 className="font-bold text-lg">Sanadome Nijmegen</h2>
                          <p>Weg door Jonkerbos 90</p>
                          <p>6532 SZ Nijmegen</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 text-sm mb-6">
                      <div>
                          <p><span className="font-bold inline-block w-32">Gegenereerd door:</span> {currentUser.name}</p>
                          <p><span className="font-bold inline-block w-32">Datum & Tijd:</span> {new Date().toLocaleString('nl-NL')}</p>
                          <p><span className="font-bold inline-block w-32">Bestanden:</span> 1 Bestelbon, {deliveryFiles.length} Leverbon(nen)</p>
                      </div>
                  </div>

                  <div className="border-t border-black pt-4 flex justify-between items-center">
                      <div className="text-center">
                          <p className="text-xs uppercase font-bold text-gray-500">Totaal Besteld</p>
                          <p className="text-xl font-bold">{totalOrdered}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-xs uppercase font-bold text-gray-500">Totaal Geleverd</p>
                          <p className="text-xl font-bold">{totalDelivered}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-xs uppercase font-bold text-gray-500">Netto Verschil</p>
                          <p className={`text-xl font-bold ${diffTotal !== 0 ? 'text-black' : ''}`}>
                              {diffTotal > 0 ? `+${diffTotal}` : diffTotal}
                          </p>
                      </div>
                  </div>
              </div>

              {/* Data Table */}
              <table className="w-full text-left print:text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase print:bg-white print:border-b-2 print:border-black print:text-black">
                      <tr>
                          <th className="px-8 py-4 print:py-2 print:px-2">Artikel</th>
                          <th className="px-8 py-4 text-center print:py-2 print:px-2 w-32">Besteld</th>
                          <th className="px-8 py-4 text-center print:py-2 print:px-2 w-32">Geleverd</th>
                          <th className="px-8 py-4 text-right print:py-2 print:px-2 w-40">Verschil</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {auditData.map((item, index) => {
                          const diff = item.delivered - item.ordered;
                          const isError = diff !== 0;
                          return (
                              <tr key={index} className={`hover:bg-slate-50 print:hover:bg-transparent ${isError ? 'bg-red-50/30 print:bg-transparent' : ''}`}>
                                  <td className="px-8 py-4 print:py-1 print:px-2">
                                      <div className="font-bold text-slate-900 print:text-black text-sm flex items-center gap-2 group">
                                          {item.name}
                                          <button 
                                            onClick={() => openEditNameModal(item)}
                                            className="text-slate-300 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                            title="Naam wijzigen"
                                          >
                                              <Edit2 size={14}/>
                                          </button>
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono print:text-slate-600">{item.id}</div>
                                  </td>
                                  <td className="px-8 py-4 text-center print:py-1 print:px-2 text-slate-600 font-medium print:text-black">{item.ordered}</td>
                                  <td className="px-8 py-4 text-center print:py-1 print:px-2 text-slate-600 font-medium print:text-black">{item.delivered}</td>
                                  <td className="px-8 py-4 text-right print:py-1 print:px-2 font-bold">
                                      {diff === 0 ? (
                                          <span className="text-green-600 flex items-center justify-end gap-1 print:hidden">
                                              <CheckCircle2 size={16}/> OK
                                          </span>
                                      ) : (
                                          <span className="text-red-600 flex items-center justify-end gap-1 print:text-black">
                                              {diff > 0 ? `+${diff}` : diff}
                                          </span>
                                      )}
                                      <span className="hidden print:inline">{diff === 0 ? '-' : (diff > 0 ? `+${diff}` : diff)}</span>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>

              {/* PRINT FOOTER (Hidden on Screen) */}
              <div className="hidden print:block mt-8 pt-8 px-8 page-break-inside-avoid">
                  <div className="flex justify-between items-end gap-12">
                      <div className="w-1/2">
                          <div className="h-16 border-b border-black mb-1"></div>
                          <span className="text-[10px] font-bold uppercase text-black tracking-wider">Manager Handtekening</span>
                      </div>
                      <div className="w-1/3 text-right">
                          <div className="h-16 border-b border-black mb-1"></div>
                          <span className="text-[10px] font-bold uppercase text-black tracking-wider">Datum</span>
                      </div>
                  </div>
                  <div className="mt-8 text-center text-[10px] text-gray-400">
                      Generated by MijnSanadome HRMS
                  </div>
              </div>
          </div>
      )}

      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'archive' && renderArchive()}

      {/* EXCLUSION MODAL */}
      <Modal isOpen={isExclusionModalOpen} onClose={() => setIsExclusionModalOpen(false)} title="Uitsluitingen Beheren">
          <div className="space-y-4">
              <p className="text-sm text-slate-500">
                  Voeg artikelnummers toe die genegeerd moeten worden tijdens de audit. 
                  Dit is handig voor items die niet correct geteld worden.
              </p>
              
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Artikel ID (bv. 88211)" 
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={newExclusionId}
                    onChange={(e) => setNewExclusionId(e.target.value)}
                  />
                  <button 
                    onClick={addExclusion}
                    disabled={!newExclusionId}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-slate-800"
                  >
                      Toevoegen
                  </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {excludedIds.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm italic">Geen uitsluitingen.</div>
                  ) : (
                      <table className="w-full text-sm text-left">
                          <tbody className="divide-y divide-slate-100">
                              {excludedIds.map(id => (
                                  <tr key={id} className="hover:bg-slate-50 group">
                                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{id}</td>
                                      <td className="px-4 py-3 text-right">
                                          <button 
                                            onClick={() => removeExclusion(id)}
                                            className="text-slate-300 hover:text-red-500"
                                          >
                                              <Trash2 size={16}/>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      </Modal>

      {/* NAME EDIT MODAL */}
      <Modal isOpen={isNameEditModalOpen} onClose={() => setIsNameEditModalOpen(false)} title="Artikelnaam Wijzigen">
          <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Artikel ID</span>
                  <span className="font-mono font-bold text-slate-900">{editingItem?.id}</span>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nieuwe Naam</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    value={editingItem?.name || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                    autoFocus
                  />
              </div>
              <div className="flex justify-end pt-2">
                  <button 
                    onClick={saveItemName}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                  >
                      Opslaan
                  </button>
              </div>
          </div>
      </Modal>

      {/* PRINT LAYOUT OVERRIDE */}
      <style>{`
        @media print {
            @page { margin: 10mm; size: A4; }
            html, body { height: auto !important; overflow: visible !important; background: white !important; }
            #root { height: auto !important; overflow: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
            
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            
            aside, nav, header, .sidebar, .Toastify, button { display: none !important; }
            
            .max-w-\\[2400px\\], .max-w-5xl, .w-full { 
                max-width: 100% !important; 
                width: 100% !important; 
                margin: 0 !important; 
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
            }
            
            table { width: 100% !important; font-size: 9pt; }
            th, td { padding: 4px 8px !important; }
            
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
        }
      `}</style>

    </div>
  );
};

export default LinenAuditPage;
