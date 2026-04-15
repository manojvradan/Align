import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen bg-slate-100 dark:bg-[#080810]">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-64 bg-white dark:bg-[#0d0d1a] border-r border-slate-200 dark:border-white/10 flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header skeleton */}
          <div className="h-[61px] bg-white/80 dark:bg-[#0d0d1a]/80 border-b border-slate-200 dark:border-white/10" />
          {/* Content skeleton */}
          <div className="flex-1 p-8">
            <div className="h-8 w-64 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Outlet />;
  }

  return <Navigate to ="/login" replace />
};

export default ProtectedRoute;