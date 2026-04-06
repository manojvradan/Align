import React from 'react';
import { FiExternalLink, FiMapPin, FiStar, FiBookmark, FiCheckCircle } from 'react-icons/fi';
import Icon from './Icon';
import { motion } from 'framer-motion';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  isRecommended?: boolean;
  description?: string;
}

interface JobCardProps {
  job: Job;
  layoutId?: string;
  isSaved?: boolean; 
  isApplied?: boolean; 
  onToggleSave?: (id: number) => void;
  onViewJob?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, layoutId, isSaved, onToggleSave, isApplied, onViewJob  }) => {

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault(); // Stop default <a> tag behavior
    if (onViewJob) {
        onViewJob(job);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the overlay
    if (onToggleSave) {
        onToggleSave(job.id);
    }
  };

  const getSourceClasses = (source: string) => {
    const sourceMap: { [key: string]: string } = {
      LinkedIn: 'bg-blue-100 text-blue-800',
      Seek: 'bg-purple-100 text-purple-800',
      Glassdoor: 'bg-green-100 text-green-800',
    };
    return sourceMap[source] || 'bg-slate-100 text-slate-800';
  };

// Dynamic classes for the recommendations
  const cardContainerClasses = job.isRecommended
    ? 'bg-white border border-indigo-500 shadow-lg shadow-indigo-100 ring-1 ring-indigo-500 relative' // Glow effect
    : 'bg-white border border-slate-200 hover:border-slate-800 hover:shadow-lg'; // Standard

  return (
    <motion.div 
      layoutId={layoutId} 
      className={`rounded-xl p-5 transition-shadow duration-300 h-full flex flex-col justify-between ${cardContainerClasses}`}
    >
      {/* Recommended Badge */}
      {job.isRecommended && (
        <div className="absolute -top-3 -right-3 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-10">
            <Icon as={FiStar} className="w-3 h-3" />
            AI PICK
        </div>
      )}

      <motion.div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 line-clamp-2 pr-8">{job.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{job.company}</p>
            </div>
            
            {/* --- SAVE BUTTON --- */}
            <button 
                onClick={handleSaveClick}
                className={`p-2 rounded-full transition-all ${
                    isSaved 
                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' 
                    : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
                }`}
            >
                {/* Fill the icon if saved */}
                <Icon 
                    as={FiBookmark} 
                    className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} 
                />
            </button>
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-600">
              <Icon as={FiMapPin} className="mr-2" />
              <span className="truncate max-w-[150px]">{job.location}</span>
            </div>
             <span className={`shrink-0 ml-2 px-3 py-1 text-xs font-semibold rounded-full ${getSourceClasses(job.source)}`}>
              {job.source}
            </span>
            <div className="flex items-center gap-3">
                {/* APPLIED BADGE */}
                {isApplied && (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                        <Icon as={FiCheckCircle} /> Applied
                    </span>
                )}
                
                {/* UPDATE THE LINK TO USE BUTTON BEHAVIOR */}
                <button
                    onClick={handleLinkClick}
                    className="inline-flex items-center text-slate-800 font-semibold text-sm hover:underline"
                >
                    View Details
                    <Icon as={FiExternalLink} className="ml-1.5" />
                </button>
            </div>
          </div>
      </motion.div>
    </motion.div>
  );
};

export default JobCard;