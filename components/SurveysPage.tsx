
import React, { useState, useRef } from 'react';
import { Plus, ClipboardList, Users, Calendar, Trash2, PlayCircle, BarChart, CheckCircle, Clock, ChevronRight, User, CheckCircle2, XCircle, PieChart, List, Image as ImageIcon, Settings, Layout, Type, ChevronUp, ChevronDown, Save, ArrowLeft, ArrowRight, Upload, X, Star } from 'lucide-react';
import { Employee, Survey, SurveyTarget, SurveyQuestion, SurveyQuestionType } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RePieChart, Pie, Cell } from 'recharts';

interface SurveysPageProps {
  currentUser: Employee;
  surveys: Survey[];
  onAddSurvey: (survey: Survey) => void;
  onDeleteSurvey: (id: string) => void;
  onStartSurvey: (surveyId: string) => void;
}

const SurveysPage: React.FC<SurveysPageProps> = ({ currentUser, surveys, onAddSurvey, onDeleteSurvey, onStartSurvey }) => {
  const [activeTab, setActiveTab] = useState<'todo' | 'manage'>('todo');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState<1 | 2>(1); 
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<SurveyTarget>('All');
  const [coverImage, setCoverImage] = useState('');
  
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  const isManagerOrSenior = currentUser.role === 'Manager' || currentUser.role === 'Senior Medewerker';

  const mySurveys = surveys.filter(s => 
    s.status === 'Active' && 
    !s.completedBy.includes(currentUser.id) &&
    (s.targetAudience === 'All' || 
    (s.targetAudience === 'Managers' && currentUser.role === 'Manager') ||
    (s.targetAudience === 'Seniors' && currentUser.role === 'Senior Medewerker'))
  );

  const handleOpenBuilder = () => {
      setTitle('');
      setDescription('');
      setTarget('All');
      setCoverImage('');
      setQuestions([]);
      setBuilderStep(1);
      setActiveQuestionIndex(null);
      setIsBuilderOpen(true);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setCoverImage(url);
      }
  };

  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (activeQuestionIndex === null) return;
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          const updated = [...questions];
          updated[activeQuestionIndex].image = url;
          setQuestions(updated);
      }
  };

  const handleAddQuestion = () => {
      const newQ: SurveyQuestion = {
          id: Math.random().toString(36).substr(2, 9),
          text: 'Nieuwe vraag',
          type: 'Rating',
          options: []
      };
      setQuestions([...questions, newQ]);
      setActiveQuestionIndex(questions.length); 
  };

  const handleUpdateQuestion = (index: number, field: keyof SurveyQuestion, value: any) => {
      const updated = [...questions];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'type' && value === 'Choice' && (!updated[index].options || updated[index].options?.length === 0)) {
          updated[index].options = ['Optie 1', 'Optie 2'];
      }
      setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
      const updated = questions.filter((_, i) => i !== index);
      setQuestions(updated);
      if (activeQuestionIndex === index) setActiveQuestionIndex(null);
      else if (activeQuestionIndex !== null && activeQuestionIndex > index) setActiveQuestionIndex(activeQuestionIndex - 1);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
      const updated = [...questions];
      const options = [...(updated[qIndex].options || [])];
      options[optIndex] = value;
      updated[qIndex].options = options;
      setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
      const updated = [...questions];
      updated[qIndex].options = [...(updated[qIndex].options || []), `Nieuwe optie`];
      setQuestions(updated);
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
      const updated = [...questions];
      updated[qIndex].options = (updated[qIndex].options || []).filter((_, i) => i !== optIndex);
      setQuestions(updated);
  };

  const handlePublish = () => {
      const newSurvey: Survey = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          description,
          targetAudience: target,
          coverImage: coverImage || undefined,
          questions,
          createdBy: currentUser.name,
          createdAt: new Date().toLocaleDateString('nl-NL'),
          status: 'Active',
          responseCount: 0,
          completedBy: [],
          rewardPoints: 50 // Default reward points
      };
      onAddSurvey(newSurvey);
      setIsBuilderOpen(false);
  };

  const renderBuilder = () => {
      return (
          <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-in fade-in duration-200">
              <div className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-4 md:gap-6">
                      <button onClick={() => setIsBuilderOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                          <X size={24} />
                      </button>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <h2 className="font-bold text-slate-900 text-lg md:text-xl flex items-center gap-3">
                          {builderStep === 1 ? <Settings size={20}/> : <Layout size={20}/>}
                          <span className="hidden sm:inline">{builderStep === 1 ? 'Stap 1: Instellingen' : 'Stap 2: Vragen & Design'}</span>
                          <span className="sm:hidden">{builderStep === 1 ? 'Instellingen' : 'Vragen'}</span>
                      </h2>
                  </div>
                  <div className="flex items-center gap-4">
                      {builderStep === 2 && (
                          <button 
                            onClick={() => setBuilderStep(1)} 
                            className="px-4 md:px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                          >
                              Terug
                          </button>
                      )}
                      {builderStep === 1 ? (
                           <button 
                            onClick={() => {
                                if(title) setBuilderStep(2);
                                else alert('Vul eerst een titel in.');
                            }}
                            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 flex items-center gap-2 shadow-lg"
                           >
                               Volgende <ChevronRight size={18}/>
                           </button>
                      ) : (
                           <button 
                            onClick={handlePublish}
                            className="px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 shadow-lg"
                           >
                               <Save size={18}/> <span className="hidden sm:inline">Publiceren</span>
                           </button>
                      )}
                  </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  {builderStep === 1 && (
                      <div className="max-w-3xl mx-auto w-full p-4 md:p-10 overflow-y-auto">
                          <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                               <div>
                                  <h3 className="text-xl font-bold text-slate-900 mb-6">Algemene Informatie</h3>
                                  <div className="space-y-6">
                                      <div>
                                          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Titel van de survey</label>
                                          <input 
                                            type="text" 
                                            value={title} 
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
                                            placeholder="Bv. Medewerkerstevredenheid Q4"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Introductie tekst</label>
                                          <textarea 
                                            rows={3} 
                                            value={description} 
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
                                            placeholder="Welkomsttekst voor de deelnemer..."
                                          />
                                      </div>
                                  </div>
                               </div>

                               <div className="border-t border-slate-100 pt-8">
                                  <h3 className="text-xl font-bold text-slate-900 mb-6">Doelgroep & Zichtbaarheid</h3>
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Wie mag deze survey invullen?</label>
                                      <select 
                                        value={target} 
                                        onChange={e => setTarget(e.target.value as SurveyTarget)}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
                                      >
                                          <option value="All">Alle Medewerkers</option>
                                          <option value="Managers">Alleen Managers</option>
                                          <option value="Seniors">Alleen Seniors</option>
                                      </select>
                                  </div>
                               </div>

                               <div className="border-t border-slate-100 pt-8">
                                  <h3 className="text-xl font-bold text-slate-900 mb-6">Cover Afbeelding</h3>
                                  <input 
                                    type="file" 
                                    ref={coverInputRef} 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleCoverUpload}
                                  />
                                  
                                  {!coverImage ? (
                                      <div 
                                        onClick={() => coverInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-all group"
                                      >
                                          <ImageIcon size={40} className="text-slate-300 mb-4 group-hover:text-teal-500 transition-colors"/>
                                          <span className="text-sm font-bold text-slate-600">Klik om een cover afbeelding te uploaden</span>
                                          <span className="text-xs text-slate-400 mt-1">Wordt getoond op het startscherm</span>
                                      </div>
                                  ) : (
                                      <div className="relative h-64 rounded-2xl overflow-hidden group shadow-md">
                                          <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={() => coverInputRef.current?.click()}
                                                className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-100"
                                              >
                                                  <Upload size={18}/> Wijzig foto
                                              </button>
                                          </div>
                                      </div>
                                  )}
                               </div>
                          </div>
                      </div>
                  )}

                  {builderStep === 2 && (
                      <div className="w-full flex flex-col md:flex-row h-full">
                          <div className="w-full md:w-96 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col flex-shrink-0 h-1/3 md:h-auto">
                              <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50/50">
                                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Vragenlijst</h3>
                              </div>
                              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                  {questions.map((q, idx) => (
                                      <div 
                                        key={idx}
                                        onClick={() => setActiveQuestionIndex(idx)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                            activeQuestionIndex === idx 
                                            ? 'bg-teal-50 border-teal-500 shadow-md ring-1 ring-teal-500/20' 
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wide">
                                                  Vraag {idx + 1}
                                              </span>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                          <div className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                                              {q.text || 'Nieuwe vraag...'}
                                          </div>
                                          <div className="text-xs text-slate-400 font-medium">
                                              Type: {q.type}
                                          </div>
                                      </div>
                                  ))}
                                  
                                  <button 
                                    onClick={handleAddQuestion}
                                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2 mt-2"
                                  >
                                      <Plus size={18} /> Vraag Toevoegen
                                  </button>
                              </div>
                          </div>

                          <div className="flex-1 bg-slate-50 p-4 md:p-10 overflow-y-auto h-2/3 md:h-auto">
                              {activeQuestionIndex !== null && questions[activeQuestionIndex] ? (
                                  <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                      <div className="border-b border-slate-100 p-6 md:p-8 flex justify-between items-center bg-slate-50/50">
                                          <h3 className="font-bold text-lg md:text-xl text-slate-900">Vraag {activeQuestionIndex + 1} Bewerken</h3>
                                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">ID: {questions[activeQuestionIndex].id}</span>
                                      </div>
                                      
                                      <div className="p-6 md:p-8 space-y-8">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vraagstelling</label>
                                              <input 
                                                type="text" 
                                                value={questions[activeQuestionIndex].text}
                                                onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'text', e.target.value)}
                                                className="w-full text-2xl font-bold border-0 border-b-2 border-slate-200 px-0 py-3 focus:ring-0 focus:border-teal-500 placeholder:text-slate-300 transition-colors bg-transparent font-serif"
                                                placeholder="Typ hier je vraag..."
                                                autoFocus
                                              />
                                          </div>

                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Type Antwoord</label>
                                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                  {[
                                                      { type: 'Rating', label: '1-5 Score', icon: Star },
                                                      { type: 'Scale10', label: '1-10 Score', icon: BarChart },
                                                      { type: 'YesNo', label: 'Ja / Nee', icon: CheckCircle },
                                                      { type: 'Text', label: 'Open Tekst', icon: Type },
                                                      { type: 'Choice', label: 'Meerkeuze', icon: List },
                                                  ].map((opt) => (
                                                      <button
                                                        key={opt.type}
                                                        onClick={() => handleUpdateQuestion(activeQuestionIndex, 'type', opt.type)}
                                                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                                                            questions[activeQuestionIndex].type === opt.type 
                                                            ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-md ring-1 ring-teal-200' 
                                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'
                                                        }`}
                                                      >
                                                          <opt.icon size={24} strokeWidth={1.5} />
                                                          <span className="text-xs font-bold">{opt.label}</span>
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>

                                          {questions[activeQuestionIndex].type === 'Choice' && (
                                              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Antwoord Opties</label>
                                                  <div className="space-y-3">
                                                      {questions[activeQuestionIndex].options?.map((opt, optIdx) => (
                                                          <div key={optIdx} className="flex items-center gap-3">
                                                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white"></div>
                                                              <input 
                                                                type="text" 
                                                                value={opt}
                                                                onChange={(e) => handleUpdateOption(activeQuestionIndex, optIdx, e.target.value)}
                                                                className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
                                                              />
                                                              <button 
                                                                onClick={() => handleDeleteOption(activeQuestionIndex, optIdx)}
                                                                className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                                                              >
                                                                  <Trash2 size={18} />
                                                              </button>
                                                          </div>
                                                      ))}
                                                      <button 
                                                        onClick={() => handleAddOption(activeQuestionIndex)}
                                                        className="text-sm text-teal-600 font-bold hover:underline flex items-center gap-2 mt-3 pl-8"
                                                      >
                                                          <Plus size={16} /> Optie toevoegen
                                                      </button>
                                                  </div>
                                              </div>
                                          )}

                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Achtergrond Afbeelding (Optioneel)</label>
                                              <input 
                                                type="file" 
                                                ref={questionImageInputRef} 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleQuestionImageUpload}
                                              />
                                              
                                              {questions[activeQuestionIndex].image ? (
                                                  <div className="relative h-56 rounded-xl overflow-hidden group w-full md:w-2/3 shadow-sm">
                                                      <img src={questions[activeQuestionIndex].image} className="w-full h-full object-cover" alt="QBg" />
                                                      <button 
                                                        onClick={() => questionImageInputRef.current?.click()}
                                                        className="absolute top-3 right-3 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm hover:bg-white text-slate-700 text-xs font-bold flex items-center gap-2"
                                                      >
                                                          <Upload size={14} /> Wijzig
                                                      </button>
                                                  </div>
                                              ) : (
                                                  <button 
                                                    onClick={() => questionImageInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-5 py-3 border border-slate-300 rounded-xl bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 shadow-sm transition-all"
                                                  >
                                                      <ImageIcon size={18} /> Afbeelding uploaden
                                                  </button>
                                              )}
                                          </div>

                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                      <Layout size={64} className="mb-6 opacity-20" />
                                      <p className="text-xl font-bold text-slate-400">Selecteer een vraag om te bewerken</p>
                                      <p className="text-sm mt-2">Of klik op "Vraag Toevoegen" in de zijbalk.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderReport = (surveyId: string) => {
      const survey = surveys.find(s => s.id === surveyId);
      if (!survey) return null;

      return (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
             <div className="flex items-center justify-between mb-8">
                 <button 
                    onClick={() => setActiveReportId(null)}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 px-4 py-2 hover:bg-white rounded-lg transition-colors"
                 >
                     <ArrowLeft size={18} /> Terug naar overzicht
                 </button>
                 <h2 className="text-xl md:text-2xl font-bold text-slate-900">Resultaten: {survey.title}</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Totaal Responses</div>
                      <div className="text-4xl font-bold text-slate-900">{survey.responseCount}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Voltooiingspercentage</div>
                      <div className="text-4xl font-bold text-teal-600">78%</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gemiddelde tijd</div>
                      <div className="text-4xl font-bold text-slate-900">3m 12s</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                      <div className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div> {survey.status}
                      </div>
                  </div>
             </div>

             <div className="space-y-8">
                 {survey.questions.map((q, idx) => {
                     let chart = null;
                     
                     if (q.type === 'Rating' || q.type === 'Scale10') {
                         const max = q.type === 'Rating' ? 5 : 10;
                         const data = Array.from({ length: max }, (_, i) => ({
                             name: (i + 1).toString(),
                             count: Math.floor(Math.random() * survey.responseCount)
                         }));
                         chart = (
                             <div className="h-64 w-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                     <ReBarChart data={data}>
                                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                         <XAxis dataKey="name" tick={{fontSize: 12}} />
                                         <YAxis allowDecimals={false} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                         <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f1f5f9'}} />
                                         <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={32} />
                                     </ReBarChart>
                                 </ResponsiveContainer>
                             </div>
                         );
                     } else if (q.type === 'Choice' || q.type === 'YesNo') {
                         const options = q.type === 'YesNo' ? ['Ja', 'Nee'] : q.options || [];
                         const COLORS = ['#0f172a', '#0d9488', '#94a3b8', '#cbd5e1', '#64748b'];
                         const data = options.map(opt => ({ name: opt, value: Math.floor(Math.random() * 10) + 1 }));
                         chart = (
                             <div className="h-64 w-full flex items-center justify-center">
                                 <ResponsiveContainer width="100%" height="100%">
                                     <RePieChart>
                                         <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" cornerRadius={4}>
                                             {data.map((entry, index) => (
                                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                             ))}
                                         </Pie>
                                         <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                     </RePieChart>
                                 </ResponsiveContainer>
                                 <div className="ml-10 space-y-3">
                                     {data.map((d, i) => (
                                         <div key={i} className="flex items-center gap-3 text-sm">
                                             <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                             <span className="font-medium text-slate-700">{d.name}: <span className="font-bold">{d.value}</span></span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         );
                     } else if (q.type === 'Text') {
                         chart = (
                             <div className="bg-slate-50 rounded-xl p-6 space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                                 {["Meer gezonde opties in de kantine.", "Fijne werksfeer!", "Communicatie kan beter tijdens drukte.", "Ik zou graag meer trainingen willen volgen."].map((ans, i) => (
                                     <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600 italic shadow-sm">
                                         "{ans}"
                                     </div>
                                 ))}
                             </div>
                         );
                     }

                     return (
                         <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                             <h4 className="font-bold text-slate-900 mb-6 flex items-start gap-3">
                                 <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-xs mt-0.5 uppercase tracking-wide font-bold">Vraag {idx + 1}</span>
                                 <span className="text-lg font-bold">{q.text}</span>
                             </h4>
                             {chart}
                         </div>
                     );
                 })}
             </div>
          </div>
      );
  };

  if (isBuilderOpen) {
      return renderBuilder();
  }

  if (activeReportId) {
      return <div className="p-4 md:p-8 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">{renderReport(activeReportId)}</div>;
  }

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Surveys & Feedback</h1>
            <p className="text-slate-500 mt-1">Geef je mening en help Sanadome groeien.</p>
        </div>
        
        {isManagerOrSenior && (
          <button 
            onClick={handleOpenBuilder}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
          >
            <Plus size={18} />
            Nieuwe Survey
          </button>
        )}
      </div>

      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          <button 
            onClick={() => setActiveTab('todo')}
            className={`pb-4 pt-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'todo' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList size={18} />
            Openstaande Surveys
            {mySurveys.length > 0 && (
                <span className="bg-teal-100 text-teal-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{mySurveys.length}</span>
            )}
          </button>
          {isManagerOrSenior && (
            <button 
                onClick={() => setActiveTab('manage')}
                className={`pb-4 pt-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'manage' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
                <BarChart size={18} />
                Beheer & Resultaten
            </button>
          )}
        </div>
      </div>

      {activeTab === 'todo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mySurveys.map(survey => (
                  <div key={survey.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1">
                      <div className="h-40 bg-slate-900 relative p-6 flex flex-col justify-end overflow-hidden">
                          {survey.coverImage && (
                              <div className="absolute inset-0 opacity-60">
                                  <img src={survey.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Cover"/>
                              </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                          <h3 className="text-xl font-bold text-white drop-shadow-sm relative z-10">{survey.title}</h3>
                      </div>
                      <div className="p-6">
                          <p className="text-slate-600 text-sm leading-relaxed mb-6 h-10 line-clamp-2">{survey.description}</p>
                          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 pt-5">
                              <div className="flex items-center gap-1.5">
                                  <Clock size={14} />
                                  <span>~ {Math.ceil(survey.questions.length * 0.5)} min</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                  <Calendar size={14} />
                                  <span>{survey.createdAt}</span>
                              </div>
                          </div>
                          <button 
                            onClick={() => onStartSurvey(survey.id)}
                            className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2 group-hover:bg-teal-600"
                          >
                              Start Survey <ArrowRight size={16}/>
                          </button>
                      </div>
                  </div>
              ))}
              {mySurveys.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <CheckCircle size={56} className="mx-auto text-teal-100 mb-4" />
                      <h3 className="text-xl font-bold text-slate-900">Helemaal bij!</h3>
                      <p className="text-slate-500 mt-2">Je hebt geen openstaande surveys.</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'manage' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Titel</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Doelgroep</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Aangemaakt op</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Responses</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-5 text-right font-bold text-slate-500 uppercase tracking-wider">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {surveys.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5 font-bold text-slate-900">{s.title}</td>
                                    <td className="px-8 py-5 text-sm font-medium text-slate-600">{s.targetAudience}</td>
                                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">{s.createdAt}</td>
                                    <td className="px-8 py-5 text-sm text-slate-900 font-bold">{s.responseCount}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${s.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right flex items-center justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setActiveReportId(s.id)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                                        >
                                            Resultaten
                                        </button>
                                        <button 
                                            onClick={() => onDeleteSurvey(s.id)}
                                            className="text-slate-300 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                   </table>
               </div>
          </div>
      )}
    </div>
  );
};

export default SurveysPage;
