
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Euro, AlertCircle, CheckCircle2, Search, Filter, FileSpreadsheet, MoreHorizontal, ArrowUpRight, RefreshCw, Mail, Phone, AlertTriangle, ChevronDown, ChevronUp, Clock, Trash2, X, Edit, CheckSquare, Square, Printer, Calendar, Sparkles, Edit2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION' | 'NEW' | 'ONGOING' | 'URGENT' | 'DONE'>('ALL');
  
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

  // Date Edit State
  const [dateEditTarget, setDateEditTarget] = useState<Debtor | null>(null);
  const [newDateValue, setNewDateValue] = useState('');

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

          // 2. Blacklist (Keep urgent matters high)
          if (a.status === 'Blacklist' && b.status !== 'Blacklist') return -1;
          if (b.status === 'Blacklist' && a.status !== 'Blacklist') return 1;

          // 3. Status Progression (Final Notice higher than Reminder)
          const statusWeight = { 'Final Notice': 3, '2nd Reminder': 2, '1st Reminder': 1, 'New': 0, 'Paid': -1 };
          const wA = statusWeight[a.status as keyof typeof statusWeight] || 0;
          const wB = statusWeight[b.status as keyof typeof statusWeight] || 0;
          if (wA !== wB) return wB - wA;

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

  // --- ADDRESS ENRICHMENT LOGIC ---
  const enrichAddress = async (zipcode: string, houseNumber: string): Promise<{ street: string, city: string } | null> => {
      try {
          // Using PDOK Locatieserver (Free Dutch Government API)
          const cleanZip = zipcode.replace(/\s/g, '');
          const cleanNumber = houseNumber.trim();
          
          const response = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${cleanZip}+${encodeURIComponent(cleanNumber)}&rows=1`);
          const data = await response.json();
          
          if (data.response && data.response.docs && data.response.docs.length > 0) {
              const doc = data.response.docs[0];
              if (doc.straatnaam && doc.woonplaatsnaam) {
                  return {
                      street: doc.straatnaam,
                      city: doc.woonplaatsnaam
                  };
              }
          }
          return null;
      } catch (e) {
          console.warn("Address enrichment failed", e);
          return null;
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
            await processImportedData(data);
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
          let enrichedCount = 0;
          
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
                  let address = String(row['G'] || '').trim();
                  let isEnriched = false;

                  // --- ADDRESS ENRICHMENT CHECK ---
                  let zipToEnrich = '';
                  let numberToEnrich = '';

                  const matchZipFirst = address.match(/^(\d{4}\s?[a-zA-Z]{2})\s*[,]?\s*(\d+[\w-]*)/);
                  const matchZipLast = address.match(/(\d+[\w-]*)\s*[,]?\s*(\d{4}\s?[a-zA-Z]{2})\s*$/);

                  if (matchZipFirst) {
                      zipToEnrich = matchZipFirst[1];
                      numberToEnrich = matchZipFirst[2];
                  } else if (matchZipLast) {
                      numberToEnrich = matchZipLast[1];
                      zipToEnrich = matchZipLast[2];
                  }
                  
                  if (zipToEnrich && numberToEnrich) {
                      const enriched = await enrichAddress(zipToEnrich, numberToEnrich);
                      if (enriched) {
                          const cleanZip = zipToEnrich.replace(/\s/g, '');
                          const formattedZip = `${cleanZip.slice(0,4)} ${cleanZip.slice(4).toUpperCase()}`;
                          
                          const newAddress = `${enriched.street} ${numberToEnrich}, ${formattedZip} ${enriched.city}`;
                          
                          if (address !== newAddress) {
                              address = newAddress;
                              isEnriched = true;
                              enrichedCount++;
                          }
                      }
                  }

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
                              isEnriched: isEnriched || existing.isEnriched,
                              lastUpdated: new Date().toISOString(),
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
                          statusDate: new Date().toISOString(),
                          lastUpdated: new Date().toISOString(),
                          importedAt: new Date().toLocaleDateString('nl-NL'),
                          isEnriched: isEnriched
                      };
                      updatedDebtorsList.push(newDebtor);
                      currentDebtorsMap.set(reservationNumber, newDebtor);
                      newCount++;
                  }
              }
          }

          await api.saveDebtors(updatedDebtorsList);
          setDebtors(sortDebtors(updatedDebtorsList));
          
          let msg = `Import voltooid: ${newCount} nieuwe, ${updateCount} geüpdatet.`;
          if (enrichedCount > 0) msg += ` ${enrichedCount} adressen aangevuld.`;
          onShowToast(msg);

      } catch (e) {
          console.error("Processing error", e);
          onShowToast("Fout bij verwerken data.");
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // --- SELECTION & FILTERING LOGIC ---
  const filteredDebtors = useMemo(() => {
      let list = debtors.filter(d => {
          const term = searchTerm.toLowerCase();
          return (
              d.lastName.toLowerCase().includes(term) ||
              d.firstName.toLowerCase().includes(term) ||
              d.reservationNumber.toLowerCase().includes(term) ||
              (d.email && d.email.toLowerCase().includes(term)) ||
              (d.phone && d.phone.toLowerCase().includes(term)) ||
              d.address.toLowerCase().includes(term) ||
              d.status.toLowerCase().includes(term) ||
              d.amount.toString().includes(term)
          );
      });

      switch (activeTab) {
          case 'ACTION':
              return list.filter(d => isActionRequired(d));
          case 'NEW':
              return list.filter(d => d.status === 'New');
          case 'ONGOING':
              return list.filter(d => d.status === '1st Reminder' || d.status === '2nd Reminder');
          case 'URGENT':
              return list.filter(d => d.status === 'Final Notice' || d.status === 'Blacklist');
          case 'DONE':
              return list.filter(d => d.status === 'Paid');
          default:
              return list;
      }
  }, [debtors, searchTerm, activeTab]);

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
          setSelectedIds(new Set()); 

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
          setDebtors(updatedList);
          
          const success = await api.deleteDebtor(id);
          if (success) {
              onShowToast("Dossier verwijderd");
          } else {
              setDebtors(previousDebtors);
              onShowToast("Fout bij verwijderen.");
          }
      }
  };

  const openSingleStatusModal = (id: string) => {
      setStatusTargetIds([id]);
      setIsStatusModalOpen(true);
  };

  const applyStatusChange = async (newStatus: DebtorStatus) => {
      if (statusTargetIds.length === 0) return;

      if (!window.confirm(`Weet je zeker dat je de status wilt wijzigen naar '${newStatus}'?`)) {
          return;
      }

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
      setSelectedIds(new Set());
      onShowToast("Status succesvol aangepast");
  };

  // --- DATE EDITING LOGIC ---
  const openDateEdit = (debtor: Debtor) => {
      setDateEditTarget(debtor);
      const current = debtor.statusDate ? new Date(debtor.statusDate) : new Date();
      setNewDateValue(current.toISOString().split('T')[0]);
  };

  const handleDateSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dateEditTarget || !newDateValue) return;

      const updatedList = debtors.map(d => {
          if (d.id === dateEditTarget.id) {
              return { ...d, statusDate: new Date(newDateValue).toISOString() };
          }
          return d;
      });

      setDebtors(sortDebtors(updatedList));
      await api.saveDebtors(updatedList);
      setDateEditTarget(null);
      onShowToast("Datum succesvol aangepast");
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
      setWikDateInput('');
  };

  const generateWIKLetter = () => {
      if (!wikTarget || !wikDateInput) return;

      const formattedDateInput = new Date(wikDateInput).toLocaleDateString('nl-NL');
      const currentDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      const amountFormatted = wikTarget.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let streetLine = wikTarget.address || '';
      let cityLine = '';
      
      const addressMatch = streetLine.match(/^(.*?)\s+(\d{4}\s?[a-zA-Z]{2}\s+.*)$/) || 
                           streetLine.match(/^(.*?)\s+(\d{4}\s+.*)$/); 

      if (addressMatch) {
          streetLine = addressMatch[1];
          cityLine = addressMatch[2];
      }

      const letterContent = `
        <html>
        <head>
            <title>WIK Brief - ${wikTarget.lastName}</title>
            <style>
                body { font-family: 'Calibri', 'Segoe UI', sans-serif; padding: 40px; padding-top: 60mm; font-size: 11pt; line-height: 1.3; color: #000; }
                .header { display: flex; justify-content: space-between; margin-bottom: 60px; margin-top: -40px; }
                .recipient { width: 50%; line-height: 1.4; }
                .sender { width: 35%; text-align: left; font-size: 11pt; margin-left: auto; line-height: 1.4; }
                .sender-bold { font-weight: bold; }
                .meta { margin-bottom: 40px; }
                .subject { font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
                .content { margin-bottom: 40px; text-align: justify; }
                .signature { margin-top: 0px; }
                .signature strong { display: block; margin-top: 0px; }
                @media print {
                    @page { margin: 2cm; margin-top: 0; }
                    body { padding: 0; padding-top: 60mm; } 
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="recipient">
                    <strong>${wikTarget.firstName} ${wikTarget.lastName}</strong><br>
                    ${streetLine}<br>
                    ${cityLine || '&nbsp;'}
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
      const base = "border transition-all active:scale-95 shadow-sm";
      switch(status) {
          case 'New': return `${base} bg-blue-100/50 text-blue-700 border-blue-200 hover:bg-blue-100`;
          case '1st Reminder': return `${base} bg-amber-100/50 text-amber-700 border-amber-200 hover:bg-amber-100`;
          case '2nd Reminder': return `${base} bg-orange-100/50 text-orange-700 border-orange-200 hover:bg-orange-100`;
          case 'Final Notice': return `${base} bg-red-100/50 text-red-700 border-red-200 hover:bg-red-100`;
          case 'Paid': return `${base} bg-green-100/50 text-green-700 border-green-200 hover:bg-green-100`;
          case 'Blacklist': return `${base} bg-slate-800 text-white border-slate-700 hover:bg-slate-700`;
          default: return `${base} bg-slate-100 text-slate-600 border-slate-200`;
      }
  };

  const StatusOptionCard = ({ status, label, description, colorClass, onClick }: any) => (
      <button 
        onClick={onClick}
        className={`p-4 rounded-xl border text-left hover:shadow-lg transition-all group flex flex-col gap-2 h-full transform hover:-translate-y-1 ${colorClass}`}
      >
          <div className="flex items-center justify-between w-full">
              <span className="font-bold text-sm uppercase tracking-wider">{label}</span>
              <div className="w-6 h-6 rounded-full border-2 border-current opacity-30 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-3 h-3 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
          </div>
          <p className="text-xs opacity-80 font-medium leading-relaxed">{description}</p>
      </button>
  );

  return (
    <div className="p-6 lg:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] pb-24 bg-slate-50">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <div className="p-2.5 bg-teal-50 rounded-xl">
               <Euro className="text-teal-600" size={32} />
             </div>
             Debiteuren Beheer
           </h1>
           <p className="text-slate-500 mt-2 text-lg">Financieel overzicht & invordering.</p>
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
               className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 disabled:opacity-70 hover:shadow-xl"
             >
               {isUploading ? <RefreshCw className="animate-spin" size={20}/> : <Upload size={20}/>}
               {isUploading ? 'Verwerken...' : 'Importeer Rapportage'}
             </button>
        </div>
      </div>

      {/* Glassmorphism Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Euro size={80}/></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Totaal Openstaand</h3>
                  </div>
                  <div className="text-3xl xl:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
                      € {totalDebt.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                  </div>
              </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30 p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all hover:border-amber-200">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={80}/></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Actie Vereist</h3>
                  </div>
                  <div className="text-3xl xl:text-4xl font-bold text-amber-600">{actionRequiredCount}</div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Dossiers &gt; 14 dagen stil</p>
              </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><FileSpreadsheet size={80}/></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Actieve Dossiers</h3>
                  </div>
                  <div className="text-3xl xl:text-4xl font-bold text-slate-900">{debtors.length}</div>
              </div>
          </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-6 pb-2">
          {[
              { id: 'ALL', label: 'Overzicht', icon: null },
              { id: 'ACTION', label: 'Actie Vereist', icon: AlertTriangle, activeClass: 'bg-red-100 text-red-800 border-red-200' },
              { id: 'NEW', label: 'Nieuw', icon: Sparkles, activeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
              { id: 'ONGOING', label: 'Lopend', icon: Clock, activeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
              { id: 'URGENT', label: 'Urgent', icon: AlertCircle, activeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
              { id: 'DONE', label: 'Afgerond', icon: CheckCircle2, activeClass: 'bg-green-100 text-green-800 border-green-200' },
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border whitespace-nowrap ${
                    activeTab === tab.id 
                    ? (tab.activeClass || 'bg-slate-900 text-white border-slate-900 shadow-md')
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                  {tab.icon && <tab.icon size={16} className={activeTab === tab.id ? 'opacity-100' : 'opacity-50'} />}
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Zoek op naam, nummer, adres, bedrag..." 
                className="w-full pl-11 pr-4 py-3 bg-transparent rounded-xl text-sm focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block"></div>
          <div className="hidden md:flex items-center gap-4 pr-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>{filteredDebtors.length} Resultaten</span>
          </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col relative" style={{ maxHeight: 'calc(100vh - 350px)' }} ref={tableContainerRef}>
          <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-5 w-16 text-center">
                              <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600 transition-colors">
                                  {selectedIds.size > 0 && selectedIds.size === filteredDebtors.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                              </button>
                          </th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Dossier</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact & Adres</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Bedrag</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acties</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {filteredDebtors.map((debtor) => {
                          const needsAction = isActionRequired(debtor);
                          const daysOverdue = getDaysOverdue(debtor);
                          const isSelected = selectedIds.has(debtor.id);

                          return (
                          <tr 
                            key={debtor.id} 
                            onClick={() => toggleSelectOne(debtor.id)}
                            className={`transition-all group relative cursor-pointer ${
                                isSelected ? 'bg-blue-50/40' : needsAction ? 'bg-red-50/20 hover:bg-red-50/40' : 'hover:bg-slate-50/50'
                            }`}
                          >
                              {/* Selection Checkbox */}
                              <td className="px-4 py-5 text-center align-top" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => toggleSelectOne(debtor.id)} className={`transition-colors ${isSelected ? 'text-teal-600' : 'text-slate-300 hover:text-slate-400'}`}>
                                      {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                                  </button>
                              </td>

                              {/* Dossier Info */}
                              <td className="px-6 py-5 align-top relative">
                                  {needsAction && <div className="absolute left-0 top-4 bottom-4 w-1 bg-red-500 rounded-r-full"></div>}
                                  
                                  <div className="flex flex-col gap-1">
                                      <div className="font-bold text-slate-900 flex items-center gap-2 text-base">
                                          {debtor.lastName}, {debtor.firstName}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-100 w-fit px-2 py-0.5 rounded">
                                          #{debtor.reservationNumber}
                                      </div>
                                      {needsAction && (
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 mt-1 animate-pulse">
                                              <Clock size={12} /> Actie Vereist
                                          </div>
                                      )}
                                  </div>
                              </td>

                              {/* Contact Info */}
                              <td className="px-6 py-5 align-top text-sm">
                                  <div className="space-y-2 max-w-[250px]">
                                      <div className="flex items-start gap-2 text-slate-600">
                                          <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0"/> 
                                          <span className="truncate text-xs font-medium" title={debtor.email || ''}>
                                              {debtor.email && debtor.email !== 'N.v.t.' ? debtor.email : <span className="text-slate-400 italic">Geen email</span>}
                                          </span>
                                      </div>
                                      <div className="flex items-start gap-2 text-slate-600">
                                          <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0"/> 
                                          <span className="text-xs font-medium">
                                              {debtor.phone && debtor.phone !== 'N.v.t.' ? debtor.phone : <span className="text-slate-400 italic">Geen tel</span>}
                                          </span>
                                      </div>
                                      <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-100 mt-1">
                                          {debtor.isEnriched ? (
                                              <Sparkles size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                          ) : (
                                              <div className="w-3.5"></div>
                                          )}
                                          <span className={`text-xs leading-tight ${debtor.isEnriched ? 'text-indigo-700' : ''}`}>
                                              {debtor.address || <span className="italic text-slate-400">Adres onbekend</span>}
                                          </span>
                                      </div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); openEditContact(debtor); }} 
                                        className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Edit2 size={10}/> Wijzigen
                                      </button>
                                  </div>
                              </td>

                              {/* Status */}
                              <td className="px-6 py-5 align-top" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex flex-col items-start gap-2">
                                      <button 
                                        onClick={() => openSingleStatusModal(debtor.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm w-full md:w-auto justify-between ${getStatusBadge(debtor.status)}`}
                                      >
                                          <span className="flex items-center gap-1.5 truncate">
                                            {debtor.status === 'Paid' && <CheckCircle2 size={12} />}
                                            {debtor.status === 'Blacklist' && <AlertCircle size={12} />}
                                            {debtor.status}
                                          </span>
                                          <ChevronDown size={12} className="opacity-50"/>
                                      </button>
                                      
                                      {debtor.status !== 'Paid' && debtor.status !== 'New' && debtor.statusDate && (
                                          <div className="flex items-center gap-2 pl-1">
                                              <div className={`text-[10px] font-bold ${needsAction ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-slate-400'}`}>
                                                  {daysOverdue} dagen geleden
                                              </div>
                                              <button 
                                                onClick={() => openDateEdit(debtor)}
                                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Pas datum aan"
                                              >
                                                  <Edit2 size={10} />
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </td>

                              {/* Amount */}
                              <td className="px-6 py-5 align-top">
                                  <div className="font-bold text-slate-900 text-base">
                                      € {debtor.amount.toLocaleString('nl-NL', {minimumFractionDigits: 2})}
                                  </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-5 text-right align-top" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all translate-x-4 lg:group-hover:translate-x-0">
                                      <button 
                                        onClick={() => openWikModal(debtor)}
                                        className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 rounded-xl shadow-sm transition-all"
                                        title="WIK Brief Genereren"
                                      >
                                          <Printer size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteDebtor(debtor.id)}
                                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded-xl shadow-sm transition-all"
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
                              <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">
                                  <div className="flex flex-col items-center gap-2">
                                      <Search size={40} className="opacity-20 mb-2"/>
                                      <p>Geen dossiers gevonden.</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-2 rounded-2xl shadow-2xl z-40 flex items-center gap-2 animate-in slide-in-from-bottom-10 duration-300 border border-slate-700/50 backdrop-blur-xl bg-opacity-95">
              <div className="flex items-center gap-3 font-bold px-4 py-2">
                  <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">
                      {selectedIds.size}
                  </div>
                  <span className="text-sm">Geselecteerd</span>
              </div>
              <div className="h-8 w-px bg-slate-700"></div>
              <button 
                onClick={openBulkStatusModal}
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-colors text-sm font-bold"
              >
                  <Edit size={16}/> Status Wijzigen
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl transition-colors text-sm font-bold"
              >
                  <Trash2 size={16}/> Verwijderen
              </button>
              <div className="h-8 w-px bg-slate-700"></div>
              <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                  <X size={18}/>
              </button>
          </div>
      )}

      {/* Status Picker Modal */}
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
                    colorClass="bg-blue-50/50 border-blue-200 text-blue-700 hover:border-blue-400"
                    onClick={() => applyStatusChange('New')}
                  />
                  <StatusOptionCard 
                    status="1st Reminder" 
                    label="1e Herinnering" 
                    description="Eerste mail/brief verstuurd."
                    colorClass="bg-amber-50/50 border-amber-200 text-amber-700 hover:border-amber-400"
                    onClick={() => applyStatusChange('1st Reminder')}
                  />
                  <StatusOptionCard 
                    status="2nd Reminder" 
                    label="2e Herinnering" 
                    description="Tweede waarschuwing (+14 dagen)."
                    colorClass="bg-orange-50/50 border-orange-200 text-orange-700 hover:border-orange-400"
                    onClick={() => applyStatusChange('2nd Reminder')}
                  />
                  <StatusOptionCard 
                    status="Final Notice" 
                    label="Aanmaning" 
                    description="Laatste waarschuwing voor blacklist."
                    colorClass="bg-red-50/50 border-red-200 text-red-700 hover:border-red-400"
                    onClick={() => applyStatusChange('Final Notice')}
                  />
                  <StatusOptionCard 
                    status="Paid" 
                    label="Betaald" 
                    description="Dossier succesvol afgerond."
                    colorClass="bg-green-50/50 border-green-200 text-green-700 hover:border-green-400"
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
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white transition-colors"
                    placeholder="naam@email.com"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefoonnummer</label>
                  <input 
                    type="text" 
                    value={contactForm.phone} 
                    onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white transition-colors"
                    placeholder="+31 6..."
                  />
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                  <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg">
                      Opslaan
                  </button>
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

      {/* Date Edit Modal */}
      <Modal
        isOpen={!!dateEditTarget}
        onClose={() => setDateEditTarget(null)}
        title="Datum Wijzigen"
      >
          <form onSubmit={handleDateSave} className="space-y-5">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm flex gap-3">
                  <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                  <div>
                      <p className="font-bold mb-1">Let op:</p>
                      <p>Door de datum handmatig aan te passen naar meer dan 14 dagen geleden, wordt automatisch de 'Actie Vereist' markering geactiveerd.</p>
                  </div>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status Datum</label>
                  <input 
                    type="date" 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                    value={newDateValue}
                    onChange={(e) => setNewDateValue(e.target.value)}
                    required
                  />
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
              >
                  Datum Opslaan
              </button>
          </form>
      </Modal>

      {/* WIK Letter Date Modal */}
      <Modal
        isOpen={!!wikTarget}
        onClose={() => setWikTarget(null)}
        title="WIK Brief Genereren"
      >
          <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium">
                  <p>Je staat op het punt een officiële aanmaning te genereren voor <br/><span className="text-slate-900 text-base block mt-1">{wikTarget?.firstName} {wikTarget?.lastName}</span></p>
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
                      Wordt gebruikt in de aanhef van de brief.
                  </p>
              </div>

              <button 
                onClick={generateWIKLetter}
                disabled={!wikDateInput}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                  <Printer size={18} /> Genereer & Print Brief
              </button>
          </div>
      </Modal>

    </div>
  );
};

export default DebtControlPage;
