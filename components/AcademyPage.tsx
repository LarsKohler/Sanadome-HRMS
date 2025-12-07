import React, { useState, useEffect } from 'react';
import { 
    Play, CheckCircle, Search, Plus, Edit2, Trash2, 
    BookOpen, GraduationCap
} from 'lucide-react';
import { Employee, AcademyCourse, AcademyProgress } from '../types';
import AcademySidebar from './AcademySidebar';
import { api } from '../utils/api';
import { Modal } from './Modal';

interface AcademyPageProps {
    currentUser: Employee;
    onShowToast: (message: string) => void;
    onExit: () => void;
}

const AcademyPage: React.FC<AcademyPageProps> = ({ currentUser, onShowToast, onExit }) => {
    const [view, setView] = useState<string>('dashboard');
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [userProgress, setUserProgress] = useState<AcademyProgress[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Editor State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Partial<AcademyCourse>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const c = await api.getAcademyCourses();
        const p = await api.getAcademyProgress();
        setCourses(c);
        setUserProgress(p);
    };

    // --- HELPERS ---
    const getProgressForCourse = (courseId: string) => {
        return userProgress.find(p => p.courseId === courseId && p.employeeId === currentUser.id);
    };

    const startCourse = (course: AcademyCourse) => {
        onShowToast(`Start cursus: ${course.title}`);
    };

    // --- ADMIN HANDLERS ---
    const handleCreateCourse = () => {
        setEditingCourse({
            id: Math.random().toString(36).substr(2, 9),
            title: '',
            description: '',
            category: 'General',
            level: 'Beginner',
            modules: [],
            targetRoles: ['All'],
            createdAt: new Date().toLocaleDateString('nl-NL'),
            author: currentUser.name,
            isPublished: false
        });
        setIsEditModalOpen(true);
    };

    const handleSaveCourse = async () => {
        if(!editingCourse.title) return;
        const course = editingCourse as AcademyCourse;
        await api.saveAcademyCourse(course);
        loadData();
        setIsEditModalOpen(false);
        onShowToast("Cursus opgeslagen.");
    };

    const handleDeleteCourse = async (id: string) => {
        if(confirm("Weet je zeker dat je deze cursus wilt verwijderen?")) {
            await api.deleteAcademyCourse(id);
            loadData();
            onShowToast("Cursus verwijderd.");
        }
    };

    // --- VIEWS ---

    const renderDashboard = () => {
        const myStartedCourses = courses.filter(c => getProgressForCourse(c.id));
        
        return (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Mijn Learning Dashboard</h2>
                
                {myStartedCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myStartedCourses.map(course => {
                            const prog = getProgressForCourse(course.id);
                            return (
                                <div key={course.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">{course.category}</span>
                                        {prog?.status === 'Completed' && <CheckCircle size={20} className="text-green-500"/>}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-2">{course.title}</h3>
                                    <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
                                        <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${prog?.progressPercentage || 0}%`}}></div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">{prog?.progressPercentage}% Voltooid</span>
                                        <button onClick={() => startCourse(course)} className="text-sm font-bold text-indigo-600 hover:underline">
                                            {prog?.status === 'Completed' ? 'Opnieuw bekijken' : 'Verder gaan'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                        <GraduationCap size={48} className="mx-auto text-slate-300 mb-4"/>
                        <h3 className="text-lg font-bold text-slate-900">Nog geen cursussen gestart</h3>
                        <p className="text-slate-500 mb-4">Bekijk de catalogus om te beginnen met leren.</p>
                        <button onClick={() => setView('catalog')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Naar Catalogus</button>
                    </div>
                )}
            </div>
        );
    };

    const renderCatalog = () => (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Cursus Catalogus</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Zoek cursus..." 
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(course => (
                    <div key={course.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="h-32 bg-slate-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                            {course.coverImage ? (
                                <img src={course.coverImage} className="w-full h-full object-cover" alt={course.title}/>
                            ) : (
                                <BookOpen size={32} className="text-slate-300"/>
                            )}
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{course.title}</h3>
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{course.level}</span>
                            <button onClick={() => startCourse(course)} className="flex items-center gap-1 text-indigo-600 hover:underline">
                                <Play size={12}/> Starten
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderManageCourses = () => (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Cursus Beheer</h2>
                <button onClick={handleCreateCourse} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                    <Plus size={16}/> Nieuwe Cursus
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Titel</th>
                            <th className="px-6 py-4">Categorie</th>
                            <th className="px-6 py-4">Niveau</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {courses.map(course => (
                            <tr key={course.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-900">{course.title}</td>
                                <td className="px-6 py-4 text-slate-600">{course.category}</td>
                                <td className="px-6 py-4 text-slate-600">{course.level}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${course.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {course.isPublished ? 'Gepubliceerd' : 'Concept'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => { setEditingCourse(course); setIsEditModalOpen(true); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600">
                                        <Edit2 size={16}/>
                                    </button>
                                    <button onClick={() => handleDeleteCourse(course.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-600">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            <AcademySidebar 
                activeView={view} 
                onChangeView={(v) => setView(v)} 
                onExit={onExit} 
                currentUser={currentUser} 
            />
            <main className="flex-1 overflow-y-auto">
                {view === 'dashboard' && renderDashboard()}
                {view === 'catalog' && renderCatalog()}
                {view === 'manage-courses' && renderManageCourses()}
                {!['dashboard', 'catalog', 'manage-courses'].includes(view) && (
                    <div className="p-10 text-center text-slate-400">
                        Deze weergave ({view}) is nog in ontwikkeling.
                    </div>
                )}
            </main>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Cursus Bewerken">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titel</label>
                        <input 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                            value={editingCourse.title || ''}
                            onChange={e => setEditingCourse({...editingCourse, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Beschrijving</label>
                        <textarea 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                            rows={3}
                            value={editingCourse.description || ''}
                            onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categorie</label>
                            <input 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                value={editingCourse.category || ''}
                                onChange={e => setEditingCourse({...editingCourse, category: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Niveau</label>
                            <select 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                value={editingCourse.level || 'Beginner'}
                                onChange={e => setEditingCourse({...editingCourse, level: e.target.value as any})}
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            checked={editingCourse.isPublished || false}
                            onChange={e => setEditingCourse({...editingCourse, isPublished: e.target.checked})}
                        />
                        <label className="text-sm">Gepubliceerd</label>
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                        <button onClick={handleSaveCourse} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">Opslaan</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AcademyPage;