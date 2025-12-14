
import React, { useState, useEffect } from 'react';
import { Employee, ViewState, NewsPost, GlobalSettings, Applicant } from './types';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import EmployeeDirectory from './components/EmployeeDirectory';
import EmployeeProfile from './components/EmployeeProfile';
import ReportsDashboard from './components/ReportsDashboard';
import NewsPage from './components/NewsPage';
import OnboardingPage from './components/OnboardingPage';
import Login from './components/Login';
import WelcomeFlow from './components/WelcomeFlow';
import { Toast } from './components/Toast';
import SystemStatusPage from './components/SystemStatusPage';
import SettingsPage from './components/SettingsPage';
import DebtControlPage from './components/DebtControlPage';
import LinenAuditPage from './components/LinenAuditPage';
import KnowledgeBasePage from './components/KnowledgeBasePage';
import EvaluationsPage from './components/EvaluationsPage';
import RecruitmentPage from './components/RecruitmentPage';
import BikeRentalPage from './components/BikeRentalPage'; 
import BadgeManager from './components/BadgeManager';
import AcademyPage from './components/AcademyPage'; 
import CompensationPage from './components/CompensationPage';
import ChecklistsPage from './components/ChecklistsPage';
import HRDossierPage from './components/HRDossierPage'; // NEW
import UpdateNotifier from './components/UpdateNotifier';
import { api, isLive } from './utils/api';
import { isModuleEnabled } from './utils/permissions';

