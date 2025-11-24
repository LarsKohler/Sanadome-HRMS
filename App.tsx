
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
import Login from './components/Login';
import { Toast } from './components/Toast';
import { ViewState, Employee, Notification, NewsPost, Survey, SurveyResponse } from './types';
import { MOCK_EMPLOYEES, MOCK_NEWS } from './utils/mockData';

// Storage Keys
const STORAGE_KEYS = {
    EMPLOYEES: 'hrms_employees',
    NEWS: 'hrms_news',
    NOTIFICATIONS: 'hrms_notifications',
    SURVEYS: 'hrms_surveys'
};

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [setupUser, setSetupUser] = useState<Employee | null>(null);

  // View State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- DATA LOADING WITH PERSISTENCE ---

  // Employees
  const [employees, setEmployees] = useState<Employee[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      return saved ? JSON.parse(saved) : MOCK_EMPLOYEES;
  });

  // News
  const [newsItems, setNewsItems] = useState<NewsPost[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.NEWS);
      return saved ? JSON.parse(saved) : MOCK_NEWS;
  });

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
  });

  // Surveys
  const [surveys, setSurveys] = useState<Survey[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.SURVEYS);
      if (saved) return JSON.parse(saved);
      return [
        {
            id: 's1',
            title: 'Medewerkerstevredenheid 2023',
            description: 'Wij horen graag hoe jij je voelt binnen het team. Deze survey helpt ons om Sanadome nog beter te maken.',
            targetAudience: 'All',
            questions: [
                { id: 'q1', text: 'Ik voel mij gewaardeerd door mijn manager', type: 'Rating', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80' },
                { id: 'q2', text: 'Ik heb voldoende doorgroeimogelijkheden', type: 'Choice', options: ['Mee eens', 'Neutraal', 'Mee oneens'] },
                { id: 'q3', text: 'Wat kunnen we verbeteren op de werkvloer?', type: 'Text' }
            ],
            createdBy: 'HR',
            createdAt: '20 Okt 2023',
            status: 'Active',
            responseCount: 12,
            completedBy: []
        }
      ];
  });

  // --- PERSISTENCE EFFECTS ---

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(newsItems));
  }, [newsItems]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
  }, [surveys]);


  // Active Survey State
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);

  // Deep Link State
  const [dossierEmployeeId, setDossierEmployeeId] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Initial Mock Notification for Survey
  useEffect(() => {
      if (currentUser && surveys.length > 0) {
          // Check if user needs to do survey s1
          const surveyS1 = surveys.find(s => s.id === 's1');
          const alreadyCompleted = surveyS1?.completedBy.includes(currentUser.id);
          
          if (!alreadyCompleted && surveyS1?.status === 'Active') {
             const hasNotif = notifications.some(n => n.type === 'Survey' && n.metaId === 's1');
             if (!hasNotif) {
                  const notif: Notification = {
                      id: 'notif-survey-1',
                      recipientId: currentUser.id,
                      senderName: 'HR',
                      type: 'Survey',
                      title: 'Openstaande Survey',
                      message: 'Vul de Medewerkerstevredenheid 2023 in.',
                      date: '20 Okt',
                      read: false,
                      isPinned: true,
                      targetView: ViewState.SURVEYS,
                      metaId: 's1'
                  };
                  setNotifications(prev => [notif, ...prev]);
             }
          }
      }
  }, [currentUser, surveys]);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const handleLogin = (email: string, password: string): boolean => {
    const foundUser = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password);
    if (foundUser) {
      setCurrentUser(foundUser);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(ViewState.HOME);
    setDossierEmployeeId(null);
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp)
    );
    if (currentUser && currentUser.id === updatedEmployee.id) {
      setCurrentUser(updatedEmployee);
    }
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== id));
    if (currentUser && currentUser.id === id) {
      handleLogout();
    }
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees([newEmployee, ...employees]);
    handleShowToast('Nieuwe medewerker succesvol aangemaakt.');
  };

  const handleStartSetup = (employee: Employee) => {
      setSetupUser(employee);
      setCurrentView(ViewState.WELCOME);
  };

  const handleCompleteSetup = (updatedEmployee: Employee) => {
      const fullyActiveEmployee = { ...updatedEmployee, accountStatus: 'Active' as const };
      handleUpdateEmployee(fullyActiveEmployee);
      setSetupUser(null);
      setCurrentUser(fullyActiveEmployee);
      setCurrentView(ViewState.HOME);
  };

  // --- SURVEYS ---
  const handleAddSurvey = (newSurvey: Survey) => {
      setSurveys([newSurvey, ...surveys]);
      handleShowToast('Survey gepubliceerd');
      
      // Push notifications to all users (Mock)
      employees.forEach(emp => {
          const notif: Notification = {
              id: Math.random().toString(36).substr(2, 9),
              recipientId: emp.id,
              senderName: 'HR',
              type: 'Survey',
              title: 'Nieuwe Survey',
              message: `Nieuwe survey beschikbaar: ${newSurvey.title}`,
              date: 'Zojuist',
              read: false,
              isPinned: true,
              targetView: ViewState.SURVEYS,
              metaId: newSurvey.id
          };
          handleAddNotification(notif);
      });
  };

  const handleDeleteSurvey = (id: string) => {
      setSurveys(prev => prev.filter(s => s.id !== id));
  };

  const handleStartSurvey = (id: string) => {
      setActiveSurveyId(id);
  };

  const handleCompleteSurvey = (response: SurveyResponse) => {
      if (!currentUser) return;

      // 1. Close flow
      setActiveSurveyId(null);
      
      // 2. Update count and track who completed it
      setSurveys(prevSurveys => {
          return prevSurveys.map(s => {
              if (s.id === response.surveyId) {
                  if (s.completedBy.includes(currentUser.id)) return s;
                  
                  return { 
                      ...s, 
                      responseCount: s.responseCount + 1, 
                      completedBy: [...s.completedBy, currentUser.id] 
                  };
              }
              return s;
          });
      });
      
      handleShowToast(`Bedankt voor je feedback!`);

      // 3. Remove Pinned Notification
      setNotifications(prev => prev.filter(n => {
          if (n.type === 'Survey' && n.metaId === response.surveyId && n.recipientId === currentUser.id) {
              return false;
          }
          return true;
      }));
  };

  // --- TOAST & NOTIFICATIONS ---
  const handleShowToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
  };

  const handleCloseToast = () => {
    setIsToastVisible(false);
  };

  const handleAddNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isPinned) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }
    setCurrentView(notification.targetView);
    if (notification.targetView === ViewState.DOCUMENTS && notification.targetEmployeeId) {
       setDossierEmployeeId(notification.targetEmployeeId);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => n.isPinned ? n : ({ ...n, read: true })));
  };

  const handleMarkSingleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleAddNews = (post: NewsPost) => {
    setNewsItems([post, ...newsItems]);
    handleShowToast('Nieuwsbericht geplaatst.');
    employees.forEach(emp => {
      if (emp.id !== currentUser?.id) {
        const notification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          recipientId: emp.id,
          senderName: post.authorName,
          type: 'News',
          title: 'Nieuw nieuwsbericht',
          message: `${post.authorName} heeft gepost: "${post.title}"`,
          date: 'Zojuist',
          read: false,
          targetView: ViewState.NEWS
        };
        handleAddNotification(notification);
      }
    });
  };

  const handleLikeNews = (postId: string, userId: string) => {
    setNewsItems(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.likedBy.includes(userId);
        let newLikes = post.likes;
        let newLikedBy = [...post.likedBy];
        if (isLiked) {
          newLikes--;
          newLikedBy = newLikedBy.filter(id => id !== userId);
        } else {
          newLikes++;
          newLikedBy.push(userId);
        }
        return { ...post, likes: newLikes, likedBy: newLikedBy };
      }
      return post;
    }));
  };

  const userNotifications = notifications.filter(n => n.recipientId === currentUser?.id);

  if (currentView === ViewState.WELCOME && setupUser) {
      return <WelcomeFlow employee={setupUser} onComplete={handleCompleteSetup} />;
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    // Default Slate-50 background, no dynamic theme
    <div className="fixed inset-0 font-sans flex flex-col overflow-hidden bg-slate-50 transition-colors duration-500">
      
      {/* SURVEY OVERLAY */}
      {activeSurveyId && (
          <SurveyTakingFlow 
             survey={surveys.find(s => s.id === activeSurveyId)!}
             employeeId={currentUser.id}
             onComplete={handleCompleteSurvey}
             onClose={() => setActiveSurveyId(null)}
          />
      )}

      <TopNav 
        user={currentUser} 
        onLogout={handleLogout}
        notifications={userNotifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
        onMarkSingleRead={handleMarkSingleRead}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigate={setCurrentView}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          userRole={currentUser.role}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden h-[calc(100vh-64px)] scroll-smooth">
          {currentView === ViewState.HOME && (
            <EmployeeProfile 
              employee={currentUser}
              managers={employees.filter(e => e.role === 'Manager')}
              onChangeView={setCurrentView}
              onNext={() => {}} 
              onPrevious={() => {}} 
              onUpdateEmployee={handleUpdateEmployee}
              onAddNotification={handleAddNotification}
              onShowToast={handleShowToast}
            />
          )}

          {currentView === ViewState.DIRECTORY && (
            <EmployeeDirectory 
              employees={employees} 
              currentUser={currentUser}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onSimulateOnboarding={handleStartSetup}
            />
          )}

          {currentView === ViewState.DOCUMENTS && (
            <DocumentsPage 
              employees={employees}
              currentUser={currentUser}
              onUpdateEmployee={handleUpdateEmployee}
              onAddNotification={handleAddNotification}
              onShowToast={handleShowToast}
              selectedEmployeeId={dossierEmployeeId}
              onSelectEmployee={setDossierEmployeeId}
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

          {currentView === ViewState.ONBOARDING && (
            <OnboardingPage
              employees={employees}
              currentUser={currentUser}
              onUpdateEmployee={handleUpdateEmployee}
              onAddNotification={handleAddNotification}
              onShowToast={handleShowToast}
            />
          )}

          {currentView === ViewState.SURVEYS && (
            <SurveysPage
               currentUser={currentUser}
               surveys={surveys}
               onAddSurvey={handleAddSurvey}
               onDeleteSurvey={handleDeleteSurvey}
               onStartSurvey={handleStartSurvey}
            />
          )}

          {currentView === ViewState.EVALUATIONS && (
             <EvaluationsPage
                currentUser={currentUser}
                employees={employees}
                onUpdateEmployee={handleUpdateEmployee}
                onAddNotification={handleAddNotification}
                onShowToast={handleShowToast}
             />
          )}

          {currentView === ViewState.REPORTS && currentUser.role === 'Manager' && <ReportsDashboard />}
        </main>
      </div>

      <Toast 
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={handleCloseToast}
      />
    </div>
  );
};

export default App;
