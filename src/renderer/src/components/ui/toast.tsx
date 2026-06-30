import { CheckCircle2, XCircle } from 'lucide-react';
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

type ToastType = 'error' | 'success';

interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly type: ToastType;
}

interface ToastContextValue {
  readonly showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** 全局轻提示容器，业务组件通过 useToast 调用。 */
export function ToastProvider({ children }: PropsWithChildren): JSX.Element {
  const [messages, setMessages] = useState<readonly ToastMessage[]>([]);
  const value = useMemo(() => ({
    showToast: (text: string, type: ToastType = 'success') => {
      const id = Date.now();
      setMessages((items) => [...items, { id, text, type }]);
      window.setTimeout(() => {
        setMessages((items) => items.filter((item) => item.id !== id));
      }, 2600);
    }
  }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-12 z-[80] grid gap-2">
        {messages.map((message) => <ToastItem key={message.id} message={message} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }
  return context;
}

function ToastItem({ message }: { readonly message: ToastMessage }): JSX.Element {
  const Icon = message.type === 'success' ? CheckCircle2 : XCircle;
  return (
    <div className="flex min-w-64 items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
      <Icon className={message.type === 'success' ? 'size-4 text-emerald-500' : 'size-4 text-destructive'} />
      <span>{message.text}</span>
    </div>
  );
}
