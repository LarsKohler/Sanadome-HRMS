
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Bike, Calendar, User, FileText, CheckCircle2, X, Plus, Minus,
    Settings, AlertCircle, RefreshCw, PenTool, Check, ChevronLeft, 
    ChevronRight, Save, History, LayoutDashboard, Zap, Clock, Wrench, AlertTriangle, ArrowRight, Grid3X3, Key, Filter, Tag, Euro, Trash2, PenLine
} from 'lucide-react';
import { Employee, BikeReservation, BikeSettings, BikeType } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface BikeRentalPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const PRICES = {
    'City Bike Men': 12.50,
    'City Bike Women': 12.50,
    'E-Bike': 25.00
};

const BIKE_TYPES: { id: BikeType; label: string; icon: any; color: string }[] = [
    { id: 'City Bike Men', label: 'Herenfiets', icon: Bike, color: 'text-blue-600 bg-blue-100' },
    { id: 'City Bike Women', label: 'Damesfiets', icon: Bike, color: 'text-pink-600 bg-pink-100' },
    { id: 'E-Bike', label: 'E-Bike', icon: Zap, color: 'text-amber-600 bg-amber-100' }
];

// HARDCODED ASSETS
const BIKE_ASSETS = [
    { id: 'H9', type: 'City Bike Men' },
    { id: 'H10', type: 'City Bike Men' },
    { id: 'H11', type: 'City Bike Men' },
    { id: 'H12', type: 'City Bike Men' },
    { id: 'D1', type: 'City Bike Women' },
    { id: 'D2', type: 'City Bike Women' },
    { id: 'D3', type: 'City Bike Women' },
    { id: 'D4', type: 'City Bike Women' },
    { id: 'D5', type: 'City Bike Women' },
    { id: 'D6', type: 'City Bike Women' },
    { id: 'E401', type: 'E-Bike' },
    { id: 'E402', type: 'E-Bike' },
    { id: 'E403', type: 'E-Bike' },
    { id: 'E404', type: 'E-Bike' },
    { id: 'E406', type: 'E-Bike' },
    { id: 'E407', type: 'E-Bike' },
    { id: 'E408', type: 'E-Bike' },
];

