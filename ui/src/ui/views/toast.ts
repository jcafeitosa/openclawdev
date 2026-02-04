import { html, nothing } from "lit";

export type ToastType = "success" | "error" | "info";

export type ToastEntry = {
  id: number;
  type: ToastType;
  message: string;
  dismissAt: number;
};

export function renderToastContainer(toasts: ToastEntry[], onDismiss: (id: number) => void) {
  if (toasts.length === 0) {
    return nothing;
  }

  return html`
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      ${toasts.map(
        (toast) => html`
          <div class="toast toast--${toast.type}" role="status">
            <span>${toast.message}</span>
            <button
              class="toast__dismiss"
              @click=${() => onDismiss(toast.id)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        `,
      )}
    </div>
  `;
}
