import React from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, height = 'max-h-[85vh]' }) => {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="modal-wrapper" className="fixed inset-0 z-[5000] pointer-events-none flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className={`relative w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col pointer-events-auto ${height}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-black text-gray-900 text-xl tracking-tight">{title}</h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-800 rounded-full bg-gray-50 transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Content area */}
            <div 
              className="overflow-y-auto px-6 py-6 flex-1 overscroll-contain no-scrollbar"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 96px)' }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
