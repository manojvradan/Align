import React, { useState, useEffect, useMemo } from 'react';
import JobCard from '../components/JobCard'; // Adjust path if needed
import axios from 'axios';
import apiClient from '../api/axiosConfig';
import { getCached, isFresh, setCached, invalidate, TTL } from '../api/cache';

const JOBS_KEY = '/jobs/';
const SAVED_IDS_KEY = '/users/me/saved-jobs/ids';
const APPLIED_IDS_KEY = '/users/me/applied-jobs/ids';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import JobOverlay from '../components/JobOverlay';
import { AnimatePresence } from 'framer-motion'; 
import ApplicationCheckModal from '../components/ApplicationCheckModal';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
// Define the Job type again for this component
interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url:string;
  source: string;
  isRecommended?: boolean;
  matchReason?: string;
}

const JobsPage: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [jobs, setJobs] = useState<Job[]>(() => getCached<Job[]>(JOBS_KEY) ?? []);

    const [savedJobIds, setSavedJobIds] = useState<Set<number>>(
        () => new Set(getCached<number[]>(SAVED_IDS_KEY) ?? [])
    );

    const [isLoading, setIsLoading] = useState(() => getCached(JOBS_KEY) === null);
    const [isRefetching, setIsRefetching] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, _setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('title-asc');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(
        () => new Set(getCached<number[]>(APPLIED_IDS_KEY) ?? [])
    );
    const [verifyingJob, setVerifyingJob] = useState<Job | null>(null);
    const [coverLetterText, setCoverLetterText] = useState<string>('');
    const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
    const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [recsComputing, setRecsComputing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const JOBS_PER_PAGE = 12;

    const RECOMMENDATION_SERVICE_URL = import.meta.env.VITE_RECOMMENDATION_URL || 'http://localhost:8002';

    const locations = [
        "Sydney",
        "Melbourne",
        "Brisbane",
        "Perth",
        "Adelaide",
        "Gold Coast",
        "Canberra",
        "Newcastle",
        "Wollongong",
        "Logan City",
        "Geelong",
        "Hobart",
        "Townsville",
        "Cairns",
        "Toowoomba",
        "Darwin",
        "Sunshine Coast"
    ];

    const handleToggleSave = async (jobId: number) => {
        // 1. Optimistic UI Update (Change icon immediately)
        const isCurrentlySaved = savedJobIds.has(jobId);
        const newSet = new Set(savedJobIds);
        
        if (isCurrentlySaved) {
            newSet.delete(jobId);
        } else {
            newSet.add(jobId);
        }
        setSavedJobIds(newSet);

        // 2. Call API
        try {
            await apiClient.post(`/users/me/saved-jobs/${jobId}`);
        } catch (error) {
            console.error("Failed to toggle save:", error);
            // Revert on error
            setSavedJobIds(savedJobIds); 
        }
    };

    const handleJobClick = (job: Job) => {
        setSelectedJob(job);
        setIsOverlayOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleCloseOverlay = () => { setSelectedJob(null); };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _handleCloseOverlay;

    const handleCoverLetter = async (job: Job) => {
        setIsGeneratingCoverLetter(true);
        setCoverLetterText('');
        setCoverLetterJob(job);

        try {
            const response = await apiClient.post(`/users/me/cover-letter/${job.id}`);
            setCoverLetterText(response.data.cover_letter);
        } catch (error) {
            console.error("Failed to generate cover letter:", error);
            setCoverLetterText('Failed to generate cover letter. Please try again.');
        } finally {
            setIsGeneratingCoverLetter(false);
        }
    };

    const handleManualRefresh = () => {
        // Bust the cache so the effect re-fetches fresh data
        invalidate(JOBS_KEY, SAVED_IDS_KEY, APPLIED_IDS_KEY);
        setIsRefetching(true);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleViewJob = (job: Job) => {
        // 1. Open the URL in new tab
        window.open(job.url, '_blank');
        
        // 2. Open the "Did you apply?" modal immediately after
        setVerifyingJob(job);
    };

    const handleConfirmApplication = async () => {
        if (!verifyingJob) return;

        try {
            // 1. Update Backend
            await apiClient.post(`/users/me/applied-jobs/${verifyingJob.id}`);
            
            // 2. Update Frontend State
            const newSet = new Set(appliedJobIds);
            newSet.add(verifyingJob.id);
            setAppliedJobIds(newSet);
            
        } catch (error) {
            console.error("Failed to mark applied:", error);
        } finally {
            setVerifyingJob(null); // Close modal
        }
    };

    useEffect(() => {
        const fetchAndMergeJobs = async () => {
            if (!user?.id) return;

            // All caches fresh — nothing to fetch
            if (
                isFresh(JOBS_KEY, TTL.LONG) &&
                isFresh(SAVED_IDS_KEY, TTL.MEDIUM) &&
                isFresh(APPLIED_IDS_KEY, TTL.MEDIUM)
            ) {
                setIsLoading(false);
                setIsRefetching(false);
                return;
            }

            // Only show the full skeleton when there is no cached data
            if (getCached(JOBS_KEY) === null) setIsLoading(true);

            try {
                const generalPromise = apiClient.get('/jobs/', { timeout: 20000 });
                const savedPromise = apiClient.get('/users/me/saved-jobs/ids');
                const appliedPromise = apiClient.get('/users/me/applied-jobs/ids');

                // Resolve general jobs + saved/applied first so the grid appears immediately
                const [generalResponse, savedResponse, appliedResponse] = await Promise.allSettled([
                    generalPromise,
                    savedPromise,
                    appliedPromise,
                ]);

                if (appliedResponse.status === 'fulfilled') {
                    setAppliedJobIds(new Set(appliedResponse.value.data));
                    setCached(APPLIED_IDS_KEY, appliedResponse.value.data);
                }
                if (savedResponse.status === 'fulfilled') {
                    setSavedJobIds(new Set(savedResponse.value.data));
                    setCached(SAVED_IDS_KEY, savedResponse.value.data);
                }

                if (generalResponse.status === 'fulfilled') {
                    setCached(JOBS_KEY, generalResponse.value.data);
                    setJobs(generalResponse.value.data);
                } else {
                    console.error('Failed to load general jobs');
                }

                setIsLoading(false);
                setIsRefetching(false);

            } catch (error) {
                console.error('Critical error fetching jobs', error);
                setIsLoading(false);
                setIsRefetching(false);
            }
        };

        fetchAndMergeJobs();
    }, [user?.id, refreshTrigger]);

    // Fetch recommendations independently — mirrors Dashboard so the rec request
    // is never gated by the job/saved/applied cache and always gets its full timeout.
    useEffect(() => {
        if (!user?.id) return;

        let mounted = true;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const stopPolling = () => {
            if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        };

        const mergeRecs = (recData: { recommendations: (Job & { match_reason?: string })[] }) => {
            if (!mounted) return;
            const recommendedJobs: Job[] = (recData.recommendations || []).map((job) => ({
                ...job,
                isRecommended: true,
                matchReason: job.match_reason,
            }));
            const recommendedIds = new Set(recommendedJobs.map(j => j.id));
            setJobs(prev => [...recommendedJobs, ...prev.filter(job => !recommendedIds.has(job.id))]);
            setIsLoadingRecommendations(false);
            setRecsComputing(false);
        };

        const startPolling = () => {
            stopPolling();
            pollInterval = setInterval(async () => {
                if (!mounted) { stopPolling(); return; }
                try {
                    const res = await axios.get(
                        `${RECOMMENDATION_SERVICE_URL}/recommendations/${user.id}`,
                        { timeout: 15000 }
                    );
                    if (!mounted) { stopPolling(); return; }
                    if (!res.data.computing) {
                        stopPolling();
                        mergeRecs(res.data);
                    }
                    // else: still computing — keep polling
                } catch { /* transient error — keep polling */ }
            }, 3000);
        };

        const fetchRecommendations = async () => {
            if (!mounted) return;
            setIsLoadingRecommendations(true);
            setRecsComputing(false);
            try {
                const res = await axios.get(
                    `${RECOMMENDATION_SERVICE_URL}/recommendations/${user.id}`,
                    { timeout: 15000 }
                );
                if (!mounted) return;
                if (res.data.computing) {
                    setRecsComputing(true);
                    startPolling();
                } else {
                    mergeRecs(res.data);
                }
            } catch (err) {
                if (!mounted) return;
                console.warn('Recommendation service unavailable', err);
                setIsLoadingRecommendations(false);
                setRecsComputing(false);
            }
        };

        fetchRecommendations();
        return () => {
            mounted = false;
            stopPolling();
        };
    }, [user?.id, RECOMMENDATION_SERVICE_URL]);

    // Open overlay when navigated from Dashboard with a specific job ID
    useEffect(() => {
        const openJobId = (location.state as { openJobId?: number } | null)?.openJobId;
        if (!openJobId || jobs.length === 0) return;
        const job = jobs.find((j) => j.id === openJobId);
        if (job) {
            setSelectedJob(job);
            // Clear the state so navigating back and forward doesn't re-open it
            window.history.replaceState({}, '');
        }
    }, [jobs, location.state]);

    // Reset to page 1 whenever filters/sort change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedLocation, sortOrder]);

    const filteredAndSortedJobs = useMemo(() => {
        // 1. Filter
        let filtered = jobs.filter(job =>
            (job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (selectedLocation === '' || job.location.toLowerCase().includes(selectedLocation.toLowerCase()))
        );

         // 2. Sort
        const [sortBy, order] = sortOrder.split('-');

        filtered.sort((a, b) => {
            // PRIMARY SORT: Always put Recommended jobs at the top
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;

            // SECONDARY SORT: User selected criteria (Title/Company)
            // This runs if both are recommended, or both are NOT recommended
            const aValue = a[sortBy as keyof Job] as string;
            const bValue = b[sortBy as keyof Job] as string;

            if (aValue < bValue) {
                return order === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return order === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [jobs, searchTerm, sortOrder, selectedLocation]);

    const totalPages = Math.max(1, Math.ceil(filteredAndSortedJobs.length / JOBS_PER_PAGE));
    const pagedJobs = filteredAndSortedJobs.slice(
        (currentPage - 1) * JOBS_PER_PAGE,
        currentPage * JOBS_PER_PAGE
    );

    if (isLoading) {
        return (
            <div>
                <div className="mb-8">
                    <div className="h-8 w-72 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse mb-2" />
                    <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex gap-3 mb-6">
                    <div className="h-11 flex-1 max-w-xs bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                    <div className="h-11 w-36 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                    <div className="h-11 w-36 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[0,1,2,3,4,5].map(i => (
                        <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 h-36 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-500 dark:text-red-400">{error}</div>;
    }

    return (
        <div className="pb-20">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Internships & Opportunities</h1>
                    <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
                        We found <span className="font-semibold text-indigo-500">{jobs.filter(j => j.isRecommended).length}</span> matches tailored to your profile.
                    </p>
                </div>
                <button
                    onClick={handleManualRefresh}
                    disabled={isRefetching}
                    className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors ${isRefetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <ArrowPathIcon className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    {isRefetching ? 'Updating...' : 'Refresh Feed'}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Search by title or company"
                    className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-3">
                    <select
                        className="px-4 py-2.5 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                    >
                        <option value="">All Locations</option>
                        {locations.map(location => (
                                <option key={location} value={location}>{location}</option>
                            ))}
                        </select>
                    <select
                        className="px-4 py-2.5 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="title-asc">Title (A-Z)</option>
                        <option value="title-desc">Title (Z-A)</option>
                        <option value="company-asc">Company (A-Z)</option>
                        <option value="company-desc">Company (Z-A)</option>
                    </select>
                </div>
            </div>

            {/* Recommendations loading banner */}
            {isLoadingRecommendations && (
                <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent shrink-0" />
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                        {recsComputing
                            ? 'AI is personalizing your recommendations — this takes a moment on first load…'
                            : 'Loading your matched internships…'}
                    </p>
                </div>
            )}

            {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pagedJobs.map(job => (
                    <div key={job.id} onClick={() => handleJobClick(job)} className="cursor-pointer h-full">
                        <JobCard
                            job={job}
                            layoutId={`job-card-${job.id}`}
                            isSaved={savedJobIds.has(job.id)}
                            isApplied={appliedJobIds.has(job.id)}
                            onViewJob={handleViewJob}
                            onToggleSave={handleToggleSave}
                        />
                    </div>
                ))}

                {filteredAndSortedJobs.length === 0 && (
                    <div className="col-span-full text-center py-16 text-slate-400 dark:text-white/25">
                        No internships found matching your criteria.
                    </div>
                )}
            </div>

            {/* Pagination controls — fixed to bottom of viewport, right of sidebar */}
            {totalPages > 1 && (
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-30 bg-white/80 dark:bg-[#080810]/80 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-3 py-3 px-6">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous page"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            const isActive = page === currentPage;
                            const isNearActive = Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                            if (!isNearActive) {
                                // Show ellipsis only at the boundaries
                                if (page === 2 && currentPage > 3) return <span key={page} className="text-slate-400 dark:text-white/25 px-1 text-sm">…</span>;
                                if (page === totalPages - 1 && currentPage < totalPages - 2) return <span key={page} className="text-slate-400 dark:text-white/25 px-1 text-sm">…</span>;
                                return null;
                            }
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                                            : 'text-slate-500 dark:text-white/40 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next page"
                    >
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
            <AnimatePresence>
                {selectedJob && (
                    <JobOverlay 
                        job={selectedJob}
                        isOpen={!!selectedJob}
                        onClose={() => setSelectedJob(null)}
                        onGenerateCoverLetter={handleCoverLetter}
                        onViewOriginal={handleViewJob}
                        isGeneratingCoverLetter={isGeneratingCoverLetter}
                    />
                )}
            </AnimatePresence>

            <ApplicationCheckModal 
                isOpen={!!verifyingJob}
                jobTitle={verifyingJob?.title || ''}
                companyName={verifyingJob?.company || ''}
                onConfirm={handleConfirmApplication}
                onCancel={() => setVerifyingJob(null)}
            />

            {/* Cover Letter Modal */}
            {coverLetterJob && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => { setCoverLetterJob(null); setCoverLetterText(''); }}
                    />
                    <div className="relative bg-white dark:bg-[#13131f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
                            <div>
                                <h2 className="text-base font-bold text-slate-800 dark:text-white">Cover Letter</h2>
                                <p className="text-sm text-slate-500 dark:text-white/40">{coverLetterJob.title} at {coverLetterJob.company}</p>
                            </div>
                            <button
                                onClick={() => { setCoverLetterJob(null); setCoverLetterText(''); }}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {isGeneratingCoverLetter ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4" />
                                    <p className="text-slate-400 dark:text-white/30 animate-pulse text-sm">Crafting your cover letter...</p>
                                </div>
                            ) : (
                                <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-white/70 leading-relaxed text-sm">
                                    {coverLetterText}
                                </pre>
                            )}
                        </div>
                        {coverLetterText && !isGeneratingCoverLetter && (
                            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/10">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(coverLetterText); }}
                                    className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Copy to Clipboard
                                </button>
                                <button
                                    onClick={() => handleCoverLetter(coverLetterJob)}
                                    className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl font-semibold text-slate-700 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                >
                                    Regenerate
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobsPage;