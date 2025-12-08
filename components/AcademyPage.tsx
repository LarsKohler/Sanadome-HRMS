
import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, CheckCircle, Search, Plus, Edit2, Trash2, 
    BookOpen, GraduationCap, ChevronRight, ChevronDown, 
    Layout, Save, ArrowLeft, FileText, 
    Video, HelpCircle, Image as ImageIcon, MousePointer, 
    Layers, List, Upload, Check, GripVertical, X, Star, Clock, ArrowRight, Settings, Music, Eye, Sparkles, Loader2
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress, AcademyModule, AcademyLesson, LearningBlock, BlockType } from '../types';
import AcademySidebar from './AcademySidebar';
import { api } from '../utils/api';

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onExit: () => void;
}

// --- CONFIG ---
const BLOCK_TYPES: { type: BlockType; label: string; icon: any; color: string; description: string }[] = [
    { type: 'text', label: 'Rich Text', icon: FileText, color: 'text-slate-600 bg-slate-100', description: 'Tekst, koppen, quotes en opmaak.' },
    { type: 'video', label: 'Video', icon: Video, color: 'text-red-600 bg-red-100', description: 'YouTube, Vimeo of upload.' },
    { type: 'audio', label: 'Audio', icon: Music, color: 'text-purple-600 bg-purple-100', description: 'Podcast of audiofragment.' },
    { type: 'hotspot', label: 'Hotspot Image', icon: MousePointer, color: 'text-orange-600 bg-orange-100', description: 'Interactieve afbeelding met klikbare punten.' },
    { type: 'flashcard', label: 'Flashcards', icon: Layers, color: 'text-indigo-600 bg-indigo-100', description: 'Omdraaibare kaarten om te oefenen.' },
    { type: 'quiz', label: 'Kennis Quiz', icon: HelpCircle, color: 'text-teal-600 bg-teal-100', description: 'Toets de kennis met vragen.' },
    { type: 'accordion', label: 'Accordion', icon: List, color: 'text-blue-600 bg-blue-100', description: 'Uitklapbare secties voor veel tekst.' },
];

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

    // Refs for uploads
    const fileInputRef = useRef<HTMLInputElement>(null);
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
                // Ideally we'd merge, but for now we prioritize builder safety
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
        // Add safe check for activeCourse.modules since it can be undefined on new courses
        const module = (activeCourse.modules || []).find(m => m.id === selectedModuleId);
        const lesson = (module?.lessons || []).find(l => l.id === selectedLessonId);
        return { module, lesson };
    };

    // --- BUILDER ACTIONS ---

    const handleOpenBuilder = (course?: AcademyCourse) => {
        if (course) {
            // Deep copy to prevent direct mutation before save
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

    const addLesson = (moduleId: string) => {
        if (!activeCourse) return;
        const newLesson: AcademyLesson = {
            id: crypto.randomUUID(),
            title: 'Nieuwe Les',
            blocks: [], // Empty blocks array
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

    const addBlock = (type: BlockType) => {
        const context = getActiveContext();
        if (!context || !activeCourse) return;

        let content: any = {};
        // Default content structures
        if (type === 'text') content = { html: 'Typ hier je tekst...', style: 'paragraph' };
        if (type === 'video') content = { url: '', source: 'youtube' };
        if (type === 'hotspot') content = { imageUrl: '', spots: [] };
        if (type === 'flashcard') content = { cards: [{ id: '1', front: 'Vraag', back: 'Antwoord' }] };
        if (type === 'quiz') content = { question: 'Nieuwe vraag?', type: 'single', options: [{ id: '1', text: 'Antwoord A', isCorrect: true }] };

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
        
        // Update local list immediately
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
                    // Find the block to get its current content
                    const context = getActiveContext();
                    const block = context?.lesson?.blocks.find(b => b.id === blockId);
                    
                    if (block) {
                        const newContent = { ...block.content };
                        if (type === 'video') {
                            newContent.url = url;
                            newContent.source = 'upload';
                        } else if (type === 'image') {
                            newContent.imageUrl = url;
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
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    // --- RENDERERS ---

    const renderBlockEditor = (block: LearningBlock) => {
        const isSelected = block.id === selectedBlockId;
        const BlockIcon = BLOCK_TYPES.find(b => b.type === block.type)?.icon || HelpCircle;

        return (
            <div 
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`group relative rounded-xl border-2 transition-all cursor-pointer mb-4 ${isSelected ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-100' : 'border-transparent bg-white hover:border-slate-200'}`}
            >
                {/* Drag Handle & Actions */}
                <div className={`absolute -left-10 top-2 flex flex-col gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-grab active:cursor-grabbing">
                        <GripVertical size={14}/>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600"><ChevronDown className="rotate-180" size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600"><ChevronDown size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-red-600"><Trash2 size={14}/></button>
                </div>

                <div className="p-6">
                    {/* TYPE SPECIFIC RENDER */}
                    {block.type === 'text' && (
                        <div className="prose max-w-none">
                            <textarea 
                                className="w-full resize-none outline-none bg-transparent text-slate-700"
                                value={block.content.html}
                                onChange={(e) => updateBlock(block.id, { ...block.content, html: e.target.value })}
                                placeholder="Typ hier je tekst..."
                                rows={Math.max(3, (block.content.html || '').split('\n').length)}
                            />
                        </div>
                    )}

                    {block.type === 'video' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg text-red-700 font-bold text-xs w-fit">
                                <Video size={14}/> Video Embed
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                                    placeholder="YouTube / Vimeo URL..."
                                    value={block.content.url}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                                />
                                <button 
                                    onClick={() => handleTriggerUpload(block.id, 'video')}
                                    disabled={isUploading}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>} Upload
                                </button>
                            </div>
                            {block.content.url && (
                                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                                    {block.content.url.includes('http') && !block.content.url.includes('youtube') && !block.content.url.includes('vimeo') ? (
                                        <video src={block.content.url} controls className="w-full h-full" />
                                    ) : (
                                        <iframe className="w-full h-full pointer-events-none" src={block.content.url.replace('watch?v=', 'embed/')} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'hotspot' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg text-orange-700 font-bold text-xs w-fit">
                                <MousePointer size={14}/> Hotspot Image
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                                    placeholder="Afbeelding URL..."
                                    value={block.content.imageUrl}
                                    onChange={(e) => updateBlock(block.id, { ...block.content, imageUrl: e.target.value })}
                                />
                                <button 
                                    onClick={() => handleTriggerUpload(block.id, 'image')}
                                    disabled={isUploading}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>} Upload
                                </button>
                            </div>
                            {block.content.imageUrl && (
                                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                    <img src={block.content.imageUrl} alt="Hotspot Base" className="w-full object-cover max-h-96" />
                                    <div className="absolute bottom-2 right-2 bg-white/90 text-[10px] px-2 py-1 rounded shadow text-slate-500">
                                        Configureer hotspots in Inspector &rarr;
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'flashcard' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg text-indigo-700 font-bold text-xs w-fit">
                                <Layers size={14}/> Flashcards
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(block.content.cards || []).map((card: any, idx: number) => (
                                    <div key={card.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                        <div className="flex justify-between mb-2 text-xs font-bold text-slate-400 uppercase">
                                            <span>Kaart {idx + 1}</span>
                                            <button onClick={() => {
                                                const newCards = (block.content.cards || []).filter((c: any) => c.id !== card.id);
                                                updateBlock(block.id, { ...block.content, cards: newCards });
                                            }}><X size={12}/></button>
                                        </div>
                                        <input 
                                            className="w-full mb-2 p-2 border rounded text-sm font-bold" 
                                            placeholder="Voorkant (Vraag)"
                                            value={card.front}
                                            onChange={(e) => {
                                                const newCards = [...(block.content.cards || [])];
                                                newCards[idx].front = e.target.value;
                                                updateBlock(block.id, { ...block.content, cards: newCards });
                                            }}
                                        />
                                        <textarea 
                                            className="w-full p-2 border rounded text-sm" 
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
                                ))}
                                <button 
                                    onClick={() => updateBlock(block.id, { ...block.content, cards: [...(block.content.cards || []), { id: Math.random().toString(), front: '', back: '' }] })}
                                    className="border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors h-full min-h-[100px]"
                                >
                                    <Plus size={24}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Placeholder for other types */}
                    {!['text', 'video', 'flashcard', 'hotspot'].includes(block.type) && (
                        <div className="flex items-center gap-3 text-slate-400 italic">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                {React.createElement(BlockIcon, { size: 20 })}
                            </div>
                            {BLOCK_TYPES.find(b => b.type === block.type)?.label} Editor (Configureer in Inspector rechts)
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- INSPECTOR RENDERER ---
    const renderInspector = () => {
        if (!selectedBlockId) return (
            <div className="p-6 text-center text-slate-400">
                <Settings size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-sm">Selecteer een blok om de instellingen te wijzigen.</p>
            </div>
        );

        const context = getActiveContext();
        if (!context) return null;
        
        const block = (context.lesson?.blocks || []).find(b => b.id === selectedBlockId);
        if (!block) return null;
        
        const BlockIcon = BLOCK_TYPES.find(b => b.type === block.type)?.icon || HelpCircle;

        return (
            <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Blok Type</span>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        {React.createElement(BlockIcon, { size: 18 })}
                        {BLOCK_TYPES.find(b => b.type === block.type)?.label}
                    </h3>
                </div>

                {/* Specific Settings based on Block Type */}
                {block.type === 'text' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Stijl</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                            value={block.content.style}
                            onChange={(e) => updateBlock(block.id, { ...block.content, style: e.target.value })}
                        >
                            <option value="paragraph">Paragraaf</option>
                            <option value="h1">Kop 1</option>
                            <option value="h2">Kop 2</option>
                            <option value="quote">Quote</option>
                            <option value="alert">Alert Box</option>
                        </select>
                    </div>
                )}

                {block.type === 'hotspot' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Hotspots</label>
                        <div className="space-y-2">
                            {(block.content.spots || []).map((spot: any, i: number) => (
                                <div key={spot.id} className="p-2 border border-slate-200 rounded bg-slate-50">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-bold">Punt {i + 1}</span>
                                        <button onClick={() => {
                                            const newSpots = block.content.spots.filter((s: any) => s.id !== spot.id);
                                            updateBlock(block.id, { ...block.content, spots: newSpots });
                                        }}><X size={12}/></button>
                                    </div>
                                    <input 
                                        className="w-full p-1 border rounded text-xs mb-1" 
                                        placeholder="Titel" 
                                        value={spot.title}
                                        onChange={(e) => {
                                            const newSpots = [...block.content.spots];
                                            newSpots[i].title = e.target.value;
                                            updateBlock(block.id, { ...block.content, spots: newSpots });
                                        }}
                                    />
                                    <div className="flex gap-2 text-xs">
                                        <input className="w-1/2 p-1 border rounded" placeholder="X %" value={spot.x} onChange={(e) => {
                                            const newSpots = [...block.content.spots];
                                            newSpots[i].x = parseFloat(e.target.value);
                                            updateBlock(block.id, { ...block.content, spots: newSpots });
                                        }}/>
                                        <input className="w-1/2 p-1 border rounded" placeholder="Y %" value={spot.y} onChange={(e) => {
                                            const newSpots = [...block.content.spots];
                                            newSpots[i].y = parseFloat(e.target.value);
                                            updateBlock(block.id, { ...block.content, spots: newSpots });
                                        }}/>
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => updateBlock(block.id, { ...block.content, spots: [...(block.content.spots || []), { id: Math.random().toString(), x: 50, y: 50, title: 'Nieuw punt', text: '' }] })}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold"
                            >
                                + Hotspot Toevoegen
                            </button>
                        </div>
                    </div>
                )}

                {block.type === 'quiz' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Vraag</label>
                            <input 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold"
                                value={block.content.question}
                                onChange={(e) => updateBlock(block.id, { ...block.content, question: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Antwoorden</label>
                            {(block.content.options || []).map((opt: any, i: number) => (
                                <div key={opt.id} className="flex gap-2 mb-2">
                                    <button 
                                        onClick={() => {
                                            const newOpts = block.content.options.map((o: any) => ({ ...o, isCorrect: o.id === opt.id }));
                                            updateBlock(block.id, { ...block.content, options: newOpts });
                                        }}
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-1 ${opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-slate-400'}`}
                                    >
                                        <Check size={12}/>
                                    </button>
                                    <input 
                                        className="flex-1 p-1.5 border border-slate-200 rounded text-sm"
                                        value={opt.text}
                                        onChange={(e) => {
                                            const newOpts = [...block.content.options];
                                            newOpts[i].text = e.target.value;
                                            updateBlock(block.id, { ...block.content, options: newOpts });
                                        }}
                                    />
                                    <button onClick={() => {
                                        const newOpts = block.content.options.filter((o: any) => o.id !== opt.id);
                                        updateBlock(block.id, { ...block.content, options: newOpts });
                                    }} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                                </div>
                            ))}
                            <button 
                                onClick={() => updateBlock(block.id, { ...block.content, options: [...(block.content.options || []), { id: Math.random().toString(), text: '', isCorrect: false }] })}
                                className="text-xs text-teal-600 font-bold hover:underline mt-1"
                            >
                                + Antwoord toevoegen
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-slate-100">
                    <button 
                        onClick={() => deleteBlock(block.id)}
                        className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                        <Trash2 size={16}/> Blok Verwijderen
                    </button>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (view === 'builder' && activeCourse) {
        return (
            <div className="flex flex-col h-screen bg-white font-sans">
                {/* Hidden File Input for Uploads */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/*,video/*"
                />

                {/* HEADER */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-30 shadow-sm relative">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
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
                    
                    {/* PUBLISH TOGGLE */}
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
                                <Eye size={12} /> Live
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-medium">
                                {hasUnsavedChanges ? 'Wijzigingen niet opgeslagen' : 'Opgeslagen'}
                            </span>
                            <button 
                                onClick={saveCourse}
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
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT: NAV RAIL */}
                    <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden flex-shrink-0">
                        <div className="p-4 overflow-y-auto flex-1 space-y-6">
                            {(activeCourse.modules || []).map((module, mIdx) => (
                                <div key={module.id} className="space-y-2">
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
                                    </div>
                                    <div className="space-y-0.5">
                                        {(module.lessons || []).map(lesson => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => { setSelectedModuleId(module.id); setSelectedLessonId(lesson.id); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                                                    selectedLessonId === lesson.id 
                                                    ? 'bg-white shadow-sm text-indigo-700 font-bold' 
                                                    : 'text-slate-600 hover:bg-slate-200/50'
                                                }`}
                                            >
                                                <FileText size={14} className="opacity-50"/>
                                                <span className="truncate">{lesson.title}</span>
                                            </button>
                                        ))}
                                        <button 
                                            onClick={() => addLesson(module.id)}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 mt-1"
                                        >
                                            <Plus size={12}/> Les Toevoegen
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addModule} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                <Plus size={14}/> Nieuw Hoofdstuk
                            </button>
                        </div>
                    </div>

                    {/* CENTER: CANVAS */}
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
                                            if (l && selectedModuleId) updateBlock('', {}); // Hack to trigger update
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

                                {/* Blocks Canvas */}
                                <div className="p-8 flex-1">
                                    {(getActiveContext()?.lesson?.blocks || []).map(block => renderBlockEditor(block))}
                                    
                                    {/* Add Block Trigger */}
                                    <div className="relative group/add mt-4">
                                        <button 
                                            onClick={() => setIsBlockPickerOpen(true)}
                                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 opacity-60 hover:opacity-100"
                                        >
                                            <Plus size={18}/> Klik of typ '/' om content toe te voegen
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
                                <Layout size={64} className="mb-4 opacity-20"/>
                                <h3 className="text-xl font-bold text-slate-600">Selecteer een les</h3>
                                <p className="text-sm mt-1 max-w-xs text-center">Kies een onderdeel uit de structuur links om de inhoud te bewerken.</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: INSPECTOR */}
                    <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden flex-shrink-0">
                        {renderInspector()}
                    </div>
                </div>
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
                
                {/* HERO / WELCOME */}
                <div className="mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-slate-900">Welkom terug, {currentUser.name.split(' ')[0]}</h1>
                        <p className="text-slate-500 mt-1">Je hebt <strong>{courses.filter(c => c.isPublished).length} trainingen</strong> beschikbaar.</p>
                    </div>
                    {/* Only managers can create */}
                    {(currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker') && (
                        <button 
                            onClick={() => handleOpenBuilder()}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                        >
                            <Plus size={18}/> Nieuwe Training
                        </button>
                    )}
                </div>

                {/* CONTINUE WATCHING */}
                {userProgress.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Verder kijken</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userProgress.map(prog => {
                                const course = courses.find(c => c.id === prog.courseId);
                                if (!course) return null;
                                return (
                                    <div key={prog.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-center group cursor-pointer hover:border-indigo-200 transition-all">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative">
                                            {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover"/>}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                                <Play size={20} className="text-white fill-white"/>
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

                {/* ALL COURSES */}
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Catalogus</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {(courses || []).filter(c => c.isPublished || currentUser.role === 'Manager').map(course => (
                            <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer overflow-hidden flex flex-col h-full" onClick={() => (currentUser.role === 'Manager' ? handleOpenBuilder(course) : null)}>
                                <div className="h-40 bg-slate-100 relative overflow-hidden">
                                    {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>}
                                    
                                    {/* Edit Overlay for Managers */}
                                    {currentUser.role === 'Manager' && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white font-bold flex items-center gap-2 border-2 border-white px-4 py-2 rounded-xl">
                                                <Edit2 size={16}/> Bewerken
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Badge */}
                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-indigo-900 shadow-sm">
                                        {course.category}
                                    </div>
                                    
                                    {!course.isPublished && (
                                        <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-200">
                                            Concept
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="font-bold text-lg text-slate-900 mb-2 leading-tight">{course.title}</h3>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed flex-1">{course.description || 'Geen beschrijving'}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1"><Layers size={12}/> {(course.modules || []).length}</span>
                                            <span className="flex items-center gap-1"><Clock size={12}/> {course.estimatedTime || '30m'}</span>
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                            <Sparkles size={10} /> {course.xpPoints} XP
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AcademyPage;
