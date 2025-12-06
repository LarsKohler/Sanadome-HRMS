
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Bike, Calendar, User, FileText, CheckCircle2, X, Plus, 
    Settings, AlertCircle, RefreshCw, PenTool, Check, ChevronLeft, 
    ChevronRight, Save, History, LayoutDashboard, Zap, Clock, Wrench, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Employee, BikeReservation, BikeSettings, BikeType } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface BikeRentalPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
}

const BIKE_TYPES: { id: BikeType; label: string; icon: any; color: string }[] = [
    { id: 'City Bike Men', label: 'Herenfiets', icon: Bike, color: 'text-blue-600 bg-blue-100' },
    { id: 'City Bike Women', label: 'Damesfiets', icon: Bike, color: 'text-pink-600 bg-pink-100' },
    { id: 'E-Bike', label: 'E-Bike', icon: Zap, color: 'text-amber-600 bg-amber-100' }
];

const BikeRentalPage: React.FC<BikeRentalPageProps> = ({ currentUser, onShowToast }) => {
    const [view, setView] = useState<'dashboard' | 'guest-flow' | 'settings' | 'archive'>('dashboard');
    const [settings, setSettings] = useState<BikeSettings>({ 
        inventory: { 'City Bike Men': 0, 'City Bike Women': 0, 'E-Bike': 0 }, 
        inMaintenance: { 'City Bike Men': 0, 'City Bike Women': 0, 'E-Bike': 0 },
        termsAndConditions: '' 
    });
    const [reservations, setReservations] = useState<BikeReservation[]>([]);
    
    // Guest Flow State
    const [flowStep, setFlowStep] = useState(1);
    const [newReservation, setNewReservation] = useState<Partial<BikeReservation>>({
        amount: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    
    // Return & Damage State
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<BikeReservation | null>(null);
    const [isDamageReported, setIsDamageReported] = useState(false);
    const [damageNotes, setDamageNotes] = useState('');

    // Signature State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSigned, setIsSigned] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const sets = await api.getBikeSettings();
        const res = await api.getBikeReservations();
        setSettings({
            ...sets,
            inMaintenance: sets.inMaintenance || { 'City Bike Men': 0, 'City Bike Women': 0, 'E-Bike': 0 }
        });
        setReservations(res);
    };

    // --- FULLSCREEN LOGIC ---
    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch((err) => console.log(err));
        }
    };

    const exitFullscreen = () => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch((err) => console.log(err));
        }
    };

    // --- LOGIC ---
    
    // Calculate availability: Total - Maintenance - Active Rentals
    const getAvailability = (type: BikeType) => {
        const total = settings.inventory[type] || 0;
        const maintenance = settings.inMaintenance[type] || 0;
        
        const active = reservations.filter(r => 
            r.status === 'Active' && r.bikeType === type
        ).reduce((acc, r) => acc + r.amount, 0);

        return Math.max(0, total - maintenance - active);
    };

    const getElapsedTime = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) return `${Math.floor(hours/24)} dagen`;
        return `${hours}u ${minutes}m`;
    };

    // --- GUEST FLOW HANDLERS ---
    const handleStartFlow = () => {
        setNewReservation({
            amount: 1,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            termsAccepted: false
        });
        setFlowStep(1);
        setIsSigned(false);
        enterFullscreen(); // Trigger Fullscreen
        setView('guest-flow');
    };

    const handleExitFlow = () => {
        exitFullscreen(); // Exit Fullscreen
        setView('dashboard');
    };

    const handleSignatureClear = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setIsSigned(false);
        }
    };

    const handleSignatureEnd = () => {
        setIsSigned(true);
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High DPI scaling
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0f172a'; // Slate 900
        }

        let drawing = false;

        const start = (e: MouseEvent | TouchEvent) => {
            drawing = true;
            draw(e);
        };

        const end = () => {
            drawing = false;
            ctx?.beginPath(); // Reset path
            handleSignatureEnd();
        };

        const draw = (e: MouseEvent | TouchEvent) => {
            if (!drawing || !ctx) return;
            e.preventDefault(); // Prevent scrolling on touch
            
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

        // Cleanup
        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', end);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', end);
        }
    };

    // Init canvas when step 3 becomes active
    useEffect(() => {
        if (view === 'guest-flow' && flowStep === 3) {
            // Small timeout to allow render
            setTimeout(initCanvas, 100);
        }
    }, [view, flowStep]);

    const handleConfirmBooking = async () => {
        if (!newReservation.guestName || !newReservation.roomNumber || !isSigned) return;

        const canvas = canvasRef.current;
        const signatureUrl = canvas?.toDataURL();

        const reservation: BikeReservation = {
            id: Math.random().toString(36).substr(2, 9),
            guestName: newReservation.guestName,
            roomNumber: newReservation.roomNumber,
            bikeType: newReservation.bikeType as BikeType,
            amount: newReservation.amount || 1,
            startDate: newReservation.startDate!,
            endDate: newReservation.endDate!,
            startTime: new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}),
            status: 'Active',
            termsAccepted: true,
            signatureUrl,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name
        };

        await api.saveBikeReservation(reservation);
        setReservations([reservation, ...reservations]);
        setFlowStep(4); // Success screen
        
        // Auto return after 5 sec
        setTimeout(() => {
            handleExitFlow();
        }, 5000);
    };

    // --- RETURN & DAMAGE HANDLERS ---
    
    const handleOpenReturnModal = (reservation: BikeReservation) => {
        setSelectedReservation(reservation);
        setIsDamageReported(false);
        setDamageNotes('');
        setIsReturnModalOpen(true);
    };

    const handleConfirmReturn = async () => {
        if (!selectedReservation) return;

        const updatedRes: BikeReservation = {
            ...selectedReservation,
            status: 'Completed',
            endTime: new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}),
            damageReport: isDamageReported ? damageNotes : undefined
        };

        // If damage reported, increase maintenance count automatically
        if (isDamageReported) {
            const currentMaintenance = settings.inMaintenance[updatedRes.bikeType] || 0;
            const updatedSettings = {
                ...settings,
                inMaintenance: {
                    ...settings.inMaintenance,
                    [updatedRes.bikeType]: currentMaintenance + updatedRes.amount // Assume all damaged for safety, or prompt for amount
                }
            };
            setSettings(updatedSettings);
            await api.saveBikeSettings(updatedSettings);
            onShowToast(`Fiets gemarkeerd als defect. Voorraad bijgewerkt.`);
        }

        await api.saveBikeReservation(updatedRes);
        setReservations(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
        
        setIsReturnModalOpen(false);
        setSelectedReservation(null);
        onShowToast("Fiets succesvol retour gemeld.");
    };

    // --- SETTINGS HANDLERS ---
    const handleSaveSettings = async () => {
        await api.saveBikeSettings(settings);
        onShowToast("Instellingen en voorraad opgeslagen");
        setView('dashboard');
    };

    // --- VIEWS ---

    const renderDashboard = () => (
        <div className="space-y-10 animate-in fade-in">
            {/* Inventory Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BIKE_TYPES.map(type => {
                    const available = getAvailability(type.id);
                    const total = settings.inventory[type.id];
                    const maintenance = settings.inMaintenance[type.id] || 0;
                    const percentage = total > 0 ? (available / total) * 100 : 0;

                    return (
                        <div key={type.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type.color}`}>
                                    <type.icon size={24} />
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-slate-900">{available}</span>
                                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Beschikbaar</span>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-slate-900 text-lg mb-2">{type.label}</h3>
                            
                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between text-xs text-slate-500 font-medium">
                                <span>Totaal: {total}</span>
                                {maintenance > 0 && <span className="text-amber-600 flex items-center gap-1"><Wrench size={10}/> {maintenance} in onderhoud</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Active Rentals Grid */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Clock className="text-teal-600"/> Nu Verhuurd
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {reservations.filter(r => r.status === 'Active').map(res => {
                        const bikeConfig = BIKE_TYPES.find(t => t.id === res.bikeType);
                        
                        return (
                            <div key={res.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-teal-400 transition-all group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${bikeConfig?.color}`}>
                                            {bikeConfig && <bikeConfig.icon size={18}/>}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{res.bikeType}</h4>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{res.amount} stuks</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-400">#{res.roomNumber}</span>
                                </div>

                                <div className="mb-6">
                                    <div className="text-lg font-bold text-slate-800 mb-1">{res.guestName}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock size={12}/> Weg sinds: {res.startTime || '00:00'} ({getElapsedTime(res.createdAt)})
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleOpenReturnModal(res)}
                                    className="w-full py-3 bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 font-bold text-sm rounded-xl transition-colors border border-slate-200 hover:border-teal-200 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16}/> Retour Melden
                                </button>
                            </div>
                        );
                    })}
                    
                    {/* Empty State */}
                    {reservations.filter(r => r.status === 'Active').length === 0 && (
                        <div className="col-span-full py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Bike size={32}/>
                            </div>
                            <h3 className="font-bold text-slate-900">Alle fietsen zijn binnen</h3>
                            <p className="text-slate-500 text-sm mt-1">Er zijn momenteel geen actieve verhuringen.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderGuestFlow = () => (
        // z-[100] ensures it covers the sidebar (z-50) and topnav
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            {/* Kiosk Header */}
            <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
                <button onClick={handleExitFlow} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold">
                    <X size={24} /> Annuleren
                </button>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-2 w-12 rounded-full transition-colors ${flowStep >= s ? 'bg-teal-600' : 'bg-slate-200'}`}></div>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                <div className="max-w-4xl w-full">
                    
                    {/* STEP 1: SELECTION */}
                    {flowStep === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">Wat wilt u huren?</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {BIKE_TYPES.map(type => {
                                    const available = getAvailability(type.id);
                                    const isSelected = newReservation.bikeType === type.id;
                                    
                                    return (
                                        <div 
                                            key={type.id}
                                            onClick={() => available > 0 && setNewReservation({ ...newReservation, bikeType: type.id })}
                                            className={`
                                                relative p-8 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center
                                                ${available === 0 ? 'opacity-50 grayscale cursor-not-allowed border-slate-200' : 
                                                  isSelected ? 'border-teal-500 bg-teal-50 shadow-lg scale-105' : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-md'}
                                            `}
                                        >
                                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isSelected ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <type.icon size={40} />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">{type.label}</h3>
                                            <p className={`mt-2 font-bold ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {available > 0 ? `${available} Beschikbaar` : 'Niet Beschikbaar'}
                                            </p>
                                            {isSelected && <div className="absolute top-4 right-4 bg-teal-500 text-white p-1 rounded-full"><Check size={20}/></div>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-lg mx-auto shadow-sm">
                                <label className="block text-sm font-bold text-slate-500 uppercase mb-3 text-center">Aantal Fietsen</label>
                                <div className="flex items-center justify-center gap-6">
                                    <button 
                                        onClick={() => setNewReservation(prev => ({...prev, amount: Math.max(1, (prev.amount || 1) - 1)}))}
                                        className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-2xl hover:bg-slate-200"
                                    >-</button>
                                    <span className="text-3xl font-bold text-slate-900 w-12 text-center">{newReservation.amount}</span>
                                    <button 
                                        onClick={() => setNewReservation(prev => ({...prev, amount: Math.min(5, (prev.amount || 1) + 1)}))} // Cap at 5 for simplicity
                                        className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-2xl hover:bg-slate-200"
                                    >+</button>
                                </div>
                            </div>

                            <div className="text-center pt-8">
                                <button 
                                    onClick={() => setFlowStep(2)}
                                    disabled={!newReservation.bikeType}
                                    className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-slate-800 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
                                >
                                    Volgende Stap <ChevronRight size={24}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: DETAILS */}
                    {flowStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 max-w-lg mx-auto">
                            <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">Uw Gegevens</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Naam Gast</label>
                                    <input 
                                        type="text" 
                                        className="w-full text-lg p-5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                                        placeholder="Bijv. Fam. Jansen"
                                        value={newReservation.guestName || ''}
                                        onChange={(e) => setNewReservation({ ...newReservation, guestName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Kamernummer</label>
                                    <input 
                                        type="text" 
                                        className="w-full text-lg p-5 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none transition-colors"
                                        placeholder="Bijv. 104"
                                        value={newReservation.roomNumber || ''}
                                        onChange={(e) => setNewReservation({ ...newReservation, roomNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-8">
                                <button 
                                    onClick={() => setFlowStep(1)}
                                    className="flex-1 py-5 rounded-2xl font-bold text-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Terug
                                </button>
                                <button 
                                    onClick={() => setFlowStep(3)}
                                    disabled={!newReservation.guestName || !newReservation.roomNumber}
                                    className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    Naar Ondertekenen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SIGNATURE */}
                    {flowStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 h-full flex flex-col">
                            <h2 className="text-3xl font-bold text-slate-900 text-center">Akkoord & Tekenen</h2>
                            
                            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col md:flex-row">
                                {/* Terms Scroll Area */}
                                <div className="md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col">
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText size={20}/> Algemene Voorwaarden</h3>
                                    <div className="flex-1 overflow-y-auto bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap shadow-inner h-64 md:h-auto">
                                        {settings.termsAndConditions || "Geen voorwaarden ingesteld."}
                                    </div>
                                    <div className="mt-4 flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSigned ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                                            {isSigned && <Check size={14} strokeWidth={3}/>}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">Ik ga akkoord door te tekenen</p>
                                    </div>
                                </div>

                                {/* Signature Pad */}
                                <div className="md:w-1/2 p-8 flex flex-col">
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><PenTool size={20}/> Uw Handtekening</h3>
                                    <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl relative touch-none">
                                        <canvas 
                                            ref={canvasRef} 
                                            className="w-full h-full cursor-crosshair rounded-2xl"
                                        />
                                        {!isSigned && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                                <span className="text-2xl font-bold text-slate-400">Teken hier</span>
                                            </div>
                                        )}
                                        <button 
                                            onClick={handleSignatureClear}
                                            className="absolute top-4 right-4 p-2 bg-white shadow-sm rounded-lg text-slate-400 hover:text-red-500 border border-slate-200"
                                        >
                                            <RefreshCw size={16}/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 max-w-4xl mx-auto w-full">
                                <button 
                                    onClick={() => setFlowStep(2)}
                                    className="px-8 py-5 rounded-2xl font-bold text-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Terug
                                </button>
                                <button 
                                    onClick={handleConfirmBooking}
                                    disabled={!isSigned}
                                    className="flex-1 bg-green-600 text-white py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    Bevestigen & Afronden <CheckCircle2 size={24}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {flowStep === 4 && (
                        <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 h-full">
                            <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-lg">
                                <Check size={64} strokeWidth={4}/>
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-4">Veel Plezier!</h2>
                            <p className="text-xl text-slate-500">De fiets is gereserveerd voor {newReservation.guestName}.</p>
                            <p className="text-slate-400 mt-2 text-sm">Het scherm keert automatisch terug...</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
            {/* Inventory Management */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><LayoutDashboard className="text-teal-600"/> Voorraad Beheer</h3>
                <div className="grid grid-cols-1 gap-6">
                    {BIKE_TYPES.map(type => (
                        <div key={type.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm"><type.icon size={20}/></div>
                                <span className="font-bold text-slate-700">{type.label}</span>
                            </div>
                            
                            <div className="flex gap-8">
                                {/* Total Stock */}
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Totaal Bezit</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <button onClick={() => setSettings(s => ({ ...s, inventory: { ...s.inventory, [type.id]: Math.max(0, s.inventory[type.id] - 1) } }))} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold">-</button>
                                        <span className="text-lg font-bold text-slate-900 w-8">{settings.inventory[type.id]}</span>
                                        <button onClick={() => setSettings(s => ({ ...s, inventory: { ...s.inventory, [type.id]: s.inventory[type.id] + 1 } }))} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold">+</button>
                                    </div>
                                </div>

                                {/* In Maintenance */}
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1 justify-center"><Wrench size={10}/> In Reparatie</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <button onClick={() => setSettings(s => ({ ...s, inMaintenance: { ...s.inMaintenance, [type.id]: Math.max(0, (s.inMaintenance[type.id] || 0) - 1) } }))} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-slate-500">-</button>
                                        <span className="text-lg font-bold text-amber-600 w-8">{settings.inMaintenance[type.id] || 0}</span>
                                        <button onClick={() => setSettings(s => ({ ...s, inMaintenance: { ...s.inMaintenance, [type.id]: (s.inMaintenance[type.id] || 0) + 1 } }))} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-slate-500">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><FileText className="text-teal-600"/> Algemene Voorwaarden</h3>
                <p className="text-sm text-slate-500 mb-4">Deze tekst wordt getoond aan de gast op de tablet om te ondertekenen.</p>
                <textarea 
                    className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none leading-relaxed"
                    placeholder="Voer hier de algemene voorwaarden in..."
                    value={settings.termsAndConditions}
                    onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                />
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSaveSettings}
                    className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <Save size={20}/> Opslaan
                </button>
            </div>
        </div>
    );

    const renderArchive = () => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-4">Datum</th>
                        <th className="px-6 py-4">Gast</th>
                        <th className="px-6 py-4">Kamer</th>
                        <th className="px-6 py-4">Fiets</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {reservations.filter(r => r.status !== 'Active').map(res => (
                        <tr key={res.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-slate-500">{res.startDate}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{res.guestName}</td>
                            <td className="px-6 py-4 font-mono">{res.roomNumber}</td>
                            <td className="px-6 py-4 text-slate-600">{res.amount}x {BIKE_TYPES.find(t => t.id === res.bikeType)?.label}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1 ${res.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {res.damageReport && <AlertCircle size={10} />}
                                    {res.status === 'Completed' ? 'Afgerond' : 'Geannuleerd'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                {res.signatureUrl && (
                                    <button 
                                        className="text-teal-600 text-xs font-bold hover:underline"
                                        onClick={() => {
                                            const win = window.open();
                                            win?.document.write(`<h3>Handtekening ${res.guestName}</h3><img src="${res.signatureUrl}" />`);
                                            if(res.damageReport) win?.document.write(`<p style="color:red; font-weight:bold;">SCHADE RAPPORT: ${res.damageReport}</p>`);
                                        }}
                                    >
                                        Bekijk
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    if (view === 'guest-flow') {
        return renderGuestFlow();
    }

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Bike className="text-teal-600" size={32} />
                        Fietsverhuur
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Beheer verhuur, voorraad en contracten.</p>
                </div>
                
                {/* Primary Action Button */}
                {view === 'dashboard' && (
                    <button 
                        onClick={handleStartFlow}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-3 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={20}/> Start Nieuwe Verhuur
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button 
                    onClick={() => setView('dashboard')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${view === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutDashboard size={18}/> Dashboard
                </button>
                <button 
                    onClick={() => setView('settings')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${view === 'settings' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings size={18}/> Beheer & Voorraad
                </button>
                <button 
                    onClick={() => setView('archive')}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${view === 'archive' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <History size={18}/> Historie
                </button>
            </div>

            {view === 'dashboard' && renderDashboard()}
            {view === 'settings' && renderSettings()}
            {view === 'archive' && renderArchive()}

            {/* RETURN MODAL */}
            <Modal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                title="Fiets Retour Melden"
            >
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-900">{selectedReservation?.guestName}</h4>
                        <div className="text-sm text-slate-500 mt-1">Kamer {selectedReservation?.roomNumber} • {selectedReservation?.bikeType}</div>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 mb-3">Controleer op schade</h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsDamageReported(false)}
                                className={`flex-1 py-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${!isDamageReported ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500'}`}
                            >
                                <CheckCircle2 size={24}/> Geen Schade
                            </button>
                            <button 
                                onClick={() => setIsDamageReported(true)}
                                className={`flex-1 py-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${isDamageReported ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}
                            >
                                <AlertTriangle size={24}/> Schade / Defect
                            </button>
                        </div>
                    </div>

                    {isDamageReported && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Omschrijving Schade</label>
                            <textarea 
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                                placeholder="Wat is er kapot? (bv. lekke band, ketting eraf)"
                                value={damageNotes}
                                onChange={(e) => setDamageNotes(e.target.value)}
                                autoFocus
                            />
                            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                <Wrench size={12}/> Deze fiets wordt direct op 'In Reparatie' gezet.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Annuleren</button>
                        <button onClick={handleConfirmReturn} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg">Bevestigen & Sluiten</button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default BikeRentalPage;
