
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as LucideIcons from 'lucide-react'; // Import ALL icons
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, LearningBlock, BlockType } from '../types';
import AcademySidebar from './AcademySidebar';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onExit: () => void;
}

// --- CONFIG ---
const BLOCK_TYPES: { type: BlockType; label: string; icon: any; color: string; description: string }[] = [
    { type: 'text', label: 'Rich Text & Media', icon: LucideIcons.FileText, color: 'text-slate-600 bg-slate-100', description: 'Tekst, koppen, iconen en opmaak.' },
    { type: 'image', label: 'Afbeelding', icon: LucideIcons.Image, color: 'text-pink-600 bg-pink-100', description: 'Staande afbeelding met bijschrift.' },
    { type: 'video', label: 'Video', icon: LucideIcons.Video, color: 'text-red-600 bg-red-100', description: 'YouTube, Vimeo of upload.' },
    { type: 'hotspot', label: 'Hotspot Image', icon: LucideIcons.MousePointer, color: 'text-orange-600 bg-orange-100', description: 'Interactieve afbeelding met klikbare punten.' },
    { type: 'flashcard', label: 'Flashcards', icon: LucideIcons.Layers, color: 'text-indigo-600 bg-indigo-100', description: 'Omdraaibare kaarten om te oefenen.' },
    { type: 'quiz', label: 'Kennis Quiz', icon: LucideIcons.HelpCircle, color: 'text-teal-600 bg-teal-100', description: 'Toets de kennis met vragen.' },
];

// --- HELPERS ---

