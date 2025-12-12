
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Play, CheckCircle2, ChevronRight, ChevronLeft, Layout, 
    Plus, Edit3, Trash2, Save, X, MoreVertical, BookOpen, Clock, 
    Award, BarChart3, Users, Filter, Search, ArrowLeft, GraduationCap,
    Download, PieChart, FileCheck, AlertCircle, Type, Image as ImageIcon,
    Video, HelpCircle, GripVertical, ArrowUp, ArrowDown, Eye, Layers, Settings, Shield, User
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, LearningBlock } from '../types';
import { api } from '../utils/api';
import AcademySidebar from './AcademySidebar';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

interface AcademyPageProps {
    currentUser: Employee;
    employees: Employee[];
    onShowToast: (message: string) => void;
    onExit: () => void;
}

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, employees, onShowToast, onExit }) => {
    const [view, setView] = useState<'dashboard' | 'catalog' | 'player' | 'builder' | 'certificates' | 'manage-courses' | 'manage-students' | 'manage-analytics'>('dashboard');
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    const [allProgress, setAllProgress] = useState<AcademyProgress[]>([]);
    
    // Player State
    const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({}); // Store local quiz answers

    // Builder State
    const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);
    const [activeBuilderModuleId, setActiveBuilderModuleId] = useState<string | null>(null);
    const [activeBuilderLessonId, setActiveBuilderLessonId] = useState<string | null>(null);
    const [builderPreviewMode, setBuilderPreviewMode] = useState(false);

    // Catalog State
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogCategory, setCatalogCategory] = useState('All');

    const isManager = hasPermission(currentUser, 'MANAGE_ACADEMY');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const c = await api.getAcademyCourses();
        const p = await api.getAcademyProgress(); 
        
        setCourses(c);
        setAllProgress(p); 
        
        const myProgress = p.filter(prog => prog.employeeId === currentUser.id);
        setUserProgress(myProgress);
    };

    // --- PLAYER LOGIC ---

    const handleStartCourse = (course: AcademyCourse) => {
        setActiveCourse(course);
        
        const progress = userProgress.find(p => p.courseId === course.id);
        
        // Find first lesson or resume
        let initialModuleId = course.modules[0]?.id;
        let initialLessonId = course.modules[0]?.lessons[0]?.id;

        if (progress && progress.status === 'In Progress' && progress.completedLessonIds.length > 0) {
             // Logic to find next uncompleted lesson could go here
             // For now, default to start to keep it simple, or last accessed
        }
        
        if (initialModuleId && initialLessonId) {
            setSelectedModuleId(initialModuleId);
            setSelectedLessonId(initialLessonId);
        }
        
        // Start tracking if not started
        if (!progress) {
            const newProgress: AcademyProgress = {
                id: crypto.randomUUID(),
                employeeId: currentUser.id,
                courseId: course.id,
                status: 'In Progress',
                progressPercentage: 0,
                completedLessonIds: [],
                quizScores: {},
                startDate: new Date().toLocaleDateString('nl-NL')
            };
            api.saveAcademyProgress(newProgress);
            setUserProgress([...userProgress, newProgress]);
        }

        setView('player');
    };

    const handleCompleteLesson = async (moduleId: string, lessonId: string) => {
        if (!activeCourse) return;
        
        // Find current progress object
        const currentProgress = userProgress.find(p => p.courseId === activeCourse.id);
        if (!currentProgress) return; // Should exist by now

        // Check if already completed
        if (currentProgress.completedLessonIds.includes(lessonId)) {
            handlePlayerNext();
            return;
        }

        // Calculate new progress
        const totalLessons = activeCourse.modules.reduce((acc, m) => acc + m.lessons.length, 0);
        const newCompletedIds = [...currentProgress.completedLessonIds, lessonId];
        const newPercentage = Math.round((newCompletedIds.length / totalLessons) * 100);
        
        const updatedProgress: AcademyProgress = {
            ...currentProgress,
            completedLessonIds: newCompletedIds,
            progressPercentage: newPercentage,
            status: newPercentage === 100 ? 'Completed' : 'In Progress',
            completedDate: newPercentage === 100 ? new Date().toLocaleDateString('nl-NL') : undefined
        };

        // Optimistic update
        setUserProgress(prev => prev.map(p => p.id === updatedProgress.id ? updatedProgress : p));
        setAllProgress(prev => prev.map(p => p.id === updatedProgress.id ? updatedProgress : p));
        
        // Persist
        await api.saveAcademyProgress(updatedProgress);

        if (newPercentage === 100) {
            onShowToast(`Cursus voltooid! Gefeliciteerd!`);
            handleFinishCourse();
        } else {
            handlePlayerNext();
        }
    };

    const handlePlayerNext = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return;

        let foundCurrent = false;
        let nextModuleId: string | null = null;
        let nextLessonId: string | null = null;

        for (const module of activeCourse.modules) {
            for (const lesson of module.lessons) {
                if (foundCurrent) {
                    nextModuleId = module.id;
                    nextLessonId = lesson.id;
                    break;
                }
                if (lesson.id === selectedLessonId) {
                    foundCurrent = true;
                }
            }
            if (nextLessonId) break;
        }

        if (nextLessonId && nextModuleId) {
            setSelectedModuleId(nextModuleId);
            setSelectedLessonId(nextLessonId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // End of course logic handled in completion
            if (userProgress.find(p => p.courseId === activeCourse.id)?.status === 'Completed') {
                setView('dashboard');
            }
        }
    };

    const handlePlayerPrev = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return;

        let prevModuleId: string | null = null;
        let prevLessonId: string | null = null;
        let lastModuleId: string | null = null;
        let lastLessonId: string | null = null;

        for (const module of activeCourse.modules || []) {
            for (const lesson of module.lessons || []) {
                if (lesson.id === selectedLessonId) {
                    prevModuleId = lastModuleId;
                    prevLessonId = lastLessonId;
                    break;
                }
                lastModuleId = module.id;
                lastLessonId = lesson.id;
            }
            if (prevLessonId) break;
        }

        if (prevLessonId && prevModuleId) {
            setSelectedModuleId(prevModuleId);
            setSelectedLessonId(prevLessonId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFinishCourse = async () => {
        setView('dashboard');
    };

    // --- BUILDER LOGIC ---

    const handleCreateCourse = () => {
        const newCourse: AcademyCourse = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Cursus',
            description: 'Beschrijf hier waar de cursus over gaat...',
            category: 'Algemeen',
            level: 'Beginner',
            modules: [],
            targetRoles: ['All'],
            createdAt: new Date().toLocaleDateString('nl-NL'),
            author: currentUser.name,
            isPublished: false,
            xpPoints: 100
        };
        setEditingCourse(newCourse);
        setActiveBuilderModuleId(null);
        setActiveBuilderLessonId(null);
        setView('builder');
    };

    const handleEditCourse = (course: AcademyCourse) => {
        setEditingCourse(JSON.parse(JSON.stringify(course))); // Deep copy
        setActiveBuilderModuleId(course.modules.length > 0 ? course.modules[0].id : null);
        setActiveBuilderLessonId(course.modules.length > 0 && course.modules[0].lessons.length > 0 ? course.modules[0].lessons[0].id : null);
        setView('builder');
    };

    const handleDeleteCourse = async (id: string) => {
        if(confirm("Weet je zeker dat je deze cursus wilt verwijderen?")) {
            await api.deleteAcademyCourse(id);
            setCourses(prev => prev.filter(c => c.id !== id));
            onShowToast("Cursus verwijderd.");
        }
    };

    const handleTogglePublish = async (course: AcademyCourse) => {
        const updated = { ...course, isPublished: !course.isPublished };
        await api.saveAcademyCourse(updated);
        setCourses(prev => prev.map(c => c.id === course.id ? updated : c));
        onShowToast(updated.isPublished ? "Cursus gepubliceerd." : "Cursus offline gehaald.");
    };

    const handleSaveCourse = async () => {
        if (editingCourse) {
            await api.saveAcademyCourse(editingCourse);
            await loadData();
            onShowToast("Cursus opgeslagen.");
            setView('manage-courses'); 
        }
    };

    // -- Builder Structure Manipulations --

    const addModule = () => {
        if (!editingCourse) return;
        const newModule: AcademyModule = {
            id: crypto.randomUUID(),
            title: 'Nieuw Hoofdstuk',
            lessons: []
        };
        setEditingCourse({
            ...editingCourse,
            modules: [...editingCourse.modules, newModule]
        });
        setActiveBuilderModuleId(newModule.id);
    };

    const addLesson = (moduleId: string) => {
        if (!editingCourse) return;
        const newLesson: AcademyLesson = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Les',
            blocks: [],
            durationMinutes: 5
        };
        
        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === moduleId) {
                return { ...m, lessons: [...m.lessons, newLesson] };
            }
            return m;
        });

        setEditingCourse({ ...editingCourse, modules: updatedModules });
        setActiveBuilderLessonId(newLesson.id);
    };

    const addBlock = (type: 'text' | 'image' | 'video' | 'quiz') => {
        if (!editingCourse || !activeBuilderModuleId || !activeBuilderLessonId) return;

        let content = {};
        if (type === 'text') content = { html: 'Start hier met typen...', style: 'paragraph' };
        if (type === 'image') content = { url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80', caption: '' };
        if (type === 'video') content = { url: '', source: 'youtube' };
        if (type === 'quiz') content = { question: 'Nieuwe vraag?', type: 'single', options: [{id: '1', text: 'Optie A', isCorrect: true}, {id: '2', text: 'Optie B', isCorrect: false}] };

        const newBlock: LearningBlock = {
            id: crypto.randomUUID(),
            type,
            content
        };

        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === activeBuilderModuleId) {
                const updatedLessons = m.lessons.map(l => {
                    if (l.id === activeBuilderLessonId) {
                        return { ...l, blocks: [...l.blocks, newBlock] };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setEditingCourse({ ...editingCourse, modules: updatedModules });
    };

    const updateBlock = (blockId: string, newContent: any) => {
        if (!editingCourse || !activeBuilderModuleId || !activeBuilderLessonId) return;

        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === activeBuilderModuleId) {
                const updatedLessons = m.lessons.map(l => {
                    if (l.id === activeBuilderLessonId) {
                        const updatedBlocks = l.blocks.map(b => 
                            b.id === blockId ? { ...b, content: { ...b.content, ...newContent } } : b
                        );
                        return { ...l, blocks: updatedBlocks };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setEditingCourse({ ...editingCourse, modules: updatedModules });
    };

    const deleteBlock = (blockId: string) => {
        if (!editingCourse || !activeBuilderModuleId || !activeBuilderLessonId) return;

        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === activeBuilderModuleId) {
                const updatedLessons = m.lessons.map(l => {
                    if (l.id === activeBuilderLessonId) {
                        return { ...l, blocks: l.blocks.filter(b => b.id !== blockId) };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setEditingCourse({ ...editingCourse, modules: updatedModules });
    };

    const moveBlock = (blockId: string, direction: 'up' | 'down') => {
        if (!editingCourse || !activeBuilderModuleId || !activeBuilderLessonId) return;

        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === activeBuilderModuleId) {
                const updatedLessons = m.lessons.map(l => {
                    if (l.id === activeBuilderLessonId) {
                        const idx = l.blocks.findIndex(b => b.id === blockId);
                        if (idx < 0) return l;
                        if (direction === 'up' && idx === 0) return l;
                        if (direction === 'down' && idx === l.blocks.length - 1) return l;

                        const newBlocks = [...l.blocks];
                        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
                        [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
                        
                        return { ...l, blocks: newBlocks };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setEditingCourse({ ...editingCourse, modules: updatedModules });
    };

    // --- RENDER HELPERS ---

    const renderDashboard = () => (
        <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Mijn Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.filter(c => c.isPublished || isManager).map(course => {
                    const prog = userProgress.find(p => p.courseId === course.id);
                    return (
                        <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                            {/* Course Image */}
                            <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                                {course.coverImage ? (
                                    <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <BookOpen size={48} />
                                    </div>
                                )}
                                {prog?.status === 'Completed' && (
                                    <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1 shadow-md">
                                        <CheckCircle2 size={16} />
                                    </div>
                                )}
                                {!course.isPublished && (
                                    <div className="absolute top-3 left-3 bg-amber-500 text-white px-2 py-1 rounded text-xs font-bold shadow-md">
                                        Draft
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{course.category}</span>
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                        <Award size={12} /> {course.xpPoints} XP
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-2">{course.title}</h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                                
                                {prog ? (
                                    <div className="mt-auto">
                                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                            <span>Voortgang</span>
                                            <span>{prog.progressPercentage}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                                            <div className="h-full bg-indigo-500" style={{width: `${prog.progressPercentage}%`}}></div>
                                        </div>
                                        <button 
                                            onClick={() => handleStartCourse(course)}
                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                                        >
                                            {prog.status === 'Completed' ? 'Opnieuw Bekijken' : 'Verder Gaan'}
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleStartCourse(course)}
                                        className="w-full mt-auto py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors"
                                    >
                                        Starten
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderCatalog = () => {
        const filteredCourses = courses.filter(c => {
            if (!c.isPublished && !isManager) return false;
            const matchSearch = c.title.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                                c.description.toLowerCase().includes(catalogSearch.toLowerCase());
            const matchCat = catalogCategory === 'All' || c.category === catalogCategory;
            return matchSearch && matchCat;
        });

        const categories = ['All', ...new Set(courses.map(c => c.category))];

        return (
            <div className="p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Catalogus</h2>
                    <p className="text-slate-500">Ontdek nieuwe trainingen en ontwikkel jezelf.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input 
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Zoek een cursus..."
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCatalogCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${
                                    catalogCategory === cat 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => {
                        const prog = userProgress.find(p => p.courseId === course.id);
                        return (
                            <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden group">
                                <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                                    {course.coverImage ? (
                                        <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                            <GraduationCap size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2 py-1 rounded">{course.level}</span>
                                    </div>
                                    {!course.isPublished && (
                                        <div className="absolute top-3 left-3 bg-amber-500 text-white px-2 py-1 rounded text-xs font-bold shadow-md">
                                            Draft
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-1">{course.title}</h3>
                                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                                    
                                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium mb-4">
                                        <span className="flex items-center gap-1"><Clock size={12}/> {course.modules.length} modules</span>
                                        <span className="flex items-center gap-1"><Award size={12}/> {course.xpPoints} XP</span>
                                    </div>

                                    <button 
                                        onClick={() => handleStartCourse(course)}
                                        className={`w-full mt-auto py-2.5 rounded-lg font-bold text-sm transition-colors ${
                                            prog 
                                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        {prog ? (prog.status === 'Completed' ? 'Opnieuw Bekijken' : 'Verder Gaan') : 'Start Cursus'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredCourses.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
                            <Search className="mx-auto text-slate-300 mb-4" size={48}/>
                            <h3 className="text-lg font-bold text-slate-900">Geen cursussen gevonden</h3>
                            <p className="text-slate-500">Probeer een andere zoekterm of categorie.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- PLAYER & BLOCK RENDERER ---

    const renderBlock = (block: LearningBlock) => {
        switch(block.type) {
            case 'text':
                return (
                    <div className={`prose prose-slate max-w-none ${block.content.style === 'h1' ? 'text-2xl font-bold text-slate-900' : 'text-slate-700'}`}>
                        {block.content.style === 'alert' ? (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-900 rounded-r-lg my-4 flex items-start gap-3">
                                <AlertCircle size={20} className="shrink-0 mt-0.5"/>
                                <div dangerouslySetInnerHTML={{ __html: block.content.html }}></div>
                            </div>
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: block.content.html }}></div>
                        )}
                    </div>
                );
            case 'image':
                return (
                    <div className="my-6">
                        <img src={block.content.url} alt={block.content.caption} className="rounded-xl shadow-sm w-full object-cover max-h-[500px]" />
                        {block.content.caption && <p className="text-center text-xs text-slate-500 mt-2">{block.content.caption}</p>}
                    </div>
                );
            case 'video':
                return (
                    <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg my-6">
                        <iframe src={block.content.url} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
                    </div>
                );
            case 'quiz':
                return (
                    <div className="my-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <HelpCircle size={20} className="text-indigo-600"/> Quiz: {block.content.question}
                        </h4>
                        <div className="space-y-2">
                            {block.content.options.map((opt: any) => {
                                const isSelected = quizAnswers[block.id] === opt.id;
                                const showResult = !!quizAnswers[block.id];
                                const isCorrect = opt.isCorrect;
                                
                                let styleClass = "border-slate-200 hover:border-indigo-300";
                                if (showResult) {
                                    if (isCorrect) styleClass = "bg-green-100 border-green-300 text-green-800";
                                    else if (isSelected && !isCorrect) styleClass = "bg-red-100 border-red-300 text-red-800";
                                    else styleClass = "opacity-50 border-slate-200";
                                } else if (isSelected) {
                                    styleClass = "border-indigo-500 bg-indigo-50 text-indigo-900";
                                }

                                return (
                                    <label key={opt.id} className={`flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer transition-colors ${styleClass}`}>
                                        <input 
                                            type="radio" 
                                            name={`quiz-${block.id}`} 
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                                            disabled={showResult}
                                            onChange={() => setQuizAnswers(prev => ({ ...prev, [block.id]: opt.id }))}
                                        />
                                        <span className="text-sm font-medium">{opt.text}</span>
                                        {showResult && isCorrect && <CheckCircle2 size={16} className="text-green-600 ml-auto"/>}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderPlayer = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return null;
        
        const module = activeCourse.modules.find(m => m.id === selectedModuleId);
        const lesson = module?.lessons.find(l => l.id === selectedLessonId);

        if (!lesson) return <div>Les niet gevonden</div>;

        // Check if current lesson is completed
        const prog = userProgress.find(p => p.courseId === activeCourse.id);
        const isCompleted = prog?.completedLessonIds.includes(lesson.id);

        return (
            <div className="flex flex-col h-full bg-white">
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
                    <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold text-sm">
                        <ArrowLeft size={18} /> Terug naar Dashboard
                    </button>
                    <h2 className="font-bold text-slate-900">{activeCourse.title}</h2>
                    <div className="w-24"></div> 
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Navigation */}
                    <div className="w-80 bg-slate-50 border-r border-slate-200 overflow-y-auto">
                        {activeCourse.modules.map(mod => (
                            <div key={mod.id} className="border-b border-slate-200 last:border-0">
                                <div className="px-4 py-3 bg-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">
                                    {mod.title}
                                </div>
                                <div>
                                    {mod.lessons.map(les => {
                                        const isDone = prog?.completedLessonIds.includes(les.id);
                                        return (
                                            <button
                                                key={les.id}
                                                onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(les.id); }}
                                                className={`w-full text-left px-6 py-3 text-sm font-medium border-l-4 transition-colors flex justify-between items-center ${
                                                    selectedLessonId === les.id 
                                                    ? 'bg-white border-indigo-600 text-indigo-700' 
                                                    : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                                                }`}
                                            >
                                                <span>{les.title}</span>
                                                {isDone && <CheckCircle2 size={14} className="text-green-500"/>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-3xl font-bold text-slate-900">{lesson.title}</h1>
                                {isCompleted && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Voltooid</span>}
                            </div>
                            
                            <div className="space-y-6">
                                {lesson.blocks.map(block => (
                                    <div key={block.id}>
                                        {renderBlock(block)}
                                    </div>
                                ))}
                                {lesson.blocks.length === 0 && (
                                    <p className="text-slate-400 italic">Deze les heeft nog geen inhoud.</p>
                                )}
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                                <button onClick={handlePlayerPrev} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                    <ChevronLeft size={18} /> Vorige
                                </button>
                                
                                <button 
                                    onClick={() => handleCompleteLesson(selectedModuleId!, lesson.id)} 
                                    className={`px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg ${
                                        isCompleted 
                                        ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                                >
                                    {isCompleted ? 'Volgende Les' : 'Afronden & Verder'} <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- VISUAL BUILDER ---

    const renderBuilder = () => {
        if (!editingCourse) return null;

        const activeModule = editingCourse.modules.find(m => m.id === activeBuilderModuleId);
        const activeLesson = activeModule?.lessons.find(l => l.id === activeBuilderLessonId);

        return (
            <div className="h-full flex flex-col bg-slate-50">
                {/* Header */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('manage-courses')} className="text-slate-500 hover:text-slate-800 font-bold text-sm flex items-center gap-2">
                            <ArrowLeft size={16}/> Terug
                        </button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <input 
                            className="font-bold text-slate-900 border-none focus:ring-0 text-lg p-0"
                            value={editingCourse.title}
                            onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setBuilderPreviewMode(!builderPreviewMode)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border transition-all ${builderPreviewMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            <Eye size={16}/> {builderPreviewMode ? 'Bewerk Modus' : 'Preview'}
                        </button>
                        <button onClick={handleSaveCourse} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                            <Save size={16}/> Opslaan
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* LEFT: Structure */}
                    <div className={`w-72 bg-white border-r border-slate-200 flex flex-col ${builderPreviewMode ? 'hidden' : 'flex'}`}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inhoudsopgave</h3>
                            <button onClick={addModule} className="p-1 hover:bg-slate-100 rounded text-indigo-600"><Plus size={16}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-4">
                            {editingCourse.modules.map((mod, mIdx) => (
                                <div key={mod.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    <div className="p-3 flex items-center justify-between group">
                                        <input 
                                            className="bg-transparent font-bold text-sm text-slate-700 w-full focus:outline-none"
                                            value={mod.title}
                                            onChange={(e) => {
                                                const mods = [...editingCourse.modules];
                                                mods[mIdx].title = e.target.value;
                                                setEditingCourse({...editingCourse, modules: mods});
                                            }}
                                        />
                                        <button onClick={() => addLesson(mod.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600"><Plus size={14}/></button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {mod.lessons.map(les => (
                                            <div 
                                                key={les.id} 
                                                onClick={() => { setActiveBuilderModuleId(mod.id); setActiveBuilderLessonId(les.id); }}
                                                className={`px-4 py-2 text-sm cursor-pointer flex justify-between items-center group ${activeBuilderLessonId === les.id ? 'bg-white text-indigo-600 font-bold border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-white'}`}
                                            >
                                                <span className="truncate">{les.title}</span>
                                                {/* Allow renaming lesson in sidebar? keeping simple for now */}
                                            </div>
                                        ))}
                                        {mod.lessons.length === 0 && <div className="px-4 py-2 text-xs text-slate-400 italic">Geen lessen</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <div className="text-xs text-slate-400 mb-2">Metadata</div>
                            <input 
                                className="w-full text-xs p-2 border rounded mb-2" 
                                placeholder="Afbeelding URL"
                                value={editingCourse.coverImage || ''}
                                onChange={(e) => setEditingCourse({...editingCourse, coverImage: e.target.value})}
                            />
                            <select 
                                className="w-full text-xs p-2 border rounded"
                                value={editingCourse.category}
                                onChange={(e) => setEditingCourse({...editingCourse, category: e.target.value})}
                            >
                                <option value="Algemeen">Algemeen</option>
                                <option value="Veiligheid">Veiligheid</option>
                                <option value="Gastvrijheid">Gastvrijheid</option>
                                <option value="IT">IT</option>
                            </select>
                        </div>
                    </div>

                    {/* CENTER: Canvas */}
                    <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                        <div className="max-w-3xl mx-auto bg-white min-h-[800px] shadow-sm rounded-xl p-8 border border-slate-200">
                            {activeLesson ? (
                                <>
                                    <div className="mb-8 border-b border-slate-100 pb-4">
                                        <input 
                                            className="text-3xl font-bold text-slate-900 w-full border-none focus:ring-0 p-0 placeholder:text-slate-300"
                                            placeholder="Titel van de les"
                                            value={activeLesson.title}
                                            onChange={(e) => {
                                                const mods = [...editingCourse.modules];
                                                const m = mods.find(x => x.id === activeBuilderModuleId);
                                                const l = m?.lessons.find(x => x.id === activeBuilderLessonId);
                                                if(l) l.title = e.target.value;
                                                setEditingCourse({...editingCourse, modules: mods});
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        {activeLesson.blocks.map((block, idx) => (
                                            <div key={block.id} className="relative group border border-transparent hover:border-slate-200 rounded-xl p-2 transition-all">
                                                {/* Block Controls */}
                                                {!builderPreviewMode && (
                                                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-slate-200 rounded-lg p-1 z-10">
                                                        <button onClick={() => moveBlock(block.id, 'up')} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700"><ArrowUp size={14}/></button>
                                                        <button onClick={() => moveBlock(block.id, 'down')} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700"><ArrowDown size={14}/></button>
                                                        <div className="w-px bg-slate-200 mx-1"></div>
                                                        <button onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                    </div>
                                                )}

                                                {/* Block Editors */}
                                                {block.type === 'text' && (
                                                    <div>
                                                        {builderPreviewMode ? (
                                                            renderBlock(block)
                                                        ) : (
                                                            <div className="p-2">
                                                                <div className="flex gap-2 mb-2">
                                                                    <button onClick={() => updateBlock(block.id, { style: 'h1' })} className={`px-2 py-1 text-xs font-bold rounded ${block.content.style === 'h1' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>H1</button>
                                                                    <button onClick={() => updateBlock(block.id, { style: 'paragraph' })} className={`px-2 py-1 text-xs font-bold rounded ${block.content.style === 'paragraph' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>P</button>
                                                                    <button onClick={() => updateBlock(block.id, { style: 'alert' })} className={`px-2 py-1 text-xs font-bold rounded ${block.content.style === 'alert' ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>Alert</button>
                                                                </div>
                                                                <textarea 
                                                                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                                                    value={block.content.html}
                                                                    onChange={(e) => updateBlock(block.id, { html: e.target.value })}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {block.type === 'image' && (
                                                    <div>
                                                        {builderPreviewMode ? (
                                                            renderBlock(block)
                                                        ) : (
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                                                                <div className="flex gap-4">
                                                                    {block.content.url && <img src={block.content.url} className="w-24 h-24 object-cover rounded-lg bg-white" />}
                                                                    <div className="flex-1 space-y-2">
                                                                        <input 
                                                                            className="w-full text-sm p-2 border rounded"
                                                                            placeholder="Afbeelding URL..."
                                                                            value={block.content.url}
                                                                            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                                                        />
                                                                        <input 
                                                                            className="w-full text-sm p-2 border rounded"
                                                                            placeholder="Onderschrift..."
                                                                            value={block.content.caption || ''}
                                                                            onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {block.type === 'video' && (
                                                    <div>
                                                        {builderPreviewMode ? (
                                                            renderBlock(block)
                                                        ) : (
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <Video size={20} className="text-slate-400"/>
                                                                    <span className="text-sm font-bold text-slate-600">Video Embed</span>
                                                                </div>
                                                                <input 
                                                                    className="w-full text-sm p-2 border rounded"
                                                                    placeholder="Youtube Embed URL..."
                                                                    value={block.content.url}
                                                                    onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {block.type === 'quiz' && (
                                                    <div>
                                                        {builderPreviewMode ? (
                                                            renderBlock(block)
                                                        ) : (
                                                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                                <input 
                                                                    className="w-full bg-transparent font-bold text-indigo-900 border-none focus:ring-0 p-0 mb-3"
                                                                    placeholder="Vraag..."
                                                                    value={block.content.question}
                                                                    onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                                                                />
                                                                <div className="space-y-2">
                                                                    {block.content.options.map((opt: any, oIdx: number) => (
                                                                        <div key={opt.id} className="flex gap-2 items-center">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    const newOpts = block.content.options.map((o: any) => ({...o, isCorrect: o.id === opt.id}));
                                                                                    updateBlock(block.id, { options: newOpts });
                                                                                }}
                                                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${opt.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 bg-white'}`}
                                                                            >
                                                                                {opt.isCorrect && <CheckCircle2 size={14}/>}
                                                                            </button>
                                                                            <input 
                                                                                className="flex-1 text-sm p-2 border rounded bg-white"
                                                                                value={opt.text}
                                                                                onChange={(e) => {
                                                                                    const newOpts = [...block.content.options];
                                                                                    newOpts[oIdx].text = e.target.value;
                                                                                    updateBlock(block.id, { options: newOpts });
                                                                                }}
                                                                            />
                                                                            <button 
                                                                                onClick={() => {
                                                                                    const newOpts = block.content.options.filter((o: any) => o.id !== opt.id);
                                                                                    updateBlock(block.id, { options: newOpts });
                                                                                }}
                                                                                className="text-slate-400 hover:text-red-500"
                                                                            >
                                                                                <X size={16}/>
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <button 
                                                                        onClick={() => {
                                                                            const newOpts = [...block.content.options, { id: crypto.randomUUID(), text: 'Nieuwe Optie', isCorrect: false }];
                                                                            updateBlock(block.id, { options: newOpts });
                                                                        }}
                                                                        className="text-xs font-bold text-indigo-600 hover:underline pl-8"
                                                                    >
                                                                        + Optie toevoegen
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!builderPreviewMode && (
                                        <div className="mt-8 border-t-2 border-dashed border-slate-200 pt-8 text-center">
                                            <p className="text-sm text-slate-400 mb-4">Voeg een blok toe aan deze les</p>
                                            <div className="flex justify-center gap-4">
                                                <button onClick={() => addBlock('text')} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-600 shadow-sm">
                                                        <Type size={20}/>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Tekst</span>
                                                </button>
                                                <button onClick={() => addBlock('image')} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-600 shadow-sm">
                                                        <ImageIcon size={20}/>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Afbeelding</span>
                                                </button>
                                                <button onClick={() => addBlock('video')} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-600 shadow-sm">
                                                        <Video size={20}/>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Video</span>
                                                </button>
                                                <button onClick={() => addBlock('quiz')} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-600 shadow-sm">
                                                        <HelpCircle size={20}/>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Quiz</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <Layers size={64} className="mb-4 opacity-20"/>
                                    <p className="text-lg font-bold">Selecteer een les om te bewerken</p>
                                    <p className="text-sm">Of maak een nieuwe module/les aan in de zijbalk.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Toolbox (Only visible in edit mode) */}
                    {!builderPreviewMode && (
                        <div className="w-64 bg-white border-l border-slate-200 p-4 hidden xl:block">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Tips & Info</h3>
                            <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
                                <p>Gebruik <strong>Tekst</strong> blokken voor uitleg en theorie.</p>
                                <p>Voeg <strong>Afbeeldingen</strong> toe om concepten te visualiseren. Gebruik directe URLs.</p>
                                <p>Gebruik <strong>Video</strong> voor instructiefilmpjes. YouTube 'Embed' links werken het best.</p>
                                <p>Eindig een les met een <strong>Quiz</strong> om de kennis te toetsen.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderManageCourses = () => {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Beheer Cursussen</h2>
                        <p className="text-slate-500">Overzicht van alle beschikbare trainingen.</p>
                    </div>
                    <button onClick={handleCreateCourse} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-lg">
                        <Plus size={18} /> Nieuwe Cursus
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Cursus</th>
                                <th className="px-6 py-4">Categorie</th>
                                <th className="px-6 py-4">Niveau</th>
                                <th className="px-6 py-4">Modules</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {courses.map(course => (
                                <tr key={course.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900">{course.title}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">{course.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{course.level}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{course.modules.length}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleTogglePublish(course)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${course.isPublished ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                                        >
                                            {course.isPublished ? 'Gepubliceerd' : 'Concept'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEditCourse(course)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteCourse(course.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {courses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Geen cursussen gevonden.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderManageStudents = () => {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Studenten & Voortgang</h2>
                    <p className="text-slate-500">Inzicht in wie welke training volgt.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Medewerker</th>
                                <th className="px-6 py-4">Cursus</th>
                                <th className="px-6 py-4">Voortgang</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Startdatum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allProgress.map(progress => {
                                const employee = employees.find(e => e.id === progress.employeeId);
                                const course = courses.find(c => c.id === progress.courseId);
                                if (!employee || !course) return null;

                                return (
                                    <tr key={progress.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={employee.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="Avatar"/>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">{employee.name}</div>
                                                    <div className="text-xs text-slate-500">{employee.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{course.title}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{width: `${progress.progressPercentage}%`}}></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{progress.progressPercentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                                progress.status === 'Completed' ? 'bg-green-50 text-green-700' : 
                                                progress.status === 'In Progress' ? 'bg-blue-50 text-blue-700' : 
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {progress.status === 'In Progress' ? 'Bezig' : 
                                                 progress.status === 'Completed' ? 'Voltooid' : 'Gestart'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-500 font-mono">
                                            {progress.startDate}
                                        </td>
                                    </tr>
                                );
                            })}
                            {allProgress.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Geen voortgangsdata beschikbaar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderAnalytics = () => {
        const totalEnrollments = allProgress.length;
        const totalCompleted = allProgress.filter(p => p.status === 'Completed').length;
        const completionRate = totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

        const coursePopularity = courses.map(c => ({
            name: c.title,
            students: allProgress.filter(p => p.courseId === c.id).length
        })).sort((a,b) => b.students - a.students).slice(0, 5);

        const statusData = [
            { name: 'Voltooid', value: totalCompleted },
            { name: 'Bezig', value: totalEnrollments - totalCompleted }
        ];
        const COLORS = ['#22c55e', '#3b82f6'];

        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Rapportages</h2>
                    <p className="text-slate-500">Statistieken over leerprestaties.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Totaal Inschrijvingen</div>
                        <div className="text-3xl font-bold text-slate-900">{totalEnrollments}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Voltooide Cursussen</div>
                        <div className="text-3xl font-bold text-green-600">{totalCompleted}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Voltooiingspercentage</div>
                        <div className="text-3xl font-bold text-indigo-600">{completionRate}%</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-96">
                        <h3 className="font-bold text-slate-900 mb-6">Populairste Cursussen</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={coursePopularity} margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="students" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-96">
                        <h3 className="font-bold text-slate-900 mb-6">Status Overzicht</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie 
                                    data={statusData} 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const renderCertificates = () => {
        const completed = userProgress.filter(p => p.status === 'Completed');

        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Mijn Certificaten</h2>
                    <p className="text-slate-500">Bewijzen van deelname voor voltooide trainingen.</p>
                </div>

                {completed.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completed.map(prog => {
                            const course = courses.find(c => c.id === prog.courseId);
                            if (!course) return null;
                            return (
                                <div key={prog.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Award size={80} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 border border-green-100">
                                            <Award size={24} />
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{course.title}</h3>
                                        <p className="text-sm text-slate-500 mb-6">Behaald op {prog.completedDate}</p>
                                        
                                        <button className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2">
                                            <Download size={16}/> Download PDF
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <Award size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">Nog geen certificaten</h3>
                        <p className="text-slate-500 mt-1">Voltooi een cursus om een certificaat te verdienen.</p>
                        <button onClick={() => setView('catalog')} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Naar Catalogus</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <AcademySidebar 
                activeView={view} 
                onChangeView={setView} 
                onExit={onExit} 
                currentUser={currentUser} 
            />
            <main className="flex-1 overflow-y-auto">
                {view === 'dashboard' && renderDashboard()}
                {view === 'catalog' && renderCatalog()}
                {view === 'player' && renderPlayer()}
                {view === 'builder' && renderBuilder()}
                {view === 'certificates' && renderCertificates()}
                {view === 'manage-courses' && renderManageCourses()}
                {view === 'manage-students' && renderManageStudents()}
                {view === 'manage-analytics' && renderAnalytics()}
            </main>
        </div>
    );
};

export default AcademyPage;