const BikeRentalPage: React.FC<BikeRentalPageProps> = ({ currentUser, onShowToast }) => {
    const [view, setView] = useState<'dashboard' | 'guest-flow' | 'settings' | 'archive'>('dashboard');
    const [settings, setSettings] = useState<BikeSettings>({ 
        inventory: { 'City Bike Men': 0, 'City Bike Women': 0, 'E-Bike': 0 }, 
        inMaintenance: [],
        termsAndConditions: '',
        maintenanceReasons: {}
    });
    const [reservations, setReservations] = useState<BikeReservation[]>([]);
    
    // --- DASHBOARD DATE STATE ---
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // --- STATUS MODALS ---
    const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<BikeType | null>(null);
    const [selectedReservationForDetail, setSelectedReservationForDetail] = useState<BikeReservation | null>(null);

    // --- ASSIGNMENT STATE ---
    const [assignmentTarget, setAssignmentTarget] = useState<BikeReservation | null>(null);

    // --- MAINTENANCE MODAL ---
    const [maintenanceTargetId, setMaintenanceTargetId] = useState<string | null>(null);
    const [maintenanceReason, setMaintenanceReason] = useState('');

    // --- MANUAL BOOKING MODAL (STAFF) ---
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
    const [manualForm, setManualForm] = useState<{
        guestName: string;
        roomNumber: string;
        startDate: string;
        endDate: string;
        rows: { type: BikeType, assetId: string }[];
    }>({
        guestName: '',
        roomNumber: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        rows: [{ type: 'City Bike Men', assetId: '' }]
    });

    // --- SIGNATURE ONLY MODAL ---
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signatureTarget, setSignatureTarget] = useState<BikeReservation | null>(null);

    // --- GUEST FLOW STATE ---
    const [flowStep, setFlowStep] = useState(1);
    const [cart, setCart] = useState<Record<BikeType, number>>({ 'City Bike Men': 0, 'City Bike Women': 0, 'E-Bike': 0 });
    const [guestDetails, setGuestDetails] = useState({
        name: '',
        room: '',
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    // --- RETURN & DAMAGE STATE ---
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedReturnRes, setSelectedReturnRes] = useState<BikeReservation | null>(null);
    const [isDamageReported, setIsDamageReported] = useState(false);
    const [damageNotes, setDamageNotes] = useState('');

    // --- SIGNATURE STATE ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSigned, setIsSigned] = useState(false);

    // --- PERMISSIONS ---
    const isManager = hasPermission(currentUser, 'MANAGE_SETTINGS');

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); 
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        const sets = await api.getBikeSettings();
        const res = await api.getBikeReservations();
        setSettings({
            ...sets,
            inMaintenance: Array.isArray(sets.inMaintenance) ? sets.inMaintenance : []
        });
        setReservations(res.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    // --- DATE LOGIC ---
    const handleDateChange = (delta: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const isDateOverlapping = (targetDate: string, start: string, end: string) => {
        return targetDate >= start && targetDate <= end;
    };

    // --- LOGIC HELPERS ---
    const getBikeStatus = (bikeId: string, date: string) => {
        if (settings.inMaintenance.includes(bikeId)) return 'Maintenance';
        
        // Check if rented on the specific date
        const activeRes = reservations.find(r => 
            r.status !== 'Cancelled' && 
            r.status !== 'Completed' && 
            r.bikeId === bikeId &&
            isDateOverlapping(date, r.startDate, r.endDate)
        );
        
        if (activeRes) return 'Rented';
        return 'Available';
    };

    const getActiveReservationForBike = (bikeId: string, date: string) => {
        return reservations.find(r => 
            r.status !== 'Cancelled' && 
            r.status !== 'Completed' && 
            r.bikeId === bikeId &&
            isDateOverlapping(date, r.startDate, r.endDate)
        );
    };

    const getStats = (type: BikeType, date: string) => {
        const assets = BIKE_ASSETS.filter(b => b.type === type);
        const total = assets.length;
        const maintenance = assets.filter(a => settings.inMaintenance.includes(a.id)).length;
        
        // Count rented specifically for the selected date
        const rented = assets.filter(a => 
            reservations.some(r => 
                r.status !== 'Cancelled' && 
                r.status !== 'Completed' && 
                r.bikeId === a.id && 
                isDateOverlapping(date, r.startDate, r.endDate)
            )
        ).length;
        
        const available = total - maintenance - rented;
        return { total, maintenance, rented, available };
    };

    const toggleMaintenance = async (bikeId: string, reason: string = '') => {
        let newMaintenanceList = [...settings.inMaintenance];
        let newReasons = { ...settings.maintenanceReasons };

        if (newMaintenanceList.includes(bikeId)) {
            // Remove
            newMaintenanceList = newMaintenanceList.filter(id => id !== bikeId);
            delete newReasons[bikeId];
        } else {
            // Add
            newMaintenanceList.push(bikeId);
            if (reason) newReasons[bikeId] = reason;
        }
        
        const updatedSettings = { ...settings, inMaintenance: newMaintenanceList, maintenanceReasons: newReasons };
        setSettings(updatedSettings);
        await api.saveBikeSettings(updatedSettings);
        onShowToast(`Status van fiets ${bikeId} bijgewerkt.`);
        setMaintenanceTargetId(null);
        setMaintenanceReason('');
    };

    // --- MANUAL BOOKING ---
    const handleAddManualRow = () => {
        setManualForm(prev => ({
            ...prev,
            rows: [...prev.rows, { type: 'City Bike Men', assetId: '' }]
        }));
    };

    const handleRemoveManualRow = (index: number) => {
        setManualForm(prev => ({
            ...prev,
            rows: prev.rows.filter((_, i) => i !== index)
        }));
    };

    const handleManualRowChange = (index: number, field: 'type' | 'assetId', value: string) => {
        setManualForm(prev => {
            const newRows = [...prev.rows];
            if (field === 'type') {
                newRows[index] = { type: value as BikeType, assetId: '' };
            } else {
                newRows[index] = { ...newRows[index], [field]: value };
            }
            return { ...prev, rows: newRows };
        });
    };

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        const groupId = Math.random().toString(36).substr(2, 9);
        const newReservations: BikeReservation[] = [];

        for (const row of manualForm.rows) {
            const isAssigned = !!row.assetId;
            newReservations.push({
                id: Math.random().toString(36).substr(2, 9),
                groupId,
                guestName: manualForm.guestName,
                roomNumber: manualForm.roomNumber,
                bikeType: row.type,
                bikeId: isAssigned ? row.assetId : undefined,
                amount: 1,
                startDate: manualForm.startDate,
                endDate: manualForm.endDate,
                startTime: isAssigned ? new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}) : undefined,
                status: isAssigned ? 'Active' : 'Pending',
                termsAccepted: true, 
                signatureUrl: undefined, // Explicitly undefined to trigger sign-later flow
                createdAt: new Date().toISOString(),
                createdBy: currentUser.name
            });
        }

        for (const res of newReservations) {
            await api.saveBikeReservation(res);
        }
        
        setReservations([...newReservations, ...reservations]);
        setIsManualBookingOpen(false);
        setManualForm({ 
            guestName: '', 
            roomNumber: '', 
            startDate: selectedDate, // Reset to current dashboard date
            endDate: selectedDate,
            rows: [{ type: 'City Bike Men', assetId: '' }] 
        });
        onShowToast("Boeking toegevoegd. Vergeet niet te laten ondertekenen!");
    };

    // --- SIGNATURE LOGIC ---
    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0f172a';
        }
        let drawing = false;
        const start = (e: any) => { drawing = true; draw(e); };
        const end = () => { drawing = false; ctx?.beginPath(); setIsSigned(true); };
        const draw = (e: any) => {
            if (!drawing || !ctx) return;
            e.preventDefault();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        };
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', end);
    };

    // For Main Flow
    useEffect(() => {
        if (view === 'guest-flow' && flowStep === 3) setTimeout(initCanvas, 100);
    }, [view, flowStep]);

    // For Standalone Signature Modal
    useEffect(() => {
        if (isSignatureModalOpen) setTimeout(initCanvas, 100);
    }, [isSignatureModalOpen]);

    const handleSaveStandaloneSignature = async () => {
        if (!signatureTarget) return;
        const canvas = canvasRef.current;
        const signatureUrl = canvas?.toDataURL();
        
        // Update all reservations in the same group if applicable, or just this one
        const relatedIds = reservations.filter(r => r.groupId === signatureTarget.groupId).map(r => r.id);
        const uniqueIds = new Set([signatureTarget.id, ...relatedIds]); // Ensure current is included

        const updatedReservations = reservations.map(r => {
            if (uniqueIds.has(r.id)) {
                return { ...r, signatureUrl };
            }
            return r;
        });

        // Save to DB
        const promises = Array.from(uniqueIds).map(id => {
            const res = updatedReservations.find(r => r.id === id);
            return res ? api.saveBikeReservation(res) : Promise.resolve();
        });
        
        await Promise.all(promises);
        setReservations(updatedReservations);
        
        setIsSignatureModalOpen(false);
        setSignatureTarget(null);
        onShowToast("Handtekening opgeslagen.");
    };

    // --- GUEST FLOW ---
    const handleStartFlow = () => {
        setCart({ 'City Bike Men': 0, 'City Bike Women': 0, 'E-Bike': 0 });
        setGuestDetails({
            name: '',
            room: '',
            start: new Date().toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        });
        setFlowStep(1);
        setIsSigned(false);
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
        setView('guest-flow');
    };

    const handleExitFlow = () => {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
        setView('dashboard');
    };

    const updateCart = (type: BikeType, delta: number) => {
        const current = cart[type] || 0;
        const newVal = Math.max(0, current + delta);
        setCart({ ...cart, [type]: newVal });
    };

    const cartTotal = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);

    const handleConfirmBooking = async () => {
        const canvas = canvasRef.current;
        const signatureUrl = canvas?.toDataURL();
        const groupId = Math.random().toString(36).substr(2, 9);
        const newReservations: BikeReservation[] = [];

        Object.entries(cart).forEach(([type, count]) => {
            const qty = count as number;
            for(let i=0; i<qty; i++) {
                newReservations.push({
                    id: Math.random().toString(36).substr(2, 9),
                    groupId,
                    guestName: guestDetails.name,
                    roomNumber: guestDetails.room,
                    bikeType: type as BikeType,
                    amount: 1,
                    startDate: guestDetails.start,
                    endDate: guestDetails.end,
                    status: 'Pending',
                    termsAccepted: true,
                    signatureUrl,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.name
                });
            }
        });

        for (const res of newReservations) {
            await api.saveBikeReservation(res);
        }
        
        setReservations([...newReservations, ...reservations]);
        setFlowStep(4);
        setTimeout(handleExitFlow, 5000);
    };

    // --- ASSIGNMENT & RETURN ---
    const handleAssignAsset = async (reservation: BikeReservation, assetId: string) => {
        const updatedRes: BikeReservation = {
            ...reservation,
            status: 'Active',
            bikeId: assetId,
            startTime: new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'})
        };
        await api.saveBikeReservation(updatedRes);
        setReservations(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
        setAssignmentTarget(null);
        onShowToast(`Fiets ${assetId} toegewezen aan ${reservation.guestName}`);
    };

    const handleConfirmReturn = async () => {
        if (!selectedReturnRes) return;
        const updatedRes: BikeReservation = {
            ...selectedReturnRes,
            status: 'Completed',
            endTime: new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}),
            damageReport: isDamageReported ? damageNotes : undefined
        };

        if (isDamageReported && updatedRes.bikeId) {
            const updatedSettings = {
                ...settings,
                inMaintenance: [...settings.inMaintenance, updatedRes.bikeId],
                maintenanceReasons: { ...settings.maintenanceReasons, [updatedRes.bikeId]: damageNotes }
            };
            setSettings(updatedSettings);
            await api.saveBikeSettings(updatedSettings);
        }

        await api.saveBikeReservation(updatedRes);
        setReservations(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
        setIsReturnModalOpen(false);
        onShowToast("Fiets retour gemeld.");
    };

    // --- RENDER HELPERS ---
    const renderGuestFlow = () => (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            {/* Header */}
            <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
                <button onClick={handleExitFlow} className="flex items-center gap-2 text-slate-400 font-bold"><X size={24}/> Annuleren</button>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-2 w-12 rounded-full transition-colors ${flowStep >= s ? 'bg-teal-600' : 'bg-slate-200'}`}></div>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                <div className="max-w-5xl w-full">
                    
                    {flowStep === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-4xl font-bold text-slate-900 text-center mb-8">Wat wilt u huren?</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {BIKE_TYPES.map(type => {
                                    // Guest flow always assumes "Today" for availability check
                                    const today = new Date().toISOString().split('T')[0];
                                    const stats = getStats(type.id, today);
                                    const count = cart[type.id];
                                    const price = PRICES[type.id];
                                    return (
                                        <div key={type.id} className={`bg-white p-8 rounded-3xl border-2 transition-all flex flex-col items-center shadow-sm relative overflow-hidden ${count > 0 ? 'border-teal-500 ring-4 ring-teal-50' : 'border-slate-200'}`}>
                                            <div className="absolute top-0 right-0 bg-slate-100 px-4 py-2 rounded-bl-2xl font-bold text-slate-700">
                                                €{price.toFixed(2)}
                                            </div>
                                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${type.color}`}>
                                                <type.icon size={48} />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">{type.label}</h3>
                                            <p className={`text-sm font-bold mb-6 ${stats.available > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {stats.available} Beschikbaar
                                            </p>
                                            
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => updateCart(type.id, -1)}
                                                    disabled={count === 0}
                                                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus size={24}/>
                                                </button>
                                                <span className="text-3xl font-bold text-slate-900 w-8 text-center">{count}</span>
                                                <button 
                                                    onClick={() => updateCart(type.id, 1)}
                                                    disabled={count >= stats.available}
                                                    className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Plus size={24}/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-center pt-8">
                                <button 
                                    onClick={() => setFlowStep(2)}
                                    disabled={cartTotal === 0}
                                    className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
                                >
                                    Volgende Stap <ChevronRight size={24}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {flowStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 max-w-lg mx-auto">
                            <h2 className="text-3xl font-bold text-slate-900 text-center">Uw Gegevens</h2>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 border-b border-slate-100 pb-2">Geselecteerd</h4>
                                {Object.entries(cart).map(([type, count]) => (count as number) > 0 && (
                                    <div key={type} className="flex justify-between items-center mb-2 last:mb-0 font-bold text-slate-700">
                                        <span>{BIKE_TYPES.find(t=>t.id===type)?.label}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400">€ {PRICES[type as BikeType]} p/st</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded text-sm">x{count as number}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Naam Gast</label>
                                    <input 
                                        type="text" 
                                        className="w-full text-lg p-5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                                        placeholder="Bijv. Fam. Jansen"
                                        value={guestDetails.name}
                                        onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Kamernummer</label>
                                    <input 
                                        type="text" 
                                        className="w-full text-lg p-5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                                        placeholder="Bijv. 104"
                                        value={guestDetails.room}
                                        onChange={(e) => setGuestDetails({ ...guestDetails, room: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-8">
                                <button onClick={() => setFlowStep(1)} className="flex-1 py-5 rounded-2xl font-bold text-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50">Terug</button>
                                <button 
                                    onClick={() => setFlowStep(3)}
                                    disabled={!guestDetails.name || !guestDetails.room}
                                    className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Naar Ondertekenen
                                </button>
                            </div>
                        </div>
                    )}

                    {flowStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 h-full flex flex-col">
                            <h2 className="text-3xl font-bold text-slate-900 text-center">Akkoord & Tekenen</h2>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                {/* Contract Preview */}
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
                                    <div className="bg-slate-50 p-6 border-b border-slate-100">
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText size={20}/> Huurovereenkomst</h3>
                                        <p className="text-xs text-slate-500 mt-1">Lees de voorwaarden zorgvuldig door.</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-8 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                        <h4 className="font-bold text-slate-900 mb-2">Algemene Voorwaarden Fietsverhuur Sanadome</h4>
                                        {settings.termsAndConditions || "Geen voorwaarden ingesteld."}
                                    </div>
                                </div>

                                {/* Signature Pad */}
                                <div className="flex flex-col h-[600px]">
                                    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden relative">
                                        <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-900 flex items-center gap-2"><PenTool size={20}/> Handtekening</h3>
                                            <button 
                                                onClick={() => { const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0,1000,1000); setIsSigned(false); }} 
                                                className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1"
                                            >
                                                <RefreshCw size={12}/> Wissen
                                            </button>
                                        </div>
                                        <div className="flex-1 bg-slate-50 relative touch-none cursor-crosshair">
                                            <canvas ref={canvasRef} className="w-full h-full"/>
                                            {!isSigned && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><span className="text-3xl font-bold text-slate-400">Teken hier</span></div>}
                                        </div>
                                        <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-400 text-center">
                                            Door te ondertekenen gaat u akkoord met de algemene voorwaarden.
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-6">
                                        <button onClick={() => setFlowStep(2)} className="px-8 py-4 rounded-2xl font-bold text-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50">Terug</button>
                                        <button 
                                            onClick={handleConfirmBooking} 
                                            disabled={!isSigned} 
                                            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-xl shadow-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
                                        >
                                            Bevestigen <CheckCircle2 size={24}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {flowStep === 4 && (
                        <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 h-full">
                            <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-lg"><Check size={64} strokeWidth={4}/></div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-4">Bedankt!</h2>
                            <p className="text-xl text-slate-500 max-w-md mx-auto">
                                Uw reservering is succesvol verwerkt. <br/>
                                <span className="font-bold text-slate-800">Een medewerker overhandigt u direct de sleutels.</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="space-y-10 animate-in fade-in pb-20">
            {/* Date Navigation */}
            <div className="flex justify-center items-center gap-6 mb-6">
                <button onClick={() => handleDateChange(-1)} className="p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-3 text-xl font-bold text-slate-900 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <Calendar size={20} className="text-teal-600" />
                    {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <button onClick={() => handleDateChange(1)} className="p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600">
                    <ChevronRight size={24} />
                </button>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-10 h-10 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer"
                />
            </div>

            {/* Inventory Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BIKE_TYPES.map(type => {
                    const stats = getStats(type.id, selectedDate);
                    const percentage = stats.total > 0 ? (stats.available / stats.total) * 100 : 0;
                    return (
                        <div key={type.id} onClick={() => setSelectedCategoryForDetail(type.id)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type.color}`}><type.icon size={24} /></div>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-slate-900">{stats.available}</span>
                                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Beschikbaar</span>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg mb-2">{type.label}</h3>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                                <div className={`h-full rounded-full transition-all duration-500 ${percentage > 50 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 font-medium">
                                <span>Totaal: {stats.total}</span>
                                {stats.maintenance > 0 && <span className="text-amber-600 flex items-center gap-1"><Wrench size={10}/> {stats.maintenance}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* PENDING ASSIGNMENT */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2"><Key size={20}/> Wacht op Uitgifte ({reservations.filter(r => r.status === 'Pending').length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {reservations.filter(r => r.status === 'Pending').map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">{BIKE_TYPES.find(t=>t.id===res.bikeType)?.label}</span>
                                <span className="text-xs font-mono text-slate-400">#{res.roomNumber}</span>
                            </div>
                            <div className="font-bold text-slate-900 mb-1">{res.guestName}</div>
                            <div className="text-xs text-slate-500 mb-4">{res.startDate} - {res.endDate}</div>
                            <button onClick={() => setAssignmentTarget(res)} className="mt-auto w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                                Toewijzen & Uitgeven
                            </button>
                        </div>
                    ))}
                    {reservations.filter(r => r.status === 'Pending').length === 0 && (
                        <p className="text-sm text-amber-700 italic col-span-full">Geen openstaande aanvragen.</p>
                    )}
                </div>
            </div>

            {/* ACTIVE */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Clock className="text-teal-600"/> Nu Verhuurd (Op geselecteerde datum)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {reservations.filter(r => 
                        r.status === 'Active' && 
                        isDateOverlapping(selectedDate, r.startDate, r.endDate)
                    ).map(res => {
                        const needsSignature = !res.signatureUrl && res.termsAccepted;
                        return (
                            <div key={res.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                                {/* Ticket Top */}
                                <div className="bg-slate-900 text-white p-4 flex justify-between items-center relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm backdrop-blur-sm border border-white/20">
                                            {res.bikeId}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{BIKE_TYPES.find(t=>t.id===res.bikeType)?.label}</div>
                                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Kamer {res.roomNumber}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400 uppercase">Gestart</div>
                                        <div className="font-mono font-bold">{res.startTime || '-'}</div>
                                    </div>
                                    {/* Perforation effect */}
                                    <div className="absolute -bottom-2 left-0 w-full h-2 bg-white" style={{maskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 5px, black 6px)', maskSize: '20px 10px', maskRepeat: 'repeat-x'}}></div>
                                </div>
                                
                                {/* Ticket Body */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Gast</div>
                                                <div className="text-lg font-bold text-slate-900 truncate">{res.guestName}</div>
                                            </div>
                                            {needsSignature && (
                                                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                                    <PenTool size={10}/> Handtekening Vereist
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
                                        {needsSignature ? (
                                            <button
                                                onClick={() => { setSignatureTarget(res); setIsSignatureModalOpen(true); }}
                                                className="flex-1 bg-orange-50 text-orange-700 hover:bg-orange-100 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                                            >
                                                Laat Tekenen
                                            </button>
                                        ) : (
                                            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                € {PRICES[res.bikeType].toFixed(2)}
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => { setSelectedReturnRes(res); setIsReturnModalOpen(true); }} 
                                            className="text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wide flex items-center gap-1 hover:underline"
                                        >
                                            <CheckCircle2 size={14}/> Retourneren
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderArchive = () => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in flex flex-col h-full">
            <div className="flex-1 overflow-auto p-0">
                <div className="divide-y divide-slate-100">
                    {reservations.filter(r => r.status === 'Completed' || r.status === 'Cancelled').map(res => (
                        <div key={res.id} onClick={() => setSelectedReservationForDetail(res)} className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${res.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {res.status === 'Completed' ? <Check size={16}/> : <X size={16}/>}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{res.guestName}</div>
                                    <div className="text-xs text-slate-500">{res.startDate} • {res.bikeId || 'Geen ID'}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                {res.damageReport && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded mr-2"><AlertTriangle size={10}/> Schade</span>}
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 inline-block"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Detail Sidebar for Archive Item */}
            {selectedReservationForDetail && (
                <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right">
                    <button onClick={() => setSelectedReservationForDetail(null)} className="mb-6 text-slate-400 hover:text-slate-600"><X/></button>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedReservationForDetail.guestName}</h3>
                    <p className="text-slate-500 text-sm mb-6">Kamer {selectedReservationForDetail.roomNumber}</p>
                    
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Fiets</div>
                            <div className="font-bold text-slate-900">{selectedReservationForDetail.bikeId}</div>
                            <div className="text-xs text-slate-500">{BIKE_TYPES.find(t=>t.id===selectedReservationForDetail?.bikeType)?.label}</div>
                        </div>
                        
                        {selectedReservationForDetail.signatureUrl && (
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Handtekening</div>
                                <div className="border border-slate-200 rounded-xl p-2 bg-white">
                                    <img src={selectedReservationForDetail.signatureUrl} className="w-full h-32 object-contain"/>
                                </div>
                            </div>
                        )}

                        {selectedReservationForDetail.damageReport && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                                <div className="text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Schade Rapport</div>
                                <p className="text-sm text-red-900">{selectedReservationForDetail.damageReport}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    // --- MAIN RENDER ---
    if (view === 'guest-flow') return renderGuestFlow();

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Bike className="text-teal-600" size={32} /> Fietsverhuur
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Beheer verhuur, voorraad en contracten.</p>
                </div>
                {view === 'dashboard' && (
                    <div className="flex gap-3">
                        <button onClick={() => { 
                            setManualForm({ 
                                guestName: '', 
                                roomNumber: '', 
                                startDate: selectedDate, // Init with dashboard date
                                endDate: selectedDate,
                                rows: [{ type: 'City Bike Men', assetId: '' }] 
                            }); 
                            setIsManualBookingOpen(true); 
                        }} className="bg-white border border-slate-200 text-slate-600 hover:text-slate-900 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-3 hover:-translate-y-0.5 transition-all">
                            <PenTool size={20}/> Handmatige Boeking
                        </button>
                        <button onClick={handleStartFlow} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-3 hover:-translate-y-0.5 transition-all">
                            <Plus size={20}/> Start Nieuwe Verhuur
                        </button>
                    </div>
                )}
            </div>

            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button onClick={() => setView('dashboard')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${view === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><LayoutDashboard size={18}/> Dashboard</button>
                {isManager && <button onClick={() => setView('settings')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${view === 'settings' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Settings size={18}/> Beheer & Voorraad</button>}
                <button onClick={() => setView('archive')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${view === 'archive' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><History size={18}/> Historie</button>
            </div>

            {view === 'dashboard' && renderDashboard()}
            {view === 'archive' && renderArchive()}
            
            {/* SETTINGS VIEW (Simplified for managers) */}
            {view === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><FileText className="text-teal-600"/> Algemene Voorwaarden</h3>
                        <textarea className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none resize-none" value={settings.termsAndConditions} onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })} />
                    </div>
                    <div className="flex justify-end"><button onClick={async () => { await api.saveBikeSettings(settings); onShowToast("Opgeslagen"); setView('dashboard'); }} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 flex items-center gap-2"><Save size={20}/> Opslaan</button></div>
                </div>
            )}

            {/* MANUAL BOOKING MODAL */}
            <Modal isOpen={isManualBookingOpen} onClose={() => { setIsManualBookingOpen(false); }} title="Handmatige Boeking">
                <form onSubmit={handleManualBooking} className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                        Deze optie blokkeert de fietsen. Gebruik dit voor telefonische reserveringen of boekingen via de mail.
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gast Naam</label>
                            <input type="text" required className="w-full p-3 border rounded-xl" value={manualForm.guestName} onChange={e => setManualForm({...manualForm, guestName: e.target.value})} placeholder="Naam gast..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kamer</label>
                            <input type="text" required className="w-full p-3 border rounded-xl" value={manualForm.roomNumber} onChange={e => setManualForm({...manualForm, roomNumber: e.target.value})} placeholder="Kamernummer..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Startdatum</label>
                            <input type="date" required className="w-full p-3 border rounded-xl" value={manualForm.startDate} onChange={e => setManualForm({...manualForm, startDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Einddatum</label>
                            <input type="date" required className="w-full p-3 border rounded-xl" value={manualForm.endDate} onChange={e => setManualForm({...manualForm, endDate: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Fietsen Selecteren</label>
                        {manualForm.rows.map((row, index) => {
                            // Filter assets based on type AND availability (not rented or in maintenance)
                            const availableAssets = BIKE_ASSETS.filter(a => {
                                if (a.type !== row.type) return false;
                                // Need to check availability against the SELECTED dates in the form, not just dashboard date
                                const status = getBikeStatus(a.id, manualForm.startDate);
                                return status === 'Available';
                            });

                            return (
                                <div key={index} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <div className="flex-1">
                                        <select 
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                                            value={row.type}
                                            onChange={(e) => handleManualRowChange(index, 'type', e.target.value)}
                                        >
                                            {BIKE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <select 
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                                            value={row.assetId}
                                            onChange={(e) => handleManualRowChange(index, 'assetId', e.target.value)}
                                        >
                                            <option value="">Wijs later toe (Pending)</option>
                                            {availableAssets.map(a => <option key={a.id} value={a.id}>{a.id} (Beschikbaar)</option>)}
                                        </select>
                                    </div>
                                    {manualForm.rows.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveManualRow(index)}
                                            className="text-slate-400 hover:text-red-500 p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        
                        <button 
                            type="button" 
                            onClick={handleAddManualRow}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                            <Plus size={14} /> Nog een fiets toevoegen
                        </button>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800">
                        Boeking Toevoegen
                    </button>
                </form>
            </Modal>

            {/* ASSIGNMENT MODAL */}
            <Modal isOpen={!!assignmentTarget} onClose={() => setAssignmentTarget(null)} title="Fiets Toewijzen">
                <div className="p-2">
                    <p className="mb-4 text-sm text-slate-500">Beschikbare fietsen voor <strong>{assignmentTarget?.bikeType}</strong>:</p>
                    <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                        {BIKE_ASSETS.filter(b => b.type === assignmentTarget?.bikeType).map(asset => {
                            // Check against the reservation's specific date
                            const status = getBikeStatus(asset.id, assignmentTarget?.startDate || selectedDate);
                            if (status !== 'Available') return null;
                            return (
                                <button key={asset.id} onClick={() => assignmentTarget && handleAssignAsset(assignmentTarget, asset.id)} className="p-3 bg-green-50 border border-green-200 text-green-700 font-bold rounded-xl hover:bg-green-100 transition-colors">
                                    {asset.id}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* SIGNATURE MODAL (STANDALONE) */}
            <Modal 
                isOpen={isSignatureModalOpen} 
                onClose={() => { setIsSignatureModalOpen(false); setSignatureTarget(null); setIsSigned(false); }} 
                title="Handtekening Vereist"
            >
                <div className="h-[400px] flex flex-col">
                    <div className="mb-4 bg-orange-50 border border-orange-100 p-4 rounded-xl text-sm text-orange-800">
                        Deze reservering heeft nog geen handtekening. Laat de gast hieronder tekenen voor akkoord met de voorwaarden.
                    </div>
                    
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl relative touch-none cursor-crosshair overflow-hidden mb-4">
                        <canvas ref={canvasRef} className="w-full h-full"/>
                        {!isSigned && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><span className="text-3xl font-bold text-slate-400">Teken hier</span></div>}
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => { const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0,1000,1000); setIsSigned(false); }}
                            className="px-4 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50"
                        >
                            Wissen
                        </button>
                        <button 
                            onClick={handleSaveStandaloneSignature}
                            disabled={!isSigned}
                            className="flex-1 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg"
                        >
                            Opslaan
                        </button>
                    </div>
                </div>
            </Modal>

            {/* DETAIL / ASSET STATUS MODAL */}
            <Modal isOpen={!!selectedCategoryForDetail} onClose={() => setSelectedCategoryForDetail(null)} title="Status Overzicht">
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {BIKE_ASSETS.filter(b => b.type === selectedCategoryForDetail).map(asset => {
                            const status = getBikeStatus(asset.id, selectedDate);
                            const res = getActiveReservationForBike(asset.id, selectedDate);
                            return (
                                <div key={asset.id} className={`p-4 rounded-xl border-2 flex flex-col justify-between h-32 relative group ${status === 'Rented' ? 'border-red-200 bg-red-50' : status === 'Maintenance' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-lg text-slate-900">{asset.id}</span>
                                        <div className={`w-3 h-3 rounded-full ${status === 'Rented' ? 'bg-red-500' : status === 'Maintenance' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                                    </div>
                                    
                                    {status === 'Rented' && res && <div className="text-xs text-red-800 truncate">{res.guestName}<br/>#{res.roomNumber}</div>}
                                    {status === 'Maintenance' && <div className="text-xs text-amber-800 italic">{settings.maintenanceReasons?.[asset.id] || 'Onderhoud'}</div>}
                                    {status === 'Available' && <div className="text-xs text-green-800 font-bold">Beschikbaar</div>}

                                    {/* Maintenance Action Overlay */}
                                    {status !== 'Rented' && (
                                        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                            <button 
                                                onClick={() => {
                                                    if(status === 'Available') { setMaintenanceTargetId(asset.id); } 
                                                    else { toggleMaintenance(asset.id); }
                                                }}
                                                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm"
                                            >
                                                {status === 'Available' ? 'Naar Onderhoud' : 'Vrijgeven'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* MAINTENANCE REASON MODAL */}
            <Modal isOpen={!!maintenanceTargetId} onClose={() => { setMaintenanceTargetId(null); setMaintenanceReason(''); }} title="Reden voor onderhoud">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Waarom gaat fiets <strong>{maintenanceTargetId}</strong> in onderhoud?</p>
                    <textarea 
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" 
                        rows={3} 
                        placeholder="Bijv. Lekke band, ketting eraf..." 
                        value={maintenanceReason} 
                        onChange={e => setMaintenanceReason(e.target.value)}
                        autoFocus
                    />
                    <button 
                        onClick={() => maintenanceTargetId && toggleMaintenance(maintenanceTargetId, maintenanceReason)}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
                    >
                        Bevestigen
                    </button>
                </div>
            </Modal>

            {/* RETURN MODAL */}
            <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Retour Melden">
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-900">{selectedReturnRes?.guestName}</h4>
                        <div className="text-sm text-slate-500 mt-1">Fiets: <strong>{selectedReturnRes?.bikeId}</strong></div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setIsDamageReported(false)} className={`flex-1 py-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${!isDamageReported ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200'}`}><CheckCircle2/> In Orde</button>
                        <button onClick={() => setIsDamageReported(true)} className={`flex-1 py-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${isDamageReported ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200'}`}><AlertTriangle/> Schade</button>
                    </div>
                    {isDamageReported && <textarea className="w-full p-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Omschrijving schade..." value={damageNotes} onChange={e => setDamageNotes(e.target.value)} />}
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Annuleren</button>
                        <button onClick={handleConfirmReturn} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">Bevestigen</button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default BikeRentalPage;
