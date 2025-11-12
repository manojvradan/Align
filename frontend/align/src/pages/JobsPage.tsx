import React, { useState, useEffect } from 'react';
import JobCard from '../components/JobCard'; // Adjust path if needed

// Define the Job type again for this component
interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
}

const JobsPage: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // This endpoint must point to your User API (port 8000)
    const JOBS_API_ENDPOINT = "http://127.0.0.1:8000/jobs/";

    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(JOBS_API_ENDPOINT);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch jobs. Please try again later.');
                }
                const data = await response.json();
                setJobs(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center">Loading jobs...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-8 bg-gray-50 h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Recommended Internships</h1>
            <p className="text-gray-500 mb-8">Here are the latest internships based on your profile.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map(job => (
                    <JobCard key={job.id} job={job} />
                ))}
            </div>
        </div>
    );
};

export default JobsPage;