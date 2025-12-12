
import React, { useState, useEffect } from 'react';
import { Employee, ViewState, Notification, NewsPost } from './types';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import EmployeeDirectory from './components/EmployeeDirectory';
import EmployeeProfile from './components/EmployeeProfile';
import ReportsDashboard from './components/ReportsDashboard';
import DocumentsPage from './components/DocumentsPage';
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
import TicketDashboard from './components/TicketDashboard';
import BikeRentalPage from './components/BikeRentalPage'; 
import BadgeManager from './components/BadgeManager';
import AcademyPage from './components/AcademyPage'; 
import CompensationPage from './components/CompensationPage';
import UpdateNotifier from './components/UpdateNotifier';
import { api, isLive } from './utils/api';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newsItems, setNewsItems] = useState<NewsPost[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      const notifs = await api.getNotifications();
      
      setEmployees(emps);
      setNewsItems(news);
      setNotifications(notifs);
    };

    if (isAuthenticated) {
        loadData();
        // Subscribe to realtime updates
        const unsubscribe = api.subscribe(
            setEmployees,
            setNewsItems,
            setNotifications
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

  const handleAddNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      api.saveNotification(notification);
  };

  const handleRemoveNotification = (id: string) => {
      api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
      notifications.filter(n => n.recipientId === currentUser?.id).forEach(n => api.deleteNotification(n.id));
      setNotifications(prev => prev.filter(n => n.recipientId !== currentUser?.id));
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

  // --- ACADEMY LAYOUT CHECK ---
  if (currentView === ViewState.ACADEMY) {
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
                  onUpdateEmployee={handleUpdateEmployee}
                  onChangeView={setCurrentView}
                  onAddNotification={handleAddNotification}
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
                  onUpdateEmployee={handleUpdateEmployee}
                  onChangeView={setCurrentView}
                  onAddNotification={handleAddNotification}
                  onShowToast={handleShowToast}
                  onNext={() => {}} onPrevious={() => {}}
                  onBack={() => setCurrentView(ViewState.DIRECTORY)}
                  managers={employees.filter(e => e.role === 'Manager')}
              />;
          case ViewState.DOCUMENTS:
              return <DocumentsPage 
                  employees={employees}
                  currentUser={currentUser!}
                  onUpdateEmployee={handleUpdateEmployee}
                  onAddNotification={handleAddNotification}
                  onShowToast={handleShowToast}
                  selectedEmployeeId={selectedProfileId}
                  onSelectEmployee={setSelectedProfileId}
              />;
          case ViewState.NEWS:
              return <NewsPage 
                  currentUser={currentUser!}
                  newsItems={newsItems}
                  onAddNews={(post) => api.saveNewsPost(post)}
                  onUpdateNews={(post) => api.updateNewsPost(post)}
                  onDeleteNews={(id) => api.deleteNewsPost(id)}
                  onLikeNews={(postId, userId) => {
                      const post = newsItems.find(n => n.id === postId);
                      if (post) {
                          const likes = post.likedBy.includes(userId) 
                              ? post.likedBy.filter(id => id !== userId) 
                              : [...post.likedBy, userId];
                          api.updateNewsPost({ ...post, likedBy: likes, likes: likes.length });
                      }
                  }}
              />;
          case ViewState.ONBOARDING:
              return <OnboardingPage 
                  employees={employees}
                  currentUser={currentUser!}
                  onUpdateEmployee={handleUpdateEmployee}
                  onAddNotification={handleAddNotification}
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
                  onAddNotification={handleAddNotification}
                  onShowToast={handleShowToast}
              />;
          case ViewState.RECRUITMENT:
              return <RecruitmentPage 
                  currentUser={currentUser!}
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
          default:
              // Fallback for ID-based views (Tickets)
              if (currentView === 'cases') {
                  return <TicketDashboard onShowToast={handleShowToast} currentUser={currentUser!} onAddNotification={handleAddNotification} onOpenFeedbackModal={() => {}}/>;
              }
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
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav 
          user={currentUser!} 
          onLogout={handleLogout}
          notifications={notifications.filter(n => n.recipientId === currentUser?.id)}
          onNotificationClick={(n) => {
              if (!n.read) api.markNotificationRead(n.id, notifications);
              if (n.targetView) setCurrentView(n.targetView);
          }}
          onMarkAllRead={() => api.markAllNotificationsRead(currentUser!.id, notifications)}
          onMarkSingleRead={(id) => api.markNotificationRead(id, notifications)}
          onRemoveNotification={handleRemoveNotification}
          onClearAllNotifications={handleClearAllNotifications}
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
