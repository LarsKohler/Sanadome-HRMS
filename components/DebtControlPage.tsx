import React, { useState, useEffect, useRef } from 'react';
import { Upload, Euro, AlertCircle, CheckCircle2, Search, Filter, FileSpreadsheet, MoreHorizontal, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Debtor, DebtorStatus } from '../types';
import { api } from '../utils/api';
import * as XLSX from 'xlsx';

interface DebtControlPageProps {
  onShowToast: (message: string) => void;
}

const DebtControlPage: React.FC<DebtControlPageProps> = ({ onShowToast }) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDebtors();
  }, []);

  const loadDebtors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDebtors();
      // Sort: Blacklist first, then New, then Date
      setDebtors(data.sort((a, b) => {
          if (a.status === 'Blacklist' && b.status !== 'Blacklist') return -1;
          if (b.status === 'Blacklist' && a.status !== 'Blacklist') return 1;
          if (a.status === 'New' && b.status !== 'New') return -1;
          if (b.status === 'New' && a.status !== 'New') return 1;
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }));
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
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            processImportedData(data);
        } catch (error) {
            console.error("Parsing error", error);
            onShowToast("Fout bij inlezen bestand. Controleer het formaat.");
            setIsUploading(false);
        }
    };
    reader.readAsBinaryString(file);
  };

  const processImportedData = async (data: any[]) => {
      try {
          // 1. Filter for Balance > 0
          // Need to identify column names loosely because Excel headers might vary slightly in case/spacing
          // Mapping based on prompt: Number, Group name, First name, Address, Balance of companions
          
          let newCount = 0;
          let updateCount = 0;
          
          // Create a map of existing debtors for quick lookup
          const currentDebtorsMap = new Map<string, Debtor>(debtors.map(d => [d.reservationNumber, d]));
          const updatedDebtorsList = [...debtors];

          for (const row of data) {
              // Find keys (case-insensitive match)
              const getVal = (keyPart: string) => {
                  const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
                  return key ? row[key] : undefined;
              };

              const balance = parseFloat(getVal('Balance') || '0');
              
              // Only positive balances (Debtors)
              if (balance > 0) {
                  const reservationNumber = String(getVal('Number') || '');
                  if (!reservationNumber) continue;

                  const groupName = String(getVal('Group name') || '');
                  const firstName = String(getVal('First name') || '');
                  const address = String(getVal('Address') || '');

                  // Logic: Split Group name for Last Name
                  // "Akbar-19-11-D802" -> "Akbar"
                  const lastName = groupName.split('-')[0].trim();

                  const existing = currentDebtorsMap.get(reservationNumber);

                  if (existing) {
                      // Update existing
                      const updatedIndex = updatedDebtorsList.findIndex(d => d.id === existing.id);
                      if (updatedIndex >= 0) {
                          updatedDebtorsList[updatedIndex] = {
                              ...existing,
                              amount: balance,
                              lastUpdated: new Date().toLocaleDateString('nl-NL'),
                              // Do NOT overwrite status unless it was Paid but now owes money? 
                              // Prompt says "update amount but do not overwrite status".
                              // If it was 'Paid' but balance is > 0 again, maybe we should reset? 
                              // For now, adhering strictly to prompt: don't overwrite status.
                          };
                          updateCount++;
                      }
                  } else {
                      // Create New
                      const newDebtor: Debtor = {
                          id: Math.random().toString(36).substr(2, 9),
                          reservationNumber,
                          firstName,
                          lastName,
                          address,
                          amount: balance,
                          status: 'New',
                          lastUpdated: new Date().toLocaleDateString('nl-NL'),
                          importedAt: new Date().toLocaleDateString('nl-NL')
                      };
                      updatedDebtorsList.push(newDebtor);
                      currentDebtorsMap.set(reservationNumber, newDebtor); // Prevent dups within same file
                      newCount++;
                  }
              }
          }

          await api.saveDebtors(updatedDebtorsList);
          setDebtors(updatedDebtorsList);
          onShowToast(`Import voltooid: ${newCount} nieuwe, ${updateCount} geüpdatet.`);

      } catch (e) {
          console.error("Processing error", e);
          onShowToast("Fout bij verwerken data.");
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleStatusChange = async (id: string, newStatus: DebtorStatus) => {
      const updatedList = debtors.map(d => d.id === id ? { ...d, status: newStatus } : d);
      setDebtors(updatedList);
      await api.saveDebtors(updatedList);
      onShowToast("Status bijgewerkt");
  };

  // Filtered List
  const filteredDebtors = debtors.filter(d => 
      d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.reservationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalDebt = debtors.filter(d => d.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const blacklistedCount = debtors.filter(d => d.status === 'Blacklist').length;

  const getStatusBadge = (status: DebtorStatus) => {
      switch(status) {
          case 'New': return 'bg-blue-50 text-blue-700 border-blue-200';
          case '1st Reminder': return 'bg-amber-50 text-amber-700 border-amber-200';
          case '2nd Reminder': return 'bg-orange-50 text-orange-700 border-orange-200';
          case 'Final Notice': return 'bg-red-50 text-red-700 border-red-200';
          case 'Paid': return 'bg-green-50 text-green-700 border-green-200';
          case 'Blacklist': return 'bg-slate-900 text-white border-slate-700';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Euro className="text-teal-600" size={32} />
             Debiteuren Beheer
           </h1>
           <p className="text-slate-500 mt-1">Beheer openstaande rekeningen en opvolging.</p>
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
                  <div className="p-2 bg-slate-900 text-white rounded-lg"><AlertCircle size={20}/></div>
                  <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Blacklist</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{blacklistedCount}</div>
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
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            <Filter size={16} /> Filteren
          </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nr.</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Naam</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Adres</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bedrag</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acties</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredDebtors.map((debtor) => (
                          <tr 
                            key={debtor.id} 
                            className={`transition-colors group 
                                ${debtor.status === 'Paid' ? 'bg-green-50/30 hover:bg-green-50/60' : 
                                  debtor.status === 'Blacklist' ? 'bg-red-50/30 hover:bg-red-50/60' : 
                                  'hover:bg-slate-50'}`
                            }
                          >
                              <td className="px-6 py-4 text-sm font-mono text-slate-600">
                                  {debtor.reservationNumber}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{debtor.lastName}, {debtor.firstName}</div>
                                  <div className="text-xs text-slate-400">Import: {debtor.importedAt}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={debtor.address}>
                                  {debtor.address}
                              </td>
                              <td className="px-6 py-4">
                                  <span className="font-bold text-slate-900">€ {debtor.amount.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="relative group/dropdown inline-block">
                                      <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${getStatusBadge(debtor.status)}`}>
                                          {debtor.status}
                                          {debtor.status === 'Paid' && <CheckCircle2 size={12} />}
                                          <ArrowUpRight size={10} className="opacity-50"/>
                                      </button>
                                      
                                      {/* Status Dropdown */}
                                      <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-10 hidden group-hover/dropdown:block animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                                          {(['New', '1st Reminder', '2nd Reminder', 'Final Notice', 'Paid', 'Blacklist'] as DebtorStatus[]).map(status => (
                                              <button 
                                                key={status}
                                                onClick={() => handleStatusChange(debtor.id, status)}
                                                className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 flex items-center gap-2
                                                    ${status === 'Paid' ? 'text-green-600 hover:bg-green-50' : 
                                                      status === 'Blacklist' ? 'text-red-600 hover:bg-red-50' : 'text-slate-600'}
                                                `}
                                              >
                                                  {status}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                      <MoreHorizontal size={18} />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {filteredDebtors.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                  Geen dossiers gevonden.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default DebtControlPage;