
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    GraduationCap, ArrowLeft, Search, BookOpen, PlayCircle, CheckCircle2, 
    Lock, Clock, Trophy, ArrowRight, Plus, Edit2, X, Video, FileText, HelpCircle, AlertCircle, Award, Check, MoreHorizontal, Users, BarChart3, Filter, PenTool, Settings, Save, Trash2, Layout, Image as ImageIcon, ChevronDown, ChevronUp, ChevronRight
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyLesson, AcademyModule } from '../types';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';
import AcademySidebar from './AcademySidebar';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Modal } from './Modal';

// --- SUB-COMPONENT: ACADEMY INTRO ---
const AcademyIntro = ({ visible }: { visible: boolean }) => {
    return (
        <div className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.3); opacity: 0; }
                }
                @keyframes fill-bar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .animate-pulse-ring {
                    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animate-fill-bar {
                    animation: fill-bar 2s ease-out forwards;
                }
            `}</style>

            <div className="relative flex flex-col items-center">
                {/* Logo Container */}
                <div className="relative mb-8 animate-float">
                    {/* Pulsing Ring Behind */}
                    <div className="absolute inset-0 bg-indigo-100 rounded-3xl animate-pulse-ring -z-10"></div>
                    
                    {/* Main Icon Box */}
                    <div className="w-32 h-32 bg-indigo-50 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100 border border-indigo-100">
                        <GraduationCap size={64} className="text-indigo-600 drop-shadow-sm" />
                    </div>
                </div>

                {/* Text Logo */}
                <h1 className="text-5xl font-serif font-bold text-slate-900 tracking-tight mb-2 animate-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-forwards">
                    Sana<span className="text-indigo-600">Learn</span>
                </h1>
                
                {/* Subtitle */}
                <p className="text-slate-400 text-lg font-medium tracking-widest uppercase text-xs mb-12 animate-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-forwards">
                    Sanadome Academy
                </p>

                {/* Loading Bar */}
                <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-fill-bar rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: ACADEMY PLAYER ---
interface AcademyPlayerProps {
    course: AcademyCourse;
    activeLessonId: string | null;
    setActiveLessonId: (id: string) => void;
    onExit: () => void;
    onCompleteLesson: (lessonId: string, score?: number) => void;
    progress: AcademyProgress | undefined;
    onShowToast: (msg: string) => void;
}

const AcademyPlayer: React.FC<AcademyPlayerProps> = ({ 
    course, activeLessonId, setActiveLessonId, onExit, onCompleteLesson, progress, onShowToast 
}) => {
    const allLessons: { lesson: AcademyLesson, moduleTitle: string }[] = [];
    course.modules.forEach(m => {
        m.lessons.forEach(l => allLessons.push({ lesson: l, moduleTitle: m.title }));
    });

    const activeLessonIndex = allLessons.findIndex(x => x.lesson.id === activeLessonId);
    const activeItem = allLessons[activeLessonIndex];

    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);

    useEffect(() => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(0);
    }, [activeLessonId]);

    const handleNext = () => {
        if (activeLessonIndex < allLessons.length - 1) {
            setActiveLessonId(allLessons[activeLessonIndex + 1].lesson.id);
        } else {
            onShowToast("Einde van de cursus!");
            onExit();
        }
    };

    const handlePrev = () => {
        if (activeLessonIndex > 0) {
            setActiveLessonId(allLessons[activeLessonIndex - 1].lesson.id);
        }
    };

    const submitQuiz = () => {
        if (activeItem.lesson.type !== 'Quiz' || !activeItem.lesson.quizQuestions) return;
        let correct = 0;
        activeItem.lesson.quizQuestions.forEach(q => {
            if (quizAnswers[q.id] === q.correctOptionIndex) correct++;
        });
        const score = Math.round((correct / activeItem.lesson.quizQuestions.length) * 100);
        setQuizScore(score);
        setQuizSubmitted(true);
        if (score >= (activeItem.lesson.passingScore || 70)) {
            onCompleteLesson(activeItem.lesson.id, score);
        }
    };

    if (!activeItem) return <div>Les niet gevonden</div>;

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300 font-sans">
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900">
                        <X size={24}/>
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <h2 className="font-bold text-lg text-slate-900 truncate max-w-md">{course.title}</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block">Voortgang</div>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{width: `${Math.round(((activeLessonIndex) / allLessons.length) * 100)}%`}}></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-20 bg-slate-50">
                    <div className="max-w-4xl mx-auto bg-white min-h-full rounded-2xl shadow-sm border border-slate-200 p-10 md:p-14">
                        <div className="mb-8 pb-8 border-b border-slate-100">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 block">{activeItem.moduleTitle}</span>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{activeItem.lesson.title}</h1>
                        </div>

                        <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed font-sans">
                            {activeItem.lesson.type === 'Text' && (
                                <div className="whitespace-pre-wrap">{activeItem.lesson.content}</div>
                            )}

                            {activeItem.lesson.type === 'Video' && (
                                <div className="aspect-video bg-black rounded-2xl shadow-xl flex items-center justify-center text-white overflow-hidden relative group">
                                    <iframe 
                                        src={activeItem.lesson.content} 
                                        className="w-full h-full"
                                        title="Video Player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}

                            {activeItem.lesson.type === 'Quiz' && activeItem.lesson.quizQuestions && (
                                <div className="space-y-10 not-prose">
                                    {activeItem.lesson.quizQuestions.map((q, idx) => (
                                        <div key={q.id} className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                                            <h4 className="font-bold text-slate-900 mb-6 flex gap-4 text-lg">
                                                <span className="bg-indigo-600 text-white rounded-lg text-sm w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">{idx + 1}</span> 
                                                {q.question}
                                            </h4>
                                            <div className="space-y-3 pl-12">
                                                {q.options.map((opt, optIdx) => (
                                                    <label 
                                                        key={optIdx} 
                                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                            quizSubmitted 
                                                                ? (optIdx === q.correctOptionIndex ? 'bg-green-50 border-green-500 text-green-800' : (quizAnswers[q.id] === optIdx ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-200 opacity-50'))
                                                                : (quizAnswers[q.id] === optIdx ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600 text-indigo-900' : 'bg-white border-slate-200 hover:border-indigo-300')
                                                        }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                            quizAnswers[q.id] === optIdx ? 'border-current' : 'border-slate-300'
                                                        }`}>
                                                            {quizAnswers[q.id] === optIdx && <div className="w-3 h-3 rounded-full bg-current"></div>}
                                                        </div>
                                                        <input 
                                                            type="radio" 
                                                            name={q.id} 
                                                            checked={quizAnswers[q.id] === optIdx}
                                                            onChange={() => !quizSubmitted && setQuizAnswers({...quizAnswers, [q.id]: optIdx})}
                                                            className="hidden" 
                                                        />
                                                        <span className="font-bold">{opt}</span>
                                                        {quizSubmitted && optIdx === q.correctOptionIndex && <CheckCircle2 className="ml-auto text-green-600" size={20}/>}
                                                        {quizSubmitted && quizAnswers[q.id] === optIdx && optIdx !== q.correctOptionIndex && <AlertCircle className="ml-auto text-red-600" size={20}/>}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {!quizSubmitted ? (
                                        <button 
                                            onClick={submitQuiz}
                                            disabled={Object.keys(quizAnswers).length < activeItem.lesson.quizQuestions.length}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                        >
                                            Antwoorden Inleveren
                                        </button>
                                    ) : (
                                        <div className={`p-6 rounded-xl text-center border-2 ${quizScore >= (activeItem.lesson.passingScore || 70) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                            <div className="text-3xl font-bold mb-2">{quizScore}%</div>
                                            <div className="font-bold">{quizScore >= (activeItem.lesson.passingScore || 70) ? 'Geslaagd! Ga door naar de volgende les.' : 'Helaas, probeer het opnieuw.'}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-100">
                            <button 
                                onClick={handlePrev}
                                disabled={activeLessonIndex === 0}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft size={20}/> Vorige
                            </button>
                            {activeItem.lesson.type !== 'Quiz' ? (
                                <button 
                                    onClick={() => {
                                        onCompleteLesson(activeItem.lesson.id);
                                        handleNext();
                                    }}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                                >
                                    Afronden & Volgende <ArrowRight size={20}/>
                                </button>
                            ) : (
                                <button 
                                    onClick={handleNext}
                                    disabled={!quizSubmitted || quizScore < (activeItem.lesson.passingScore || 70)}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                                >
                                    Volgende <ArrowRight size={20}/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lesson Sidebar */}
                <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto hidden xl:block">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Inhoudsopgave</h3>
                    </div>
                    {course.modules.map((module, mIdx) => (
                        <div key={module.id} className="border-b border-slate-50">
                            <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Module {mIdx + 1}</span>
                            </div>
                            <div>
                                {module.lessons.map((lesson, lIdx) => {
                                    const isActive = lesson.id === activeLessonId;
                                    const isCompleted = progress?.completedLessonIds.includes(lesson.id);
                                    
                                    return (
                                        <button 
                                            key={lesson.id}
                                            onClick={() => setActiveLessonId(lesson.id)}
                                            className={`w-full text-left px-6 py-4 text-sm flex items-start gap-4 transition-all border-l-4 ${
                                                isActive ? 'bg-indigo-50 text-indigo-900 border-indigo-600 font-bold' : 
                                                'text-slate-600 hover:bg-slate-50 border-transparent'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                                                isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                                                isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 
                                                'bg-white border-slate-300 text-slate-300'
                                            }`}>
                                                {isCompleted ? <Check size={14} strokeWidth={3}/> : <span className="text-[10px]">{lIdx + 1}</span>}
                                            </div>
                                            <div className="flex-1">
                                                <span className="block leading-snug">{lesson.title}</span>
                                                <span className="text-[10px] text-slate-400 font-normal mt-1 flex items-center gap-1">
                                                    {lesson.type === 'Video' ? <Video size={10}/> : lesson.type === 'Quiz' ? <HelpCircle size={10}/> : <FileText size={10}/>}
                                                    {lesson.durationMinutes} min
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN ACADEMY PAGE ---

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onExit: () => void;
}

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, onShowToast, onExit }) => {
    const [viewMode, setViewMode] = useState<'dashboard' | 'catalog' | 'certificates' | 'player' | 'manage-courses' | 'manage-students' | 'manage-analytics' | 'builder'>('dashboard');
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [allProgress, setAllProgress] = useState<AcademyProgress[]>([]);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    
    // Intro State
    const [showIntro, setShowIntro] = useState(true);
    const [removeIntro, setRemoveIntro] = useState(false);

    // Player State
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

    // Builder State
    const [builderCourse, setBuilderCourse] = useState<AcademyCourse | null>(null);
    const [selectedLessonForEdit, setSelectedLessonForEdit] = useState<AcademyLesson | null>(null);

    // Permissions
    const isManager = hasPermission(currentUser, 'MANAGE_ACADEMY') || currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

    useEffect(() => {
        loadData();
        const timer1 = setTimeout(() => setShowIntro(false), 2200); 
        const timer2 = setTimeout(() => setRemoveIntro(true), 3000); 
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    const loadData = async () => {
        const [c, p, e] = await Promise.all([
            api.getAcademyCourses(),
            api.getAcademyProgress(),
            api.getEmployees()
        ]);
        setCourses(c);
        setAllProgress(p);
        setAllEmployees(e);
    };

    const myProgress = useMemo(() => {
        return allProgress.filter(p => p.employeeId === currentUser.id);
    }, [allProgress, currentUser.id]);

    const getCourseProgress = (courseId: string) => {
        return myProgress.find(p => p.courseId === courseId);
    };

    const isCourseUnlocked = (course: AcademyCourse) => {
        if (!course.prerequisiteCourseIds || course.prerequisiteCourseIds.length === 0) return true;
        return course.prerequisiteCourseIds.every(reqId => {
            const prog = getCourseProgress(reqId);
            return prog && prog.status === 'Completed';
        });
    };

    const handleStartCourse = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        if (!isCourseUnlocked(course)) {
            onShowToast("Rond eerst de vereiste cursussen af.");
            return;
        }

        let progress = getCourseProgress(courseId);
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
            setAllProgress([...allProgress, progress]); 
            api.saveAcademyProgress(progress);
        }

        setActiveCourseId(courseId);
        if (!activeLessonId) {
            const firstLesson = course.modules[0]?.lessons[0]?.id;
            if(firstLesson) setActiveLessonId(firstLesson);
        }
        setViewMode('player');
    };

    const handleCompleteLesson = async (lessonId: string, score?: number) => {
        if (!activeCourseId) return;
        
        let progress = getCourseProgress(activeCourseId);
        if (!progress) return;

        if (!progress.completedLessonIds.includes(lessonId)) {
            const updatedCompleted = [...progress.completedLessonIds, lessonId];
            const updatedScores = score !== undefined ? { ...progress.quizScores, [lessonId]: score } : progress.quizScores;
            
            const course = courses.find(c => c.id === activeCourseId);
            let totalLessons = 0;
            course?.modules.forEach(m => totalLessons += m.lessons.length);
            const percentage = Math.round((updatedCompleted.length / totalLessons) * 100);
            
            const isFinished = percentage === 100;

            const updatedProgress: AcademyProgress = {
                ...progress,
                completedLessonIds: updatedCompleted,
                quizScores: updatedScores,
                progressPercentage: percentage,
                status: isFinished ? 'Completed' : 'In Progress',
                completedDate: isFinished ? new Date().toLocaleDateString('nl-NL') : undefined
            };

            const newProgList = allProgress.map(p => p.id === updatedProgress.id ? updatedProgress : p);
            setAllProgress(newProgList);
            await api.saveAcademyProgress(updatedProgress);

            if (isFinished) {
                onShowToast("Gefeliciteerd! Cursus afgerond.");
            }
        }
    };

    // --- BUILDER ACTIONS ---
    const handleCreateCourse = () => {
        const newCourse: AcademyCourse = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Nieuwe Cursus',
            description: '',
            category: 'Algemeen',
            level: 'Beginner',
            targetRoles: ['All'],
            modules: [],
            createdAt: new Date().toLocaleDateString('nl-NL'),
            author: currentUser.name,
            isPublished: false
        };
        setBuilderCourse(newCourse);
        setViewMode('builder');
    };

    const handleEditCourse = (course: AcademyCourse) => {
        setBuilderCourse(course);
        setViewMode('builder');
    };

    const handleDeleteCourse = async (id: string) => {
        if(confirm("Weet je zeker dat je deze cursus wilt verwijderen?")) {
            await api.deleteAcademyCourse(id);
            setCourses(courses.filter(c => c.id !== id));
            onShowToast("Cursus verwijderd");
        }
    };

    const handleSaveBuilder = async () => {
        if (builderCourse) {
            await api.saveAcademyCourse(builderCourse);
            const exists = courses.find(c => c.id === builderCourse.id);
            if (exists) {
                setCourses(courses.map(c => c.id === builderCourse.id ? builderCourse : c));
            } else {
                setCourses([...courses, builderCourse]);
            }
            onShowToast("Cursus opgeslagen!");
            setViewMode('manage-courses');
        }
    };

    // --- RENDER METHODS ---

    const renderBuilder = () => {
        if (!builderCourse) return null;

        const addModule = () => {
            const newModule: AcademyModule = {
                id: Math.random().toString(36).substr(2, 9),
                title: 'Nieuwe Module',
                lessons: []
            };
            setBuilderCourse({ ...builderCourse, modules: [...builderCourse.modules, newModule] });
        };

        const addLesson = (moduleId: string) => {
            const newLesson: AcademyLesson = {
                id: Math.random().toString(36).substr(2, 9),
                title: 'Nieuwe Les',
                type: 'Text',
                content: '',
                durationMinutes: 5
            };
            const updatedModules = builderCourse.modules.map(m => 
                m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m
            );
            setBuilderCourse({ ...builderCourse, modules: updatedModules });
            setSelectedLessonForEdit(newLesson);
        };

        const updateLesson = (lessonId: string, updates: Partial<AcademyLesson>) => {
            const updatedModules = builderCourse.modules.map(m => ({
                ...m,
                lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
            }));
            setBuilderCourse({ ...builderCourse, modules: updatedModules });
            setSelectedLessonForEdit(prev => prev ? { ...prev, ...updates } : null);
        };

        const updateModuleTitle = (moduleId: string, title: string) => {
            const updatedModules = builderCourse.modules.map(m => 
                m.id === moduleId ? { ...m, title } : m
            );
            setBuilderCourse({ ...builderCourse, modules: updatedModules });
        };

        return (
            <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans">
                {/* Header */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode('manage-courses')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                            <ArrowLeft size={20}/>
                        </button>
                        <h2 className="font-bold text-slate-900">Course Builder</h2>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleSaveBuilder} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 flex items-center gap-2">
                            <Save size={16}/> Opslaan
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Structure Sidebar */}
                    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <input 
                                className="font-bold text-lg bg-transparent border-none focus:ring-0 w-full p-0 text-slate-900" 
                                value={builderCourse.title} 
                                onChange={e => setBuilderCourse({...builderCourse, title: e.target.value})}
                                placeholder="Cursus Titel"
                            />
                            <div className="flex gap-2 mt-2">
                                <select 
                                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1"
                                    value={builderCourse.category}
                                    onChange={e => setBuilderCourse({...builderCourse, category: e.target.value})}
                                >
                                    <option value="Algemeen">Algemeen</option>
                                    <option value="Gastvrijheid">Gastvrijheid</option>
                                    <option value="Veiligheid">Veiligheid</option>
                                    <option value="IT">IT</option>
                                </select>
                                <label className="flex items-center gap-1 text-xs font-bold text-slate-600 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={builderCourse.isPublished} 
                                        onChange={e => setBuilderCourse({...builderCourse, isPublished: e.target.checked})}
                                    /> Publiceren
                                </label>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {builderCourse.modules.map((mod, idx) => (
                                <div key={mod.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">#{idx+1}</span>
                                        <input 
                                            className="bg-transparent text-sm font-bold text-slate-700 w-full focus:outline-none"
                                            value={mod.title}
                                            onChange={e => updateModuleTitle(mod.id, e.target.value)}
                                        />
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {mod.lessons.map(lesson => (
                                            <button 
                                                key={lesson.id}
                                                onClick={() => setSelectedLessonForEdit(lesson)}
                                                className={`w-full text-left p-2 rounded-lg text-xs font-medium flex items-center gap-2 ${selectedLessonForEdit?.id === lesson.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white text-slate-600'}`}
                                            >
                                                {lesson.type === 'Video' ? <Video size={12}/> : lesson.type === 'Quiz' ? <HelpCircle size={12}/> : <FileText size={12}/>}
                                                <span className="truncate">{lesson.title}</span>
                                            </button>
                                        ))}
                                        <button onClick={() => addLesson(mod.id)} className="w-full py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center justify-center gap-1 mt-2 border border-dashed border-indigo-200">
                                            <Plus size={12}/> Les Toevoegen
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addModule} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-400 font-bold rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                                + Module Toevoegen
                            </button>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
                        {selectedLessonForEdit ? (
                            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Les Titel</label>
                                    <input 
                                        className="w-full text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-2 focus:border-indigo-500 focus:outline-none"
                                        value={selectedLessonForEdit.title}
                                        onChange={e => updateLesson(selectedLessonForEdit.id, {title: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                                        <select 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                            value={selectedLessonForEdit.type}
                                            onChange={e => updateLesson(selectedLessonForEdit.id, {type: e.target.value as any})}
                                        >
                                            <option value="Text">Tekst / Artikel</option>
                                            <option value="Video">Video</option>
                                            <option value="Quiz">Toets</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duur (min)</label>
                                        <input 
                                            type="number"
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                            value={selectedLessonForEdit.durationMinutes}
                                            onChange={e => updateLesson(selectedLessonForEdit.id, {durationMinutes: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Inhoud</label>
                                    {selectedLessonForEdit.type === 'Text' && (
                                        <textarea 
                                            className="w-full h-64 p-4 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={selectedLessonForEdit.content}
                                            onChange={e => updateLesson(selectedLessonForEdit.id, {content: e.target.value})}
                                            placeholder="Schrijf hier de lesinhoud (Markdown ondersteund)..."
                                        />
                                    )}
                                    {selectedLessonForEdit.type === 'Video' && (
                                        <input 
                                            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm"
                                            value={selectedLessonForEdit.content}
                                            onChange={e => updateLesson(selectedLessonForEdit.id, {content: e.target.value})}
                                            placeholder="Video URL (Youtube/Vimeo embed link)..."
                                        />
                                    )}
                                    {selectedLessonForEdit.type === 'Quiz' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-slate-500">
                                            <p>Quiz editor functionaliteit. Voeg vragen toe via JSON in content veld voor nu.</p>
                                            <textarea 
                                                className="w-full h-32 mt-2 p-2 border border-slate-300 rounded text-xs"
                                                placeholder="JSON structuur..."
                                                value={JSON.stringify(selectedLessonForEdit.quizQuestions || [])}
                                                onChange={e => {
                                                    try {
                                                        const qs = JSON.parse(e.target.value);
                                                        updateLesson(selectedLessonForEdit.id, {quizQuestions: qs});
                                                    } catch {}
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                Selecteer een les om te bewerken
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (viewMode === 'player') {
        const course = courses.find(c => c.id === activeCourseId);
        if (!course) return <div>Cursus niet gevonden</div>;
        const progress = myProgress.find(p => p.courseId === course.id);

        return (
            <AcademyPlayer 
                course={course}
                activeLessonId={activeLessonId}
                setActiveLessonId={setActiveLessonId}
                onExit={() => setViewMode('dashboard')}
                onCompleteLesson={handleCompleteLesson}
                progress={progress}
                onShowToast={onShowToast}
            />
        );
    }

    if (viewMode === 'builder') return renderBuilder();

    return (
        <>
            {!removeIntro && <AcademyIntro visible={showIntro} />}
            <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
                <AcademySidebar 
                    activeView={viewMode} 
                    onChangeView={setViewMode} 
                    onExit={onExit}
                    currentUser={currentUser}
                />
                
                <main className="flex-1 overflow-y-auto p-8 relative">
                    {viewMode === 'dashboard' && (
                        <div className="space-y-10 animate-in fade-in max-w-7xl mx-auto">
                            {/* Hero Section */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-10 md:p-14 border border-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 transform translate-x-10 -translate-y-10">
                                    <GraduationCap size={300} className="text-indigo-600"/>
                                </div>
                                <div className="relative z-10 max-w-3xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-white rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100 text-indigo-600 shadow-sm">
                                            SanaLearn
                                        </span>
                                        <span className="text-slate-400 font-medium text-sm">Jouw persoonlijke leeromgeving</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight">
                                        Blijf groeien, <br/> <span className="text-indigo-600">{currentUser.name.split(' ')[0]}</span>.
                                    </h2>
                                    <p className="text-slate-600 text-lg mb-8 max-w-xl leading-relaxed">
                                        Ontwikkel nieuwe vaardigheden en blijf op de hoogte van de laatste standaarden binnen Sanadome.
                                    </p>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setViewMode('catalog')}
                                            className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all transform hover:-translate-y-1 flex items-center gap-2"
                                        >
                                            <BookOpen size={20}/> Bekijk Catalogus
                                        </button>
                                        {isManager && (
                                            <button 
                                                onClick={() => setViewMode('manage-courses')}
                                                className="bg-white text-indigo-600 border-2 border-indigo-50 px-8 py-4 rounded-xl font-bold shadow-sm hover:bg-indigo-50 transition-all transform hover:-translate-y-1 flex items-center gap-2"
                                            >
                                                <Settings size={20}/> Beheer Academy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Continue Learning */}
                            {myProgress.some(p => p.status === 'In Progress') && (
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Clock className="text-indigo-600"/> Verder Leren
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {myProgress.filter(p => p.status === 'In Progress').map(prog => {
                                            const course = courses.find(c => c.id === prog.courseId);
                                            if (!course) return null;
                                            return (
                                                <div key={prog.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group" onClick={() => handleStartCourse(course.id)}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-bold uppercase border border-indigo-100">{course.category}</span>
                                                        <span className="text-xs font-bold text-slate-400">{prog.progressPercentage}%</span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 text-lg mb-3 group-hover:text-indigo-700 transition-colors">{course.title}</h4>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${prog.progressPercentage}%` }}></div>
                                                    </div>
                                                    <button className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        Hervatten <ArrowRight size={16}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'catalog' && (
                        <div className="max-w-7xl mx-auto animate-in fade-in">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                        <BookOpen className="text-indigo-600"/> Catalogus
                                    </h2>
                                    <p className="text-slate-500 text-sm mt-1">Ontdek alle beschikbare trainingen.</p>
                                </div>
                                <div className="relative w-full md:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input type="text" placeholder="Zoek cursus..." className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {courses.filter(c => c.isPublished).map(course => {
                                    const isUnlocked = isCourseUnlocked(course);
                                    const progress = getCourseProgress(course.id);
                                    const isCompleted = progress?.status === 'Completed';
                                    return (
                                        <div key={course.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg transition-all ${!isUnlocked ? 'opacity-70' : ''}`}>
                                            <div className="h-48 bg-slate-200 relative overflow-hidden">
                                                {course.coverImage ? (
                                                    <img src={course.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Cover"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                                                        <GraduationCap size={48}/>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                                                {!isUnlocked && (
                                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white gap-2 font-bold backdrop-blur-sm">
                                                        <Lock size={20}/> Vergrendeld
                                                    </div>
                                                )}
                                                {isCompleted && (
                                                    <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                                        <CheckCircle2 size={12}/> Behaald
                                                    </div>
                                                )}
                                                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-white">
                                                    <span className="text-[10px] font-bold uppercase bg-white/20 backdrop-blur-md px-2 py-1 rounded border border-white/30">{course.category}</span>
                                                    <span className="text-[10px] font-bold uppercase">{course.level}</span>
                                                </div>
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 leading-tight">{course.title}</h3>
                                                <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1 leading-relaxed">{course.description}</p>
                                                <button onClick={() => handleStartCourse(course.id)} disabled={!isUnlocked} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${!isUnlocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}>
                                                    {isCompleted ? 'Opnieuw Bekijken' : progress ? 'Hervatten' : 'Starten'}
                                                    {isUnlocked && <PlayCircle size={16}/>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {viewMode === 'manage-courses' && (
                        <div className="max-w-7xl mx-auto animate-in fade-in space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Cursus Beheer</h2>
                                    <p className="text-slate-500 text-sm mt-1">Maak en beheer trainingen voor het personeel.</p>
                                </div>
                                <button onClick={handleCreateCourse} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                                    <Plus size={18}/> Nieuwe Cursus
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cursus Naam</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Categorie</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                            <th className="px-6 py-4 text-right">Acties</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {courses.map(course => (
                                            <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">{course.title}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{course.category}</span></td>
                                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${course.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{course.isPublished ? 'Gepubliceerd' : 'Concept'}</span></td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => handleEditCourse(course)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                                    <button onClick={() => handleDeleteCourse(course.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default AcademyPage;
