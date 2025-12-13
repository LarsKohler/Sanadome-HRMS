
import React, { useState, useRef, useMemo } from 'react';
import { 
    Heart, MessageSquare, Share2, Send, Image as ImageIcon, X, User, 
    Bold, Italic, List, ChevronRight, Edit2, Trash2, ArrowRight,
    Pin, AlertCircle, CheckCircle2, Clock, Eye, Layout
} from 'lucide-react';
import { Employee, NewsPost } from '../types';
import { Modal } from './Modal';
import { api } from '../utils/api';
import { hasPermission } from '../utils/permissions';

interface NewsPageProps {
  currentUser: Employee;
  newsItems: NewsPost[];
  onAddNews: (post: NewsPost) => Promise<void> | void;
  onUpdateNews?: (post: NewsPost) => Promise<void> | void; 
  onDeleteNews?: (id: string) => Promise<void> | void;     
  onLikeNews: (postId: string, userId: string) => void;
}

// --- SUBCOMPONENTS ---

const HeroPost: React.FC<{ post: NewsPost, onClick: () => void }> = ({ post, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden cursor-pointer group shadow-xl mb-8"
        >
            <div className="absolute inset-0">
                {post.image ? (
                    <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Layout size={64} className="text-slate-700 opacity-20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 text-white">
                <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
                    <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-teal-500/20">
                        {post.isPinned && <Pin size={10} fill="currentColor" />}
                        Uitgelicht
                    </span>
                    <span className="text-white/70 text-sm font-medium flex items-center gap-2">
                        <Clock size={14}/> {post.date}
                    </span>
                </div>
                
                <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight mb-4 max-w-4xl animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
                    {post.title}
                </h1>
                
                <p className="text-lg text-gray-200 line-clamp-2 max-w-2xl mb-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
                    {post.shortDescription}
                </p>

                <div className="flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-400">
                    <div className="flex items-center gap-3">
                        <img src={post.authorAvatar} className="w-10 h-10 rounded-full border-2 border-white/20" alt={post.authorName} />
                        <div className="text-sm">
                            <p className="font-bold">{post.authorName}</p>
                            <p className="text-white/60 text-xs">{post.authorRole}</p>
                        </div>
                    </div>
                    <button className="ml-auto md:ml-6 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group-hover:bg-white group-hover:text-slate-900">
                        Lees Artikel <ArrowRight size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

const NewsCard: React.FC<{ post: NewsPost, onClick: () => void, currentUser: Employee, onLike: () => void }> = ({ post, onClick, currentUser, onLike }) => {
    const isLiked = post.likedBy.includes(currentUser.id);

    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col h-full cursor-pointer group overflow-hidden"
        >
            <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                {post.image ? (
                    <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={48} className="opacity-20" />
                    </div>
                )}
                {post.isPinned && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-900 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                        <Pin size={12} fill="currentColor" /> Vastgezet
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
                    <Clock size={12} /> {post.date}
                </div>
                
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-3 leading-snug group-hover:text-teal-700 transition-colors">
                    {post.title}
                </h3>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                   {post.shortDescription}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <div className="flex items-center gap-2">
                        <img src={post.authorAvatar} alt={post.authorName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs font-bold text-slate-700">{post.authorName}</span>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onLike(); }}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors px-3 py-1.5 rounded-full ${isLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                    >
                        <Heart size={14} className={isLiked ? 'fill-current' : ''} />
                        <span>{post.likes}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const NewsPage: React.FC<NewsPageProps> = ({ currentUser, newsItems, onAddNews, onUpdateNews, onDeleteNews, onLikeNews }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Track save state
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Track delete state

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check Permission
  const canPost = hasPermission(currentUser, 'CREATE_NEWS');
  const canDelete = hasPermission(currentUser, 'DELETE_NEWS');

  // Sorting: Pinned first, then by date desc (assuming order is somewhat chronological or id-based)
  const sortedNews = useMemo(() => {
      // Create a copy to sort
      return [...newsItems].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // Fallback to insertion order (reversed via sort or simply assumed)
          // Simple string date sort attempt (nl format might be tricky, so rely on array order mostly)
          return 0; 
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
      // If editing from reader view, close reader
      if(selectedPost?.id === post.id) setSelectedPost(null);
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
        } else {
            const newPost: NewsPost = {
              id: crypto.randomUUID(), // Ensure distinct ID
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
              authorRole: currentUser.role,
              date: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
              title,
              shortDescription,
              content,
              image: imageUrl || undefined,
              likes: 0,
              likedBy: [],
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
    // Simple markdown-ish parser for display
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('- ')) {
        return <li key={i} className="ml-6 list-disc text-slate-700 mb-2 pl-2 font-sans">{parseInline(line.substring(2))}</li>;
      }
      if (line.trim().startsWith('## ')) {
          return <h3 key={i} className="text-xl font-bold font-serif text-slate-900 mt-6 mb-3">{parseInline(line.substring(3))}</h3>;
      }
      if (line.trim() === '') return <div key={i} className="h-4"></div>;
      
      return <p key={i} className="mb-4 leading-relaxed text-lg text-slate-700 font-sans">{parseInline(line)}</p>;
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
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 font-serif">Nieuws & Updates</h1>
            <p className="text-slate-500 mt-2 text-lg">Blijf op de hoogte van de laatste ontwikkelingen binnen Sanadome.</p>
        </div>
        
        {canPost && (
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
          >
            <Send size={18} />
            Nieuw Artikel
          </button>
        )}
      </div>

      {/* Hero Section */}
      {heroPost && (
          <HeroPost post={heroPost} onClick={() => setSelectedPost(heroPost)} />
      )}

      {/* Content Grid */}
      {gridPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridPosts.map(post => (
                  <NewsCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser} 
                    onClick={() => setSelectedPost(post)}
                    onLike={() => onLikeNews(post.id, currentUser.id)}
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-serif"
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

      {/* READ MODAL (Full Screen Overlay) */}
      {selectedPost && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
            <div 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh] animate-in zoom-in-95 duration-300 relative"
              onClick={(e) => e.stopPropagation()}
            >
               {/* Cover Image */}
               <div className="h-64 md:h-80 w-full relative flex-shrink-0 bg-slate-900">
                   {selectedPost.image ? (
                       <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover opacity-90" />
                   ) : (
                       <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                           <Layout size={64} className="text-white/20"/>
                       </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                   
                   {/* Close Button */}
                   <button 
                      onClick={() => setSelectedPost(null)}
                      className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md"
                   >
                     <X size={24} />
                   </button>

                   {/* Title Overlay */}
                   <div className="absolute bottom-0 left-0 w-full p-8 md:p-10 text-white">
                        <div className="flex items-center gap-3 mb-3 text-sm font-bold opacity-90">
                            <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded text-white">{selectedPost.date}</span>
                            {selectedPost.isPinned && <span className="flex items-center gap-1 text-teal-300"><Pin size={12} fill="currentColor"/> Vastgezet</span>}
                        </div>
                        <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight shadow-sm max-w-3xl">
                            {selectedPost.title}
                        </h1>
                   </div>
               </div>

               {/* Article Body */}
               <div className="flex-1 overflow-y-auto bg-white">
                  <div className="p-8 md:p-12 max-w-3xl mx-auto">
                      
                      {/* Author Info */}
                      <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-100">
                          <div className="flex items-center gap-4">
                              <img src={selectedPost.authorAvatar} className="w-12 h-12 rounded-full border-2 border-slate-100" alt="Author"/>
                              <div>
                                  <div className="font-bold text-slate-900 text-lg">{selectedPost.authorName}</div>
                                  <div className="text-slate-500 text-sm">{selectedPost.authorRole}</div>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              {/* Admin Actions */}
                              {(canPost && (selectedPost.authorName === currentUser.name || canDelete)) && (
                                  <div className="flex gap-2">
                                      <button onClick={() => handleOpenEdit(selectedPost)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                          <Edit2 size={20}/>
                                      </button>
                                      {canDelete && (
                                          <button onClick={() => setConfirmDeleteId(selectedPost.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                              <Trash2 size={20}/>
                                          </button>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Content */}
                      <article className="prose prose-slate prose-lg max-w-none text-slate-700 leading-loose font-sans">
                         {renderFormattedText(selectedPost.content)}
                      </article>
                  </div>
               </div>

               {/* Footer / Interaction */}
               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex gap-4">
                      <button 
                        onClick={() => onLikeNews(selectedPost.id, currentUser.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-sm shadow-sm ${selectedPost.likedBy.includes(currentUser.id) ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                         <Heart size={20} className={selectedPost.likedBy.includes(currentUser.id) ? 'fill-current' : ''}/>
                         {selectedPost.likes} {selectedPost.likes === 1 ? 'Like' : 'Likes'}
                      </button>
                      <button className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm">
                         <MessageSquare size={20}/> Reageer
                      </button>
                  </div>
                  <button className="p-3 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors">
                    <Share2 size={20} />
                  </button>
               </div>
            </div>
         </div>
      )}

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

    </div>
  );
};

export default NewsPage;
