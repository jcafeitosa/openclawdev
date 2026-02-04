import { html, nothing } from "lit";

export type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
} | null;

export function renderConfirmDialog(dialog: ConfirmDialogProps) {
  if (!dialog) {
    return nothing;
  }

  return html`
    <div
      class="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label=${dialog.title}
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) {
          dialog.onCancel();
        }
      }}
    >
      <div class="confirm-card">
        <div class="confirm-title">${dialog.title}</div>
        <div class="confirm-message">${dialog.message}</div>
        <div class="confirm-actions">
          <button class="btn" @click=${dialog.onCancel}>Cancel</button>
          <button class="btn danger" @click=${dialog.onConfirm}>
            ${dialog.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  `;
}
