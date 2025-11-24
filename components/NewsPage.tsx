
import React, { useState, useRef } from 'react';
import { Heart, MessageSquare, Share2, Send, Image as ImageIcon, X, User, Bold, Italic, List, Maximize2, ChevronRight } from 'lucide-react';
import { Employee, NewsPost } from '../types';
import { Modal } from './Modal';

interface NewsPageProps {
  currentUser: Employee;
  newsItems: NewsPost[];
  onAddNews: (post: NewsPost) => void;
  onLikeNews: (postId: string, userId: string) => void;
}

const NewsPage: React.FC<NewsPageProps> = ({ currentUser, newsItems, onAddNews, onLikeNews }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canPost = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPost: NewsPost = {
      id: Math.random().toString(36).substr(2, 9),
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      date: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
      title,
      shortDescription,
      content,
      image: imageUrl || undefined,
      likes: 0,
      likedBy: []
    };

    onAddNews(newPost);
    
    setTitle('');
    setShortDescription('');
    setContent('');
    setImageUrl('');
    setIsCreateModalOpen(false);
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc text-slate-700 mb-1">{parseInline(line.substring(2))}</li>;
      }
      return <p key={i} className="mb-2 min-h-[1rem]">{parseInline(line)}</p>;
    });
  };

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Nieuws & Updates</h1>
            <p className="text-slate-500 mt-1">Blijf op de hoogte van de laatste ontwikkelingen.</p>
        </div>
        
        {canPost && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
          >
            <Send size={18} />
            Bericht plaatsen
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-8">
        {newsItems.map((post) => {
          const isLiked = post.likedBy.includes(currentUser.id);
          
          return (
            <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer group"
            >
              {post.image && (
                <div className="h-56 w-full overflow-hidden relative">
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <img 
                      src={post.authorAvatar} 
                      alt={post.authorName} 
                      className="w-9 h-9 rounded-full object-cover border border-slate-100"
                    />
                    <div>
                       <div className="text-xs font-bold text-slate-800">{post.authorName}</div>
                       <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{post.date}</div>
                    </div>
                  </div>
                  <button className="text-slate-300 hover:text-slate-500 transition-colors">
                    <Maximize2 size={16} />
                  </button>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-teal-700 transition-colors">{post.title}</h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3 font-normal">
                   {post.shortDescription}
                </p>
                
                <div className="text-sm text-teal-600 font-bold mb-6 hover:underline flex items-center gap-1">
                    Lees verder <ChevronRight size={14} />
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-50 mt-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => onLikeNews(post.id, currentUser.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors px-3 py-1.5 rounded-full ${isLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 px-3 py-1.5 rounded-full hover:bg-teal-50 transition-colors">
                      <MessageSquare size={16} />
                      <span>Reageer</span>
                    </button>
                  </div>
                  <button className="text-slate-400 hover:text-teal-600 p-2 rounded-full hover:bg-teal-50 transition-colors">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {newsItems.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 border-dashed max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 text-slate-300 mb-6">
                  <User size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Nog geen nieuws</h3>
              <p className="text-slate-500">Er zijn nog geen nieuwsberichten geplaatst in de organisatie.</p>
          </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nieuwsbericht opstellen"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titel</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              placeholder="Teaser voor het overzicht..."
            />
          </div>

          <div>
             <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Volledig bericht</label>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                   <button 
                     type="button"
                     onClick={() => insertFormatting('bold')}
                     className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                     title="Vetgedrukt"
                   >
                     <Bold size={14} />
                   </button>
                   <button 
                     type="button"
                     onClick={() => insertFormatting('italic')}
                     className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                     title="Cursief"
                   >
                     <Italic size={14} />
                   </button>
                   <button 
                     type="button"
                     onClick={() => insertFormatting('list')}
                     className="p-1.5 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                     title="Lijst"
                   >
                     <List size={14} />
                   </button>
                </div>
             </div>
            <textarea 
              ref={textareaRef}
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium leading-relaxed"
              placeholder="Schrijf hier het artikel..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Omslagfoto</label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {!imageUrl ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 cursor-pointer transition-all hover:border-teal-400 group"
              >
                <div className="w-14 h-14 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                   <ImageIcon size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700">Afbeelding uploaden</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG tot 5MB</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 group shadow-md">
                 <img src={imageUrl} alt="Preview" className="w-full h-56 object-cover" />
                 <button 
                   type="button"
                   onClick={() => { setImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                   className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md rounded-lg text-slate-700 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all transform scale-90 hover:scale-100"
                 >
                   <X size={18} />
                 </button>
              </div>
            )}
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-6 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuleren
            </button>
            <button 
              type="submit"
              className="px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2"
            >
              <Send size={16} />
              Publiceren
            </button>
          </div>
        </form>
      </Modal>

      {selectedPost && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
               {selectedPost.image && (
                 <div className="h-48 md:h-72 w-full relative">
                   <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                   <button 
                      onClick={() => setSelectedPost(null)}
                      className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-sm"
                   >
                     <X size={24} />
                   </button>
                   
                   <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 text-white">
                        <h1 className="text-2xl md:text-4xl font-bold mb-3 shadow-sm">{selectedPost.title}</h1>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                                <img src={selectedPost.authorAvatar} className="w-6 h-6 rounded-full" alt="Author"/>
                                <span className="font-bold text-sm">{selectedPost.authorName}</span>
                            </div>
                            <span className="text-white/80 text-sm font-medium">{selectedPost.date}</span>
                        </div>
                   </div>
                 </div>
               )}
               
               {!selectedPost.image && (
                 <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-slate-500 text-sm uppercase tracking-widest">Nieuwsbericht</h3>
                   <button 
                      onClick={() => setSelectedPost(null)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                   >
                     <X size={24} />
                   </button>
                 </div>
               )}

               <div className="p-6 md:p-10 overflow-y-auto">
                  {!selectedPost.image && (
                      <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{selectedPost.title}</h1>
                        <div className="flex items-center gap-3">
                            <img src={selectedPost.authorAvatar} className="w-8 h-8 rounded-full" alt="Author"/>
                            <div className="text-sm">
                                <span className="font-bold text-slate-900">{selectedPost.authorName}</span>
                                <span className="text-slate-400 mx-2">•</span>
                                <span className="text-slate-500">{selectedPost.date}</span>
                            </div>
                        </div>
                      </div>
                  )}

                  <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-relaxed">
                     {renderFormattedText(selectedPost.content)}
                  </div>
               </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                  <button 
                    onClick={() => onLikeNews(selectedPost.id, currentUser.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors font-bold text-sm ${selectedPost.likedBy.includes(currentUser.id) ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                     <Heart size={18} className={selectedPost.likedBy.includes(currentUser.id) ? 'fill-current' : ''}/>
                     {selectedPost.likedBy.includes(currentUser.id) ? 'Geliked' : 'Like'} ({selectedPost.likes})
                  </button>
                  <button onClick={() => setSelectedPost(null)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900">
                    Sluiten
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default NewsPage;
