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
  matchReason?: string;
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

  const safeDescription = DOMPurify.sanitize(job.description || "No description available.");

  return (
    <div className="fixed inset-0 z-[200] flex justify-end items-start sm:items-stretch">
      
      {/* 1. The Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/30 dark:bg-black/50"
        onClick={onClose}
      />

      {/* 2. The Panel */}
      <motion.div 
        layoutId={`job-card-${job.id}`}
        className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a2e] shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-full"
        style={{ borderRadius: '0' }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.22 }}
      >
        
        {/* Header */}
        <div className="flex-none px-8 py-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-start bg-white dark:bg-[#1a1a2e] z-10">
          <div>
            <motion.h2 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</motion.h2>
            <p className="text-lg text-indigo-500 dark:text-indigo-400 font-medium">{job.company}</p>
            <div className="flex items-center text-gray-500 dark:text-white/40 text-sm mt-1">
              <span>{job.location}</span>
              <span className="mx-2">•</span>
              <span>{job.source}</span>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 transition-colors"
          >
            <Icon as={FiX} className="w-6 h-6" />
          </button>
        </div>

        {/* Action Button */}
        <div className="flex-none px-8 py-6 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          <button
            onClick={() => onGenerateCoverLetter(job)}
            disabled={isGeneratingCoverLetter}
            className={`w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${isGeneratingCoverLetter ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon as={FiPenTool} />
            {isGeneratingCoverLetter ? 'Generating...' : 'Write Cover Letter'}
          </button>
        </div>

        {/* Scrollable Body */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex-1 overflow-y-auto px-8 py-8"
        >
            {/* AI Match Reason */}
            {job.isRecommended && job.matchReason && (
                <div className="mb-6 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold tracking-wide uppercase">✦ Why AI picked this</span>
                    </div>
                    <ul className="space-y-1">
                        {job.matchReason.split(' · ').map((reason, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-indigo-800 dark:text-indigo-300">
                                <span className="mt-0.5 text-indigo-400 dark:text-indigo-500 flex-shrink-0">•</span>
                                <span>{reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Job Description</h3>
            <div 
                className="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-white/60 space-y-4 pb-12"
                dangerouslySetInnerHTML={{ __html: safeDescription }}
            />

            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/10 mb-8">
                <button 
                  onClick={() => onViewOriginal(job)}
                  className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
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
