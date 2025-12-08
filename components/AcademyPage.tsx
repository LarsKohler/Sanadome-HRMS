
import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, CheckCircle, Search, Plus, Edit2, Trash2, 
    BookOpen, GraduationCap, ChevronRight, ChevronDown, 
    Layout, Save, ArrowLeft, FileText, 
    Video, HelpCircle, Image as ImageIcon, MousePointer, 
    Layers, List, Upload, Check, GripVertical, X, Star, Clock, ArrowRight, Settings, Music, Eye, Sparkles, Loader2, MonitorPlay, MoreVertical, AlertTriangle
} from 'lucide-react';
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
    { type: 'text', label: 'Rich Text', icon: FileText, color: 'text-slate-600 bg-slate-100', description: 'Tekst, koppen, quotes en opmaak.' },
    { type: 'video', label: 'Video', icon: Video, color: 'text-red-600 bg-red-100', description: 'YouTube, Vimeo of upload.' },
    { type: 'hotspot', label: 'Hotspot Image', icon: MousePointer, color: 'text-orange-600 bg-orange-100', description: 'Interactieve afbeelding met klikbare punten.' },
    { type: 'flashcard', label: 'Flashcards', icon: Layers, color: 'text-indigo-600 bg-indigo-100', description: 'Omdraaibare kaarten om te oefenen.' },
    { type: 'quiz', label: 'Kennis Quiz', icon: HelpCircle, color: 'text-teal-600 bg-teal-100', description: 'Toets de kennis met vragen.' },
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
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
        // Placeholder for Learner Player View
        onShowToast(`Start training: ${course.title}`);
        // In a real app, this would switch to a 'player' view.
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

    const addBlock = (type: BlockType) => {
        const context = getActiveContext();
        if (!context || !activeCourse) return;

        let content: any = {};
        if (type === 'text') content = { html: '', style: 'paragraph' };
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
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    // --- RENDERERS ---

    const renderBlockEditor = (block: LearningBlock) => {
        const isSelected = block.id === selectedBlockId;
        const styleClass = block.content.style === 'h1' ? 'text-3xl font-bold text-slate-900' : 
                          block.content.style === 'h2' ? 'text-2xl font-bold text-slate-800 mt-4' :
                          block.content.style === 'quote' ? 'text-xl italic text-slate-600 border-l-4 border-slate-300 pl-4 py-2' :
                          block.content.style === 'alert' ? 'bg-amber-50 text-amber-900 p-4 rounded-lg border border-amber-200 font-medium' :
                          'text-slate-600 leading-relaxed';

        return (
            <div 
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`group relative rounded-xl border-2 transition-all cursor-pointer mb-4 ${isSelected ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-100 z-10' : 'border-transparent hover:border-slate-200'}`}
            >
                {/* Drag Handle & Actions */}
                <div className={`absolute -left-12 top-2 flex flex-col gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="p-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-grab active:cursor-grabbing shadow-sm">
                        <GripVertical size={14}/>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600"><ChevronDown className="rotate-180" size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600"><ChevronDown size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-red-600"><Trash2 size={14}/></button>
                </div>

                <div className="p-2">
                    {/* TYPE SPECIFIC RENDER - VISUAL PREVIEW ONLY */}
                    
                    {block.type === 'text' && (
                        <textarea 
                            className={`w-full resize-none outline-none bg-transparent ${styleClass}`}
                            value={block.content.html}
                            onChange={(e) => updateBlock(block.id, { ...block.content, html: e.target.value })}
                            placeholder={block.content.style === 'h1' ? "Koptekst..." : "Typ hier je tekst..."}
                            rows={Math.max(1, (block.content.html || '').split('\n').length)}
                        />
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
                                    <MonitorPlay size={48} className="mb-2 opacity-50"/>
                                    <p className="font-bold text-sm">Geen video geselecteerd</p>
                                    <p className="text-xs">Configureer in de zijbalk &rarr;</p>
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'hotspot' && (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                            {block.content.imageUrl ? (
                                <div className="relative">
                                    <img src={block.content.imageUrl} alt="Hotspot Base" className="w-full object-cover" />
                                    {/* Render Hotspots Visuals */}
                                    {(block.content.spots || []).map((spot: any) => (
                                        <div 
                                            key={spot.id}
                                            className="absolute w-8 h-8 -ml-4 -mt-4 bg-indigo-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:scale-110 transition-transform z-10"
                                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                            title={spot.title}
                                        >
                                            <Plus size={14}/>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                    <ImageIcon size={48} className="mb-2 opacity-50"/>
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
                                            {opt.isCorrect && <Check size={12}/>}
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
                <Settings size={48} className="mb-4 opacity-20"/>
                <p className="text-sm font-medium">Selecteer een blok in het midden om de inhoud te configureren.</p>
            </div>
        );

        const context = getActiveContext();
        if (!context) return null;
        
        const block = (context.lesson?.blocks || []).find(b => b.id === selectedBlockId);
        if (!block) return null;
        
        const BlockIcon = BLOCK_TYPES.find(b => b.type === block.type)?.icon || HelpCircle;

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
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tekst Stijl</label>
                        <select 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={block.content.style}
                            onChange={(e) => updateBlock(block.id, { ...block.content, style: e.target.value })}
                        >
                            <option value="paragraph">Paragraaf</option>
                            <option value="h1">Kop 1 (Groot)</option>
                            <option value="h2">Kop 2 (Medium)</option>
                            <option value="quote">Quote Blok</option>
                            <option value="alert">Alert Box</option>
                        </select>
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
                            {isUploading ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} 
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
                                    <Upload size={18}/>
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
                                            <X size={14}/>
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
                                                    <input className="w-full pl-6 p-2 border border-slate-200 rounded-lg text-sm" type="number" value={spot.x} onChange={(e) => {
                                                        const newSpots = [...block.content.spots];
                                                        newSpots[i].x = parseFloat(e.target.value);
                                                        updateBlock(block.id, { ...block.content, spots: newSpots });
                                                    }}/>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-2 top-2 text-xs text-slate-400 font-bold">Y</span>
                                                    <input className="w-full pl-6 p-2 border border-slate-200 rounded-lg text-sm" type="number" value={spot.y} onChange={(e) => {
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
                                            <Check size={16} strokeWidth={3}/>
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
                                        }} className="text-slate-300 hover:text-red-500 p-1"><X size={16}/></button>
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
                                        <X size={14}/>
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
                        <Trash2 size={16}/> Blok Verwijderen
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
                        <Plus size={18}/> Nieuwe Cursus
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
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>
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
                                                <Eye size={12}/> Live
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                <Edit2 size={12}/> Concept
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
                                                <Edit2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-500 transition-colors"
                                                title="Verwijderen"
                                            >
                                                <Trash2 size={16}/>
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
        <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Catalogus</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(courses || []).filter(c => c.isPublished).map(course => (
                    <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer overflow-hidden flex flex-col h-full" onClick={() => handleStartCourse(course)}>
                        <div className="h-40 bg-slate-100 relative overflow-hidden">
                            {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>}
                            
                            {/* Play Overlay */}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                                    <Play size={20} className="ml-1 text-slate-900"/>
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
                {courses.filter(c => c.isPublished).length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                        <GraduationCap size={48} className="mx-auto mb-4 opacity-50"/>
                        <p className="font-bold">Geen trainingen beschikbaar</p>
                        <p className="text-sm mt-1">Check later terug voor nieuwe content.</p>
                    </div>
                )}
            </div>
        </div>
    );

    // --- MAIN RENDER ---

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
                            <button 
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="Cursus Instellingen"
                            >
                                <Settings size={18}/>
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
                                            <Edit2 className="text-white"/>
                                        </div>
                                    </div>
                                ) : (
                                    <ImageIcon className="text-slate-300 w-12 h-12 mb-2"/>
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