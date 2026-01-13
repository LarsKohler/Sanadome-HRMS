
import React, { useState, useEffect, useRef } from 'react';
import { Employee, ViewState, NewsPost, GlobalSettings, Applicant, Notification } from './types';
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
import BadgeManager from './components/BadgeManager';
import AcademyPage from './components/AcademyPage'; 
import CompensationPage from './components/CompensationPage';
import ChecklistsPage from './components/ChecklistsPage';
import HRDossierPage from './components/HRDossierPage'; 
import TodoListPage from './components/TodoListPage'; 
import ComplaintsPage from './components/ComplaintsPage'; 
import DataAuditPage from './components/DataAuditPage'; 
import UpdateNotifier from './components/UpdateNotifier';
import ResetPasswordPage from './components/ResetPasswordPage'; 
import StockControlPage from './components/StockControlPage'; 
import SessionLockScreen from './components/SessionLockScreen'; 
import { api, isLive } from './utils/api';
import { isModuleEnabled } from './utils/permissions';

// Configuration for inactivity
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 Minutes

// View Title Mapping
const getViewTitle = (view: ViewState): string => {
    switch (view) {
        case ViewState.HOME: return 'Mijn Profiel';
        case ViewState.DIRECTORY: return 'Collega Directory';
        case ViewState.NEWS: return 'Nieuws & Updates';
        case ViewState.ACADEMY: return 'Academy';
        case ViewState.KNOWLEDGE_BASE: return 'Kennisbank';
        case ViewState.CHECKLISTS: return 'Checklists';
        case ViewState.COMPENSATION: return 'Compensatie & Coulance';
        case ViewState.STOCK_CONTROL: return 'Voorraadbeheer';
        case ViewState.HR_DOSSIER: return 'HR Dossiers';
        case ViewState.ONBOARDING: return 'Onboarding';
        case ViewState.EVALUATIONS: return 'Evaluaties';
        case ViewState.RECRUITMENT: return 'Recruitment';
        case ViewState.TODO_LIST: return 'Takenlijst';
        case ViewState.COMPLAINTS: return 'Klachtenmanagement';
        case ViewState.DEBT_CONTROL: return 'Debiteurenbeheer';
        case ViewState.DATA_AUDIT: return 'Data Audit';
        case ViewState.LINEN_AUDIT: return 'Linnen Audit';
        case ViewState.REPORTS: return 'Rapportages';
        case ViewState.SYSTEM_STATUS: return 'Systeemstatus';
        case ViewState.SETTINGS: return 'Instellingen';
        case ViewState.PROFILE: return 'Medewerker Profiel';
        default: return 'Dashboard';
    }
};

