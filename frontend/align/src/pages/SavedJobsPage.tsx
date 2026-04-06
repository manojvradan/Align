import React, { useState, useEffect } from 'react';
import JobCard from '../components/JobCard';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { FiBookmark } from 'react-icons/fi';
import Icon from '../components/Icon';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url:string;
  source: string;
  isRecommended?: boolean;
}

const SavedJobsPage: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Saved Jobs
    useEffect(() => {
        const fetchSavedJobs = async () => {
            if (!user?.id) return;
            try {
                // Use the new endpoint we just created
                const response = await apiClient.get('/users/me/saved-jobs');
                setJobs(response.data);
            } catch (error) {
                console.error("Error fetching saved jobs:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSavedJobs();
    }, [user?.id]);

    const handleUnsave = async (jobId: number) => {
        // Optimistic UI Removal
        setJobs(prev => prev.filter(j => j.id !== jobId));
        try {
            await apiClient.post(`/users/me/saved-jobs/${jobId}`);
        } catch (error) {
            console.error("Failed to unsave", error);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading saved jobs...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="mb-8 flex items-center gap-3">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                    <Icon as={FiBookmark} className="text-2xl" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Saved Jobs</h1>
                    <p className="text-gray-600">You have {jobs.length} jobs saved for later.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map(job => (
                    <div key={job.id} className="h-full">
                        <JobCard 
                            job={job} 
                            isSaved={true} // Always true on this page
                            onToggleSave={handleUnsave}
                            onViewJob={() => window.open(job.url, '_blank')}
                        />
                    </div>
                ))}
                {jobs.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        No saved jobs yet. Go explore the feed!
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedJobsPage;