import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const palette =
              toast.variant === 'success'
                ? 'bg-[#173F2B] text-white border-[#238B57]'
                : toast.variant === 'error'
                  ? 'bg-rose-950 text-white border-rose-700'
                  : toast.variant === 'warning'
                    ? 'bg-amber-950 text-amber-50 border-amber-600'
                    : 'bg-slate-900 text-white border-slate-700';

            const Icon =
              toast.variant === 'success'
                ? CheckCircle2
                : toast.variant === 'error' || toast.variant === 'warning'
                  ? AlertTriangle
                  : Info;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-2xl ring-1 ring-white/20 flex items-start gap-3 ${palette}`}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-[#B9E769]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-snug">{toast.title}</p>
                  {toast.description && (
                    <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">{toast.description}</p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-0.5 rounded hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
