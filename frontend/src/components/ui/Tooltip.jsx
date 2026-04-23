import { useState } from 'react';

export default function Tooltip({ children, text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                        bg-surface-700 text-slate-200 text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
          {text}
        </div>
      )}
    </div>
  );
}
