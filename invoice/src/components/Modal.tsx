import React from "react";

/**
 * Modal: Simple modal with dark backdrop, close button, and slot for children.
 * Props: open (bool), onClose (fn), children (node)
 */
const Modal = ({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-0 relative min-w-[80vw] max-w-xl min-h-[50vh] flex flex-col">
        <button
          className="absolute top-3 right-3 bg-[#eee3d2] rounded-full px-3 py-1 border border-black text-black font-bold text-lg hover:bg-[#ffe6b9]"
          onClick={onClose}
        >
          ×
        </button>
        <div className="p-8 pt-3 flex-1 flex flex-col items-center">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