function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
      const saved = localStorage.getItem('hrms_current_user');
      return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      return !!localStorage.getItem('hrms_current_user');
  });

  // Session Lock State
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const activityTimerRef = useRef<number | null>(null);
  
  // URL Routing for special pages (Reset Password)
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('hrms_dark_mode');
          if (saved) return JSON.parse(saved);
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
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

  // Initialize Routing Logic
  useEffect(() => {
      const path = window.location.pathname;
      if (path.startsWith('/reset-password/')) {
          const id = path.split('/reset-password/')[1];
          if (id) setResetToken(id);
      }
  }, []);

  // --- INACTIVITY TIMER LOGIC ---
  const resetInactivityTimer = () => {
      if (activityTimerRef.current) {
          clearTimeout(activityTimerRef.current);
      }
      if (isAuthenticated && !isSessionLocked) {
          activityTimerRef.current = window.setTimeout(() => {
              setIsSessionLocked(true);
          }, INACTIVITY_LIMIT_MS);
      }
  };

  useEffect(() => {
      if (isAuthenticated && !isSessionLocked) {
          // Add event listeners for user activity
          const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
          const handler = () => resetInactivityTimer();
          
          events.forEach(event => document.addEventListener(event, handler));
          
          // Initial start
          resetInactivityTimer();

          return () => {
              events.forEach(event => document.removeEventListener(event, handler));
              if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
          };
      }
  }, [isAuthenticated, isSessionLocked]);

  // Toggle Theme Function
  const toggleTheme = () => {
      setIsDarkMode(prev => !prev);
  };

  // Apply Theme Effect
  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('hrms_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

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

    if (isAuthenticated || resetToken) { 
        loadData();
    }
    
    if (isAuthenticated) {
        const unsubscribe = api.subscribe(
            setEmployees,
            setNewsItems,
            setApplicants 
        );
        return () => { unsubscribe(); };
    }
  }, [isAuthenticated, resetToken]);

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
          setIsSessionLocked(false);
          localStorage.setItem('hrms_current_user', JSON.stringify(user));
          return true;
      }
      return false;
  };

  const handleUnlock = async (password: string): Promise<boolean> => {
      if (!currentUser) return false;
      const user = await api.loginUser(currentUser.email, password);
      if (user) {
          setIsSessionLocked(false);
          resetInactivityTimer();
          return true;
      }
      return false;
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsSessionLocked(false);
      setCurrentView(ViewState.HOME);
      localStorage.removeItem('hrms_current_user');
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
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

  const handleAddNotification = async (notification: Notification) => {
    await api.saveNotification(notification);
  };

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

  // --- Global Search Navigation Handler ---
  const handleSearchNavigation = (profileId: string) => {
      setSelectedProfileId(profileId);
      setCurrentView(ViewState.PROFILE);
  };

  if (resetToken) {
      return <ResetPasswordPage employeeId={resetToken} />;
  }

  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
  }

  if (isSessionLocked && currentUser) {
      return (
          <SessionLockScreen 
              currentUser={currentUser}
              onUnlock={handleUnlock}
              onLogout={handleLogout}
          />
      );
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
      }} />;
  }

  if (!isModuleEnabled(currentView, currentUser, globalSettings)) {
      setCurrentView(ViewState.HOME);
  }

  if (currentView === ViewState.ACADEMY && isModuleEnabled(ViewState.ACADEMY, currentUser, globalSettings)) {
      return (
          <>
            <AcademyPage 
                currentUser={currentUser!}
                employees={employees}
                onShowToast={handleShowToast}
                onExit={() => setCurrentView(ViewState.HOME)}
                onUpdateEmployee={handleUpdateEmployee}
                onAddNotification={handleAddNotification}
            />
            <Toast 
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
          </>
      );
  }

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
                  recentNews={newsItems.slice(0, 3)}
              />;
          case ViewState.DIRECTORY:
              return <EmployeeDirectory 
                  employees={employees} 
                  currentUser={currentUser!} 
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onViewProfile={(id) => { setSelectedProfileId(id); setCurrentView(ViewState.PROFILE); }}
                  globalSettings={globalSettings}
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
          case ViewState.DATA_AUDIT: 
              return <DataAuditPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.KNOWLEDGE_BASE:
              return <KnowledgeBasePage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.EVALUATIONS:
              return <EvaluationsPage 
                  currentUser={currentUser!}
                  employees={employees}
                  onUpdateEmployee={handleUpdateEmployee}
                  onAddNotification={handleAddNotification}
                  onShowToast={handleShowToast}
              />;
          case ViewState.RECRUITMENT:
              return <RecruitmentPage 
                  currentUser={currentUser!}
                  employees={employees} 
                  applicants={applicants}
                  onShowToast={handleShowToast}
                  onAddNotification={handleAddNotification}
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
          case ViewState.COMPENSATION:
              return <CompensationPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.CHECKLISTS: 
              return <ChecklistsPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.TODO_LIST: 
              return <TodoListPage currentUser={currentUser!} employees={employees} onShowToast={handleShowToast} />;
          case ViewState.COMPLAINTS:
              return <ComplaintsPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.STOCK_CONTROL:
              return <StockControlPage 
                  currentUser={currentUser!} 
                  onShowToast={handleShowToast} 
                  globalSettings={globalSettings}
                  onUpdateGlobalSettings={handleUpdateGlobalSettings}
              />;
          default:
              return <div className="p-10 dark:text-white">Pagina niet gevonden of in ontwikkeling.</div>;
      }
  };

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300`}>
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        user={currentUser!}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
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
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          currentViewTitle={getViewTitle(currentView)}
          onLockSession={() => setIsSessionLocked(true)}
          // Pass data for global search
          searchData={{ employees, news: newsItems }}
          onSelectProfile={handleSearchNavigation}
          globalSettings={globalSettings}
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
