import React, { useEffect, useState } from 'react';
import { FiArrowRight, FiBriefcase, FiBookmark, FiPlus } from 'react-icons/fi';
import Icon from '../components/Icon';
import JobCard from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  isRecommended?: boolean;
}

const StatCard: React.FC<{
  icon: React.ElementType;
  value: number;
  label: string;
  gradient: string;
  to: string;
}> = ({ icon, value, label, gradient, to }) => (
  <Link to={to} className="block group">
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4 transition-all duration-200 group-hover:shadow-lg group-hover:border-slate-300 dark:group-hover:border-white/20">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shrink-0`}>
        <Icon as={icon} className="text-white text-xl" />
      </div>
      <div>
        <div className="text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">{value}</div>
        <div className="text-sm text-slate-500 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/60">
          {label}
        </div>
      </div>
    </div>
  </Link>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(' ')[0];

  // State for dynamic data
  const [recentApplications, setRecentApplications] = useState<Job[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        // Run all requests in parallel for speed
        const [appliedRes, savedIdsRes] = await Promise.all([
          apiClient.get('/users/me/applied-jobs'),    // Get full list to show recent ones
          apiClient.get('/users/me/saved-jobs/ids')   // Get IDs just for the count
        ]);

        // 1. Update Applied Data
        const appliedJobs = appliedRes.data;
        setAppliedCount(appliedJobs.length);
        
        // Take the last 2 items and reverse them to show newest first
        const recent = appliedJobs.slice(-2).reverse(); 
        setRecentApplications(recent);

        // 2. Update Saved Data
        setSavedCount(savedIdsRes.data.length);

      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div>
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stat cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-7 w-12 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent applications skeleton */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 w-40 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
                    <div className="flex justify-between mb-4">
                      <div className="space-y-2">
                        <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="space-y-4">
            <div className="bg-slate-200 dark:bg-white/10 rounded-2xl h-40 animate-pulse" />
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-44 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            {firstName || 'User'}
          </span>{' '}
          👋
        </h1>
        <p className="text-slate-500 dark:text-white/40 mt-1 text-sm">
          Here's what's happening with your job search today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              to="/applied"
              icon={FiBriefcase}
              value={appliedCount}
              label="Jobs Applied"
              gradient="from-indigo-500 to-violet-600"
            />
            <StatCard
              to="/saved"
              icon={FiBookmark}
              value={savedCount}
              label="Jobs Saved"
              gradient="from-orange-400 to-pink-500"
            />
          </div>

          {/* Recent Applications */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Recent Applications</h2>
              <button
                onClick={() => navigate('/jobs')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg font-semibold text-xs hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
              >
                <Icon as={FiPlus} className="text-sm" />
                Find New Jobs
              </button>
            </div>

            <div className="space-y-3">
              {recentApplications.length > 0 ? (
                recentApplications.map((job) => (
                  <div key={job.id}>
                    <JobCard
                      job={job}
                      isApplied={true}
                      onViewJob={() => window.open(job.url, '_blank')}
                    />
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/15 rounded-2xl p-8 text-center">
                  <p className="text-slate-500 dark:text-white/40 mb-2 text-sm">
                    You haven't applied to any jobs yet.
                  </p>
                  <Link to="/jobs" className="text-indigo-500 font-semibold hover:underline text-sm">
                    Start browsing internships
                  </Link>
                </div>
              )}
            </div>

            {recentApplications.length > 0 && (
              <div className="mt-4 text-center">
                <Link
                  to="/applied"
                  className="text-sm font-semibold text-slate-400 dark:text-white/30 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  View all applications →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Profile card */}
          <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 rounded-2xl shadow-xl shadow-indigo-500/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h2 className="font-bold text-base mb-1 relative z-10">Complete Your Profile</h2>
            <p className="text-white/70 text-sm mb-5 relative z-10">
              A complete profile increases your recommendation accuracy.
            </p>
            <Link
              to="/profile"
              className="relative z-10 bg-white text-indigo-600 w-full px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center text-sm hover:bg-white/90 transition-colors"
            >
              Edit Profile <Icon as={FiArrowRight} className="ml-2" />
            </Link>
          </div>

          {/* Resume score card */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl transition-colors duration-300">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-base text-slate-800 dark:text-white">Resume Score</h2>
              <span className="font-extrabold text-2xl text-slate-800 dark:text-white">59%</span>
            </div>
            <p className="text-slate-500 dark:text-white/40 text-sm mb-4">Improve your score to stand out.</p>
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 mb-5">
              <div
                className="bg-gradient-to-r from-orange-400 to-pink-500 h-2 rounded-full"
                style={{ width: '59%' }}
              />
            </div>
            <Link to="/resume" className="w-full">
              <button className="border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/70 w-full px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center text-sm hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all">
                Improve Resume <Icon as={FiArrowRight} className="ml-2" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;