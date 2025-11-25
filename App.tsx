
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import EmployeeProfile from './components/EmployeeProfile';
import ReportsDashboard from './components/ReportsDashboard';
import EmployeeDirectory from './components/EmployeeDirectory';
import DocumentsPage from './components/DocumentsPage';
import NewsPage from './components/NewsPage';
import OnboardingPage from './components/OnboardingPage';
import SurveysPage from './components/SurveysPage';
import EvaluationsPage from './components/EvaluationsPage'; 
import SurveyTakingFlow from './components/SurveyTakingFlow';
import WelcomeFlow from './components/WelcomeFlow';
import SystemStatusPage from './components/SystemStatusPage';
import SettingsPage from './components/SettingsPage'; // Import new page
import Login from './components/Login';
import { Toast } from './components/Toast';
import { ViewState, Employee, Notification, NewsPost, Survey, SurveyResponse } from './types';
import { api, isLive } from './utils/api';
import { Loader2 } from 'lucide-react';
import { LATEST_SYSTEM_UPDATE } from './utils/mockData';

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [setupUser, setSetupUser] = useState<Employee | null>(null);
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // View State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- CENTRALIZED DATA STATE ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newsItems, setNewsItems] = useState<NewsPost[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);

  // --- INITIAL DATA FETCH & SUBSCRIPTION ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empData, newsData, notifData, surveyData] = await Promise.all([
          api.getEmployees(),
          api.getNews(),
          api.getNotifications(),
          api.getSurveys()
        ]);
        setEmployees(empData);
        setNewsItems(newsData);
        setNotifications(notifData);
        setSurveys(surveyData);
        
        // CHECK FOR DEEP LINK (Invitation)
        const path = window.location.pathname;
        if (path.startsWith('/welcome/')) {
             const inviteId = path.split('/welcome/')[1];
             if (inviteId) {
                 // Try to find user by partial ID match (since link uses substring(0,8))
                 const invitedUser = empData.find(e => e.id.startsWith(inviteId));
                 if (invitedUser) {
                     setCurrentUser(invitedUser);
                     setIsLoading(false);
                     return; // Skip session check if invite link found
                 }
             }
        }

        // CHECK FOR SAVED SESSION
        const savedSessionId = localStorage.getItem('hrms_session_id');
        if (savedSessionId) {
             const foundUser = empData.find(e => e.id === savedSessionId);
             if (foundUser) {
                 setCurrentUser(foundUser);
             }
        }

        // AUTO LOG SYSTEM UPDATE
        // Check if the latest update is already in the DB logs
        const logs = await api.getSystemLogs();
        const alreadyLogged = logs.some(l => l.id === LATEST_SYSTEM_UPDATE.id);
        if (!alreadyLogged) {
            await api.saveSystemLog(LATEST_SYSTEM_UPDATE);
            console.log("System update auto-logged:", LATEST_SYSTEM_UPDATE.version);
        }

      } catch (error) {
        console.error("Error loading data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to changes (Supabase or LocalStorage)
    const unsubscribe = api.subscribe(
      (newEmployees) => {
        setEmployees(newEmployees);
        if (currentUser) {
          const updatedSelf = newEmployees.find(e => e.id === currentUser.id);
          if (updatedSelf) setCurrentUser(updatedSelf);
        }
      },
      setNewsItems,
      setNotifications,
      setSurveys
    );
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Active Survey State
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);

  // Deep Link State
  const [dossierEmployeeId, setDossierEmployeeId] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Initial Mock Notification for Survey (Local Logic Only)
  useEffect(() => {
      if (currentUser && surveys.length > 0) {
          const surveyS1 = surveys.find(s => s.id === 's1');
          const alreadyCompleted = surveyS1?.completedBy.includes(currentUser.id);
          
          if (!alreadyCompleted && surveyS1?.status === 'Active') {
             const hasNotif = notifications.some(n => n.type === 'Survey' && n.metaId === 's1');
             if (!hasNotif) {
                  // This is a local-only notification trigger for demo purposes
             }
          }
      }
  }, [currentUser, surveys, notifications]);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const handleLogin = (email: string, password: string): boolean => {
    const foundUser = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password);
    if (foundUser) {
      setCurrentUser(foundUser);
      // Persist Session
      localStorage.setItem('hrms_session_id', foundUser.id);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(ViewState.HOME);
    setDossierEmployeeId(null);
    // Clear Session
    localStorage.removeItem('hrms_session_id');
    // Clear URL if on welcome page
    if (window.location.pathname.startsWith('/welcome/')) {
        window.history.pushState({}, '', '/');
    }
  };

  // --- DATA MUTATION HANDLERS (Using API Layer) ---

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    // Optimistic Update
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    if (currentUser?.id === updatedEmployee.id) setCurrentUser(updatedEmployee);
    
    // Persist
    api.saveEmployee(updatedEmployee);
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    api.saveEmployee(newEmployee);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    api.deleteEmployee(id);
  };

  const handleAddNews = (post: NewsPost) => {
    setNewsItems(prev => [post, ...prev]);
    api.saveNewsPost(post);
    showToast('Nieuwsbericht gepubliceerd');
  };

  const handleLikeNews = (postId: string, userId: string) => {
      const post = newsItems.find(n => n.id === postId);
      if (post) {
          const isLiked = post.likedBy.includes(userId);
          const updatedPost = {
              ...post,
              likes: isLiked ? post.likes - 1 : post.likes + 1,
              likedBy: isLiked ? post.likedBy.filter(id => id !== userId) : [...post.likedBy, userId]
          };
          // Optimistic
          setNewsItems(prev => prev.map(n => n.id === postId ? updatedPost : n));
          // Persist
          api.updateNewsPost(updatedPost);
      }
  };

  const handleAddNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      api.saveNotification(notification);
  };

  const handleMarkAllRead = () => {
      if (currentUser) {
          setNotifications(prev => prev.map(n => n.recipientId === currentUser.id ? { ...n, read: true } : n));
          api.markAllNotificationsRead(currentUser.id, notifications);
      }
  };

  const handleMarkSingleRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      api.markNotificationRead(id, notifications);
  };

  const handleAddSurvey = (survey: Survey) => {
      setSurveys(prev => [...prev, survey]);
      api.saveSurvey(survey);
      showToast('Survey aangemaakt');
  };

  const handleDeleteSurvey = (id: string) => {
      setSurveys(prev => prev.filter(s => s.id !== id));
      api.deleteSurvey(id);
      showToast('Survey verwijderd');
  };

  const handleCompleteSurvey = (response: SurveyResponse) => {
      const survey = surveys.find(s => s.id === response.surveyId);
      if (survey) {
          const updatedSurvey = {
              ...survey,
              responseCount: survey.responseCount + 1,
              completedBy: [...survey.completedBy, response.employeeId]
          };
          setSurveys(prev => prev.map(s => s.id === survey.id ? updatedSurvey : s));
          api.saveSurvey(updatedSurvey);
      }
      setActiveSurveyId(null);
      showToast('Bedankt voor je deelname!');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
      setToastMessage(null);
    }, 3000);
  };

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Systeem laden...</p>
        </div>
      </div>
    );
  }

  // 1. Login Screen
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Setup/Welcome Flow (Password Reset etc)
  if (currentUser.accountStatus === 'Pending' || setupUser) {
      return (
          <WelcomeFlow 
            employee={currentUser} 
            onComplete={(updated) => {
                const finalEmp = { ...updated, accountStatus: 'Active' as const };
                handleUpdateEmployee(finalEmp);
                setSetupUser(null);
                // Clear the URL to avoid re-triggering welcome flow on refresh
                if (window.location.pathname.startsWith('/welcome/')) {
                    window.history.pushState({}, '', '/');
                }
            }} 
          />
      );
  }

  // 3. Survey Flow (Overlay)
  if (activeSurveyId) {
      const activeSurvey = surveys.find(s => s.id === activeSurveyId);
      if (activeSurvey) {
          return (
              <SurveyTakingFlow 
                survey={activeSurvey}
                employeeId={currentUser.id}
                onComplete={handleCompleteSurvey}
                onClose={() => setActiveSurveyId(null)}
              />
          );
      }
  }

  // 4. Main Application
  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
      
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        user={currentUser} // Changed from userRole to full user
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        systemVersion={LATEST_SYSTEM_UPDATE.version}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <TopNav 
          user={currentUser} 
          onLogout={handleLogout} 
          notifications={notifications.filter(n => n.recipientId === currentUser.id)}
          onNotificationClick={(n) => {
              handleMarkSingleRead(n.id);
              if (n.targetView) {
                  setCurrentView(n.targetView);
                  if (n.targetEmployeeId) setDossierEmployeeId(n.targetEmployeeId);
                  if (n.type === 'Survey' && n.metaId) setActiveSurveyId(n.metaId);
              }
          }}
          onMarkAllRead={handleMarkAllRead}
          onMarkSingleRead={handleMarkSingleRead}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigate={(view) => setCurrentView(view)}
          isLive={isLive}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar scroll-smooth">
          {(currentView === ViewState.HOME || currentView === ViewState.PROFILE) && (
            <EmployeeProfile 
              employee={currentUser}
              onNext={() => {}} 
              onPrevious={() => {}}
              onChangeView={setCurrentView}
              onUpdateEmployee={handleUpdateEmployee}
              onAddNotification={handleAddNotification}
              onShowToast={showToast}
              managers={employees.filter(e => e.role === 'Manager')}
            />
          )}

          {currentView === ViewState.NEWS && (
             <NewsPage 
                currentUser={currentUser}
                newsItems={newsItems}
                onAddNews={handleAddNews}
                onLikeNews={handleLikeNews}
             />
          )}

          {currentView === ViewState.DIRECTORY && (
            <EmployeeDirectory 
              employees={employees} 
              currentUser={currentUser}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onSimulateOnboarding={(emp) => {
                  setSetupUser(emp);
                  setCurrentUser(emp);
              }}
            />
          )}

          {currentView === ViewState.REPORTS && (
            <ReportsDashboard />
          )}

          {currentView === ViewState.DOCUMENTS && (
            <DocumentsPage 
               employees={employees}
               currentUser={currentUser}
               onUpdateEmployee={handleUpdateEmployee}
               onAddNotification={handleAddNotification}
               onShowToast={showToast}
               selectedEmployeeId={dossierEmployeeId}
               onSelectEmployee={setDossierEmployeeId}
            />
          )}

          {currentView === ViewState.ONBOARDING && (
            <OnboardingPage 
               employees={employees}
               currentUser={currentUser}
               onUpdateEmployee={handleUpdateEmployee}
               onAddNotification={handleAddNotification}
               onShowToast={showToast}
            />
          )}

          {currentView === ViewState.SURVEYS && (
            <SurveysPage 
               currentUser={currentUser}
               surveys={surveys}
               onAddSurvey={handleAddSurvey}
               onDeleteSurvey={handleDeleteSurvey}
               onStartSurvey={setActiveSurveyId}
            />
          )}

          {currentView === ViewState.EVALUATIONS && (
            <EvaluationsPage 
               currentUser={currentUser}
               employees={employees}
               onUpdateEmployee={handleUpdateEmployee}
               onAddNotification={handleAddNotification}
               onShowToast={showToast}
            />
          )}

          {currentView === ViewState.SYSTEM_STATUS && (
            <SystemStatusPage currentUser={currentUser} />
          )}

          {currentView === ViewState.SETTINGS && (
            <SettingsPage 
               employees={employees}
               currentUser={currentUser}
               onUpdateEmployee={handleUpdateEmployee}
               onShowToast={showToast}
            />
          )}

        </main>
      </div>
      
      <Toast 
        message={toastMessage} 
        isVisible={isToastVisible} 
        onClose={() => setIsToastVisible(false)} 
      />
    </div>
  );
};

export default App;
