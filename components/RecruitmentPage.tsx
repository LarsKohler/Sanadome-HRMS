
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    UserPlus, Search, Plus, Calendar, MessageSquare, ChevronRight, BarChart3, 
    LayoutDashboard, Clock, FileText, CheckCircle2, X, MoreHorizontal, 
    Trash2, Check, ArrowRight, Target, Users, Phone, Mail, Linkedin, MapPin, 
    Download, Split, Archive, Star, PenTool, Upload, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Employee, Applicant, Vacancy, ApplicantStage, RecruitmentTimelineEvent, Notification, ViewState, CandidateScorecard, Interview } from '../types';
import { MOCK_VACANCIES } from '../utils/mockData';
import { Modal } from './Modal';
import { api } from '../utils/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface RecruitmentPageProps {
    currentUser: Employee;
    employees?: Employee[]; // Needed for scheduling interviews
    onShowToast: (message: string) => void;
    onHireCandidate: (applicant: Applicant) => void;
    onAddNotification?: (notification: Notification) => void;
}

const STAGES: ApplicantStage[] = ['New', 'Screening', 'Interview 1', 'Interview 2', 'Offer', 'Hired'];

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ currentUser, employees, onShowToast, onHireCandidate, onAddNotification }) => {
    const [activeView, setActiveView] = useState<'dashboard' | 'pipeline' | 'archive'>('pipeline');
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [vacancies] = useState<Vacancy[]>(MOCK_VACANCIES);
    
    // Filters
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Detail Modal State
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'interviews' | 'evaluations'>('overview');

    // Create Candidate Form
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCandidate, setNewCandidate] = useState<Partial<Applicant>>({
        firstName: '', lastName: '', email: '', phone: '', stage: 'New', vacancyId: ''
    });
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const motivationInputRef = useRef<HTMLInputElement>(null);

    // Interview Scheduling State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [newInterview, setNewInterview] = useState<Partial<Interview>>({
        date: '', time: '', location: 'Sanadome Meeting Room', interviewers: [currentUser.id]
    });

    // Scorecard State
    const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);
    const [scorecardInterviewId, setScorecardInterviewId] = useState<string | null>(null); // NEW: To link to interview
    const [newScorecard, setNewScorecard] = useState<Partial<CandidateScorecard>>({
        recommendation: 'Maybe',
        notes: '',
        skills: [
            { name: 'Algemene Indruk', score: 3 },
            { name: 'Werkhouding', score: 3 },
            { name: 'Communicatie', score: 3 }
        ]
    });

    // Note State
    const [newNote, setNewNote] = useState('');

    // Permissions
    const isAllowedToSchedule = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

    // Initial Load
    useEffect(() => {
        loadApplicants();
    }, []);

    const loadApplicants = async () => {
        try {
            const data = await api.getApplicants();
            setApplicants(data);
        } catch (e) {
            console.error("Failed to load applicants", e);
        }
    };

    // --- METRICS ---
    const metrics = useMemo(() => {
        const total = applicants.length;
        const active = applicants.filter(a => !['Hired', 'Rejected'].includes(a.stage)).length;
        const hired = applicants.filter(a => a.stage === 'Hired').length;
        const timeToHire = 18; // Mock avg days

        const funnelData = STAGES.map(stage => ({
            name: stage,
            count: applicants.filter(a => a.stage === stage).length
        }));

        return { total, active, hired, timeToHire, funnelData };
    }, [applicants]);

    const filteredApplicants = useMemo(() => {
        return applicants.filter(a => {
            const matchVacancy = selectedVacancyId === 'All' || a.vacancyId === selectedVacancyId;
            const matchSearch = a.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                a.lastName.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (activeView === 'archive') {
                return matchVacancy && matchSearch && a.stage === 'Rejected';
            }
            return matchVacancy && matchSearch && a.stage !== 'Rejected';
        });
    }, [applicants, selectedVacancyId, searchTerm, activeView]);

    // --- ACTIONS ---

    const handleCreateApplicant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCandidate.firstName || !newCandidate.lastName || !newCandidate.email) return;

        const applicant: Applicant = {
            id: Math.random().toString(36).substr(2, 9),
            vacancyId: newCandidate.vacancyId || 'v1',
            firstName: newCandidate.firstName,
            lastName: newCandidate.lastName,
            email: newCandidate.email,
            phone: newCandidate.phone || '',
            stage: 'New',
            appliedDate: new Date().toISOString(),
            resumeUrl: newCandidate.resumeUrl,
            motivationUrl: newCandidate.motivationUrl,
            timeline: [
                { id: Math.random().toString(36).substr(2, 9), type: 'StatusChange', author: 'System', date: new Date().toLocaleDateString('nl-NL'), content: 'Kandidaat aangemaakt' }
            ],
            scorecards: [],
            interviews: []
        };

        await api.saveApplicant(applicant);
        setApplicants([...applicants, applicant]);
        setIsAddModalOpen(false);
        setNewCandidate({ firstName: '', lastName: '', email: '', phone: '', stage: 'New', vacancyId: '' });
        onShowToast("Kandidaat toegevoegd.");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'resumeUrl' | 'motivationUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            onShowToast(`${field === 'resumeUrl' ? 'CV' : 'Motivatie'} uploaden...`);
            const url = await api.uploadFile(file); // Returns blob/url
            if (url) {
                setNewCandidate(prev => ({ ...prev, [field]: url }));
                onShowToast("Bestand geüpload.");
            }
        }
    };

    const handleAddNote = async () => {
        if (!selectedApplicant || !newNote.trim()) return;
        
        const event: RecruitmentTimelineEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'Note',
            author: currentUser.name,
            date: new Date().toLocaleDateString('nl-NL'),
            content: newNote
        };

        const updated = {
            ...selectedApplicant,
            timeline: [event, ...selectedApplicant.timeline]
        };

        await updateApplicant(updated);
        setNewNote('');
        onShowToast("Notitie toegevoegd.");
    };

    const handleScheduleInterview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApplicant || !newInterview.date || !newInterview.time) return;

        const interview: Interview = {
            id: Math.random().toString(36).substr(2, 9),
            date: newInterview.date,
            time: newInterview.time,
            location: newInterview.location || 'Sanadome',
            interviewers: newInterview.interviewers || [],
            status: 'Scheduled'
        };

        const event: RecruitmentTimelineEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'Interview',
            author: currentUser.name,
            date: new Date().toLocaleDateString('nl-NL'),
            content: `Interview gepland op ${interview.date} om ${interview.time}`
        };

        const updated = {
            ...selectedApplicant,
            interviews: [...selectedApplicant.interviews, interview],
            timeline: [event, ...selectedApplicant.timeline]
        };

        await updateApplicant(updated);
        
        // Notify Interviewers
        if (onAddNotification && employees) {
            interview.interviewers.forEach(interviewerId => {
                if (interviewerId !== currentUser.id) { // Don't notify self
                    onAddNotification({
                        id: crypto.randomUUID(),
                        recipientId: interviewerId,
                        senderName: currentUser.name,
                        type: 'Recruitment',
                        title: '📅 Sollicitatiegesprek Ingepland',
                        message: `Je bent ingepland voor een gesprek met ${selectedApplicant.firstName} ${selectedApplicant.lastName} op ${new Date(interview.date).toLocaleDateString()} om ${interview.time}.`,
                        date: 'Zojuist',
                        read: false,
                        targetView: ViewState.RECRUITMENT,
                        isPinned: true
                    });
                }
            });
        }

        setIsScheduleModalOpen(false);
        setNewInterview({ date: '', time: '', location: 'Sanadome Meeting Room', interviewers: [currentUser.id] });
        onShowToast("Interview ingepland en uitnodigingen verstuurd.");
    };

    const openScorecardModal = (interviewId: string) => {
        setScorecardInterviewId(interviewId);
        setIsScorecardModalOpen(true);
    };

    const handleAddScorecard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApplicant || !scorecardInterviewId) return;

        const scorecard: CandidateScorecard = {
            id: Math.random().toString(36).substr(2, 9),
            interviewId: scorecardInterviewId,
            interviewer: currentUser.name,
            date: new Date().toLocaleDateString('nl-NL'),
            skills: newScorecard.skills || [],
            notes: newScorecard.notes || '',
            recommendation: newScorecard.recommendation || 'Maybe'
        };

        const event: RecruitmentTimelineEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'Scorecard',
            author: currentUser.name,
            date: new Date().toLocaleDateString('nl-NL'),
            content: `Beoordeling toegevoegd: ${scorecard.recommendation}`
        };

        // Mark interview as completed
        const updatedInterviews = selectedApplicant.interviews.map(i => 
            i.id === scorecardInterviewId ? { ...i, status: 'Completed' as const } : i
        );

        const updated = {
            ...selectedApplicant,
            interviews: updatedInterviews,
            scorecards: [...selectedApplicant.scorecards, scorecard],
            timeline: [event, ...selectedApplicant.timeline]
        };

        await updateApplicant(updated);
        setIsScorecardModalOpen(false);
        setScorecardInterviewId(null);
        onShowToast("Beoordeling opgeslagen en gesprek afgerond.");
    };

    const updateApplicant = async (updated: Applicant) => {
        await api.saveApplicant(updated);
        setApplicants(prev => prev.map(a => a.id === updated.id ? updated : a));
        setSelectedApplicant(updated);
    };

    const handleStageChange = async (newStage: ApplicantStage) => {
        if (!selectedApplicant) return;
        
        // If hiring, trigger special flow
        if (newStage === 'Hired') {
            onHireCandidate(selectedApplicant);
            onShowToast(`${selectedApplicant.firstName} is aangenomen!`);
        }

        const updated = { ...selectedApplicant, stage: newStage };
        await updateApplicant(updated);
    };

    const getAverageScore = (app: Applicant) => {
        if (app.scorecards.length === 0) return 0;
        let total = 0;
        let count = 0;
        app.scorecards.forEach(sc => {
            sc.skills.forEach(skill => {
                total += skill.score;
                count++;
            });
        });
        return count > 0 ? (total / count).toFixed(1) : 0;
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <UserPlus className="text-teal-600" size={32} />
                        Recruitment
                    </h1>
                    <p className="text-slate-500 mt-1">Beheer vacatures en kandidaten.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-all"
                    >
                        <Plus size={18} /> Nieuwe Kandidaat
                    </button>
                </div>
            </div>

            {/* View Toggle */}
            <div className="border-b border-slate-200 mb-8 flex gap-8">
                <button onClick={() => setActiveView('pipeline')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'pipeline' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <Split size={18}/> Pipeline
                </button>
                <button onClick={() => setActiveView('dashboard')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <LayoutDashboard size={18}/> Dashboard
                </button>
                <button onClick={() => setActiveView('archive')} className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'archive' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                    <Archive size={18}/> Archief
                </button>
            </div>

            {/* Content Views */}
            {activeView === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Totaal Kandidaten</div>
                        <div className="text-3xl font-bold text-slate-900">{metrics.total}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Actief in Proces</div>
                        <div className="text-3xl font-bold text-blue-600">{metrics.active}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Aangenomen</div>
                        <div className="text-3xl font-bold text-green-600">{metrics.hired}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Avg. Time to Hire</div>
                        <div className="text-3xl font-bold text-purple-600">{metrics.timeToHire} dagen</div>
                    </div>
                    
                    {/* Funnel Chart */}
                    <div className="col-span-1 md:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
                        <h3 className="font-bold text-slate-900 mb-4">Pipeline Funnel</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.funnelData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeView === 'pipeline' && (
                <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
                    {STAGES.map(stage => {
                        const stageApplicants = filteredApplicants.filter(a => a.stage === stage);
                        return (
                            <div key={stage} className="min-w-[300px] bg-slate-50 rounded-xl border border-slate-200 flex flex-col">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
                                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{stage}</h3>
                                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{stageApplicants.length}</span>
                                </div>
                                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                    {stageApplicants.map(applicant => (
                                        <div 
                                            key={applicant.id}
                                            onClick={() => setSelectedApplicant(applicant)}
                                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-teal-300 group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-900">{applicant.firstName} {applicant.lastName}</h4>
                                                {applicant.rating && (
                                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 flex items-center gap-1">
                                                        <Star size={10} fill="currentColor"/> {applicant.rating}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mb-3 truncate">{vacancies.find(v => v.id === applicant.vacancyId)?.title || 'Algemeen'}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Calendar size={12}/> {new Date(applicant.appliedDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Archive View */}
            {activeView === 'archive' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Kandidaat</th>
                                <th className="px-6 py-4">Vacature</th>
                                <th className="px-6 py-4">Datum</th>
                                <th className="px-6 py-4 text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredApplicants.map(app => (
                                <tr key={app.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900">{app.firstName} {app.lastName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{vacancies.find(v => v.id === app.vacancyId)?.title}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(app.appliedDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setSelectedApplicant(app)} className="text-teal-600 font-bold text-xs hover:underline">Bekijken</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CREATE CANDIDATE MODAL */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nieuwe Kandidaat">
                <form onSubmit={handleCreateApplicant} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voornaam</label>
                            <input 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                value={newCandidate.firstName}
                                onChange={e => setNewCandidate({...newCandidate, firstName: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Achternaam</label>
                            <input 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                value={newCandidate.lastName}
                                onChange={e => setNewCandidate({...newCandidate, lastName: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                            <input 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                type="email"
                                value={newCandidate.email}
                                onChange={e => setNewCandidate({...newCandidate, email: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefoon</label>
                            <input 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                value={newCandidate.phone}
                                onChange={e => setNewCandidate({...newCandidate, phone: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vacature</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            value={newCandidate.vacancyId}
                            onChange={e => setNewCandidate({...newCandidate, vacancyId: e.target.value})}
                        >
                            <option value="">Algemene Sollicitatie</option>
                            {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CV Upload</label>
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={resumeInputRef}
                                onChange={(e) => handleFileUpload(e, 'resumeUrl')}
                            />
                            <div 
                                onClick={() => resumeInputRef.current?.click()}
                                className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer hover:bg-slate-50 transition-colors ${newCandidate.resumeUrl ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}
                            >
                                <Upload size={20} className={`mx-auto mb-2 ${newCandidate.resumeUrl ? 'text-green-600' : 'text-slate-400'}`}/>
                                <span className="text-xs font-bold text-slate-600">{newCandidate.resumeUrl ? 'Bestand geselecteerd' : 'Klik om te uploaden'}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivatie</label>
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={motivationInputRef}
                                onChange={(e) => handleFileUpload(e, 'motivationUrl')}
                            />
                            <div 
                                onClick={() => motivationInputRef.current?.click()}
                                className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer hover:bg-slate-50 transition-colors ${newCandidate.motivationUrl ? 'border-green-300 bg-green-50' : 'border-slate-300'}`}
                            >
                                <FileText size={20} className={`mx-auto mb-2 ${newCandidate.motivationUrl ? 'text-green-600' : 'text-slate-400'}`}/>
                                <span className="text-xs font-bold text-slate-600">{newCandidate.motivationUrl ? 'Bestand geselecteerd' : 'Klik om te uploaden'}</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors">
                        Toevoegen
                    </button>
                </form>
            </Modal>

            {/* CANDIDATE DETAIL MODAL */}
            {selectedApplicant && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedApplicant(null)}></div>
                    <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 bg-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center font-bold text-2xl text-slate-500">
                                    {selectedApplicant.firstName.charAt(0)}{selectedApplicant.lastName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h2>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                        <span className="flex items-center gap-1"><Mail size={14}/> {selectedApplicant.email}</span>
                                        <span className="flex items-center gap-1"><Phone size={14}/> {selectedApplicant.phone}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <select 
                                    value={selectedApplicant.stage}
                                    onChange={(e) => handleStageChange(e.target.value as ApplicantStage)}
                                    className="bg-white border border-slate-200 text-slate-700 text-sm font-bold py-2 px-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button onClick={() => setSelectedApplicant(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                    <X size={24}/>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Sidebar */}
                            <div className="w-72 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Documenten</h3>
                                    <div className="space-y-2">
                                        {selectedApplicant.resumeUrl ? (
                                            <a href={selectedApplicant.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 transition-colors group">
                                                <FileText size={18} className="text-slate-400 group-hover:text-teal-600"/>
                                                <span className="text-sm font-medium text-slate-700">CV Bekijken</span>
                                            </a>
                                        ) : <div className="text-xs text-slate-400 italic">Geen CV geüpload</div>}
                                        
                                        {selectedApplicant.motivationUrl ? (
                                            <a href={selectedApplicant.motivationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 transition-colors group">
                                                <FileText size={18} className="text-slate-400 group-hover:text-teal-600"/>
                                                <span className="text-sm font-medium text-slate-700">Motivatie Bekijken</span>
                                            </a>
                                        ) : <div className="text-xs text-slate-400 italic">Geen motivatie geüpload</div>}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Vacature</h3>
                                    <div className="text-sm font-medium text-slate-800 bg-white p-3 rounded-xl border border-slate-200">
                                        {vacancies.find(v => v.id === selectedApplicant.vacancyId)?.title || 'Algemeen'}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Gemiddelde Score</h3>
                                    <div className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                                        {getAverageScore(selectedApplicant)} <Star size={20} className="text-yellow-400 fill-current"/>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Op basis van {selectedApplicant.scorecards.length} beoordelingen
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 flex flex-col bg-white">
                                {/* Tabs */}
                                <div className="flex border-b border-slate-100 px-6">
                                    <button 
                                        onClick={() => setActiveDetailTab('overview')}
                                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeDetailTab === 'overview' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}
                                    >
                                        Overzicht
                                    </button>
                                    <button 
                                        onClick={() => setActiveDetailTab('interviews')}
                                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeDetailTab === 'interviews' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}
                                    >
                                        Gesprekken <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">{selectedApplicant.interviews.length}</span>
                                    </button>
                                    <button 
                                        onClick={() => setActiveDetailTab('evaluations')}
                                        className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeDetailTab === 'evaluations' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}
                                    >
                                        Beoordeling <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">{selectedApplicant.scorecards.length}</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                                    {/* OVERVIEW TAB */}
                                    {activeDetailTab === 'overview' && (
                                        <div className="max-w-3xl space-y-8">
                                            {/* Note Input */}
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <textarea 
                                                    className="w-full border-none focus:ring-0 resize-none text-sm"
                                                    placeholder="Schrijf een notitie..."
                                                    rows={3}
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                />
                                                <div className="flex justify-end pt-2 border-t border-slate-50">
                                                    <button onClick={handleAddNote} className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800">
                                                        Toevoegen
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                                                {selectedApplicant.timeline.map(event => (
                                                    <div key={event.id} className="relative pl-8">
                                                        <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-white border-4 border-slate-300"></div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-900">{event.author}</span>
                                                            <span className="text-xs text-slate-400">{event.date}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded text-slate-500">{event.type}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">{event.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* INTERVIEWS TAB */}
                                    {activeDetailTab === 'interviews' && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-slate-900">Geplande Gesprekken</h3>
                                                {isAllowedToSchedule && (
                                                    <button onClick={() => setIsScheduleModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800">
                                                        <Plus size={16}/> Gesprek Inplannen
                                                    </button>
                                                )}
                                            </div>

                                            {selectedApplicant.interviews.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedApplicant.interviews.map(int => {
                                                        // Check if I am an interviewer and if it's not scored yet
                                                        const isInterviewer = int.interviewers.includes(currentUser.id) || isAllowedToSchedule;
                                                        const isScored = selectedApplicant.scorecards.some(sc => sc.interviewId === int.id);
                                                        
                                                        return (
                                                            <div key={int.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                            {new Date(int.date).getDate()}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-bold text-slate-900">{new Date(int.date).toLocaleDateString('nl-NL', {month: 'long'})}</div>
                                                                            <div className="text-xs text-slate-500">{int.time}</div>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${int.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {int.status}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-2 text-sm text-slate-600 flex-1">
                                                                    <div className="flex items-center gap-2"><MapPin size={14}/> {int.location}</div>
                                                                    <div className="flex items-center gap-2"><Users size={14}/> {int.interviewers.length} Interviewers</div>
                                                                </div>
                                                                
                                                                {!isScored && isInterviewer && (
                                                                    <button 
                                                                        onClick={() => openScorecardModal(int.id)}
                                                                        className="mt-4 w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        <Star size={14}/> Beoordelen
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                                    Nog geen gesprekken gepland.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* EVALUATIONS TAB */}
                                    {activeDetailTab === 'evaluations' && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-slate-900">Scorecards</h3>
                                                {/* Button removed here to enforce linking to interview */}
                                            </div>

                                            {selectedApplicant.scorecards.map(sc => (
                                                <div key={sc.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs text-slate-500">{sc.interviewer.charAt(0)}</div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-sm">{sc.interviewer}</div>
                                                                <div className="text-xs text-slate-500">{sc.date}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 ${
                                                            sc.recommendation === 'Hire' ? 'bg-green-100 text-green-700' : 
                                                            sc.recommendation === 'No Hire' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {sc.recommendation === 'Hire' ? <ThumbsUp size={12}/> : sc.recommendation === 'No Hire' ? <ThumbsDown size={12}/> : <MoreHorizontal size={12}/>}
                                                            {sc.recommendation}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                        {sc.skills.map((skill, idx) => (
                                                            <div key={idx} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                                                                <span className="text-xs font-medium text-slate-600">{skill.name}</span>
                                                                <div className="flex text-yellow-400">
                                                                    {[...Array(skill.score)].map((_, i) => <Star key={i} size={10} fill="currentColor"/>)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    {sc.notes && (
                                                        <div className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                            "{sc.notes}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {selectedApplicant.scorecards.length === 0 && (
                                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                                    Nog geen beoordelingen. Plan eerst een gesprek in om te kunnen beoordelen.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SCHEDULE MODAL */}
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Gesprek Inplannen">
                <form onSubmit={handleScheduleInterview} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Datum</label>
                            <input type="date" className="w-full p-3 border rounded-xl" required onChange={e => setNewInterview({...newInterview, date: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tijd</label>
                            <input type="time" className="w-full p-3 border rounded-xl" required onChange={e => setNewInterview({...newInterview, time: e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Locatie</label>
                        <input type="text" className="w-full p-3 border rounded-xl" value={newInterview.location} onChange={e => setNewInterview({...newInterview, location: e.target.value})}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Interviewers</label>
                        <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                            {employees?.map(emp => (
                                <label key={emp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={newInterview.interviewers?.includes(emp.id)}
                                        onChange={(e) => {
                                            const current = newInterview.interviewers || [];
                                            const updated = e.target.checked ? [...current, emp.id] : current.filter(id => id !== emp.id);
                                            setNewInterview({...newInterview, interviewers: updated});
                                        }}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm">{emp.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg">Inplannen</button>
                </form>
            </Modal>

            {/* SCORECARD MODAL */}
            <Modal isOpen={isScorecardModalOpen} onClose={() => setIsScorecardModalOpen(false)} title="Beoordeling Invullen">
                <form onSubmit={handleAddScorecard} className="space-y-6">
                    <div className="space-y-4">
                        {newScorecard.skills?.map((skill, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <span className="font-bold text-slate-700 text-sm">{skill.name}</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(score => (
                                        <button 
                                            key={score}
                                            type="button" 
                                            onClick={() => {
                                                const updatedSkills = [...(newScorecard.skills || [])];
                                                updatedSkills[idx].score = score;
                                                setNewScorecard({...newScorecard, skills: updatedSkills});
                                            }}
                                            className={`p-1.5 rounded transition-colors ${skill.score >= score ? 'text-yellow-400' : 'text-slate-200'}`}
                                        >
                                            <Star size={20} fill="currentColor"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Conclusie</label>
                        <div className="flex gap-2">
                            {['Hire', 'Maybe', 'No Hire'].map(rec => (
                                <button
                                    key={rec}
                                    type="button"
                                    onClick={() => setNewScorecard({...newScorecard, recommendation: rec as any})}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                        newScorecard.recommendation === rec 
                                        ? (rec === 'Hire' ? 'bg-green-100 border-green-500 text-green-800' : rec === 'No Hire' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-amber-100 border-amber-500 text-amber-800')
                                        : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                >
                                    {rec}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notities</label>
                        <textarea 
                            className="w-full p-3 border rounded-xl text-sm" 
                            rows={3} 
                            placeholder="Toelichting..."
                            value={newScorecard.notes}
                            onChange={(e) => setNewScorecard({...newScorecard, notes: e.target.value})}
                        />
                    </div>
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg">Opslaan & Gesprek Afronden</button>
                </form>
            </Modal>

        </div>
    );
};

export default RecruitmentPage;
