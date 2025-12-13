

import React, { useState, useRef, useMemo } from 'react';
import { 
    Send, Image as ImageIcon, X, 
    Bold, Italic, List, Edit2, Trash2, ArrowRight, ArrowLeft,
    Pin, AlertCircle, Clock, Layout, CheckCircle2, Calendar
} from 'lucide-react';
import { Employee, NewsPost, ViewState } from '../types';
import { Modal } from './Modal';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';

interface NewsPageProps {
  currentUser: Employee;
  newsItems: NewsPost[];
  onAddNews: (post: NewsPost) => Promise<void> | void;
  onUpdateNews?: (post: NewsPost) => Promise<void> | void; 
  onDeleteNews?: (id: string) => Promise<void> | void;     
  onMarkRead: (postId: string) => void;
}

// --- SUBCOMPONENTS ---

const HeroPost: React.FC<{ post: NewsPost, onClick: () => void, isRead: boolean }> = ({ post, onClick, isRead }) => {
    return (
        <div 
            onClick={onClick}
            className="relative w-full h-[400px] md:h-[450px] rounded-2xl overflow-hidden cursor-pointer group shadow-md mb-8 border border-slate-200"
        >
            <div className="absolute inset-0 bg-slate-900">
                {post.image ? (
                    <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-60"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Layout size={64} className="text-slate-700 opacity-20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-8 md:p-10 text-white">
                <div className="flex items-center gap-3 mb-3 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
                    <span className="bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        {post.isPinned && <Pin size={12} fill="currentColor" />}
                        Uitgelicht
                    </span>
                    <span className="text-slate-300 text-xs font-bold flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Calendar size={12}/> {post.date}
                    </span>
                    {post.isPinned && !isRead && (
                        <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider animate-pulse shadow-sm">
                            Lezen Vereist
                        </span>
                    )}
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3 max-w-4xl text-white shadow-sm">
                    {post.title}
                </h2>
                
                <p className="text-base md:text-lg text-slate-200 line-clamp-2 max-w-2xl mb-6 font-medium">
                    {post.shortDescription}
                </p>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <img src={post.authorAvatar} className="w-8 h-8 rounded-full border border-white/20" alt={post.authorName} />
                        <div className="text-sm">
                            <p className="font-bold text-white">{post.authorName}</p>
                            <p className="text-slate-300 text-xs">{post.authorRole}</p>
                        </div>
                    </div>
                    <button className="ml-auto bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-white/10">
                        Lees verder <ArrowRight size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

const NewsCard: React.FC<{ post: NewsPost, onClick: () => void, isRead: boolean }> = ({ post, onClick, isRead }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col h-full cursor-pointer group overflow-hidden"
        >
            <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                {post.image ? (
                    <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                        <ImageIcon size={40} className="opacity-20" />
                    </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                    {post.isPinned && (
                        <div className="bg-white/90 backdrop-blur-sm text-slate-900 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm flex items-center gap-1 uppercase tracking-wide">
                            <Pin size={10} fill="currentColor" /> Vastgezet
                        </div>
                    )}
                    {post.isPinned && !isRead && (
                        <div className="bg-rose-500 text-white px-2 py-1 rounded-md text-[10px] font-bold shadow-sm uppercase tracking-wide">
                            Nieuw
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                    <Calendar size={12} /> {post.date}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-teal-600 transition-colors">
                    {post.title}
                </h3>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                   {post.shortDescription}
                </p>

                <div className="flex items-center pt-4 border-t border-slate-50 mt-auto">
                    <img src={post.authorAvatar} alt={post.authorName} className="w-6 h-6 rounded-full object-cover border border-slate-100" />
                    <div className="ml-2">
                        <p className="text-xs font-bold text-slate-700">{post.authorName}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-teal-600 transition-colors" />
                </div>
            </div>
        </div>
    );
};

const NewsPage: React.FC<NewsPageProps> = ({ currentUser, newsItems, onAddNews, onUpdateNews, onDeleteNews, onMarkRead }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check Permission
  const canPost = hasPermission(currentUser, 'CREATE_NEWS');
  const canDelete = hasPermission(currentUser, 'DELETE_NEWS');

  // Sorting
  const sortedNews = useMemo(() => {
      return [...newsItems].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0; // Keep existing order otherwise
      });
  }, [newsItems]);

  const heroPost = sortedNews.length > 0 ? sortedNews[0] : null;
  const gridPosts = sortedNews.length > 0 ? sortedNews.slice(1) : [];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await api.uploadFile(file);
        if (publicUrl) {
            setImageUrl(publicUrl);
        }
      } catch (error) {
        console.error("News upload error", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setTitle('');
      setShortDescription('');
      setContent('');
      setImageUrl('');
      setIsPinned(false);
      setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (post: NewsPost) => {
      setEditingId(post.id);
      setTitle(post.title);
      setShortDescription(post.shortDescription);
      setContent(post.content);
      setImageUrl(post.image || '');
      setIsPinned(post.isPinned || false);
      setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        if (editingId && onUpdateNews) {
            const original = newsItems.find(n => n.id === editingId);
            if (!original) throw new Error("Origineel bericht niet gevonden");

            const updatedPost: NewsPost = {
                ...original,
                title,
                shortDescription,
                content,
                image: imageUrl || undefined,
                isPinned
            };
            await onUpdateNews(updatedPost);
            
            // If we are currently reading this post, update the view
            if (selectedPost?.id === editingId) {
                setSelectedPost(updatedPost);
            }

        } else {
            const newPost: NewsPost = {
              id: crypto.randomUUID(), 
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
              authorRole: currentUser.role,
              date: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
              title,
              shortDescription,
              content,
              image: imageUrl || undefined,
              readBy: [],
              isPinned
            };
            await onAddNews(newPost);
        }
        setIsCreateModalOpen(false);
    } catch (error) {
        console.error("Save failed", error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
      if (confirmDeleteId && onDeleteNews) {
          setIsDeleting(true);
          try {
              await onDeleteNews(confirmDeleteId);
              if (selectedPost?.id === confirmDeleteId) setSelectedPost(null);
              setConfirmDeleteId(null);
          } catch(e) {
              console.error("Delete failed", e);
          } finally {
              setIsDeleting(false);
          }
      }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('- ')) {
        return <li key={i} className="ml-6 list-disc text-slate-700 mb-2 pl-2">{parseInline(line.substring(2))}</li>;
      }
      if (line.trim().startsWith('## ')) {
          return <h3 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3">{parseInline(line.substring(3))}</h3>;
      }
      if (line.trim() === '') return <div key={i} className="h-4"></div>;
      
      return <p key={i} className="mb-4 leading-relaxed text-base text-slate-700">{parseInline(line)}</p>;
    });
  };

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-800">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const insertFormatting = (format: 'bold' | 'italic' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let newText = content;
    let newCursorPos = end;

    if (format === 'bold') {
      newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
      newCursorPos = end + 4; 
    } else if (format === 'italic') {
      newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
      newCursorPos = end + 2;
    } else if (format === 'list') {
      newText = content.substring(0, start) + `\n- ${selectedText}` + content.substring(end);
      newCursorPos = end + 3;
    }

    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <>
      {selectedPost ? (
          // --- READER VIEW ---
          <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Navigation Header */}
              <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                      <ArrowLeft size={18}/> Terug naar overzicht
                  </button>
                  
                  {/* Admin Actions */}
                  <div className="flex gap-2">
                        {(canPost && (selectedPost.authorName === currentUser.name || canDelete)) && (
                            <>
                                <button onClick={() => handleOpenEdit(selectedPost)} className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 rounded-xl transition-all shadow-sm">
                                    <Edit2 size={18}/>
                                </button>
                                {canDelete && (
                                    <button onClick={() => setConfirmDeleteId(selectedPost.id)} className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-xl transition-all shadow-sm">
                                        <Trash2 size={18}/>
                                    </button>
                                )}
                            </>
                        )}
                  </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden max-w-5xl mx-auto">
                  {/* Article Header Image */}
                  {selectedPost.image && (
                      <div className="h-[300px] md:h-[400px] w-full relative">
                           <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                           <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold border border-white/10">
                                        {selectedPost.date}
                                    </span>
                                    {selectedPost.isPinned && (
                                        <span className="bg-teal-500/90 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                                            <Pin size={12} fill="currentColor"/> Uitgelicht
                                        </span>
                                    )}
                                </div>
                           </div>
                      </div>
                  )}

                  <div className="p-8 md:p-12">
                      {/* Title & Author */}
                      {!selectedPost.image && (
                          <div className="flex items-center gap-3 mb-4">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold border border-slate-200">
                                    {selectedPost.date}
                                </span>
                                {selectedPost.isPinned && (
                                    <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 border border-teal-100">
                                        <Pin size={12} fill="currentColor"/> Uitgelicht
                                    </span>
                                )}
                          </div>
                      )}
                      
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                          {selectedPost.title}
                      </h1>

                      <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-8">
                            <img src={selectedPost.authorAvatar} className="w-12 h-12 rounded-full border border-slate-100" alt="Author"/>
                            <div>
                                <div className="font-bold text-slate-900 text-base">{selectedPost.authorName}</div>
                                <div className="text-slate-500 text-xs">{selectedPost.authorRole}</div>
                            </div>
                      </div>

                      {/* Content */}
                      <article className="prose prose-slate prose-lg max-w-none text-slate-700 leading-loose">
                            {renderFormattedText(selectedPost.content)}
                      </article>

                      {/* Read Confirmation Footer */}
                      {selectedPost.isPinned && !selectedPost.readBy?.includes(currentUser.id) ? (
                          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl p-8 border border-slate-200">
                              <h4 className="font-bold text-slate-900 mb-2">Heb je dit bericht gelezen?</h4>
                              <p className="text-slate-500 text-sm mb-4">Dit is een belangrijk bericht. Bevestig a.u.b. dat je het hebt gelezen.</p>
                              <button 
                                onClick={() => onMarkRead(selectedPost.id)}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 transform hover:-translate-y-1"
                              >
                                  <CheckCircle2 size={18}/> Ik heb dit gelezen
                              </button>
                          </div>
                      ) : selectedPost.readBy?.includes(currentUser.id) && selectedPost.isPinned ? (
                          <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-center">
                              <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-6 py-3 rounded-xl border border-green-100">
                                  <CheckCircle2 size={18}/> Gelezen op {new Date().toLocaleDateString('nl-NL')}
                              </div>
                          </div>
                      ) : null}
                  </div>
              </div>
          </div>
      ) : (
          // --- LIST VIEW ---
          <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nieuws & Updates</h1>
                  <p className="text-slate-500 mt-2 text-lg">Blijf op de hoogte van de laatste ontwikkelingen binnen Sanadome.</p>
              </div>
              
              {canPost && (
                <button 
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all w-full md:w-auto justify-center"
                >
                  <Send size={18} />
                  Nieuw Artikel
                </button>
              )}
            </div>

            {/* Hero Section */}
            {heroPost && (
                <HeroPost 
                  post={heroPost} 
                  onClick={() => setSelectedPost(heroPost)} 
                  isRead={heroPost.readBy?.includes(currentUser.id) || false}
                />
            )}

            {/* Content Grid */}
            {gridPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {gridPosts.map(post => (
                        <NewsCard 
                          key={post.id} 
                          post={post} 
                          onClick={() => setSelectedPost(post)}
                          isRead={post.readBy?.includes(currentUser.id) || false}
                        />
                    ))}
                </div>
            ) : (
                !heroPost && (
                  <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed max-w-2xl mx-auto">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-300 mb-6">
                          <Layout size={40} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Nog geen nieuws</h3>
                      <p className="text-slate-500">Er zijn nog geen nieuwsberichten geplaatst in de organisatie.</p>
                      {canPost && (
                          <button onClick={handleOpenCreate} className="mt-6 text-teal-600 font-bold hover:underline">
                              Plaats het eerste bericht
                          </button>
                      )}
                  </div>
                )
            )}
          </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingId ? "Artikel Bewerken" : "Nieuw Artikel"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
          <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titel</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  placeholder="Een pakkende kop..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Korte samenvatting</label>
                <textarea 
                  required
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium resize-none"
                  placeholder="Teaser voor het overzicht..."
                />
              </div>

              <div>
                 <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Inhoud</label>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                       <button type="button" onClick={() => insertFormatting('bold')} className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors" title="Vet"><Bold size={14}/></button>
                       <button type="button" onClick={() => insertFormatting('italic')} className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors" title="Cursief"><Italic size={14}/></button>
                       <button type="button" onClick={() => insertFormatting('list')} className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors" title="Lijst"><List size={14}/></button>
                    </div>
                 </div>
                <textarea 
                  ref={textareaRef}
                  required
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium leading-relaxed resize-none"
                  placeholder="Schrijf hier het volledige artikel..."
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Instellingen</label>
                
                <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-32 h-20 bg-white border-2 border-dashed border-slate-300 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:border-teal-500 transition-colors group">
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {imageUrl ? (
                            <>
                                <img src={imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => fileInputRef.current?.click()}>
                                    <Edit2 size={16} className="text-white"/>
                                </div>
                            </>
                        ) : (
                            <div className="text-center" onClick={() => !isUploading && fileInputRef.current?.click()}>
                                {isUploading ? <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div> : <ImageIcon size={20} className="text-slate-400 mx-auto"/>}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 mb-1">Omslagfoto</p>
                        <p className="text-xs text-slate-500 mb-2">Wordt gebruikt als banner en in de kaartweergave.</p>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-teal-600 hover:underline">
                            {imageUrl ? 'Wijzigen' : 'Uploaden'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <input 
                        type="checkbox" 
                        id="isPinned" 
                        checked={isPinned} 
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <label htmlFor="isPinned" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                        Belangrijk / Vastzetten
                    </label>
                </div>
              </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuleren
            </button>
            <button 
              type="submit"
              disabled={isUploading || isSaving}
              className="px-8 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Opslaan...' : (editingId ? 'Bijwerken' : 'Publiceren')} <Send size={16} />
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal 
        isOpen={!!confirmDeleteId} 
        onClose={() => setConfirmDeleteId(null)} 
        title="Bericht Verwijderen"
      >
         <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3 text-red-800">
                <AlertCircle className="shrink-0 mt-0.5" size={20}/>
                <p className="text-sm font-medium">Weet je zeker dat je dit nieuwsbericht wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
               <button 
                 onClick={() => setConfirmDeleteId(null)} 
                 disabled={isDeleting}
                 className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
               >
                 Annuleren
               </button>
               <button 
                 onClick={handleConfirmDelete}
                 disabled={isDeleting} 
                 className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 {isDeleting ? 'Bezig...' : 'Verwijderen'}
               </button>
            </div>
         </div>
      </Modal>
    </>
  );
};

export default NewsPage;