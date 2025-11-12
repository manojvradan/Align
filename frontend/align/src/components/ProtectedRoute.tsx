import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // While we're checking for a token, show a loading screen
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-xl font-semibold">Loading...</div>
        </div>
    );
  }

  if (isAuthenticated) {
    return <Outlet />;
  }

  return <Navigate to ="/login" replace />
};

export default ProtectedRoute;