import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type ToastEvent = CustomEvent<{ message: string }>;

export function ToastHost() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer: number | undefined;

    const handleToast = (event: Event) => {
      const nextMessage = (event as ToastEvent).detail?.message;

      if (!nextMessage) return;

      window.clearTimeout(timer);
      setMessage(nextMessage);
      timer = window.setTimeout(() => setMessage(''), 2600);
    };

    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('app-toast', handleToast);
      window.clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-xl">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      <span>{message}</span>
    </div>
  );
}
