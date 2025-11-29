import React, { useState, useEffect } from 'react';
import { Employee, ViewState, Notification, NewsPost, Survey } from './types';
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
import SurveysPage from './components/SurveysPage';
import SurveyTakingFlow from './components/SurveyTakingFlow';
import SystemStatusPage from './components/SystemStatusPage';
import SettingsPage from './components/SettingsPage';
import DebtControlPage from './components/DebtControlPage';
import TicketDashboard from './components/TicketDashboard';
import BadgeManager from './components/BadgeManager';
import LinenAuditPage from './components/LinenAuditPage';
import KnowledgeBasePage from './components/KnowledgeBasePage';
import EvaluationsPage from './components/EvaluationsPage';
import { api, isLive } from './utils/api';

function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newsItems, setNewsItems] = useState<NewsPost[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Specific Feature States
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);

  // Initialize Data
  useEffect(() => {
    const loadData = async () => {
      const emps = await api.getEmployees();
      const news = await api.getNews();
      const notifs = await api.getNotifications();
      const srvs = await api.getSurveys();
      
      setEmployees(emps);
      setNewsItems(news);
      setNotifications(notifs);
      setSurveys(srvs);
    };

    if (isAuthenticated) {
        loadData();
        // Subscribe to realtime updates
        const unsubscribe = api.subscribe(
            setEmployees,
            setNewsItems,
            setNotifications,
            setSurveys
        );
        return () => { unsubscribe(); };
    }
  }, [isAuthenticated]);

  const handleShowToast = (msg: string) => {
      setToastMessage(msg);
      setShowToast(true);
  };

  const handleLogin = async (email: string, pass: string) => {
      const user = await api.loginUser(email, pass);
      if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          return true;
      }
      return false;
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCurrentView(ViewState.HOME);
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    // Optimistic Update
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    if (currentUser?.id === updatedEmployee.id) setCurrentUser(updatedEmployee);
    
    // Persist (Update existing, isNewUser = false)
    api.saveEmployee(updatedEmployee, false);
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    // Persist (Create new, isNewUser = true -> Triggers RPC admin_create_user)
    api.saveEmployee(newEmployee, true);
  };

  const handleDeleteEmployee = (id: string) => {
      api.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
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
          await handleUpdateEmployee(updated);
          setCurrentUser(updated);
      }} />;
  }

  const renderView = () => {
      switch(currentView) {
          case ViewState.HOME:
              return <EmployeeProfile 
                  employee={currentUser!} 
                  currentUser={currentUser!}
                  onUpdateEmployee={handleUpdateEmployee}
                  onChangeView={setCurrentView}
                  onAddNotification={(n) => { api.saveNotification(n); }}
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
                  onAddNotification={(n) => { api.saveNotification(n); }}
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
                  onAddNotification={(n) => { api.saveNotification(n); }}
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
                  onAddNotification={(n) => { api.saveNotification(n); }}
                  onShowToast={handleShowToast}
              />;
          case ViewState.REPORTS:
              return <ReportsDashboard />;
          case ViewState.SURVEYS:
              return <SurveysPage 
                  currentUser={currentUser!}
                  surveys={surveys}
                  onAddSurvey={(s) => api.saveSurvey(s)}
                  onDeleteSurvey={(id) => api.deleteSurvey(id)}
                  onStartSurvey={(id) => {
                      const s = surveys.find(s => s.id === id);
                      if (s) setActiveSurvey(s);
                  }}
              />;
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
          case ViewState.TICKETS:
              return <TicketDashboard 
                  currentUser={currentUser!}
                  onShowToast={handleShowToast}
                  onOpenFeedbackModal={() => {}} 
              />;
          case ViewState.BADGES:
              return <BadgeManager 
                  currentUser={currentUser!}
                  employees={employees}
                  onUpdateEmployee={handleUpdateEmployee}
                  onShowToast={handleShowToast}
                  onAddNotification={(n) => { api.saveNotification(n); }}
              />;
          case ViewState.LINEN_AUDIT:
              return <LinenAuditPage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.KNOWLEDGE_BASE:
              return <KnowledgeBasePage currentUser={currentUser!} onShowToast={handleShowToast} />;
          case ViewState.EVALUATIONS:
              return <EvaluationsPage 
                  currentUser={currentUser!}
                  employees={employees}
                  onUpdateEmployee={handleUpdateEmployee}
                  onAddNotification={(n) => api.saveNotification(n)}
                  onShowToast={handleShowToast}
              />;
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

        {activeSurvey && (
            <SurveyTakingFlow 
                survey={activeSurvey}
                employeeId={currentUser!.id}
                onComplete={(response) => {
                    const updatedSurvey = {
                        ...activeSurvey,
                        responseCount: activeSurvey.responseCount + 1,
                        completedBy: [...activeSurvey.completedBy, currentUser!.id]
                    };
                    api.saveSurvey(updatedSurvey);
                    setActiveSurvey(null);
                    handleShowToast("Survey verzonden! Bedankt.");
                }}
                onClose={() => setActiveSurvey(null)}
            />
        )}
      </div>
    </div>
  );
}

export default App;