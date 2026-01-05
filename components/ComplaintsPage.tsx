
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    MessageCircleWarning, Search, Filter, Plus, AlertTriangle, 
    CheckCircle2, Clock, X, MessageSquare, Euro, 
    ChevronRight, Save, ThumbsUp, ThumbsDown, User, Calendar, 
    ArrowRight, History, MoreHorizontal, Trash2, Printer, Gift, Image as ImageIcon, Upload, Building2,
    Ticket, BedDouble, Tag, CreditCard
} from 'lucide-react';
import { Employee, Complaint, ComplaintStatus, ComplaintCategory, ComplaintSeverity, ComplaintTimelineItem } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface ComplaintsPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const STATUS_COLORS: Record<ComplaintStatus, string> = {
    'Open': 'bg-red-100 text-red-700',
    'In Progress': 'bg-amber-100 text-amber-700',
    'Resolved': 'bg-green-100 text-green-700',
    'Closed': 'bg-slate-100 text-slate-700'
};

const SEVERITY_ICONS: Record<ComplaintSeverity, React.ReactNode> = {
    'Low': <div className="w-2 h-2 rounded-full bg-blue-500"></div>,
    'Medium': <div className="w-2 h-2 rounded-full bg-amber-500"></div>,
    'High': <div className="w-2 h-2 rounded-full bg-orange-500"></div>,
    'Critical': <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
};

// Removed old QUICK_SOLUTIONS constant in favor of dynamic logic
const DEPARTMENTS = ['Front Office', 'Huishouding', 'Technische Dienst', 'F&B Service', 'Keuken', 'Wellness', 'Reserveringen', 'Management'];

