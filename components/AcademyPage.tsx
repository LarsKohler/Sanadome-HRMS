
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Play, CheckCircle, Search, Plus, Edit2, Trash2, 
    BookOpen, GraduationCap, ChevronRight, ChevronDown, 
    Layout, Save, ArrowLeft, MoreVertical, FileText, 
    Video, HelpCircle, Image as ImageIcon, MousePointer, 
    Layers, Columns, GitBranch, List, Upload, Check, GripVertical, X, Circle,
    Award, Star, Zap, Clock, Maximize2, Move, Sparkles, ArrowRight
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, LessonType, QuizQuestion, HotspotItem, ProcessStep, FlipCardItem } from '../types';
import AcademySidebar from './AcademySidebar';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onExit: () => void;
}

// --- CONSTANTS ---
const CONTENT_BLOCKS = [
    { type: 'Text', label: 'Tekst & Media', icon: FileText, color: 'text-slate-600 bg-slate-100' },
    { type: 'Video', label: 'Video Embed', icon: Video, color: 'text-red-600 bg-red-100' },
    { type: 'Hotspot', label: 'Interactieve Image', icon: MousePointer, color: 'text-orange-600 bg-orange-100' },
    { type: 'FlipCard', label: 'Flashcards', icon: Layers, color: 'text-indigo-600 bg-indigo-100' },
    { type: 'Quiz', label: 'Kennis Quiz', icon: HelpCircle, color: 'text-purple-600 bg-purple-100' },
    { type: 'Process', label: 'Tijdlijn / Proces', icon: List, color: 'text-blue-600 bg-blue-100' },
];

// --- HELPER COMPONENTS ---

