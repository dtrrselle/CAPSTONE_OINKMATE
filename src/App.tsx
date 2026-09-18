import React, { useState, useEffect } from 'react';
import AdminLayout from './layouts/AdminLayout';
import DashboardAdmin from './pages/DashboardAdmin';
import FarmersAdmin from './pages/FarmersAdmin';
import EducationalAdmin from './pages/EducationalAdmin';
import SettingsAdmin from './pages/SettingsAdmin';
import FeedbackAdmin from './pages/FeedbackAdmin';
import LoginAdmin from './pages/LoginAdmin';
import RegisterAdmin from './pages/RegisterAdmin';
import ForgotPasswordAdmin from './pages/ForgotPasswordAdmin';
import MarketTrendsAdmin from './pages/MarketTrendsAdmin';
import './App.css';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  farmers: 'Farmer Management',
  education: 'Educational Content',
  market: 'Market Trends',
  feedback: 'Feedback Management',
  settings: 'Settings',
};

type AuthScreen = 'login' | 'register' | 'forgot';

interface AdminInfo {
  id: number;
  full_name: string;
  username: string;
}

const App: React.FC = () => {
  const [admin, setAdmin]           = useState<AdminInfo | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [activePage, setActivePage] = useState('dashboard');
  const [showToast, setShowToast]   = useState(false);

  const handleLogin = (adminInfo: AdminInfo) => {
    setAdmin(adminInfo);
    setActivePage('dashboard');
    setShowToast(true);
  };

  const handleLogout = () => {
    setAdmin(null);
    setAuthScreen('login');
    setActivePage('dashboard');
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!admin) {
    if (authScreen === 'register')
      return <RegisterAdmin onGoLogin={() => setAuthScreen('login')} />;

    if (authScreen === 'forgot')
      return <ForgotPasswordAdmin onGoLogin={() => setAuthScreen('login')} />;

    return (
      <LoginAdmin
        onLogin={handleLogin}
        onGoRegister={() => setAuthScreen('register')}
        onGoForgot={() => setAuthScreen('forgot')}
      />
    );
  }

  return (
    <>
      {showToast && (
        <div className="toast-success">
          <div className="toast-icon">✓</div>
          <div className="toast-text">
            <div className="toast-title">Welcome back, {admin.full_name}!</div>
            <div className="toast-sub">You are now logged in.</div>
          </div>
        </div>
      )}

      <AdminLayout
        pageTitle={pageTitles[activePage] ?? 'Dashboard'}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      >
        {activePage === 'dashboard' && <DashboardAdmin onNavigate={setActivePage} />}
        {activePage === 'farmers'   && <FarmersAdmin />}
        {activePage === 'education' && <EducationalAdmin />}
        {activePage === 'market'    && <MarketTrendsAdmin />}
        {activePage === 'settings'  && <SettingsAdmin />}
        {activePage === 'feedback'  && <FeedbackAdmin />}
      </AdminLayout>
    </>
  );
};

export default App;