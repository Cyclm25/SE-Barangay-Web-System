import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  children?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  children
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeColors = {
    info: {
      bg: 'from-[#2957a1] to-[#1e4380]',
      button: 'bg-[#5CE36C] hover:bg-[#4bc95b]'
    },
    warning: {
      bg: 'from-yellow-500 to-yellow-600',
      button: 'bg-yellow-500 hover:bg-yellow-600'
    },
    danger: {
      bg: 'from-red-500 to-red-600',
      button: 'bg-red-500 hover:bg-red-600'
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`bg-gradient-to-r ${typeColors[type].bg} p-6 rounded-t-2xl relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-white text-[22px] font-bold pr-8">{title}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-[15px] leading-relaxed mb-4">{message}</p>
          {children}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl text-[15px] font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-3 rounded-xl text-[15px] font-bold text-white ${typeColors[type].button} transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
