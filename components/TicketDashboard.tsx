
import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Search, Filter, CheckCircle2, Circle, Clock, AlertTriangle, MessageSquare, ChevronRight, RefreshCw, Lightbulb, Bug, Wrench, MapPin, Send, Plus, User, Paperclip, Lock, Globe, Calendar, Tag, X, Trash2, Sparkles, ArrowLeft, Save, Check } from 'lucide-react';
import { Ticket as TicketType, TicketStatus, TicketPriority, TicketType as TT, Employee, Notification, ViewState, TicketMessage } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface TicketDashboardProps {
    onShowToast: (message: string) => void;
    currentUser?: Employee;
    onAddNotification?: (notification: Notification) => void;
    onOpenFeedbackModal: () => void; // Kept for external triggers if needed
}

const TicketDashboard: React.FC<TicketDashboardProps> = ({ onShowToast, currentUser, onAddNotification, onOpenFeedbackModal }) => {
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Selection State
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Creation Form State
    const [newTicket, setNewTicket] = useState({
        title: '',
        description: '',
        type: 'Bug' as TT,
        priority: 'Medium' as TicketPriority,
        page: ''
    });

    // AI Assist State
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    // Filter State
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Interaction State
    const [replyContent, setReplyContent] = useState('');
    const [isInternalNote, setIsInternalNote] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const isManager = hasPermission(currentUser || null, 'MANAGE_TICKETS');

    useEffect(() => {
        loadTickets();
    }, [currentUser]);

    // Scroll to bottom of chat when selected ticket changes or messages update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedTicketId, tickets]);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const data = await api.getTickets();
            let sorted = data.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            
            // If not a manager, filter to show ONLY own tickets
            if (!isManager && currentUser) {
                sorted = sorted.filter(t => t.submittedById === currentUser.id);
            }

            setTickets(sorted);
        } catch (e) {
            console.error("Error loading tickets", e);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    // --- ACTIONS ---

    const handleStartCreate = () => {
        setSelectedTicketId(null);
        setIsCreating(true);
        setNewTicket({
            title: '',
            description: '',
            type: 'Bug',
            priority: 'Medium',
            page: 'Dashboard' // Default, user can edit
        });
        setAiSuggestion(null);
    };

    const handleCancelCreate = () => {
        setIsCreating(false);
        setAiSuggestion(null);
    };

    const handleAiGenerate = async () => {
        if (!newTicket.description.trim()) {
            onShowToast("Vul eerst een korte omschrijving in.");
            return;
        }
        setIsAiGenerating(true);
        
        // Simulate AI Latency
        await new Promise(r => setTimeout(r, 1500));

        let suggestion = "";
        const original = newTicket.description;

        if (newTicket.type === 'Bug') {
            suggestion = `**Probleem:**\n${original}\n\n**Stappen om te reproduceren:**\n1. Ga naar [Pagina]\n2. Voer actie uit...\n3. Fout treedt op.\n\n**Verwacht resultaat:**\nHet systeem zou moeten werken zonder foutmelding.\n\n**Technische Context:**\nBrowser: Chrome / OS: Windows`;
        } else if (newTicket.type === 'Idea') {
            suggestion = `**Voorstel:**\n${original}\n\n**Waarom is dit nodig?**\nDit zou de efficiëntie verbeteren doordat...\n\n**Voorgestelde oplossing:**\nImplementeer een functie die...`;
        } else {
            suggestion = `**Omschrijving:**\n${original}\n\n**Details:**\n- Locatie: ${newTicket.page || 'Onbekend'}\n- Prioriteit: ${newTicket.priority}\n\n**Gewenste Actie:**\nGraag z.s.m. oppakken.`;
        }

        setAiSuggestion(suggestion);
        setIsAiGenerating(false);
    };

    const handleApplyAiSuggestion = () => {
        if (aiSuggestion) {
            setNewTicket(prev => ({ ...prev, description: aiSuggestion }));
            setAiSuggestion(null);
            onShowToast("AI suggestie toegepast!");
        }
    };

    const handleSubmitTicket = async () => {
        if (!newTicket.title || !newTicket.description) return;
        if (!currentUser) return;

        const ticket: TicketType = {
            id: Math.random().toString(36).substr(2, 9),
            title: newTicket.title,
            description: newTicket.description,
            type: newTicket.type,
            priority: newTicket.priority,
            page: newTicket.page,
            status: 'Open',
            submittedBy: currentUser.name,
            submittedById: currentUser.id,
            submittedAt: new Date().toISOString(),
            messages: []
        };

        await api.saveTicket(ticket);
        
        // Refresh list and select new ticket
        await loadTickets();
        setIsCreating(false);
        setSelectedTicketId(ticket.id);
        onShowToast("Melding succesvol aangemaakt.");

        // Notify Managers (Mock)
        if (onAddNotification) {
             // Find managers logic would go here in real app
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !replyContent.trim() || !currentUser) return;

        const newMessage: TicketMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: currentUser.id,
            senderName: currentUser.name,
            content: replyContent,
            timestamp: new Date().toISOString(),
            type: isInternalNote ? 'internal' : 'public',
            avatar: currentUser.avatar
        };

        const updatedMessages = [...(selectedTicket.messages || []), newMessage];
        const updatedTicket = { ...selectedTicket, messages: updatedMessages };

        // Update Local State
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        setReplyContent('');
        
        // Save to DB
        await api.saveTicket(updatedTicket);

        // Notify logic (omitted for brevity)
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!selectedTicket || !currentUser) return;

        const systemMsg: TicketMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: 'system',
            senderName: 'System',
            content: `Status gewijzigd van ${selectedTicket.status} naar ${newStatus}`,
            timestamp: new Date().toISOString(),
            type: 'system'
        };

        const updatedTicket = { 
            ...selectedTicket, 
            status: newStatus,
            messages: [...(selectedTicket.messages || []), systemMsg],
            resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : selectedTicket.resolvedAt
        };

        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        await api.saveTicket(updatedTicket);
        onShowToast(`Status gewijzigd naar ${newStatus}`);
    };

    // --- HELPERS ---

    const filteredTickets = tickets.filter(t => {
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getPriorityColor = (p: TicketPriority) => {
        switch(p) {
            case 'High': return 'text-red-600 bg-red-50 border-red-200';
            case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'Low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-slate-500 bg-slate-50 border-slate-200';
        }
    };

    const getTypeIcon = (t: TT) => {
        switch(t) {
            case 'Bug': return <Bug size={14} className="text-red-500"/>;
            case 'Idea': return <Lightbulb size={14} className="text-amber-500"/>;
            case 'Fix': return <Wrench size={14} className="text-blue-500"/>;
            default: return <MessageSquare size={14} className="text-slate-500"/>;
        }
    };

    const renderMessage = (msg: TicketMessage) => {
        const isMe = msg.senderId === currentUser?.id;
        
        if (msg.type === 'system') {
            return (
                <div key={msg.id} className="flex justify-center my-4">
                    <div className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 flex items-center gap-2">
                        <RefreshCw size={10} /> {msg.content} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            );
        }

        if (msg.type === 'internal' && !isManager) return null;

        return (
            <div key={msg.id} className={`flex gap-3 mb-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                    msg.type === 'internal' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                    {msg.senderName.charAt(0)}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm border ${
                    msg.type === 'internal' 
                    ? 'bg-amber-50 border-amber-100 text-slate-800' 
                    : isMe 
                        ? 'bg-blue-600 text-white border-blue-700' 
                        : 'bg-white border-slate-200 text-slate-800'
                }`}>
                    <div className={`flex items-center gap-2 mb-1 text-[10px] font-bold uppercase tracking-wide ${
                        msg.type === 'internal' ? 'text-amber-700' : isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                        {msg.senderName}
                        {msg.type === 'internal' && <span className="flex items-center gap-1"><Lock size={8}/> Intern</span>}
                        <span className="opacity-50">• {new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
            </div>
        );
    };

    // --- RENDER LAYOUT ---

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
            <div className="flex flex-1 overflow-hidden max-w-[2400px] mx-auto w-full p-4 gap-4">
                
                {/* LEFT PANE: Ticket List */}
                <div className={`w-full md:w-1/3 lg:w-1/4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${selectedTicketId || isCreating ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <Ticket size={20} className="text-purple-600"/>
                                {isManager ? 'Service Desk' : 'Mijn Tickets'}
                            </h2>
                            <button onClick={loadTickets} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''}/>
                            </button>
                        </div>
                        
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Zoeken..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {['All', 'Open', 'In Progress', 'Resolved'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                                        filterStatus === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {status === 'All' ? 'Alles' : status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        <button 
                            onClick={handleStartCreate}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold text-sm hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 mb-2 group"
                        >
                            <Plus size={16} className="group-hover:scale-110 transition-transform" /> Nieuwe Melding
                        </button>

                        {filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id}
                                onClick={() => { setIsCreating(false); setSelectedTicketId(ticket.id); }}
                                className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                                    selectedTicketId === ticket.id 
                                    ? 'bg-purple-50 border-purple-200 shadow-sm ring-1 ring-purple-200' 
                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {new Date(ticket.submittedAt).toLocaleDateString('nl-NL', {day: 'numeric', month: 'short'})}
                                    </span>
                                </div>
                                <h3 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedTicketId === ticket.id ? 'text-purple-900' : 'text-slate-800'}`}>
                                    {ticket.title}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                    {ticket.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {ticket.submittedBy.charAt(0)}
                                        </div>
                                        {ticket.type === 'Bug' && <Bug size={12} className="text-red-400"/>}
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${
                                        ticket.status === 'Open' ? 'bg-blue-500' :
                                        ticket.status === 'In Progress' ? 'bg-amber-500' :
                                        'bg-green-500'
                                    }`}></div>
                                </div>
                            </div>
                        ))}
                        
                        {filteredTickets.length === 0 && (
                            <div className="text-center py-10 px-4">
                                <p className="text-slate-400 text-sm">Geen tickets gevonden.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Detail View OR Create Form */}
                <div className={`flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row overflow-hidden ${!selectedTicketId && !isCreating ? 'hidden md:flex' : 'flex'}`}>
                    
                    {isCreating ? (
                        /* CREATION FORM VIEW */
                        <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <button onClick={handleCancelCreate} className="md:hidden p-2 hover:bg-slate-50 rounded-full text-slate-500">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2 className="font-bold text-slate-900 text-lg">Nieuwe Melding</h2>
                                </div>
                                <button onClick={handleCancelCreate} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                                <div className="max-w-2xl mx-auto space-y-8">
                                    
                                    {/* Type Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Type Melding</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'Bug', icon: Bug, label: 'Bug / Fout' },
                                                { id: 'Idea', icon: Lightbulb, label: 'Idee / Feature' },
                                                { id: 'Fix', icon: Wrench, label: 'Aanpassing' },
                                            ].map(type => (
                                                <button 
                                                    key={type.id}
                                                    onClick={() => setNewTicket({ ...newTicket, type: type.id as TT })}
                                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                                        newTicket.type === type.id 
                                                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                                                        : 'border-slate-100 bg-white text-slate-500 hover:border-purple-200'
                                                    }`}
                                                >
                                                    <type.icon size={24} />
                                                    <span className="text-xs font-bold">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Onderwerp</label>
                                            <input 
                                                type="text" 
                                                value={newTicket.title}
                                                onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                                placeholder="Korte samenvatting..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pagina / Context</label>
                                            <input 
                                                type="text" 
                                                value={newTicket.page}
                                                onChange={e => setNewTicket({...newTicket, page: e.target.value})}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                                                placeholder="Waar gebeurt dit?"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioriteit</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            {['Low', 'Medium', 'High'].map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setNewTicket({ ...newTicket, priority: p as TicketPriority })}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                                        newTicket.priority === p 
                                                        ? 'bg-white text-slate-900 shadow-sm' 
                                                        : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    {p === 'Low' && 'Laag'}
                                                    {p === 'Medium' && 'Normaal'}
                                                    {p === 'High' && 'Hoog'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description with AI */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase">Omschrijving</label>
                                            <button 
                                                onClick={handleAiGenerate}
                                                disabled={isAiGenerating}
                                                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <Sparkles size={12} />
                                                {isAiGenerating ? 'Analyseren...' : 'Verbeteren met AI'}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <textarea 
                                                rows={6}
                                                value={newTicket.description}
                                                onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed"
                                                placeholder="Beschrijf het probleem of idee zo uitgebreid mogelijk..."
                                            />
                                            {aiSuggestion && (
                                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-purple-200 p-4 overflow-y-auto animate-in fade-in zoom-in-95">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                                            <Sparkles size={14} /> AI Suggestie
                                                        </h4>
                                                        <button onClick={() => setAiSuggestion(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                                    </div>
                                                    <div className="text-sm text-slate-700 whitespace-pre-wrap mb-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                                        {aiSuggestion}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={handleApplyAiSuggestion} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                                                            <Check size={14} /> Overnemen
                                                        </button>
                                                        <button onClick={() => setAiSuggestion(null)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                                                            Afwijzen
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-4">
                                        <button 
                                            onClick={handleSubmitTicket}
                                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                        >
                                            <Send size={18} /> Versturen
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ) : selectedTicket ? (
                        /* DETAIL VIEW */
                        <>
                            {/* CENTER: Conversation */}
                            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100">
                                
                                {/* Header */}
                                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setSelectedTicketId(null)} className="md:hidden p-2 hover:bg-slate-50 rounded-full text-slate-500">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div>
                                            <h2 className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">{selectedTicket.title}</h2>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">#{selectedTicket.id.slice(0,6)}</span>
                                                <span>•</span>
                                                <span className={`font-bold ${selectedTicket.status === 'Open' ? 'text-blue-600' : selectedTicket.status === 'Resolved' ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {selectedTicket.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isManager && selectedTicket.status !== 'Resolved' && (
                                            <button 
                                                onClick={() => handleStatusChange('Resolved')}
                                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                            >
                                                <CheckCircle2 size={14}/> Oplossen
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline / Chat Area */}
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                    {/* Original Request */}
                                    <div className="mb-8 pb-8 border-b border-slate-200/60">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                                {selectedTicket.submittedBy.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-slate-900">{selectedTicket.submittedBy}</span>
                                                    <span className="text-xs text-slate-400">{new Date(selectedTicket.submittedAt).toLocaleString()}</span>
                                                </div>
                                                <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                    {selectedTicket.description}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="space-y-6">
                                        {selectedTicket.messages?.map(renderMessage)}
                                        <div ref={chatEndRef} />
                                    </div>
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white border-t border-slate-200">
                                    <div className="relative">
                                        {isManager && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <button 
                                                    onClick={() => setIsInternalNote(false)}
                                                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${!isInternalNote ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    <Globe size={12} className="inline mr-1"/> Publiek Antwoord
                                                </button>
                                                <button 
                                                    onClick={() => setIsInternalNote(true)}
                                                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isInternalNote ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    <Lock size={12} className="inline mr-1"/> Interne Notitie
                                                </button>
                                            </div>
                                        )}
                                        <textarea 
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder={isInternalNote ? "Schrijf een interne notitie..." : "Schrijf een reactie..."}
                                            className={`w-full p-4 pr-14 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-shadow resize-none shadow-sm ${
                                                isInternalNote ? 'bg-amber-50 border-amber-200 focus:ring-amber-400' : 'bg-white border-slate-200 focus:ring-blue-500'
                                            }`}
                                            rows={3}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={!replyContent.trim()}
                                            className="absolute bottom-3 right-3 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDEBAR: Properties */}
                            <div className="w-full md:w-72 bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto hidden lg:block">
                                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-6">Details</h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Status</label>
                                        {isManager ? (
                                            <select 
                                                value={selectedTicket.status}
                                                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                                            >
                                                <option value="Open">Open</option>
                                                <option value="In Progress">In Behandeling</option>
                                                <option value="Resolved">Opgelost</option>
                                                <option value="Closed">Gesloten</option>
                                            </select>
                                        ) : (
                                            <div className={`px-3 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 w-full border ${
                                                selectedTicket.status === 'Open' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                selectedTicket.status === 'In Progress' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                'bg-green-50 border-green-200 text-green-700'
                                            }`}>
                                                {selectedTicket.status}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Prioriteit</label>
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-white ${getPriorityColor(selectedTicket.priority)} bg-opacity-10`}>
                                            <AlertTriangle size={16} />
                                            <span className="text-sm font-bold">{selectedTicket.priority}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Categorie</label>
                                        <div className="flex items-center gap-2 text-slate-700 text-sm font-medium bg-white px-3 py-2 rounded-lg border border-slate-200">
                                            {getTypeIcon(selectedTicket.type)}
                                            {selectedTicket.type}
                                        </div>
                                    </div>

                                    {selectedTicket.page && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Locatie / Pagina</label>
                                            <div className="flex items-center gap-2 text-slate-700 text-sm font-medium bg-white px-3 py-2 rounded-lg border border-slate-200">
                                                <MapPin size={14} />
                                                <span className="truncate">{selectedTicket.page}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Melder</label>
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                                                {selectedTicket.submittedBy.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{selectedTicket.submittedBy}</div>
                                                <div className="text-xs text-slate-400">Medewerker</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold border border-slate-200 flex items-center gap-1">
                                                <Tag size={10}/> {selectedTicket.type}
                                            </span>
                                            {selectedTicket.priority === 'High' && (
                                                <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold border border-red-100">
                                                    Urgent
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Empty State Detail View */
                        <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm items-center justify-center text-center p-10">
                            <div className="max-w-sm">
                                <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Ticket size={48} className="text-purple-200" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Selecteer een ticket</h3>
                                <p className="text-slate-500">Klik op een ticket in de lijst links om de details en het gesprek te bekijken.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketDashboard;
