
import React, { useState, useMemo, useRef } from 'react';
import { 
    UserPlus, Search, Briefcase, Plus, Calendar, 
    MessageSquare, Mail, ChevronRight, MoveRight, 
    Star, BarChart3, LayoutDashboard, Paperclip, 
    Clock, Sparkles, BrainCircuit, Upload, FileText, CheckCircle2, Loader2, X, RefreshCw
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

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ currentUser, onShowToast, onHireCandidate, onAddNotification }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline'>('pipeline');
    
    // Data
    const [vacancies] = useState<Vacancy[]>(MOCK_VACANCIES); // Read-only, managed externally
    const [applicants, setApplicants] = useState<Applicant[]>(MOCK_APPLICANTS);
    
    // Filters & Search
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);

    // CV Parsing Simulation State
    const [uploadStep, setUploadStep] = useState<'upload' | 'parsing' | 'review'>('upload');
    const [parsedCandidate, setParsedCandidate] = useState<Partial<Applicant>>({});
    const [cvFile, setCvFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- DASHBOARD METRICS ---
    const metrics = useMemo(() => {
        const total = applicants.length;
        const hired = applicants.filter(a => a.stage === 'Hired').length;
        const active = applicants.filter(a => a.stage !== 'Hired' && a.stage !== 'Rejected').length;
        
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

    // --- ACTIONS ---

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

            if (targetStage === 'Interview 1' && onAddNotification) {
                onAddNotification({
                    id: Math.random().toString(),
                    recipientId: currentUser.id,
                    senderName: 'System',
                    type: 'Recruitment',
                    title: 'Kandidaat in Interview Fase',
                    message: `${currentApp.firstName} ${currentApp.lastName} is verplaatst naar ${targetStage}.`,
                    date: 'Zojuist',
                    read: false,
                    targetView: ViewState.RECRUITMENT
                });
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

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

    const handleHire = (applicant: Applicant) => {
        if(confirm(`Weet je zeker dat je ${applicant.firstName} ${applicant.lastName} wilt aannemen? Dit start direct de onboarding.`)) {
            const updated = applicants.map(a => a.id === applicant.id ? { ...a, stage: 'Hired' as ApplicantStage } : a);
            setApplicants(updated);
            logTimelineEvent(applicant.id, 'StatusChange', 'Kandidaat Aangenomen 🎉');
            onHireCandidate(applicant);
            setIsApplicantModalOpen(false);
            onShowToast(`${applicant.firstName} is aangenomen! Onboarding gestart.`);
        }
    };

    // --- CV PARSING LOGIC ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCvFile(file);
            setUploadStep('parsing');
            
            // SIMULATE AI PARSING DELAY
            setTimeout(() => {
                // Mock Extracted Data
                const randomScore = Math.floor(Math.random() * (98 - 65 + 1) + 65);
                const mockSkills = ['Gastvrijheid', 'Engels', 'Duits', 'Stressbestendig', 'Teamplayer'].sort(() => 0.5 - Math.random()).slice(0, 3);
                
                setParsedCandidate({
                    firstName: 'Nieuwe',
                    lastName: 'Kandidaat',
                    email: 'kandidaat@email.com',
                    phone: '06-12345678',
                    matchScore: randomScore,
                    skills: mockSkills,
                    rating: 0,
                    stage: 'New',
                    vacancyId: vacancies[0].id // Default to first vacancy
                });
                setUploadStep('review');
            }, 2000);
        }
    };

    const handleSaveCandidate = () => {
        if (!parsedCandidate.firstName || !parsedCandidate.lastName) return;

        const newApplicant: Applicant = {
            id: Math.random().toString(36).substr(2, 9),
            firstName: parsedCandidate.firstName!,
            lastName: parsedCandidate.lastName!,
            email: parsedCandidate.email || '',
            phone: parsedCandidate.phone || '',
            vacancyId: parsedCandidate.vacancyId || vacancies[0].id,
            stage: 'New',
            appliedDate: new Date().toLocaleDateString('nl-NL'),
            matchScore: parsedCandidate.matchScore,
            skills: parsedCandidate.skills,
            rating: 0,
            avatar: `https://ui-avatars.com/api/?name=${parsedCandidate.firstName}+${parsedCandidate.lastName}&background=random`,
            timeline: [
                {
                    id: 'init-1',
                    type: 'StatusChange',
                    author: 'System',
                    date: new Date().toLocaleString('nl-NL'),
                    content: 'Kandidaat toegevoegd via CV Upload.'
                },
                {
                    id: 'init-2',
                    type: 'Scorecard',
                    author: 'AI Recruiter',
                    date: new Date().toLocaleString('nl-NL'),
                    content: `AI Match Score berekend: ${parsedCandidate.matchScore}%`
                }
            ],
            scorecards: []
        };

        setApplicants([newApplicant, ...applicants]);
        setIsAddCandidateModalOpen(false);
        setUploadStep('upload');
        setCvFile(null);
        onShowToast("Kandidaat succesvol toegevoegd!");
    };

    return (
        <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <UserPlus className="text-teal-600" size={32} />
                        Recruitment & ATS
                    </h1>
                    <p className="text-slate-500 mt-1">Beheer inkomende sollicitaties en selectie.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Zoek kandidaat..." 
                            className="pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddCandidateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={18} />
                        Nieuwe Sollicitant
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6 flex-shrink-0">
                <div className="flex gap-8">
                    <button 
                        onClick={() => setActiveTab('pipeline')}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'pipeline' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <BarChart3 size={18} />
                        Pipeline
                    </button>
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <LayoutDashboard size={18} />
                        Overzicht
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* PIPELINE VIEW */}
                {activeTab === 'pipeline' && (
                    <div className="flex flex-col h-full">
                        {/* Filters */}
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter op Vacature:</span>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                <button
                                    onClick={() => setSelectedVacancyId('All')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${selectedVacancyId === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    Alle Vacatures
                                </button>
                                {vacancies.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVacancyId(v.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${selectedVacancyId === v.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {v.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Kanban Board */}
                        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                            <div className="flex gap-6 h-full min-w-max">
                                {STAGES.map(stage => {
                                    const stageApplicants = filteredApplicants.filter(a => a.stage === stage);
                                    return (
                                        <div 
                                            key={stage} 
                                            className="w-80 bg-slate-100/80 rounded-2xl flex flex-col h-full border border-slate-200"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, stage)}
                                        >
                                            <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl backdrop-blur-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${stage === 'Hired' ? 'bg-green-500' : stage === 'New' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                                                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{stage}</h4>
                                                </div>
                                                <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-500 border border-slate-100 shadow-sm">
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
                                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative overflow-hidden hover:border-teal-300"
                                                    >
                                                        {app.matchScore && (
                                                            <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-lg text-[10px] font-bold text-white shadow-sm z-10 ${app.matchScore >= 80 ? 'bg-green-500' : app.matchScore >= 60 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                                                {app.matchScore}%
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3 mb-3">
                                                            <img src={app.avatar} className="w-10 h-10 rounded-full bg-slate-100 object-cover border border-slate-100" alt="Av"/>
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-900 line-clamp-1">{app.firstName} {app.lastName}</div>
                                                                <div className="text-xs text-slate-500 truncate w-40">
                                                                    {vacancies.find(v => v.id === app.vacancyId)?.title}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {app.skills && app.skills.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-3">
                                                                {app.skills.slice(0, 2).map(skill => (
                                                                    <span key={skill} className="text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-2">
                                                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                                <Clock size={10}/> {app.appliedDate}
                                                            </span>
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
                        </div>
                    </div>
                )}

                {/* DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto h-full pb-10">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sollicitaties Totaal</div>
                                <div className="text-3xl font-bold text-slate-900">{metrics.total}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actief in Proces</div>
                                <div className="text-3xl font-bold text-blue-600">{metrics.active}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aangenomen</div>
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
            </div>

            {/* --- ADD CANDIDATE MODAL --- */}
            <Modal
                isOpen={isAddCandidateModalOpen}
                onClose={() => { setIsAddCandidateModalOpen(false); setUploadStep('upload'); setParsedCandidate({}); setCvFile(null); }}
                title="Nieuwe Sollicitant Toevoegen"
            >
                <div className="min-h-[400px]">
                    
                    {/* STEP 1: UPLOAD */}
                    {uploadStep === 'upload' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 cursor-pointer transition-all hover:border-teal-400 group"
                            >
                                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Upload CV</h3>
                                <p className="text-slate-500 text-sm mt-1">Sleep bestand of klik om te bladeren</p>
                                <p className="text-xs text-slate-400 mt-2">PDF, DOCX (Max 10MB)</p>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".pdf,.docx,.doc" 
                                onChange={handleFileUpload} 
                            />
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                                <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={20}/>
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm">Smart Parsing</h4>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Ons systeem leest automatisch de naam, contactgegevens en vaardigheden uit het CV en berekent direct een match score.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PARSING SIMULATION */}
                    {uploadStep === 'parsing' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-teal-500 rounded-full opacity-20 animate-ping"></div>
                                <div className="relative w-20 h-20 bg-white border-4 border-teal-500 rounded-full flex items-center justify-center shadow-lg">
                                    <Loader2 className="animate-spin text-teal-600" size={40} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-2">CV Analyseren...</h3>
                            <p className="text-slate-500 text-sm">Gegevens extraheren en match score berekenen.</p>
                        </div>
                    )}

                    {/* STEP 3: REVIEW & SAVE */}
                    {uploadStep === 'review' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            
                            {/* AI Match Banner */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-20"><BrainCircuit size={80}/></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-lg flex flex-col items-center justify-center border border-white/30">
                                        <span className="text-2xl font-bold">{parsedCandidate.matchScore}%</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">AI Match Score</h3>
                                        <p className="text-xs text-purple-100 opacity-90">Gebaseerd op skills en ervaring in CV.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Voornaam</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                                        value={parsedCandidate.firstName || ''}
                                        onChange={e => setParsedCandidate({...parsedCandidate, firstName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Achternaam</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                                        value={parsedCandidate.lastName || ''}
                                        onChange={e => setParsedCandidate({...parsedCandidate, lastName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                                        value={parsedCandidate.email || ''}
                                        onChange={e => setParsedCandidate({...parsedCandidate, email: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vacature</label>
                                    <select 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                                        value={parsedCandidate.vacancyId}
                                        onChange={e => setParsedCandidate({...parsedCandidate, vacancyId: e.target.value})}
                                    >
                                        {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gevonden Skills</label>
                                <div className="flex flex-wrap gap-2">
                                    {parsedCandidate.skills?.map((skill, i) => (
                                        <span key={i} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold flex items-center gap-1">
                                            {skill} <CheckCircle2 size={12}/>
                                        </span>
                                    ))}
                                    <button className="px-3 py-1 bg-slate-50 border border-slate-200 border-dashed rounded-full text-xs font-bold text-slate-400 hover:text-slate-600 hover:border-slate-400">
                                        + Skill
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button onClick={() => { setUploadStep('upload'); setCvFile(null); }} className="px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50">
                                    Annuleren
                                </button>
                                <button onClick={handleSaveCandidate} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 shadow-md">
                                    Kandidaat Opslaan
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* APPLICANT DETAIL MODAL */}
            {selectedApplicant && (
                <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isApplicantModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsApplicantModalOpen(false)}></div>
                    <div className={`relative w-full max-w-4xl bg-slate-50 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${isApplicantModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <img src={selectedApplicant.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100" alt="Av"/>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h2>
                                    <p className="text-slate-500 text-sm flex items-center gap-2">
                                        Solliciteert voor: <span className="font-bold text-teal-600">{vacancies.find(v => v.id === selectedApplicant.vacancyId)?.title}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"><Mail size={20}/></button>
                                <button onClick={() => setIsApplicantModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-3 gap-8">
                            {/* Left Col */}
                            <div className="col-span-2 space-y-8">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4">Profiel & Skills</h3>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {selectedApplicant.skills?.map(skill => (
                                            <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">{skill}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="text-slate-400 block text-xs uppercase font-bold">Email</span>{selectedApplicant.email}</div>
                                        <div><span className="text-slate-400 block text-xs uppercase font-bold">Telefoon</span>{selectedApplicant.phone}</div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4">Tijdlijn</h3>
                                    <div className="space-y-6 border-l-2 border-slate-100 pl-6 ml-2">
                                        {selectedApplicant.timeline.map((event, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white border-2 border-teal-500"></div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-slate-900 text-sm">{event.type}</span>
                                                    <span className="text-xs text-slate-400">{event.date}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{event.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Col */}
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                                    <div className="text-4xl font-bold text-teal-600 mb-1">{selectedApplicant.matchScore}%</div>
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Match Score</div>
                                </div>

                                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                                    <h3 className="font-bold mb-4">Acties</h3>
                                    <div className="space-y-3">
                                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors text-left px-4 flex items-center gap-3">
                                            <Calendar size={16}/> Interview Plannen
                                        </button>
                                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors text-left px-4 flex items-center gap-3">
                                            <FileText size={16}/> CV Bekijken
                                        </button>
                                        <div className="h-px bg-white/20 my-2"></div>
                                        <button 
                                            onClick={() => handleHire(selectedApplicant)}
                                            className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={18}/> Aannemen
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
