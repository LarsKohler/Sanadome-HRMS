
import React, { useState, useEffect, useMemo } from 'react';
import { 
    UserPlus, Search, Briefcase, Plus, Filter, MoreHorizontal, 
    Calendar, CheckCircle, X, MessageSquare, Phone, Mail, 
    ChevronRight, MoveRight, Trash2, Edit2, Star
} from 'lucide-react';
import { Employee, Applicant, Vacancy, ApplicantStage } from '../types';
import { MOCK_VACANCIES, MOCK_APPLICANTS } from '../utils/mockData';
import { Modal } from './Modal';

interface RecruitmentPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onHireCandidate: (applicant: Applicant) => void;
}

const STAGES: ApplicantStage[] = ['New', 'Screening', 'Interview 1', 'Interview 2', 'Offer', 'Hired'];

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ currentUser, onShowToast, onHireCandidate }) => {
    const [activeTab, setActiveTab] = useState<'vacancies' | 'board'>('vacancies');
    const [vacancies, setVacancies] = useState<Vacancy[]>(MOCK_VACANCIES);
    const [applicants, setApplicants] = useState<Applicant[]>(MOCK_APPLICANTS);
    
    // Filters
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
    const [newVacancy, setNewVacancy] = useState<Partial<Vacancy>>({ title: '', department: 'Front Office', type: 'Full-Time', status: 'Open' });
    
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);

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

    // Drag & Drop Handlers (Simple Implementation)
    const handleDragStart = (e: React.DragEvent, applicantId: string) => {
        e.dataTransfer.setData('applicantId', applicantId);
    };

    const handleDrop = (e: React.DragEvent, targetStage: ApplicantStage) => {
        const applicantId = e.dataTransfer.getData('applicantId');
        if (applicantId) {
            const updated = applicants.map(a => 
                a.id === applicantId ? { ...a, stage: targetStage } : a
            );
            setApplicants(updated);
            
            if (targetStage === 'Hired') {
                const hiredApp = applicants.find(a => a.id === applicantId);
                if (hiredApp) {
                    // Auto open modal to confirm hire details? Or just show toast?
                    // For now, toast. The actual "Hire" action is usually deliberate button click.
                    onShowToast(`${hiredApp.firstName} is verplaatst naar 'Aangenomen'!`);
                }
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Actions
    const handleAddVacancy = (e: React.FormEvent) => {
        e.preventDefault();
        const vac: Vacancy = {
            id: Math.random().toString(36).substr(2, 9),
            title: newVacancy.title!,
            department: newVacancy.department!,
            type: newVacancy.type as any,
            status: 'Open',
            applicantsCount: 0,
            postedDate: new Date().toLocaleDateString('nl-NL')
        };
        setVacancies([...vacancies, vac]);
        setIsVacancyModalOpen(false);
        onShowToast("Vacature geplaatst.");
    };

    const handleDeleteVacancy = (id: string) => {
        if(confirm("Weet je zeker dat je deze vacature wilt verwijderen?")) {
            setVacancies(vacancies.filter(v => v.id !== id));
            onShowToast("Vacature verwijderd.");
        }
    };

    const handleHire = (applicant: Applicant) => {
        if(confirm(`Wil je ${applicant.firstName} ${applicant.lastName} aannemen en toevoegen als medewerker?`)) {
            // Update status
            const updated = applicants.map(a => a.id === applicant.id ? { ...a, stage: 'Hired' as ApplicantStage } : a);
            setApplicants(updated);
            
            // Trigger actual hire process
            onHireCandidate(applicant);
            setIsApplicantModalOpen(false);
            onShowToast("Kandidaat aangenomen! Medewerkersprofiel aangemaakt.");
        }
    };

    const handleReject = (applicant: Applicant) => {
        if(confirm(`Wil je ${applicant.firstName} afwijzen?`)) {
            const updated = applicants.map(a => a.id === applicant.id ? { ...a, stage: 'Rejected' as ApplicantStage } : a);
            setApplicants(updated);
            setIsApplicantModalOpen(false);
            onShowToast("Kandidaat afgewezen.");
        }
    };

    return (
        <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500 h-full flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <UserPlus className="text-teal-600" size={32} />
                        Recruitment
                    </h1>
                    <p className="text-slate-500 mt-1">Beheer vacatures en het sollicitatieproces.</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button 
                            onClick={() => setActiveTab('vacancies')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'vacancies' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Vacatures
                        </button>
                        <button 
                            onClick={() => setActiveTab('board')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'board' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Kandidaten
                        </button>
                    </div>
                    {activeTab === 'vacancies' && (
                        <button 
                            onClick={() => setIsVacancyModalOpen(true)}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> Nieuwe Vacature
                        </button>
                    )}
                </div>
            </div>

            {/* VACANCIES TAB */}
            {activeTab === 'vacancies' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                    {vacancies.map(vac => (
                        <div key={vac.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                    vac.status === 'Open' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {vac.status}
                                </span>
                                <button onClick={() => handleDeleteVacancy(vac.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{vac.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">{vac.department} • {vac.type}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="text-xs font-bold text-slate-400">
                                    Geplaatst: {vac.postedDate}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[...Array(Math.min(3, vac.applicantsCount))].map((_, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                                        ))}
                                    </div>
                                    <span className="text-sm font-bold text-teal-600">{vac.applicantsCount} Kandiaten</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => { setSelectedVacancyId(vac.id); setActiveTab('board'); }}
                                className="absolute inset-0 z-10"
                            ></button>
                        </div>
                    ))}
                </div>
            )}

            {/* BOARD TAB */}
            {activeTab === 'board' && (
                <div className="flex flex-col h-full overflow-hidden animate-in fade-in">
                    {/* Filter Bar */}
                    <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Zoek kandidaat..." 
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                                value={selectedVacancyId}
                                onChange={(e) => setSelectedVacancyId(e.target.value)}
                                className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="All">Alle Vacatures</option>
                                {vacancies.map(v => (
                                    <option key={v.id} value={v.id}>{v.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Kanban Board */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                        <div className="flex gap-4 h-full min-w-max">
                            {STAGES.map(stage => {
                                const stageApplicants = filteredApplicants.filter(a => a.stage === stage);
                                return (
                                    <div 
                                        key={stage} 
                                        className="w-72 bg-slate-100 rounded-xl flex flex-col h-full border border-slate-200"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, stage)}
                                    >
                                        <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                                            <h4 className="font-bold text-slate-700 text-sm">{stage}</h4>
                                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-500 shadow-sm">
                                                {stageApplicants.length}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                            {stageApplicants.map(app => (
                                                <div 
                                                    key={app.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                                    onClick={() => { setSelectedApplicant(app); setIsApplicantModalOpen(true); }}
                                                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <img src={app.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt="Av"/>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-900">{app.firstName} {app.lastName}</div>
                                                            <div className="text-xs text-slate-500 truncate w-32">
                                                                {vacancies.find(v => v.id === app.vacancyId)?.title || 'Unknown'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {app.rating ? (
                                                        <div className="flex gap-0.5 mb-2">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={10} className={i < (app.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-[10px] text-slate-400">{app.appliedDate}</span>
                                                        <button className="text-slate-300 group-hover:text-teal-600 transition-colors">
                                                            <ChevronRight size={16} />
                                                        </button>
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

            {/* Create Vacancy Modal */}
            <Modal
                isOpen={isVacancyModalOpen}
                onClose={() => setIsVacancyModalOpen(false)}
                title="Nieuwe Vacature"
            >
                <form onSubmit={handleAddVacancy} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titel</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            value={newVacancy.title}
                            onChange={e => setNewVacancy({...newVacancy, title: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Afdeling</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dienstverband</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            value={newVacancy.type}
                            onChange={e => setNewVacancy({...newVacancy, type: e.target.value as any})}
                        >
                            <option value="Full-Time">Full-Time</option>
                            <option value="Part-Time">Part-Time</option>
                            <option value="Stage">Stage</option>
                        </select>
                    </div>
                    <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold mt-2">Plaatsen</button>
                </form>
            </Modal>

            {/* Applicant Details Modal */}
            <Modal
                isOpen={isApplicantModalOpen}
                onClose={() => setIsApplicantModalOpen(false)}
                title="Kandidaat Details"
            >
                {selectedApplicant && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                            <img src={selectedApplicant.avatar} className="w-16 h-16 rounded-full border-2 border-white shadow-md" alt="Av"/>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h3>
                                <p className="text-sm text-slate-500">
                                    Solliciteert voor: <span className="font-bold text-teal-600">{vacancies.find(v => v.id === selectedApplicant.vacancyId)?.title}</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Mail size={16}/> {selectedApplicant.email}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Phone size={16}/> {selectedApplicant.phone}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Calendar size={16}/> {selectedApplicant.appliedDate}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Star size={16}/> Rating: {selectedApplicant.rating || '-'}/5
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Notities</h4>
                            <p className="text-sm text-slate-700 italic">{selectedApplicant.notes || 'Geen notities.'}</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => handleReject(selectedApplicant)}
                                className="flex-1 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Afwijzen
                            </button>
                            <button 
                                onClick={() => handleHire(selectedApplicant)}
                                className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-md flex justify-center items-center gap-2"
                            >
                                <CheckCircle size={18}/> Aannemen
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default RecruitmentPage;
