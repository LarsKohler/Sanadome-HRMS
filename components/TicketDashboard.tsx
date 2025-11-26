import React, { useState, useEffect } from 'react';
import { Ticket, Search, Filter, CheckCircle2, Circle, Clock, AlertTriangle, MessageSquare, ChevronRight, RefreshCw, AlertCircle, Lightbulb, Bug, Wrench } from 'lucide-react';
import { Ticket as TicketType, TicketStatus, TicketPriority, TicketType as TT } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface TicketDashboardProps {
    onShowToast: (message: string) => void;
}

const TicketDashboard: React.FC<TicketDashboardProps> = ({ onShowToast }) => {
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [adminNote, setAdminNote] = useState('');

    useEffect(() => {
        loadTickets();
        // Subscribe to realtime updates? If api supports it
    }, []);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const data = await api.getTickets();
            // Sort by date desc
            const sorted = data.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            setTickets(sorted);
        } catch (e) {
            console.error("Error loading tickets", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!selectedTicket) return;
        
        const updatedTicket: TicketType = {
            ...selectedTicket,
            status: newStatus,
            adminNotes: adminNote,
            resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : undefined
        };

        // Optimistic update
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        setSelectedTicket(updatedTicket);

        await api.saveTicket(updatedTicket);
        onShowToast(`Status gewijzigd naar ${newStatus}`);
    };

    const filteredTickets = tickets.filter(t => {
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              t.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getPriorityColor = (p: TicketPriority) => {
        switch(p) {
            case 'High': return 'text-red-600 bg-red-50 border-red-100';
            case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'Low': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    const getTypeIcon = (t: TT) => {
        switch(t) {
            case 'Bug': return <Bug size={16} className="text-red-500"/>;
            case 'Idea': return <Lightbulb size={16} className="text-amber-500"/>;
            case 'Fix': return <Wrench size={16} className="text-blue-500"/>;
            default: return <MessageSquare size={16} className="text-slate-500"/>;
        }
    };

    return (
        <div className="p-6 md:p-10 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 rounded-xl">
                            <Ticket className="text-purple-600" size={32} />
                        </div>
                        Ticket Systeem
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Beheer feedback, bugs en ideeën van medewerkers.</p>
                </div>
                
                <button 
                    onClick={loadTickets} 
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''}/>
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-50 text-blue-600"><Ticket size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{tickets.filter(t => t.status === 'Open').length}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Open Tickets</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-50 text-amber-600"><Clock size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{tickets.filter(t => t.status === 'In Progress').length}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">In Behandeling</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-red-50 text-red-600"><AlertTriangle size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{tickets.filter(t => t.type === 'Bug' && t.status !== 'Resolved').length}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Open Bugs</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-50 text-green-600"><CheckCircle2 size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{tickets.filter(t => t.status === 'Resolved').length}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Opgelost</div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Zoek op titel, omschrijving of medewerker..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as any)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${
                                filterStatus === status 
                                ? 'bg-slate-900 text-white border-slate-900' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {status === 'All' ? 'Alles' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tickets List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {filteredTickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setAdminNote(ticket.adminNotes || '');
                            }}
                            className="p-5 hover:bg-slate-50 cursor-pointer transition-colors group flex flex-col md:flex-row gap-4 md:items-center"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                        {getTypeIcon(ticket.type)} {ticket.type}
                                    </span>
                                    <span className="text-xs text-slate-400">• {new Date(ticket.submittedAt).toLocaleDateString('nl-NL')}</span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">{ticket.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-4 md:w-64 justify-between md:justify-end">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                                        {ticket.submittedBy.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{ticket.submittedBy}</span>
                                </div>
                                
                                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                                    ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                                    ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                                    ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {ticket.status === 'Open' && <Circle size={10} />}
                                    {ticket.status === 'In Progress' && <Clock size={10} />}
                                    {ticket.status === 'Resolved' && <CheckCircle2 size={10} />}
                                    {ticket.status}
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500"/>
                            </div>
                        </div>
                    ))}
                    {filteredTickets.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <Ticket size={48} className="mx-auto mb-4 opacity-20"/>
                            <p className="font-medium">Geen tickets gevonden.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedTicket}
                onClose={() => setSelectedTicket(null)}
                title="Ticket Details"
            >
                {selectedTicket && (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${getPriorityColor(selectedTicket.priority)}`}>
                                    {selectedTicket.priority} Priority
                                </span>
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {getTypeIcon(selectedTicket.type)} {selectedTicket.type}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{selectedTicket.title}</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <span>Inediend door <strong>{selectedTicket.submittedBy}</strong></span>
                                <span>•</span>
                                <span>{new Date(selectedTicket.submittedAt).toLocaleString('nl-NL')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed">
                            {selectedTicket.description}
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-bold text-slate-900 mb-3">Beheer</h3>
                            
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notities (Intern)</label>
                                <textarea 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    rows={3}
                                    placeholder="Notities voor jezelf of andere admins..."
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleStatusChange('In Progress')}
                                    disabled={selectedTicket.status === 'In Progress'}
                                    className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-sm transition-colors border border-amber-200 disabled:opacity-50"
                                >
                                    Zet 'In Behandeling'
                                </button>
                                <button 
                                    onClick={() => handleStatusChange('Resolved')}
                                    disabled={selectedTicket.status === 'Resolved'}
                                    className="py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg text-sm transition-colors border border-green-200 disabled:opacity-50"
                                >
                                    Markeer 'Opgelost'
                                </button>
                            </div>
                            {selectedTicket.status !== 'Closed' && (
                                <button 
                                    onClick={() => handleStatusChange('Closed')}
                                    className="w-full mt-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                                >
                                    Ticket sluiten (zonder oplossing)
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TicketDashboard;