function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
      const saved = localStorage.getItem('hrms_current_user');
      return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      return !!localStorage.getItem('hrms_current_user');
  });
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newsItems, setNewsItems] = useState<NewsPost[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Specific Feature States
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Initialize Data
  useEffect(() => {
    const loadData = async () => {
      const emps = await api.getEmployees();
      const news = await api.getNews();
      const apps = await api.getApplicants(); 
      const settings = await api.getGlobalSettings(); 
      
      setEmployees(emps);
      setNewsItems(news);
      setApplicants(apps);
      setGlobalSettings(settings);
    };

    if (isAuthenticated) {
        loadData();
        // Subscribe to realtime updates
        const unsubscribe = api.subscribe(
            setEmployees,
            setNewsItems,
            setApplicants 
        );
        return () => { unsubscribe(); };
    }
  }, [isAuthenticated]);

  // SYNC CURRENT USER WITH EMPLOYEE DATA
  useEffect(() => {
      if (currentUser && employees.length > 0) {
          const freshUser = employees.find(e => e.id === currentUser.id);
          
          if (freshUser) {
              if (currentUser.accountStatus === 'Active' && freshUser.accountStatus === 'Pending') {
                  return;
              }

              if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
                  setCurrentUser(freshUser);
                  localStorage.setItem('hrms_current_user', JSON.stringify(freshUser));
              }
          }
      }
  }, [employees, currentUser]);

  const handleShowToast = (msg: string) => {
      setToastMessage(msg);
      setShowToast(true);
  };

  const handleLogin = async (email: string, pass: string) => {
      const user = await api.loginUser(email, pass);
      if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          localStorage.setItem('hrms_current_user', JSON.stringify(user));
          return true;
      }
      return false;
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCurrentView(ViewState.HOME);
      localStorage.removeItem('hrms_current_user');
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    
    if (currentUser?.id === updatedEmployee.id) {
        setCurrentUser(updatedEmployee);
        localStorage.setItem('hrms_current_user', JSON.stringify(updatedEmployee));
    }
    
    try {
        const success = await api.saveEmployee(updatedEmployee, false);
        if (!success) {
            console.error("Failed to save employee to database");
            handleShowToast("Let op: Wijziging niet opgeslagen in database.");
        }
    } catch (e) {
        console.error("Error saving employee", e);
        handleShowToast("Fout bij opslaan.");
    }
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    api.saveEmployee(newEmployee, true);
  };

  const handleDeleteEmployee = (id: string) => {
      api.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
  };

  // --- NEWS HANDLERS ---
  const handleAddNews = async (post: NewsPost) => {
      setNewsItems(prev => [post, ...prev]);
      try {
          await api.saveNewsPost(post);
          handleShowToast("Nieuwsbericht gepubliceerd.");
      } catch (e) {
          console.error("Error adding news", e);
          handleShowToast("Fout bij publiceren.");
      }
  };

  const handleUpdateNews = async (post: NewsPost) => {
      setNewsItems(prev => prev.map(n => n.id === post.id ? post : n));
      try {
          await api.updateNewsPost(post);
          handleShowToast("Nieuwsbericht bijgewerkt.");
      } catch (e) {
          console.error("Error updating news", e);
          handleShowToast("Fout bij bijwerken.");
      }
  };

  const handleDeleteNews = async (id: string) => {
      setNewsItems(prev => prev.filter(n => n.id !== id));
      try {
          await api.deleteNewsPost(id);
          handleShowToast("Nieuwsbericht verwijderd.");
      } catch (e) {
          console.error("Error deleting news", e);
          handleShowToast("Fout bij verwijderen.");
      }
  };

  const handleMarkNewsRead = async (postId: string) => {
      if (!currentUser) return;
      
      const post = newsItems.find(n => n.id === postId);
      if (!post) return;

      const updatedReadBy = [...(post.readBy || []), currentUser.id];
      const updatedPost = { ...post, readBy: updatedReadBy };

      setNewsItems(prev => prev.map(n => n.id === postId ? updatedPost : n));
      
      try {
          await api.updateNewsPost(updatedPost);
      } catch (e) {
          console.error("Error marking news as read", e);
      }
  };

  const handleUpdateGlobalSettings = (newSettings: GlobalSettings) => {
      setGlobalSettings(newSettings);
      api.saveGlobalSettings(newSettings);
      handleShowToast('Systeem instellingen opgeslagen.');
  };

  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
  }

  if (currentUser?.accountStatus === 'Pending') {
      return <WelcomeFlow employee={currentUser} onComplete={async (updated) => {
          const success = await api.saveEmployee(updated, false);
          if (!success) {
              throw new Error("Het opslaan in de database is mislukt.");
          }
          setCurrentUser(updated);
          localStorage.setItem('hrms_current_user', JSON.stringify(updated));
          setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
          const freshData = await api.getEmployees();
          setEmployees(freshData);
      }} />;
  }

  // Check if current view is enabled, else redirect home
  if (!isModuleEnabled(currentView, currentUser, globalSettings)) {
      setCurrentView(ViewState.HOME);
  }

  // --- ACADEMY LAYOUT CHECK ---
  if (currentView === ViewState.ACADEMY && isModuleEnabled(ViewState.ACADEMY, currentUser, globalSettings)) {
      return (
          <>
            <AcademyPage 
                currentUser={currentUser!}
                employees={employees}
                onShowToast={handleShowToast}
                onExit={() => setCurrentView(ViewState.HOME)}
            />
            <Toast 
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
          </>
      );
  }

  // --- STANDARD LAYOUT ---
  const renderView = () => {
      switch(currentView) {
          case ViewState.HOME:
              return <EmployeeProfile 
                  employee={currentUser!} 
                  currentUser={currentUser!}
                  applicants={applicants} 
                  onUpdateEmployee={handleUpdateEmployee}
                  onChangeView={setCurrentView}
                  onShowToast={handleShowToast}
                  onNext={() => {}} onPrevious={() => {}}
                  managers={employees.filter(e => e.role === 'Manager')}
                  latestNews={newsItems[0]}
              />;
          case ViewState.DIRECTORY:
              return <EmployeeDirectory 
                  employees={employees} 
                  currentUser={currentUser!} 
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView(ViewState.PROFILE); }}
              />;
          case ViewState.PROFILE:
              const targetProfile = employees.find(e => e.id === selectedProfileId) || currentUser!;
              return <EmployeeProfile 
                  employee={targetProfile}
                  currentUser={currentUser!}
                  applicants={applicants}
                  onUpdateEmployee={handleUpdateEmployee}
                  onChangeView={setCurrentView}
                  onShowToast={handleShowToast}
                  onNext={() => {}} onPrevious={() => {}}
                  onBack={() => setCurrentView(ViewState.DIRECTORY)}
                  managers={employees.filter(e => e.role === 'Manager')}
              />;
          case ViewState.HR_DOSSIER:
              return <HRDossierPage 
                  employees={employees}
                  currentUser={currentUser!}
                  onUpdateEmployee={handleUpdateEmployee}
                  onShowToast={handleShowToast}
              />;
          // ViewState.DOCUMENTS removed
          case ViewState.NEWS:
              return <NewsPage 
                  currentUser={currentUser!}
                  newsItems={newsItems}
                  onAddNews={handleAddNews}
                  onUpdateNews={handleUpdateNews}
                  onDeleteNews={handleDeleteNews}
                  onMarkRead={handleMarkNewsRead}
              />;
          case ViewState.ONBOARDING:
              return <OnboardingPage 
                  employees={employees}
                  currentUser={currentUser!}
                  onUpdateEmployee={handleUpdateEmployee}
                  onShowToast={handleShowToast}
              />;
          case ViewState.REPORTS:
              return <ReportsDashboard />;
          case ViewState.SYSTEM_STATUS:
              return <SystemStatusPage currentUser={currentUser} />;
          case ViewState.SETTINGS:
              return <SettingsPage 
                  employees={employees}
                  currentUser={currentUser!}
                  onUpdateEmployee={handleUpdateEmployee}
                  onShowToast={handleShowToast}
                  globalSettings={globalSettings}
                  onUpdateGlobalSettings={handleUpdateGlobalSettings}
              />;
          case ViewState.DEBT_CONTROL:
              return <DebtControlPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.LINEN_AUDIT:
              return <LinenAuditPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.KNOWLEDGE_BASE:
              return <KnowledgeBasePage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.EVALUATIONS:
              return <EvaluationsPage 
                  currentUser={currentUser!}
                  employees={employees}
                  onUpdateEmployee={handleUpdateEmployee}
                  onShowToast={handleShowToast}
              />;
          case ViewState.RECRUITMENT:
              return <RecruitmentPage 
                  currentUser={currentUser!}
                  employees={employees} 
                  applicants={applicants}
                  onShowToast={handleShowToast}
                  onHireCandidate={async (applicant) => {
                      const newId = crypto.randomUUID();
                      const newEmployee: Employee = {
                          id: newId,
                          name: `${applicant.firstName} ${applicant.lastName}`,
                          role: 'Medewerker',
                          departments: ['Front Office'],
                          email: applicant.email,
                          phone: applicant.phone,
                          avatar: applicant.avatar || `https://ui-avatars.com/api/?name=${applicant.firstName}+${applicant.lastName}&background=random`,
                          linkedin: `${applicant.firstName} ${applicant.lastName}`,
                          hiredOn: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
                          employmentType: 'Full-Time',
                          accountStatus: 'Pending',
                          password: 'sanadome123',
                          documents: [],
                          notes: [],
                          onboardingStatus: 'Pending',
                          onboardingTasks: []
                      };
                      await handleAddEmployee(newEmployee);
                      setCurrentView(ViewState.DIRECTORY);
                  }}
              />;
          case ViewState.BIKE_RENTAL:
              return <BikeRentalPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.COMPENSATION:
              return <CompensationPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.CHECKLISTS: 
              return <ChecklistsPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          default:
              return <div className="p-10">Pagina niet gevonden of in ontwikkeling.</div>;
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        user={currentUser!}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        globalSettings={globalSettings}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav 
          user={currentUser!} 
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigate={setCurrentView}
          isLive={isLive}
          onOpenFeedbackModal={() => {}}
        />
        
        <main className="flex-1 overflow-y-auto scroll-smooth">
           {renderView()}
        </main>

        <Toast 
            message={toastMessage}
            isVisible={showToast}
            onClose={() => setShowToast(false)}
        />

        <UpdateNotifier />
      </div>
    </div>
  );
}

export default App;