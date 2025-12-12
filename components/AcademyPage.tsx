
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Play, CheckCircle2, ChevronRight, ChevronLeft, Layout, 
    Plus, Edit3, Trash2, Save, X, MoreVertical, BookOpen, Clock, 
    Award, BarChart3, Users, Filter, Search, ArrowLeft, GraduationCap,
    Download, PieChart, FileCheck, AlertCircle, Type, Image as ImageIcon,
    Video, HelpCircle, GripVertical, ArrowUp, ArrowDown, Eye, Layers, Settings, Shield, User,
    Map, Target, Zap, Timer, MousePointer2, ArrowRight as ArrowIcon,
    Bold, Italic, List, Heading1, Link as LinkIcon, Upload, Calendar, Medal, Star, Heart, Trophy, Rocket, Crown, ThumbsUp, Lightbulb, Flame
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, LearningBlock, BlockType, HotspotItem, BadgeIconKey, BadgeColor } from '../types';
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

const BADGE_ICONS: Record<BadgeIconKey, React.ElementType> = {
    'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Heart': Heart, 'Zap': Zap, 'Shield': Shield,
    'Rocket': Rocket, 'Crown': Crown, 'ThumbsUp': ThumbsUp, 'Lightbulb': Lightbulb, 'Flame': Flame,
    'Target': Target, 'Users': Users, 'Eye': Eye
};

const BADGE_COLORS: Record<BadgeColor, string> = {
    'yellow': 'bg-yellow-100 text-yellow-600 border-yellow-200',
    'blue': 'bg-blue-100 text-blue-600 border-blue-200',
    'purple': 'bg-purple-100 text-purple-600 border-purple-200',
    'red': 'bg-red-100 text-red-600 border-red-200',
    'green': 'bg-green-100 text-green-600 border-green-200',
    'pink': 'bg-pink-100 text-pink-600 border-pink-200',
    'orange': 'bg-orange-100 text-orange-600 border-orange-200',
    'slate': 'bg-slate-100 text-slate-600 border-slate-200'
};

