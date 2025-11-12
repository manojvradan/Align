import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import Pages
import Dashboard from './pages/Dashboard';
import ResumeParser from './pages/ResumeParser';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; 
import ConfirmRegistrationPage from './pages/ConfirmRegistrationPage';
import JobsPage from './pages/JobsPage';

// Import Components and Context
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import PublicRoute from './components/PublicRoute'; 

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes are now wrapped in PublicRoute */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/confirm-registration" element={<ConfirmRegistrationPage />} />
        </Route>
        
        {/* Protected routes that require login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resume-parser" element={<ResumeParser />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;