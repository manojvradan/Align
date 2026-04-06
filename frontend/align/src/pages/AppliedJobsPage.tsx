import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiSearch } from 'react-icons/fi';
import Icon from '../components/Icon';
import JobCard from '../components/JobCard';
import JobOverlay from '../components/JobOverlay';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url:string;
  source: string;
  isRecommended?: boolean;
}

const AppliedJobsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // State
    const [jobs, setJobs] = useState<Job[]>([]);
    const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            setIsLoading(true);

            try {
                // We fetch two things in parallel:
                // 1. The list of jobs I have applied to (Full Objects)
                // 2. The list of IDs I have saved (so the bookmark icon works)
                const [appliedResponse, savedResponse] = await Promise.all([
                    apiClient.get('/users/me/applied-jobs'),
                    apiClient.get('/users/me/saved-jobs/ids')
                ]);

                setJobs(appliedResponse.data);
                
                // Ensure we handle the response format correctly for saved IDs
                const ids = savedResponse.data || [];
                setSavedJobIds(new Set(ids));

            } catch (error) {
                console.error("Error fetching applied jobs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    // --- Handlers ---

    const handleJobClick = (job: Job) => {
        setSelectedJob(job);
    };

    const handleCloseOverlay = () => {
        setSelectedJob(null);
    };
    
    // On this page, we don't need to ask "Did you apply?" because they already did.
    // So we just open the link.
    const handleViewJob = (job: Job) => {
        window.open(job.url, '_blank');
    };

    // Allow users to bookmark/unbookmark jobs even from the applied view
    const handleToggleSave = async (jobId: number) => {
        // 1. Optimistic UI Update
        const newSet = new Set(savedJobIds);
        if (newSet.has(jobId)) {
            newSet.delete(jobId);
        } else {
            newSet.add(jobId);
        }
        setSavedJobIds(newSet);

        // 2. API Call
        try {
            await apiClient.post(`/users/me/saved-jobs/${jobId}`);
        } catch (error) {
            console.error("Save failed", error);
            setSavedJobIds(savedJobIds); // Revert on error
        }
    };

    // Placeholder handler for overlay button
    const handleCoverLetter = (job: Job) => console.log("Cover Letter", job.id);

    if (isLoading) {
        return (
            <div className="p-8 min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-pulse text-xl text-gray-500 font-medium">Loading your applications...</div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                    <Icon as={FiBriefcase} className="text-2xl" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Applied Jobs</h1>
                    <p className="text-gray-600">
                        You have sent <span className="font-bold text-blue-600">{jobs.length}</span> applications so far.
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map(job => (
                    <div 
                        key={job.id} 
                        onClick={() => handleJobClick(job)} 
                        className="cursor-pointer h-full"
                    >
                        <JobCard 
                            job={job} 
                            layoutId={`job-card-${job.id}`}
                            isApplied={true} // Always true on this page
                            isSaved={savedJobIds.has(job.id)}
                            onToggleSave={handleToggleSave}
                            onViewJob={handleViewJob}
                        />
                    </div>
                ))}

                {/* Empty State */}
                {jobs.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <Icon as={FiBriefcase} className="text-4xl text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No applications yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                            It looks like you haven't applied to any internships yet. Check out the job feed to find opportunities.
                        </p>
                        <button 
                            onClick={() => navigate('/jobs')}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            <Icon as={FiSearch} /> Browse Internships
                        </button>
                    </div>
                )}
            </div>

            {/* Overlay */}
            <AnimatePresence>
                {selectedJob && (
                    <JobOverlay 
                        job={selectedJob}
                        isOpen={!!selectedJob}
                        onClose={handleCloseOverlay}
                        onGenerateCoverLetter={handleCoverLetter}
                        onViewOriginal={handleViewJob}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AppliedJobsPage;