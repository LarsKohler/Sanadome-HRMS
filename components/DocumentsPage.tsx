
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, FileText, Upload, Plus, File, Download, StickyNote, 
  User, Calendar, Clock, MoreVertical, Filter, 
  Pencil, Trash2, MoreHorizontal, Eye, EyeOff, ChevronDown, Check, FolderOpen, TrendingUp, AlertCircle
} from 'lucide-react';
import { Employee, EmployeeNote, EmployeeDocument, Notification, ViewState } from '../types';
import { Modal } from './Modal';
import { api } from '../utils/api';

interface DocumentsPageProps {
  employees: Employee[];
  currentUser: Employee;
  onUpdateEmployee: (employee: Employee) => void;
  onAddNotification: (notification: Notification) => void;
  onShowToast: (message: string) => void;
  selectedEmployeeId: string | null;
  onSelectEmployee: (id: string) => void;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ 
  employees, 
  currentUser, 
  onUpdateEmployee, 
  onAddNotification,
  onShowToast,
  selectedEmployeeId,
  onSelectEmployee
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'files'>('notes');
  const [isEmployeeSelectorOpen, setIsEmployeeSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [isDeleteDocModalOpen, setIsDeleteDocModalOpen] = useState(false);

  const [selectedNote, setSelectedNote] = useState<EmployeeNote | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<EmployeeDocument | null>(null);

  // Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident'>('General');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisible, setNoteVisible] = useState(true);
  const [noteImpact, setNoteImpact] = useState<'Positive' | 'Negative' | 'Neutral'>('Neutral');
  const [noteScore, setNoteScore] = useState(0);

  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<'Contract' | 'Loonstrook' | 'Identificatie' | 'Overig'>('Overig');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManager = currentUser.role === 'Manager';
  const selectorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!selectedEmployeeId) {
       if (isManager) {
         if (employees.length > 0) onSelectEmployee(employees[0].id);
       } else {
         onSelectEmployee(currentUser.id);
       }
    }
  }, [selectedEmployeeId, isManager, employees, currentUser.id, onSelectEmployee]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || currentUser;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setActiveDropdownId(null);
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsEmployeeSelectorOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (searchTerm) {
      list = list.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return list;
  }, [employees, searchTerm]);

  const visibleNotes = useMemo(() => {
    if (!selectedEmployee?.notes) return [];
    if (isManager) return selectedEmployee.notes;
    return selectedEmployee.notes.filter(n => n.visibleToEmployee);
  }, [selectedEmployee, isManager]);

  const handleOpenAddNote = () => {
    setNoteTitle('');
    setNoteCategory('General');
    setNoteContent('');
    setNoteVisible(true);
    setNoteImpact('Neutral');
    setNoteScore(0);
    setIsNoteModalOpen(true);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const newNote: EmployeeNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: noteTitle,
      category: noteCategory,
      content: noteContent,
      date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
      author: currentUser.name,
      visibleToEmployee: noteVisible,
      impact: noteImpact,
      score: noteImpact === 'Neutral' ? 0 : (noteImpact === 'Negative' ? -Math.abs(noteScore) : Math.abs(noteScore))
    };

    const updatedEmployee = {
      ...selectedEmployee,
      notes: [newNote, ...(selectedEmployee.notes || [])]
    };

    onUpdateEmployee(updatedEmployee);
    setIsNoteModalOpen(false);

    onShowToast('Notitie succesvol opgeslagen.');

    if (selectedEmployee.id !== currentUser.id && noteVisible) {
         const notification: Notification = {
           id: Math.random().toString(36).substr(2, 9),
           recipientId: selectedEmployee.id,
           senderName: currentUser.name,
           type: 'Note',
           title: 'Nieuwe notitie',
           message: `Er is een nieuwe notitie toegevoegd aan uw dossier: "${noteTitle}"`,
           date: 'Zojuist',
           read: false,
           targetView: ViewState.DOCUMENTS,
           targetEmployeeId: selectedEmployee.id
         };
         onAddNotification(notification);
    }
  };

  const handleOpenEditNote = (note: EmployeeNote) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteCategory(note.category);
    setNoteContent(note.content);
    setNoteVisible(note.visibleToEmployee);
    // Handling score/impact for edit could be complex, simplifying for now
    setIsEditNoteModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleEditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedNote) return;

    const updatedNotes = (selectedEmployee.notes || []).map(n => 
      n.id === selectedNote.id 
        ? { ...n, title: noteTitle, category: noteCategory, content: noteContent, visibleToEmployee: noteVisible }
        : n
    );

    onUpdateEmployee({ ...selectedEmployee, notes: updatedNotes });
    setIsEditNoteModalOpen(false);
    onShowToast('Notitie bijgewerkt.');
  };

  const handleOpenDeleteNote = (note: EmployeeNote) => {
    setSelectedNote(note);
    setIsDeleteNoteModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleDeleteNote = () => {
    if (!selectedEmployee || !selectedNote) return;
    
    const updatedNotes = (selectedEmployee.notes || []).filter(n => n.id !== selectedNote.id);
    onUpdateEmployee({ ...selectedEmployee, notes: updatedNotes });
    setIsDeleteNoteModalOpen(false);
    onShowToast('Notitie verwijderd.');
  };

  const handleOpenUpload = () => {
    setDocName('');
    setDocCategory('Overig');
    setUploadFile(null);
    setIsUploadModalOpen(true);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !uploadFile) {
        onShowToast('Selecteer eerst een bestand.');
        return;
    }

    setIsUploading(true);
    try {
        const publicUrl = await api.uploadFile(uploadFile);
        
        if (publicUrl) {
            const fileSize = (uploadFile.size / 1024 / 1024).toFixed(1) + ' MB';
            const newDoc: EmployeeDocument = {
              id: Math.random().toString(36).substr(2, 9),
              name: docName || uploadFile.name,
              type: 'PDF', // Simplified for demo, ideally detect MIME type
              category: docCategory,
              date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
              size: fileSize,
              uploadedBy: currentUser.name
            };

            const updatedEmployee = {
              ...selectedEmployee,
              documents: [newDoc, ...(selectedEmployee.documents || [])]
            };

            onUpdateEmployee(updatedEmployee);
            setIsUploadModalOpen(false);
            onShowToast('Document succesvol geüpload.');

            if (selectedEmployee.id !== currentUser.id) {
                const notification: Notification = {
                  id: Math.random().toString(36).substr(2, 9),
                  recipientId: selectedEmployee.id,
                  senderName: currentUser.name,
                  type: 'Document',
                  title: 'Nieuw document',
                  message: `Nieuw document toegevoegd: "${newDoc.name}"`,
                  date: 'Zojuist',
                  read: false,
                  targetView: ViewState.DOCUMENTS,
                  targetEmployeeId: selectedEmployee.id
                };
                onAddNotification(notification);
             }
        } else {
            onShowToast('Upload mislukt.');
        }
    } catch (e) {
        console.error(e);
        onShowToast('Upload fout.');
    } finally {
        setIsUploading(false);
    }
  };

  const handleOpenEditDoc = (doc: EmployeeDocument) => {
    setSelectedDoc(doc);
    setDocName(doc.name);
    setDocCategory(doc.category);
    setIsEditDocModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleEditDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedDoc) return;

    const updatedDocs = (selectedEmployee.documents || []).map(d => 
      d.id === selectedDoc.id 
        ? { ...d, name: docName, category: docCategory }
        : d
    );

    onUpdateEmployee({ ...selectedEmployee, documents: updatedDocs });
    setIsEditDocModalOpen(false);
    onShowToast('Document bijgewerkt.');
  };

  const handleOpenDeleteDoc = (doc: EmployeeDocument) => {
    setSelectedDoc(doc);
    setIsDeleteDocModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleDeleteDoc = () => {
    if (!selectedEmployee || !selectedDoc) return;

    const updatedDocs = (selectedEmployee.documents || []).filter(d => d.id !== selectedDoc.id);
    onUpdateEmployee({ ...selectedEmployee, documents: updatedDocs });
    setIsDeleteDocModalOpen(false);
    onShowToast('Document verwijderd.');
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full animate-in fade-in duration-500 max-w-[2400px] mx-auto min-h-[calc(100vh-80px)]">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Dossier & Documenten</h1>
           <p className="text-slate-500 mt-1">Beheer personeelsdossiers, contracten en notities.</p>
        </div>

        {isManager && (
          <div className="relative z-20" ref={selectorRef}>
             <button 
                onClick={() => setIsEmployeeSelectorOpen(!isEmployeeSelectorOpen)}
                className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all min-w-[280px] justify-between group"
             >
                <div className="flex items-center gap-3">
                    <img src={selectedEmployee.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="Avatar"/>
                    <div className="text-left">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Geselecteerd</div>
                        <div className="text-sm font-bold text-slate-800">{selectedEmployee.name}</div>
                    </div>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isEmployeeSelectorOpen ? 'rotate-180' : ''}`} />
             </button>

             {isEmployeeSelectorOpen && (
                 <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                     <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Zoek medewerker..." 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                     </div>
                     <div className="max-h-[300px] overflow-y-auto">
                        {filteredEmployees.map(emp => (
                            <button
                                key={emp.id}
                                onClick={() => {
                                    onSelectEmployee(emp.id);
                                    setIsEmployeeSelectorOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedEmployeeId === emp.id ? 'bg-teal-50/50' : ''}`}
                            >
                                <img src={emp.avatar} className="w-8 h-8 rounded-full object-cover" alt={emp.name}/>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-bold truncate ${selectedEmployeeId === emp.id ? 'text-teal-900' : 'text-slate-900'}`}>{emp.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{emp.role}</div>
                                </div>
                                {selectedEmployeeId === emp.id && <Check size={16} className="text-teal-600"/>}
                            </button>
                        ))}
                     </div>
                 </div>
             )}
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          
          {/* Toolbar */}
          <div className="border-b border-slate-200 px-6 md:px-8 py-4 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-6 overflow-x-auto no-scrollbar w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('notes')}
                    className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'notes' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <StickyNote size={18} />
                    Notities & Tijdlijn
                </button>
                <button 
                    onClick={() => setActiveTab('files')}
                    className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'files' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FolderOpen size={18} />
                    Bestanden ({selectedEmployee.documents?.length || 0})
                </button>
              </div>

              <div className="flex gap-3">
                 {activeTab === 'files' ? (
                     <button 
                        onClick={handleOpenUpload}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold transition-all shadow-sm"
                     >
                        <Upload size={16} />
                        Uploaden
                     </button>
                 ) : (
                    isManager && (
                        <button 
                            onClick={handleOpenAddNote}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold transition-all shadow-sm"
                        >
                            <Plus size={16} />
                            Notitie
                        </button>
                    )
                 )}
              </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 bg-slate-50/30 p-6 md:p-10 overflow-y-auto">
             
             {activeTab === 'notes' && (
                 <div className="max-w-4xl mx-auto space-y-8">
                    {visibleNotes.length > 0 ? (
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {visibleNotes.map(note => (
                                <div key={note.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    {/* Icon/Dot */}
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-slate-500">
                                        {note.category === 'Verzuim' ? <Clock size={18} className="text-red-500"/> :
                                         note.category === 'Performance' ? <User size={18} className="text-purple-500"/> :
                                         <StickyNote size={18} className="text-teal-500"/>}
                                    </div>
                                    
                                    {/* Card */}
                                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
                                        note.impact === 'Positive' ? 'border-green-100 bg-green-50/30' : 
                                        note.impact === 'Negative' ? 'border-rose-100 bg-rose-50/30' : 
                                        'border-slate-200'
                                    }`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                        note.category === 'Verzuim' ? 'bg-red-50 text-red-700' :
                                                        note.category === 'Performance' ? 'bg-purple-50 text-purple-700' :
                                                        'bg-teal-50 text-teal-700'
                                                    }`}>{note.category}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{note.date}</span>
                                                </div>
                                                <h3 className="font-bold text-slate-900">{note.title}</h3>
                                            </div>
                                            {isManager && (
                                                <div className="relative">
                                                     <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownId(activeDropdownId === note.id ? null : note.id);
                                                        }}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"
                                                     >
                                                        <MoreVertical size={16} />
                                                     </button>
                                                     {activeDropdownId === note.id && (
                                                        <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                            <button onClick={() => handleOpenEditNote(note)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Pencil size={14}/> Bewerken</button>
                                                            <button onClick={() => handleOpenDeleteNote(note)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Verwijderen</button>
                                                        </div>
                                                     )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                        
                                        {note.impact && note.impact !== 'Neutral' && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                                    note.impact === 'Positive' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-rose-100 text-rose-700 border-rose-200'
                                                }`}>
                                                    {note.impact === 'Positive' ? <TrendingUp size={10}/> : <AlertCircle size={10}/>}
                                                    Score: {note.impact === 'Positive' ? '+' : ''}{note.score}
                                                </span>
                                            </div>
                                        )}

                                        <div className="mt-4 pt-3 border-t border-slate-50/50 flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><User size={12}/> {note.author}</span>
                                            {isManager && (
                                                <div className="flex items-center gap-1.5" title={note.visibleToEmployee ? 'Zichtbaar voor medewerker' : 'Privé'}>
                                                    {note.visibleToEmployee ? <Eye size={12} className="text-green-500"/> : <EyeOff size={12} className="text-amber-500"/>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                 <StickyNote size={32} />
                             </div>
                             <h3 className="text-lg font-bold text-slate-900">Geen notities</h3>
                             <p className="text-slate-500 text-sm mt-1">Er zijn nog geen notities toegevoegd aan dit dossier.</p>
                             {isManager && (
                                <button onClick={handleOpenAddNote} className="mt-4 text-teal-600 text-sm font-bold hover:underline">
                                    Voeg eerste notitie toe
                                </button>
                             )}
                        </div>
                    )}
                 </div>
             )}

             {activeTab === 'files' && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Naam</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categorie</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Datum</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Grootte</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(selectedEmployee.documents || []).map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                                <FileText size={18} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{doc.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{doc.date}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{doc.size}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Download size={16}/></button>
                                            <button onClick={() => handleOpenDeleteDoc(doc)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!selectedEmployee.documents || selectedEmployee.documents.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Geen documenten gevonden.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
             )}

          </div>
      </div>

      {/* Modals reused logic */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Notitie toevoegen">
        <form onSubmit={handleAddNote} className="space-y-5">
           <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titel</label>
            <input 
              type="text" 
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
              placeholder="Korte samenvatting..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type Notitie</label>
            <select 
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
            >
              <option value="General">Algemene notitie</option>
              <option value="Performance">Performance</option>
              <option value="Verzuim">Verzuim</option>
              <option value="Incident">Incident</option>
              <option value="Gesprek">Gespreksverslag</option>
            </select>
          </div>

          {/* Performance Scoring Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Impact & Score</label>
              <div className="flex gap-2 mb-4">
                  <button 
                    type="button" 
                    onClick={() => { setNoteImpact('Positive'); setNoteScore(1); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${noteImpact === 'Positive' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                      Positief
                  </button>
                   <button 
                    type="button" 
                    onClick={() => { setNoteImpact('Neutral'); setNoteScore(0); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${noteImpact === 'Neutral' ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                      Neutraal
                  </button>
                   <button 
                    type="button" 
                    onClick={() => { setNoteImpact('Negative'); setNoteScore(1); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${noteImpact === 'Negative' ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                      Negatief
                  </button>
              </div>

              {noteImpact !== 'Neutral' && (
                  <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Score (1-5)</span>
                      <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(score => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setNoteScore(score)}
                                className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                                    noteScore === score 
                                    ? (noteImpact === 'Positive' ? 'bg-green-500 text-white' : 'bg-rose-500 text-white') 
                                    : 'bg-white border border-slate-200 text-slate-400'
                                }`}
                              >
                                  {score}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inhoud</label>
            <textarea 
              rows={4}
              required
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
              placeholder="Schrijf hier het volledige verslag..."
            />
          </div>
          
          {isManager && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input 
                type="checkbox"
                id="addVisible"
                checked={noteVisible}
                onChange={(e) => setNoteVisible(e.target.checked)}
                className="h-5 w-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 bg-white"
              />
              <label htmlFor="addVisible" className="text-sm text-slate-700 flex flex-col cursor-pointer">
                <span className="font-bold">Zichtbaar voor medewerker</span>
                <span className="text-xs text-slate-500">Indien uitgevinkt, is deze notitie alleen zichtbaar voor managers.</span>
              </label>
            </div>
          )}

          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Annuleren</button>
            <button type="submit" className="px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-sm">Opslaan</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Document uploaden">
         <form onSubmit={handleUploadDocument} className="space-y-5">
           <div>
               <input 
                 type="file"
                 ref={fileInputRef}
                 className="hidden"
                 onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
               />
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 transition-all cursor-pointer hover:border-teal-400 group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
               >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    {isUploading ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div> : <Upload className="h-8 w-8 text-teal-500" />}
                </div>
                <p className="mt-2 text-sm font-bold text-slate-700">
                    {uploadFile ? uploadFile.name : (isUploading ? 'Uploaden...' : 'Klik om te bladeren of sleep bestand hierheen')}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, JPG tot 10MB</p>
              </div>
           </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bestandsnaam (Optioneel)</label>
            <input 
              type="text" 
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
              placeholder="bv. Arbeidsovereenkomst 2023"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categorie</label>
            <select 
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50 font-medium"
            >
              <option value="Contract">Contracten & Overeenkomsten</option>
              <option value="Loonstrook">Loonstroken</option>
              <option value="Identificatie">Identificatie</option>
              <option value="Overig">Overige documenten</option>
            </select>
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Annuleren</button>
            <button type="submit" disabled={isUploading} className="px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50">
                {isUploading ? 'Bezig...' : 'Toevoegen'}
            </button>
          </div>
         </form>
      </Modal>

    </div>
  );
};

export default DocumentsPage;
