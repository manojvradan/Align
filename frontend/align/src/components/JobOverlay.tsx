import React, { useEffect } from 'react';
import DOMPurify from 'dompurify';
import { FiX, FiPenTool, FiExternalLink } from 'react-icons/fi';
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

interface JobOverlayProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerateCoverLetter: (job: Job) => void;
  onViewOriginal: (job: Job) => void;
  isGeneratingCoverLetter?: boolean;
}

const JobOverlay: React.FC<JobOverlayProps> = ({ 
  job, 
  isOpen, 
  onClose, 
  onGenerateCoverLetter,
  onViewOriginal,
  isGeneratingCoverLetter = false
}) => {
  if (!job) return null;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Sanitize the HTML from the database to ensure it's safe to render
  // This removes any potential <script> tags but keeps formatting like <b>, <p>, <ul>
  const safeDescription = DOMPurify.sanitize(job.description || "No description available.");

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-start sm:items-stretch">
      
      {/* 1. The Backdrop (Fade in/out) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* 2. The Panel (The magic expand animation) */}
      <motion.div 
        layoutId={`job-card-${job.id}`} 
        className="relative w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-full"
        // Ensure standard border radius looks good during transition
        style={{ borderRadius: '0' }} 
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        
        {/* Header - Stays sticky at top */}
        <div className="flex-none px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white z-10">
          <div>
            <motion.h2 className="text-2xl font-bold text-gray-900">{job.title}</motion.h2>
            <p className="text-lg text-indigo-600 font-medium">{job.company}</p>
            <div className="flex items-center text-gray-500 text-sm mt-1">
              <span>{job.location}</span>
              <span className="mx-2">•</span>
              <span>{job.source}</span>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Icon as={FiX} className="w-6 h-6" />
          </button>
        </div>

        {/* Action Button */}
        <div className="flex-none px-8 py-6 border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => onGenerateCoverLetter(job)}
            disabled={isGeneratingCoverLetter}
            className={`w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg ${isGeneratingCoverLetter ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon as={FiPenTool} />
            {isGeneratingCoverLetter ? 'Generating...' : 'Write Cover Letter'}
          </button>
        </div>

        {/* Job Description (Scrollable Area) */}
        {/* We wrap content in motion to fade it in slightly delayed so it doesn't look squashed during expansion */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex-1 overflow-y-auto px-8 py-8"
        >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
            <div 
                className="prose prose-indigo max-w-none text-gray-600 space-y-4 pb-12"
                dangerouslySetInnerHTML={{ __html: safeDescription }}
            />

            <div className="mt-8 pt-8 border-t border-gray-100 mb-8">
                <button 
                onClick={() => onViewOriginal(job)} // Use handler
                className="inline-flex items-center text-indigo-600 font-semibold hover:underline"
                >
                View Original Posting <Icon as={FiExternalLink} className="ml-2"/>
                </button>
            </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default JobOverlay;