const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ currentUser, onShowToast }) => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [view, setView] = useState<'list' | 'dashboard'>('list');
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
    
    // Create/Edit Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingComplaint, setEditingComplaint] = useState<Partial<Complaint>>({});

    // Detail Drawer
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [newTimelineNote, setNewTimelineNote] = useState('');
    
    // Local State for Edit Mode in Drawer
    const [draftProposal, setDraftProposal] = useState('');
    const [draftCost, setDraftCost] = useState<string>('');
    const [draftDepartment, setDraftDepartment] = useState('');
    
    // --- SMART SOLUTION STATE ---
    const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
    const [solutionType, setSolutionType] = useState<'DayEntry' | 'FreeStay' | 'AdjustedRate' | 'Refund' | null>(null);
    
    // Solution Inputs
    const [solQuantity, setSolQuantity] = useState(1); // For DayEntry
    const [solAmount, setSolAmount] = useState(''); // For Rate/Refund
    const [solContext, setSolContext] = useState('Overnachting'); // For Rate
    const [solPackage, setSolPackage] = useState('Logies & Ontbijt'); // For FreeStay
    const [solCustomPackage, setSolCustomPackage] = useState(''); // For FreeStay "Anders"

    const fileInputRef = useRef<HTMLInputElement>(null);

    const canManage = hasPermission(currentUser, 'MANAGE_COMPLAINTS');

    useEffect(() => {
        loadComplaints();
    }, []);

    // Sync local state when selected complaint changes
    useEffect(() => {
        if (selectedComplaint) {
            setDraftProposal(selectedComplaint.compensationDetails.offered);
            setDraftCost(selectedComplaint.compensationDetails.cost ? selectedComplaint.compensationDetails.cost.toString() : '');
            setDraftDepartment(selectedComplaint.department || 'Front Office');
        }
    }, [selectedComplaint]);

    const loadComplaints = async () => {
        setIsLoading(true);
        const data = await api.getComplaints();
        // Sort by date desc
        setComplaints(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoading(false);
    };

    // --- COMPUTED STATS ---
    const stats = useMemo(() => {
        const open = complaints.filter(c => c.status === 'Open').length;
        const critical = complaints.filter(c => c.severity === 'Critical' && c.status !== 'Closed').length;
        
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        
        const monthlyComplaints = complaints.filter(c => {
            const d = new Date(c.createdAt);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });

        const totalCost = monthlyComplaints.reduce((acc, curr) => acc + (curr.compensationDetails?.cost || 0), 0);

        return { open, critical, totalCost, monthlyCount: monthlyComplaints.length };
    }, [complaints]);

    const filteredComplaints = useMemo(() => {
        return complaints.filter(c => {
            const matchesSearch = 
                c.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.reservationNumber.includes(searchTerm) || 
                c.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [complaints, searchTerm, statusFilter]);

    // --- ACTIONS ---

    const handleOpenCreate = () => {
        setEditingComplaint({
            id: crypto.randomUUID(),
            status: 'Open',
            severity: 'Low',
            category: 'Other',
            department: 'Front Office',
            compensationDetails: { offered: '', guestAccepted: null },
            timeline: []
        });
        setIsModalOpen(true);
    };

    const handleSaveComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingComplaint.guestName || !editingComplaint.description) {
            return onShowToast("Vul alle verplichte velden in.");
        }

        const now = new Date().toISOString();
        const isNew = !complaints.find(c => c.id === editingComplaint.id);
        
        const complaint: Complaint = {
            id: editingComplaint.id!,
            reservationNumber: editingComplaint.reservationNumber || '',
            guestName: editingComplaint.guestName!,
            roomNumber: editingComplaint.roomNumber,
            category: editingComplaint.category as ComplaintCategory || 'Other',
            department: editingComplaint.department || 'Front Office',
            severity: editingComplaint.severity as ComplaintSeverity || 'Low',
            status: editingComplaint.status as ComplaintStatus || 'Open',
            description: editingComplaint.description!,
            compensationDetails: editingComplaint.compensationDetails || { offered: '', guestAccepted: null },
            assignedTo: editingComplaint.assignedTo,
            createdBy: isNew ? currentUser.name : (editingComplaint.createdBy || currentUser.name),
            createdAt: editingComplaint.createdAt || now,
            updatedAt: now,
            timeline: editingComplaint.timeline || []
        };

        if (isNew) {
            complaint.timeline.push({
                id: crypto.randomUUID(),
                date: now,
                author: currentUser.name,
                action: 'Created',
                note: 'Klacht geregistreerd.'
            });
        }

        await api.saveComplaint(complaint);
        setComplaints(prev => {
            const idx = prev.findIndex(c => c.id === complaint.id);
            if (idx >= 0) {
                const newArr = [...prev];
                newArr[idx] = complaint;
                return newArr;
            }
            return [complaint, ...prev];
        });

        setIsModalOpen(false);
        onShowToast("Klacht opgeslagen.");
        
        if (selectedComplaint && selectedComplaint.id === complaint.id) {
            setSelectedComplaint(complaint);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Weet je zeker dat je deze klacht wilt verwijderen?")) {
            await api.deleteComplaint(id);
            setComplaints(prev => prev.filter(c => c.id !== id));
            if (selectedComplaint?.id === id) setSelectedComplaint(null);
            onShowToast("Klacht verwijderd.");
        }
    };

    // --- DETAIL ACTIONS ---

    const addTimelineNote = async () => {
        if (!selectedComplaint || !newTimelineNote.trim()) return;
        
        const newItem: ComplaintTimelineItem = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            author: currentUser.name,
            action: 'Note',
            note: newTimelineNote
        };

        const updated = {
            ...selectedComplaint,
            timeline: [newItem, ...selectedComplaint.timeline]
        };

        await api.saveComplaint(updated);
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedComplaint(updated);
        setNewTimelineNote('');
    };

    const updateStatus = async (newStatus: ComplaintStatus) => {
        if (!selectedComplaint) return;
        
        const newItem: ComplaintTimelineItem = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            author: currentUser.name,
            action: 'Status Change',
            note: `Status gewijzigd van ${selectedComplaint.status} naar ${newStatus}`
        };

        const updated = {
            ...selectedComplaint,
            status: newStatus,
            timeline: [newItem, ...selectedComplaint.timeline]
        };

        await api.saveComplaint(updated);
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedComplaint(updated);
        onShowToast(`Status gewijzigd naar ${newStatus}`);
    };

    const handleSaveCompensation = async (accepted: boolean | null = null) => {
        if (!selectedComplaint) return;

        // Check if anything changed to avoid spamming timeline
        const hasChanged = 
            draftProposal !== selectedComplaint.compensationDetails.offered || 
            parseFloat(draftCost || '0') !== (selectedComplaint.compensationDetails.cost || 0) ||
            draftDepartment !== selectedComplaint.department;

        const isAcceptanceChange = accepted !== selectedComplaint.compensationDetails.guestAccepted;

        if (!hasChanged && !isAcceptanceChange) {
            onShowToast("Geen wijzigingen om op te slaan.");
            return;
        }

        const costVal = parseFloat(draftCost || '0');
        let noteText = '';
        
        if (isAcceptanceChange) {
             noteText = `Gast heeft voorstel ${accepted ? 'geaccepteerd' : 'geweigerd'}.`;
        } else {
             noteText = `Dossier bijgewerkt. Voorstel: ${draftProposal} (€${costVal}). Afdeling: ${draftDepartment}`;
        }

        const newItem: ComplaintTimelineItem = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            author: currentUser.name,
            action: 'Update',
            note: noteText
        };

        const updated = {
            ...selectedComplaint,
            department: draftDepartment,
            compensationDetails: { 
                offered: draftProposal, 
                cost: costVal, 
                guestAccepted: accepted !== null ? accepted : selectedComplaint.compensationDetails.guestAccepted // Only update if passed explicitly
            },
            timeline: [newItem, ...selectedComplaint.timeline]
        };

        await api.saveComplaint(updated);
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedComplaint(updated);
        onShowToast("Wijzigingen opgeslagen.");
    };

    // --- SMART SOLUTION LOGIC ---

    const openSmartSolution = (type: 'DayEntry' | 'FreeStay' | 'AdjustedRate' | 'Refund') => {
        setSolutionType(type);
        // Reset defaults
        setSolQuantity(1);
        setSolAmount('');
        setSolContext('Overnachting');
        setSolPackage('Logies & Ontbijt');
        setSolCustomPackage('');
        setIsSolutionModalOpen(true);
    };

    const applySmartSolution = () => {
        let textToAdd = '';
        let costToAdd = 0;

        switch (solutionType) {
            case 'DayEntry':
                costToAdd = solQuantity * 49.50;
                textToAdd = `Aangeboden: ${solQuantity}x Dagentree Thermen.`;
                break;
            case 'AdjustedRate':
                costToAdd = parseFloat(solAmount) || 0;
                textToAdd = `Aangeboden: Aangepast tarief (€${costToAdd.toFixed(2)} korting op ${solContext}).`;
                break;
            case 'FreeStay':
                costToAdd = 0; // Usually internal cost, can be adjusted manually later
                const packageText = solPackage === 'Anders' ? solCustomPackage : solPackage;
                textToAdd = `Aangeboden: Voucher voor gratis overnachting (${packageText}).`;
                break;
            case 'Refund':
                costToAdd = parseFloat(solAmount) || 0;
                textToAdd = `Aangeboden: Terugbetaling t.w.v. €${costToAdd.toFixed(2)}.`;
                break;
        }

        setDraftProposal(prev => prev ? `${prev}\n${textToAdd}` : textToAdd);
        
        // If there's already a cost, add to it? Or replace? Usually replace or add if user wants. 
        // For simplicity, let's set it if empty, or ask user to verify. 
        // Let's just set/overwrite for now as it's a "Quick Action".
        // Better UX: If existing cost > 0, add to it.
        const currentCost = parseFloat(draftCost || '0');
        setDraftCost((currentCost + costToAdd).toFixed(2));
        
        setIsSolutionModalOpen(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedComplaint || !e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        
        onShowToast("Foto uploaden...");
        try {
            const url = await api.uploadFile(file);
            if(url) {
                const updated = {
                    ...selectedComplaint,
                    images: [...(selectedComplaint.images || []), url]
                };
                await api.saveComplaint(updated);
                setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
                setSelectedComplaint(updated);
                onShowToast("Foto toegevoegd.");
            }
        } catch(err) {
            onShowToast("Upload mislukt.");
        }
    };

    const handlePrintLetter = () => {
        if (!selectedComplaint) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Excuusbrief - ${selectedComplaint.guestName}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                        .header { margin-bottom: 40px; }
                        .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                        .meta { margin-bottom: 40px; text-align: right; }
                        .content { margin-bottom: 60px; }
                        .signature { margin-top: 40px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">Sanadome Hotel & Spa</div>
                        <div>Weg door Jonkerbos 90</div>
                        <div>6532 SZ Nijmegen</div>
                    </div>
                    <div class="meta">
                        Nijmegen, ${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div>
                        <strong>Betreft:</strong> Uw verblijf / Reservering #${selectedComplaint.reservationNumber}
                    </div>
                    <br/><br/>
                    <div>
                        Geachte gast, beste ${selectedComplaint.guestName},
                    </div>
                    <div class="content">
                        <p>Naar aanleiding van uw melding tijdens uw verblijf, willen wij u via deze weg nogmaals onze excuses aanbieden voor het ongemak.</p>
                        <p>Wij streven naar de hoogste kwaliteit en service, en het spijt ons te horen dat uw ervaring niet aan de verwachtingen voldeed. Uw feedback is besproken met de afdeling <strong>${draftDepartment}</strong> om herhaling in de toekomst te voorkomen.</p>
                        ${draftProposal ? `<p>Als gebaar van goede wil hebben wij het volgende voor u geregeld:<br/><strong>${draftProposal}</strong></p>` : ''}
                        <p>Wij hopen u in de toekomst opnieuw te mogen verwelkomen, zodat wij u de ware Sanadome ervaring kunnen bieden.</p>
                    </div>
                    <div class="signature">
                        Met gastvrije groet,<br/><br/>
                        <strong>${currentUser.name}</strong><br/>
                        ${currentUser.role}<br/>
                        Sanadome Hotel & Spa
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
        }
    };

    // --- RENDER ---

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <MessageCircleWarning className="text-teal-600" size={32} />
                        Klachten Management
                    </h1>
                    <p className="text-slate-500 mt-1">Registratie en afhandeling van gastklachten.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        <Plus size={18} /> Nieuwe Klacht
                    </button>
                </div>
            </div>

            {/* DASHBOARD STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24}/></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Openstaand</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.open}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><AlertTriangle size={24}/></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Kritiek</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.critical}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Euro size={24}/></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Kosten (Mnd)</div>
                        <div className="text-2xl font-bold text-slate-900">€ {stats.totalCost.toFixed(2)}</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-teal-50 text-teal-600 rounded-xl"><CheckCircle2 size={24}/></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Aantal (Mnd)</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.monthlyCount}</div>
                    </div>
                </div>
            </div>

            {/* LIST AREA */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Zoeken..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
                        {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                                    statusFilter === s 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Status & Ernst</th>
                                <th className="px-6 py-4">Gast</th>
                                <th className="px-6 py-4">Omschrijving</th>
                                <th className="px-6 py-4">Compensatie</th>
                                <th className="px-6 py-4 text-right">Actie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredComplaints.map(complaint => (
                                <tr key={complaint.id} onClick={() => setSelectedComplaint(complaint)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit ${STATUS_COLORS[complaint.status]}`}>
                                                {complaint.status}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                {SEVERITY_ICONS[complaint.severity]} {complaint.severity}
                                                <span className="text-slate-300">•</span>
                                                {complaint.category}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{complaint.guestName}</div>
                                        <div className="text-xs text-slate-500 font-mono">#{complaint.reservationNumber} {complaint.roomNumber ? `• Kmr ${complaint.roomNumber}` : ''}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">{new Date(complaint.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-md">
                                        <p className="text-slate-600 line-clamp-2">{complaint.description}</p>
                                        {complaint.department && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">{complaint.department}</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {complaint.compensationDetails.cost ? (
                                            <div className="font-bold text-slate-900">€ {complaint.compensationDetails.cost.toFixed(2)}</div>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">-</span>
                                        )}
                                        <div className="mt-1">
                                            {complaint.compensationDetails.guestAccepted === true && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Akkoord</span>}
                                            {complaint.compensationDetails.guestAccepted === false && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">Geweigerd</span>}
                                            {complaint.compensationDetails.guestAccepted === null && complaint.compensationDetails.offered && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">In afwachting</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-teal-600">
                                            <ChevronRight size={20}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredComplaints.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Geen klachten gevonden.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAIL DRAWER */}
            {selectedComplaint && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedComplaint(null)}></div>
                    <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[selectedComplaint.status]}`}>
                                        {selectedComplaint.status}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">ID: {selectedComplaint.id.slice(0,8)}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">{selectedComplaint.guestName}</h2>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                    <span className="flex items-center gap-1"><User size={14}/> Res: {selectedComplaint.reservationNumber}</span>
                                    {selectedComplaint.roomNumber && <span className="flex items-center gap-1"><ArrowRight size={14}/> Kmr: {selectedComplaint.roomNumber}</span>}
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(selectedComplaint.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handlePrintLetter}
                                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                                    title="Excuusbrief printen"
                                >
                                    <Printer size={20}/>
                                </button>
                                <button 
                                    onClick={() => handleDelete(selectedComplaint.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={20}/>
                                </button>
                                <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                    <X size={24}/>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* LEFT COLUMN: DETAILS & COMPENSTATION */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Description */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <AlertTriangle size={18} className="text-slate-400"/> Klacht Omschrijving
                                        </h3>
                                        <div className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed text-sm whitespace-pre-wrap border border-slate-100">
                                            {selectedComplaint.description}
                                        </div>
                                        
                                        {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                                            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                                                {selectedComplaint.images.map((url, idx) => (
                                                    <a key={idx} href={url} target="_blank" rel="noreferrer">
                                                        <img src={url} className="h-20 w-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" alt="Evidence" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-4">
                                             <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                             />
                                             <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 flex items-center gap-1"
                                             >
                                                 <ImageIcon size={12}/> Foto Toevoegen
                                             </button>
                                        </div>

                                        <div className="flex gap-4 mt-4 text-xs font-bold text-slate-500 pt-4 border-t border-slate-100">
                                            <span className="bg-slate-100 px-2 py-1 rounded">Categorie: {selectedComplaint.category}</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded flex items-center gap-1">Ernst: {SEVERITY_ICONS[selectedComplaint.severity]} {selectedComplaint.severity}</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded">Aangenomen door: {selectedComplaint.createdBy}</span>
                                        </div>
                                    </div>

                                    {/* COMPENSATION NEGOTIATION */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Euro size={18} className="text-teal-600"/> Compensatie & Afhandeling
                                        </h3>
                                        
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Building2 size={12}/> Verantwoordelijke Afdeling</label>
                                            <div className="flex flex-wrap gap-2">
                                                {DEPARTMENTS.map(dept => (
                                                    <button
                                                        key={dept}
                                                        onClick={() => setDraftDepartment(dept)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                            draftDepartment === dept 
                                                            ? 'bg-slate-800 text-white border-slate-800' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {dept}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-teal-50/50 border border-teal-100 p-5 rounded-xl mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-teal-800 uppercase">Slimme Oplossingen</label>
                                            </div>
                                            
                                            <div className="flex gap-2 flex-wrap mb-4">
                                                <button onClick={() => openSmartSolution('DayEntry')} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-50 shadow-sm transition-all"><Ticket size={14}/> Dagentree</button>
                                                <button onClick={() => openSmartSolution('FreeStay')} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-50 shadow-sm transition-all"><BedDouble size={14}/> Gratis Overnachting</button>
                                                <button onClick={() => openSmartSolution('AdjustedRate')} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-50 shadow-sm transition-all"><Tag size={14}/> Aangepast Tarief</button>
                                                <button onClick={() => openSmartSolution('Refund')} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-50 shadow-sm transition-all"><CreditCard size={14}/> Terugbetaling</button>
                                            </div>

                                            <label className="block text-xs font-bold text-teal-800 uppercase mb-2">Aangeboden Oplossing (Tekst)</label>
                                            <textarea 
                                                className="w-full p-3 border border-teal-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3 min-h-[100px]"
                                                rows={4}
                                                placeholder="Wat bieden we aan?"
                                                value={draftProposal}
                                                onChange={(e) => setDraftProposal(e.target.value)}
                                            />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-32">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-full pl-6 pr-3 py-2 border border-teal-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                            value={draftCost}
                                                            placeholder="0.00"
                                                            onChange={(e) => setDraftCost(e.target.value)}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-teal-600 font-medium hidden sm:inline">Financiële waarde</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleSaveCompensation()}
                                                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-1"
                                                >
                                                    <Save size={14}/> Wijzigingen Opslaan
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <h4 className="text-sm font-bold text-slate-700">Reactie Gast</h4>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleSaveCompensation(true)}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                        selectedComplaint.compensationDetails.guestAccepted === true
                                                        ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-600'
                                                    }`}
                                                >
                                                    <ThumbsUp size={16}/> Akkoord
                                                </button>
                                                <button 
                                                    onClick={() => handleSaveCompensation(false)}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                                        selectedComplaint.compensationDetails.guestAccepted === false
                                                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600'
                                                    }`}
                                                >
                                                    <ThumbsDown size={16}/> Niet Akkoord
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: STATUS & TIMELINE */}
                                <div className="space-y-8">
                                    {/* Workflow Status */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Status Wijzigen</h3>
                                        <div className="space-y-2">
                                            {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => updateStatus(status as ComplaintStatus)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all flex justify-between items-center ${
                                                        selectedComplaint.status === status
                                                        ? 'border-slate-900 bg-slate-50 text-slate-900'
                                                        : 'border-transparent hover:bg-slate-50 text-slate-500'
                                                    }`}
                                                >
                                                    {status}
                                                    {selectedComplaint.status === status && <CheckCircle2 size={16} className="text-teal-600"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
                                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <History size={18} className="text-slate-400"/> Tijdlijn & Notities
                                        </h3>
                                        
                                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                            {selectedComplaint.timeline.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => (
                                                <div key={item.id} className="relative pl-4 border-l-2 border-slate-100">
                                                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                                                    <div className="text-xs text-slate-400 mb-1">
                                                        {new Date(item.date).toLocaleString('nl-NL')} • <span className="font-bold text-slate-600">{item.author}</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{item.action}</div>
                                                    {item.note && <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">{item.note}</div>}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <div className="relative">
                                                <input 
                                                    className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                    placeholder="Voeg interne notitie toe..."
                                                    value={newTimelineNote}
                                                    onChange={e => setNewTimelineNote(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addTimelineNote()}
                                                />
                                                <button 
                                                    onClick={addTimelineNote}
                                                    disabled={!newTimelineNote.trim()}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                                >
                                                    <ArrowRight size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Klacht Registreren"
            >
                <form onSubmit={handleSaveComplaint} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gast Naam</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                                value={editingComplaint.guestName || ''}
                                onChange={e => setEditingComplaint({...editingComplaint, guestName: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reserveringsnummer</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                                value={editingComplaint.reservationNumber || ''}
                                onChange={e => setEditingComplaint({...editingComplaint, reservationNumber: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                value={editingComplaint.category}
                                onChange={e => setEditingComplaint({...editingComplaint, category: e.target.value as any})}
                            >
                                <option value="Room">Kamer / Huishouding</option>
                                <option value="Food">F&B / Restaurant</option>
                                <option value="Service">Service / Personeel</option>
                                <option value="Noise">Geluidsoverlast</option>
                                <option value="Technical">Technisch Defect</option>
                                <option value="Other">Overig</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ernst</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                value={editingComplaint.severity}
                                onChange={e => setEditingComplaint({...editingComplaint, severity: e.target.value as any})}
                            >
                                <option value="Low">Laag</option>
                                <option value="Medium">Gemiddeld</option>
                                <option value="High">Hoog</option>
                                <option value="Critical">Kritiek</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Betrokken Afdeling</label>
                        <select 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                            value={editingComplaint.department || 'Front Office'}
                            onChange={e => setEditingComplaint({...editingComplaint, department: e.target.value})}
                        >
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omschrijving</label>
                        <textarea 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm h-32 resize-none"
                            placeholder="Wat is er gebeurd?"
                            value={editingComplaint.description || ''}
                            onChange={e => setEditingComplaint({...editingComplaint, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Annuleren</button>
                        <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg flex items-center gap-2">
                            <Save size={16}/> Opslaan
                        </button>
                    </div>
                </form>
            </Modal>

            {/* SMART SOLUTION MODAL */}
            <Modal
                isOpen={isSolutionModalOpen}
                onClose={() => setIsSolutionModalOpen(false)}
                title={
                    solutionType === 'DayEntry' ? 'Dagentree Toekennen' :
                    solutionType === 'FreeStay' ? 'Gratis Overnachting' :
                    solutionType === 'AdjustedRate' ? 'Aangepast Tarief' : 'Terugbetaling'
                }
            >
                <div className="space-y-4">
                    {solutionType === 'DayEntry' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aantal Personen</label>
                            <input 
                                type="number"
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold"
                                min={1}
                                value={solQuantity}
                                onChange={(e) => setSolQuantity(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-slate-400 mt-1">Waarde: €49.50 per persoon</p>
                        </div>
                    )}

                    {solutionType === 'FreeStay' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Arrangement</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                value={solPackage}
                                onChange={(e) => setSolPackage(e.target.value)}
                            >
                                <option value="Logies & Ontbijt">Logies & Ontbijt</option>
                                <option value="Half Pension">Half Pension</option>
                                <option value="Anti Stress">Anti Stress</option>
                                <option value="Anders">Anders</option>
                            </select>
                            
                            {solPackage === 'Anders' && (
                                <input 
                                    className="w-full p-3 mt-2 border border-slate-200 rounded-xl text-sm bg-white animate-in fade-in slide-in-from-top-1"
                                    placeholder="Omschrijf het arrangement..."
                                    value={solCustomPackage}
                                    onChange={(e) => setSolCustomPackage(e.target.value)}
                                    autoFocus
                                />
                            )}
                        </div>
                    )}

                    {solutionType === 'AdjustedRate' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Korting Bedrag (€)</label>
                                <input 
                                    type="number"
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold"
                                    placeholder="0.00"
                                    value={solAmount}
                                    onChange={(e) => setSolAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Korting Op</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                    value={solContext}
                                    onChange={(e) => setSolContext(e.target.value)}
                                >
                                    <option value="Overnachting">Overnachting</option>
                                    <option value="Dagentree">Dagentree</option>
                                    <option value="Behandeling">Behandeling</option>
                                    <option value="Horeca">Horeca</option>
                                    <option value="Anders">Anders</option>
                                </select>
                            </div>
                        </>
                    )}

                    {solutionType === 'Refund' && (
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Terug te betalen bedrag (€)</label>
                            <input 
                                type="number"
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold"
                                placeholder="0.00"
                                value={solAmount}
                                onChange={(e) => setSolAmount(e.target.value)}
                            />
                        </div>
                    )}

                    <button 
                        onClick={applySmartSolution}
                        className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition-colors mt-4"
                    >
                        Toevoegen aan Voorstel
                    </button>
                </div>
            </Modal>

        </div>
    );
};

export default ComplaintsPage;
