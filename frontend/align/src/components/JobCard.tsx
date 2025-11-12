import React from 'react';
import { FiExternalLink, FiMapPin, FiBriefcase } from 'react-icons/fi';
import Icon from './Icon';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
}

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const getSourceColor = (source: string) => {
    if (source === 'LinkedIn') return 'bg-blue-100 text-blue-800';
    if (source === 'Seek') return 'bg-purple-100 text-purple-800';
    if (source === 'Glassdoor') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-gray-800">{job.title}</h3>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSourceColor(job.source)}`}>
          {job.source}
        </span>
      </div>
      <div className="mt-2 space-y-2 text-gray-600">
        <div className="flex items-center">
          <Icon as={FiBriefcase} className="mr-2" />
          <span>{job.company}</span>
        </div>
        <div className="flex items-center">
          <Icon as={FiMapPin} className="mr-2" />
          <span>{job.location}</span>
        </div>
      </div>
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center text-purple-600 font-semibold hover:text-purple-800"
      >
        View Details
        <Icon as={FiExternalLink} className="ml-2" />
      </a>
    </div>
  );
};

export default JobCard;