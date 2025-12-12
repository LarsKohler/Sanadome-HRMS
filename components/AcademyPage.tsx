
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Play, CheckCircle2, ChevronRight, ChevronLeft, Layout, 
    Plus, Edit3, Trash2, Save, X, MoreVertical, BookOpen, Clock, 
    Award, BarChart3, Users, Filter, Search, ArrowLeft
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, LearningBlock } from '../types';
import { api } from '../utils/api';
import AcademySidebar from './AcademySidebar';
import { Modal } from './Modal';
import { hasPermission } from '../utils/permissions';

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onExit: () => void;
}

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, onShowToast, onExit }) => {
    const [view, setView] = useState<'dashboard' | 'catalog' | 'player' | 'builder' | 'certificates'>('dashboard');
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    
    // Player State
    const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

    // Builder State
    const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);

    const isManager = hasPermission(currentUser, 'MANAGE_ACADEMY');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const c = await api.getAcademyCourses();
        const p = await api.getAcademyProgress(); // In real app, filter by currentUser inside API or here
        // Filtering progress for current user
        const myProgress = p.filter(prog => prog.employeeId === currentUser.id);
        
        setCourses(c);
        setUserProgress(myProgress);
    };

    // --- PLAYER LOGIC ---

    const handleStartCourse = (course: AcademyCourse) => {
        setActiveCourse(course);
        
        // Find where user left off or start new
        const progress = userProgress.find(p => p.courseId === course.id);
        if (progress && progress.status === 'In Progress') {
             // Logic to resume would go here, for now start at beginning if no deep linking
             if (course.modules.length > 0 && course.modules[0].lessons.length > 0) {
                 setSelectedModuleId(course.modules[0].id);
                 setSelectedLessonId(course.modules[0].lessons[0].id);
             }
        } else {
             if (course.modules.length > 0 && course.modules[0].lessons.length > 0) {
                 setSelectedModuleId(course.modules[0].id);
                 setSelectedLessonId(course.modules[0].lessons[0].id);
             }
        }
        
        setView('player');
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
            // End of course
            handleFinishCourse();
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
        if(!activeCourse) return;
        
        // CHECK FOR EXISTING PROGRESS TO REUSE ID (Prevent Duplicates)
        const existingProgress = userProgress.find(p => p.courseId === activeCourse.id && p.employeeId === currentUser.id);

        const progress: AcademyProgress = {
            id: existingProgress ? existingProgress.id : crypto.randomUUID(), // Reuse ID or create new
            employeeId: currentUser.id,
            courseId: activeCourse.id,
            status: 'Completed',
            progressPercentage: 100,
            completedLessonIds: [], // Would track actual IDs in real app
            quizScores: {},
            startDate: existingProgress ? existingProgress.startDate : new Date().toLocaleDateString('nl-NL'), // Keep original start date
            completedDate: new Date().toLocaleDateString('nl-NL')
        };

        await api.saveAcademyProgress(progress);
        
        // Update local state: Ensure we remove ANY old entry for this course before adding the updated one
        setUserProgress(prev => [...prev.filter(p => p.courseId !== progress.courseId), progress]);
        
        onShowToast(`Gefeliciteerd! Je hebt ${activeCourse.title} afgerond.`);
        setView('dashboard');
    };

    // --- BUILDER LOGIC ---

    const handleCreateCourse = () => {
        const newCourse: AcademyCourse = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Cursus',
            description: '',
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
        setView('builder');
    };

    const handleEditCourse = (course: AcademyCourse) => {
        setEditingCourse(course);
        setView('builder');
    };

    const handleSaveCourse = async () => {
        if (editingCourse) {
            await api.saveAcademyCourse(editingCourse);
            await loadData();
            onShowToast("Cursus opgeslagen.");
            setView('dashboard'); // Or back to manage list
        }
    };

    const addModule = () => {
        if (!editingCourse) return;
        const newModule: AcademyModule = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Module',
            lessons: []
        };
        setEditingCourse({
            ...editingCourse,
            modules: [...editingCourse.modules, newModule]
        });
    };

    const addLesson = (moduleId: string) => {
        if (!editingCourse) return;
        const newLesson: AcademyLesson = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Les',
            blocks: [{ id: crypto.randomUUID(), type: 'text', content: { html: 'Start hier...', style: 'paragraph' }}],
            durationMinutes: 5
        };
        
        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === moduleId) {
                return { ...m, lessons: [...m.lessons, newLesson] };
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
                {courses.map(course => {
                    const prog = userProgress.find(p => p.courseId === course.id);
                    return (
                        <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase">{course.category}</span>
                                {prog?.status === 'Completed' && <CheckCircle2 className="text-green-500" size={20} />}
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
                                    className="w-full mt-4 py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors"
                                >
                                    Starten
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {isManager && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900">Beheer Cursussen</h2>
                        <button onClick={handleCreateCourse} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800">
                            <Plus size={16} /> Nieuwe Cursus
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {courses.map(course => (
                            <div key={course.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <div className="font-bold text-slate-900">{course.title}</div>
                                    <div className="text-xs text-slate-500">{course.category} • {course.modules.length} modules</div>
                                </div>
                                <button onClick={() => handleEditCourse(course)} className="p-2 text-slate-400 hover:text-indigo-600">
                                    <Edit3 size={18} />
                                </button>
                            </div>
                        ))}
                        {courses.length === 0 && <div className="p-8 text-center text-slate-400 italic">Geen cursussen beschikbaar.</div>}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPlayer = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return null;
        
        // Find current lesson
        const module = activeCourse.modules.find(m => m.id === selectedModuleId);
        const lesson = module?.lessons.find(l => l.id === selectedLessonId);

        if (!lesson) return <div>Les niet gevonden</div>;

        return (
            <div className="flex flex-col h-full">
                {/* Player Header */}
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
                                    {mod.lessons.map(les => (
                                        <button
                                            key={les.id}
                                            onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(les.id); }}
                                            className={`w-full text-left px-6 py-3 text-sm font-medium border-l-4 transition-colors ${
                                                selectedLessonId === les.id 
                                                ? 'bg-white border-indigo-600 text-indigo-700' 
                                                : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                                            }`}
                                        >
                                            {les.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        <div className="max-w-3xl mx-auto">
                            <h1 className="text-3xl font-bold text-slate-900 mb-6">{lesson.title}</h1>
                            
                            {/* Render Blocks */}
                            <div className="space-y-8">
                                {lesson.blocks.map(block => (
                                    <div key={block.id}>
                                        {block.type === 'text' && (
                                            <div className="prose prose-slate max-w-none">
                                                {/* In a real app, use a markdown parser or HTML sanitizer */}
                                                <div dangerouslySetInnerHTML={{ __html: block.content.html }}></div>
                                            </div>
                                        )}
                                        {block.type === 'video' && (
                                            <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                                                <iframe src={block.content.url} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
                                            </div>
                                        )}
                                        {/* Add other block renderers here */}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between">
                                <button onClick={handlePlayerPrev} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                    <ChevronLeft size={18} /> Vorige
                                </button>
                                <button onClick={handlePlayerNext} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200">
                                    Volgende <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBuilder = () => {
        if (!editingCourse) return null;

        return (
            <div className="h-full flex flex-col">
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
                    <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-slate-800 font-bold text-sm">Annuleren</button>
                    <h2 className="font-bold text-slate-900">Cursus Bewerken</h2>
                    <button onClick={handleSaveCourse} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-2">
                        <Save size={16}/> Opslaan
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Course Info */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titel</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-lg"
                                    value={editingCourse.title}
                                    onChange={e => setEditingCourse({...editingCourse, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Beschrijving</label>
                                <textarea 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={editingCourse.description}
                                    onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categorie</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        value={editingCourse.category}
                                        onChange={e => setEditingCourse({...editingCourse, category: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Niveau</label>
                                    <select 
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        value={editingCourse.level}
                                        onChange={e => setEditingCourse({...editingCourse, level: e.target.value as any})}
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modules */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 text-lg">Modules</h3>
                                <button onClick={addModule} className="text-sm font-bold text-indigo-600 hover:underline">+ Module Toevoegen</button>
                            </div>
                            
                            {editingCourse.modules.map((mod, mIdx) => (
                                <div key={mod.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="mb-4">
                                        <input 
                                            type="text" 
                                            className="w-full font-bold text-slate-800 border-none p-0 focus:ring-0 text-lg"
                                            value={mod.title}
                                            onChange={e => {
                                                const newModules = [...editingCourse.modules];
                                                newModules[mIdx].title = e.target.value;
                                                setEditingCourse({...editingCourse, modules: newModules});
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2 ml-4 border-l-2 border-slate-100 pl-4">
                                        {mod.lessons.map((les, lIdx) => (
                                            <div key={les.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium">{les.title}</span>
                                                <button className="text-xs text-slate-400 hover:text-indigo-600 font-bold">Bewerk Inhoud</button>
                                            </div>
                                        ))}
                                        <button onClick={() => addLesson(mod.id)} className="text-xs font-bold text-indigo-600 mt-2 hover:underline">+ Les Toevoegen</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
                {view === 'player' && renderPlayer()}
                {view === 'builder' && renderBuilder()}
                {/* Fallback for other views */}
                {(view === 'catalog' || view === 'certificates' || view.startsWith('manage')) && (
                    <div className="p-10 text-center text-slate-400">
                        <h2 className="text-xl font-bold mb-2">Work in Progress</h2>
                        <p>Deze module is nog in ontwikkeling.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AcademyPage;
