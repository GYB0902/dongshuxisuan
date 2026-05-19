import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { type ToastType } from '../../lib/actions';

type ToastEvent = CustomEvent<{ message: string; type?: ToastType }>;
type ToastState = {
  message: string;
  type: ToastType;
};

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    const handleToast = (event: Event) => {
      const nextMessage = (event as ToastEvent).detail?.message;
      const nextType = (event as ToastEvent).detail?.type ?? 'success';

      if (!nextMessage) return;

      window.clearTimeout(timer);
      setToast({ message: nextMessage, type: nextType });
      timer = window.setTimeout(() => setToast(null), 2600);
    };

    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('app-toast', handleToast);
      window.clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-xl ${
        isError ? 'border-rose-100' : 'border-emerald-100'
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${isError ? 'text-rose-600' : 'text-emerald-600'}`} />
      <span>{toast.message}</span>
    </div>
  );
}
