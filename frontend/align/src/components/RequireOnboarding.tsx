import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireOnboarding = () => {
  const { user, isLoading } = useAuth();


  if (isLoading) {
    return <div className="p-4">Loading user profile...</div>; // Or a spinner
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