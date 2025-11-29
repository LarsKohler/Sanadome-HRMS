


import React, { useState, useEffect, useMemo } from 'react';
import { 
    UserPlus, Search, Briefcase, Plus, Filter, MoreHorizontal, 
    Calendar, CheckCircle, X, MessageSquare, Phone, Mail, 
    ChevronRight, MoveRight, Trash2, Edit2, Star,
    BarChart3, LayoutDashboard, Settings, Paperclip, Clock, Award, Sparkles, BrainCircuit
} from 'lucide-react';
import { Employee, Applicant, Vacancy, ApplicantStage, RecruitmentTimelineEvent, Notification, ViewState } from '../types';
import { MOCK_VACANCIES, MOCK_APPLICANTS } from '../utils/mockData';
import { Modal } from './Modal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface RecruitmentPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onHireCandidate: (applicant: Applicant) => void;
    onAddNotification?: (notification: Notification) => void;
}

const STAGES: ApplicantStage[] = ['New', 'Screening', 'Interview 1', 'Interview 2', 'Offer', 'Hired'];

// --- SUB-COMPONENTS FOR BETTER ORGANIZATION ---

const TimelineItem = ({ event }: { event: RecruitmentTimelineEvent }) => {
    const icons = {
        'StatusChange': <MoveRight size={14} />,
        'Note': <MessageSquare size={14} />,
        'Email': <Mail size={14} />,
        'Interview': <Calendar size={14} />,
        'Scorecard': <Star size={14} />
    };
    
    return (
        <div className="flex gap-4 pb-6 border-l border-slate-200 last:border-0 relative ml-2">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-slate-500">
                {icons[event.type] || <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 w-full">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-slate-900">{event.author}</span>
                    <span className="text-[10px] text-slate-400">{event.date}</span>
                </div>
                <p className="text-sm text-slate-600">{event.content}</p>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ currentUser, onShowToast, onHireCandidate, onAddNotification }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'jobs' | 'settings'>('dashboard');
    const [vacancies, setVacancies] = useState<Vacancy[]>(MOCK_VACANCIES);
    const [applicants, setApplicants] = useState<Applicant[]>(MOCK_APPLICANTS);
    
    // Filters & Search
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
    const [newVacancy, setNewVacancy] = useState<Partial<Vacancy>>({ title: '', department: 'Front Office', type: 'Full-Time', status: 'Open' });
    
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);

    // AI Simulation State
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- DASHBOARD METRICS ---
    const metrics = useMemo(() => {
        const total = applicants.length;
        const hired = applicants.filter(a => a.stage === 'Hired').length;
        const active = applicants.filter(a => a.stage !== 'Hired' && a.stage !== 'Rejected').length;
        
        // Simple mock funnel data
        const funnelData = STAGES.map(stage => ({
            name: stage,
            count: applicants.filter(a => a.stage === stage).length
        }));

        return { total, hired, active, funnelData };
    }, [applicants]);

    // Filter Logic
    const filteredApplicants = useMemo(() => {
        return applicants.filter(a => {
            const matchesVacancy = selectedVacancyId === 'All' || a.vacancyId === selectedVacancyId;
            const matchesSearch = 
                a.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                a.lastName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesVacancy && matchesSearch;
        });
    }, [applicants, selectedVacancyId, searchTerm]);

    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent, applicantId: string) => {
        e.dataTransfer.setData('applicantId', applicantId);
    };

    const handleDrop = (e: React.DragEvent, targetStage: ApplicantStage) => {
        const applicantId = e.dataTransfer.getData('applicantId');
        if (applicantId) {
            const currentApp = applicants.find(a => a.id === applicantId);
            if (!currentApp || currentApp.stage === targetStage) return;

            const updated = applicants.map(a => 
                a.id === applicantId ? { ...a, stage: targetStage } : a
            );
            setApplicants(updated);
            
            // Log Event
            logTimelineEvent(applicantId, 'StatusChange', `Fase gewijzigd van ${currentApp.stage} naar ${targetStage}`);

            // Notifications Triggers
            if (targetStage === 'Interview 1' || targetStage === 'Interview 2') {
                if (onAddNotification) {
                    onAddNotification({
                        id: Math.random().toString(),
                        recipientId: currentUser.id,
                        senderName: 'System',
                        type: 'Recruitment',
                        title: 'Kandidaat in Interview Fase',
                        message: `${currentApp.firstName} ${currentApp.lastName} is verplaatst naar ${targetStage}. Plan direct een gesprek in.`,
                        date: 'Zojuist',
                        read: false,
                        targetView: ViewState.RECRUITMENT
                    });
                }
            }

            if (targetStage === 'Offer') {
                onShowToast("Aanbod fase bereikt! Vergeet niet het contract klaar te zetten.");
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Actions
    const logTimelineEvent = (applicantId: string, type: RecruitmentTimelineEvent['type'], content: string) => {
        setApplicants(prev => prev.map(a => {
            if (a.id === applicantId) {
                const newEvent: RecruitmentTimelineEvent = {
                    id: Math.random().toString(),
                    type,
                    author: currentUser.name,
                    date: new Date().toLocaleString('nl-NL'),
                    content
                };
                return { ...a, timeline: [newEvent, ...a.timeline] };
            }
            return a;
        }));
    };

    const handleAddVacancy = (e: React.FormEvent) => {
        e.preventDefault();
        const vac: Vacancy = {
            id: Math.random().toString(36).substr(2, 9),
            title: newVacancy.title!,
            department: newVacancy.department!,
            type: newVacancy.type as any,
            status: 'Open',
            applicantsCount: 0,
            postedDate: new Date().toLocaleDateString('nl-NL'),
            salaryRange: '€2.300 - €2.800', // Default mock
            description: 'Nieuwe vacature.'
        };
        setVacancies([...vacancies, vac]);
        setIsVacancyModalOpen(false);
        onShowToast("Vacature succesvol gepubliceerd.");
    };

    const handleHire = (applicant: Applicant) => {
        if(confirm(`Weet je zeker dat je ${applicant.firstName} ${applicant.lastName} wilt aannemen? Dit start direct de onboarding.`)) {
            // Update status
            const updated = applicants.map(a => a.id === applicant.id ? { ...a, stage: 'Hired' as ApplicantStage } : a);
            setApplicants(updated);
            logTimelineEvent(applicant.id, 'StatusChange', 'Kandidaat Aangenomen 🎉');
            
            // Trigger actual hire process
            onHireCandidate(applicant);
            setIsApplicantModalOpen(false);
            onShowToast(`${applicant.firstName} is aangenomen! Onboarding gestart.`);
        }
    };

    const handleRunAI = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            onShowToast("AI Analyse voltooid: Match score bijgewerkt.");
        }, 1500);
    };

    return (
        <div className="flex h-full bg-slate-50 max-h-[calc(100vh-64px)] overflow-hidden">
            
            {/* SIDEBAR NAVIGATION */}
            <div className="w-64 border-r border-slate-200 bg-white flex flex-col pt-6 pb-4">
                <div className="px-6 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus className="text-teal-600" /> Recruitment
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Talent Acquisition Suite</p>
                </div>

                <nav className="flex-1 space-y-1 px-3">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <LayoutDashboard size={18} className="mr-3"/> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('pipeline')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'pipeline' ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <BarChart3 size={18} className="mr-3"/> Pipeline
                    </button>
                    <button 
                        onClick={() => setActiveTab('jobs')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'jobs' ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Briefcase size={18} className="mr-3"/> Vacatures
                    </button>
                </nav>

                <div className="px-6 mt-auto">
                    <button 
                        onClick={() => setIsVacancyModalOpen(true)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16}/> Vacature
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-hidden flex flex-col">
                
                {/* HEADER BAR */}
                <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {activeTab === 'pipeline' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Zoek kandidaat..." 
                                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                        {activeTab === 'pipeline' && (
                            <select 
                                value={selectedVacancyId}
                                onChange={(e) => setSelectedVacancyId(e.target.value)}
                                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="All">Alle Vacatures</option>
                                {vacancies.map(v => (
                                    <option key={v.id} value={v.id}>{v.title}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {/* Mock Avatars of Recruitment Team */}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-xs font-bold">HR</div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-purple-500 flex items-center justify-center text-white text-xs font-bold">LK</div>
                        </div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Hiring Team</span>
                    </div>
                </div>

                {/* VIEW CONTENT */}
                <div className="flex-1 overflow-y-auto p-8">
                    
                    {/* DASHBOARD VIEW */}
                    {activeTab === 'dashboard' && (
                        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <h2 className="text-2xl font-bold text-slate-900">Recruitment Overzicht</h2>
                            
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Open Vacatures</div>
                                    <div className="text-3xl font-bold text-slate-900">{vacancies.filter(v => v.status === 'Open').length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actieve Kandidaten</div>
                                    <div className="text-3xl font-bold text-blue-600">{metrics.active}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aangenomen (YTD)</div>
                                    <div className="text-3xl font-bold text-green-600">{metrics.hired}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg. Time to Hire</div>
                                    <div className="text-3xl font-bold text-slate-900">18d</div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Funnel</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.funnelData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f1f5f9'}} />
                                            <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={48} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PIPELINE VIEW */}
                    {activeTab === 'pipeline' && (
                        <div className="flex gap-6 h-full min-w-max pb-4">
                            {STAGES.map(stage => {
                                const stageApplicants = filteredApplicants.filter(a => a.stage === stage);
                                return (
                                    <div 
                                        key={stage} 
                                        className="w-80 bg-slate-100 rounded-2xl flex flex-col h-full border border-slate-200/60"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, stage)}
                                    >
                                        <div className="p-4 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/50 rounded-t-2xl sticky top-0 backdrop-blur-sm z-10">
                                            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{stage}</h4>
                                            <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                                                {stageApplicants.length}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                            {stageApplicants.map(app => (
                                                <div 
                                                    key={app.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                                    onClick={() => { setSelectedApplicant(app); setIsApplicantModalOpen(true); }}
                                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative overflow-hidden"
                                                >
                                                    {/* Match Score Indicator */}
                                                    {app.matchScore && (
                                                        <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-lg text-[10px] font-bold text-white ${app.matchScore >= 80 ? 'bg-green-500' : app.matchScore >= 60 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                                            {app.matchScore}% Match
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 mb-3">
                                                        <img src={app.avatar} className="w-10 h-10 rounded-full bg-slate-100 object-cover" alt="Av"/>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-900">{app.firstName} {app.lastName}</div>
                                                            <div className="text-xs text-slate-500 truncate w-36">
                                                                {vacancies.find(v => v.id === app.vacancyId)?.title || 'Unknown'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {app.skills && app.skills.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-3">
                                                            {app.skills.slice(0, 2).map(skill => (
                                                                <span key={skill} className="text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {app.skills.length > 2 && <span className="text-[10px] text-slate-400">+{app.skills.length - 2}</span>}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-2">
                                                        <span className="text-[10px] text-slate-400 font-medium">{app.appliedDate}</span>
                                                        <div className="flex gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={10} className={i < (app.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* JOBS VIEW */}
                    {activeTab === 'jobs' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                            {vacancies.map(vac => (
                                <div key={vac.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                            vac.status === 'Open' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                            {vac.status}
                                        </span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-slate-400 hover:text-slate-700 p-1"><Edit2 size={16}/></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">{vac.title}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{vac.department} • {vac.type}</p>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <Calendar size={14}/> Geplaatst: {vac.postedDate}
                                        </div>
                                        {vac.salaryRange && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Award size={14}/> {vac.salaryRange}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(3, vac.applicantsCount))].map((_, i) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                    {i+1}
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => { setSelectedVacancyId(vac.id); setActiveTab('pipeline'); }}
                                            className="text-sm font-bold text-teal-600 hover:underline flex items-center gap-1"
                                        >
                                            {vac.applicantsCount} Kandidaten <ChevronRight size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE VACANCY MODAL */}
            <Modal
                isOpen={isVacancyModalOpen}
                onClose={() => setIsVacancyModalOpen(false)}
                title="Nieuwe Vacature Plaatsen"
            >
                <form onSubmit={handleAddVacancy} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Functietitel</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            value={newVacancy.title}
                            onChange={e => setNewVacancy({...newVacancy, title: e.target.value})}
                            required
                            placeholder="bv. Front Office Medewerker"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Afdeling</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none"
                                value={newVacancy.department}
                                onChange={e => setNewVacancy({...newVacancy, department: e.target.value})}
                            >
                                <option value="Front Office">Front Office</option>
                                <option value="F&B">F&B</option>
                                <option value="Huishouding">Huishouding</option>
                                <option value="Management">Management</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none"
                                value={newVacancy.type}
                                onChange={e => setNewVacancy({...newVacancy, type: e.target.value as any})}
                            >
                                <option value="Full-Time">Full-Time</option>
                                <option value="Part-Time">Part-Time</option>
                                <option value="Stage">Stage</option>
                            </select>
                        </div>
                    </div>
                    <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold mt-2 hover:bg-slate-800 transition-colors shadow-lg">
                        Publiceren
                    </button>
                </form>
            </Modal>

            {/* CANDIDATE 360 MODAL (The "World Class" Part) */}
            {selectedApplicant && (
                <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isApplicantModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsApplicantModalOpen(false)}></div>
                    
                    {/* Slide-over Panel */}
                    <div className={`relative w-full max-w-5xl bg-slate-50 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${isApplicantModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <img src={selectedApplicant.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100" alt="Av"/>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h2>
                                    <p className="text-slate-500 text-sm flex items-center gap-2">
                                        Solliciteert voor: <span className="font-bold text-teal-600">{vacancies.find(v => v.id === selectedApplicant.vacancyId)?.title}</span>
                                        <span className="text-slate-300">•</span>
                                        {selectedApplicant.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <button onClick={handleRunAI} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl font-bold text-sm hover:bg-purple-100 transition-colors flex items-center gap-2">
                                        {isAnalyzing ? <Sparkles className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                                        AI Analyse
                                    </button>
                                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                                        <Mail size={16}/> Email
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <button onClick={() => setIsApplicantModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                    <X size={24}/>
                                </button>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            
                            {/* LEFT COLUMN: Profile & Resume */}
                            <div className="flex-1 overflow-y-auto p-8 border-r border-slate-200 bg-white">
                                
                                {/* AI Insight Card */}
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100 mb-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={64}/></div>
                                    <div className="relative z-10">
                                        <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                            <Sparkles size={16}/> AI Match Report
                                        </h3>
                                        <div className="flex items-end gap-2 mb-2">
                                            <span className="text-4xl font-bold text-purple-700">{selectedApplicant.matchScore}%</span>
                                            <span className="text-sm font-medium text-purple-600 mb-1">Match met vacature</span>
                                        </div>
                                        <p className="text-sm text-purple-800/80 leading-relaxed">
                                            Sterke kandidaat met relevante ervaring in {vacancies.find(v => v.id === selectedApplicant.vacancyId)?.department}. 
                                            Vaardigheden in {selectedApplicant.skills?.slice(0,2).join(' & ')} sluiten goed aan.
                                        </p>
                                    </div>
                                </div>

                                {/* Resume Viewer Mock */}
                                <div className="mb-8">
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Paperclip size={18} className="text-slate-400"/> CV & Documenten
                                    </h3>
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center h-96 flex flex-col items-center justify-center group cursor-pointer hover:border-teal-400 transition-colors">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                            <Paperclip size={24} className="text-slate-400 group-hover:text-teal-500 transition-colors"/>
                                        </div>
                                        <p className="font-bold text-slate-700">Curriculum Vitae.pdf</p>
                                        <p className="text-sm text-slate-500 mt-1">Klik om te openen</p>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-4">Vaardigheden</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedApplicant.skills?.map(skill => (
                                            <span key={skill} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-700">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Activity & Actions */}
                            <div className="w-full lg:w-96 bg-slate-50 flex flex-col border-l border-slate-200">
                                
                                {/* Stage Control */}
                                <div className="p-6 border-b border-slate-200 bg-white">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Huidige Fase</label>
                                    <select 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={selectedApplicant.stage}
                                        onChange={(e) => {
                                            const newStage = e.target.value as ApplicantStage;
                                            const updated = applicants.map(a => a.id === selectedApplicant!.id ? { ...a, stage: newStage } : a);
                                            setApplicants(updated);
                                            setSelectedApplicant({ ...selectedApplicant!, stage: newStage }); // Update local state immediately
                                            logTimelineEvent(selectedApplicant!.id, 'StatusChange', `Fase gewijzigd naar ${newStage}`);
                                        }}
                                    >
                                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Timeline */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Clock size={16} className="text-slate-400"/> Tijdlijn
                                    </h3>
                                    <div className="space-y-0">
                                        {selectedApplicant.timeline.map(event => (
                                            <TimelineItem key={event.id} event={event} />
                                        ))}
                                    </div>
                                </div>

                                {/* Action Footer */}
                                <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            className="py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                                            onClick={() => {
                                                if(confirm("Afwijzen?")) {
                                                    const updated = applicants.map(a => a.id === selectedApplicant!.id ? { ...a, stage: 'Rejected' as ApplicantStage } : a);
                                                    setApplicants(updated);
                                                    setIsApplicantModalOpen(false);
                                                    onShowToast("Kandidaat afgewezen.");
                                                }
                                            }}
                                        >
                                            Afwijzen
                                        </button>
                                        <button 
                                            onClick={() => handleHire(selectedApplicant)}
                                            className="py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18}/> Aannemen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default RecruitmentPage;