const RichTextToolbar = ({ onFormat }: { onFormat: (cmd: string, val?: string) => void }) => {
    return (
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg shadow-sm mb-2 w-fit">
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('bold'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.Bold size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('italic'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.Italic size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('underline'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.Underline size={16}/></button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('formatBlock', 'H1'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.Heading1 size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('formatBlock', 'H2'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.Heading2 size={16}/></button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('justifyLeft'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.AlignLeft size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('justifyCenter'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.AlignCenter size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); onFormat('insertUnorderedList'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><LucideIcons.List size={16}/></button>
        </div>
    );
};

// Advanced Icon Picker with Search and Full Catalog (1400+ Icons)
const IconPicker = ({ selected, onSelect }: { selected?: string, onSelect: (icon: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const ICONS_PER_PAGE = 96; 
    
    // Get all valid icon keys from Lucide
    const allIconKeys = useMemo(() => {
        return Object.keys(LucideIcons).filter(key => 
            key !== 'createLucideIcon' && 
            key !== 'Icon' && 
            key !== 'default' &&
            /^[A-Z]/.test(key) // Ensure it starts with Uppercase (Component Name)
        );
    }, []);

    const filteredIcons = useMemo(() => {
        if (!searchTerm) return allIconKeys;
        return allIconKeys.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allIconKeys, searchTerm]);

    const visibleIcons = useMemo(() => {
        return filteredIcons.slice(0, page * ICONS_PER_PAGE);
    }, [filteredIcons, page]);

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={`Zoek in ${allIconKeys.length} iconen...`}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
            </div>
            
            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                <button 
                    onClick={() => onSelect('')}
                    className={`p-2 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 ${!selected ? 'bg-slate-100 shadow-inner' : ''}`}
                    title="Geen icoon"
                >
                    <LucideIcons.X size={18} />
                </button>
                {visibleIcons.map((name) => {
                    const IconComponent = (LucideIcons as any)[name];
                    if (!IconComponent) return null;

                    return (
                        <button
                            key={name}
                            onClick={() => onSelect(name)}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all ${selected === name ? 'bg-indigo-600 text-white shadow-md scale-110 ring-2 ring-offset-1 ring-indigo-500' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                            title={name}
                        >
                            <IconComponent size={18} />
                        </button>
                    );
                })}
            </div>
            
            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span>{visibleIcons.length} van {filteredIcons.length}</span>
                {visibleIcons.length < filteredIcons.length && (
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        Meer laden...
                    </button>
                )}
            </div>
        </div>
    );
};

// Safe Content Editable Component to prevent cursor jumping
const BlockTextEditor = ({ html, onChange, className, onFocus }: { html: string, onChange: (val: string) => void, className?: string, onFocus?: () => void }) => {
    const contentEditableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
             // Only update innerHTML if the element is NOT focused to avoid cursor reset loop while typing.
             // We rely on React state being the source of truth for saving, but local DOM for typing.
             if (document.activeElement !== contentEditableRef.current) {
                 contentEditableRef.current.innerHTML = html;
             }
        }
    }, [html]);

    return (
        <div
            ref={contentEditableRef}
            className={className}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange(e.currentTarget.innerHTML)}
            onFocus={onFocus}
            onBlur={(e) => onChange(e.currentTarget.innerHTML)}
            // Ensure it has height even if empty
            style={{ minHeight: '1.5em' }} 
        />
    );
};

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, onShowToast, onExit }) => {
    const [view, setView] = useState<string>('dashboard'); 
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    
    // BUILDER STATE
    const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [isBlockPickerOpen, setIsBlockPickerOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Sidebar Drag State
    const [draggedLesson, setDraggedLesson] = useState<{moduleId: string, lessonId: string} | null>(null);

    // Hotspot Drag State
    const [draggingSpotId, setDraggingSpotId] = useState<string | null>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // PLAYER STATE
    const [playerState, setPlayerState] = useState({
        quizAnswers: {} as Record<string, string>, // blockId -> optionId
        flippedCards: new Set<string>(), // cardId
        activeHotspot: null as string | null // spotId
    });

    // Refs for uploads
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const activeUploadBlockId = useRef<string | null>(null);
    const activeUploadType = useRef<'video' | 'image' | null>(null);

    // Initial Load & Realtime Sync
    useEffect(() => {
        // Initial Fetch
        api.getAcademyCourses().then(setCourses);
        api.getAcademyProgress().then(setUserProgress);

        // Realtime Subscription
        const unsubscribe = api.subscribeToAcademy(
            (updatedCourses) => {
                // Only update if we are NOT currently editing to prevent overwrites
                if (view !== 'builder') {
                    setCourses(updatedCourses);
                }
            },
            (updatedProgress) => setUserProgress(updatedProgress)
        );

        return () => { unsubscribe(); };
    }, [view]);

    // --- HELPER: GET CURRENT CONTEXT ---
    const getActiveContext = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return null;
        const module = (activeCourse.modules || []).find(m => m.id === selectedModuleId);
        const lesson = (module?.lessons || []).find(l => l.id === selectedLessonId);
        return { module, lesson };
    };

    // --- ACTIONS ---

    const handleOpenBuilder = (course?: AcademyCourse) => {
        if (course) {
            setActiveCourse(JSON.parse(JSON.stringify(course)));
        } else {
            const newId = crypto.randomUUID();
            setActiveCourse({
                id: newId,
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
        setSelectedBlockId(null);
        setView('builder');
    };

    const handleDeleteCourse = async (id: string) => {
        if (confirm("Weet je zeker dat je deze training wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
            await api.deleteAcademyCourse(id);
            setCourses(prev => prev.filter(c => c.id !== id));
            onShowToast("Training verwijderd.");
        }
    };

    const handleStartCourse = (course: AcademyCourse) => {
        setActiveCourse(course);
        // Find existing progress or start new
        const progress = userProgress.find(p => p.courseId === course.id && p.employeeId === currentUser.id);
        
        // Default to first lesson
        const firstModule = course.modules?.[0];
        const firstLesson = firstModule?.lessons?.[0];
        
        setSelectedModuleId(firstModule?.id || null);
        setSelectedLessonId(firstLesson?.id || null);
        
        // Reset player interactive state
        setPlayerState({ quizAnswers: {}, flippedCards: new Set(), activeHotspot: null });
        
        setView('player');
    };

    const handlePlayerNext = () => {
        if (!activeCourse || !selectedModuleId || !selectedLessonId) return;

        let foundCurrent = false;
        let nextModuleId: string | null = null;
        let nextLessonId: string | null = null;

        for (const module of activeCourse.modules || []) {
            for (const lesson of module.lessons || []) {
                if (foundCurrent) {
                    nextModuleId = module.id;
                    nextLessonId = lesson.id;
                    break;
                }
                if (lesson.id === selectedLessonId) foundCurrent = true;
            }
            if (nextLessonId) break;
        }

        if (nextLessonId && nextModuleId) {
            setSelectedModuleId(nextModuleId);
            setSelectedLessonId(nextLessonId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Course Complete
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
        
        const progress: AcademyProgress = {
            id: crypto.randomUUID(),
            employeeId: currentUser.id,
            courseId: activeCourse.id,
            status: 'Completed',
            progressPercentage: 100,
            completedLessonIds: [], // Would track actual IDs in real app
            quizScores: {},
            startDate: new Date().toLocaleDateString('nl-NL'),
            completedDate: new Date().toLocaleDateString('nl-NL')
        };

        await api.saveAcademyProgress(progress);
        
        // Update local state
        setUserProgress(prev => [...prev.filter(p => p.courseId !== progress.courseId), progress]);
        
        onShowToast(`Gefeliciteerd! Je hebt ${activeCourse.title} afgerond.`);
        setView('dashboard');
    };

    // --- BUILDER LOGIC ---

    const addModule = () => {
        if (!activeCourse) return;
        const newModule: AcademyModule = {
            id: crypto.randomUUID(),
            title: 'Nieuw Hoofdstuk',
            lessons: []
        };
        setActiveCourse({ ...activeCourse, modules: [...(activeCourse.modules || []), newModule] });
        setHasUnsavedChanges(true);
    };

    const deleteModule = (moduleId: string) => {
        if (!activeCourse) return;
        if (!confirm('Weet je zeker dat je dit hoofdstuk en alle lessen wilt verwijderen?')) return;
        const updatedModules = activeCourse.modules.filter(m => m.id !== moduleId);
        setActiveCourse({ ...activeCourse, modules: updatedModules });
        if (selectedModuleId === moduleId) {
            setSelectedModuleId(null);
            setSelectedLessonId(null);
        }
        setHasUnsavedChanges(true);
    };

    const addLesson = (moduleId: string) => {
        if (!activeCourse) return;
        const newLesson: AcademyLesson = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Les',
            blocks: [], 
            durationMinutes: 5
        };
        
        const updatedModules = (activeCourse.modules || []).map(m => {
            if (m.id === moduleId) return { ...m, lessons: [...(m.lessons || []), newLesson] };
            return m;
        });

        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setSelectedModuleId(moduleId);
        setSelectedLessonId(newLesson.id);
        setHasUnsavedChanges(true);
    };

    const deleteLesson = (moduleId: string, lessonId: string) => {
        if (!activeCourse) return;
        if (!confirm('Weet je zeker dat je deze les wilt verwijderen?')) return;
        const updatedModules = activeCourse.modules.map(m => {
            if (m.id === moduleId) {
                return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
            }
            return m;
        });
        setActiveCourse({ ...activeCourse, modules: updatedModules });
        if (selectedLessonId === lessonId) {
            setSelectedLessonId(null);
        }
        setHasUnsavedChanges(true);
    };

    const handleLessonDragStart = (e: React.DragEvent, moduleId: string, lessonId: string) => {
        setDraggedLesson({ moduleId, lessonId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleModuleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleLessonDrop = (e: React.DragEvent, targetModuleId: string) => {
        e.preventDefault();
        if (!draggedLesson || !activeCourse) return;
        
        const sourceModule = activeCourse.modules.find(m => m.id === draggedLesson.moduleId);
        const targetModule = activeCourse.modules.find(m => m.id === targetModuleId);
        
        if (!sourceModule || !targetModule) return;

        const lessonToMove = sourceModule.lessons.find(l => l.id === draggedLesson.lessonId);
        if (!lessonToMove) return;

        // Remove from source
        const newSourceLessons = sourceModule.lessons.filter(l => l.id !== draggedLesson.lessonId);
        
        let newModules = [...activeCourse.modules];
        
        if (draggedLesson.moduleId === targetModuleId) {
            // Reordering within same module (Append to end for now as simplest approach)
             // In a full implementation we'd find the drop index
             return; 
        }

        newModules = newModules.map(m => {
            if (m.id === draggedLesson.moduleId) {
                return { ...m, lessons: newSourceLessons };
            }
            if (m.id === targetModuleId) {
                return { ...m, lessons: [...m.lessons, lessonToMove] };
            }
            return m;
        });

        setActiveCourse({ ...activeCourse, modules: newModules });
        setHasUnsavedChanges(true);
        setDraggedLesson(null);
        
        // Auto select the moved lesson in new place
        setSelectedModuleId(targetModuleId);
    };

    // --- HOTSPOT DRAG LOGIC ---
    const handleHotspotDragStart = (e: React.MouseEvent, spotId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingSpotId(spotId);
    };

    // Attach global listeners for smooth dragging outside the container
    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (draggingSpotId && imageContainerRef.current && selectedBlockId && activeCourse) {
                 const rect = imageContainerRef.current.getBoundingClientRect();
                 let x = ((e.clientX - rect.left) / rect.width) * 100;
                 let y = ((e.clientY - rect.top) / rect.height) * 100;
                 
                 // Clamp values
                 x = Math.max(0, Math.min(100, x));
                 y = Math.max(0, Math.min(100, y));

                 // Update course state directly for performance
                 const context = getActiveContext();
                 if(!context) return;
                 
                 const block = context.lesson.blocks.find(b => b.id === selectedBlockId);
                 if (block && block.type === 'hotspot') {
                     const newSpots = block.content.spots.map((s: any) => s.id === draggingSpotId ? { ...s, x, y } : s);
                     updateBlock(selectedBlockId, { ...block.content, spots: newSpots });
                 }
            }
        };
        
        const handleUp = () => {
            if (draggingSpotId) setDraggingSpotId(null);
        };

        if (draggingSpotId) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [draggingSpotId, selectedBlockId, activeCourse]);


    const addBlock = (type: BlockType) => {
        const context = getActiveContext();
        if (!context || !activeCourse) return;

        let content: any = {};
        if (type === 'text') content = { html: 'Start hier met typen...', style: 'paragraph', icon: '', iconColor: 'text-slate-500', backgroundColor: 'bg-transparent' };
        if (type === 'image') content = { url: '', caption: '', altText: '' };
        if (type === 'video') content = { url: '', source: 'youtube' };
        if (type === 'hotspot') content = { imageUrl: '', spots: [] };
        if (type === 'flashcard') content = { cards: [{ id: '1', front: 'Vraag', back: 'Antwoord' }] };
        if (type === 'quiz') content = { question: 'Nieuwe vraag?', type: 'single', options: [{ id: '1', text: 'Optie A', isCorrect: true }, { id: '2', text: 'Optie B', isCorrect: false }] };

        const newBlock: LearningBlock = {
            id: crypto.randomUUID(),
            type,
            content
        };

        const updatedModules = (activeCourse.modules || []).map(m => {
            if (m.id === selectedModuleId) {
                const updatedLessons = (m.lessons || []).map(l => {
                    if (l.id === selectedLessonId) {
                        return { ...l, blocks: [...(l.blocks || []), newBlock] };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setIsBlockPickerOpen(false);
        setSelectedBlockId(newBlock.id);
        setHasUnsavedChanges(true);
    };

    const updateBlock = (blockId: string, content: any) => {
        const context = getActiveContext();
        if (!context || !activeCourse) return;

        const updatedModules = (activeCourse.modules || []).map(m => {
            if (m.id === selectedModuleId) {
                const updatedLessons = (m.lessons || []).map(l => {
                    if (l.id === selectedLessonId) {
                        const updatedBlocks = (l.blocks || []).map(b => b.id === blockId ? { ...b, content } : b);
                        return { ...l, blocks: updatedBlocks };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });

        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setHasUnsavedChanges(true);
    };

    const moveBlock = (blockId: string, direction: 'up' | 'down') => {
        const context = getActiveContext();
        if (!context || !activeCourse) return;

        const updatedModules = (activeCourse.modules || []).map(m => {
            if (m.id === selectedModuleId) {
                const updatedLessons = (m.lessons || []).map(l => {
                    if (l.id === selectedLessonId) {
                        const blocks = [...(l.blocks || [])];
                        const idx = blocks.findIndex(b => b.id === blockId);
                        if (idx === -1) return l;
                        if (direction === 'up' && idx > 0) {
                            [blocks[idx], blocks[idx - 1]] = [blocks[idx - 1], blocks[idx]];
                        } else if (direction === 'down' && idx < blocks.length - 1) {
                            [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
                        }
                        return { ...l, blocks };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });
        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setHasUnsavedChanges(true);
    };

    const deleteBlock = (blockId: string) => {
        const context = getActiveContext();
        if (!context || !activeCourse) return;

        const updatedModules = (activeCourse.modules || []).map(m => {
            if (m.id === selectedModuleId) {
                const updatedLessons = (m.lessons || []).map(l => {
                    if (l.id === selectedLessonId) {
                        return { ...l, blocks: (l.blocks || []).filter(b => b.id !== blockId) };
                    }
                    return l;
                });
                return { ...m, lessons: updatedLessons };
            }
            return m;
        });
        setActiveCourse({ ...activeCourse, modules: updatedModules });
        setSelectedBlockId(null);
        setHasUnsavedChanges(true);
    };

    const saveCourse = async () => {
        if (!activeCourse) return;
        await api.saveAcademyCourse(activeCourse);
        
        setCourses(prev => {
            const idx = prev.findIndex(c => c.id === activeCourse.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = activeCourse;
                return updated;
            }
            return [...prev, activeCourse];
        });

        setHasUnsavedChanges(false);
        onShowToast("Training opgeslagen!");
    };

    // --- UPLOAD HANDLERS ---
    const handleTriggerUpload = (blockId: string, type: 'video' | 'image') => {
        activeUploadBlockId.current = blockId;
        activeUploadType.current = type;
        fileInputRef.current?.click();
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeCourse) {
            setIsUploading(true);
            try {
                const url = await api.uploadFile(file);
                if (url) {
                    setActiveCourse({ ...activeCourse, coverImage: url });
                    setHasUnsavedChanges(true);
                    onShowToast("Omslagfoto bijgewerkt");
                }
            } catch (err) {
                console.error(err);
                onShowToast("Fout bij uploaden");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const blockId = activeUploadBlockId.current;
        const type = activeUploadType.current;

        if (file && blockId && type && activeCourse) {
            setIsUploading(true);
            try {
                onShowToast("Uploaden gestart...");
                const url = await api.uploadFile(file);
                
                if (url) {
                    const context = getActiveContext();
                    const block = context?.lesson?.blocks.find(b => b.id === blockId);
                    
                    if (block) {
                        const newContent = { ...block.content };
                        
                        // Handle specific block types
                        if (block.type === 'hotspot') {
                            newContent.imageUrl = url;
                        } else if (block.type === 'image') {
                            newContent.url = url;
                        } else if (block.type === 'video') {
                            newContent.url = url;
                            newContent.source = 'upload';
                        }

                        updateBlock(blockId, newContent);
                        onShowToast("Bestand succesvol geüpload!");
                    }
                } else {
                    onShowToast("Upload mislukt.");
                }
            } catch (err) {
                console.error(err);
                onShowToast("Fout bij uploaden.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    // --- EXEC COMMAND HELPER ---
    const handleFormat = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
    };

    // --- RENDERERS ---

    const renderBlockViewer = (block: LearningBlock) => {
        const bgClass = block.content.backgroundColor || 'bg-transparent';
        const containerClass = `relative ${bgClass} rounded-xl p-2`;
        
        // Dynamically get icon component from big library
        const IconComponent = block.content.icon && (LucideIcons as any)[block.content.icon] 
            ? (LucideIcons as any)[block.content.icon] 
            : null;

        switch (block.type) {
            case 'text':
                return (
                    <div className={`${containerClass} flex items-start gap-4 mb-4`}>
                        {IconComponent && (
                            <div className={`p-2 rounded-lg shrink-0 mt-1 ${block.content.iconColor?.includes('bg-') ? block.content.iconColor : 'bg-slate-100 text-slate-600'}`}>
                                <IconComponent size={24} />
                            </div>
                        )}
                        <div 
                            className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-lg"
                            dangerouslySetInnerHTML={{ __html: block.content.html }} 
                        />
                    </div>
                );

            case 'image':
                return (
                    <figure className="my-6">
                        {block.content.url ? (
                            <img 
                                src={block.content.url} 
                                alt={block.content.altText || 'Afbeelding'} 
                                className="w-full rounded-2xl shadow-sm border border-slate-100" 
                            />
                        ) : (
                            <div className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                Geen afbeelding
                            </div>
                        )}
                        {block.content.caption && (
                            <figcaption className="text-center text-xs text-slate-500 mt-2 italic">
                                {block.content.caption}
                            </figcaption>
                        )}
                    </figure>
                );

            case 'video':
                return (
                    <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-lg my-6">
                        {block.content.url ? (
                            block.content.url.includes('http') && !block.content.url.includes('youtube') && !block.content.url.includes('vimeo') ? (
                                <video src={block.content.url} controls className="w-full h-full" />
                            ) : (
                                <iframe 
                                    className="w-full h-full" 
                                    src={block.content.url.replace('watch?v=', 'embed/')} 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            )
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">Video niet beschikbaar</div>
                        )}
                    </div>
                );

            case 'hotspot':
                return (
                    <div className="relative rounded-2xl overflow-hidden shadow-lg my-6 bg-slate-100 group">
                        <img src={block.content.imageUrl} alt="Hotspot" className="w-full object-cover" />
                        {(block.content.spots || []).map((spot: any) => (
                            <div 
                                key={spot.id}
                                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-xs cursor-pointer transition-all z-10
                                    ${playerState.activeHotspot === spot.id ? 'bg-white text-teal-600 scale-125' : 'bg-teal-600 text-white hover:scale-110'}
                                `}
                                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                onClick={() => setPlayerState(prev => ({ ...prev, activeHotspot: prev.activeHotspot === spot.id ? null : spot.id }))}
                            >
                                {playerState.activeHotspot === spot.id ? <LucideIcons.X size={14}/> : <LucideIcons.Plus size={14}/>}
                                
                                {playerState.activeHotspot === spot.id && (
                                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-white p-3 rounded-xl shadow-xl text-slate-700 text-sm font-normal text-center z-20 animate-in zoom-in-95 duration-200">
                                        <div className="font-bold text-slate-900 mb-1">{spot.title}</div>
                                        {spot.text}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );

            case 'flashcard':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                        {(block.content.cards || []).map((card: any) => {
                            const isFlipped = playerState.flippedCards.has(card.id);
                            return (
                                <div 
                                    key={card.id} 
                                    onClick={() => {
                                        const newSet = new Set(playerState.flippedCards);
                                        if (isFlipped) newSet.delete(card.id);
                                        else newSet.add(card.id);
                                        setPlayerState(prev => ({ ...prev, flippedCards: newSet }));
                                    }}
                                    className="perspective-1000 cursor-pointer h-48 group"
                                >
                                    <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-sm hover:shadow-md rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}>
                                        {/* Front */}
                                        <div className="absolute inset-0 backface-hidden bg-white border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Vraag</div>
                                            <div className="font-bold text-slate-800 text-lg">{card.front}</div>
                                            <div className="absolute bottom-4 right-4 text-slate-300">
                                                <LucideIcons.RotateCw size={16} />
                                            </div>
                                        </div>
                                        {/* Back */}
                                        <div className="absolute inset-0 backface-hidden bg-indigo-600 rounded-2xl flex flex-col items-center justify-center p-6 text-center rotate-y-180 text-white">
                                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Antwoord</div>
                                            <div className="font-medium text-lg">{card.back}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'quiz':
                const selectedOptionId = playerState.quizAnswers[block.id];
                const isAnswered = !!selectedOptionId;
                const selectedOption = block.content.options.find((o: any) => o.id === selectedOptionId);
                const isCorrect = selectedOption?.isCorrect;

                return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm my-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-start gap-3">
                            <div className="bg-teal-100 text-teal-700 p-1.5 rounded-lg shrink-0 mt-0.5">
                                <LucideIcons.HelpCircle size={20}/>
                            </div>
                            {block.content.question}
                        </h3>
                        <div className="space-y-3">
                            {(block.content.options || []).map((opt: any) => {
                                const isSelected = opt.id === selectedOptionId;
                                const showResult = isAnswered;
                                let btnClass = 'border-slate-200 hover:bg-slate-50 text-slate-700';
                                
                                if (showResult) {
                                    if (isSelected && opt.isCorrect) btnClass = 'bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500';
                                    else if (isSelected && !opt.isCorrect) btnClass = 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500';
                                    else if (opt.isCorrect) btnClass = 'bg-white border-green-200 text-green-700 border-dashed'; // Show correct answer
                                    else btnClass = 'bg-slate-50 border-slate-100 text-slate-400 opacity-50';
                                } else if (isSelected) {
                                    btnClass = 'bg-indigo-50 border-indigo-500 text-indigo-800';
                                }

                                return (
                                    <button 
                                        key={opt.id}
                                        disabled={isAnswered}
                                        onClick={() => setPlayerState(prev => ({ ...prev, quizAnswers: { ...prev.quizAnswers, [block.id]: opt.id } }))}
                                        className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center justify-between ${btnClass}`}
                                    >
                                        <span>{opt.text}</span>
                                        {showResult && isSelected && (
                                            opt.isCorrect ? <LucideIcons.CheckCircle2 size={20} className="text-green-600"/> : <LucideIcons.X size={20} className="text-red-600"/>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {isAnswered && (
                            <div className={`mt-4 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {isCorrect ? (
                                    <><LucideIcons.Check size={18}/> Helemaal goed!</>
                                ) : (
                                    <><LucideIcons.AlertTriangle size={18}/> Helaas, dat is niet juist.</>
                                )}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const renderBlockEditor = (block: LearningBlock) => {
        const isSelected = block.id === selectedBlockId;
        const bgClass = block.content.backgroundColor || 'bg-transparent';
        
        // Dynamically resolve icon from Lucide
        const IconComponent = block.content.icon && (LucideIcons as any)[block.content.icon] 
            ? (LucideIcons as any)[block.content.icon] 
            : null;

        return (
            <div 
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`group relative rounded-xl border-2 transition-all cursor-pointer mb-4 ${isSelected ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-100 z-10' : 'border-transparent hover:border-slate-200'}`}
            >
                {/* Drag Handle & Actions */}
                <div className={`absolute -left-12 top-2 flex flex-col gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-grab active:cursor-grabbing shadow-sm">
                        <LucideIcons.GripVertical size={14}/>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600"><LucideIcons.ChevronDown className="rotate-180" size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600"><LucideIcons.ChevronDown size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-red-600"><LucideIcons.Trash2 size={14}/></button>
                </div>

                <div className={`p-4 rounded-lg ${bgClass}`}>
                    
                    {block.type === 'text' && (
                        <div className="relative">
                            {isSelected && (
                                <div className="absolute -top-14 left-0 z-20">
                                    <RichTextToolbar onFormat={handleFormat} />
                                </div>
                            )}
                            <div className="flex gap-4 items-start">
                                {IconComponent && (
                                    <div className={`p-2 rounded-lg shrink-0 mt-1 ${block.content.iconColor?.includes('bg-') ? block.content.iconColor : 'bg-slate-100 text-slate-600'}`}>
                                        <IconComponent size={24} />
                                    </div>
                                )}
                                <BlockTextEditor 
                                    className="prose prose-slate max-w-none focus:outline-none min-h-[2rem] flex-1"
                                    html={block.content.html}
                                    onChange={(newHtml) => updateBlock(block.id, { ...block.content, html: newHtml })}
                                />
                            </div>
                        </div>
                    )}

                    {block.type === 'image' && (
                        <div className="text-center">
                            {block.content.url ? (
                                <div className="relative group/image">
                                    <img src={block.content.url} alt={block.content.altText} className="w-full rounded-lg shadow-sm border border-slate-100" />
                                    {block.content.caption && <p className="text-xs text-slate-500 mt-2 italic">{block.content.caption}</p>}
                                </div>
                            ) : (
                                <div className="h-48 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200">
                                    <LucideIcons.Image size={32} className="mb-2 opacity-50"/>
                                    <p className="text-xs font-bold">Afbeelding toevoegen</p>
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'video' && (
                        <div className="rounded-xl overflow-hidden bg-black aspect-video relative group/video">
                            {block.content.url ? (
                                block.content.url.includes('http') && !block.content.url.includes('youtube') && !block.content.url.includes('vimeo') ? (
                                    <video src={block.content.url} controls className="w-full h-full" />
                                ) : (
                                    <iframe 
                                        className="w-full h-full pointer-events-none" 
                                        src={block.content.url.replace('watch?v=', 'embed/')} 
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-100">
                                    <LucideIcons.MonitorPlay size={48} className="mb-2 opacity-50"/>
                                    <p className="font-bold text-sm">Geen video geselecteerd</p>
                                    <p className="text-xs">Configureer in de zijbalk &rarr;</p>
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'hotspot' && (
                        <div 
                            ref={isSelected ? imageContainerRef : null} 
                            className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                        >
                            {block.content.imageUrl ? (
                                <div className="relative">
                                    <img src={block.content.imageUrl} alt="Hotspot Base" className="w-full object-cover select-none pointer-events-none" />
                                    {/* Render Hotspots Visuals */}
                                    {(block.content.spots || []).map((spot: any) => (
                                        <div 
                                            key={spot.id}
                                            className={`absolute w-8 h-8 -ml-4 -mt-4 bg-indigo-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:scale-110 transition-transform z-10 ${isSelected ? 'cursor-move' : ''}`}
                                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                            title={spot.title}
                                            onMouseDown={(e) => isSelected && handleHotspotDragStart(e, spot.id)}
                                        >
                                            <LucideIcons.Plus size={14}/>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                    <LucideIcons.Image size={48} className="mb-2 opacity-50"/>
                                    <p className="font-bold text-sm">Upload een afbeelding in de zijbalk</p>
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'flashcard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(block.content.cards || []).map((card: any) => (
                                <div key={card.id} className="aspect-video bg-white border-2 border-slate-200 rounded-xl p-6 flex items-center justify-center text-center shadow-sm">
                                    <div>
                                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Voorkant</div>
                                        <div className="text-lg font-bold text-slate-800">{card.front || 'Leeg'}</div>
                                        <div className="w-full h-px bg-slate-100 my-4"></div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Achterkant</div>
                                        <div className="text-slate-600">{card.back || 'Leeg'}</div>
                                    </div>
                                </div>
                            ))}
                            {(!block.content.cards || block.content.cards.length === 0) && (
                                <div className="aspect-video border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                                    Geen kaarten. Voeg toe in zijbalk.
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'quiz' && (
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-start gap-3">
                                <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-sm mt-0.5">?</span>
                                {block.content.question || 'Vraag invullen in zijbalk...'}
                            </h3>
                            <div className="space-y-2">
                                {(block.content.options || []).map((opt: any) => (
                                    <div key={opt.id} className={`p-3 rounded-lg border flex items-center gap-3 ${opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${opt.isCorrect ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300'}`}>
                                            {opt.isCorrect && <LucideIcons.Check size={12}/>}
                                        </div>
                                        <span className={`text-sm font-medium ${opt.isCorrect ? 'text-green-800' : 'text-slate-700'}`}>{opt.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- INSPECTOR RENDERER ---
    const renderInspector = () => {
        if (!selectedBlockId) return (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <LucideIcons.Settings size={48} className="mb-4 opacity-20"/>
                <p className="text-sm font-medium">Selecteer een blok in het midden om de inhoud te configureren.</p>
            </div>
        );

        const context = getActiveContext();
        if (!context) return null;
        
        const block = (context.lesson?.blocks || []).find(b => b.id === selectedBlockId);
        if (!block) return null;
        
        const BlockIcon = BLOCK_TYPES.find(b => b.type === block.type)?.icon || LucideIcons.HelpCircle;

        return (
            <div className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-100 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Blok Type</span>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        <div className={`p-1.5 rounded-lg ${BLOCK_TYPES.find(b => b.type === block.type)?.color}`}>
                            {React.createElement(BlockIcon, { size: 18 })}
                        </div>
                        {BLOCK_TYPES.find(b => b.type === block.type)?.label}
                    </h3>
                </div>

                {/* Specific Settings based on Block Type */}
                {block.type === 'text' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Kies Icoon</label>
                            <IconPicker 
                                selected={block.content.icon}
                                onSelect={(icon) => updateBlock(block.id, { ...block.content, icon })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Styling</label>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-slate-400 mb-1 block">Achtergrond</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { cls: 'bg-transparent', label: 'Geen' },
                                            { cls: 'bg-slate-50', label: 'Grijs' },
                                            { cls: 'bg-blue-50', label: 'Blauw' },
                                            { cls: 'bg-green-50', label: 'Groen' },
                                            { cls: 'bg-amber-50', label: 'Geel' },
                                            { cls: 'bg-red-50', label: 'Rood' }
                                        ].map(bg => (
                                            <button 
                                                key={bg.cls} 
                                                onClick={() => updateBlock(block.id, { ...block.content, backgroundColor: bg.cls })}
                                                className={`w-6 h-6 rounded-full border border-slate-200 ${bg.cls} ${block.content.backgroundColor === bg.cls ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                                title={bg.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 mb-1 block">Icoon Kleur</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { cls: 'bg-slate-100 text-slate-600', label: 'Grijs' },
                                            { cls: 'bg-blue-100 text-blue-600', label: 'Blauw' },
                                            { cls: 'bg-green-100 text-green-600', label: 'Groen' },
                                            { cls: 'bg-amber-100 text-amber-600', label: 'Geel' },
                                            { cls: 'bg-red-100 text-red-600', label: 'Rood' },
                                            { cls: 'bg-indigo-100 text-indigo-600', label: 'Indigo' }
                                        ].map(c => (
                                            <button 
                                                key={c.cls} 
                                                onClick={() => updateBlock(block.id, { ...block.content, iconColor: c.cls })}
                                                className={`w-6 h-6 rounded-full border border-slate-200 ${c.cls.split(' ')[0]} ${block.content.iconColor === c.cls ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {block.type === 'image' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Afbeelding</label>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="URL..."
                                    value={block.content.url}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                                />
                                <button 
                                    onClick={() => handleTriggerUpload(block.id, 'image')}
                                    className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-600"
                                >
                                    <LucideIcons.Upload size={18}/>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Onderschrift</label>
                            <input 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Typ onderschrift..."
                                value={block.content.caption || ''}
                                onChange={(e) => updateBlock(block.id, { ...block.content, caption: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Alt Tekst</label>
                            <input 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Beschrijving voor toegankelijkheid..."
                                value={block.content.altText || ''}
                                onChange={(e) => updateBlock(block.id, { ...block.content, altText: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {block.type === 'video' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Video Bron</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="YouTube / Vimeo URL..."
                                    value={block.content.url}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Plak een link van YouTube of Vimeo.</p>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400 font-bold">Of upload bestand</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleTriggerUpload(block.id, 'video')}
                            disabled={isUploading}
                            className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            {isUploading ? <LucideIcons.Loader2 className="animate-spin" size={16}/> : <LucideIcons.Upload size={16}/>} 
                            Video Uploaden (MP4)
                        </button>
                    </div>
                )}

                {block.type === 'hotspot' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Afbeelding</label>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="URL..."
                                    value={block.content.imageUrl}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, imageUrl: e.target.value })}
                                />
                                <button 
                                    onClick={() => handleTriggerUpload(block.id, 'image')}
                                    className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-600"
                                >
                                    <LucideIcons.Upload size={18}/>
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Hotspots Punten</label>
                                <button 
                                    onClick={() => updateBlock(block.id, { ...block.content, spots: [...(block.content.spots || []), { id: Math.random().toString(), x: 50, y: 50, title: 'Nieuw punt', text: '' }] })}
                                    className="text-xs font-bold text-indigo-600 hover:underline"
                                >
                                    + Toevoegen
                                </button>
                            </div>
                            
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                                {(block.content.spots || []).map((spot: any, i: number) => (
                                    <div key={spot.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 relative group">
                                        <button 
                                            onClick={() => {
                                                const newSpots = block.content.spots.filter((s: any) => s.id !== spot.id);
                                                updateBlock(block.id, { ...block.content, spots: newSpots });
                                            }}
                                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                                        >
                                            <LucideIcons.X size={14}/>
                                        </button>
                                        
                                        <div className="font-bold text-xs text-slate-400 mb-2">Punt {i + 1}</div>
                                        <div className="space-y-2">
                                            <input 
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm" 
                                                placeholder="Titel (bv. Motor)" 
                                                value={spot.title}
                                                onChange={(e) => {
                                                    const newSpots = [...block.content.spots];
                                                    newSpots[i].title = e.target.value;
                                                    updateBlock(block.id, { ...block.content, spots: newSpots });
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-2 top-2 text-xs text-slate-400 font-bold">X</span>
                                                    <input className="w-full pl-6 p-2 border border-slate-200 rounded-lg text-sm" type="number" value={Math.round(spot.x)} onChange={(e) => {
                                                        const newSpots = [...block.content.spots];
                                                        newSpots[i].x = parseFloat(e.target.value);
                                                        updateBlock(block.id, { ...block.content, spots: newSpots });
                                                    }}/>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-2 top-2 text-xs text-slate-400 font-bold">Y</span>
                                                    <input className="w-full pl-6 p-2 border border-slate-200 rounded-lg text-sm" type="number" value={Math.round(spot.y)} onChange={(e) => {
                                                        const newSpots = [...block.content.spots];
                                                        newSpots[i].y = parseFloat(e.target.value);
                                                        updateBlock(block.id, { ...block.content, spots: newSpots });
                                                    }}/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(block.content.spots || []).length === 0 && (
                                    <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                        Nog geen punten. Klik op toevoegen.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {block.type === 'quiz' && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Vraag</label>
                            <input 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={block.content.question}
                                onChange={(e) => updateBlock(block.id, { ...block.content, question: e.target.value })}
                                placeholder="Typ je vraag..."
                            />
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase block">Antwoord Opties</label>
                                <button 
                                    onClick={() => updateBlock(block.id, { ...block.content, options: [...(block.content.options || []), { id: Math.random().toString(), text: '', isCorrect: false }] })}
                                    className="text-xs font-bold text-indigo-600 hover:underline"
                                >
                                    + Optie
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(block.content.options || []).map((opt: any, i: number) => (
                                    <div key={opt.id} className="flex gap-2 items-center">
                                        <button 
                                            onClick={() => {
                                                const newOpts = block.content.options.map((o: any) => ({ ...o, isCorrect: o.id === opt.id }));
                                                updateBlock(block.id, { ...block.content, options: newOpts });
                                            }}
                                            title="Markeer als goed antwoord"
                                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${opt.isCorrect ? 'bg-green-50 border-green-500 text-white shadow-sm' : 'border-slate-200 text-slate-300 hover:border-slate-300'}`}
                                        >
                                            <LucideIcons.Check size={16} strokeWidth={3}/>
                                        </button>
                                        <input 
                                            className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={opt.text}
                                            onChange={(e) => {
                                                const newOpts = [...block.content.options];
                                                newOpts[i].text = e.target.value;
                                                updateBlock(block.id, { ...block.content, options: newOpts });
                                            }}
                                            placeholder={`Optie ${i+1}`}
                                        />
                                        <button onClick={() => {
                                            const newOpts = block.content.options.filter((o: any) => o.id !== opt.id);
                                            updateBlock(block.id, { ...block.content, options: newOpts });
                                        }} className="text-slate-300 hover:text-red-500 p-1"><LucideIcons.X size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {block.type === 'flashcard' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase block">Flashcards</label>
                            <button 
                                onClick={() => updateBlock(block.id, { ...block.content, cards: [...(block.content.cards || []), { id: Math.random().toString(), front: '', back: '' }] })}
                                className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                                + Kaart
                            </button>
                        </div>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                            {(block.content.cards || []).map((card: any, idx: number) => (
                                <div key={card.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group">
                                    <button 
                                        onClick={() => {
                                            const newCards = (block.content.cards || []).filter((c: any) => c.id !== card.id);
                                            updateBlock(block.id, { ...block.content, cards: newCards });
                                        }}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                                    >
                                        <LucideIcons.X size={14}/>
                                    </button>
                                    <div className="text-xs font-bold text-slate-400 mb-2">Kaart {idx + 1}</div>
                                    <div className="space-y-2">
                                        <input 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold" 
                                            placeholder="Voorkant (Vraag)"
                                            value={card.front}
                                            onChange={(e) => {
                                                const newCards = [...(block.content.cards || [])];
                                                newCards[idx].front = e.target.value;
                                                updateBlock(block.id, { ...block.content, cards: newCards });
                                            }}
                                        />
                                        <textarea 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" 
                                            placeholder="Achterkant (Antwoord)"
                                            rows={2}
                                            value={card.back}
                                            onChange={(e) => {
                                                const newCards = [...(block.content.cards || [])];
                                                newCards[idx].back = e.target.value;
                                                updateBlock(block.id, { ...block.content, cards: newCards });
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-slate-100">
                    <button 
                        onClick={() => deleteBlock(block.id)}
                        className="w-full py-3 border border-red-200 text-red-600 bg-red-50 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                    >
                        <LucideIcons.Trash2 size={16}/> Blok Verwijderen
                    </button>
                </div>
            </div>
        );
    };

    // --- VIEW RENDERERS ---

    const renderManageCourses = () => {
        return (
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Cursus Beheer</h2>
                        <p className="text-slate-500">Overzicht van alle e-learning modules.</p>
                    </div>
                    <button 
                        onClick={() => handleOpenBuilder()}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <LucideIcons.Plus size={18}/> Nieuwe Cursus
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Training</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Auteur</th>
                                <th className="px-6 py-4">Laatst Gewijzigd</th>
                                <th className="px-6 py-4 text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {courses.map(course => (
                                <tr key={course.id} className="hover:bg-slate-50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                                {course.coverImage ? (
                                                    <img src={course.coverImage} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><LucideIcons.Image size={20}/></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{course.title}</div>
                                                <div className="text-xs text-slate-500">{course.modules?.length || 0} hoofdstukken</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {course.isPublished ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <LucideIcons.Eye size={12}/> Live
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                <LucideIcons.Edit2 size={12}/> Concept
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{course.author}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{course.createdAt}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenBuilder(course)}
                                                className="p-2 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-500 transition-colors"
                                                title="Bewerken"
                                            >
                                                <LucideIcons.Edit2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-500 transition-colors"
                                                title="Verwijderen"
                                            >
                                                <LucideIcons.Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {courses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nog geen trainingen aangemaakt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderCatalog = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(courses || []).filter(c => c.isPublished).map(course => (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer overflow-hidden flex flex-col h-full" onClick={() => handleStartCourse(course)}>
                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                        {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>}
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                                <LucideIcons.Play size={20} className="ml-1 text-slate-900"/>
                            </div>
                        </div>
                        
                        {/* Badge */}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-indigo-900 shadow-sm">
                            {course.category}
                        </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-lg text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed flex-1">{course.description || 'Geen beschrijving'}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                <span className="flex items-center gap-1"><LucideIcons.Layers size={12}/> {(course.modules || []).length}</span>
                                <span className="flex items-center gap-1"><LucideIcons.Clock size={12}/> {course.estimatedTime || '30m'}</span>
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                <LucideIcons.Sparkles size={10} /> {course.xpPoints} XP
                            </span>
                        </div>
                    </div>
                </div>
            ))}
            {courses.filter(c => c.isPublished).length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                    <LucideIcons.GraduationCap size={48} className="mx-auto mb-4 opacity-50"/>
                    <p className="font-bold">Geen trainingen beschikbaar</p>
                    <p className="text-sm mt-1">Check later terug voor nieuwe content.</p>
                </div>
            )}
        </div>
    );

    const renderPlayer = () => {
        if (!activeCourse) return null;
        const context = getActiveContext();
        if (!context || !context.lesson) return null;
        
        // Calculate progress for sidebar visual
        const totalLessons = activeCourse.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
        // Simple visual calculation - can be improved
        
        return (
            <div className="flex flex-col h-screen bg-white">
                {/* PLAYER HEADER */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-20">
                    <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm">
                        <LucideIcons.ArrowLeft size={18}/> Terug
                    </button>
                    <h2 className="font-bold text-slate-900">{activeCourse.title}</h2>
                    <div className="w-20"></div> {/* Spacer */}
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* PLAYER SIDEBAR */}
                    <div className="w-80 bg-slate-50 border-r border-slate-200 overflow-y-auto hidden md:block">
                        <div className="p-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Inhoudsopgave</h3>
                            <div className="space-y-6">
                                {activeCourse.modules?.map((module, mIdx) => (
                                    <div key={module.id}>
                                        <div className="font-bold text-slate-900 text-sm mb-2 px-2 flex items-center gap-2">
                                            <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px]">{mIdx+1}</span>
                                            {module.title}
                                        </div>
                                        <div className="space-y-1">
                                            {module.lessons?.map((lesson, lIdx) => {
                                                const isActive = lesson.id === selectedLessonId;
                                                return (
                                                    <button 
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            setSelectedModuleId(module.id);
                                                            setSelectedLessonId(lesson.id);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                                                            isActive 
                                                            ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' 
                                                            : 'text-slate-600 hover:bg-slate-200/50'
                                                        }`}
                                                    >
                                                        {isActive ? <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div> : <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
                                                        <span className="truncate">{lesson.title}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PLAYER CONTENT */}
                    <div className="flex-1 bg-white overflow-y-auto relative">
                        <div className="max-w-3xl mx-auto py-12 px-8 min-h-full flex flex-col">
                            
                            <div className="mb-8 border-b border-slate-100 pb-6">
                                <span className="text-indigo-600 font-bold text-sm mb-2 block uppercase tracking-wide">
                                    {context.module?.title}
                                </span>
                                <h1 className="text-4xl font-serif font-bold text-slate-900 leading-tight">
                                    {context.lesson.title}
                                </h1>
                            </div>

                            <div className="space-y-8 flex-1">
                                {(context.lesson.blocks || []).map(block => renderBlockViewer(block))}
                            </div>

                            {/* Navigation Footer */}
                            <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
                                <button 
                                    onClick={handlePlayerPrev}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <LucideIcons.ChevronLeft size={18}/> Vorige
                                </button>
                                <button 
                                    onClick={handlePlayerNext}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                                >
                                    Volgende <LucideIcons.ArrowRight size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (view === 'player' && activeCourse) {
        return renderPlayer();
    }

    if (view === 'builder' && activeCourse) {
        return (
            <div className="flex flex-col h-screen bg-white font-sans">
                {/* Hidden File Inputs */}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
                <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverUpload} accept="image/*" />

                {/* HEADER */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-30 shadow-sm relative">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('manage-courses')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <LucideIcons.ArrowLeft size={20}/>
                        </button>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <input 
                            className="font-serif font-bold text-slate-900 text-xl border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-300 w-96"
                            value={activeCourse.title}
                            onChange={(e) => { setActiveCourse({...activeCourse, title: e.target.value}); setHasUnsavedChanges(true); }}
                            placeholder="Naam van de cursus..."
                        />
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => { setActiveCourse({...activeCourse, isPublished: false}); setHasUnsavedChanges(true); }}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!activeCourse.isPublished ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Concept
                            </button>
                            <button
                                onClick={() => { setActiveCourse({...activeCourse, isPublished: true}); setHasUnsavedChanges(true); }}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${activeCourse.isPublished ? 'bg-green-100 text-green-700 shadow' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LucideIcons.Eye size={12} /> Live
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="Cursus Instellingen"
                            >
                                <LucideIcons.Settings size={18}/>
                            </button>
                            <span className="text-xs text-slate-400 font-medium hidden md:inline">
                                {hasUnsavedChanges ? 'Niet opgeslagen' : 'Opgeslagen'}
                            </span>
                            <button 
                                onClick={saveCourse}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                                    hasUnsavedChanges 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5' 
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                                <LucideIcons.Save size={18}/> Opslaan
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT: NAV RAIL */}
                    <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden flex-shrink-0">
                        <div className="p-4 overflow-y-auto flex-1 space-y-6">
                            {(activeCourse.modules || []).map((module, mIdx) => (
                                <div 
                                    key={module.id} 
                                    className="space-y-2 group/module"
                                    onDragOver={handleModuleDragOver}
                                    onDrop={(e) => handleLessonDrop(e, module.id)}
                                >
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-5 h-5 bg-slate-200 text-slate-500 rounded flex items-center justify-center text-[10px] font-bold">
                                            {mIdx + 1}
                                        </div>
                                        <input 
                                            className="bg-transparent text-xs font-bold text-slate-500 uppercase tracking-wider focus:outline-none focus:text-indigo-600 flex-1"
                                            value={module.title}
                                            onChange={(e) => {
                                                const updated = [...(activeCourse.modules || [])];
                                                updated[mIdx].title = e.target.value;
                                                setActiveCourse({...activeCourse, modules: updated});
                                                setHasUnsavedChanges(true);
                                            }}
                                        />
                                        <button onClick={() => deleteModule(module.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover/module:opacity-100 transition-opacity">
                                            <LucideIcons.Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-0.5">
                                        {(module.lessons || []).map(lesson => (
                                            <div 
                                                key={lesson.id}
                                                draggable
                                                onDragStart={(e) => handleLessonDragStart(e, module.id, lesson.id)}
                                                className="flex items-center group/lesson"
                                            >
                                                <button
                                                    onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(lesson.id); }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors flex-1 ${
                                                        selectedLessonId === lesson.id 
                                                        ? 'bg-white shadow-sm text-indigo-700 font-bold' 
                                                        : 'text-slate-600 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    <LucideIcons.GripVertical size={14} className="opacity-0 group-hover/lesson:opacity-50 cursor-grab mr-1 text-slate-400"/>
                                                    <LucideIcons.FileText size={14} className="opacity-50"/>
                                                    <span className="truncate">{lesson.title}</span>
                                                </button>
                                                <button 
                                                    onClick={() => deleteLesson(module.id, lesson.id)}
                                                    className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/lesson:opacity-100"
                                                >
                                                    <LucideIcons.Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => addLesson(module.id)}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 mt-1"
                                        >
                                            <LucideIcons.Plus size={12}/> Les Toevoegen
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addModule} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                <LucideIcons.Plus size={14}/> Nieuw Hoofdstuk
                            </button>
                        </div>
                    </div>

                    {/* CENTER: CANVAS (PREVIEW) */}
                    <div className="flex-1 bg-slate-100 overflow-y-auto relative p-8">
                        {selectedLessonId ? (
                            <div className="max-w-3xl mx-auto min-h-[800px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                                {/* Lesson Header */}
                                <div className="p-8 border-b border-slate-100">
                                    <input 
                                        className="font-serif text-3xl font-bold text-slate-900 border-none focus:ring-0 p-0 bg-transparent w-full placeholder:text-slate-300"
                                        value={getActiveContext()?.lesson?.title || ''}
                                        onChange={(e) => {
                                            const l = getActiveContext()?.lesson;
                                            if (l && selectedModuleId) updateBlock('', {}); 
                                            const updated = [...(activeCourse.modules || [])];
                                            const mod = updated.find(m => m.id === selectedModuleId);
                                            const les = (mod?.lessons || []).find(l => l.id === selectedLessonId);
                                            if (les) les.title = e.target.value;
                                            setActiveCourse({...activeCourse, modules: updated});
                                            setHasUnsavedChanges(true);
                                        }}
                                        placeholder="Titel van de les..."
                                    />
                                </div>

                                {/* Blocks Visuals */}
                                <div className="p-8 flex-1">
                                    {(getActiveContext()?.lesson?.blocks || []).map(block => renderBlockEditor(block))}
                                    
                                    {/* Add Block Trigger */}
                                    <div className="relative group/add mt-8">
                                        <button 
                                            onClick={() => setIsBlockPickerOpen(true)}
                                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 opacity-60 hover:opacity-100"
                                        >
                                            <LucideIcons.Plus size={18}/> Klik of typ '/' om content toe te voegen
                                        </button>

                                        {/* Block Picker Popover */}
                                        {isBlockPickerOpen && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="text-xs font-bold text-slate-400 uppercase px-3 py-2">Basis</div>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {BLOCK_TYPES.map(block => (
                                                        <button 
                                                            key={block.type}
                                                            onClick={() => addBlock(block.type)}
                                                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg flex items-center gap-3 group/item"
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${block.color}`}>
                                                                <block.icon size={16}/>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-700 group-hover/item:text-slate-900">{block.label}</div>
                                                                <div className="text-[10px] text-slate-400">{block.description}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {isBlockPickerOpen && <div className="fixed inset-0 z-40" onClick={() => setIsBlockPickerOpen(false)}></div>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <LucideIcons.Layout size={64} className="mb-4 opacity-20"/>
                                <h3 className="text-xl font-bold text-slate-600">Selecteer een les</h3>
                                <p className="text-sm mt-1 max-w-xs text-center">Kies een onderdeel uit de structuur links om de inhoud te bewerken.</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: INSPECTOR (CONTROLS) */}
                    <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden flex-shrink-0 shadow-xl z-20">
                        {renderInspector()}
                    </div>
                </div>

                {/* SETTINGS MODAL */}
                <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Cursus Instellingen">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Omslagfoto</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all" onClick={() => coverInputRef.current?.click()}>
                                {activeCourse.coverImage ? (
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 group">
                                        <img src={activeCourse.coverImage} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <LucideIcons.Edit2 className="text-white"/>
                                        </div>
                                    </div>
                                ) : (
                                    <LucideIcons.Image className="text-slate-300 w-12 h-12 mb-2"/>
                                )}
                                <span className="text-sm font-bold text-indigo-600">Upload Foto</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Beschrijving</label>
                            <textarea 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                rows={3}
                                value={activeCourse.description}
                                onChange={(e) => { setActiveCourse({...activeCourse, description: e.target.value}); setHasUnsavedChanges(true); }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categorie</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                                    value={activeCourse.category}
                                    onChange={(e) => { setActiveCourse({...activeCourse, category: e.target.value}); setHasUnsavedChanges(true); }}
                                >
                                    <option value="General">Algemeen</option>
                                    <option value="Onboarding">Onboarding</option>
                                    <option value="Safety">Veiligheid</option>
                                    <option value="Service">Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Niveau</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                                    value={activeCourse.level}
                                    onChange={(e) => { setActiveCourse({...activeCourse, level: e.target.value as any}); setHasUnsavedChanges(true); }}
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Gevorderd</option>
                                    <option value="Advanced">Expert</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={() => setIsSettingsModalOpen(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Klaar</button>
                    </div>
                </Modal>
            </div>
        );
    }

    // Default View (Dashboard/List)
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            <AcademySidebar 
                activeView={view} 
                onChangeView={setView} 
                onExit={onExit} 
                currentUser={currentUser} 
            />
            <main className="flex-1 overflow-hidden flex flex-col relative p-8">
                
                {/* DASHBOARD & CATALOG VIEW */}
                {(view === 'dashboard' || view === 'catalog') && (
                    <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                        {/* HERO / WELCOME */}
                        <div className="mb-10 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-slate-900">Welkom terug, {currentUser.name.split(' ')[0]}</h1>
                                <p className="text-slate-500 mt-1">Je hebt toegang tot <strong>{courses.filter(c => c.isPublished).length} trainingen</strong>.</p>
                            </div>
                        </div>

                        {/* CONTINUE WATCHING (Only on Dashboard) */}
                        {view === 'dashboard' && userProgress.length > 0 && (
                            <div className="mb-10">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Verder kijken</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {userProgress.map(prog => {
                                        const course = courses.find(c => c.id === prog.courseId);
                                        if (!course) return null;
                                        return (
                                            <div key={prog.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-center group cursor-pointer hover:border-indigo-200 transition-all" onClick={() => handleStartCourse(course)}>
                                                <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative">
                                                    {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover"/>}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                                        <LucideIcons.Play size={20} className="text-white fill-white"/>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-900 truncate">{course.title}</h4>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{ width: `${prog.progressPercentage}%` }}></div>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">{prog.progressPercentage}% voltooid</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* CATALOG GRID */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Catalogus</h3>
                            {renderCatalog()}
                        </div>
                    </div>
                )}

                {/* MANAGE COURSES VIEW (Admin Only) */}
                {view === 'manage-courses' && renderManageCourses()}

            </main>
        </div>
    );
};

export default AcademyPage;
