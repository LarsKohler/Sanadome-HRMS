
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    UserPlus, Search, Briefcase, Plus, Calendar, 
    MessageSquare, Mail, ChevronRight, Star, BarChart3, 
    LayoutDashboard, Clock, Sparkles, Upload, FileText, 
    CheckCircle2, Loader2, X, Filter, MoreHorizontal, 
    Trash2, Check, ArrowRight, Zap, Target, Users, 
    ChevronDown, AlertCircle, Phone, Linkedin, MapPin, 
    Download, Split, Send, BrainCircuit, TrendingUp, Save, ThumbsUp, ThumbsDown, Archive, RefreshCcw, PenLine
} from 'lucide-react';
import { Employee, Applicant, Vacancy, ApplicantStage, RecruitmentTimelineEvent, Notification, ViewState, CandidateScorecard, CandidateTask } from '../types';
import { MOCK_VACANCIES } from '../utils/mockData';
import { Modal } from './Modal';
import { api } from '../utils/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import * as pdfjsLib from 'pdfjs-dist';

// --- PDF.JS SETUP ---
// Dynamically match the worker version to the library version
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (typeof window !== 'undefined') {
    const version = pdfjs.version;
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

interface RecruitmentPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onHireCandidate: (applicant: Applicant) => void;
    onAddNotification?: (notification: Notification) => void;
}

const STAGES: ApplicantStage[] = ['New', 'Screening', 'Interview 1', 'Interview 2', 'Offer', 'Hired'];

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ currentUser, onShowToast, onHireCandidate, onAddNotification }) => {
    const [activeView, setActiveView] = useState<'dashboard' | 'pipeline' | 'archive'>('pipeline');
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [vacancies] = useState<Vacancy[]>(MOCK_VACANCIES);
    
    // Filters
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals & Drawers
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    
    // Scorecard Modal
    const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);
    const [scorecardStage, setScorecardStage] = useState<string>('Interview 1'); // New: Select Interview Stage
    const [newScorecard, setNewScorecard] = useState<Partial<CandidateScorecard>>({
        recommendation: 'Maybe',
        notes: '',
        skills: [
            { name: 'Algemene Indruk', score: 3 },
            { name: 'Werkhouding', score: 3 },
            { name: 'Communicatie', score: 3 }
        ]
    });

    // General Note Modal
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    // AI State
    const [aiScanStep, setAiScanStep] = useState<'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete'>('idle');
    const [scannedData, setScannedData] = useState<Partial<Applicant> | null>(null);
    const [scannedFile, setScannedFile] = useState<File | null>(null); // Store file to attach later
    
    // Confirmation States
    const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
    const [confirmHireId, setConfirmHireId] = useState<string | null>(null);

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

    const handleCreateApplicant = async (e: React.FormEvent) => {
        e.preventDefault();
        // Mock new applicant creation from modal (not fully implemented in snippet, adding basic)
        // ... (implementation would be here)
    };

    // Placeholder for AI Scan logic (simplified)
    const handleScanResume = async (file: File) => {
        setAiScanStep('uploading');
        // Simulate scanning
        setTimeout(() => setAiScanStep('scanning'), 1000);
        setTimeout(() => setAiScanStep('analyzing'), 2000);
        setTimeout(() => {
            setScannedData({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                skills: ['React', 'TypeScript'],
                matchScore: 85
            });
            setAiScanStep('complete');
        }, 3500);
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
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-all"
                    >
                        <BrainCircuit size={18} /> AI Scan
                    </button>
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
                                                {applicant.matchScore && (
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${applicant.matchScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {applicant.matchScore}%
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

            {/* AI Modal Placeholder */}
            <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="AI Resume Scanner">
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                        {aiScanStep === 'idle' && <Upload size={32}/>}
                        {aiScanStep === 'uploading' && <Loader2 size={32} className="animate-spin"/>}
                        {aiScanStep === 'scanning' && <Search size={32} className="animate-pulse"/>}
                        {aiScanStep === 'analyzing' && <BrainCircuit size={32} className="animate-bounce"/>}
                        {aiScanStep === 'complete' && <CheckCircle2 size={32}/>}
                    </div>
                    
                    {aiScanStep === 'idle' && (
                        <>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Upload CV</h3>
                            <p className="text-slate-500 mb-6">Sleep een PDF hierheen of klik om te uploaden. AI analyseert vaardigheden en matcht met vacatures.</p>
                            <label className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">
                                Bestand Kiezen
                                <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && handleScanResume(e.target.files[0])} />
                            </label>
                        </>
                    )}

                    {/* Progress States */}
                    {(aiScanStep === 'uploading' || aiScanStep === 'scanning' || aiScanStep === 'analyzing') && (
                        <div className="w-full max-w-sm">
                            <h3 className="font-bold text-slate-900 mb-4">
                                {aiScanStep === 'uploading' ? 'Uploaden...' : aiScanStep === 'scanning' ? 'Tekst extractie...' : 'AI Analyse...'}
                            </h3>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 transition-all duration-1000 animate-pulse" style={{width: aiScanStep === 'uploading' ? '30%' : aiScanStep === 'scanning' ? '60%' : '90%'}}></div>
                            </div>
                        </div>
                    )}

                    {aiScanStep === 'complete' && scannedData && (
                        <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-green-800">
                                <Sparkles size={20}/>
                                <span className="font-bold">Analyse Voltooid! Match Score: {scannedData.matchScore}%</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Naam</label>
                                    <div className="font-bold text-slate-900">{scannedData.firstName} {scannedData.lastName}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Skills</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {scannedData.skills?.map(s => (
                                            <span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsAIModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600">Sluiten</button>
                                <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md">Kandidaat Aanmaken</button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Applicant Detail Modal (Simplified for reconstruction) */}
            <Modal isOpen={!!selectedApplicant} onClose={() => setSelectedApplicant(null)} title="Kandidaat Detail">
                {selectedApplicant && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xl text-slate-500">
                                {selectedApplicant.firstName.charAt(0)}{selectedApplicant.lastName.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h2>
                                <p className="text-slate-500 text-sm">{selectedApplicant.email}</p>
                            </div>
                            <div className="ml-auto">
                                <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-teal-100">
                                    {selectedApplicant.stage}
                                </span>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-3">
                            <button className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm">Volgende Fase</button>
                            <button className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50">Afwijzen</button>
                        </div>

                        {/* Tabs / Sections */}
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Notities</h3>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 italic">
                                {selectedApplicant.notes || 'Geen notities.'}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default RecruitmentPage;
