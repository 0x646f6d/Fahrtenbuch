import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface ToastState {
  toast: Toast | null;
  show: (text: string, action?: Toast['action']) => void;
  hide: () => void;
}

let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (text, action) => {
    clearTimeout(timer);
    const id = ++seq;
    set({ toast: { id, text, action } });
    timer = setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), action ? 6000 : 3000);
  },
  hide: () => set({ toast: null }),
}));

export const showToast = (text: string, action?: Toast['action']) => useToast.getState().show(text, action);
