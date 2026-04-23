import { motion } from 'framer-motion';
import { Shield, User } from 'lucide-react';
import InlineVerificationCard from './InlineVerificationCard';
import LoadingSpinner from './ui/LoadingSpinner';

export default function ChatMessage({ message }) {
  const { question, answer, verification, isVerifying } = message;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-3">

      {/* User question */}
      <div className="flex justify-end">
        <div className="flex items-end gap-2.5 max-w-[80%]">
          <div className="bg-brand-600 text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm leading-relaxed shadow-lg">
            {question}
          </div>
          <div className="w-7 h-7 bg-brand-700 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* AI answer + verification */}
      <div className="flex justify-start">
        <div className="flex items-start gap-2.5 max-w-[90%]">
          <div className="w-7 h-7 bg-surface-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-surface-800 border border-surface-700 text-slate-100 text-sm px-4 py-3 rounded-2xl rounded-tl-sm leading-relaxed shadow-sm">
              {answer || <span className="text-slate-500 italic">Verifying response...</span>}
            </div>
            {isVerifying && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-slate-400">Verifying against trusted sources...</span>
              </div>
            )}
            {!isVerifying && verification && <InlineVerificationCard verification={verification} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
