import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, CheckCircle, Search, Plus, Edit2, Trash2, 
    BookOpen, GraduationCap, ChevronRight, ChevronDown, 
    Layout, Save, ArrowLeft, MoreVertical, FileText, 
    Video, HelpCircle, Image as ImageIcon, MousePointer, 
    Layers, Columns, GitBranch, List, Upload, Check, GripVertical, X, Circle
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

// --- HELPER COMPONENTS FOR BUILDER ---

const LessonTypeIcon = ({ type }: { type: LessonType }) => {
    switch (type) {
        case 'Video': return <Video size={14} className="text-red-500" />;
        case 'Quiz': return <HelpCircle size={14} className="text-purple-500" />;
        case 'Hotspot': return <MousePointer size={14} className="text-orange-500" />;
        case 'Process': return <List size={14} className="text-blue-500" />;
        case 'FlipCard': return <Layers size={14} className="text-indigo-500" />;
        case 'BeforeAfter': return <Columns size={14} className="text-teal-500" />;
        case 'Branching': return <GitBranch size={14} className="text-pink-500" />;
        default: return <FileText size={14} className="text-slate-500" />;
    }
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
        // Find first lesson
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
            onShowToast("Cursus voltooid! Gefeliciteerd!");
        } else {
            onShowToast("Les afgerond.");
        }

        await api.saveAcademyProgress(progress);
        loadData(); // Refresh local state
    };

    // --- BUILDER LOGIC ---

    const handleOpenBuilder = (course?: AcademyCourse) => {
        if (course) {
            // Deep copy to avoid mutating state directly
            setActiveCourse(JSON.parse(JSON.stringify(course)));
        } else {
            // New Course
            setActiveCourse({
                id: Math.random().toString(36).substr(2, 9),
                title: 'Nieuwe Cursus',
                description: '',
                category: 'General',
                level: 'Beginner',
                modules: [],
                targetRoles: ['All'],
                createdAt: new Date().toLocaleDateString('nl-NL'),
                author: currentUser.name,
                isPublished: false
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
            title: 'Nieuwe Module',
            lessons: []
        };
        setActiveCourse({
            ...activeCourse,
            modules: [...activeCourse.modules, newModule]
        });
        setHasUnsavedChanges(true);
    };

    const addLesson = (moduleId: string) => {
        if (!activeCourse) return;
        const newLesson: AcademyLesson = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Nieuwe Les',
            type: 'Text',
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

    const deleteLesson = (moduleId: string, lessonId: string) => {
        if (!confirm("Les verwijderen?")) return;
        if (!activeCourse) return;
        
        const updatedModules = activeCourse.modules.map(m => {
            if (m.id === moduleId) {
                return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
            }
            return m;
        });
        
        setActiveCourse({ ...activeCourse, modules: updatedModules });
        if (selectedLessonId === lessonId) setSelectedLessonId(null);
        setHasUnsavedChanges(true);
    };

    // --- EDITOR RENDERERS ---

    const renderLessonEditor = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return null;
        
        const module = activeCourse.modules.find(m => m.id === selectedModuleId);
        const lesson = module?.lessons.find(l => l.id === selectedLessonId);
        
        if (!lesson) return null;

        const handleContentChange = (newContent: any) => {
            // Automatically stringify for storage
            updateLesson(selectedModuleId, selectedLessonId, { content: JSON.stringify(newContent) });
        };

        // Try parse content
        let parsedContent: any = {};
        try {
            parsedContent = lesson.content ? JSON.parse(lesson.content) : {};
        } catch (e) {
            parsedContent = {}; // Fallback if plain text or error
            if (lesson.type === 'Text') parsedContent = { text: lesson.content }; 
        }

        return (
            <div className="p-6 bg-slate-50 h-full overflow-y-auto">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titel</label>
                            <input 
                                className="w-full p-2 border rounded-lg font-bold"
                                value={lesson.title}
                                onChange={(e) => updateLesson(selectedModuleId, selectedLessonId, { title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type Les</label>
                            <select 
                                className="w-full p-2 border rounded-lg"
                                value={lesson.type}
                                onChange={(e) => updateLesson(selectedModuleId, selectedLessonId, { type: e.target.value as LessonType })}
                            >
                                <option value="Text">Tekst & Lezen</option>
                                <option value="Video">Video</option>
                                <option value="Quiz">Toets / Quiz</option>
                                <option value="Hotspot">Interactieve Afbeelding (Hotspot)</option>
                                <option value="Process">Stappenplan</option>
                                <option value="FlipCard">Draaikaarten</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* DYNAMIC EDITOR AREA */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                    
                    {lesson.type === 'Text' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inhoud (Markdown)</label>
                            <textarea 
                                className="w-full h-96 p-4 border border-slate-200 rounded-xl font-mono text-sm leading-relaxed"
                                value={typeof parsedContent === 'string' ? parsedContent : (parsedContent.text || lesson.content)}
                                onChange={(e) => updateLesson(selectedModuleId, selectedLessonId, { content: e.target.value })} // Store raw text for simple type
                                placeholder="# Titel\n\nSchrijf hier je lesmateriaal..."
                            />
                        </div>
                    )}

                    {lesson.type === 'Video' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video URL (YouTube/Vimeo)</label>
                            <input 
                                className="w-full p-3 border rounded-xl mb-4"
                                value={parsedContent.url || ''}
                                onChange={(e) => handleContentChange({ ...parsedContent, url: e.target.value })}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                            {parsedContent.url && (
                                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src={parsedContent.url.replace('watch?v=', 'embed/')} 
                                        frameBorder="0" 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    )}

                    {lesson.type === 'Quiz' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Vragen ({parsedContent.questions?.length || 0})</label>
                                <button 
                                    onClick={() => {
                                        const newQ: QuizQuestion = {
                                            id: Math.random().toString(),
                                            question: 'Nieuwe vraag',
                                            options: ['Optie A', 'Optie B'],
                                            correctOptionIndex: 0
                                        };
                                        handleContentChange({ ...parsedContent, questions: [...(parsedContent.questions || []), newQ] });
                                    }}
                                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold"
                                >
                                    + Vraag
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                {(parsedContent.questions || []).map((q: QuizQuestion, qIdx: number) => (
                                    <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex gap-2 mb-2">
                                            <span className="font-bold text-slate-400">#{qIdx+1}</span>
                                            <input 
                                                className="flex-1 bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none font-medium"
                                                value={q.question}
                                                onChange={(e) => {
                                                    const newQs = [...parsedContent.questions];
                                                    newQs[qIdx].question = e.target.value;
                                                    handleContentChange({ ...parsedContent, questions: newQs });
                                                }}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const newQs = parsedContent.questions.filter((_:any, i:number) => i !== qIdx);
                                                    handleContentChange({ ...parsedContent, questions: newQs });
                                                }}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2 pl-6">
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-3">
                                                    <input 
                                                        type="radio"
                                                        name={`correct-${q.id}`}
                                                        checked={q.correctOptionIndex === oIdx}
                                                        onChange={() => {
                                                            const newQs = [...parsedContent.questions];
                                                            newQs[qIdx].correctOptionIndex = oIdx;
                                                            handleContentChange({ ...parsedContent, questions: newQs });
                                                        }}
                                                    />
                                                    <input 
                                                        className="flex-1 p-1 text-sm border rounded bg-white"
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const newQs = [...parsedContent.questions];
                                                            newQs[qIdx].options[oIdx] = e.target.value;
                                                            handleContentChange({ ...parsedContent, questions: newQs });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lesson.type === 'Hotspot' && (
                        <div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Afbeelding URL</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 p-2 border rounded-lg text-sm"
                                        value={parsedContent.imageUrl || ''}
                                        onChange={(e) => handleContentChange({ ...parsedContent, imageUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                    <button className="bg-slate-100 p-2 rounded-lg border border-slate-200"><Upload size={16}/></button>
                                </div>
                            </div>
                            
                            {parsedContent.imageUrl && (
                                <div className="relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-100">
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
                                    {(parsedContent.hotspots || []).map((spot: HotspotItem, idx: number) => (
                                        <div 
                                            key={spot.id}
                                            className="absolute w-6 h-6 bg-indigo-600 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
                                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                            onClick={(e) => { e.stopPropagation(); /* Select spot to edit */ }}
                                        >
                                            {idx + 1}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 space-y-4">
                                <h4 className="font-bold text-sm text-slate-700">Hotspots Bewerken</h4>
                                {(parsedContent.hotspots || []).map((spot: HotspotItem, idx: number) => (
                                    <div key={spot.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-3">
                                        <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input 
                                                className="w-full p-1 text-sm font-bold bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none"
                                                value={spot.title}
                                                onChange={(e) => {
                                                    const newSpots = [...parsedContent.hotspots];
                                                    newSpots[idx].title = e.target.value;
                                                    handleContentChange({ ...parsedContent, hotspots: newSpots });
                                                }}
                                            />
                                            <textarea 
                                                className="w-full p-2 text-xs border rounded bg-white"
                                                value={spot.content}
                                                onChange={(e) => {
                                                    const newSpots = [...parsedContent.hotspots];
                                                    newSpots[idx].content = e.target.value;
                                                    handleContentChange({ ...parsedContent, hotspots: newSpots });
                                                }}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newSpots = parsedContent.hotspots.filter((_:any, i:number) => i !== idx);
                                                handleContentChange({ ...parsedContent, hotspots: newSpots });
                                            }}
                                            className="text-slate-400 hover:text-red-500 self-start"
                                        >
                                            <X size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lesson.type === 'Process' && (
                        <div>
                            <button 
                                onClick={() => {
                                    const newStep: ProcessStep = { id: Math.random().toString(), title: 'Nieuwe Stap', description: '' };
                                    handleContentChange({ ...parsedContent, steps: [...(parsedContent.steps || []), newStep] });
                                }}
                                className="mb-4 text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold"
                            >
                                + Stap Toevoegen
                            </button>
                            <div className="space-y-4">
                                {(parsedContent.steps || []).map((step: ProcessStep, idx: number) => (
                                    <div key={step.id} className="flex gap-4 items-start">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{idx + 1}</div>
                                            {idx < (parsedContent.steps?.length || 0) - 1 && <div className="w-0.5 h-12 bg-slate-200 my-1"></div>}
                                        </div>
                                        <div className="flex-1 p-4 border border-slate-200 rounded-xl bg-slate-50">
                                            <input 
                                                className="w-full font-bold bg-transparent border-b border-slate-300 mb-2 focus:border-indigo-500 outline-none"
                                                value={step.title}
                                                onChange={(e) => {
                                                    const newSteps = [...parsedContent.steps];
                                                    newSteps[idx].title = e.target.value;
                                                    handleContentChange({ ...parsedContent, steps: newSteps });
                                                }}
                                            />
                                            <textarea 
                                                className="w-full text-sm bg-white border border-slate-200 rounded p-2"
                                                value={step.description}
                                                onChange={(e) => {
                                                    const newSteps = [...parsedContent.steps];
                                                    newSteps[idx].description = e.target.value;
                                                    handleContentChange({ ...parsedContent, steps: newSteps });
                                                }}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newSteps = parsedContent.steps.filter((_:any, i:number) => i !== idx);
                                                handleContentChange({ ...parsedContent, steps: newSteps });
                                            }}
                                            className="text-slate-300 hover:text-red-500 mt-2"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (view === 'builder' && activeCourse) {
        return (
            <div className="flex flex-col h-screen bg-white">
                {/* Builder Header */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-20 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('manage-courses')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                            <ArrowLeft size={20}/>
                        </button>
                        <div>
                            <input 
                                className="font-bold text-slate-900 text-lg border-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-2 -ml-2"
                                value={activeCourse.title}
                                onChange={(e) => { setActiveCourse({...activeCourse, title: e.target.value}); setHasUnsavedChanges(true); }}
                            />
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{activeCourse.level}</span>
                                <span>{activeCourse.category}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 mr-2">{hasUnsavedChanges ? 'Wijzigingen niet opgeslagen' : 'Opgeslagen'}</span>
                        <button 
                            onClick={saveBuilderChanges}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                                hasUnsavedChanges 
                                ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700' 
                                : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                            <Save size={16}/> Opslaan
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Structure Sidebar */}
                    <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inhoudsopgave</span>
                            <button onClick={addModule} className="p-1 hover:bg-indigo-50 rounded text-indigo-600">
                                <Plus size={18}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-4">
                            {activeCourse.modules.map((module, mIdx) => (
                                <div key={module.id} className="border border-slate-100 rounded-xl overflow-hidden">
                                    <div 
                                        className={`p-3 flex items-center gap-2 cursor-pointer hover:bg-slate-50 ${selectedModuleId === module.id && !selectedLessonId ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'bg-slate-50'}`}
                                        onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(null); }}
                                    >
                                        <GripVertical size={14} className="text-slate-300"/>
                                        <input 
                                            className="flex-1 bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                            value={module.title}
                                            onChange={(e) => {
                                                const updated = [...activeCourse.modules];
                                                updated[mIdx].title = e.target.value;
                                                setActiveCourse({...activeCourse, modules: updated});
                                                setHasUnsavedChanges(true);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button onClick={() => addLesson(module.id)} className="text-slate-400 hover:text-indigo-600">
                                            <Plus size={14}/>
                                        </button>
                                    </div>
                                    
                                    <div className="bg-white">
                                        {module.lessons.map((lesson, lIdx) => (
                                            <div 
                                                key={lesson.id}
                                                className={`pl-8 pr-3 py-2 text-sm flex items-center gap-3 cursor-pointer border-t border-slate-50 hover:bg-slate-50 group ${selectedLessonId === lesson.id ? 'bg-indigo-50/50 text-indigo-700 font-medium' : 'text-slate-600'}`}
                                                onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(lesson.id); }}
                                            >
                                                <LessonTypeIcon type={lesson.type} />
                                                <span className="truncate flex-1">{lesson.title}</span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteLesson(module.id, lesson.id); }}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                        ))}
                                        {module.lessons.length === 0 && (
                                            <div className="py-2 pl-8 text-xs text-slate-300 italic">Geen lessen</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 overflow-hidden bg-slate-50">
                        {selectedLessonId ? (
                            renderLessonEditor()
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Layout size={48} className="mb-4 opacity-20"/>
                                <p>Selecteer een les om te bewerken</p>
                                <p className="text-sm mt-1">of pas de cursus instellingen aan.</p>
                                
                                {activeCourse && (
                                    <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
                                        <h3 className="font-bold text-slate-900 mb-4">Cursus Instellingen</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Beschrijving</label>
                                                <textarea 
                                                    className="w-full p-2 border rounded-lg text-sm"
                                                    value={activeCourse.description}
                                                    onChange={(e) => { setActiveCourse({...activeCourse, description: e.target.value}); setHasUnsavedChanges(true); }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categorie</label>
                                                    <input 
                                                        className="w-full p-2 border rounded-lg text-sm"
                                                        value={activeCourse.category}
                                                        onChange={(e) => { setActiveCourse({...activeCourse, category: e.target.value}); setHasUnsavedChanges(true); }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Niveau</label>
                                                    <select 
                                                        className="w-full p-2 border rounded-lg text-sm"
                                                        value={activeCourse.level}
                                                        onChange={(e) => { setActiveCourse({...activeCourse, level: e.target.value as any}); setHasUnsavedChanges(true); }}
                                                    >
                                                        <option value="Beginner">Beginner</option>
                                                        <option value="Intermediate">Intermediate</option>
                                                        <option value="Advanced">Advanced</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                                <input 
                                                    type="checkbox"
                                                    id="pub"
                                                    checked={activeCourse.isPublished}
                                                    onChange={(e) => { setActiveCourse({...activeCourse, isPublished: e.target.checked}); setHasUnsavedChanges(true); }}
                                                />
                                                <label htmlFor="pub" className="text-sm font-bold text-slate-700">Gepubliceerd</label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- STANDARD VIEWS ---

    const renderDashboard = () => {
        const myStartedCourses = courses.filter(c => userProgress.some(p => p.courseId === c.id && p.employeeId === currentUser.id));
        
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Mijn Learning Dashboard</h2>
                    {(currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker') && (
                        <button 
                            onClick={() => setView('manage-courses')}
                            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            Beheer Academy
                        </button>
                    )}
                </div>
                
                {myStartedCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myStartedCourses.map(course => {
                            const prog = userProgress.find(p => p.courseId === course.id && p.employeeId === currentUser.id);
                            return (
                                <div key={course.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">{course.category}</span>
                                        {prog?.status === 'Completed' && <CheckCircle size={20} className="text-green-500"/>}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-2">{course.title}</h3>
                                    <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden">
                                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-1000" style={{width: `${prog?.progressPercentage || 0}%`}}></div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-bold">{prog?.progressPercentage}% Voltooid</span>
                                        <button onClick={() => startCourse(course)} className="text-sm font-bold text-indigo-600 hover:underline group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                            {prog?.status === 'Completed' ? 'Opnieuw bekijken' : 'Verder gaan'} <ChevronRight size={14}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                        <GraduationCap size={48} className="mx-auto text-slate-300 mb-4"/>
                        <h3 className="text-lg font-bold text-slate-900">Nog geen cursussen gestart</h3>
                        <p className="text-slate-500 mb-4">Bekijk de catalogus om te beginnen met leren.</p>
                        <button onClick={() => setView('catalog')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Naar Catalogus</button>
                    </div>
                )}
            </div>
        );
    };

    const renderManageCourses = () => (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                    <h2 className="text-2xl font-bold text-slate-900">Cursus Beheer</h2>
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
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {courses.map(course => (
                            <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{course.title}</td>
                                <td className="px-6 py-4 text-slate-600">{course.category}</td>
                                <td className="px-6 py-4 text-slate-600">{course.modules.length}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${course.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {course.isPublished ? 'Gepubliceerd' : 'Concept'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleOpenBuilder(course)} 
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                    >
                                        Open Builder
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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Cursus Catalogus</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Zoek cursus..." 
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.filter(c => c.isPublished && c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(course => (
                    <div key={course.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col h-full">
                        <div className="h-32 bg-slate-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                            {course.coverImage ? (
                                <img src={course.coverImage} className="w-full h-full object-cover" alt={course.title}/>
                            ) : (
                                <BookOpen size={32} className="text-slate-300"/>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => startCourse(course)} className="bg-white text-slate-900 p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Play size={20} className="ml-1"/>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{course.category}</span>
                            <h3 className="font-bold text-slate-900 mb-2 line-clamp-1">{course.title}</h3>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold pt-4 border-t border-slate-50">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{course.level}</span>
                            <span className="text-slate-400">{course.modules.reduce((a,b)=>a+b.lessons.length,0)} lessen</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {view !== 'builder' && (
                <AcademySidebar 
                    activeView={view} 
                    onChangeView={(v) => setView(v)} 
                    onExit={onExit} 
                    currentUser={currentUser} 
                />
            )}
            
            <main className="flex-1 overflow-hidden flex flex-col">
                {view === 'builder' ? (
                    renderLessonEditor() || renderLessonEditor() // Fallback handled inside
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {view === 'dashboard' && renderDashboard()}
                        {view === 'catalog' && renderCatalog()}
                        {view === 'manage-courses' && renderManageCourses()}
                        
                        {/* Simple Player Placeholder if view is player (Should be robust component in real app) */}
                        {view === 'player' && playingCourse && (
                            <div className="p-8 h-full flex flex-col">
                                <button onClick={() => setView('dashboard')} className="self-start mb-4 flex items-center gap-2 text-slate-500 font-bold text-sm"><ArrowLeft size={16}/> Terug</button>
                                <div className="bg-white rounded-3xl shadow-xl flex-1 border border-slate-200 flex overflow-hidden">
                                    <div className="w-80 border-r border-slate-200 bg-slate-50 p-6 overflow-y-auto">
                                        <h3 className="font-bold text-slate-900 mb-4">{playingCourse.title}</h3>
                                        <div className="space-y-4">
                                            {playingCourse.modules.map(mod => (
                                                <div key={mod.id}>
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">{mod.title}</div>
                                                    <div className="space-y-1">
                                                        {mod.lessons.map(les => {
                                                            const isCompleted = userProgress.find(p => p.courseId === playingCourse.id && p.employeeId === currentUser.id)?.completedLessonIds.includes(les.id);
                                                            const isCurrent = currentLesson?.id === les.id;
                                                            return (
                                                                <button 
                                                                    key={les.id}
                                                                    onClick={() => setCurrentLesson(les)}
                                                                    className={`w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 ${isCurrent ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
                                                                >
                                                                    {isCompleted ? <CheckCircle size={14} className="text-green-500"/> : <Circle size={14} className="text-slate-300"/>}
                                                                    <span className="truncate">{les.title}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-1 p-10 overflow-y-auto">
                                        {currentLesson ? (
                                            <div className="max-w-3xl mx-auto">
                                                <h2 className="text-3xl font-bold text-slate-900 mb-6">{currentLesson.title}</h2>
                                                
                                                {/* RENDER CONTENT BASED ON TYPE */}
                                                <div className="prose prose-slate mb-10">
                                                    {currentLesson.type === 'Text' && (
                                                        <div dangerouslySetInnerHTML={{ __html: JSON.parse(currentLesson.content || '{}').text?.replace(/\n/g, '<br/>') || currentLesson.content }} />
                                                    )}
                                                    {currentLesson.type === 'Video' && (
                                                        <div className="aspect-video bg-black rounded-xl overflow-hidden">
                                                            <iframe width="100%" height="100%" src={JSON.parse(currentLesson.content || '{}').url?.replace('watch?v=', 'embed/')} frameBorder="0" allowFullScreen></iframe>
                                                        </div>
                                                    )}
                                                    {/* Other types would be rendered here */}
                                                </div>

                                                <button 
                                                    onClick={() => handleLessonComplete(playingCourse.id, currentLesson.id)}
                                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
                                                >
                                                    Afronden & Volgende
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400">Selecteer een les</div>
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