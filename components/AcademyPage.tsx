
import React, { useState, useEffect, useMemo } from 'react';
import { 
    GraduationCap, ArrowLeft, Search, Filter, BookOpen, PlayCircle, CheckCircle2, 
    Lock, Star, Clock, Trophy, ChevronRight, LayoutGrid, List, Plus, Trash2, 
    Edit2, Save, X, Video, FileText, HelpCircle, AlertCircle, Award, ArrowRight, Check
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, QuizQuestion } from '../types';
import { api } from '../utils/api';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onChangeView: (view: any) => void; // To go back home
}

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, onShowToast, onChangeView }) => {
    const [viewMode, setViewMode] = useState<'dashboard' | 'catalog' | 'player' | 'builder'>('dashboard');
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    
    // Player State
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

    // Builder State
    const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);

    const isManager = hasPermission(currentUser, 'MANAGE_ACADEMY');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [c, p] = await Promise.all([
            api.getAcademyCourses(),
            api.getAcademyProgress()
        ]);
        setCourses(c);
        // Filter progress for current user
        setUserProgress(p.filter(prog => prog.employeeId === currentUser.id));
    };

    // --- LOGIC ---

    const getCourseProgress = (courseId: string) => {
        return userProgress.find(p => p.courseId === courseId);
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
            // Create initial progress
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
            setUserProgress([...userProgress, progress]);
            api.saveAcademyProgress(progress);
        }

        setActiveCourseId(courseId);
        // Set first lesson if not set
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
            
            // Calc total progress
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

            const newProgList = userProgress.map(p => p.id === updatedProgress.id ? updatedProgress : p);
            setUserProgress(newProgList);
            await api.saveAcademyProgress(updatedProgress);

            if (isFinished) {
                onShowToast("Gefeliciteerd! Cursus afgerond.");
            }
        }
    };

    // --- VIEWS ---

    const renderDashboard = () => {
        const activeCourses = userProgress.filter(p => p.status === 'In Progress');
        const completedCourses = userProgress.filter(p => p.status === 'Completed');

        return (
            <div className="space-y-10 animate-in fade-in">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-800 rounded-3xl p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <GraduationCap size={200} />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-4xl font-bold mb-4 font-serif">Welkom bij Sanadome Academy</h2>
                        <p className="text-indigo-100 text-lg mb-8">
                            Investeer in jezelf. Ontwikkel nieuwe vaardigheden en groei in je rol.
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setViewMode('catalog')}
                                className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
                            >
                                <BookOpen size={20}/> Bekijk Catalogus
                            </button>
                            {isManager && (
                                <button 
                                    onClick={() => setViewMode('builder')}
                                    className="bg-indigo-700 text-white border border-indigo-500 px-6 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={20}/> Cursus Maken
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Continue Learning */}
                {activeCourses.length > 0 && (
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Clock className="text-indigo-600"/> Verder Leren
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeCourses.map(prog => {
                                const course = courses.find(c => c.id === prog.courseId);
                                if (!course) return null;
                                return (
                                    <div key={prog.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleStartCourse(course.id)}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase">{course.category}</span>
                                            <span className="text-xs font-bold text-slate-400">{prog.progressPercentage}%</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-lg mb-2">{course.title}</h4>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${prog.progressPercentage}%` }}></div>
                                        </div>
                                        <button className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                            Hervatten <ArrowRight size={14}/>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Achievements */}
                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Trophy className="text-yellow-500"/> Mijn Certificaten ({completedCourses.length})
                    </h3>
                    {completedCourses.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {completedCourses.map(prog => {
                                const course = courses.find(c => c.id === prog.courseId);
                                return (
                                    <div key={prog.id} className="bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                                            <Award size={24}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900 line-clamp-2">{course?.title}</div>
                                            <div className="text-xs text-slate-400 mt-1">{prog.completedDate}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm italic">Nog geen cursussen afgerond.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderCatalog = () => {
        return (
            <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-900">Catalogus</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Zoek cursus..." 
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.filter(c => c.isPublished).map(course => {
                        const isUnlocked = isCourseUnlocked(course);
                        const progress = getCourseProgress(course.id);
                        const isCompleted = progress?.status === 'Completed';

                        return (
                            <div key={course.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group ${!isUnlocked ? 'opacity-70' : ''}`}>
                                <div className="h-40 bg-slate-200 relative">
                                    {course.coverImage ? (
                                        <img src={course.coverImage} className="w-full h-full object-cover" alt="Cover"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                                            <GraduationCap size={48}/>
                                        </div>
                                    )}
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white gap-2 font-bold backdrop-blur-sm">
                                            <Lock size={20}/> Vergrendeld
                                        </div>
                                    )}
                                    {isCompleted && (
                                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                            <CheckCircle2 size={12}/> Behaald
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-2 flex gap-2">
                                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{course.category}</span>
                                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{course.level}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2">{course.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{course.description}</p>
                                    
                                    <button 
                                        onClick={() => handleStartCourse(course.id)}
                                        disabled={!isUnlocked}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                                            !isUnlocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
                                            'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                        }`}
                                    >
                                        {isCompleted ? 'Opnieuw Bekijken' : progress ? 'Hervatten' : 'Starten'}
                                        {isUnlocked && <PlayCircle size={16}/>}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPlayer = () => {
        const course = courses.find(c => c.id === activeCourseId);
        if (!course) return <div>Cursus niet gevonden</div>;

        // Flatten lessons for navigation
        const allLessons: { lesson: AcademyLesson, moduleTitle: string }[] = [];
        course.modules.forEach(m => {
            m.lessons.forEach(l => allLessons.push({ lesson: l, moduleTitle: m.title }));
        });

        const activeLessonIndex = allLessons.findIndex(x => x.lesson.id === activeLessonId);
        const activeItem = allLessons[activeLessonIndex];
        const progress = getCourseProgress(course.id);

        const handleNext = () => {
            if (activeLessonIndex < allLessons.length - 1) {
                setActiveLessonId(allLessons[activeLessonIndex + 1].lesson.id);
            } else {
                onShowToast("Einde van de cursus!");
                setViewMode('dashboard');
            }
        };

        const handlePrev = () => {
            if (activeLessonIndex > 0) {
                setActiveLessonId(allLessons[activeLessonIndex - 1].lesson.id);
            }
        };

        // Quiz Logic
        const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
        const [quizSubmitted, setQuizSubmitted] = useState(false);
        const [quizScore, setQuizScore] = useState(0);

        useEffect(() => {
            // Reset quiz state on lesson change
            setQuizAnswers({});
            setQuizSubmitted(false);
            setQuizScore(0);
        }, [activeLessonId]);

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
                handleCompleteLesson(activeItem.lesson.id, score);
            }
        };

        return (
            <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Top Bar */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode('dashboard')} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                        <h2 className="font-bold text-slate-900 truncate max-w-md">{course.title}</h2>
                    </div>
                    <div className="text-sm font-bold text-indigo-600">
                        {Math.round(((activeLessonIndex + 1) / allLessons.length) * 100)}%
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Navigation */}
                    <div className="w-80 border-r border-slate-200 bg-slate-50 overflow-y-auto hidden lg:block">
                        {course.modules.map(module => (
                            <div key={module.id} className="border-b border-slate-100">
                                <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100/50">
                                    {module.title}
                                </div>
                                <div>
                                    {module.lessons.map(lesson => {
                                        const isActive = lesson.id === activeLessonId;
                                        const isCompleted = progress?.completedLessonIds.includes(lesson.id);
                                        
                                        return (
                                            <button 
                                                key={lesson.id}
                                                onClick={() => setActiveLessonId(lesson.id)}
                                                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                                                    isActive ? 'bg-white text-indigo-700 border-l-4 border-indigo-600 font-bold' : 
                                                    'text-slate-600 hover:bg-slate-100 border-l-4 border-transparent'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    isCompleted ? 'bg-green-100 text-green-600' : 
                                                    isActive ? 'bg-indigo-100 text-indigo-600' : 
                                                    'bg-slate-200 text-slate-400'
                                                }`}>
                                                    {isCompleted ? <Check size={12} strokeWidth={3}/> : 
                                                     lesson.type === 'Video' ? <Video size={12}/> : 
                                                     lesson.type === 'Quiz' ? <HelpCircle size={12}/> : 
                                                     <FileText size={12}/>}
                                                </div>
                                                <span className="truncate">{lesson.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-white relative">
                        <div className="max-w-3xl mx-auto">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{activeItem.moduleTitle}</span>
                            <h1 className="text-3xl font-bold text-slate-900 mb-8">{activeItem.lesson.title}</h1>

                            {/* Content Type Rendering */}
                            <div className="prose prose-indigo max-w-none mb-12">
                                {activeItem.lesson.type === 'Text' && (
                                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
                                        {activeItem.lesson.content}
                                    </div>
                                )}

                                {activeItem.lesson.type === 'Video' && (
                                    <div className="aspect-video bg-black rounded-xl flex items-center justify-center text-white">
                                        <p>Video Player Placeholder for: {activeItem.lesson.content}</p>
                                    </div>
                                )}

                                {activeItem.lesson.type === 'Quiz' && activeItem.lesson.quizQuestions && (
                                    <div className="space-y-8">
                                        {activeItem.lesson.quizQuestions.map((q, idx) => (
                                            <div key={q.id} className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                                <h4 className="font-bold text-slate-900 mb-4 flex gap-2">
                                                    <span className="bg-indigo-100 text-indigo-700 px-2 rounded text-sm h-6 flex items-center justify-center">{idx + 1}</span> 
                                                    {q.question}
                                                </h4>
                                                <div className="space-y-2">
                                                    {q.options.map((opt, optIdx) => (
                                                        <label 
                                                            key={optIdx} 
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                                quizSubmitted 
                                                                    ? (optIdx === q.correctOptionIndex ? 'bg-green-50 border-green-200' : (quizAnswers[q.id] === optIdx ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 opacity-50'))
                                                                    : (quizAnswers[q.id] === optIdx ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-200')
                                                            }`}
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                name={q.id} 
                                                                checked={quizAnswers[q.id] === optIdx}
                                                                onChange={() => !quizSubmitted && setQuizAnswers({...quizAnswers, [q.id]: optIdx})}
                                                                className="hidden" 
                                                            />
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                quizAnswers[q.id] === optIdx ? 'border-indigo-600' : 'border-slate-300'
                                                            }`}>
                                                                {quizAnswers[q.id] === optIdx && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700">{opt}</span>
                                                            {quizSubmitted && optIdx === q.correctOptionIndex && <CheckCircle2 className="ml-auto text-green-500" size={18}/>}
                                                            {quizSubmitted && quizAnswers[q.id] === optIdx && optIdx !== q.correctOptionIndex && <AlertCircle className="ml-auto text-red-500" size={18}/>}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {!quizSubmitted && (
                                            <button 
                                                onClick={submitQuiz}
                                                disabled={Object.keys(quizAnswers).length < activeItem.lesson.quizQuestions.length}
                                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors w-full"
                                            >
                                                Inleveren
                                            </button>
                                        )}

                                        {quizSubmitted && (
                                            <div className={`p-4 rounded-xl text-center font-bold text-lg ${quizScore >= (activeItem.lesson.passingScore || 70) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                Score: {quizScore}% {quizScore >= (activeItem.lesson.passingScore || 70) ? '- Geslaagd!' : '- Probeer opnieuw'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Navigation Footer */}
                            <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                                <button 
                                    onClick={handlePrev}
                                    disabled={activeLessonIndex === 0}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors flex items-center gap-2"
                                >
                                    <ArrowLeft size={18}/> Vorige
                                </button>
                                {activeItem.lesson.type !== 'Quiz' ? (
                                    <button 
                                        onClick={() => {
                                            handleCompleteLesson(activeItem.lesson.id);
                                            handleNext();
                                        }}
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"
                                    >
                                        Afronden & Volgende <ArrowRight size={18}/>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleNext}
                                        disabled={!quizSubmitted || quizScore < (activeItem.lesson.passingScore || 70)}
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-300"
                                    >
                                        Volgende <ArrowRight size={18}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Placeholder for Builder (can be expanded similarly to Evaluation Template builder)
    const renderBuilder = () => {
        return (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center py-20">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300">
                    <Edit2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Cursus Builder</h2>
                <p className="text-slate-500 mb-6">Deze functionaliteit is in ontwikkeling voor de volgende sprint.</p>
                <button onClick={() => setViewMode('dashboard')} className="text-indigo-600 font-bold hover:underline">Terug naar dashboard</button>
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (viewMode === 'player') return (
        <div className="p-6 h-[calc(100vh-80px)]">
            {renderPlayer()}
        </div>
    );

    return (
        <div className="p-6 md:p-10 w-full max-w-[2400px] mx-auto min-h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => onChangeView('HOME')} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
                        <ArrowLeft size={20}/>
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <GraduationCap className="text-indigo-600" size={32}/> Sanadome Academy
                    </h1>
                </div>
                
                <div className="flex gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    <button 
                        onClick={() => setViewMode('dashboard')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Mijn Overzicht
                    </button>
                    <button 
                        onClick={() => setViewMode('catalog')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'catalog' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Catalogus
                    </button>
                </div>
            </div>

            {viewMode === 'dashboard' && renderDashboard()}
            {viewMode === 'catalog' && renderCatalog()}
            {viewMode === 'builder' && renderBuilder()}

        </div>
    );
};

export default AcademyPage;
