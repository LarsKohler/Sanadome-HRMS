import React, { useState, useEffect, useRef } from 'react';
import { Upload, Euro, AlertCircle, CheckCircle2, Search, Filter, FileSpreadsheet, MoreHorizontal, ArrowUpRight, RefreshCw, Mail, Phone, AlertTriangle, ChevronDown, ChevronUp, Clock, Trash2, X, Edit, CheckSquare, Square, Printer, Calendar } from 'lucide-react';
import { Debtor, DebtorStatus, Employee } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import * as XLSX from 'xlsx';

interface DebtControlPageProps {
  currentUser: Employee;
  onShowToast: (message: string) => void;
}

const DebtControlPage: React.FC<DebtControlPageProps> = ({ currentUser, onShowToast }) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Contact Edit State
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);
  const [contactForm, setContactForm] = useState({ email: '', phone: '' });
  
  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetIds, setStatusTargetIds] = useState<string[]>([]); // Which IDs are we changing?

  // WIK Letter State
  const [wikTarget, setWikTarget] = useState<Debtor | null>(null);
  const [wikDateInput, setWikDateInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper to check 2 week rule
  const isActionRequired = (debtor: Debtor) => {
      if (debtor.status === 'Paid' || debtor.status === 'Blacklist' || debtor.status === 'New') return false;
      if (!debtor.statusDate) return false; // Should generally allow new ones time

      const statusDate = new Date(debtor.statusDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 14;
  };

  const getDaysOverdue = (debtor: Debtor) => {
      if (!debtor.statusDate) return 0;
      const statusDate = new Date(debtor.statusDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Sorting Logic
  const sortDebtors = (list: Debtor[]) => {
      return list.sort((a, b) => {
          // 1. Action Required (Top Priority)
          const aAction = isActionRequired(a);
          const bAction = isActionRequired(b);
          if (aAction && !bAction) return -1;
          if (!aAction && bAction) return 1;

          // 2. Blacklist
          if (a.status === 'Blacklist' && b.status !== 'Blacklist') return -1;
          if (b.status === 'Blacklist' && a.status !== 'Blacklist') return 1;

          // 3. New
          if (a.status === 'New' && b.status !== 'New') return -1;
          if (b.status === 'New' && a.status !== 'New') return 1;

          // 4. Date Descending
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
  };

  useEffect(() => {
    loadDebtors();
    
    // Subscribe to realtime changes
    const unsubscribe = api.subscribeToDebtors((updatedDebtors) => {
        setDebtors(sortDebtors(updatedDebtors));
    });

    return () => {
        unsubscribe();
    };
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
            if (!ws) {
                ws = wb.Sheets[wb.SheetNames[0]];
            }

            const data = XLSX.utils.sheet_to_json(ws, { header: 'A', defval: '' }) as any[];
            processImportedData(data);
        } catch (error) {
            console.error("Parsing error", error);
            onShowToast("Fout bij inlezen bestand.");
            setIsUploading(false);
        }
    };
    reader.readAsBinaryString(file);
  };

  const processImportedData = async (data: any[]) => {
      try {
          let newCount = 0;
          let updateCount = 0;
          
          const currentDebtorsMap = new Map<string, Debtor>(debtors.map(d => [d.reservationNumber, d]));
          const updatedDebtorsList = [...debtors];

          for (let i = 1; i < data.length; i++) {
              const row = data[i];
              const balanceStr = row['AO'];
              
              let balance = 0;
              if (typeof balanceStr === 'number') balance = balanceStr;
              else if (typeof balanceStr === 'string') balance = parseFloat(balanceStr.replace(',', '.'));

              if (balance > 0) {
                  const reservationNumber = String(row['A'] || '').trim();
                  if (!reservationNumber) continue; 

                  const groupName = String(row['B'] || '');
                  const lastName = groupName.split('-')[0].trim() || 'Onbekend';
                  const firstName = String(row['D'] || '').trim();
                  const email = String(row['E'] || '').trim();
                  const phone = String(row['F'] || '').trim();
                  const address = String(row['G'] || '').trim();

                  const existing = currentDebtorsMap.get(reservationNumber);

                  if (existing) {
                      const updatedIndex = updatedDebtorsList.findIndex(d => d.id === existing.id);
                      if (updatedIndex >= 0) {
                          updatedDebtorsList[updatedIndex] = {
                              ...existing,
                              amount: balance, 
                              email: email || existing.email,
                              phone: phone || existing.phone,
                              address: address || existing.address,
                              lastUpdated: new Date().toLocaleDateString('en-US'), // Use standard format for sorting
                          };
                          updateCount++;
                      }
                  } else {
                      const newDebtor: Debtor = {
                          id: Math.random().toString(36).substr(2, 9),
                          reservationNumber,
                          firstName,
                          lastName,
                          email, 
                          phone,
                          address,
                          amount: balance,
                          status: 'New',
                          statusDate: new Date().toISOString(), // Initialize status date
                          lastUpdated: new Date().toISOString(),
                          importedAt: new Date().toLocaleDateString('nl-NL')
                      };
                      updatedDebtorsList.push(newDebtor);
                      currentDebtorsMap.set(reservationNumber, newDebtor);
                      newCount++;
                  }
              }
          }

          await api.saveDebtors(updatedDebtorsList);
          setDebtors(sortDebtors(updatedDebtorsList));
          onShowToast(`Import voltooid: ${newCount} nieuwe, ${updateCount} geüpdatet.`);

      } catch (e) {
          console.error("Processing error", e);
          onShowToast("Fout bij verwerken data.");
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // --- SELECTION LOGIC ---
  const filteredDebtors = debtors.filter(d => 
      d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.reservationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredDebtors.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredDebtors.map(d => d.id)));
      }
  };

  const toggleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  // --- BULK ACTIONS ---
  const handleBulkDelete = async () => {
      const count = selectedIds.size;
      if (count === 0) return;
      
      if(confirm(`Weet je zeker dat je ${count} dossier(s) wilt verwijderen?`)) {
          const idsToDelete = Array.from(selectedIds) as string[];
          const previousDebtors = [...debtors];
          const updatedList = debtors.filter(d => !selectedIds.has(d.id));
          setDebtors(updatedList); // Optimistic
          setSelectedIds(new Set()); // Clear selection

          const success = await api.deleteDebtors(idsToDelete);
          if (success) {
              onShowToast(`${count} dossiers verwijderd.`);
          } else {
              setDebtors(previousDebtors);
              onShowToast("Fout bij verwijderen.");
          }
      }
  };

  const openBulkStatusModal = () => {
      if (selectedIds.size === 0) return;
      setStatusTargetIds(Array.from(selectedIds) as string[]);
      setIsStatusModalOpen(true);
  };

  // --- INDIVIDUAL ACTIONS ---
  const handleDeleteDebtor = async (id: string) => {
      if(confirm("Weet je zeker dat je dit dossier wilt verwijderen?")) {
          const previousDebtors = [...debtors];
          const updatedList = debtors.filter(d => d.id !== id);
          setDebtors(updatedList); // Optimistic update
          
          const success = await api.deleteDebtor(id);
          if (success) {
              onShowToast("Dossier verwijderd");
          } else {
              setDebtors(previousDebtors); // Revert if failed
              onShowToast("Fout bij verwijderen. Controleer de database rechten.");
          }
      }
  };

  const openSingleStatusModal = (id: string) => {
      setStatusTargetIds([id]);
      setIsStatusModalOpen(true);
  };

  const applyStatusChange = async (newStatus: DebtorStatus) => {
      if (statusTargetIds.length === 0) return;

      const updatedList = debtors.map(d => {
          if (statusTargetIds.includes(d.id)) {
              return { ...d, status: newStatus, statusDate: new Date().toISOString() };
          }
          return d;
      });

      setDebtors(sortDebtors(updatedList));
      await api.saveDebtors(updatedList);
      
      setIsStatusModalOpen(false);
      setStatusTargetIds([]);
      setSelectedIds(new Set()); // Clear selection after action
      onShowToast("Status succesvol aangepast");
  };

  // --- Contact Editing ---
  const openEditContact = (debtor: Debtor) => {
      setEditingDebtor(debtor);
      setContactForm({ 
          email: debtor.email === 'N.v.t.' ? '' : (debtor.email || ''), 
          phone: debtor.phone === 'N.v.t.' ? '' : (debtor.phone || '') 
      });
  };

  const saveContact = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDebtor) return;

      const updatedList = debtors.map(d => d.id === editingDebtor.id ? {
          ...d,
          email: contactForm.email,
          phone: contactForm.phone
      } : d);

      setDebtors(updatedList);
      await api.saveDebtors(updatedList);
      setEditingDebtor(null);
      onShowToast("Contactgegevens bijgewerkt");
  };

  const markContactUnavailable = async () => {
      if (!editingDebtor) return;
      const updatedList = debtors.map(d => d.id === editingDebtor.id ? {
          ...d,
          email: d.email || 'N.v.t.',
          phone: d.phone || 'N.v.t.'
      } : d);
      setDebtors(updatedList);
      await api.saveDebtors(updatedList);
      setEditingDebtor(null);
      onShowToast("Gemarkeerd als niet beschikbaar");
  };

  // --- WIK LETTER GENERATION ---
  const openWikModal = (debtor: Debtor) => {
      setWikTarget(debtor);
      setWikDateInput(''); // Reset
  };

  const generateWIKLetter = () => {
      if (!wikTarget || !wikDateInput) return;

      const formattedDateInput = new Date(wikDateInput).toLocaleDateString('nl-NL');
      const currentDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      const amountFormatted = wikTarget.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const letterContent = `
        <html>
        <head>
            <title>WIK Brief - ${wikTarget.lastName}</title>
            <style>
                body { font-family: 'Calibri', 'Segoe UI', sans-serif; padding: 40px; padding-top: 100px; font-size: 12pt; line-height: 1.5; color: #000; }
                .header { display: flex; justify-content: space-between; margin-bottom: 60px; }
                .recipient { width: 50%; }
                .sender { width: 40%; text-align: left; font-size: 11pt; }
                .sender-bold { font-weight: bold; }
                .meta { margin-bottom: 40px; }
                .subject { font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
                .content { margin-bottom: 40px; text-align: justify; }
                .signature { margin-top: 40px; }
                .signature strong { display: block; margin-top: 50px; }
                @media print {
                    @page { margin: 2cm; margin-top: 0; }
                    body { padding: 0; padding-top: 50mm; } /* Specific for Window Envelope when printing */
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="recipient">
                    <strong>${wikTarget.firstName} ${wikTarget.lastName}</strong><br>
                    ${wikTarget.address || '(Adres Onbekend)'}<br>
                    (Postcode Plaats)
                </div>
                <div class="sender">
                    <span class="sender-bold">Sanadome Hotel & Spa</span><br>
                    Weg door Jonkerbos 90<br>
                    6532 SZ Nijmegen
                </div>
            </div>

            <div class="meta">
                Nijmegen, ${currentDate}
            </div>

            <div class="subject">
                Betalingsherinnering – Laatste aanmaning
            </div>

            <div class="content">
                <p>Beste ${wikTarget.lastName},</p>
                
                <p>Hierbij herinneren wij u aan de openstaande factuur met reserveringsnummer <strong>${wikTarget.reservationNumber}</strong> van <strong>${formattedDateInput}</strong> met een bedrag van <strong>€${amountFormatted}</strong>.</p>
                
                <p>Helaas hebben wij, ondanks meerdere herinneringen, tot op heden nog geen betaling van u mogen ontvangen. Wij verzoeken u vriendelijk het verschuldigde bedrag binnen 14 dagen over te maken naar ons rekeningnummer <strong>NL52 RABO 0181 6526 68</strong>, ten name van Sanadome Hotel & Spa Nijmegen, onder vermelding van het reserveringsnummer.</p>
                
                <p>Wij wijzen u erop dat wij bij uitblijven van tijdige betaling genoodzaakt zijn de vordering over te dragen aan een externe incassopartij. In dat geval worden incassokosten en wettelijke rente in rekening gebracht, conform de geldende wettelijke regelingen.</p>
                
                <p>Mocht u inmiddels wel betaald hebben, dan kunt u deze aanmaning als niet verzonden beschouwen.</p>
                
                <p>Indien u vragen, of opmerkingen met betrekking tot deze factuur heeft, kunt u ten allertijden contact opnemen met ons via de contactgegevens onderstaand deze brief.</p>
                
                <p>Wij vertrouwen erop dat u de betaling alsnog tijdig zult voldoen en hopen hiermee verdere incassomaatregelen te voorkomen.</p>
            </div>

            <div class="signature">
                Met hartelijke groet | With kind regards,<br>
                <strong>${currentUser.name} | ${currentUser.role}</strong>
            </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(letterContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
              printWindow.print();
              printWindow.close();
          }, 250);
      }
      
      setWikTarget(null); // Close modal
  };

  const totalDebt = debtors.filter(d => d.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const actionRequiredCount = debtors.filter(d => isActionRequired(d)).length;

  const getStatusBadge = (status: DebtorStatus) => {
      const base = "border transition-all active:scale-95";
      switch(status) {
          case 'New': return `${base} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`;
          case '1st Reminder': return `${base} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`;
          case '2nd Reminder': return `${base} bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100`;
          case 'Final Notice': return `${base} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`;
          case 'Paid': return `${base} bg-green-50 text-green-700 border-green-200 hover:bg-green-100`;
          case 'Blacklist': return `${base} bg-slate-900 text-white border-slate-700 hover:bg-slate-800`;
          default: return `${base} bg-slate-100 text-slate-600 border-slate-200`;
      }
  };

  const MissingBadge = ({ onClick }: { onClick: () => void }) => (
      <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 whitespace-nowrap hover:bg-amber-100 transition-colors"
      >
          <AlertTriangle size={10} /> Invullen
      </button>
  );

  const StatusOptionCard = ({ status, label, description, colorClass, onClick }: any) => (
      <button 
        onClick={onClick}
        className={`p-4 rounded-xl border text-left hover:shadow-md transition-all group flex flex-col gap-2 h-full ${colorClass}`}
      >
          <div className="flex items-center justify-between w-full">
              <span className="font-bold text-sm uppercase tracking-wider">{label}</span>
              <div className="w-5 h-5 rounded-full border-2 border-current opacity-30 group-hover:opacity-100 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
          </div>
          <p className="text-xs opacity-80 font-medium">{description}</p>
      </button>
  );

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Euro className="text-teal-600" size={32} />
             Debiteuren Beheer
           </h1>
           <p className="text-slate-500 mt-1">Workflow: Herinnering 1 &rarr; 2 &rarr; Aanmaning &rarr; Blacklist (2 weken interval).</p>
        </div>
        
        <div className="flex gap-3">
             <input 
                type="file" 
                ref={fileInputRef}
                accept=".csv, .xlsx, .xls" 
                className="hidden"
                onChange={handleFileUpload}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isUploading}
               className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 disabled:opacity-70"
             >
               {isUploading ? <RefreshCw className="animate-spin" size={18}/> : <Upload size={18}/>}
               {isUploading ? 'Verwerken...' : 'Upload Rapportage'}
             </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Euro size={20}/></div>
                  <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Totaal Openstaand</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">€ {totalDebt.toLocaleString('nl-NL', {minimumFractionDigits: 2})}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20}/></div>
                  <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Actie Vereist</h3>
              </div>
              <div className="text-3xl font-bold text-amber-600">{actionRequiredCount}</div>
              <p className="text-xs text-slate-500 mt-1">Dossiers &gt; 14 dagen in huidige status</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileSpreadsheet size={20}/></div>
                  <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Aantal Dossiers</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{debtors.length}</div>
          </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Zoek op naam of nummer..." 
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm pb-12 min-h-[500px]" ref={tableContainerRef}>
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-4 w-12 text-center">
                              <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600 transition-colors">
                                  {selectedIds.size > 0 && selectedIds.size === filteredDebtors.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                              </button>
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nr.</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Naam</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Adres</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bedrag</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acties</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredDebtors.map((debtor, index) => {
                          const needsAction = isActionRequired(debtor);
                          const daysOverdue = getDaysOverdue(debtor);
                          const isSelected = selectedIds.has(debtor.id);

                          return (
                          <tr 
                            key={debtor.id} 
                            onClick={() => toggleSelectOne(debtor.id)}
                            className={`transition-colors group relative cursor-pointer ${isSelected ? 'bg-blue-50/50' : needsAction ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50'}`}
                          >
                              <td className="px-4 py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => toggleSelectOne(debtor.id)} className={`transition-colors ${isSelected ? 'text-teal-600' : 'text-slate-300 hover:text-slate-400'}`}>
                                      {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                                  </button>
                              </td>
                              <td className="px-6 py-4 text-sm font-mono text-slate-600 align-top">
                                  {needsAction && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                  )}
                                  {debtor.reservationNumber}
                              </td>
                              <td className="px-6 py-4 align-top">
                                  <div className="font-bold text-slate-900 flex items-center gap-2">
                                      {debtor.lastName}, {debtor.firstName}
                                      {needsAction && (
                                          <span title="Actie Vereist!">
                                              <Clock size={14} className="text-red-500 animate-pulse"/>
                                          </span>
                                      )}
                                  </div>
                                  <div className="text-xs text-slate-400">Import: {debtor.importedAt}</div>
                              </td>
                              <td className="px-6 py-4 text-sm align-top" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1.5 text-slate-600">
                                          <Mail size={12} className="text-slate-400"/> 
                                          {debtor.email && debtor.email !== 'N.v.t.' ? (
                                              <span className="text-xs truncate max-w-[150px]" title={debtor.email}>{debtor.email}</span>
                                          ) : debtor.email === 'N.v.t.' ? (
                                              <span className="text-xs text-slate-400 italic">N.v.t.</span>
                                          ) : (
                                              <MissingBadge onClick={() => openEditContact(debtor)} />
                                          )}
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 text-slate-600">
                                          <Phone size={12} className="text-slate-400"/> 
                                          {debtor.phone && debtor.phone !== 'N.v.t.' ? (
                                              <span className="text-xs">{debtor.phone}</span>
                                          ) : debtor.phone === 'N.v.t.' ? (
                                              <span className="text-xs text-slate-400 italic">N.v.t.</span>
                                          ) : (
                                              <MissingBadge onClick={() => openEditContact(debtor)} />
                                          )}
                                      </div>
                                      
                                      {(debtor.email || debtor.phone) && (
                                          <button 
                                            onClick={() => openEditContact(debtor)} 
                                            className="text-[10px] text-teal-600 hover:underline font-bold text-left"
                                          >
                                              Bewerken
                                          </button>
                                      )}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] align-top">
                                  {debtor.address ? <span className="line-clamp-2" title={debtor.address}>{debtor.address}</span> : <span className="text-xs text-slate-400 italic">Onbekend</span>}
                              </td>
                              <td className="px-6 py-4 align-top">
                                  <span className="font-bold text-slate-900">€ {debtor.amount.toLocaleString('nl-NL', {minimumFractionDigits: 2})}</span>
                              </td>
                              <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                                  {/* Clickable Status Badge instead of Dropdown */}
                                  <button 
                                    onClick={() => openSingleStatusModal(debtor.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide w-full md:w-auto justify-between shadow-sm ${getStatusBadge(debtor.status)}`}
                                  >
                                      <span className="flex items-center gap-1.5">
                                        {debtor.status === 'Paid' && <CheckCircle2 size={12} />}
                                        {debtor.status}
                                      </span>
                                      <Edit size={12} className="opacity-50"/>
                                  </button>
                                  
                                  {debtor.status !== 'Paid' && debtor.status !== 'New' && debtor.statusDate && (
                                      <div className={`text-[10px] font-bold mt-1 ml-1 ${needsAction ? 'text-red-600' : 'text-slate-400'}`}>
                                          {daysOverdue} dagen geleden {needsAction && '(Actie!)'}
                                      </div>
                                  )}
                              </td>
                              <td className="px-6 py-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => openWikModal(debtor)}
                                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                        title="WIK Brief Genereren"
                                      >
                                          <Printer size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteDebtor(debtor.id)}
                                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Verwijderen"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      )})}
                      {filteredDebtors.length === 0 && (
                          <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                  Geen dossiers gevonden.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
              <div className="flex items-center gap-2 font-bold border-r border-slate-700 pr-6">
                  <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                      {selectedIds.size}
                  </div>
                  <span>Geselecteerd</span>
              </div>
              <div className="flex items-center gap-2">
                  <button 
                    onClick={openBulkStatusModal}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors text-sm font-bold"
                  >
                      <Edit size={16}/> Status Wijzigen
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-red-600/80 bg-red-600 text-white rounded-xl transition-colors text-sm font-bold"
                  >
                      <Trash2 size={16}/> Verwijderen
                  </button>
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                  <X size={16}/>
              </button>
          </div>
      )}

      {/* Visual Status Picker Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Status Wijzigen"
      >
          <div className="p-2">
              <p className="text-sm text-slate-500 mb-6">Kies de nieuwe status voor {statusTargetIds.length} dossier(s).</p>
              <div className="grid grid-cols-2 gap-4">
                  <StatusOptionCard 
                    status="New" 
                    label="Nieuw" 
                    description="Nog geen actie ondernomen."
                    colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-400"
                    onClick={() => applyStatusChange('New')}
                  />
                  <StatusOptionCard 
                    status="1st Reminder" 
                    label="1e Herinnering" 
                    description="Eerste mail/brief verstuurd."
                    colorClass="bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400"
                    onClick={() => applyStatusChange('1st Reminder')}
                  />
                  <StatusOptionCard 
                    status="2nd Reminder" 
                    label="2e Herinnering" 
                    description="Tweede waarschuwing (+14 dagen)."
                    colorClass="bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400"
                    onClick={() => applyStatusChange('2nd Reminder')}
                  />
                  <StatusOptionCard 
                    status="Final Notice" 
                    label="Aanmaning" 
                    description="Laatste waarschuwing voor blacklist."
                    colorClass="bg-red-50 border-red-200 text-red-700 hover:border-red-400"
                    onClick={() => applyStatusChange('Final Notice')}
                  />
                  <StatusOptionCard 
                    status="Paid" 
                    label="Betaald" 
                    description="Dossier succesvol afgerond."
                    colorClass="bg-green-50 border-green-200 text-green-700 hover:border-green-400"
                    onClick={() => applyStatusChange('Paid')}
                  />
                  <StatusOptionCard 
                    status="Blacklist" 
                    label="Blacklist" 
                    description="Geen toegang meer tot hotel."
                    colorClass="bg-slate-100 border-slate-300 text-slate-900 hover:border-slate-500"
                    onClick={() => applyStatusChange('Blacklist')}
                  />
              </div>
          </div>
      </Modal>

      {/* Contact Edit Modal */}
      <Modal
        isOpen={!!editingDebtor}
        onClose={() => setEditingDebtor(null)}
        title="Contactgegevens Bewerken"
      >
          <form onSubmit={saveContact} className="space-y-5">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mailadres</label>
                  <input 
                    type="email" 
                    value={contactForm.email} 
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                    placeholder="naam@email.com"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefoonnummer</label>
                  <input 
                    type="text" 
                    value={contactForm.phone} 
                    onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                    placeholder="+31 6..."
                  />
              </div>
              
              <div className="flex flex-col gap-3">
                  <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                      Opslaan
                  </button>
                  <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-xs text-slate-400">OF</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  <button 
                    type="button" 
                    onClick={markContactUnavailable}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                      Markeren als niet beschikbaar
                  </button>
              </div>
          </form>
      </Modal>

      {/* WIK Letter Date Modal */}
      <Modal
        isOpen={!!wikTarget}
        onClose={() => setWikTarget(null)}
        title="WIK Brief Genereren"
      >
          <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                  <p>Je staat op het punt een officiële aanmaning te genereren voor <strong>{wikTarget?.firstName} {wikTarget?.lastName}</strong>.</p>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Datum van incheck / Factuurdatum
                  </label>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="date" 
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        value={wikDateInput}
                        onChange={(e) => setWikDateInput(e.target.value)}
                      />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                      Deze datum wordt gebruikt in de zin: "...factuur met reserveringsnummer {wikTarget?.reservationNumber} van [DATUM]..."
                  </p>
              </div>

              <button 
                onClick={generateWIKLetter}
                disabled={!wikDateInput}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                  <Printer size={18} /> Genereer & Print Brief
              </button>
          </div>
      </Modal>

    </div>
  );
};

export default DebtControlPage;