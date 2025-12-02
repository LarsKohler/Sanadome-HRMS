import React, { useState, useRef } from 'react';
import { Upload, FileText, RefreshCw, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Employee } from '../types';

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

const LinenAuditPage: React.FC<LinenAuditPageProps> = ({ currentUser, onShowToast }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [detectedDate, setDetectedDate] = useState<string>('');
  const [auditData, setAuditData] = useState<AuditItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate processing
    setTimeout(() => {
        const mockData: AuditItem[] = [
            { id: 'MOD-101', name: 'Badlaken 140x70', ordered: 200, delivered: 195 },
            { id: 'MOD-102', name: 'Handdoek 50x100', ordered: 150, delivered: 150 },
            { id: 'MOD-103', name: 'Badmat', ordered: 50, delivered: 55 },
            { id: 'MOD-201', name: 'Dekbedovertrek 1P', ordered: 80, delivered: 80 },
            { id: 'MOD-202', name: 'Kussensloop', ordered: 160, delivered: 158 },
        ];
        setAuditData(mockData);
        setDetectedDate(new Date().toLocaleDateString('nl-NL'));
        setIsUploading(false);
        onShowToast("Audit bestand verwerkt.");
    }, 1500);
  };

  const totalOrderedNow = auditData.reduce((sum, item) => sum + item.ordered, 0);
  const totalDeliveredNow = auditData.reduce((sum, item) => sum + item.delivered, 0);
  const diffTotalNow = totalDeliveredNow - totalOrderedNow;

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
      {/* UI for uploading and viewing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 no-print">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <FileText className="text-teal-600" size={32} />
             Linnen Audit
           </h1>
           <p className="text-slate-500 mt-1 text-lg">Controleer leveringen van Moderna.</p>
        </div>
        <div className="flex gap-3">
             <input 
                type="file" 
                ref={fileInputRef}
                accept=".pdf" 
                className="hidden"
                onChange={handleFileUpload}
             />
             <button 
               onClick={() => window.print()}
               disabled={auditData.length === 0}
               className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
             >
               <Printer size={18}/> Print Rapport
             </button>
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isUploading}
               className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 disabled:opacity-70 hover:shadow-xl"
             >
               {isUploading ? <RefreshCw className="animate-spin" size={20}/> : <Upload size={20}/>}
               {isUploading ? 'Verwerken...' : 'Upload Pakbon'}
             </button>
        </div>
      </div>

      {auditData.length === 0 && !isUploading && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed no-print">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-900 text-lg">Nog geen data</h3>
              <p className="text-slate-500 text-sm mt-1">Upload een Moderna pakbon (PDF) om te beginnen.</p>
          </div>
      )}

      {auditData.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 no-print">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex gap-6">
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Leverdatum</p>
                          <p className="font-bold text-slate-900">{detectedDate}</p>
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Totaal Verschil</p>
                          <p className={`font-bold ${diffTotalNow !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {diffTotalNow > 0 ? `+${diffTotalNow}` : diffTotalNow}
                          </p>
                      </div>
                  </div>
              </div>
              <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                      <tr>
                          <th className="px-6 py-4">Artikel</th>
                          <th className="px-6 py-4 text-center">Besteld</th>
                          <th className="px-6 py-4 text-center">Geleverd</th>
                          <th className="px-6 py-4 text-right">Verschil</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {auditData.map(item => {
                          const diff = item.delivered - item.ordered;
                          return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{item.name}</div>
                                      <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center">{item.ordered}</td>
                                  <td className="px-6 py-4 text-center">{item.delivered}</td>
                                  <td className="px-6 py-4 text-right font-bold">
                                      {diff === 0 ? (
                                          <span className="text-green-600 flex items-center justify-end gap-1"><CheckCircle2 size={14}/> OK</span>
                                      ) : (
                                          <span className="text-red-600 flex items-center justify-end gap-1"><AlertTriangle size={14}/> {diff > 0 ? `+${diff}` : diff}</span>
                                      )}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* PRINT TEMPLATE - NEW LAYOUT */}
      <div className="hidden print:block print-container font-sans text-black p-0 m-0 w-full h-auto">
            <style>{`
                @media print {
                    @page { margin: 10mm; size: A4; }
                    
                    /* GLOBAL RESET - Break out of the SPA layout constraints */
                    html, body, #root {
                        height: auto !important;
                        width: 100% !important;
                        overflow: visible !important;
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Disable flex/grid/scroll on main app containers */
                    .flex, .h-screen, .overflow-hidden, .overflow-y-auto, .relative, main {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }

                    /* Hide Sidebar, Header, Buttons, etc */
                    aside, header, nav, .sidebar, .top-nav, button, input, select, .no-print, [role="dialog"] {
                        display: none !important;
                    }

                    /* Hide the screen content wrapper specifically */
                    .print\\:hidden {
                        display: none !important;
                    }

                    /* PRINT CONTAINER SETUP */
                    .print-container {
                        display: block !important;
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        font-size: 11px;
                        line-height: 1.4;
                        color: black !important;
                        z-index: 9999;
                    }

                    /* Table Styling */
                    table { width: 100% !important; border-collapse: collapse !important; }
                    thead { display: table-header-group !important; }
                    tfoot { display: table-footer-group !important; }
                    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                    th { border-bottom: 2px solid black !important; padding: 8px 4px; text-transform: uppercase; font-size: 10px; }
                    td { border-bottom: 1px solid #eee !important; padding: 6px 4px; }
                    
                    /* Utilities */
                    .text-right { text-align: right !important; }
                    .text-center { text-align: center !important; }
                    .font-bold { font-weight: bold !important; }
                    .uppercase { text-transform: uppercase !important; }
                    .mb-8 { margin-bottom: 2rem !important; }
                    .mb-1 { margin-bottom: 0.25rem !important; }
                    .pt-8 { padding-top: 2rem !important; }
                    .border-b-2 { border-bottom-width: 2px !important; }
                    .border-black { border-color: black !important; }
                    
                    /* Hide scrollbars (slider) specifically */
                    ::-webkit-scrollbar { display: none; }
                    * { -ms-overflow-style: none; scrollbar-width: none; }
                }
            `}</style>

            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight mb-1">Linnen Audit Rapport</h1>
                    <p className="text-xs font-bold text-black uppercase">Moderna Verschillenanalyse</p>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-sm">Sanadome Nijmegen</h2>
                    <p className="text-xs">Weg door Jonkerbos 90</p>
                    <p className="text-xs">6532 SZ Nijmegen</p>
                </div>
            </div>

            {/* Metadata */}
            <div className="mb-8 grid grid-cols-3 gap-4 text-xs border-b border-gray-300 pb-6">
                <div>
                    <span className="block font-bold uppercase text-black mb-1 opacity-70">Geanalyseerd door</span>
                    <span className="block font-bold text-sm">{currentUser.name}</span>
                    <span className="block text-[10px]">{new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                    <span className="block font-bold uppercase text-black mb-1 opacity-70">Leverdatum (PDF)</span>
                    <span className="block font-bold text-sm">{detectedDate || 'Onbekend'}</span>
                </div>
                <div>
                    <span className="block font-bold uppercase text-black mb-1 opacity-70">Resultaat</span>
                    <span className="block font-bold text-sm">
                        {diffTotalNow === 0 ? 'CORRECT' : diffTotalNow > 0 ? `+${diffTotalNow} Overschot` : `${diffTotalNow} Tekort`}
                    </span>
                </div>
            </div>

            {/* Main Table */}
            <table className="w-full text-left text-xs mb-8">
                <thead>
                    <tr>
                        <th style={{width: '15%'}}>Art. Nr</th>
                        <th style={{width: '45%'}}>Omschrijving</th>
                        <th style={{width: '15%'}} className="text-center">Besteld</th>
                        <th style={{width: '15%'}} className="text-center">Geleverd</th>
                        <th style={{width: '10%'}} className="text-right">Verschil</th>
                    </tr>
                </thead>
                <tbody>
                    {auditData.map((item) => {
                        const diff = item.delivered - item.ordered;
                        const isIssue = diff !== 0;
                        return (
                            <tr key={item.id} style={{ backgroundColor: isIssue ? '#f8f9fa' : 'transparent' }}>
                                <td className="font-mono">{item.id}</td>
                                <td className={isIssue ? 'font-bold' : ''}>{item.name}</td>
                                <td className="text-center">{item.ordered}</td>
                                <td className="text-center">{item.delivered}</td>
                                <td className="text-right font-bold">
                                    {diff !== 0 ? (
                                        <span style={{ color: diff < 0 ? 'black' : 'black' }}>
                                            {diff > 0 ? '+' : ''}{diff}
                                        </span>
                                    ) : (
                                        <span style={{color: '#ccc'}}>-</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Summary & Signatures (Prevent break inside) */}
            <div style={{ pageBreakInside: 'avoid' }} className="mt-8">
                <div className="flex justify-end mb-12">
                    <div className="w-[40%] border border-black p-4">
                        <h3 className="font-bold text-xs uppercase border-b border-black pb-2 mb-2">Samenvatting</h3>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Totaal Besteld:</span>
                            <span className="font-bold">{totalOrderedNow}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Totaal Geleverd:</span>
                            <span className="font-bold">{totalDeliveredNow}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-300 text-sm font-bold">
                            <span>Netto Verschil:</span>
                            <span>{diffTotalNow > 0 ? '+' : ''}{diffTotalNow}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-16 pt-8 border-t-2 border-black">
                    <div>
                        <div className="h-16 border-b border-black mb-1"></div>
                        <span className="text-[10px] font-bold uppercase text-black tracking-wider">Handtekening Manager</span>
                    </div>
                    <div>
                        <div className="h-16 border-b border-black mb-1"></div>
                        <span className="text-[10px] font-bold uppercase text-black tracking-wider">Datum & Plaats</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LinenAuditPage;