// --- RICH TEXT EDITOR COMPONENT ---
const RichTextEditor = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const execCmd = (command: string, value: string | null = null) => {
        document.execCommand(command, false, value);
    };

    // Initialize content
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, []);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 flex-wrap">
                <button onClick={() => execCmd('bold')} className="p-2 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors" title="Dikgedrukt"><Bold size={16}/></button>
                <button onClick={() => execCmd('italic')} className="p-2 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors" title="Cursief"><Italic size={16}/></button>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <button onClick={() => execCmd('formatBlock', 'H3')} className="p-2 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors font-bold text-xs" title="Kop">H3</button>
                <button onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors" title="Lijst"><List size={16}/></button>
            </div>
            <div 
                ref={editorRef}
                className="p-4 min-h-[150px] outline-none prose prose-slate max-w-none text-sm"
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                suppressContentEditableWarning={true}
            />
        </div>
    );
};

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, employees, onShowToast, onExit }) => {
    const [view, setView] = useState<'dashboard' | 'catalog' | 'player' | 'builder' | 'certificates' | 'manage-courses' | 'manage-students' | 'manage-analytics'>('dashboard');
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    const [allProgress, setAllProgress] = useState<AcademyProgress[]>([]);
    
    // Player State
    const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({}); 
    // Interactive State
    const [hotspotState, setHotspotState] = useState<Record<string, string | null>>({}); // blockId -> activeHotspotId
    const [capsuleState, setCapsuleState] = useState<Record<string, string>>({}); // blockId -> text

    // Builder State
    const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);
    const [activeBuilderModuleId, setActiveBuilderModuleId] = useState<string | null>(null);
    const [activeBuilderLessonId, setActiveBuilderLessonId] = useState<string | null>(null);
    const [builderPreviewMode, setBuilderPreviewMode] = useState(false);
    const [isCourseSettingsOpen, setIsCourseSettingsOpen] = useState(false);
    
    // Drag & Drop Builder State
    const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);

    // Catalog State
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogCategory, setCatalogCategory] = useState('All');

    // Upload Refs
    const courseCoverInputRef = useRef<HTMLInputElement>(null);
    const blockImageInputRef = useRef<HTMLInputElement>(null);
    const hotspotImageInputRef = useRef<HTMLInputElement>(null);
    
    // Temporary state to track which block triggered an upload
    const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

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
        
        let initialModuleId = course.modules[0]?.id;
        let initialLessonId = course.modules[0]?.lessons[0]?.id;

        if (initialModuleId && initialLessonId) {
            setSelectedModuleId(initialModuleId);
            setSelectedLessonId(initialLessonId);
        }
        
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
            setUserProgress(prev => [...prev, newProgress]);
        } else if (progress.status === 'Completed') {
            // Re-open course for review, but keep status completed
            setView('player');
            return;
        }

        setView('player');
    };

    const handleCompleteLesson = async (moduleId: string, lessonId: string) => {
        if (!activeCourse) return;
        
        const currentProgress = userProgress.find(p => p.courseId === activeCourse.id);
        if (!currentProgress) return; 

        // If already completed, just move next
        if (currentProgress.completedLessonIds.includes(lessonId)) {
            handlePlayerNext();
            return;
        }

        const totalLessons = activeCourse.modules.reduce((acc, m) => acc + m.lessons.length, 0);
        
        // Ensure unique IDs
        const newCompletedIds = Array.from(new Set([...currentProgress.completedLessonIds, lessonId]));
        
        // Calculate percentage precisely
        const newPercentage = Math.min(100, Math.round((newCompletedIds.length / totalLessons) * 100));
        
        // Check completion based on count, not just percentage to avoid rounding errors
        const isCompleted = newCompletedIds.length >= totalLessons;

        // Calculate Average Score if Completed
        let isBadgeEarned = false;
        let finalScore = 0;

        if (isCompleted) {
            // Simplified: If course has badge config, check logic
            if (activeCourse.badgeConfig && activeCourse.badgeConfig.enabled) {
                finalScore = 100; // Mock score
                if (finalScore >= activeCourse.badgeConfig.minScore) {
                    isBadgeEarned = true;
                }
            }
        }
        
        const updatedProgress: AcademyProgress = {
            ...currentProgress,
            completedLessonIds: newCompletedIds,
            progressPercentage: newPercentage,
            status: isCompleted ? 'Completed' : 'In Progress',
            completedDate: isCompleted ? new Date().toLocaleDateString('nl-NL') : undefined,
            isBadgeEarned,
            finalScore
        };

        // Optimistic Update
        setUserProgress(prev => prev.map(p => p.id === updatedProgress.id ? updatedProgress : p));
        setAllProgress(prev => prev.map(p => p.id === updatedProgress.id ? updatedProgress : p));
        
        await api.saveAcademyProgress(updatedProgress);

        if (isCompleted) {
            onShowToast(isBadgeEarned ? `Cursus voltooid! Je hebt de badge "${activeCourse.badgeConfig?.name}" verdiend!` : `Cursus voltooid!`);
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
            // End of course logic
            const prog = userProgress.find(p => p.courseId === activeCourse.id);
            if (prog?.status === 'Completed') {
                handleFinishCourse();
            } else {
                onShowToast("Je hebt het einde van de lessen bereikt. Rond de laatste les af om te voltooien.");
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
        // Force refresh data to ensure consistency
        await loadData();
    };

    // --- BUILDER LOGIC ---

    const handleCreateCourse = () => {
        const newCourse: AcademyCourse = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Cursus',
            description: 'Korte beschrijving voor in de catalogus...',
            category: 'Algemeen',
            level: 'Beginner',
            modules: [],
            targetRoles: ['All'],
            targetEmployees: [],
            createdAt: new Date().toLocaleDateString('nl-NL'),
            author: currentUser.name,
            isPublished: false,
            xpPoints: 100
        };
        setEditingCourse(newCourse);
        setActiveBuilderModuleId(null);
        setActiveBuilderLessonId(null);
        setView('builder');
        setIsCourseSettingsOpen(true);
    };

    const handleEditCourse = (course: AcademyCourse) => {
        setEditingCourse(JSON.parse(JSON.stringify(course))); // Deep copy
        setActiveBuilderModuleId(course.modules.length > 0 ? course.modules[0].id : null);
        setActiveBuilderLessonId(course.modules.length > 0 && course.modules[0].lessons.length > 0 ? course.modules[0].lessons[0].id : null);
        setView('builder');
    };

    const handleSaveCourse = async () => {
        if (editingCourse) {
            await api.saveAcademyCourse(editingCourse);
            await loadData();
            onShowToast("Cursus opgeslagen.");
            setView('manage-courses'); 
        }
    };

    const handleTogglePublish = async (course: AcademyCourse) => {
        const updated = { ...course, isPublished: !course.isPublished };
        await api.saveAcademyCourse(updated);
        setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
        onShowToast(updated.isPublished ? "Cursus gepubliceerd." : "Cursus teruggetrokken.");
    };

    const handleDeleteCourse = async (id: string) => {
        if(confirm("Weet je zeker dat je deze cursus wilt verwijderen?")) {
            await api.deleteAcademyCourse(id);
            setCourses(prev => prev.filter(c => c.id !== id));
            onShowToast("Cursus verwijderd.");
        }
    };

    // --- UPLOAD HANDLERS ---

    const handleCourseCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editingCourse) {
            onShowToast("Uploaden...");
            const url = await api.uploadFile(e.target.files[0]);
            if (url) {
                setEditingCourse({ ...editingCourse, coverImage: url });
                onShowToast("Omslagfoto bijgewerkt.");
            }
        }
    };

    const handleBlockImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && uploadingBlockId) {
            onShowToast("Afbeelding uploaden...");
            const url = await api.uploadFile(e.target.files[0]);
            if (url) {
                updateBlock(uploadingBlockId, { url: url });
                onShowToast("Afbeelding toegevoegd.");
            }
            setUploadingBlockId(null);
        }
    };

    const handleHotspotImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && uploadingBlockId) {
            onShowToast("Achtergrond uploaden...");
            const url = await api.uploadFile(e.target.files[0]);
            if (url) {
                updateBlock(uploadingBlockId, { imageUrl: url });
                onShowToast("Achtergrond bijgewerkt.");
            }
            setUploadingBlockId(null);
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

    // --- DRAG & DROP LOGIC ---

    const handleDragStart = (e: React.DragEvent, type: BlockType) => {
        e.dataTransfer.setData("blockType", type);
        e.dataTransfer.effectAllowed = "copy";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("blockType") as BlockType;
        if (type) {
            addBlock(type);
        }
    };

    const handleSortStart = (index: number) => {
        setDraggedBlockIndex(index);
    };

    const handleSortOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedBlockIndex === null || draggedBlockIndex === index) return;
        
        if (!editingCourse || !activeBuilderModuleId || !activeBuilderLessonId) return;

        const updatedModules = editingCourse.modules.map(m => {
            if (m.id === activeBuilderModuleId) {
                const updatedLessons = m.lessons.map(l => {
                    if (l.id === activeBuilderLessonId) {
                        const newBlocks = [...l.blocks];
                        const [moved] = newBlocks.splice(draggedBlockIndex, 1);
                        newBlocks.splice(index, 0, moved);
                        return { ...l, blocks: newBlocks };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setEditingCourse({ ...editingCourse, modules: updatedModules });
        setDraggedBlockIndex(index);
    };

    const addBlock = (type: BlockType) => {
        if (!editingCourse || !activeBuilderModuleId || !activeBuilderLessonId) return;

        let content = {};
        switch(type) {
            case 'text': content = { html: 'Start hier met typen...', style: 'paragraph' }; break;
            case 'image': content = { url: '', caption: '' }; break;
            case 'video': content = { url: '', source: 'youtube' }; break;
            case 'quiz': content = { question: 'Nieuwe vraag?', type: 'single', options: [{id: '1', text: 'Optie A', isCorrect: true}, {id: '2', text: 'Optie B', isCorrect: false}] }; break;
            case 'hotspot': content = { imageUrl: '', spots: [] }; break;
            case 'time-capsule': content = { question: 'Wat hoop je te leren?' }; break;
        }

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
                        const index = l.blocks.findIndex(b => b.id === blockId);
                        if (index === -1) return l;
                        
                        const newBlocks = [...l.blocks];
                        if (direction === 'up' && index > 0) {
                            [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
                        } else if (direction === 'down' && index < newBlocks.length - 1) {
                            [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
                        }
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

    // --- NEW RENDERERS FOR INTERACTIVE BLOCKS ---

    const renderHotspotImage = (block: LearningBlock, isEditor: boolean) => {
        const { imageUrl, spots } = block.content;
        
        const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
            if (!isEditor) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            const newSpot: HotspotItem = {
                id: crypto.randomUUID(),
                x, y,
                title: 'Nieuw Punt',
                description: 'Beschrijving...'
            };
            updateBlock(block.id, { spots: [...(spots || []), newSpot] });
        };

        const activeSpotId = hotspotState[block.id];

        // --- SMART TOOLTIP POSITIONING ---
        const getTooltipClasses = (x: number, y: number) => {
            let classes = "absolute mb-3 w-64 bg-white p-4 rounded-xl shadow-xl text-slate-700 text-sm text-left z-20 animate-in fade-in slide-in-from-bottom-2";
            let arrowClasses = "absolute w-3 h-3 bg-white rotate-45";
            
            // Y-Axis: If too high up (< 20%), show below instead of above
            if (y < 20) {
                classes += " top-full mt-3"; // Show below
                arrowClasses += " -top-1.5 left-1/2 -translate-x-1/2 border-t border-l border-slate-100";
            } else {
                classes += " bottom-full mb-3"; // Show above (default)
                arrowClasses += " -bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r border-slate-100";
            }

            // X-Axis: If too far left or right, adjust alignment
            if (x < 15) {
                classes += " left-0 translate-x-4"; // Align left edge
                if (y >= 20) arrowClasses = "absolute -bottom-1.5 left-4 bg-white rotate-45"; // Adjust arrow
            } else if (x > 85) {
                classes += " right-0 -translate-x-4"; // Align right edge
                if (y >= 20) arrowClasses = "absolute -bottom-1.5 right-4 bg-white rotate-45"; // Adjust arrow
            } else {
                classes += " left-1/2 -translate-x-1/2"; // Center
            }

            return { container: classes, arrow: arrowClasses };
        };

        return (
            <div className={`relative rounded-xl border border-slate-200 bg-slate-50 min-h-[300px] flex items-center justify-center group ${isEditor ? '' : 'overflow-hidden'}`}>
                {imageUrl ? (
                    <>
                        <img 
                            src={imageUrl} 
                            className={`w-full h-auto object-cover rounded-xl ${isEditor ? 'cursor-crosshair' : ''}`}
                            onClick={handleImageClick}
                            alt="Hotspot Base"
                        />
                        {isEditor && (
                            <button 
                                onClick={() => { setUploadingBlockId(block.id); hotspotImageInputRef.current?.click(); }}
                                className="absolute top-4 right-4 bg-white/90 p-2 rounded-lg shadow-sm hover:bg-white text-slate-700 text-xs font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ImageIcon size={14}/> Wijzig Afbeelding
                            </button>
                        )}
                    </>
                ) : (
                    isEditor ? (
                        <div 
                            onClick={() => { setUploadingBlockId(block.id); hotspotImageInputRef.current?.click(); }}
                            className="flex flex-col items-center justify-center p-10 cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                            <ImageIcon size={48} className="mb-2"/>
                            <span className="font-bold text-sm">Klik om achtergrond te uploaden</span>
                        </div>
                    ) : <div className="p-10 text-center text-slate-400 italic">Geen afbeelding beschikbaar</div>
                )}

                {(spots || []).map((spot: HotspotItem) => {
                    const pos = getTooltipClasses(spot.x, spot.y);
                    // Use same smart positioning logic for editor controls to prevent clipping
                    const editorPos = isEditor ? pos : { container: '', arrow: '' };
                    
                    return (
                    <div
                        key={spot.id}
                        className="absolute w-8 h-8 -ml-4 -mt-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold cursor-pointer hover:scale-110 transition-transform z-10"
                        style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                        onClick={() => !isEditor && setHotspotState(prev => ({ ...prev, [block.id]: activeSpotId === spot.id ? null : spot.id }))}
                    >
                        <Plus size={16} className={`transition-transform ${activeSpotId === spot.id ? 'rotate-45' : ''}`} />
                        
                        {/* Tooltip for Player */}
                        {!isEditor && activeSpotId === spot.id && (
                            <div className={pos.container} onClick={(e) => e.stopPropagation()}>
                                <h4 className="font-bold text-slate-900 mb-1">{spot.title}</h4>
                                <p>{spot.description}</p>
                                <div className={pos.arrow}></div>
                            </div>
                        )}
                        
                        {/* Editor Controls - Use smart positioning to avoid clipping */}
                        {isEditor && (
                            <div className={`${editorPos.container} w-56 flex flex-col gap-2 p-3 bg-white shadow-xl border border-slate-100`} onClick={(e) => e.stopPropagation()}>
                                <input 
                                    className="border rounded px-2 py-1 text-xs text-black font-bold w-full" 
                                    value={spot.title} 
                                    placeholder="Titel"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const newSpots = spots.map((s: any) => s.id === spot.id ? { ...s, title: e.target.value } : s);
                                        updateBlock(block.id, { spots: newSpots });
                                    }}
                                />
                                <textarea
                                    className="border rounded px-2 py-1 text-xs text-black w-full resize-none"
                                    rows={2}
                                    placeholder="Beschrijving"
                                    value={spot.description}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const newSpots = spots.map((s: any) => s.id === spot.id ? { ...s, description: e.target.value } : s);
                                        updateBlock(block.id, { spots: newSpots });
                                    }}
                                />
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newSpots = spots.filter((s: any) => s.id !== spot.id);
                                        updateBlock(block.id, { spots: newSpots });
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs w-full text-right font-bold"
                                >
                                    Verwijder Punt
                                </button>
                                <div className={editorPos.arrow}></div>
                            </div>
                        )}
                    </div>
                )})}
            </div>
        );
    };

    const renderTimeCapsule = (block: LearningBlock, isEditor: boolean) => {
        return (
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-amber-600">
                    <Timer size={24}/>
                </div>
                <h4 className="font-bold text-amber-900 mb-2">Tijdscapsule Reflectie</h4>
                
                {isEditor ? (
                    <input 
                        className="w-full text-center bg-white border border-amber-200 rounded p-2 text-amber-900"
                        value={block.content.question}
                        onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                    />
                ) : (
                    <>
                        <p className="text-amber-800 mb-4">{block.content.question}</p>
                        <textarea 
                            className="w-full p-4 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Schrijf hier je antwoord..."
                            rows={3}
                            value={capsuleState[block.id] || ''}
                            onChange={(e) => setCapsuleState(prev => ({...prev, [block.id]: e.target.value}))}
                        />
                        <div className="mt-4 text-xs text-amber-600 italic">
                            Dit antwoord wordt opgeslagen en aan het einde van de cursus weer getoond.
                        </div>
                    </>
                )}
            </div>
        );
    };

    // --- MAIN RENDERER SWITCH ---

    const renderBlockContent = (block: LearningBlock, isEditor: boolean) => {
        switch(block.type) {
            case 'text':
                return isEditor && !builderPreviewMode ? (
                    <RichTextEditor 
                        value={block.content.html} 
                        onChange={(html) => updateBlock(block.id, { html })}
                    />
                ) : (
                    <div 
                        className="prose prose-slate max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: block.content.html }}
                    />
                );
            case 'image':
                return (
                    <div className="my-6">
                        {block.content.url ? (
                            <div className="relative group">
                                <img src={block.content.url} alt={block.content.caption} className="rounded-xl shadow-sm w-full object-cover max-h-[500px]" />
                                {isEditor && !builderPreviewMode && (
                                    <button 
                                        onClick={() => { setUploadingBlockId(block.id); blockImageInputRef.current?.click(); }}
                                        className="absolute top-4 right-4 bg-white/90 p-2 rounded-lg shadow-sm hover:bg-white text-slate-700 text-xs font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ImageIcon size={14}/> Wijzig
                                    </button>
                                )}
                            </div>
                        ) : (
                            isEditor && !builderPreviewMode && (
                                <div 
                                    onClick={() => { setUploadingBlockId(block.id); blockImageInputRef.current?.click(); }}
                                    className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                                >
                                    <ImageIcon size={32} className="mb-2"/>
                                    <span className="font-bold text-sm">Upload Afbeelding</span>
                                </div>
                            )
                        )}
                        {isEditor && !builderPreviewMode && block.content.url && (
                            <input 
                                className="w-full text-sm p-2 border rounded mt-2 bg-slate-50"
                                placeholder="Onderschrift..."
                                value={block.content.caption || ''}
                                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                            />
                        )}
                        {!isEditor && block.content.caption && <p className="text-center text-xs text-slate-500 mt-2">{block.content.caption}</p>}
                    </div>
                );
            case 'video':
                return (
                    <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg my-6">
                        {block.content.url ? (
                            <iframe src={block.content.url} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">Video Embed Placeholder</div>
                        )}
                        {isEditor && !builderPreviewMode && (
                            <input 
                                className="w-full p-2 text-xs border-t border-slate-700 bg-slate-800 text-white" 
                                placeholder="YouTube Embed URL..."
                                value={block.content.url}
                                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                            />
                        )}
                    </div>
                );
            case 'quiz':
                return (
                    <div className="my-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <HelpCircle size={20} className="text-indigo-600"/> 
                            {isEditor && !builderPreviewMode ? (
                                <input 
                                    className="bg-transparent border-b border-indigo-200 w-full focus:outline-none focus:border-indigo-500"
                                    value={block.content.question}
                                    onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                                />
                            ) : block.content.question}
                        </h4>
                        <div className="space-y-2">
                            {block.content.options.map((opt: any, idx: number) => {
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
                                    <div key={opt.id} className="flex gap-2 items-center">
                                        {isEditor && !builderPreviewMode && (
                                            <input 
                                                type="radio" 
                                                checked={opt.isCorrect} 
                                                onChange={() => {
                                                    const newOpts = block.content.options.map((o:any) => ({...o, isCorrect: o.id === opt.id}));
                                                    updateBlock(block.id, { options: newOpts });
                                                }}
                                            />
                                        )}
                                        <label className={`flex-1 flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer transition-colors ${styleClass}`}>
                                            {!isEditor && (
                                                <input 
                                                    type="radio" 
                                                    name={`quiz-${block.id}`} 
                                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                                                    disabled={showResult}
                                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [block.id]: opt.id }))}
                                                />
                                            )}
                                            {isEditor && !builderPreviewMode ? (
                                                <input 
                                                    className="w-full text-sm border-none focus:ring-0 p-0"
                                                    value={opt.text}
                                                    onChange={(e) => {
                                                        const newOpts = [...block.content.options];
                                                        newOpts[idx].text = e.target.value;
                                                        updateBlock(block.id, { options: newOpts });
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-sm font-medium">{opt.text}</span>
                                            )}
                                            {showResult && isCorrect && <CheckCircle2 size={16} className="text-green-600 ml-auto"/>}
                                        </label>
                                        {isEditor && !builderPreviewMode && (
                                            <button onClick={() => {
                                                const newOpts = block.content.options.filter((o:any) => o.id !== opt.id);
                                                updateBlock(block.id, { options: newOpts });
                                            }}><X size={16} className="text-red-400"/></button>
                                        )}
                                    </div>
                                );
                            })}
                            {isEditor && !builderPreviewMode && (
                                <button onClick={() => {
                                    const newOpts = [...block.content.options, { id: crypto.randomUUID(), text: 'Nieuwe optie', isCorrect: false }];
                                    updateBlock(block.id, { options: newOpts });
                                }} className="text-xs text-indigo-600 font-bold">+ Optie toevoegen</button>
                            )}
                        </div>
                    </div>
                );
            case 'hotspot':
                return renderHotspotImage(block, isEditor);
            case 'time-capsule':
                return renderTimeCapsule(block, isEditor);
            default:
                return null;
        }
    };

    const renderPlayer = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return null;
        
        const module = activeCourse.modules.find(m => m.id === selectedModuleId);
        const lesson = module?.lessons.find(l => l.id === selectedLessonId);

        if (!lesson) return <div>Les niet gevonden</div>;

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
                                        {renderBlockContent(block, false)}
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

    // --- BUILDER LAYOUT ---

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
                            onClick={() => setIsCourseSettingsOpen(true)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Cursus Instellingen"
                        >
                            <Settings size={20} />
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
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
                    
                    {/* LEFT: Structure ONLY */}
                    <div className={`w-80 bg-white border-r border-slate-200 flex flex-col ${builderPreviewMode ? 'hidden' : 'flex'}`}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Structuur</h3>
                            <button onClick={addModule} className="p-1 hover:bg-slate-200 rounded text-indigo-600 transition-colors" title="Nieuwe Module"><Plus size={18}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-4">
                            {editingCourse.modules.map((mod, mIdx) => (
                                <div key={mod.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    <div className="p-3 flex items-center justify-between group bg-white border-b border-slate-100">
                                        <input 
                                            className="bg-transparent font-bold text-sm text-slate-800 w-full focus:outline-none"
                                            value={mod.title}
                                            onChange={(e) => {
                                                const mods = [...editingCourse.modules];
                                                mods[mIdx].title = e.target.value;
                                                setEditingCourse({...editingCourse, modules: mods});
                                            }}
                                        />
                                        <button onClick={() => addLesson(mod.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"><Plus size={14}/></button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {mod.lessons.map(les => (
                                            <div 
                                                key={les.id} 
                                                onClick={() => { setActiveBuilderModuleId(mod.id); setActiveBuilderLessonId(les.id); }}
                                                className={`px-4 py-3 text-sm cursor-pointer flex justify-between items-center group transition-colors ${activeBuilderLessonId === les.id ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-500' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-transparent'}`}
                                            >
                                                <span className="truncate">{les.title}</span>
                                            </div>
                                        ))}
                                        {mod.lessons.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 italic text-center">Nog geen lessen</div>}
                                    </div>
                                </div>
                            ))}
                            {editingCourse.modules.length === 0 && (
                                <div className="text-center p-8 text-slate-400 italic text-sm">
                                    Klik op + om een module toe te voegen.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CENTER: Canvas */}
                    <div className="flex-1 overflow-y-auto bg-slate-100 p-8"
                         onDragOver={handleDragOver}
                         onDrop={handleDrop}
                    >
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
                                            <div 
                                                key={block.id} 
                                                className="relative group border border-transparent hover:border-slate-200 rounded-xl p-2 transition-all cursor-move"
                                                draggable={!builderPreviewMode}
                                                onDragStart={() => handleSortStart(idx)}
                                                onDragOver={(e) => handleSortOver(e, idx)}
                                            >
                                                {/* Block Controls */}
                                                {!builderPreviewMode && (
                                                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-slate-200 rounded-lg p-1 z-10">
                                                        <button onClick={() => moveBlock(block.id, 'up')} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700"><ArrowUp size={14}/></button>
                                                        <button onClick={() => moveBlock(block.id, 'down')} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700"><ArrowDown size={14}/></button>
                                                        <div className="w-px bg-slate-200 mx-1"></div>
                                                        <button onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                    </div>
                                                )}

                                                {renderBlockContent(block, !builderPreviewMode)}
                                            </div>
                                        ))}
                                    </div>

                                    {!builderPreviewMode && (
                                        <div className="mt-12 p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                                            Sleep blokken hierheen
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

                    {/* RIGHT: Toolbox (Draggable Items) */}
                    {!builderPreviewMode && (
                        <div className="w-64 bg-white border-l border-slate-200 p-4 hidden xl:block overflow-y-auto">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Inhoudsblokken</h3>
                            <div className="space-y-3">
                                {[
                                    { type: 'text', label: 'Tekst', icon: Type },
                                    { type: 'image', label: 'Afbeelding', icon: ImageIcon },
                                    { type: 'video', label: 'Video Embed', icon: Video },
                                    { type: 'quiz', label: 'Quiz Vraag', icon: HelpCircle },
                                    { type: 'hotspot', label: 'Hotspot Afbeelding', icon: MousePointer2 },
                                    { type: 'time-capsule', label: 'Tijdscapsule', icon: Timer },
                                ].map((tool) => (
                                    <div
                                        key={tool.type}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, tool.type as BlockType)}
                                        className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="text-slate-500 group-hover:text-indigo-600"><tool.icon size={18}/></div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-900">{tool.label}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tip</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Sleep de blokken naar het canvas in het midden om je les op te bouwen.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* SETTINGS MODAL */}
                <Modal isOpen={isCourseSettingsOpen} onClose={() => setIsCourseSettingsOpen(false)} title="Cursus Instellingen">
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        
                        {/* TABBED INTERFACE inside modal for better organization */}
                        <div className="space-y-8">
                            {/* GENERAL */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-4 border-b border-slate-100 pb-2">Algemene Informatie</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Titel</label>
                                        <input 
                                            className="w-full text-sm p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editingCourse.title}
                                            onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Categorie</label>
                                        <select 
                                            className="w-full text-sm p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editingCourse.category}
                                            onChange={(e) => setEditingCourse({...editingCourse, category: e.target.value})}
                                        >
                                            <option value="Algemeen">Algemeen</option>
                                            <option value="Veiligheid">Veiligheid</option>
                                            <option value="Gastvrijheid">Gastvrijheid</option>
                                            <option value="IT">IT</option>
                                            <option value="Leiderschap">Leiderschap</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Korte Beschrijving (Catalogus)</label>
                                        <textarea 
                                            className="w-full text-sm p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                            placeholder="Waar gaat deze cursus over?"
                                            value={editingCourse.description}
                                            onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* REWARD / BADGE */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                    <Award size={14}/> Beloning & Badge
                                </h4>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <input 
                                            type="checkbox" 
                                            id="enableBadge"
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                            checked={editingCourse.badgeConfig?.enabled || false}
                                            onChange={(e) => setEditingCourse({
                                                ...editingCourse, 
                                                badgeConfig: { 
                                                    ...(editingCourse.badgeConfig || { name: '', icon: 'Star', color: 'blue', minScore: 100 }), 
                                                    enabled: e.target.checked 
                                                }
                                            })}
                                        />
                                        <label htmlFor="enableBadge" className="text-sm font-bold text-slate-700">Badge toekennen bij afronding</label>
                                    </div>

                                    {(editingCourse.badgeConfig?.enabled) && (
                                        <div className="space-y-4 pl-8 animate-in slide-in-from-top-2 fade-in">
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1 block">Badge Naam</label>
                                                <input 
                                                    className="w-full text-sm p-2 border rounded-lg bg-white"
                                                    value={editingCourse.badgeConfig.name}
                                                    onChange={(e) => setEditingCourse({
                                                        ...editingCourse,
                                                        badgeConfig: { ...editingCourse.badgeConfig!, name: e.target.value }
                                                    })}
                                                    placeholder="bv. Security Expert"
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1 block">Icoon</label>
                                                    <div className="grid grid-cols-4 gap-2 bg-white p-2 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                                                        {(Object.keys(BADGE_ICONS) as BadgeIconKey[]).map(iconKey => {
                                                            const Icon = BADGE_ICONS[iconKey];
                                                            return (
                                                                <button
                                                                    key={iconKey}
                                                                    onClick={() => setEditingCourse({
                                                                        ...editingCourse,
                                                                        badgeConfig: { ...editingCourse.badgeConfig!, icon: iconKey }
                                                                    })}
                                                                    className={`p-2 rounded flex items-center justify-center transition-all ${editingCourse.badgeConfig?.icon === iconKey ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-50 text-slate-400'}`}
                                                                >
                                                                    <Icon size={16}/>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1 block">Kleur</label>
                                                    <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                                        {(Object.keys(BADGE_COLORS) as BadgeColor[]).map(color => (
                                                            <button
                                                                key={color}
                                                                onClick={() => setEditingCourse({
                                                                    ...editingCourse,
                                                                    badgeConfig: { ...editingCourse.badgeConfig!, color: color }
                                                                })}
                                                                className={`w-6 h-6 rounded-full border-2 transition-all ${editingCourse.badgeConfig?.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''} ${BADGE_COLORS[color].split(' ')[0].replace('bg-', 'bg-')}`}
                                                                style={{ backgroundColor: `var(--color-${color}-100)` }} // Fallback if tailwind class dynamic compilation fails, usually better to map explicit colors
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-400 mb-1 block">Vereiste Score (%)</label>
                                                <input 
                                                    type="number"
                                                    className="w-24 text-sm p-2 border rounded-lg bg-white"
                                                    value={editingCourse.badgeConfig.minScore}
                                                    onChange={(e) => setEditingCourse({
                                                        ...editingCourse,
                                                        badgeConfig: { ...editingCourse.badgeConfig!, minScore: parseInt(e.target.value) }
                                                    })}
                                                    min={0} max={100}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* TARGETING */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-4 border-b border-slate-100 pb-2">Doelgroep</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Deadline (Optioneel)</label>
                                        <input 
                                            type="date"
                                            className="w-full text-sm p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editingCourse.dueDate || ''}
                                            onChange={(e) => setEditingCourse({...editingCourse, dueDate: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Zichtbaar voor Rollen</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['All', 'Manager', 'Senior Medewerker', 'Medewerker'].map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => {
                                                        const current = editingCourse.targetRoles;
                                                        const updated = current.includes(role) 
                                                            ? current.filter(r => r !== role) 
                                                            : [...current, role];
                                                        setEditingCourse({...editingCourse, targetRoles: updated});
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                                        editingCourse.targetRoles.includes(role) 
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {role === 'All' ? 'Iedereen' : role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COVER IMAGE */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-4 border-b border-slate-100 pb-2">Media</h4>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omslagfoto</label>
                                <input type="file" ref={courseCoverInputRef} className="hidden" accept="image/*" onChange={handleCourseCoverUpload} />
                                
                                {editingCourse.coverImage ? (
                                    <div className="relative group rounded-xl overflow-hidden h-40 w-full border border-slate-200">
                                        <img src={editingCourse.coverImage} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => courseCoverInputRef.current?.click()} 
                                                className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-100"
                                            >
                                                Wijzig Foto
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => courseCoverInputRef.current?.click()} 
                                        className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all hover:bg-slate-50"
                                    >
                                        <ImageIcon size={24} className="mb-2"/>
                                        <span className="text-xs font-bold">Klik om te uploaden</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                        <button onClick={() => setIsCourseSettingsOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">Klaar</button>
                    </div>
                </Modal>
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
        // ... existing implementation or placeholder
        return <div className="p-8">Studenten Beheer (Placeholder)</div>;
    };

    const renderAnalytics = () => {
        // ... existing implementation or placeholder
        return <div className="p-8">Analytics (Placeholder)</div>;
    };

    const renderCertificates = () => {
        // ... existing implementation or placeholder
        return <div className="p-8">Certificaten (Placeholder)</div>;
    };

    const renderDashboard = () => {
        const inProgress = userProgress.filter(p => p.status === 'In Progress');
        const completed = userProgress.filter(p => p.status === 'Completed');
        const badgesEarned = userProgress.filter(p => p.isBadgeEarned);

        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Welkom terug, {currentUser.name}</h2>
                    <p className="text-slate-500">Hier is je voortgang in de SanaLearn Academy.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bezig</div>
                        <div className="text-3xl font-bold text-indigo-600">{inProgress.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Voltooid</div>
                        <div className="text-3xl font-bold text-green-600">{completed.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Badges</div>
                        <div className="text-3xl font-bold text-amber-500">{badgesEarned.length}</div>
                    </div>
                </div>

                {/* MY BADGES SECTION */}
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Trophy size={20} className="text-amber-500"/> Mijn Badges
                    </h3>
                    {badgesEarned.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {badgesEarned.map((p, idx) => {
                                const course = courses.find(c => c.id === p.courseId);
                                if (!course || !course.badgeConfig) return null;
                                const Icon = BADGE_ICONS[course.badgeConfig.icon] || Star;
                                const colorClass = BADGE_COLORS[course.badgeConfig.color] || 'bg-slate-100 text-slate-600 border-slate-200';

                                return (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border-2 ${colorClass}`}>
                                            <Icon size={20}/>
                                        </div>
                                        <div className="text-sm font-bold text-slate-900 leading-tight">{course.badgeConfig.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">{p.completedDate}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 italic">
                            Nog geen badges verdiend. Voltooi cursussen om badges te verzamelen!
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-6">Verder leren</h3>
                {inProgress.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inProgress.map(p => {
                            const course = courses.find(c => c.id === p.courseId);
                            if (!course) return null;
                            return (
                                <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleStartCourse(course)}>
                                    {course.coverImage && <div className="h-32 bg-slate-200"><img src={course.coverImage} className="w-full h-full object-cover"/></div>}
                                    <div className="p-5">
                                        <h4 className="font-bold text-slate-900 mb-2">{course.title}</h4>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{width: `${p.progressPercentage}%`}}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>{p.progressPercentage}% Voltooid</span>
                                            <span className="font-bold text-indigo-600">Verder gaan</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-slate-500 italic bg-slate-50 p-8 rounded-xl border border-dashed border-slate-200 text-center">
                        Je bent momenteel met geen enkele cursus bezig. <button onClick={() => setView('catalog')} className="text-indigo-600 font-bold hover:underline">Bekijk de catalogus</button>
                    </div>
                )}
            </div>
        );
    };

    const renderCatalog = () => {
        const publishedCourses = courses.filter(c => c.isPublished);
        const filtered = publishedCourses.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(catalogSearch.toLowerCase());
            const matchesCategory = catalogCategory === 'All' || c.category === catalogCategory;
            
            // Check targeting permissions
            const isTargetRole = c.targetRoles.includes('All') || c.targetRoles.includes(currentUser.role);
            const isTargetEmployee = c.targetEmployees && c.targetEmployees.includes(currentUser.id);
            const canView = isManager || isTargetRole || isTargetEmployee;

            return matchesSearch && matchesCategory && canView;
        });

        const categories = ['All', ...Array.from(new Set(publishedCourses.map(c => c.category)))];

        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Catalogus</h2>
                        <p className="text-slate-500">Ontdek nieuwe trainingen en vaardigheden.</p>
                    </div>
                    <div className="flex gap-4">
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm bg-white"
                            value={catalogCategory}
                            onChange={(e) => setCatalogCategory(e.target.value)}
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Zoeken..." 
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64"
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(course => (
                        <div key={course.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col h-full">
                            <div className="h-40 bg-slate-200 relative overflow-hidden">
                                {course.coverImage ? (
                                    <img src={course.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-300"><ImageIcon size={48}/></div>
                                )}
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-700">
                                    {course.level}
                                </div>
                                {course.badgeConfig?.enabled && (
                                    <div className="absolute top-3 left-3 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 border border-amber-200">
                                        <Award size={12}/> Badge
                                    </div>
                                )}
                                {course.dueDate && (
                                    <div className="absolute bottom-3 left-3 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold shadow-sm flex items-center gap-1">
                                        <Clock size={12}/> Deadline: {course.dueDate}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">{course.category}</div>
                                <h3 className="font-bold text-slate-900 text-lg mb-2 leading-tight">{course.title}</h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{course.description}</p>
                                
                                <button 
                                    onClick={() => handleStartCourse(course)}
                                    className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Play size={16}/> Starten
                                </button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                            Geen cursussen gevonden.
                        </div>
                    )}
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
