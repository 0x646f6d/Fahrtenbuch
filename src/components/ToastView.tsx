import { useToast } from './toast';

export function ToastView() {
  const { toast, hide } = useToast();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      {toast.action && (
        <button
          className="toast-action"
          onClick={() => {
            toast.action!.run();
            hide();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
