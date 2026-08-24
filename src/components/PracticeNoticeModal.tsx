import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';

const STORAGE_KEY = 'practice_project_notice_acknowledged';

export function PracticeNoticeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) {
      setShow(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={handleAcknowledge}
      />

      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50">
              <Info className="h-5 w-5 text-brand-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Practice Project Notice
            </h2>
          </div>
          <button
            onClick={handleAcknowledge}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm leading-relaxed text-slate-600">
            This project is a practical learning activity designed to help fellows apply and strengthen the Python concepts they have learned.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            It is <strong className="font-semibold text-slate-800">not an official Learn2Earn HQ assessment, examination, or curriculum requirement</strong>, and it does not form part of the official Learn2Earn HQ evaluation process.
          </p>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={handleAcknowledge}
            className="btn-primary w-full"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
