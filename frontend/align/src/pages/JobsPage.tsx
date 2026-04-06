import React, { useState, useEffect, useMemo } from 'react';
import JobCard from '../components/JobCard'; // Adjust path if needed
import axios from 'axios';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import JobOverlay from '../components/JobOverlay';
import { AnimatePresence } from 'framer-motion'; 
import ApplicationCheckModal from '../components/ApplicationCheckModal';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
// Define the Job type again for this component
interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url:string;
  source: string;
  isRecommended?: boolean;
}

const JobsPage: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);

    const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set());

    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('title-asc');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());
    const [verifyingJob, setVerifyingJob] = useState<Job | null>(null);
    const [coverLetterText, setCoverLetterText] = useState<string>('');
    const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
    const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const RECOMMENDATION_SERVICE_URL = 'http://localhost:8002'; 

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

    const handleCloseOverlay = () => setSelectedJob(null);

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
        setIsRefetching(true);
        // Incrementing this number triggers the useEffect below
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
            setIsLoading(true);

            try {
                const timeoutMs = 8000;

                // Fetch General Jobs and Personal Recommendations in parallel
                const [generalResponse, recResponse, savedResponse, appliedResponse] = await Promise.allSettled([
                    apiClient.get('/jobs/', { timeout: timeoutMs }), 
                    axios.get(`${RECOMMENDATION_SERVICE_URL}/recommendations/${user.id}`, { timeout: timeoutMs }),
                    apiClient.get('/users/me/saved-jobs/ids'),
                    apiClient.get('/users/me/applied-jobs/ids')
                ]);
                console.log("General Jobs Response:", generalResponse);
                let generalJobs: Job[] = [];
                let recommendedJobs: Job[] = [];

                if (appliedResponse.status === 'fulfilled') {
                    setAppliedJobIds(new Set(appliedResponse.value.data));
                }

                // 1. Process General Jobs
                if (generalResponse.status === 'fulfilled') {
                    generalJobs = generalResponse.value.data;
                } else {
                    console.error("Failed to load general jobs");
                }

                // 2. Process Recommendations
                if (recResponse.status === 'fulfilled') {
                    // Mark these as recommended
                    recommendedJobs = recResponse.value.data.recommendations.map((job: Job) => ({
                        ...job,
                        isRecommended: true
                    }));
                } else {
                    console.warn("Recommendation service unavailable");
                }

                if (savedResponse.status === 'fulfilled') {
                    setSavedJobIds(new Set(savedResponse.value.data));
                }

                // 3. Merge Logic:
                // We want Recommended jobs first, then the REST of the general jobs.
                // We must ensure we don't show the same job twice.

                // Create a Set of IDs that are already in the recommended list
                const recommendedIds = new Set(recommendedJobs.map(j => j.id));

                // Filter general jobs to exclude ones that are already recommended
                const remainingGeneralJobs = generalJobs.filter(job => !recommendedIds.has(job.id));

                // Combine: Recommended at top + Remaining at bottom
                const mergedJobs = [...recommendedJobs, ...remainingGeneralJobs];

                setJobs(mergedJobs);

            } catch (error) {
                console.error("Critical error fetching jobs", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndMergeJobs();
    }, [user?.id, refreshTrigger]);

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

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <div className="text-xl text-gray-500 animate-pulse">Curating your feed...</div>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Internships & Opportunities</h1>
                        <p className="text-gray-600">
                            We found <span className="font-bold text-violet-600">{jobs.filter(j => j.isRecommended).length}</span> matches tailored to your profile.
                        </p>
                    </div>

                    {/* --- 4. NEW REFRESH BUTTON --- */}
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefetching}
                        className={`mt-4 md:mt-0 flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${isRefetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
                        <span>{isRefetching ? 'Updating...' : 'Refresh Feed'}</span>
                    </button>
                </div>
                {/* Filters */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <input
                        type="text"
                        placeholder="Search by title or company"
                        className="p-3 border border-gray-200 rounded-lg w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex space-x-4 w-full md:w-auto">
                        <select
                            className="p-3 border border-gray-200 rounded-lg w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                            <option value="">All Locations</option>
                            {locations.map(location => (
                                <option key={location} value={location}>{location}</option>
                            ))}
                        </select>
                        <select
                            className="p-3 border border-gray-200 rounded-lg w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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

                {/* Job Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedJobs.map(job => (
                    <div key={job.id} onClick={() => handleJobClick(job)} className="cursor-pointer h-full">
                        {/* We wrap JobCard in a div to capture the click */}
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
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No internships found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
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
                        className="absolute inset-0 bg-black/40" 
                        onClick={() => { setCoverLetterJob(null); setCoverLetterText(''); }}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Cover Letter</h2>
                                <p className="text-sm text-gray-500">{coverLetterJob.title} at {coverLetterJob.company}</p>
                            </div>
                            <button 
                                onClick={() => { setCoverLetterJob(null); setCoverLetterText(''); }}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {isGeneratingCoverLetter ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                                    <p className="text-gray-500 animate-pulse">Crafting your cover letter...</p>
                                </div>
                            ) : (
                                <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">
                                    {coverLetterText}
                                </pre>
                            )}
                        </div>
                        {coverLetterText && !isGeneratingCoverLetter && (
                            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(coverLetterText); }}
                                    className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                                >
                                    Copy to Clipboard
                                </button>
                                <button
                                    onClick={() => handleCoverLetter(coverLetterJob)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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