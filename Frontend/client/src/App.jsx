import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [resetUsername, setResetUsername] = useState('');

  const handleForgotClick = (username) => {
    setResetUsername(username);
    setCurrentView('forgot');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {currentView === 'login' && (
        <Login 
          onLoginSuccess={() => setCurrentView('dashboard')} 
          onForgot={handleForgotClick} 
        />
      )}
      
      {currentView === 'forgot' && (
        <ForgotPassword 
          username={resetUsername}
          onBack={() => setCurrentView('login')} 
        />
      )}

      {currentView === 'dashboard' && (
        <Dashboard 
          onLogout={() => setCurrentView('login')} 
        />
      )}
    </div>
  );
}

export default App;