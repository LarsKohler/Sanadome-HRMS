
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    UserPlus, Search, Briefcase, Plus, Calendar, 
    MessageSquare, Mail, ChevronRight, Star, BarChart3, 
    LayoutDashboard, Clock, Sparkles, Upload, FileText, 
    CheckCircle2, Loader2, X, Filter, MoreHorizontal, 
    Trash2, Check, ArrowRight, Zap, Target, Users, 
    ChevronDown, AlertCircle, Phone, Linkedin, MapPin, 
    Download, Split, Send, BrainCircuit, TrendingUp, Save, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Employee, Applicant, Vacancy, ApplicantStage, RecruitmentTimelineEvent, Notification, ViewState, CandidateScorecard, CandidateTask } from '../types';
import { MOCK_VACANCIES } from '../utils/mockData';
import { Modal } from './Modal';
import { api } from '../utils/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import * as pdfjsLib from 'pdfjs-dist';

// --- PDF.JS SETUP ---
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
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
    const [activeView, setActiveView] = useState<'dashboard' | 'pipeline'>('pipeline');
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
    const [newScorecard, setNewScorecard] = useState<Partial<CandidateScorecard>>({
        recommendation: 'Maybe',
        notes: '',
        skills: [
            { name: 'Algemene Indruk', score: 3 },
            { name: 'Werkhouding', score: 3 },
            { name: 'Communicatie', score: 3 }
        ]
    });

    // AI State
    const [aiScanStep, setAiScanStep] = useState<'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete'>('idle');
    const [scannedData, setScannedData] = useState<Partial<Applicant> | null>(null);
    const [scannedFile, setScannedFile] = useState<File | null>(null); // Store file to attach later
    
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
            return matchVacancy && matchSearch;
        });
    }, [applicants, selectedVacancyId, searchTerm]);

    // --- ACTIONS ---

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('applicantId', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, stage: ApplicantStage) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('applicantId');
        if (id) {
            const app = applicants.find(a => a.id === id);
            if (app && app.stage !== stage) {
                // Update Timeline
                const newEvent: RecruitmentTimelineEvent = {
                    id: Math.random().toString(),
                    type: 'StatusChange',
                    author: currentUser.name,
                    date: new Date().toLocaleString('nl-NL'),
                    content: `Kandidaat verplaatst naar ${stage}`
                };
                
                const updatedApp = { 
                    ...app, 
                    stage,
                    timeline: [newEvent, ...(app.timeline || [])] 
                };

                // Optimistic UI Update
                setApplicants(prev => prev.map(a => a.id === id ? updatedApp : a));
                
                // Save to DB
                await api.saveApplicant(updatedApp);
                
                if (stage === 'Hired') {
                    onShowToast("Kandidaat aangenomen! Start onboarding.");
                }
            }
        }
    };

    const handleProcessCV = async (file: File) => {
        setAiScanStep('scanning');
        setScannedFile(file); // Keep file reference for later storage
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            
            // Extract text from first TWO pages to be safe
            let textItems = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // Add newlines to separate visual lines roughly
                const pageText = textContent.items.map((item: any) => item.str + (item.hasEOL ? '\n' : ' ')).join('');
                textItems += pageText + '\n';
            }
            
            setAiScanStep('analyzing');

            // --- SMARTER PARSING LOGIC ---
            let firstName = '';
            let lastName = '';
            let email = '';
            let phone = '';

            // 1. EXTRACT EMAIL
            const emailMatch = textItems.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            if (emailMatch) {
                email = emailMatch[0];
            }

            // 2. EXTRACT PHONE
            const phoneMatch = textItems.match(/((\+|00)(\d|\s|-){9,})/);
            if (phoneMatch) {
                phone = phoneMatch[0].trim();
            } else {
                const mobileMatch = textItems.match(/(06\s?[-]?\s?\d{8})/);
                if (mobileMatch) phone = mobileMatch[0];
            }

            // 3. INTELLIGENT NAME EXTRACTION
            const lines = textItems.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            
            // Words to ignore in header lookup
            const forbiddenWords = ['cv', 'curriculum', 'vitae', 'resume', 'profiel', 'profile', 'personal', 'persoonlijk', 'details', 'contact', 'email', 'adres', 'address', 'telefoon', 'phone', 'opleiding', 'education', 'werkervaring', 'experience', 'skills', 'vaardigheden', 'talen', 'languages', 'hobby', 'over mij', 'about me', 'pagina', 'page'];

            // First check for explicit "My name is" pattern
            const introRegex = /(?:Mijn naam is|My name is|Ik ben|I am)\s+([A-Z][a-z]+)\s+(?:((?:van|de|den|der|het|'t|ten|ter|el|al|da|di|du|la|le)\s+)+)?([A-Z][a-z]+)/i;
            const introMatch = textItems.match(introRegex);

            if (introMatch) {
                firstName = introMatch[1];
                const prefix = introMatch[2] ? introMatch[2].trim() + ' ' : '';
                lastName = prefix + introMatch[3];
            } else {
                // Heuristic: Scan first 15 lines. Name is often:
                // - Top of doc
                // - 2 to 4 words
                // - Title Cased
                // - Not a forbidden keyword
                
                for (let i = 0; i < Math.min(lines.length, 15); i++) {
                    const line = lines[i];
                    // Strip non-letter chars for check
                    const cleanLine = line.replace(/[^a-zA-Z\s]/g, '').trim(); 
                    
                    if (cleanLine.length < 3 || cleanLine.length > 35) continue;
                    if (forbiddenWords.some(w => cleanLine.toLowerCase().includes(w))) continue;
                    
                    const words = line.trim().split(/\s+/);
                    if (words.length < 2 || words.length > 4) continue; 

                    // Check Capitalization (heuristic: first letters caps, or Dutch prefix)
                    const isNameLike = words.every(w => /^[A-Z]/.test(w) || /^(van|de|der|den|ten|ter|el|al|in|op|t)$/i.test(w));
                    
                    if (isNameLike) {
                        // Found likely name
                        firstName = words[0];
                        // Handle potential prefixes in the rest
                        const rest = words.slice(1);
                        lastName = rest.join(' ');
                        break; 
                    }
                }
            }

            // Strategy D: Fallback to Email (Only if all else fails)
            if (!firstName && email) {
                const localPart = email.split('@')[0];
                if (localPart.includes('.') || localPart.includes('_')) {
                    const parts = localPart.split(/[._]/);
                    if (parts.length >= 2) {
                        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
                        firstName = cap(parts[0]);
                        lastName = parts.slice(1).map(cap).join(' ');
                    }
                }
            }

            // 4. SKILLS EXTRACTION (Keyword matching)
            const commonSkills = [
                'Horeca', 'Gastvrijheid', 'Engels', 'Duits', 'Frans', 'Spaans', 
                'Excel', 'Word', 'Leidinggeven', 'Teamplayer', 'Flexibel', 
                'Kassa', 'Receptie', 'Schoonmaak', 'Keuken', 'HACCP', 'Social Hygiene',
                'IDu PMS', 'MEWS', 'Opera'
            ];
            const foundSkills = commonSkills.filter(skill => 
                textItems.toLowerCase().includes(skill.toLowerCase())
            );

            // Final Cleanup / Defaults
            if (!firstName) firstName = 'Nieuwe';
            if (!lastName) lastName = 'Kandidaat';

            // Clean weird characters from lastName if needed
            lastName = lastName.replace(/[()]/g, '').trim();

            setTimeout(() => {
                setScannedData({
                    firstName,
                    lastName,
                    email: email || 'onbekend@email.com',
                    phone: phone || '06-xxxxxxxx',
                    skills: foundSkills.length > 0 ? foundSkills : ['Gemotiveerd'],
                    matchScore: 70 + Math.floor(Math.random() * 25), // Random score for demo
                    aiReasoning: {
                        pros: foundSkills.length > 0 ? [`Ervaring met: ${foundSkills.slice(0,3).join(', ')}`] : ['Kandidaat toont inzet'],
                        cons: ['Handmatige review van details aangeraden'],
                        summary: `Analyse op basis van CV tekst. Naam gedetecteerd: ${firstName} ${lastName}`
                    }
                });
                setAiScanStep('complete');
            }, 1500);

        } catch (error) {
            console.error("CV Parsing Error:", error);
            onShowToast("Fout bij lezen PDF. Is het een geldig bestand?");
            setAiScanStep('idle');
        }
    };

    const handleSaveCandidate = () => {
        if (scannedData) {
            let resumeUrl = undefined;
            if (scannedFile) {
                // For demo purposes and immediate feedback, we use createObjectURL. 
                // Ideally this would await api.uploadFile(scannedFile)
                resumeUrl = URL.createObjectURL(scannedFile); 
            }

            const newApp: Applicant = {
                id: Math.random().toString(),
                firstName: scannedData.firstName!,
                lastName: scannedData.lastName!,
                email: scannedData.email!,
                phone: scannedData.phone!,
                vacancyId: selectedVacancyId === 'All' ? vacancies[0].id : selectedVacancyId,
                stage: 'New',
                appliedDate: new Date().toLocaleDateString('nl-NL'),
                matchScore: scannedData.matchScore || 0,
                skills: scannedData.skills || [],
                rating: 0,
                aiReasoning: scannedData.aiReasoning,
                resumeUrl: resumeUrl, 
                avatar: `https://ui-avatars.com/api/?name=${scannedData.firstName}+${scannedData.lastName}&background=random`,
                timeline: [{ id: '1', type: 'StatusChange', author: 'System', date: 'Zojuist', content: 'CV geanalyseerd en toegevoegd.' }],
                scorecards: [],
                tasks: [],
                tags: ['#New', '#AI-Parsed']
            };
            
            // Save to DB
            api.saveApplicant(newApp);
            setApplicants([newApp, ...applicants]);
            
            setIsAIModalOpen(false);
            setAiScanStep('idle');
            setScannedData(null);
            setScannedFile(null);
            onShowToast("Kandidaat succesvol toegevoegd aan de pipeline.");
        }
    };

    const handleSaveScorecard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApplicant) return;

        const scorecard: CandidateScorecard = {
            id: Math.random().toString(),
            interviewer: currentUser.name,
            date: new Date().toLocaleDateString('nl-NL'),
            skills: newScorecard.skills || [],
            notes: newScorecard.notes || '',
            recommendation: newScorecard.recommendation as 'Hire' | 'No Hire' | 'Maybe'
        };

        const timelineEvent: RecruitmentTimelineEvent = {
            id: Math.random().toString(),
            type: 'Scorecard',
            author: currentUser.name,
            date: new Date().toLocaleString('nl-NL'),
            content: `Heeft een beoordeling toegevoegd: ${scorecard.recommendation}`
        };

        const updatedApplicant = {
            ...selectedApplicant,
            scorecards: [scorecard, ...(selectedApplicant.scorecards || [])],
            timeline: [timelineEvent, ...(selectedApplicant.timeline || [])],
            rating: scorecard.recommendation === 'Hire' ? 5 : (scorecard.recommendation === 'Maybe' ? 3 : 1) // Simple auto-rate
        };

        // Update list and DB
        const updatedList = applicants.map(a => a.id === updatedApplicant.id ? updatedApplicant : a);
        setApplicants(updatedList);
        setSelectedApplicant(updatedApplicant);
        await api.saveApplicant(updatedApplicant);
        
        setIsScorecardModalOpen(false);
        onShowToast("Beoordeling opgeslagen.");
        
        // Reset form
        setNewScorecard({
            recommendation: 'Maybe',
            notes: '',
            skills: [
                { name: 'Algemene Indruk', score: 3 },
                { name: 'Werkhouding', score: 3 },
                { name: 'Communicatie', score: 3 }
            ]
        });
    };

    // --- RENDERERS ---

    const renderKanbanCard = (applicant: Applicant) => {
        const vacancy = vacancies.find(v => v.id === applicant.vacancyId);
        
        return (
            <div 
                draggable 
                onDragStart={(e) => handleDragStart(e, applicant.id)}
                onClick={() => setSelectedApplicant(applicant)}
                className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-400 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden"
            >
                {/* Match Score Indicator */}
                {applicant.matchScore && (
                    <div className="absolute top-0 right-0 p-2">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            applicant.matchScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                            applicant.matchScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                            {applicant.matchScore}% Match
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                    <img src={applicant.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-slate-50 shadow-sm" alt="Avatar"/>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{applicant.firstName} {applicant.lastName}</h4>
                        <p className="text-xs text-slate-500 truncate w-32">{vacancy?.title || 'Open Sollicitatie'}</p>
                    </div>
                </div>

                {/* Skills Chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                    {(applicant.skills || []).slice(0, 3).map(skill => (
                        <span key={skill} className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {skill}
                        </span>
                    ))}
                    {(applicant.skills?.length || 0) > 3 && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">+{applicant.skills!.length - 3}</span>
                    )}
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={10}/> {applicant.appliedDate}
                    </span>
                    <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} className={s <= (applicant.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}/>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <UserPlus className="text-teal-600" size={32}/>
                        Talent Command Center
                    </h1>
                    <p className="text-slate-500 mt-1 text-lg">Beheer de instroom van nieuw talent.</p>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16}/>
                            <input 
                                type="text" 
                                placeholder="Zoek kandidaat..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-transparent rounded-lg text-sm font-medium w-48 focus:outline-none"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <select 
                            value={selectedVacancyId}
                            onChange={(e) => setSelectedVacancyId(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none cursor-pointer hover:text-slate-900 pr-2"
                        >
                            <option value="All">Alle Vacatures</option>
                            {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                        </select>
                    </div>

                    <button 
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all"
                    >
                        <Sparkles size={16}/> AI Scan
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all"
                    >
                        <Plus size={16}/> Handmatig
                    </button>
                </div>
            </div>

            {/* Main Content Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
                
                {/* View Tabs */}
                <div className="border-b border-slate-200 px-6 py-4 flex gap-4">
                    <button 
                        onClick={() => setActiveView('pipeline')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'pipeline' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <LayoutDashboard size={16}/> Pipeline
                    </button>
                    <button 
                        onClick={() => setActiveView('dashboard')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <BarChart3 size={16}/> Analytics
                    </button>
                </div>

                {/* Pipeline View */}
                {activeView === 'pipeline' && (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-50/50">
                        <div className="flex gap-6 h-full min-w-max">
                            {STAGES.map((stage, idx) => {
                                const stageApps = filteredApplicants.filter(a => a.stage === stage);
                                return (
                                    <div 
                                        key={stage} 
                                        className="w-80 flex flex-col h-full"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, stage)}
                                    >
                                        <div className="flex justify-between items-center mb-3 px-2">
                                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${idx === 5 ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                                {stage}
                                            </h3>
                                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">{stageApps.length}</span>
                                        </div>
                                        
                                        <div className={`flex-1 rounded-2xl border-2 border-dashed p-3 transition-colors overflow-y-auto custom-scrollbar space-y-3
                                            ${stage === 'Hired' ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-100/50 hover:bg-slate-100'}
                                        `}>
                                            {stageApps.map(app => renderKanbanCard(app))}
                                            {stageApps.length === 0 && (
                                                <div className="h-20 flex flex-col items-center justify-center text-slate-300">
                                                    <p className="text-xs font-medium">Sleep kandidaten hierheen</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Dashboard View */}
                {activeView === 'dashboard' && (
                    <div className="p-8 lg:p-12 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Totaal in Pipeline</p>
                                    <h3 className="text-4xl font-bold text-slate-900 mt-2">{metrics.total}</h3>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
                                    <TrendingUp size={14}/> +12% deze maand
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time to Hire</p>
                                    <h3 className="text-4xl font-bold text-slate-900 mt-2">{metrics.timeToHire}d</h3>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-lg">
                                    Gemiddelde
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actieve Vacatures</p>
                                    <h3 className="text-4xl font-bold text-slate-900 mt-2">{vacancies.filter(v => v.status === 'Open').length}</h3>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-between text-white">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aangenomen (YTD)</p>
                                    <h3 className="text-4xl font-bold mt-2">{metrics.hired}</h3>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-green-400 bg-white/10 w-fit px-2 py-1 rounded-lg">
                                    <CheckCircle2 size={14}/> Target behaald
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Funnel Conversie</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.funnelData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11}}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}}/>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} cursor={{fill: '#f8fafc'}}/>
                                        <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- AI SCANNER MODAL (The "Wow" Feature) --- */}
            <Modal isOpen={isAIModalOpen} onClose={() => { setIsAIModalOpen(false); setAiScanStep('idle'); }} title="">
                <div className="min-h-[500px] bg-slate-900 text-white rounded-xl overflow-hidden relative flex flex-col">
                    {/* Background Animation */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(13,148,136,0.4),transparent_70%)]"></div>
                    </div>

                    <div className="p-8 relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Sparkles className="text-teal-400" /> AI CV Scanner
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Sleep een CV hierheen voor automatische analyse.</p>
                            </div>
                            <button onClick={() => setIsAIModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X/></button>
                        </div>

                        {aiScanStep === 'idle' && (
                            <div className="flex-1 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center p-12 hover:border-teal-500 hover:bg-slate-800/50 transition-all cursor-pointer group">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-teal-900/20">
                                    <Upload className="text-teal-400" size={32}/>
                                </div>
                                <h3 className="text-lg font-bold mb-2">Sleep PDF Bestand</h3>
                                <p className="text-slate-500 text-sm">of klik om te bladeren</p>
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={(e) => e.target.files?.[0] && handleProcessCV(e.target.files[0])}
                                    accept=".pdf"
                                />
                            </div>
                        )}

                        {(aiScanStep === 'scanning' || aiScanStep === 'analyzing') && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="relative w-32 h-32 mb-8">
                                    <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-teal-500 border-r-teal-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <BrainCircuit size={48} className="text-teal-400 animate-pulse"/>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    {aiScanStep === 'scanning' ? 'Document Lezen...' : 'AI Analyse Bezig...'}
                                </h3>
                                <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4">
                                    <div className="h-full bg-teal-500 animate-progress-indeterminate"></div>
                                </div>
                                <p className="text-slate-500 text-xs mt-4 font-mono">
                                    {aiScanStep === 'scanning' ? 'Extracting text layer...' : 'Identifying skills & entities...'}
                                </p>
                            </div>
                        )}

                        {aiScanStep === 'complete' && scannedData && (
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    {/* Score Card */}
                                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Match Score</div>
                                        <div className="text-5xl font-bold text-teal-400 mb-2">{scannedData.matchScore}%</div>
                                        <div className="text-sm text-slate-300">Sterke match met vacatureprofiel.</div>
                                    </div>
                                    
                                    {/* Quick Facts */}
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Kandidaat</div>
                                            <div className="text-xl font-bold">{scannedData.firstName} {scannedData.lastName}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Top Skills</div>
                                            <div className="flex flex-wrap gap-2">
                                                {scannedData.skills?.map(s => (
                                                    <span key={s} className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs font-bold border border-teal-500/30">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Reasoning */}
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700 mb-8">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-400"/> AI Inzichten
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        {scannedData.aiReasoning?.pros.map((pro, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check size={14} className="text-green-400 mt-0.5 shrink-0"/> {pro}
                                            </li>
                                        ))}
                                        {scannedData.aiReasoning?.cons.map((con, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0"/> {con}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-auto flex gap-4">
                                    <button onClick={() => setAiScanStep('idle')} className="px-6 py-3 border border-slate-600 rounded-xl font-bold hover:bg-slate-800 transition-colors">Opnieuw</button>
                                    <button onClick={handleSaveCandidate} className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-lg shadow-teal-900/20 transition-all transform hover:scale-105">
                                        Toevoegen aan Pipeline
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* --- CANDIDATE 360 MODAL (The Detail View) --- */}
            {selectedApplicant && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedApplicant(null)}></div>
                    <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <img src={selectedApplicant.avatar} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" alt="Av"/>
                                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${selectedApplicant.matchScore && selectedApplicant.matchScore >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}>
                                            {selectedApplicant.matchScore}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h2>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Briefcase size={14}/> {vacancies.find(v => v.id === selectedApplicant.vacancyId)?.title}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14}/> Nijmegen</span>
                                        <span className="flex items-center gap-1 text-blue-600 cursor-pointer hover:underline"><Linkedin size={14}/> Profiel</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"><Phone size={20}/></button>
                                <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"><Mail size={20}/></button>
                                <div className="w-px h-10 bg-slate-100 mx-2"></div>
                                <button onClick={() => setSelectedApplicant(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex">
                            {/* Left Sidebar */}
                            <div className="w-80 bg-slate-50 border-r border-slate-100 p-6 overflow-y-auto hidden lg:block">
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contact</h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                                <Mail size={16} className="text-slate-400"/>
                                                <span className="truncate">{selectedApplicant.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                                <Phone size={16} className="text-slate-400"/>
                                                <span>{selectedApplicant.phone}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApplicant.skills?.map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Documenten</h4>
                                        <div className="space-y-2">
                                            {selectedApplicant.resumeUrl ? (
                                                <a 
                                                    href={selectedApplicant.resumeUrl} 
                                                    download={`CV_${selectedApplicant.lastName}.pdf`}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors group"
                                                >
                                                    <div className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                                        <FileText size={16}/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-slate-900 truncate">CV {selectedApplicant.lastName}</div>
                                                        <div className="text-xs text-slate-400">PDF Document</div>
                                                    </div>
                                                    <Download size={16} className="text-slate-300 group-hover:text-slate-600"/>
                                                </a>
                                            ) : (
                                                <div className="text-xs text-slate-400 italic text-center p-4 border-2 border-dashed border-slate-200 rounded-xl">Geen CV geüpload</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Detail Area */}
                            <div className="flex-1 overflow-y-auto p-8 bg-white">
                                
                                {/* Stage Stepper */}
                                <div className="mb-10">
                                    <div className="flex justify-between items-center relative">
                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
                                        {STAGES.map((stage, idx) => {
                                            const currentIdx = STAGES.indexOf(selectedApplicant.stage);
                                            const isComplete = idx < currentIdx;
                                            const isCurrent = idx === currentIdx;
                                            
                                            return (
                                                <div key={stage} className="flex flex-col items-center gap-2 bg-white px-2 cursor-pointer" onClick={async () => {
                                                    const updatedApp = { ...selectedApplicant, stage };
                                                    setApplicants(prev => prev.map(a => a.id === selectedApplicant.id ? updatedApp : a));
                                                    setSelectedApplicant(updatedApp);
                                                    await api.saveApplicant(updatedApp);
                                                }}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                                        isComplete ? 'bg-teal-500 border-teal-500 text-white' :
                                                        isCurrent ? 'bg-white border-teal-500 text-teal-600 shadow-lg scale-110' :
                                                        'bg-white border-slate-200 text-slate-300'
                                                    }`}>
                                                        {isComplete ? <Check size={14}/> : <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-teal-500' : 'bg-slate-300'}`}></div>}
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-teal-700' : 'text-slate-400'}`}>{stage}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Timeline */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-slate-900 text-lg">Tijdlijn</h3>
                                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                                            {selectedApplicant.timeline.map((event, i) => (
                                                <div key={i} className="relative">
                                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white ring-2 ring-slate-100 bg-slate-300"></div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-slate-800 text-sm">{event.type === 'StatusChange' ? 'Status Gewijzigd' : event.type}</span>
                                                        <span className="text-xs text-slate-400">{event.date}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        {event.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scorecards & Notes */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-slate-900 text-lg">Beoordelingen</h3>
                                            <button 
                                                onClick={() => setIsScorecardModalOpen(true)}
                                                className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                                            >
                                                + Nieuwe Beoordeling
                                            </button>
                                        </div>
                                        
                                        {selectedApplicant.scorecards.length > 0 ? selectedApplicant.scorecards.map(card => (
                                            <div key={card.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                                <div className="flex justify-between mb-4 border-b border-slate-200 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                            {card.interviewer.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{card.interviewer}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                        card.recommendation === 'Hire' ? 'bg-green-100 text-green-700' :
                                                        card.recommendation === 'No Hire' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>{card.recommendation}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {card.skills.map(s => (
                                                        <div key={s.name} className="flex justify-between text-sm">
                                                            <span className="text-slate-600">{s.name}</span>
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(v => (
                                                                    <div key={v} className={`w-2 h-2 rounded-full ${v <= s.score ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {card.notes && (
                                                    <div className="mt-4 text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-slate-100">
                                                        "{card.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                                Nog geen beoordelingen.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button className="px-6 py-3 border border-red-100 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors">
                                Afwijzen
                            </button>
                            {selectedApplicant.stage !== 'Hired' && (
                                <button 
                                    onClick={() => {
                                        if(confirm(`Weet je zeker dat je ${selectedApplicant.firstName} wilt aannemen?`)) {
                                            const updatedApp = { ...selectedApplicant, stage: 'Hired' as ApplicantStage };
                                            setApplicants(prev => prev.map(a => a.id === selectedApplicant.id ? updatedApp : a));
                                            api.saveApplicant(updatedApp);
                                            onHireCandidate(updatedApp);
                                            setSelectedApplicant(null);
                                            onShowToast(`${selectedApplicant.firstName} is aangenomen!`);
                                        }
                                    }}
                                    className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle2 size={18}/> Aannemen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scorecard Modal */}
            <Modal
                isOpen={isScorecardModalOpen}
                onClose={() => setIsScorecardModalOpen(false)}
                title="Beoordeling Invullen"
            >
                <form onSubmit={handleSaveScorecard} className="space-y-6">
                    <div className="space-y-4">
                        {newScorecard.skills?.map((skill, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <span className="font-medium text-sm text-slate-700">{skill.name}</span>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(score => (
                                        <button
                                            key={score}
                                            type="button"
                                            onClick={() => {
                                                const updatedSkills = [...(newScorecard.skills || [])];
                                                updatedSkills[idx].score = score;
                                                setNewScorecard({ ...newScorecard, skills: updatedSkills });
                                            }}
                                            className={`w-8 h-8 rounded-full font-bold text-sm transition-all ${
                                                score <= skill.score 
                                                ? 'bg-slate-900 text-white scale-110' 
                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                            }`}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notities</label>
                        <textarea 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            rows={3}
                            placeholder="Wat viel op tijdens het gesprek?"
                            value={newScorecard.notes}
                            onChange={(e) => setNewScorecard({ ...newScorecard, notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Advies</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setNewScorecard({ ...newScorecard, recommendation: 'Hire' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 ${
                                    newScorecard.recommendation === 'Hire' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-slate-200 text-slate-500'
                                }`}
                            >
                                <ThumbsUp size={16}/> Aannemen
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewScorecard({ ...newScorecard, recommendation: 'Maybe' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 ${
                                    newScorecard.recommendation === 'Maybe' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500' : 'bg-white border-slate-200 text-slate-500'
                                }`}
                            >
                                Twijfel
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewScorecard({ ...newScorecard, recommendation: 'No Hire' })}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 ${
                                    newScorecard.recommendation === 'No Hire' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'bg-white border-slate-200 text-slate-500'
                                }`}
                            >
                                <ThumbsDown size={16}/> Afwijzen
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
                        Opslaan
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default RecruitmentPage;
