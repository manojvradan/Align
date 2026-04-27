import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiSearch } from 'react-icons/fi';
import Icon from '../components/Icon';
import JobCard from '../components/JobCard';
import JobOverlay from '../components/JobOverlay';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { getCached, isFresh, setCached, TTL } from '../api/cache';

const APPLIED_KEY = '/users/me/applied-jobs';
const SAVED_IDS_KEY = '/users/me/saved-jobs/ids';

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
    
    // State — initialised from cache so revisits skip the skeleton
    const [jobs, setJobs] = useState<Job[]>(() => getCached<Job[]>(APPLIED_KEY) ?? []);
    const [savedJobIds, setSavedJobIds] = useState<Set<number>>(
        () => new Set(getCached<number[]>(SAVED_IDS_KEY) ?? [])
    );
    const [isLoading, setIsLoading] = useState(() => getCached(APPLIED_KEY) === null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;

            if (isFresh(APPLIED_KEY, TTL.MEDIUM) && isFresh(SAVED_IDS_KEY, TTL.MEDIUM)) {
                setIsLoading(false);
                return;
            }

            if (getCached(APPLIED_KEY) === null) setIsLoading(true);

            try {
                const [appliedResponse, savedResponse] = await Promise.all([
                    apiClient.get(APPLIED_KEY),
                    apiClient.get(SAVED_IDS_KEY),
                ]);

                setCached(APPLIED_KEY, appliedResponse.data);
                setCached(SAVED_IDS_KEY, savedResponse.data ?? []);

                setJobs(appliedResponse.data);
                setSavedJobIds(new Set(savedResponse.data ?? []));
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
            <div>
                <div className="mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-56 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[0,1,2,3,4,5].map(i => (
                        <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 h-36 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Icon as={FiBriefcase} className="text-xl text-indigo-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Applied Jobs</h1>
                    <p className="text-slate-500 dark:text-white/40 text-sm">
                        You have sent{' '}
                        <span className="font-semibold text-indigo-500">{jobs.length}</span> applications so far.
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {jobs.map(job => (
                    <div
                        key={job.id}
                        onClick={() => handleJobClick(job)}
                        className="cursor-pointer h-full"
                    >
                        <JobCard
                            job={job}
                            layoutId={`job-card-${job.id}`}
                            isApplied={true}
                            isSaved={savedJobIds.has(job.id)}
                            onToggleSave={handleToggleSave}
                            onViewJob={handleViewJob}
                        />
                    </div>
                ))}

                {/* Empty State */}
                {jobs.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Icon as={FiBriefcase} className="text-2xl text-slate-400 dark:text-white/25" />
                        </div>
                        <h3 className="text-base font-bold text-slate-700 dark:text-white mb-1">No applications yet</h3>
                        <p className="text-slate-500 dark:text-white/40 text-sm mb-6 max-w-xs">
                            You haven't applied to any internships yet. Check out the job feed to find opportunities.
                        </p>
                        <button
                            onClick={() => navigate('/jobs')}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
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