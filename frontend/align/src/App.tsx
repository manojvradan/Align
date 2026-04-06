import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import Pages
import Dashboard from './pages/Dashboard';
import ResumeParser from './pages/ResumeParser';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; 
import ConfirmRegistrationPage from './pages/ConfirmRegistrationPage';
import JobsPage from './pages/JobsPage';
import Onboarding from './pages/Onboarding';
import EditProfilePage from './pages/EditProfilePage';
import AppliedJobsPage from './pages/AppliedJobsPage';
import SavedJobsPage from './pages/SavedJobsPage';

// Import Components and Context
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import PublicRoute from './components/PublicRoute'; 
import RequireOnboarding from './components/RequireOnboarding';

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
        <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<RequireOnboarding />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/resume-parser" element={<ResumeParser />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/profile" element={<EditProfilePage />} /> 
              <Route path="/applied" element={<AppliedJobsPage />} />
              <Route path="/saved" element={<SavedJobsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;