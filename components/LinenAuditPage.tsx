
import React, { useState, useRef } from 'react';
import { Upload, FileText, RefreshCw, Printer, AlertTriangle, CheckCircle2, FileCheck, X, ArrowRight } from 'lucide-react';
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
  // Upload State
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  
  // Process State
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditData, setAuditData] = useState<AuditItem[] | null>(null);
  const [auditDate, setAuditDate] = useState<string>('');

  const orderInputRef = useRef<HTMLInputElement>(null);
  const deliveryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'order' | 'delivery') => {
      const file = e.target.files?.[0];
      if (file) {
          if (type === 'order') setOrderFile(file);
          else setDeliveryFile(file);
      }
  };

  const generateReport = () => {
      if (!orderFile || !deliveryFile) return;
      
      setIsProcessing(true);
      
      // Simulate Processing
      setTimeout(() => {
          const mockData: AuditItem[] = [
            { id: 'MOD-101', name: 'Badlaken 140x70', ordered: 200, delivered: 195 },
            { id: 'MOD-102', name: 'Handdoek 50x100', ordered: 150, delivered: 150 },
            { id: 'MOD-103', name: 'Badmat', ordered: 50, delivered: 55 },
            { id: 'MOD-201', name: 'Dekbedovertrek 1P', ordered: 80, delivered: 80 },
            { id: 'MOD-202', name: 'Kussensloop', ordered: 160, delivered: 158 },
            { id: 'MOD-301', name: 'Tafelkleed Wit', ordered: 40, delivered: 40 },
            { id: 'MOD-302', name: 'Servet Wit', ordered: 200, delivered: 200 },
            { id: 'MOD-401', name: 'Keukendoek', ordered: 50, delivered: 45 },
            { id: 'MOD-402', name: 'Glazendoek', ordered: 50, delivered: 50 },
            { id: 'MOD-501', name: 'Koksbuis L', ordered: 10, delivered: 10 },
            { id: 'MOD-502', name: 'Koksbroek L', ordered: 10, delivered: 8 },
            { id: 'MOD-601', name: 'Wellness Badjas XL', ordered: 20, delivered: 20 },
            { id: 'MOD-602', name: 'Wellness Slippers', ordered: 100, delivered: 100 },
          ];
          
          setAuditData(mockData);
          setAuditDate(new Date().toLocaleDateString('nl-NL'));
          setIsProcessing(false);
          onShowToast("Rapport succesvol gegenereerd.");
      }, 2000);
  };

  const resetAudit = () => {
      setOrderFile(null);
      setDeliveryFile(null);
      setAuditData(null);
      setAuditDate('');
  };

  const totalOrdered = auditData?.reduce((sum, item) => sum + item.ordered, 0) || 0;
  const totalDelivered = auditData?.reduce((sum, item) => sum + item.delivered, 0) || 0;
  const diffTotal = totalDelivered - totalOrdered;

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] print:p-0 print:m-0 print:h-auto print:overflow-visible">
      
      {/* Header (No Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 print:hidden">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <FileText className="text-teal-600" size={32} />
             Linnen Audit
           </h1>
           <p className="text-slate-500 mt-1 text-lg">Vergelijk bestellingen met leveringen van Moderna.</p>
        </div>
        {auditData && (
            <div className="flex gap-3">
                 <button 
                   onClick={resetAudit}
                   className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm"
                 >
                   Nieuwe Audit
                 </button>
                 <button 
                   onClick={() => window.print()}
                   className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all text-sm"
                 >
                   <Printer size={18}/> Print Rapport
                 </button>
            </div>
        )}
      </div>

      {/* STEP 1: UPLOAD FILES */}
      {!auditData && (
          <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Order File Card */}
                  <div className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all h-64 ${orderFile ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <input 
                        type="file" 
                        ref={orderInputRef}
                        accept=".pdf,.xlsx,.csv" 
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'order')}
                      />
                      {orderFile ? (
                          <>
                              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                  <FileCheck size={32}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-lg mb-1">Bestelbon Geüpload</h3>
                              <p className="text-slate-500 text-sm mb-4 line-clamp-1">{orderFile.name}</p>
                              <button 
                                onClick={() => setOrderFile(null)} 
                                className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"
                              >
                                  <X size={12}/> Verwijder bestand
                              </button>
                          </>
                      ) : (
                          <>
                              <div 
                                onClick={() => orderInputRef.current?.click()}
                                className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4 cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                  <Upload size={32}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-lg mb-1">1. Upload Bestelbon</h3>
                              <p className="text-slate-400 text-sm mb-6">Sleep bestand hierheen of klik om te bladeren</p>
                              <button 
                                onClick={() => orderInputRef.current?.click()}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 shadow-sm"
                              >
                                  Kies Bestand
                              </button>
                          </>
                      )}
                  </div>

                  {/* Delivery File Card */}
                  <div className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all h-64 ${deliveryFile ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <input 
                        type="file" 
                        ref={deliveryInputRef}
                        accept=".pdf,.xlsx,.csv" 
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'delivery')}
                      />
                      {deliveryFile ? (
                          <>
                              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                  <FileCheck size={32}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-lg mb-1">Pakbon Geüpload</h3>
                              <p className="text-slate-500 text-sm mb-4 line-clamp-1">{deliveryFile.name}</p>
                              <button 
                                onClick={() => setDeliveryFile(null)} 
                                className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"
                              >
                                  <X size={12}/> Verwijder bestand
                              </button>
                          </>
                      ) : (
                          <>
                              <div 
                                onClick={() => deliveryInputRef.current?.click()}
                                className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4 cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                  <Upload size={32}/>
                              </div>
                              <h3 className="font-bold text-slate-900 text-lg mb-1">2. Upload Leverbon</h3>
                              <p className="text-slate-400 text-sm mb-6">Sleep bestand hierheen of klik om te bladeren</p>
                              <button 
                                onClick={() => deliveryInputRef.current?.click()}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 shadow-sm"
                              >
                                  Kies Bestand
                              </button>
                          </>
                      )}
                  </div>
              </div>

              <div className="text-center">
                  <button 
                    onClick={generateReport}
                    disabled={!orderFile || !deliveryFile || isProcessing}
                    className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-slate-900 rounded-2xl hover:bg-slate-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isProcessing ? (
                          <>
                              <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                              Analyseren...
                          </>
                      ) : (
                          <>
                              Genereer Rapport <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"/>
                          </>
                      )}
                  </button>
              </div>
          </div>
      )}

      {/* STEP 2: REPORT VIEW */}
      {auditData && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 print:border-none print:shadow-none print:rounded-none">
              
              {/* Screen Header - Hidden on Print */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
                  <div className="flex gap-8">
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datum Analyse</p>
                          <p className="font-bold text-slate-900 text-lg">{auditDate}</p>
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resultaat</p>
                          <p className={`font-bold text-lg ${diffTotal !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {diffTotal > 0 ? `+${diffTotal} Overschot` : diffTotal < 0 ? `${diffTotal} Tekort` : 'Correct'}
                          </p>
                      </div>
                  </div>
              </div>

              {/* Table */}
              <table className="w-full text-left print:text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase print:bg-white print:border-black print:text-black">
                      <tr>
                          <th className="px-6 py-4 print:py-2">Artikel</th>
                          <th className="px-6 py-4 text-center print:py-2">Besteld</th>
                          <th className="px-6 py-4 text-center print:py-2">Geleverd</th>
                          <th className="px-6 py-4 text-right print:py-2">Verschil</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-sm print:text-xs">
                      {auditData.map(item => {
                          const diff = item.delivered - item.ordered;
                          return (
                              <tr key={item.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                                  <td className="px-6 py-4 print:py-1">
                                      <div className="font-bold text-slate-900 print:text-black">{item.name}</div>
                                      <div className="text-xs text-slate-400 font-mono print:text-slate-600">{item.id}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center print:py-1">{item.ordered}</td>
                                  <td className="px-6 py-4 text-center print:py-1">{item.delivered}</td>
                                  <td className="px-6 py-4 text-right font-bold print:py-1">
                                      {diff === 0 ? (
                                          <span className="text-green-600 flex items-center justify-end gap-1 print:text-black print:hidden"><CheckCircle2 size={14}/> OK</span>
                                      ) : (
                                          <span className="text-red-600 flex items-center justify-end gap-1 print:text-black"><AlertTriangle size={14} className="print:hidden"/> {diff > 0 ? `+${diff}` : diff}</span>
                                      )}
                                      <span className="hidden print:inline">{diff === 0 ? '-' : (diff > 0 ? `+${diff}` : diff)}</span>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* PRINT-ONLY HEADER/FOOTER TEMPLATE */}
      <div className="hidden print:block print-container font-sans text-black p-0 m-0 w-full h-auto">
            <style>{`
                @media print {
                    @page { margin: 10mm; size: A4; }
                    html, body, #root {
                        height: auto !important;
                        width: 100% !important;
                        overflow: visible !important;
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .flex, .h-screen, .overflow-hidden, .overflow-y-auto, .relative, main {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }
                    aside, header, nav, .sidebar, .top-nav, button, input, select, .no-print, [role="dialog"], .Toastify {
                        display: none !important;
                    }
                    .print-container {
                        display: block !important;
                        position: relative !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        color: black !important;
                        z-index: 9999;
                    }
                    ::-webkit-scrollbar { display: none !important; }
                }
            `}</style>

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

            <div className="mb-8 grid grid-cols-3 gap-4 text-xs border-b border-gray-300 pb-6">
                <div>
                    <span className="block font-bold uppercase text-black mb-1 opacity-70">Geanalyseerd door</span>
                    <span className="block font-bold text-sm">{currentUser.name}</span>
                    <span className="block text-[10px]">{new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                    <span className="block font-bold uppercase text-black mb-1 opacity-70">Bestand(en)</span>
                    <span className="block font-bold text-sm">{orderFile?.name}</span>
                    <span className="block font-bold text-sm">{deliveryFile?.name}</span>
                </div>
                <div>
                    <span className="block font-bold uppercase text-black mb-1 opacity-70">Resultaat</span>
                    <span className="block font-bold text-sm">
                        {diffTotal === 0 ? 'CORRECT' : diffTotal > 0 ? `+${diffTotal} Overschot` : `${diffTotal} Tekort`}
                    </span>
                </div>
            </div>

            {/* The table from above is automatically included in print flow if not hidden */}
            {/* We just need the footer here */}
            
            <div className="mt-8 pt-8 border-t-2 border-black page-break-inside-avoid">
                <div className="flex justify-between items-end">
                    <div className="w-1/3">
                        <div className="h-16 border-b border-black mb-1"></div>
                        <span className="text-[10px] font-bold uppercase text-black tracking-wider">Handtekening Manager</span>
                    </div>
                    <div className="w-1/3 text-right">
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
