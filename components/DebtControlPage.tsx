
// ... existing imports ...
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

  // --- NEW: COMPREHENSIVE DETAIL MODAL STATE ---
  const [detailDebtor, setDetailDebtor] = useState<Debtor | null>(null);
  const [isCreating, setIsCreating] = useState(false); // Track if we are creating a new debtor
  const [detailForm, setDetailForm] = useState({
      reservationNumber: '', // Added for create mode
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      // Address split fields
      addressStreet: '',
      addressNumber: '',
      addressZip: '',
      addressCity: '',
      addressCountry: 'Nederland',
      amount: 0,
      status: 'New' as DebtorStatus,
      statusDate: new Date().toISOString().split('T')[0], // NEW: Start Date
      cashlistReason: '',
      correctionReason: ''
  });
  const [isAddressParseError, setIsAddressParseError] = useState(false);
  const [newDetailNote, setNewDetailNote] = useState('');
  const [ignoredAddressWarnings, setIgnoredAddressWarnings] = useState<Set<string>>(new Set());
  
  // Status Modal State (Bulk)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetIds, setStatusTargetIds] = useState<string[]>([]); 
  const [bulkCashlistReason, setBulkCashlistReason] = useState('');
  const [bulkCorrectionReason, setBulkCorrectionReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<DebtorStatus | null>(null);

  // Custom Confirm Modal State
  const [confirmModalState, setConfirmModalState] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      type: 'warning' | 'danger';
      onConfirm: () => void;
  }>({
      isOpen: false,
      title: '',
      message: '',
      type: 'warning',
      onConfirm: () => {}
  });

  // WIK Letter State
  const [wikTarget, setWikTarget] = useState<Debtor | null>(null);
  const [wikDateInput, setWikDateInput] = useState('');
  const [wikLanguage, setWikLanguage] = useState<'nl' | 'en' | 'de'>('nl');

  // Date Edit State (Quick Action)
  const [dateEditTarget, setDateEditTarget] = useState<Debtor | null>(null);
  const [newDateValue, setNewDateValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper to check workflow rules
  const isActionRequired = (debtor: Debtor) => {
      if (debtor.status === 'Paid' || debtor.status === 'Correction' || debtor.status === 'Cashlist') return false;
      if (!debtor.statusDate) return false; 

      const statusDate = new Date(debtor.statusDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // WORKFLOW RULES:
      // Final Notice (Aanmaning) -> 14 days
      if (debtor.status === 'Final Notice') {
          return diffDays > 14;
      }
      
      // Others (New, 1st Reminder, 2nd Reminder) -> 7 days
      return diffDays > 7;
  };

  const getDaysOverdue = (debtor: Debtor) => {
      if (!debtor.statusDate) return 0;
      const statusDate = new Date(debtor.statusDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - statusDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getNextLogicalStatus = (currentStatus: DebtorStatus): DebtorStatus | null => {
      switch(currentStatus) {
          case 'New': return '1st Reminder';
          case '1st Reminder': return '2nd Reminder';
          case '2nd Reminder': return 'Final Notice';
          case 'Final Notice': return 'Cashlist';
          default: return null;
      }
  };

  const isAddressIncomplete = (debtor: Debtor) => {
      if (ignoredAddressWarnings.has(debtor.id)) return false;
      // Basic check: looks for zipcode pattern or simple length
      const hasZip = /\d{4}/.test(debtor.address);
      const isShort = debtor.address.length < 10;
      return !hasZip || isShort;
  };

  // Sorting Logic
  const sortDebtors = (list: Debtor[]) => {
      return list.sort((a, b) => {
          // 1. Action Required (Top Priority)
          const aAction = isActionRequired(a);
          const bAction = isActionRequired(b);
          if (aAction && !bAction) return -1;
          if (!aAction && bAction) return 1;

          // 2. Cashlist (Keep urgent matters high) - Removed Blacklist
          const isBadA = a.status === 'Cashlist';
          const isBadB = b.status === 'Cashlist';
          if (isBadA && !isBadB) return -1;
          if (isBadB && !isBadA) return 1;

          // 3. Status Progression 
          const statusWeight = { 'Final Notice': 3, '2nd Reminder': 2, '1st Reminder': 1, 'New': 0, 'Paid': -1, 'Correction': -1 };
          const wA = statusWeight[a.status as keyof typeof statusWeight] || 0;
          const wB = statusWeight[b.status as keyof typeof statusWeight] || 0;
          if (wA !== wB) return wB - wA;

          // 4. Date Descending
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

  // --- ADDRESS ENRICHMENT LOGIC ---
  const enrichAddress = async (zipcode: string, houseNumber: string): Promise<{ street: string, city: string } | null> => {
      try {
          const cleanZip = zipcode.replace(/\s/g, '');
          const cleanNumber = houseNumber.trim();
          const response = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${cleanZip}+${encodeURIComponent(cleanNumber)}&rows=1`);
          const data = await response.json();
          
          if (data.response && data.response.docs && data.response.docs.length > 0) {
              const doc = data.response.docs[0];
              if (doc.straatnaam && doc.woonplaatsnaam) {
                  return { street: doc.straatnaam, city: doc.woonplaatsnaam };
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
            if (!ws) ws = wb.Sheets[wb.SheetNames[0]];

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
      // ... (Same import logic) ...
      try {
          let newCount = 0;
          let skippedCount = 0;
          let enrichedCount = 0;
          const existingNumbers = new Set(debtors.map(d => d.reservationNumber));
          const newDebtorsList: Debtor[] = [];

          for (let i = 1; i < data.length; i++) {
              const row = data[i];
              const balanceStr = row['AO'];
              let balance = 0;
              if (typeof balanceStr === 'number') balance = balanceStr;
              else if (typeof balanceStr === 'string') balance = parseFloat(balanceStr.replace(',', '.'));

              if (balance > 0) {
                  const reservationNumber = String(row['A'] || '').trim();
                  if (!reservationNumber) continue; 

                  if (existingNumbers.has(reservationNumber)) {
                      skippedCount++;
                      continue;
                  }

                  const groupName = String(row['B'] || '');
                  const lastName = groupName.split('-')[0].trim() || 'Onbekend';
                  const firstName = String(row['D'] || '').trim();
                  const email = String(row['E'] || '').trim();
                  const phone = String(row['F'] || '').trim();
                  let address = String(row['G'] || '').trim();
                  let isEnriched = false;

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

                  const newDebtor: Debtor = {
                      id: Math.random().toString(36).substr(2, 9),
                      reservationNumber,
                      firstName,
                      lastName,
                      email, 
                      phone,
                      address, // Initially raw string or enriched string
                      amount: balance,
                      status: 'New',
                      statusDate: new Date().toISOString(),
                      lastUpdated: new Date().toISOString(),
                      importedAt: new Date().toLocaleDateString('nl-NL'),
                      isEnriched: isEnriched
                  };
                  newDebtorsList.push(newDebtor);
                  newCount++;
                  existingNumbers.add(reservationNumber);
              }
          }

          const finalDebtorsList = [...debtors, ...newDebtorsList];
          await api.saveDebtors(finalDebtorsList);
          setDebtors(sortDebtors(finalDebtorsList));
          
          let msg = `Import voltooid: ${newCount} nieuwe dossiers. ${skippedCount} dubbele overgeslagen.`;
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

      // Apply Status Filter (New)
      if (statusFilter !== 'All') {
          list = list.filter(d => d.status === statusFilter);
      }

      switch (activeTab) {
          case 'ACTION': return list.filter(d => isActionRequired(d));
          case 'NEW': return list.filter(d => d.status === 'New');
          case 'ONGOING': return list.filter(d => d.status === '1st Reminder' || d.status === '2nd Reminder');
          case 'URGENT': return list.filter(d => d.status === 'Final Notice' || d.status === 'Cashlist'); // Removed Blacklist
          case 'DONE': return list.filter(d => d.status === 'Paid' || d.status === 'Correction');
          default: return list;
      }
  }, [debtors, searchTerm, activeTab, statusFilter]);

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredDebtors.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredDebtors.map(d => d.id)));
      }
  };

  const toggleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const closeConfirmModal = () => {
      setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  };

  // --- ACTIONS ---
  const handleBulkDelete = () => {
      const count = selectedIds.size;
      if (count === 0) return;
      
      setConfirmModalState({
          isOpen: true,
          title: 'Dossiers verwijderen',
          message: `Weet je zeker dat je ${count} geselecteerde dossier(s) wilt verwijderen?`,
          type: 'danger',
          onConfirm: async () => {
              const idsToDelete = Array.from(selectedIds) as string[];
              const previousDebtors = [...debtors];
              const updatedList = debtors.filter(d => !selectedIds.has(d.id));
              setDebtors(updatedList); 
              setSelectedIds(new Set()); 
              const success = await api.deleteDebtors(idsToDelete);
              if (success) onShowToast(`${count} dossiers verwijderd.`);
              else {
                  setDebtors(previousDebtors);
                  onShowToast("Fout bij verwijderen.");
              }
              closeConfirmModal();
          }
      });
  };

  const openBulkStatusModal = () => {
      if (selectedIds.size === 0) return;
      setStatusTargetIds(Array.from(selectedIds) as string[]);
      setBulkCashlistReason('');
      setBulkCorrectionReason('');
      setTargetStatus(null);
      setIsStatusModalOpen(true);
  };

  const handleDeleteDebtor = (id: string) => {
      setConfirmModalState({
          isOpen: true,
          title: 'Dossier verwijderen',
          message: 'Weet je zeker dat je dit dossier definitief wilt verwijderen?',
          type: 'danger',
          onConfirm: async () => {
              const previousDebtors = [...debtors];
              const updatedList = debtors.filter(d => d.id !== id);
              setDebtors(updatedList);
              const success = await api.deleteDebtor(id);
              if (success) onShowToast("Dossier verwijderd");
              else {
                  setDebtors(previousDebtors);
                  onShowToast("Fout bij verwijderen.");
              }
              // Also close detail modal if it was open for this user
              if (detailDebtor?.id === id) setDetailDebtor(null);
              closeConfirmModal();
          }
      });
  };

  const openSingleStatusModal = (id: string) => {
      setStatusTargetIds([id]);
      setBulkCashlistReason('');
      setBulkCorrectionReason('');
      setTargetStatus(null);
      setIsStatusModalOpen(true);
  };

  const handleStatusSelect = (newStatus: DebtorStatus) => {
      setTargetStatus(newStatus);
      // Reset specialized reasons when switching status
      if (newStatus !== 'Cashlist') setBulkCashlistReason('');
      if (newStatus !== 'Correction') setBulkCorrectionReason('');

      // If NOT cashlist OR correction, apply immediately. 
      if (newStatus !== 'Cashlist' && newStatus !== 'Correction') {
          applyStatusChange(newStatus);
      }
  };

  const applyStatusChange = (newStatus: DebtorStatus) => {
      if (statusTargetIds.length === 0) return;
      
      // Validation for special statuses
      if (newStatus === 'Cashlist' && !bulkCashlistReason.trim()) return;
      if (newStatus === 'Correction' && !bulkCorrectionReason.trim()) return;

      setIsStatusModalOpen(false);

      setConfirmModalState({
          isOpen: true,
          title: 'Status wijzigen',
          message: `Weet je zeker dat je de status wilt wijzigen naar '${newStatus}'?`,
          type: 'warning',
          onConfirm: async () => {
              const updatedList = debtors.map(d => {
                  if (statusTargetIds.includes(d.id)) {
                      // Determine the specific reason string if applicable
                      let specificReason = '';
                      if (newStatus === 'Cashlist') specificReason = bulkCashlistReason;
                      else if (newStatus === 'Correction') specificReason = bulkCorrectionReason;

                      // Create a log entry for the status change
                      const noteContent = `Status gewijzigd van '${d.status}' naar '${newStatus}'.${specificReason ? ` Reden: ${specificReason}` : ''}`;
                      const newNote: DebtorNote = {
                          id: Math.random().toString(36).substr(2, 9),
                          content: noteContent,
                          date: new Date().toISOString(),
                          author: currentUser.name
                      };

                      return { 
                          ...d, 
                          status: newStatus, 
                          statusDate: new Date().toISOString(),
                          cashlistReason: newStatus === 'Cashlist' ? bulkCashlistReason : d.cashlistReason,
                          correctionReason: newStatus === 'Correction' ? bulkCorrectionReason : d.correctionReason,
                          notes: [...(d.notes || []), newNote] // Add timeline note
                      };
                  }
                  return d;
              });
              setDebtors(sortDebtors(updatedList));
              await api.saveDebtors(updatedList);
              
              setStatusTargetIds([]);
              setSelectedIds(new Set());
              setBulkCashlistReason('');
              setBulkCorrectionReason('');
              setTargetStatus(null);
              onShowToast("Status succesvol aangepast");
              closeConfirmModal();
          }
      });
  };

  // ... (Address parser logic omitted for brevity, remains unchanged) ...
  const parseAddress = (rawAddr: string) => {
      let street = '';
      let number = '';
      let zip = '';
      let city = '';
      let country = 'Nederland';

      if (!rawAddr) return { street, number, zip, city, country };

      // 1. Initial cleanup
      const cleanAddr = rawAddr.trim();
      
      // 2. Regexes
      const zipRegex = /\b\d{4}\s?[A-Za-z]{2}\b|\b\d{4,5}\b/; // NL or Generic 4-5 digits

      // 3. Split parts
      let parts = cleanAddr.split(',').map(s => s.trim()).filter(s => s.length > 0);

      // 4. Extract Country (Last part)
      // If > 2 parts, check if last part is purely alphabetic (Country names usually don't have numbers)
      if (parts.length > 2) {
          const lastPart = parts[parts.length - 1];
          if (!/\d/.test(lastPart)) {
              country = parts.pop()!;
          }
      } else if (parts.length === 2) {
          // If 2 parts, could be "Street 1, Zip City" OR "Street 1, City"
          // Don't pop country yet unless we are sure. Default is NL.
      }

      // 5. Extract Zip and City
      // We iterate backwards through remaining parts to find Zip
      for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          const match = part.match(zipRegex);
          
          if (match) {
              const rawZip = match[0];
              // Normalize Zip
              zip = rawZip.replace(/\s+/g, ''); // Compact for internal use, though NL prefers space
              if (zip.length === 6 && /[A-Z]/.test(zip)) {
                  zip = zip.slice(0, 4) + ' ' + zip.slice(4); // NL Format
              }

              // Check if city is in this part
              const remainder = part.replace(rawZip, '').trim();
              if (remainder.length > 0) {
                  // "6525CD Nijmegen" or "Nijmegen 6525CD"
                  city = remainder.replace(/^[-,\s]+|[-,\s]+$/g, ''); // Trim punctuation
              }
              
              // Case: "Street 1, Nijmegen, 1234AB" -> City is in previous part
              if (!city && i > 0) {
                   const prev = parts[i-1];
                   if (!/\d/.test(prev)) { // Heuristic: City usually no digits
                       city = prev;
                       parts.splice(i-1, 1);
                       i--; 
                   }
              }
              
              // Case: "Street 1, 1234AB, Nijmegen" -> City is in next part
              if (!city && i < parts.length - 1) {
                  city = parts[i+1];
                  parts.splice(i+1, 1);
              }

              parts.splice(i, 1); // Remove zip part
              break; // Stop after finding zip
          }
      }

      // 6. If no city found yet, but we have parts left
      if (!city && parts.length > 1) {
          // Assume last remaining part is city (European format: Street, City)
          const last = parts[parts.length - 1];
          if (!/\d/.test(last)) {
              city = parts.pop()!;
          }
      }

      // 7. Street and Number (Remaining)
      let fullStreet = parts.join(' ').trim();
      
      // Extract Number
      const numberMatch = fullStreet.match(/(\d+[\w\s-]*)$/); // Match number at end
      if (numberMatch) {
          number = numberMatch[0].trim();
          street = fullStreet.substring(0, numberMatch.index).trim();
      } else {
          // Try match number at start? (US Format: 123 Main St)
          const startNumMatch = fullStreet.match(/^(\d+)\s+(.*)/);
          if (startNumMatch) {
              number = startNumMatch[1];
              street = startNumMatch[2];
          } else {
              street = fullStreet;
          }
      }
      
      // Final cleanup
      street = street.replace(/,$/, '').trim();

      return { street, number, zip, city, country };
  };

  const handleOpenDetail = (debtor: Debtor) => {
      setDetailDebtor(debtor);
      setIsCreating(false);
      setIsAddressParseError(false);
      
      const parsed = parseAddress(debtor.address || '');

      setDetailForm({
          reservationNumber: debtor.reservationNumber,
          firstName: debtor.firstName || '',
          lastName: debtor.lastName || '',
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
      setNewDetailNote('');
  };

  const handleOpenCreate = () => {
      // Create a dummy debtor to satisfy the type requirement for detailDebtor state
      // but flag isCreating as true to handle save logic differently
      const dummyDebtor: Debtor = {
          id: 'new',
          reservationNumber: '',
          firstName: '',
          lastName: '',
          address: '',
          amount: 0,
          status: 'New',
          statusDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          importedAt: new Date().toLocaleDateString('nl-NL')
      };
      
      setDetailDebtor(dummyDebtor);
      setIsCreating(true);
      setIsAddressParseError(false);

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
      setNewDetailNote('');
  };

  const handleSaveDetails = async () => {
      if (!detailDebtor) return;

      if (detailForm.status === 'Cashlist' && !detailForm.cashlistReason.trim()) {
          onShowToast("Reden voor Cashlist is verplicht.");
          return;
      }
      if (detailForm.status === 'Correction' && !detailForm.correctionReason.trim()) {
          onShowToast("Reden voor Correctie is verplicht.");
          return;
      }

      // Basic Validation for new records
      if (isCreating) {
          if (!detailForm.reservationNumber) return onShowToast("Reserveringsnummer is verplicht.");
          if (!detailForm.lastName) return onShowToast("Achternaam is verplicht.");
          if (!detailForm.amount) return onShowToast("Bedrag is verplicht.");
      }

      // RECOMBINE ADDRESS: Standardize format "Street Nr, Zip City, Country"
      const fullAddress = `${detailForm.addressStreet} ${detailForm.addressNumber}, ${detailForm.addressZip} ${detailForm.addressCity}, ${detailForm.addressCountry}`.trim().replace(/^,/, '').replace(/,$/, '');

      if (isCreating) {
          // CREATE NEW
          const newDebtor: Debtor = {
              id: Math.random().toString(36).substr(2, 9),
              reservationNumber: detailForm.reservationNumber,
              firstName: detailForm.firstName,
              lastName: detailForm.lastName,
              email: detailForm.email,
              phone: detailForm.phone,
              address: fullAddress,
              amount: detailForm.amount,
              status: detailForm.status,
              statusDate: new Date(detailForm.statusDate).toISOString(), // Use custom start date
              lastUpdated: new Date().toISOString(),
              importedAt: new Date().toLocaleDateString('nl-NL'),
              isEnriched: false,
              cashlistReason: detailForm.status === 'Cashlist' ? detailForm.cashlistReason : undefined,
              correctionReason: detailForm.status === 'Correction' ? detailForm.correctionReason : undefined,
              notes: newDetailNote.trim() ? [{
                  id: Math.random().toString(36).substr(2, 9),
                  content: newDetailNote,
                  date: new Date().toISOString(),
                  author: currentUser.name
              }] : []
          };

          const updatedList = [newDebtor, ...debtors];
          setDebtors(sortDebtors(updatedList));
          await api.saveDebtors(updatedList);
          
          setDetailDebtor(null); // Close modal
          setIsCreating(false);
          onShowToast("Nieuw dossier aangemaakt.");

      } else {
          // UPDATE EXISTING
          // Create update note if status changed
          const currentNotes = [...(detailDebtor.notes || [])];
          if (detailForm.status !== detailDebtor.status) {
              let reasonText = '';
              if (detailForm.status === 'Cashlist') reasonText = detailForm.cashlistReason;
              if (detailForm.status === 'Correction') reasonText = detailForm.correctionReason;
              
              const noteContent = `Status gewijzigd van '${detailDebtor.status}' naar '${detailForm.status}'.${reasonText ? ` Reden: ${reasonText}` : ''}`;
              
              currentNotes.push({
                  id: Math.random().toString(36).substr(2, 9),
                  content: noteContent,
                  date: new Date().toISOString(),
                  author: currentUser.name
              });
          }

          const updatedDebtor: Debtor = {
              ...detailDebtor,
              reservationNumber: detailForm.reservationNumber, // Allow update
              firstName: detailForm.firstName,
              lastName: detailForm.lastName,
              email: detailForm.email,
              phone: detailForm.phone,
              address: fullAddress,
              amount: detailForm.amount,
              status: detailForm.status,
              statusDate: new Date(detailForm.statusDate).toISOString(), // Use form date (allows edit)
              cashlistReason: detailForm.status === 'Cashlist' ? detailForm.cashlistReason : detailDebtor.cashlistReason,
              correctionReason: detailForm.status === 'Correction' ? detailForm.correctionReason : detailDebtor.correctionReason,
              notes: currentNotes
          };

          const updatedList = debtors.map(d => d.id === updatedDebtor.id ? updatedDebtor : d);
          
          setDebtors(sortDebtors(updatedList));
          setDetailDebtor(updatedDebtor); // Update view state
          await api.saveDebtors(updatedList);
          
          onShowToast("Dossier gegevens opgeslagen.");
      }
  };

  const handleAddNoteInDetail = async () => {
      if (!detailDebtor || !newDetailNote.trim() || isCreating) return; // Note adding handled in create save

      const newNote: DebtorNote = {
          id: Math.random().toString(36).substr(2, 9),
          content: newDetailNote,
          date: new Date().toISOString(),
          author: currentUser.name
      };

      const updatedDebtor = {
          ...detailDebtor,
          notes: [...(detailDebtor.notes || []), newNote]
      };

      // Optimistic update
      const updatedList = debtors.map(d => d.id === updatedDebtor.id ? updatedDebtor : d);
      setDebtors(sortDebtors(updatedList));
      setDetailDebtor(updatedDebtor);
      setNewDetailNote('');
      
      await api.saveDebtors(updatedList);
      onShowToast("Notitie toegevoegd");
  };

  const handleIgnoreAddressWarning = (id: string) => {
      setIgnoredAddressWarnings(prev => new Set(prev).add(id));
  };

  // --- DATE EDIT (Quick Action) ---
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

  // --- WIK LETTER GENERATION ---
  const openWikModal = (debtor: Debtor) => {
      setWikTarget(debtor);
      setWikDateInput('');
      
      // Auto-detect language based on address country
      const addressLower = (debtor.address || '').toLowerCase();
      if (addressLower.includes('deutschland') || addressLower.includes('germany')) {
          setWikLanguage('de');
      } else if (addressLower.includes('nederland') || addressLower.includes('netherlands')) {
          setWikLanguage('nl');
      } else {
          setWikLanguage('en'); // Default international
      }
  };

  const generateWIKLetter = () => {
      if (!wikTarget || !wikDateInput) return;

      const formattedDateInput = new Date(wikDateInput).toLocaleDateString('nl-NL');
      const currentDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      const amountFormatted = wikTarget.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Robust Address Splitting for Letter
      const addrString = wikTarget.address || '';
      let line1 = ''; // Street + Nr
      let line2 = ''; // Zip + City
      let line3 = 'NEDERLAND'; // Default to Nederland

      const parts = addrString.split(',').map(s => s.trim());
      if (parts.length >= 3) {
          line1 = parts[0];
          line2 = parts[1];
          line3 = parts[2];
      } else if (parts.length === 2) {
          line1 = parts[0];
          line2 = parts[1];
          // line3 remains default NEDERLAND to ensure it's on the letter automatically
      } else {
          // Fallback for raw legacy data
          line1 = addrString; // Just put everything on line 1 if parsing fails
      }

      // Translations Object
      const translations = {
          nl: {
              subject: "Betalingsherinnering – Laatste aanmaning",
              salutation: `Beste ${wikTarget.lastName},`,
              body: `
                <p>Hierbij herinneren wij u aan de openstaande factuur met reserveringsnummer <strong>${wikTarget.reservationNumber}</strong> van <strong>${formattedDateInput}</strong> met een bedrag van <strong>€${amountFormatted}</strong>.</p>
                <p>Helaas hebben wij, ondanks meerdere herinneringen, tot op heden nog geen betaling van u mogen ontvangen. Wij verzoeken u vriendelijk het verschuldigde bedrag binnen 14 dagen over te maken naar ons rekeningnummer <strong>NL52 RABO 0181 6526 68</strong>, ten name van Sanadome Hotel & Spa Nijmegen, onder vermelding van het reserveringsnummer.</p>
                <p>Wij wijzen u erop dat wij bij uitblijven van tijdige betaling genoodzaakt zijn de vordering over te dragen aan een externe incassopartij. In dat geval worden incassokosten en wettelijke rente in rekening gebracht, conform de geldende wettelijke regelingen.</p>
                <p>Mocht u inmiddels wel betaald hebben, dan kunt u deze aanmaning als niet verzonden beschouwen.</p>
                <p>Indien u vragen, of opmerkingen met betrekking tot deze factuur heeft, kunt u ten allertijden contact opnemen met ons via de contactgegevens onderstaand deze brief.</p>
                <p>Wij vertrouwen erop dat u de betaling alsnog tijdig zult voldoen en hopen hiermee verdere incassomaatregelen te voorkomen.</p>
              `,
              closing: "Met hartelijke groet,"
          },
          en: {
              subject: "Payment Reminder – Final Notice",
              salutation: `Dear ${wikTarget.lastName},`,
              body: `
                <p>We are writing to remind you of the outstanding invoice with reservation number <strong>${wikTarget.reservationNumber}</strong> dated <strong>${formattedDateInput}</strong> with an amount of <strong>€${amountFormatted}</strong>.</p>
                <p>Unfortunately, despite previous reminders, we have not yet received payment from you. We kindly request that you transfer the amount due within 14 days to our bank account <strong>NL52 RABO 0181 6526 68</strong>, in the name of Sanadome Hotel & Spa Nijmegen, stating the reservation number.</p>
                <p>Please be advised that if payment is not made on time, we will be forced to hand over the claim to an external collection agency. In that case, collection costs and statutory interest will be charged in accordance with applicable legal regulations.</p>
                <p>If you have already paid, please disregard this notice.</p>
                <p>If you have any questions or comments regarding this invoice, please feel free to contact us via the contact details below.</p>
                <p>We trust that you will settle the payment promptly to avoid further collection measures.</p>
              `,
              closing: "With kind regards,"
          },
          de: {
              subject: "Zahlungserinnerung – Letzte Mahnung",
              salutation: `Sehr geehrte(r) ${wikTarget.lastName},`,
              body: `
                <p>hiermit erinnern wir Sie an die offene Rechnung mit der Reservierungsnummer <strong>${wikTarget.reservationNumber}</strong> vom <strong>${formattedDateInput}</strong> über einen Betrag von <strong>€${amountFormatted}</strong>.</p>
                <p>Leider haben wir trotz mehrfacher Erinnerungen bis heute keinen Zahlungseingang von Ihnen feststellen können. Wir bitten Sie freundlich, den fälligen Betrag innerhalb von 14 Tagen auf unser Konto <strong>NL52 RABO 0181 6526 68</strong>, lautend auf Sanadome Hotel & Spa Nijmegen, unter Angabe der Reservierungsnummer zu überweisen.</p>
                <p>Wir weisen Sie darauf hin, dass wir uns bei Ausbleiben einer fristgerechten Zahlung gezwungen sehen, die Forderung an ein externes Inkassobüro zu übergeben. In diesem Fall werden Inkassokosten und gesetzliche Zinsen gemäß den geltenden gesetzlichen Bestimmungen berechnet.</p>
                <p>Sollten Sie die Zahlung bereits geleistet haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.</p>
                <p>Sollten Sie Fragen oder Anmerkungen zu dieser Rechnung haben, können Sie uns jederzeit über die untenstehenden Kontaktdaten erreichen.</p>
                <p>Wir vertrauen darauf, dass Sie die Zahlung nun zeitnah begleichen, um weitere Inkassomaßnahmen zu vermeiden.</p>
              `,
              closing: "Mit freundlichen Grüßen,"
          }
      };

      const t = translations[wikLanguage];

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
                    ${line1}<br>
                    ${line2}<br>
                    <span style="font-weight: bold;">${line3.toUpperCase()}</span>
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
                ${t.subject}
            </div>

            <div class="content">
                <p>${t.salutation}</p>
                ${t.body}
            </div>

            <div class="signature">
                ${t.closing}<br>
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
      setWikTarget(null);
  };

  const totalDebt = debtors.filter(d => d.status !== 'Paid' && d.status !== 'Correction').reduce((acc, curr) => acc + curr.amount, 0);
  const actionRequiredCount = debtors.filter(d => isActionRequired(d)).length;

  const getStatusBadge = (status: DebtorStatus) => {
      const base = "border transition-all active:scale-95 shadow-sm";
      switch(status) {
          case 'New': return `${base} bg-blue-100/50 text-blue-700 border-blue-200 hover:bg-blue-100`;
          case '1st Reminder': return `${base} bg-amber-100/50 text-amber-700 border-amber-200 hover:bg-amber-100`;
          case '2nd Reminder': return `${base} bg-orange-100/50 text-orange-700 border-orange-200 hover:bg-orange-100`;
          case 'Final Notice': return `${base} bg-red-100/50 text-red-700 border-red-200 hover:bg-red-100`;
          case 'Paid': return `${base} bg-green-100/50 text-green-700 border-green-200 hover:bg-green-100`;
          case 'Correction': return `${base} bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300`;
          case 'Cashlist': return `${base} bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200`;
          default: return `${base} bg-slate-100 text-slate-600 border-slate-200`;
      }
  };

  const StatusOptionCard = ({ status, label, description, colorClass, onClick, recommended, dimmed }: any) => (
      <button 
        onClick={onClick}
        className={`p-4 rounded-xl border text-left hover:shadow-lg transition-all group flex flex-col gap-2 h-full transform hover:-translate-y-1 relative 
            ${colorClass} 
            ${dimmed ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}
            ${recommended ? 'ring-2 ring-teal-500 ring-offset-2' : ''}
        `}
      >
          {recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles size={10} fill="currentColor"/> Aanbevolen
              </div>
          )}
          <div className="flex items-center justify-between w-full">
              <span className="font-bold text-sm uppercase tracking-wider">{label}</span>
              <div className="w-6 h-6 rounded-full border-2 border-current opacity-30 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-3 h-3 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
          </div>
          <p className="text-xs opacity-80 font-medium leading-relaxed">{description}</p>
      </button>
  );

  const getModalStatusOptions = () => {
      // Determine the recommended next step based on current status
      const currentStatus = (statusTargetIds.length === 1) 
          ? debtors.find(d => d.id === statusTargetIds[0])?.status 
          : 'New'; // Fallback for bulk if mixed, but ideally handle specific cases. Assuming New for logic simplicity.

      const nextStep = getNextLogicalStatus(currentStatus as DebtorStatus);

      // Helper to check if a status is "too far ahead" (simplified logic)
      const isSkipping = (target: DebtorStatus) => {
          if (!currentStatus) return false;
          if (target === 'Paid' || target === 'Correction' || target === 'Cashlist') return false; // Always allowed
          
          const order = ['New', '1st Reminder', '2nd Reminder', 'Final Notice'];
          const currIdx = order.indexOf(currentStatus);
          const targetIdx = order.indexOf(target);
          
          // If moving backwards or more than 1 step forward (and not Paid/Correction)
          return targetIdx > currIdx + 1;
      };

      return (
          <div className="grid grid-cols-2 gap-4">
              <StatusOptionCard 
                status="New" 
                label="Nieuw" 
                description="Nog geen actie ondernomen."
                colorClass="bg-blue-50/50 border-blue-200 text-blue-700 hover:border-blue-400"
                onClick={() => handleStatusSelect('New')}
                recommended={false}
                dimmed={false} // Always selectable to reset
              />
              <StatusOptionCard 
                status="1st Reminder" 
                label="1e Herinnering" 
                description="Eerste mail/brief verstuurd (+7 dagen)."
                colorClass="bg-amber-50/50 border-amber-200 text-amber-700 hover:border-amber-400"
                onClick={() => handleStatusSelect('1st Reminder')}
                recommended={nextStep === '1st Reminder'}
                dimmed={isSkipping('1st Reminder')}
              />
              <StatusOptionCard 
                status="2nd Reminder" 
                label="2e Herinnering" 
                description="Tweede waarschuwing (+7 dagen)."
                colorClass="bg-orange-50/50 border-orange-200 text-orange-700 hover:border-orange-400"
                onClick={() => handleStatusSelect('2nd Reminder')}
                recommended={nextStep === '2nd Reminder'}
                dimmed={isSkipping('2nd Reminder')}
              />
              <StatusOptionCard 
                status="Final Notice" 
                label="Aanmaning" 
                description="Laatste waarschuwing (+14 dagen)."
                colorClass="bg-red-50/50 border-red-200 text-red-700 hover:border-red-400"
                onClick={() => handleStatusSelect('Final Notice')}
                recommended={nextStep === 'Final Notice'}
                dimmed={isSkipping('Final Notice')}
              />
              <StatusOptionCard 
                status="Paid" 
                label="Betaald" 
                description="Dossier succesvol afgerond."
                colorClass="bg-green-50/50 border-green-200 text-green-700 hover:border-green-400"
                onClick={() => handleStatusSelect('Paid')}
                recommended={false}
                dimmed={false}
              />
              <StatusOptionCard 
                status="Correction" 
                label="Correctie" 
                description="Administratief gecorrigeerd (0)."
                colorClass="bg-slate-100 border-slate-300 text-slate-700 hover:border-slate-500"
                onClick={() => handleStatusSelect('Correction')}
                recommended={false}
                dimmed={false}
              />
              <StatusOptionCard 
                status="Cashlist" 
                label="Cashlist" 
                description="Alleen vooraf betalen."
                colorClass="bg-purple-50/50 border-purple-200 text-purple-800 hover:border-purple-400"
                onClick={() => handleStatusSelect('Cashlist')}
                recommended={nextStep === 'Cashlist'}
                dimmed={false}
              />
          </div>
      );
  };

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
             <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all hover:shadow-md"
             >
                <Plus size={20}/> Nieuw Dossier
             </button>
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
                  <p className="text-xs text-slate-400 mt-1 font-medium">Dossiers met verlopen termijn</p>
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

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Zoek op naam, nummer, adres, bedrag..." 
                className="w-full pl-11 pr-4 py-3 bg-transparent rounded-xl text-sm focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto px-2">
              <Filter size={18} className="text-slate-400 hidden md:block" />
              <select 
                  className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DebtorStatus | 'All')}
              >
                  <option value="All">Alle Statussen</option>
                  <option value="New">Nieuw</option>
                  <option value="1st Reminder">1e Herinnering</option>
                  <option value="2nd Reminder">2e Herinnering</option>
                  <option value="Final Notice">Aanmaning</option>
                  <option value="Paid">Betaald</option>
                  <option value="Correction">Correctie</option>
                  <option value="Cashlist">Cashlist</option>
              </select>
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
                          const hasNotes = debtor.notes && debtor.notes.length > 0;
                          const addressIncomplete = isAddressIncomplete(debtor);

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
                                      <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-100 mt-1 relative group/address">
                                          {debtor.isEnriched ? (
                                              <Sparkles size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                          ) : (
                                              <div className="w-3.5"></div>
                                          )}
                                          <span className={`text-xs leading-tight ${debtor.isEnriched ? 'text-indigo-700' : ''}`}>
                                              {debtor.address || <span className="italic text-slate-400">Adres onbekend</span>}
                                          </span>
                                          {addressIncomplete && (
                                              <div 
                                                className="absolute right-0 top-1 text-orange-500 cursor-pointer p-1 hover:bg-orange-50 rounded"
                                                onClick={(e) => { e.stopPropagation(); handleOpenDetail(debtor); }}
                                                title="Adres incompleet. Klik om aan te vullen."
                                              >
                                                  <AlertTriangle size={14} />
                                              </div>
                                          )}
                                      </div>
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
                                            {debtor.status === 'Correction' && <CheckCircle2 size={12} />}
                                            {debtor.status === 'Final Notice' ? 'Aanmaning' : debtor.status}
                                          </span>
                                          <ChevronDown size={12} className="opacity-50"/>
                                      </button>
                                      
                                      {debtor.status !== 'Paid' && debtor.status !== 'Correction' && debtor.status !== 'New' && debtor.statusDate && (
                                          <div className="flex items-center gap-2 pl-1">
                                              <div className={`text-[10px] font-bold ${needsAction ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-slate-400'}`}>
                                                  {daysOverdue} dagen {needsAction ? '(OVER TIJD)' : '(binnen termijn)'}
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
                                        onClick={() => handleOpenDetail(debtor)}
                                        className={`p-2.5 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-200 rounded-xl shadow-sm transition-all relative ${hasNotes ? 'text-blue-500' : 'text-slate-500'}`}
                                        title="Open Dossier & Notities"
                                      >
                                          <FolderOpen size={16} />
                                          {hasNotes && <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white"></div>}
                                      </button>
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
              
              {targetStatus === 'Cashlist' ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <label className="block text-xs font-bold text-purple-800 uppercase mb-2">Reden voor Cashlist (Verplicht)</label>
                          <textarea 
                              className="w-full p-3 border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                              rows={3}
                              placeholder="Waarom wordt deze gast op de cashlist geplaatst?"
                              value={bulkCashlistReason}
                              onChange={(e) => setBulkCashlistReason(e.target.value)}
                              autoFocus
                          />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setTargetStatus(null)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50">Terug</button>
                          <button 
                              onClick={() => applyStatusChange('Cashlist')}
                              disabled={!bulkCashlistReason.trim()}
                              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-purple-700 disabled:opacity-50"
                          >
                              Bevestigen
                          </button>
                      </div>
                  </div>
              ) : targetStatus === 'Correction' ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Reden voor Correctie (Verplicht)</label>
                          <textarea 
                              className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none bg-white"
                              rows={3}
                              placeholder="Waarom wordt dit dossier gecorrigeerd?"
                              value={bulkCorrectionReason}
                              onChange={(e) => setBulkCorrectionReason(e.target.value)}
                              autoFocus
                          />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setTargetStatus(null)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50">Terug</button>
                          <button 
                              onClick={() => applyStatusChange('Correction')}
                              disabled={!bulkCorrectionReason.trim()}
                              className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 disabled:opacity-50"
                          >
                              Bevestigen
                          </button>
                      </div>
                  </div>
              ) : (
                  getModalStatusOptions()
              )}
          </div>
      </Modal>

      {/* COMPREHENSIVE DETAIL MODAL */}
      {detailDebtor && (
      <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-300`}>
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setDetailDebtor(null)}></div>
          <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                          {isCreating ? 'Nieuw Dossier' : `${detailForm.firstName} ${detailForm.lastName}`}
                      </h2>
                      {!isCreating && (
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">#{detailDebtor.reservationNumber}</span>
                              <span>•</span>
                              <span>Laatst gewijzigd: {new Date(detailDebtor.lastUpdated).toLocaleDateString()}</span>
                          </div>
                      )}
                  </div>
                  <button onClick={() => setDetailDebtor(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                      <X size={24} />
                  </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50">
                  {/* LEFT COLUMN: DETAILS & EDIT */}
                  <div className="w-full md:w-1/2 p-8 overflow-y-auto border-r border-slate-200 bg-white">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <Edit2 size={18} className="text-teal-600"/> Dossier Gegevens
                      </h3>
                      
                      <div className="space-y-6">
                          {/* Reservation Number (Editable if creating) */}
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reserveringsnummer</label>
                              <div className="relative">
                                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                  <input 
                                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                                      value={detailForm.reservationNumber}
                                      onChange={(e) => setDetailForm({...detailForm, reservationNumber: e.target.value})}
                                      placeholder="1234567"
                                  />
                              </div>
                          </div>

                          {/* Name Editing */}
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voornaam</label>
                                  <input 
                                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                      value={detailForm.firstName}
                                      onChange={(e) => setDetailForm({...detailForm, firstName: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Achternaam</label>
                                  <input 
                                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                      value={detailForm.lastName}
                                      onChange={(e) => setDetailForm({...detailForm, lastName: e.target.value})}
                                  />
                              </div>
                          </div>

                          {/* Status Select */}
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 appearance-none focus:ring-2 focus:ring-teal-500 outline-none"
                                          value={detailForm.status}
                                          onChange={(e) => setDetailForm({...detailForm, status: e.target.value as DebtorStatus})}
                                      >
                                          <option value="New">Nieuw</option>
                                          <option value="1st Reminder">1e Herinnering</option>
                                          <option value="2nd Reminder">2e Herinnering</option>
                                          <option value="Final Notice">Aanmaning</option>
                                          <option value="Paid">Betaald</option>
                                          <option value="Correction">Correctie</option>
                                          <option value="Cashlist">Cashlist</option>
                                      </select>
                                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                                  </div>
                              </div>
                              
                              {/* NEW: Start Date Field */}
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Startdatum Dossier</label>
                                  <input
                                      type="date"
                                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-700"
                                      value={detailForm.statusDate}
                                      onChange={(e) => setDetailForm({...detailForm, statusDate: e.target.value})}
                                  />
                              </div>
                          </div>

                          {/* Cashlist Reason Input (Visible if status is Cashlist) */}
                          {detailForm.status === 'Cashlist' && (
                              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-in slide-in-from-top-2">
                                  <label className="block text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-1">
                                      <AlertCircle size={12}/> Reden Cashlist (Verplicht)
                                  </label>
                                  <textarea 
                                      className="w-full p-3 border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                      rows={3}
                                      placeholder="Waarom moet deze gast direct betalen?"
                                      value={detailForm.cashlistReason}
                                      onChange={(e) => setDetailForm({...detailForm, cashlistReason: e.target.value})}
                                  />
                              </div>
                          )}

                          {/* Correction Reason Input (Visible if status is Correction) */}
                          {detailForm.status === 'Correction' && (
                              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1">
                                      <AlertCircle size={12}/> Reden Correctie (Verplicht)
                                  </label>
                                  <textarea 
                                      className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none bg-white"
                                      rows={3}
                                      placeholder="Waarom wordt dit dossier gecorrigeerd?"
                                      value={detailForm.correctionReason}
                                      onChange={(e) => setDetailForm({...detailForm, correctionReason: e.target.value})}
                                  />
                              </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mailadres</label>
                                  <div className="relative">
                                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                      <input 
                                          className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                          value={detailForm.email}
                                          onChange={(e) => setDetailForm({...detailForm, email: e.target.value})}
                                          placeholder="Email..."
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefoon</label>
                                  <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                      <input 
                                          className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                          value={detailForm.phone}
                                          onChange={(e) => setDetailForm({...detailForm, phone: e.target.value})}
                                          placeholder="Tel..."
                                      />
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adresgegevens (Brief Indeling)</label>
                              
                              {/* Address Warning */}
                              {(!isCreating && (isAddressIncomplete(detailDebtor) || isAddressParseError)) && (
                                  <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex justify-between items-start mb-2 animate-in fade-in">
                                      <div className="flex gap-2">
                                          <AlertTriangle className="text-orange-500 mt-0.5" size={16}/>
                                          <div>
                                              <p className="text-xs font-bold text-orange-800">Adres incompleet</p>
                                              <p className="text-xs text-orange-700">Controleer postcode en huisnummer.</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleIgnoreAddressWarning(detailDebtor.id)}
                                            className="text-[10px] font-bold text-orange-600 hover:text-orange-800"
                                          >
                                              Negeren
                                          </button>
                                      </div>
                                  </div>
                              )}

                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative">
                                  <div className="flex gap-3">
                                      <div className="flex-1">
                                          <input 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                              value={detailForm.addressStreet}
                                              onChange={(e) => setDetailForm({...detailForm, addressStreet: e.target.value})}
                                              placeholder="Straatnaam"
                                          />
                                      </div>
                                      <div className="w-24">
                                          <input 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                              value={detailForm.addressNumber}
                                              onChange={(e) => setDetailForm({...detailForm, addressNumber: e.target.value})}
                                              placeholder="Nr"
                                          />
                                      </div>
                                  </div>
                                  <div className="flex gap-3">
                                      <div className="w-32">
                                          <input 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                              value={detailForm.addressZip}
                                              onChange={(e) => setDetailForm({...detailForm, addressZip: e.target.value})}
                                              placeholder="Postcode"
                                          />
                                      </div>
                                      <div className="flex-1">
                                          <input 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                              value={detailForm.addressCity}
                                              onChange={(e) => setDetailForm({...detailForm, addressCity: e.target.value})}
                                              placeholder="Plaats"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <div className="relative">
                                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                          <input 
                                              className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                              value={detailForm.addressCountry}
                                              onChange={(e) => setDetailForm({...detailForm, addressCountry: e.target.value})}
                                              placeholder="Land"
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Openstaand Bedrag</label>
                              <div className="relative">
                                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                  <input 
                                      type="number"
                                      step="0.01"
                                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                                      value={detailForm.amount}
                                      onChange={(e) => setDetailForm({...detailForm, amount: parseFloat(e.target.value)})}
                                  />
                              </div>
                          </div>

                          {isCreating && (
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eerste Notitie (Optioneel)</label>
                                  <textarea 
                                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                      rows={3}
                                      placeholder="Plaats direct een opmerking bij dit dossier..."
                                      value={newDetailNote}
                                      onChange={(e) => setNewDetailNote(e.target.value)}
                                  />
                              </div>
                          )}

                          <div className="pt-4 border-t border-slate-100">
                              <button 
                                onClick={handleSaveDetails}
                                disabled={(detailForm.status === 'Cashlist' && !detailForm.cashlistReason.trim()) || (detailForm.status === 'Correction' && !detailForm.correctionReason.trim())}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Save size={18}/> {isCreating ? 'Dossier Aanmaken' : 'Wijzigingen Opslaan'}
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* RIGHT COLUMN: NOTES TIMELINE */}
                  {!isCreating && (
                      <div className="w-full md:w-1/2 p-8 overflow-y-auto flex flex-col h-full">
                          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                              <MoreHorizontal size={18} className="text-blue-600"/> Historie & Notities
                          </h3>

                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 mb-6">
                              {detailDebtor.notes && detailDebtor.notes.length > 0 ? (
                                  // Timeline
                                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                                      {detailDebtor.notes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => (
                                          <div key={note.id} className="relative pl-6">
                                              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>
                                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <span className="text-xs font-bold text-slate-800">{note.author}</span>
                                                      <span className="text-[10px] text-slate-400">{new Date(note.date).toLocaleString('nl-NL')}</span>
                                                  </div>
                                                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                                      <p className="text-slate-400 text-sm italic">Nog geen notities in dit dossier.</p>
                                  </div>
                              )}
                          </div>

                          <div className="mt-auto bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <textarea 
                                  className="w-full border-none focus:ring-0 text-sm resize-none p-0 mb-2"
                                  rows={3}
                                  placeholder="Schrijf een nieuwe notitie..."
                                  value={newDetailNote}
                                  onChange={(e) => setNewDetailNote(e.target.value)}
                              />
                              <div className="flex justify-end pt-2 border-t border-slate-50">
                                  <button 
                                      onClick={handleAddNoteInDetail}
                                      disabled={!newDetailNote.trim()}
                                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                  >
                                      <Send size={14}/> Toevoegen
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
                  {isCreating && (
                      <div className="w-full md:w-1/2 p-8 flex items-center justify-center bg-slate-50">
                          <div className="text-center text-slate-400">
                              <FileCheck size={64} className="mx-auto mb-4 opacity-20"/>
                              <p>Vul de gegevens links in om een nieuw dossier te starten.</p>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
      )}

      {/* WIK LETTER MODAL */}
      <Modal 
          isOpen={!!wikTarget} 
          onClose={() => setWikTarget(null)} 
          title="WIK Brief Genereren"
      >
          <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                  <p>Genereer een officiële 14-dagen brief (WIK) voor <strong>{wikTarget?.lastName}</strong>.</p>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Datum Factuur/Brief</label>
                  <input 
                      type="date" 
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={wikDateInput}
                      onChange={(e) => setWikDateInput(e.target.value)}
                      autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">De datum die op de brief vermeld wordt.</p>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Taal</label>
                  <div className="flex gap-2">
                      {['nl', 'en', 'de'].map(lang => (
                          <button
                              key={lang}
                              onClick={() => setWikLanguage(lang as any)}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold border uppercase ${wikLanguage === lang ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                              {lang}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setWikTarget(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Annuleren</button>
                  <button 
                      onClick={generateWIKLetter} 
                      disabled={!wikDateInput}
                      className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                      Genereren & Printen
                  </button>
              </div>
          </div>
      </Modal>

      {/* CONFIRMATION MODAL (Generic) */}
      <Modal
          isOpen={confirmModalState.isOpen}
          onClose={closeConfirmModal}
          title={confirmModalState.title}
      >
          <div className="space-y-4">
              <p className="text-sm text-slate-600">{confirmModalState.message}</p>
              <div className="flex justify-end gap-3 pt-2">
                  <button 
                      onClick={closeConfirmModal}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                      Annuleren
                  </button>
                  <button 
                      onClick={confirmModalState.onConfirm}
                      className={`px-4 py-2 text-white rounded-lg font-bold text-sm shadow-sm transition-colors ${
                          confirmModalState.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
                      }`}
                  >
                      Bevestigen
                  </button>
              </div>
          </div>
      </Modal>

    </div>
  );
};

export default DebtControlPage;
