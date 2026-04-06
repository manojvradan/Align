import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiExternalLink } from 'react-icons/fi';
import Icon from './Icon';

interface ApplicationCheckModalProps {
  isOpen: boolean;
  jobTitle: string;
  companyName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ApplicationCheckModal: React.FC<ApplicationCheckModalProps> = ({
  isOpen,
  jobTitle,
  companyName,
  onConfirm,
  onCancel
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center border border-gray-100"
          >
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon as={FiExternalLink} className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Did you apply?</h3>
            <p className="text-gray-500 mb-6">
              We opened <strong>{jobTitle}</strong> at <strong>{companyName}</strong> in a new tab. 
              If you submit your application, let us know so we can track it!
            </p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                No, just looking
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Icon as={FiCheck} /> Yes, I Applied
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ApplicationCheckModal;