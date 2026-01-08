
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Euro, Search, Filter, AlertTriangle, Clock, CheckCircle2, 
    MoreHorizontal, ChevronDown, Download, Upload, Plus, FileText, 
    Trash2, Edit, X, RefreshCw, Printer, Sparkles, FolderOpen, Mail, Phone, Calendar, Hash, Globe, FileSpreadsheet, AlertCircle, CheckSquare, Square, Edit2, FileCheck, Send, Save, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, Debtor, DebtorStatus, DebtorNote } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface DebtControlPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const DebtControlPage: React.FC<DebtControlPageProps> = ({ currentUser, onShowToast }) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DebtorStatus | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION' | 'NEW' | 'ONGOING' | 'URGENT' | 'DONE'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- DETAIL MODAL STATE ---
  const [detailDebtor, setDetailDebtor] = useState<Debtor | null>(null);
  const [isCreating, setIsCreating] = useState(false); 
  const [detailForm, setDetailForm] = useState({
      reservationNumber: '', 
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      addressStreet: '',
      addressNumber: '',
      addressZip: '',
      addressCity: '',
      addressCountry: 'Nederland',
      amount: 0,
      status: 'New' as DebtorStatus,
      statusDate: new Date().toISOString().split('T')[0],
      cashlistReason: '',
      correctionReason: ''
  });
  const [newDetailNote, setNewDetailNote] = useState('');
  
  // Status Modal State (Bulk)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetIds, setStatusTargetIds] = useState<string[]>([]); 
  const [bulkCashlistReason, setBulkCashlistReason] = useState('');
  const [bulkCorrectionReason, setBulkCorrectionReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<DebtorStatus | null>(null);

  // WIK Letter State
  const [wikTarget, setWikTarget] = useState<Debtor | null>(null);
  const [wikDateInput, setWikDateInput] = useState('');
  const [wikLanguage, setWikLanguage] = useState<'nl' | 'en' | 'de'>('nl');

  // Date Edit State (Quick Action)
  const [dateEditTarget, setDateEditTarget] = useState<Debtor | null>(null);
  const [newDateValue, setNewDateValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to check workflow rules
  const isActionRequired = (debtor: Debtor) => {
      if (debtor.status === 'Paid' || debtor.status === 'Correction' || debtor.status === 'Cashlist') return false;
      if (!debtor.statusDate) return false; 

      const statusDate = new Date(debtor.statusDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (debtor.status === 'Final Notice') {
          return diffDays > 14;
      }
      return diffDays > 7;
  };

  // Sorting Logic
  const sortDebtors = (list: Debtor[]) => {
      return list.sort((a, b) => {
          const aAction = isActionRequired(a);
          const bAction = isActionRequired(b);
          if (aAction && !bAction) return -1;
          if (!aAction && bAction) return 1;

          const statusWeight = { 'Final Notice': 3, '2nd Reminder': 2, '1st Reminder': 1, 'New': 0, 'Paid': -1, 'Correction': -1, 'Cashlist': -1 };
          const wA = statusWeight[a.status as keyof typeof statusWeight] || 0;
          const wB = statusWeight[b.status as keyof typeof statusWeight] || 0;
          if (wA !== wB) return wB - wA;

          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
  };

  useEffect(() => {
    loadDebtors();
    const unsubscribe = api.subscribeToDebtors((updatedDebtors) => {
        setDebtors(sortDebtors(updatedDebtors));
    });
    return () => { unsubscribe(); };
  }, []);

  const loadDebtors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDebtors();
      setDebtors(sortDebtors(data));
    } catch (e) {
      console.error("Failed to load debtors", e);
    } finally {
      setIsLoading(false);
    }
  };

  const enrichAddress = async (zipcode: string, houseNumber: string): Promise<{ street: string, city: string } | null> => {
      try {
          const cleanZip = zipcode.replace(/\s/g, '');
          const cleanNumber = houseNumber.trim();
          const response = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${cleanZip}+${encodeURIComponent(cleanNumber)}&rows=1`);
          const data = await response.json();
          if (data.response && data.response.docs && data.response.docs.length > 0) {
              const doc = data.response.docs[0];
              if (doc.straatnaam && doc.woonplaatsnaam) return { street: doc.straatnaam, city: doc.woonplaatsnaam };
          }
          return null;
      } catch (e) { return null; }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            let ws = wb.Sheets['Reservations'];
            if (!ws) ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 'A', defval: '' }) as any[];
            
            // Basic processing simulation
            let newDebtors: Debtor[] = [];
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row['AO'] && parseFloat(String(row['AO']).replace(',', '.')) > 0) {
                    newDebtors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        reservationNumber: String(row['A']),
                        firstName: String(row['D'] || ''),
                        lastName: String(row['B'] || '').split('-')[0].trim(),
                        amount: parseFloat(String(row['AO']).replace(',', '.')),
                        status: 'New',
                        address: String(row['G'] || ''),
                        email: String(row['E'] || ''),
                        phone: String(row['F'] || ''),
                        statusDate: new Date().toISOString(),
                        lastUpdated: new Date().toISOString(),
                        importedAt: new Date().toLocaleDateString('nl-NL')
                    });
                }
            }
            
            await api.saveDebtors([...debtors, ...newDebtors]);
            loadDebtors();
            onShowToast(`${newDebtors.length} dossiers geïmporteerd.`);
        } catch (error) {
            console.error("Parsing error", error);
            onShowToast("Fout bij inlezen bestand.");
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsBinaryString(file);
  };

  const filteredDebtors = useMemo(() => {
      let list = debtors.filter(d => {
          const term = searchTerm.toLowerCase();
          return (
              d.lastName.toLowerCase().includes(term) ||
              d.reservationNumber.toLowerCase().includes(term) ||
              (d.email && d.email.toLowerCase().includes(term))
          );
      });

      if (statusFilter !== 'All') list = list.filter(d => d.status === statusFilter);

      switch (activeTab) {
          case 'ACTION': return list.filter(d => isActionRequired(d));
          case 'NEW': return list.filter(d => d.status === 'New');
          case 'ONGOING': return list.filter(d => d.status === '1st Reminder' || d.status === '2nd Reminder');
          case 'URGENT': return list.filter(d => d.status === 'Final Notice' || d.status === 'Cashlist');
          case 'DONE': return list.filter(d => d.status === 'Paid' || d.status === 'Correction');
          default: return list;
      }
  }, [debtors, searchTerm, activeTab, statusFilter]);

  const parseAddress = (rawAddr: string) => {
      // Simplified parser for demo
      return { street: '', number: '', zip: '', city: '', country: 'Nederland' };
  };

  const handleOpenDetail = (debtor: Debtor) => {
      setDetailDebtor(debtor);
      setIsCreating(false);
      const parsed = parseAddress(debtor.address);
      setDetailForm({
          reservationNumber: debtor.reservationNumber,
          firstName: debtor.firstName,
          lastName: debtor.lastName,
          email: debtor.email || '',
          phone: debtor.phone || '',
          addressStreet: parsed.street,
          addressNumber: parsed.number,
          addressZip: parsed.zip,
          addressCity: parsed.city,
          addressCountry: parsed.country,
          amount: debtor.amount,
          status: debtor.status,
          statusDate: debtor.statusDate ? new Date(debtor.statusDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          cashlistReason: debtor.cashlistReason || '',
          correctionReason: debtor.correctionReason || ''
      });
  };

  const handleOpenCreate = () => {
      setIsCreating(true);
      setDetailDebtor(null);
      setDetailForm({
          reservationNumber: '', 
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          addressStreet: '',
          addressNumber: '',
          addressZip: '',
          addressCity: '',
          addressCountry: 'Nederland',
          amount: 0,
          status: 'New',
          statusDate: new Date().toISOString().split('T')[0],
          cashlistReason: '',
          correctionReason: ''
      });
  };

  const handleSaveDetails = async () => {
      const fullAddress = `${detailForm.addressStreet} ${detailForm.addressNumber}, ${detailForm.addressZip} ${detailForm.addressCity}`.trim();
      const debtorToSave: Debtor = {
          id: detailDebtor ? detailDebtor.id : crypto.randomUUID(),
          reservationNumber: detailForm.reservationNumber,
          firstName: detailForm.firstName,
          lastName: detailForm.lastName,
          email: detailForm.email,
          phone: detailForm.phone,
          address: fullAddress,
          amount: detailForm.amount,
          status: detailForm.status,
          statusDate: new Date(detailForm.statusDate).toISOString(),
          lastUpdated: new Date().toISOString(),
          importedAt: detailDebtor ? detailDebtor.importedAt : new Date().toLocaleDateString('nl-NL'),
          cashlistReason: detailForm.cashlistReason,
          correctionReason: detailForm.correctionReason,
          notes: detailDebtor?.notes || []
      };

      await api.saveDebtors([debtorToSave, ...debtors.filter(d => d.id !== debtorToSave.id)]);
      setDetailDebtor(null);
      loadDebtors();
      onShowToast("Dossier opgeslagen.");
  };

  const handleAddNoteInDetail = async () => {
      if (!detailDebtor || !newDetailNote.trim()) return;
      const note: DebtorNote = {
          id: crypto.randomUUID(),
          content: newDetailNote,
          date: new Date().toISOString(),
          author: currentUser.name
      };
      const updated = { ...detailDebtor, notes: [...(detailDebtor.notes || []), note] };
      await api.saveDebtors([updated, ...debtors.filter(d => d.id !== updated.id)]);
      setDetailDebtor(updated);
      setNewDetailNote('');
      onShowToast("Notitie toegevoegd.");
  };

  return (
    <div className="p-6 lg:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] pb-24 bg-slate-50 dark:bg-slate-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
             <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 rounded-xl">
               <Euro className="text-teal-600 dark:text-teal-400" size={32} />
             </div>
             Debiteuren Beheer
           </h1>
           <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Financieel overzicht & invordering.</p>
        </div>
        
        <div className="flex gap-3">
             <button onClick={handleOpenCreate} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:shadow-md"><Plus size={20}/> Nieuw Dossier</button>
             <input type="file" ref={fileInputRef} accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
             <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-all hover:-translate-y-0.5 disabled:opacity-70 hover:shadow-xl">{isUploading ? <RefreshCw className="animate-spin" size={20}/> : <Upload size={20}/>} {isUploading ? 'Verwerken...' : 'Importeer Rapportage'}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-6 pb-2">
          {['ALL', 'ACTION', 'NEW', 'ONGOING', 'URGENT', 'DONE'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
                    activeTab === tab 
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-700'
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Zoek op naam, reservering..." 
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                      <th className="px-6 py-4">Gast</th>
                      <th className="px-6 py-4">Reservering</th>
                      <th className="px-6 py-4">Bedrag</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Laatste Actie</th>
                      <th className="px-6 py-4 text-right">Actie</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredDebtors.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => handleOpenDetail(d)}>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{d.firstName} {d.lastName}</td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{d.reservationNumber}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">€ {d.amount.toFixed(2)}</td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${d.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {d.status}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(d.statusDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                              <button className="text-slate-400 hover:text-teal-600">
                                  <ArrowRight size={18} />
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* DETAIL MODAL */}
      <Modal isOpen={!!detailDebtor || isCreating} onClose={() => { setDetailDebtor(null); setIsCreating(false); }} title={isCreating ? "Nieuw Dossier" : "Dossier Details"}>
          <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Voornaam</label>
                      <input className="w-full p-2 border rounded" value={detailForm.firstName} onChange={e => setDetailForm({...detailForm, firstName: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Achternaam</label>
                      <input className="w-full p-2 border rounded" value={detailForm.lastName} onChange={e => setDetailForm({...detailForm, lastName: e.target.value})} />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reservering</label>
                  <input className="w-full p-2 border rounded" value={detailForm.reservationNumber} onChange={e => setDetailForm({...detailForm, reservationNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bedrag (€)</label>
                      <input type="number" className="w-full p-2 border rounded" value={detailForm.amount} onChange={e => setDetailForm({...detailForm, amount: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select className="w-full p-2 border rounded" value={detailForm.status} onChange={e => setDetailForm({...detailForm, status: e.target.value as DebtorStatus})}>
                          <option value="New">New</option>
                          <option value="1st Reminder">1st Reminder</option>
                          <option value="2nd Reminder">2nd Reminder</option>
                          <option value="Final Notice">Final Notice</option>
                          <option value="Paid">Paid</option>
                          <option value="Correction">Correction</option>
                          <option value="Cashlist">Cashlist</option>
                      </select>
                  </div>
              </div>

              {!isCreating && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-2">Notities</h4>
                      <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                          {detailDebtor?.notes?.map(note => (
                              <div key={note.id} className="text-sm bg-white p-2 rounded border border-slate-100">
                                  <div className="text-xs text-slate-400 mb-1">{new Date(note.date).toLocaleDateString()} - {note.author}</div>
                                  {note.content}
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-2">
                          <input className="flex-1 p-2 border rounded text-sm" placeholder="Nieuwe notitie..." value={newDetailNote} onChange={e => setNewDetailNote(e.target.value)} />
                          <button onClick={handleAddNoteInDetail} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded font-bold text-xs">Toevoegen</button>
                      </div>
                  </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={() => { setDetailDebtor(null); setIsCreating(false); }} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Annuleren</button>
                  <button onClick={handleSaveDetails} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">Opslaan</button>
              </div>
          </div>
      </Modal>

    </div>
  );
};

export default DebtControlPage;
