
import React, { useState, useEffect } from 'react';
import { Search, BookOpen, ChevronRight, Sparkles, MessageCircle, ArrowRight, Briefcase, FileText, Settings, Users, ClipboardCheck, UserCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { KnowledgeArticle, KnowledgeCategory, ViewState } from '../types';
import { KNOWLEDGE_ARTICLES } from '../utils/mockData';

interface KnowledgeBasePageProps {
  onChangeView: (view: ViewState) => void;
}

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ onChangeView }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'All'>('All');
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>(KNOWLEDGE_ARTICLES);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Filter articles locally
  useEffect(() => {
    let filtered = KNOWLEDGE_ARTICLES;

    if (activeCategory !== 'All') {
        filtered = filtered.filter(a => a.category === activeCategory);
    }

    if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(lower) || 
            a.tags.some(t => t.toLowerCase().includes(lower)) ||
            a.content.toLowerCase().includes(lower)
        );
    }

    setSearchResults(filtered);
  }, [searchQuery, activeCategory]);

  const handleAskAI = async () => {
    if (!searchQuery) return;
    
    setIsAiThinking(true);
    setAiAnswer(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Context grounding
        const systemInstruction = `
            Je bent de intelligente assistent van het "Mijn Sanadome HRMS". 
            Gebruik ALLEEN de volgende artikelen om de vraag van de gebruiker te beantwoorden:
            ${JSON.stringify(KNOWLEDGE_ARTICLES)}
            
            Regels:
            1. Geef een direct en praktisch antwoord.
            2. Gebruik stapsgewijze instructies als dat nodig is.
            3. Verwijs naar specifieke menu-items zoals "Home", "Onboarding" etc.
            4. Als het antwoord niet in de artikelen staat, zeg dan eerlijk dat je het niet weet, maar verzin geen informatie.
            5. Antwoord in het Nederlands.
            6. Gebruik Markdown opmaak voor leesbaarheid.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: searchQuery,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        setAiAnswer(response.text || "Ik kon geen antwoord genereren.");
    } catch (error) {
        console.error("AI Error:", error);
        setAiAnswer("Excuses, ik kan de AI-assistent momenteel niet bereiken. Controleer je internetverbinding of API sleutel.");
    } finally {
        setIsAiThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleAskAI();
    }
  };

  const selectedArticle = KNOWLEDGE_ARTICLES.find(a => a.id === selectedArticleId);

  const getCategoryIcon = (cat: KnowledgeCategory) => {
      switch(cat) {
          case 'HR': return <Briefcase size={20} className="text-pink-500"/>;
          case 'Systeem': return <Settings size={20} className="text-slate-500"/>;
          case 'IT': return <Settings size={20} className="text-blue-500"/>;
          case 'Evaluatie': return <ClipboardCheck size={20} className="text-teal-500"/>;
          case 'Onboarding': return <UserCheck size={20} className="text-purple-500"/>;
          default: return <FileText size={20} className="text-slate-500"/>;
      }
  };

  const categories: KnowledgeCategory[] = ['HR', 'Evaluatie', 'Onboarding', 'Systeem'];

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 min-h-screen">
       
       {/* Header Section */}
       <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Waarmee kunnen we je helpen?
            </h1>
            <p className="text-slate-500 mb-8">
                Zoek in de handleiding of vraag het direct aan onze slimme assistent.
            </p>

            {/* Search Bar */}
            <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-500 ${isAiThinking ? 'animate-pulse' : ''}`}></div>
                <div className="relative bg-white rounded-2xl shadow-xl flex items-center p-2 border border-slate-100">
                    <Search className="ml-4 text-slate-400" size={24} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Stel je vraag... (bv. 'Hoe vraag ik vakantie aan?')"
                        className="flex-1 p-4 outline-none text-lg font-medium text-slate-700 placeholder:text-slate-400"
                    />
                    <button 
                        onClick={handleAskAI}
                        disabled={isAiThinking || !searchQuery}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAiThinking ? (
                            <Sparkles size={20} className="animate-spin"/>
                        ) : (
                            <ArrowRight size={20} />
                        )}
                        <span className="hidden sm:inline">Vraag AI</span>
                    </button>
                </div>
            </div>
       </div>

       {/* AI Answer Section */}
       {aiAnswer && (
           <div className="max-w-3xl mx-auto mb-12 animate-in slide-in-from-top-4 duration-500">
               <div className="bg-white rounded-2xl border border-teal-100 shadow-lg overflow-hidden">
                   <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-4 border-b border-teal-100 flex items-center gap-3">
                       <div className="p-2 bg-white rounded-lg shadow-sm text-teal-600">
                           <Sparkles size={20} />
                       </div>
                       <span className="font-bold text-teal-900">AI Antwoord</span>
                   </div>
                   <div className="p-6 md:p-8">
                       <div className="prose prose-slate prose-sm md:prose-base max-w-none text-slate-700 leading-relaxed">
                           <div dangerouslySetInnerHTML={{ __html: aiAnswer.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                       </div>
                   </div>
               </div>
           </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Sidebar: Categories */}
           <div className="lg:col-span-1 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">Categorieën</h3>
                <button 
                    onClick={() => setActiveCategory('All')}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-colors ${activeCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                    <span>Alles</span>
                    {activeCategory === 'All' && <ChevronRight size={16}/>}
                </button>
                {categories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-colors ${activeCategory === cat ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="flex items-center gap-3">
                            {getCategoryIcon(cat)}
                            {cat}
                        </span>
                        {activeCategory === cat && <ChevronRight size={16}/>}
                    </button>
                ))}
           </div>

           {/* Content: Articles List */}
           <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {searchResults.map(article => (
                        <div 
                            key={article.id}
                            onClick={() => setSelectedArticleId(selectedArticleId === article.id ? null : article.id)}
                            className={`bg-white rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                                selectedArticleId === article.id 
                                ? 'border-teal-500 ring-1 ring-teal-500 shadow-md col-span-1 md:col-span-2' 
                                : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                            }`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-slate-50 rounded-lg">
                                            {getCategoryIcon(article.category)}
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{article.category}</span>
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">{article.lastUpdated}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{article.title}</h3>
                                
                                {selectedArticleId !== article.id && (
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {article.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wide rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {selectedArticleId === article.id && (
                                    <div className="mt-6 border-t border-slate-100 pt-6 animate-in slide-in-from-top-2">
                                        <div className="prose prose-slate prose-sm max-w-none text-slate-600">
                                            <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/# (.*?)(<br\/>|$)/g, '<h4 class="text-lg font-bold text-slate-900 mb-2">$1</h4>') }} />
                                        </div>
                                        
                                        {article.relatedViews && article.relatedViews.length > 0 && (
                                            <div className="mt-8 flex gap-3">
                                                {article.relatedViews.map(view => (
                                                    <button 
                                                        key={view}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onChangeView(view);
                                                        }}
                                                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                                                    >
                                                        Ga naar {view} <ArrowRight size={14}/>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {searchResults.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <BookOpen size={48} className="mx-auto text-slate-300 mb-4"/>
                        <h3 className="font-bold text-slate-900">Geen artikelen gevonden</h3>
                        <p className="text-slate-500 mt-2">Probeer een andere zoekterm of categorie.</p>
                    </div>
                )}
           </div>
       </div>
    </div>
  );
};

export default KnowledgeBasePage;
