import React, { useEffect, useState } from 'react';
import { FiArrowRight, FiBriefcase, FiBookmark, FiPlus, FiLoader } from 'react-icons/fi';
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
  url:string;
  source: string;
  isRecommended?: boolean;
}

const StatCard: React.FC<{ icon: React.ElementType; value: number; label: string; color: string; to: string; }> = ({ icon, value, label, color, to}) => (
  <Link to={to} className="block group">
    <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-5 transition-all duration-200 group-hover:shadow-md group-hover:border-slate-300 cursor-pointer">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon as={icon} className="text-2xl" />
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-800">{value}</div>
        <div className="text-slate-500 group-hover:text-slate-700">{label}</div>
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
      <div className="flex h-full items-center justify-center text-slate-400">
        <Icon as={FiLoader} className="animate-spin text-2xl mr-2" /> Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Welcome back, {firstName || 'User'}!</h1>
        <p className="text-slate-500">Let's make your job search easier today.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Stat Cards - Now Dynamic & Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StatCard 
              to="/applied"
              icon={FiBriefcase} 
              value={appliedCount} 
              label="Jobs Applied" 
              color="bg-blue-100 text-blue-600" 
            />
            <StatCard 
              to="/saved"
              icon={FiBookmark} 
              value={savedCount} 
              label="Jobs Saved" 
              color="bg-orange-100 text-orange-600" 
            />
          </div>

          {/* Recent Applications Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Recent Applications</h2>
              <button 
                onClick={() => navigate('/jobs')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold text-sm hover:bg-slate-700 transition-colors"
              >
                <Icon as={FiPlus} />
                Find New Jobs
              </button>
            </div>

            <div className="space-y-4">
              {recentApplications.length > 0 ? (
                recentApplications.map(job => (
                  <div key={job.id} className="h-full">
                    <JobCard 
                      job={job}
                      isApplied={true} 
                      onViewJob={() => window.open(job.url, '_blank')}
                      // We don't implement full save toggle here to keep dashboard simple,
                      // or you can fetch savedJobIds if you want that functionality here.
                    />
                  </div>
                ))
              ) : (
                <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center">
                   <p className="text-slate-500 mb-2">You haven't applied to any jobs yet.</p>
                   <Link to="/jobs" className="text-indigo-600 font-semibold hover:underline">Start browsing internships</Link>
                </div>
              )}
            </div>
            
            {recentApplications.length > 0 && (
              <div className="mt-4 text-center">
                 <Link to="/applied" className="text-sm font-semibold text-slate-500 hover:text-indigo-600">
                    View all applications &rarr;
                 </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar / CTAs */}
        <div className="space-y-6">
          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
            <h2 className="font-bold text-lg mb-1">Complete Your Profile</h2>
            <p className="text-slate-300 text-sm mb-4">A complete profile increases your recommendation accuracy.</p>
            <Link
              to="/profile"
              className="bg-white text-slate-800 w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center text-sm hover:bg-slate-100 transition-colors"
            >
              Edit Profile <Icon as={FiArrowRight} className="ml-2" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-xl">
            <div className="flex justify-between items-center mb-2">
                 <h2 className="font-bold text-lg text-slate-800">Resume Score</h2>
                 <span className="font-bold text-2xl text-slate-800">59%</span>
            </div>
            <p className="text-slate-500 text-sm mb-4">Improve your score to stand out.</p>
             <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4">
                <div className="bg-orange-500 h-2.5 rounded-full" style={{width: '59%'}}></div>
            </div>
            <Link to="/resume" className="w-full">
              <button className="bg-transparent border-2 border-slate-800 text-slate-800 w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center text-sm hover:bg-slate-800 hover:text-white transition-colors">
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