const LessonTypeIcon = ({ type }: { type: LessonType }) => {
    const block = CONTENT_BLOCKS.find(b => b.type === type);
    if (!block) return <FileText size={14} className="text-slate-500" />;
    return <block.icon size={14} className={block.color.split(' ')[0]} />;
};

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, onShowToast, onExit }) => {
    const [view, setView] = useState<string>('dashboard'); // dashboard, catalog, builder, player
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // BUILDER STATE
    const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // PLAYER STATE
    const [playingCourse, setPlayingCourse] = useState<AcademyCourse | null>(null);
    const [currentLesson, setCurrentLesson] = useState<AcademyLesson | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const c = await api.getAcademyCourses();
        const p = await api.getAcademyProgress();
        setCourses(c);
        setUserProgress(p);
    };

    // --- PLAYER LOGIC ---
    const startCourse = (course: AcademyCourse) => {
        setPlayingCourse(course);
        // Resume functionality: find last accessed lesson or first incomplete
        const prog = userProgress.find(p => p.courseId === course.id && p.employeeId === currentUser.id);
        
        let startLesson = null;
        if (prog && prog.completedLessonIds.length > 0) {
             // Logic to find next lesson could be better, for now finding first uncompleted or just first
             // Simply taking the first lesson of first module for MVP simplicity or resuming logic needs robust tree traversal
        }

        if (course.modules.length > 0 && course.modules[0].lessons.length > 0) {
            setCurrentLesson(course.modules[0].lessons[0]);
        }
        setView('player');
    };

    const handleLessonComplete = async (courseId: string, lessonId: string, score?: number) => {
        // Find current progress or create new
        let progress = userProgress.find(p => p.courseId === courseId && p.employeeId === currentUser.id);
        
        if (!progress) {
            progress = {
                id: Math.random().toString(36).substr(2, 9),
                employeeId: currentUser.id,
                courseId: courseId,
                status: 'In Progress',
                progressPercentage: 0,
                completedLessonIds: [],
                quizScores: {},
                startDate: new Date().toLocaleDateString('nl-NL')
            };
        }

        if (!progress.completedLessonIds.includes(lessonId)) {
            progress.completedLessonIds.push(lessonId);
        }

        if (score !== undefined) {
            progress.quizScores[lessonId] = score;
        }

        // Recalculate %
        const totalLessons = playingCourse?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 1;
        progress.progressPercentage = Math.round((progress.completedLessonIds.length / totalLessons) * 100);

        if (progress.progressPercentage === 100) {
            progress.status = 'Completed';
            progress.completedDate = new Date().toLocaleDateString('nl-NL');
            onShowToast("Cursus voltooid! +500 XP");
        } else {
            onShowToast("Les afgerond.");
        }

        await api.saveAcademyProgress(progress);
        loadData(); // Refresh local state
    };

    // --- BUILDER LOGIC ---

    const handleOpenBuilder = (course?: AcademyCourse) => {
        if (course) {
            setActiveCourse(JSON.parse(JSON.stringify(course)));
        } else {
            setActiveCourse({
                id: Math.random().toString(36).substr(2, 9),
                title: 'Nieuwe Training',
                description: '',
                category: 'General',
                level: 'Beginner',
                modules: [],
                targetRoles: ['All'],
                createdAt: new Date().toLocaleDateString('nl-NL'),
                author: currentUser.name,
                isPublished: false,
                xpPoints: 100
            });
        }
        setSelectedModuleId(null);
        setSelectedLessonId(null);
        setHasUnsavedChanges(false);
        setView('builder');
    };

    const saveBuilderChanges = async () => {
        if (activeCourse) {
            await api.saveAcademyCourse(activeCourse);
            setHasUnsavedChanges(false);
            loadData();
            onShowToast("Cursus opgeslagen.");
        }
    };

    const addModule = () => {
        if (!activeCourse) return;
        const newModule: AcademyModule = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Nieuw Hoofdstuk',
            lessons: []
        };
        setActiveCourse({
            ...activeCourse,
            modules: [...activeCourse.modules, newModule]
        });
        setHasUnsavedChanges(true);
    };

    const addLesson = (moduleId: string, type: LessonType = 'Text') => {
        if (!activeCourse) return;
        const newLesson: AcademyLesson = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Nieuw Onderwerp',
            type: type,
            content: '',
            durationMinutes: 5
        };
        
        const updatedModules = activeCourse.modules.map(m => {
            if (m.id === moduleId) {
                return { ...m, lessons: [...m.lessons, newLesson] };
            }
            return m;
        });

        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setSelectedLessonId(newLesson.id);
        setSelectedModuleId(moduleId);
        setHasUnsavedChanges(true);
    };

    const updateLesson = (moduleId: string, lessonId: string, updates: Partial<AcademyLesson>) => {
        if (!activeCourse) return;
        const updatedModules = activeCourse.modules.map(m => {
            if (m.id === moduleId) {
                const updatedLessons = m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l);
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });
        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setHasUnsavedChanges(true);
    };

    // --- EDITOR RENDERERS ---

    const renderLessonEditor = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Layout size={64} className="mb-4 opacity-20"/>
                <h3 className="text-xl font-bold text-slate-600">Selecteer een les</h3>
                <p className="text-sm mt-1 max-w-xs text-center">Kies een onderdeel uit het menu links om de inhoud te bewerken.</p>
            </div>
        );
        
        const module = activeCourse.modules.find(m => m.id === selectedModuleId);
        const lesson = module?.lessons.find(l => l.id === selectedLessonId);
        
        if (!lesson) return null;

        const handleContentChange = (newContent: any) => {
            updateLesson(selectedModuleId, selectedLessonId, { content: JSON.stringify(newContent) });
        };

        let parsedContent: any = {};
        try {
            parsedContent = lesson.content ? JSON.parse(lesson.content) : {};
        } catch (e) {
            parsedContent = {}; 
            if (lesson.type === 'Text') parsedContent = { text: lesson.content }; 
        }

        return (
            <div className="flex flex-col h-full bg-slate-50">
                {/* Header for Lesson */}
                <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CONTENT_BLOCKS.find(b => b.type === lesson.type)?.color}`}>
                            <LessonTypeIcon type={lesson.type} />
                        </div>
                        <input 
                            className="font-serif text-2xl font-bold text-slate-900 border-none focus:ring-0 p-0 bg-transparent w-full placeholder:text-slate-300"
                            value={lesson.title}
                            onChange={(e) => updateLesson(selectedModuleId, selectedLessonId, { title: e.target.value })}
                            placeholder="Naam van dit onderwerp..."
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={16}/>
                        <input 
                            type="number" 
                            className="w-12 border rounded p-1 text-center"
                            value={lesson.durationMinutes}
                            onChange={(e) => updateLesson(selectedModuleId, selectedLessonId, { durationMinutes: parseInt(e.target.value) })}
                        />
                        <span>min</span>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-8">
                        
                        {lesson.type === 'Text' && (
                            <div className="h-full flex flex-col">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Inhoud (Markdown Supported)</label>
                                <textarea 
                                    className="flex-1 w-full p-4 border border-slate-200 rounded-xl font-medium text-slate-700 leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                                    value={typeof parsedContent === 'string' ? parsedContent : (parsedContent.text || lesson.content)}
                                    onChange={(e) => updateLesson(selectedModuleId, selectedLessonId, { content: e.target.value })}
                                    placeholder="Typ hier je verhaal, plak afbeeldingen of gebruik markdown..."
                                />
                            </div>
                        )}

                        {lesson.type === 'Hotspot' && (
                            <div className="flex flex-col h-full">
                                <div className="mb-4 flex gap-2">
                                    <input 
                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        value={parsedContent.imageUrl || ''}
                                        onChange={(e) => handleContentChange({ ...parsedContent, imageUrl: e.target.value })}
                                        placeholder="Plak hier de URL van de afbeelding..."
                                    />
                                    <button className="bg-indigo-50 text-indigo-600 p-3 rounded-xl font-bold text-sm"><Upload size={18}/></button>
                                </div>
                                
                                {parsedContent.imageUrl ? (
                                    <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-100 group">
                                        <img 
                                            src={parsedContent.imageUrl} 
                                            className="w-full h-auto object-contain" 
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                
                                                const newSpot: HotspotItem = {
                                                    id: Math.random().toString(),
                                                    x, y,
                                                    title: 'Nieuw punt',
                                                    content: 'Beschrijving hier...'
                                                };
                                                handleContentChange({ ...parsedContent, hotspots: [...(parsedContent.hotspots || []), newSpot] });
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Klik op de afbeelding om een hotspot te plaatsen</span>
                                        </div>
                                        {(parsedContent.hotspots || []).map((spot: HotspotItem, idx: number) => (
                                            <div 
                                                key={spot.id}
                                                className="absolute w-8 h-8 bg-indigo-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center text-white font-bold hover:scale-110 transition-transform z-10"
                                                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                            >
                                                {idx + 1}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400">
                                        <ImageIcon size={48} className="mb-2 opacity-50"/>
                                        <p>Geen afbeelding geselecteerd</p>
                                    </div>
                                )}

                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(parsedContent.hotspots || []).map((spot: HotspotItem, idx: number) => (
                                        <div key={spot.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input 
                                                    className="w-full font-bold text-slate-900 border-none p-0 focus:ring-0"
                                                    value={spot.title}
                                                    onChange={(e) => {
                                                        const newSpots = [...parsedContent.hotspots];
                                                        newSpots[idx].title = e.target.value;
                                                        handleContentChange({ ...parsedContent, hotspots: newSpots });
                                                    }}
                                                />
                                                <textarea 
                                                    className="w-full text-sm text-slate-600 border border-slate-100 rounded p-2 bg-slate-50"
                                                    value={spot.content}
                                                    onChange={(e) => {
                                                        const newSpots = [...parsedContent.hotspots];
                                                        newSpots[idx].content = e.target.value;
                                                        handleContentChange({ ...parsedContent, hotspots: newSpots });
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const newSpots = parsedContent.hotspots.filter((_:any, i:number) => i !== idx);
                                                        handleContentChange({ ...parsedContent, hotspots: newSpots });
                                                    }}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Verwijder punt
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {lesson.type === 'FlipCard' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-slate-900">Flashcards</h4>
                                    <button 
                                        onClick={() => {
                                            const newCard: FlipCardItem = { id: Math.random().toString(), front: 'Voorkant', back: 'Achterkant' };
                                            handleContentChange({ ...parsedContent, cards: [...(parsedContent.cards || []), newCard] });
                                        }}
                                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100"
                                    >
                                        + Kaart Toevoegen
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(parsedContent.cards || []).map((card: FlipCardItem, idx: number) => (
                                        <div key={card.id} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                                            <div className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-400 uppercase border-b border-slate-200 flex justify-between px-4 items-center">
                                                <span>Kaart {idx + 1}</span>
                                                <button onClick={() => {
                                                    const newCards = parsedContent.cards.filter((_:any, i:number) => i !== idx);
                                                    handleContentChange({ ...parsedContent, cards: newCards });
                                                }} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                                            </div>
                                            <div className="flex-1 p-4 space-y-4">
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-indigo-400 mb-1 block">Voorkant (Vraag/Term)</label>
                                                    <input 
                                                        className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                                                        value={card.front}
                                                        onChange={(e) => {
                                                            const newCards = [...parsedContent.cards];
                                                            newCards[idx].front = e.target.value;
                                                            handleContentChange({ ...parsedContent, cards: newCards });
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase font-bold text-teal-400 mb-1 block">Achterkant (Antwoord/Definitie)</label>
                                                    <textarea 
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm text-slate-600"
                                                        rows={3}
                                                        value={card.back}
                                                        onChange={(e) => {
                                                            const newCards = [...parsedContent.cards];
                                                            newCards[idx].back = e.target.value;
                                                            handleContentChange({ ...parsedContent, cards: newCards });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add other editors (Video, Quiz, etc.) similarly ... */}
                        {lesson.type === 'Video' && (
                            <div className="text-center py-20 text-slate-400">Video editor placeholder</div>
                        )}
                         {lesson.type === 'Quiz' && (
                            <div className="text-center py-20 text-slate-400">Quiz editor placeholder</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (view === 'builder' && activeCourse) {
        return (
            <div className="flex flex-col h-screen bg-white font-sans">
                {/* Builder Header */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-30 shadow-sm relative">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('manage-courses')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20}/>
                        </button>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <input 
                            className="font-serif font-bold text-slate-900 text-xl border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-300 w-96"
                            value={activeCourse.title}
                            onChange={(e) => { setActiveCourse({...activeCourse, title: e.target.value}); setHasUnsavedChanges(true); }}
                            placeholder="Naam van de cursus..."
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-xs font-bold text-slate-500 uppercase">XP:</span>
                            <input 
                                type="number"
                                className="w-12 bg-transparent text-sm font-bold text-indigo-600 text-right focus:outline-none"
                                value={activeCourse.xpPoints || 100}
                                onChange={(e) => setActiveCourse({...activeCourse, xpPoints: parseInt(e.target.value)})}
                            />
                            <Star size={14} className="text-yellow-400 fill-yellow-400"/>
                        </div>
                        <button 
                            onClick={saveBuilderChanges}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                                hasUnsavedChanges 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5' 
                                : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                            <Save size={18}/> Opslaan
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Structure Sidebar */}
                    <div className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Structuur</span>
                            <button onClick={addModule} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors" title="Nieuw Hoofdstuk">
                                <Plus size={18}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {activeCourse.modules.map((module, mIdx) => (
                                <div key={module.id} className="relative group">
                                    <div className="flex items-center gap-2 mb-2 group/header">
                                        <div className="w-6 h-6 bg-slate-200 text-slate-600 rounded-md flex items-center justify-center text-xs font-bold shadow-sm">
                                            {mIdx + 1}
                                        </div>
                                        <input 
                                            className="flex-1 bg-transparent text-sm font-bold text-slate-700 focus:outline-none focus:text-indigo-700 transition-colors"
                                            value={module.title}
                                            onChange={(e) => {
                                                const updated = [...activeCourse.modules];
                                                updated[mIdx].title = e.target.value;
                                                setActiveCourse({...activeCourse, modules: updated});
                                                setHasUnsavedChanges(true);
                                            }}
                                        />
                                        <div className="opacity-0 group-hover/header:opacity-100 transition-opacity flex gap-1">
                                            {/* Dropdown for adding specific blocks */}
                                            <div className="relative group/add">
                                                <button className="text-slate-400 hover:text-indigo-600 p-1">
                                                    <Plus size={14}/>
                                                </button>
                                                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 hidden group-hover/add:block p-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                                    {CONTENT_BLOCKS.map(block => (
                                                        <button 
                                                            key={block.type}
                                                            onClick={() => addLesson(module.id, block.type as LessonType)}
                                                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2"
                                                        >
                                                            <block.icon size={14} className={block.color.split(' ')[0]}/>
                                                            {block.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1 pl-3 border-l-2 border-slate-200 ml-3">
                                        {module.lessons.map((lesson) => (
                                            <div 
                                                key={lesson.id}
                                                className={`pl-4 pr-3 py-2.5 rounded-r-xl text-sm flex items-center gap-3 cursor-pointer transition-all border border-transparent ${
                                                    selectedLessonId === lesson.id 
                                                    ? 'bg-white border-slate-200 shadow-sm translate-x-1' 
                                                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                                                }`}
                                                onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(lesson.id); }}
                                            >
                                                <LessonTypeIcon type={lesson.type} />
                                                <span className={`truncate flex-1 ${selectedLessonId === lesson.id ? 'font-bold text-indigo-700' : ''}`}>{lesson.title}</span>
                                            </div>
                                        ))}
                                        {module.lessons.length === 0 && (
                                            <div className="py-2 pl-4 text-xs text-slate-300 italic">Sleep items hierheen of klik +</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            <button onClick={addModule} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                <Plus size={16}/> Nieuw Hoofdstuk
                            </button>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {renderLessonEditor()}
                    </div>
                </div>
            </div>
        );
    }

    // --- STANDARD VIEWS ---

    const renderDashboard = () => {
        const myStartedCourses = courses.filter(c => userProgress.some(p => p.courseId === c.id && p.employeeId === currentUser.id));
        const totalXP = userProgress.reduce((sum, p) => p.status === 'Completed' ? sum + (courses.find(c => c.id === p.courseId)?.xpPoints || 0) : sum, 0);

        return (
            <div className="p-8 pb-20">
                {/* Hero Section */}
                <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white mb-10 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-purple-900 opacity-90"></div>
                    <div className="absolute inset-0" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80")', backgroundSize: 'cover', mixBlendMode: 'overlay', opacity: 0.3}}></div>
                    
                    <div className="relative z-10 p-10 md:p-14 flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-indigo-500/30 border border-indigo-400/50 text-indigo-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                    Academy Dashboard
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">
                                Welkom terug, {currentUser.name.split(' ')[0]}.
                            </h1>
                            <p className="text-indigo-200 text-lg max-w-xl leading-relaxed">
                                Je hebt <strong className="text-white">{totalXP} XP</strong> verdiend deze maand. Je bent goed op weg naar het volgende niveau!
                            </p>
                            
                            {myStartedCourses.length > 0 && (
                                <button 
                                    onClick={() => startCourse(myStartedCourses[0])}
                                    className="mt-8 bg-white text-indigo-900 px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-3 transform hover:-translate-y-1"
                                >
                                    <Play size={18} fill="currentColor" /> Verder met {myStartedCourses[0].title}
                                </button>
                            )}
                        </div>
                        
                        {/* Gamification Badge */}
                        <div className="hidden md:block text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white/10 mb-2 mx-auto">
                                <Award size={48} className="text-white drop-shadow-md" />
                            </div>
                            <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Level 3</div>
                            <div className="text-white font-bold">Leergierige Expert</div>
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-indigo-600"/> Verder Kijken
                </h3>
                
                {myStartedCourses.length > 0 ? (
                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
                        {myStartedCourses.map(course => {
                            const prog = userProgress.find(p => p.courseId === course.id && p.employeeId === currentUser.id);
                            return (
                                <div key={course.id} className="min-w-[300px] bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group snap-start cursor-pointer" onClick={() => startCourse(course)}>
                                    <div className="relative h-40 bg-slate-100 rounded-xl mb-4 overflow-hidden">
                                        <img src={course.coverImage || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"/>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded">
                                            {prog?.progressPercentage}%
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-slate-900 mb-1 truncate">{course.title}</h4>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                        <div className="bg-indigo-600 h-full rounded-full" style={{width: `${prog?.progressPercentage}%`}}></div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>{course.modules.length} modules</span>
                                        <span className="text-indigo-600 font-bold group-hover:underline">Hervatten</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 mb-10">
                        <p className="text-slate-500 mb-4">Nog geen actieve cursussen.</p>
                        <button onClick={() => setView('catalog')} className="text-indigo-600 font-bold hover:underline">Naar Catalogus</button>
                    </div>
                )}

                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Sparkles size={20} className="text-amber-500"/> Aanbevolen voor jou
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {courses.filter(c => !userProgress.some(p => p.courseId === c.id)).slice(0,4).map(course => (
                        <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group overflow-hidden cursor-pointer" onClick={() => startCourse(course)}>
                            <div className="h-32 bg-slate-100 relative">
                                <img src={course.coverImage || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover"/>
                                {course.level === 'Beginner' && <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">Starter</span>}
                            </div>
                            <div className="p-5">
                                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">{course.category}</div>
                                <h4 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">{course.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-50">
                                    <span className="flex items-center gap-1"><Clock size={12}/> 45m</span>
                                    <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/> {course.xpPoints} XP</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderManageCourses = () => (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                    <h2 className="text-2xl font-bold text-slate-900">Creator Studio</h2>
                </div>
                <button onClick={() => handleOpenBuilder()} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg">
                    <Plus size={16}/> Nieuwe Cursus
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Titel</th>
                            <th className="px-6 py-4">Categorie</th>
                            <th className="px-6 py-4">Modules</th>
                            <th className="px-6 py-4">XP</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {courses.map(course => (
                            <tr key={course.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-900">{course.title}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-500 uppercase">{course.category}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{course.modules.length}</td>
                                <td className="px-6 py-4 text-slate-600 font-medium text-amber-600">{course.xpPoints} XP</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${course.isPublished ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {course.isPublished ? 'Live' : 'Concept'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleOpenBuilder(course)} 
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
                                    >
                                        <Edit2 size={14}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderCatalog = () => (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Bibliotheek</h2>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Zoek op titel of onderwerp..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.filter(c => c.isPublished && c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(course => (
                    <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full overflow-hidden cursor-pointer" onClick={() => startCourse(course)}>
                        <div className="h-40 bg-slate-200 relative">
                            {course.coverImage ? (
                                <img src={course.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={course.title}/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                    <BookOpen size={32}/>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                            <div className="absolute bottom-3 left-3 text-white">
                                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-white/30">
                                    {course.category}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 text-lg leading-tight group-hover:text-indigo-700 transition-colors">{course.title}</h3>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">{course.description}</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
                                <span className="flex items-center gap-1"><Layers size={12}/> {course.modules.length} mod</span>
                                <span className="flex items-center gap-1 text-amber-500"><Star size={12} fill="currentColor"/> {course.xpPoints} XP</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {view !== 'builder' && view !== 'player' && (
                <AcademySidebar 
                    activeView={view} 
                    onChangeView={(v) => setView(v)} 
                    onExit={onExit} 
                    currentUser={currentUser} 
                />
            )}
            
            <main className="flex-1 overflow-hidden flex flex-col relative">
                {view === 'builder' ? (
                    renderLessonEditor() || renderLessonEditor() // Fallback handled inside
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {view === 'dashboard' && renderDashboard()}
                        {view === 'catalog' && renderCatalog()}
                        {view === 'manage-courses' && renderManageCourses()}
                        
                        {/* Player View */}
                        {view === 'player' && playingCourse && (
                            <div className="absolute inset-0 bg-white z-50 flex flex-col">
                                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                            <X size={24}/>
                                        </button>
                                        <h2 className="font-bold text-slate-900 truncate max-w-md">{playingCourse.title}</h2>
                                    </div>
                                    <div className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                        {currentLesson?.title}
                                    </div>
                                </div>
                                <div className="flex-1 flex overflow-hidden">
                                    <div className="w-80 border-r border-slate-200 bg-slate-50 overflow-y-auto p-6 hidden md:block">
                                        <div className="space-y-6">
                                            {playingCourse.modules.map((mod, idx) => (
                                                <div key={mod.id}>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">Module {idx + 1}: {mod.title}</div>
                                                    <div className="space-y-1">
                                                        {mod.lessons.map(les => {
                                                            const isCompleted = userProgress.find(p => p.courseId === playingCourse.id && p.employeeId === currentUser.id)?.completedLessonIds.includes(les.id);
                                                            const isCurrent = currentLesson?.id === les.id;
                                                            return (
                                                                <button 
                                                                    key={les.id}
                                                                    onClick={() => setCurrentLesson(les)}
                                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-all ${
                                                                        isCurrent 
                                                                        ? 'bg-white shadow-sm text-indigo-700 font-bold border border-slate-100' 
                                                                        : 'hover:bg-slate-200/50 text-slate-600'
                                                                    }`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                                                                        {isCompleted && <Check size={10} strokeWidth={4}/>}
                                                                    </div>
                                                                    <span className="truncate">{les.title}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8 md:p-12 flex justify-center">
                                        {currentLesson ? (
                                            <div className="max-w-3xl w-full">
                                                <div className="mb-8">
                                                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">{currentLesson.title}</h1>
                                                    
                                                    {/* RENDER CONTENT BASED ON TYPE */}
                                                    <div className="prose prose-slate prose-lg max-w-none mb-10">
                                                        {currentLesson.type === 'Text' && (
                                                            <div dangerouslySetInnerHTML={{ __html: JSON.parse(currentLesson.content || '{}').text?.replace(/\n/g, '<br/>') || currentLesson.content }} />
                                                        )}
                                                        {currentLesson.type === 'Video' && (
                                                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
                                                                <iframe width="100%" height="100%" src={JSON.parse(currentLesson.content || '{}').url?.replace('watch?v=', 'embed/')} frameBorder="0" allowFullScreen></iframe>
                                                            </div>
                                                        )}
                                                        
                                                        {currentLesson.type === 'Hotspot' && (() => {
                                                            const data = JSON.parse(currentLesson.content || '{}');
                                                            return (
                                                                <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                                                                    <img src={data.imageUrl} className="w-full h-auto block"/>
                                                                    {data.hotspots?.map((spot: HotspotItem, i: number) => (
                                                                        <div 
                                                                            key={i} 
                                                                            className="absolute w-8 h-8 bg-indigo-600 rounded-full border-2 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                                                                            style={{left: `${spot.x}%`, top: `${spot.y}%`}}
                                                                        >
                                                                            <span className="group-hover:hidden">+</span>
                                                                            <span className="hidden group-hover:block text-xs">{i+1}</span>
                                                                            
                                                                            {/* Tooltip */}
                                                                            <div className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-64 bg-white p-4 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 text-left text-sm text-slate-600">
                                                                                <div className="font-bold text-slate-900 mb-1">{spot.title}</div>
                                                                                {spot.content}
                                                                                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white transform rotate-45"></div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}

                                                        {currentLesson.type === 'FlipCard' && (() => {
                                                            const data = JSON.parse(currentLesson.content || '{}');
                                                            return (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
                                                                    {data.cards?.map((card: FlipCardItem, i: number) => (
                                                                        <div key={i} className="group h-64 perspective-1000 cursor-pointer">
                                                                            <div className="relative w-full h-full transition-all duration-700 transform-style-3d group-hover:rotate-y-180 shadow-md rounded-2xl">
                                                                                {/* Front */}
                                                                                <div className="absolute inset-0 backface-hidden bg-white border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                                                                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                                                                        <HelpCircle size={24}/>
                                                                                    </div>
                                                                                    <h3 className="font-bold text-xl text-slate-900">{card.front}</h3>
                                                                                    <p className="text-xs text-slate-400 mt-4 uppercase font-bold tracking-wider">Hover voor antwoord</p>
                                                                                </div>
                                                                                {/* Back */}
                                                                                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-2xl flex items-center justify-center p-8 text-center leading-relaxed font-medium">
                                                                                    {card.back}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className="flex justify-end pt-10 border-t border-slate-200">
                                                        <button 
                                                            onClick={() => handleLessonComplete(playingCourse.id, currentLesson.id)}
                                                            className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-1 flex items-center gap-3"
                                                        >
                                                            Afronden & Volgende <ArrowRight size={20}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400">Selecteer een les om te beginnen.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AcademyPage;
