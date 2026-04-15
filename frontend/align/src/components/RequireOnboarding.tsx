import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireOnboarding = () => {
  const { user, isLoading } = useAuth();


  if (isLoading) {
    return null; // ProtectedRoute already shows the skeleton while isLoading is true
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // If we have a user, but they haven't set a preferred role yet
  if (!user.preferred_job_role || !user.university) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export default RequireOnboarding;