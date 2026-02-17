import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.ts";

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function extractVerb(ask: string | null | undefined, command: string): string {
  if (ask) {
    // e.g. "Run sed -n ..." or "Read file /foo/bar"
    const match = ask.match(/^(\w+)\s/);
    if (match) {
      return match[1];
    }
  }
  // Fallback: derive from command
  const cmd = command.trim().split(/\s+/)[0] ?? "Execute";
  return cmd.charAt(0).toUpperCase() + cmd.slice(1);
}

function buildDescription(ask: string | null | undefined, command: string): string {
  if (ask) {
    return ask;
  }
  return command;
}

export function renderExecApprovalPrompt(state: AppViewState) {
  const active = state.execApprovalQueue[0];
  if (!active) {
    return nothing;
  }
  const request = active.request;
  const remainingMs = active.expiresAtMs - Date.now();
  const isExpired = remainingMs <= 0;
  const queueCount = state.execApprovalQueue.length;

  const verb = extractVerb(request.ask, request.command);
  const description = buildDescription(request.ask, request.command);
  // Remove the leading verb from description for inline display
  const descriptionBody = description.replace(new RegExp(`^${verb}\\s+`, "i"), "");

  return html`
    <div class="exec-approval-overlay" role="dialog" aria-modal="true" aria-label="Permission request">
      <div class="exec-approval-card">
        ${
          queueCount > 1
            ? html`<div class="exec-approval-queue-badge">${queueCount} pending</div>`
            : nothing
        }
        <p class="exec-approval-desc">
          Allow Claude to <strong>${verb}</strong> ${descriptionBody}
        </p>
        <div class="exec-approval-command mono">${request.command}</div>
        ${
          state.execApprovalError
            ? html`<div class="exec-approval-error">${state.execApprovalError}</div>`
            : nothing
        }
        ${
          isExpired
            ? html`
                <div class="exec-approval-expired">Request expired</div>
              `
            : nothing
        }
        <div class="exec-approval-actions">
          <button
            class="exec-approval-btn exec-approval-btn--deny"
            ?disabled=${state.execApprovalBusy || isExpired}
            @click=${() => state.handleExecApprovalDecision("deny")}
          >
            Deny <kbd class="exec-approval-kbd">Esc</kbd>
          </button>
          <button
            class="exec-approval-btn exec-approval-btn--allow"
            ?disabled=${state.execApprovalBusy || isExpired}
            @click=${() => state.handleExecApprovalDecision("allow-once")}
          >
            Allow once <kbd class="exec-approval-kbd">⌘</kbd><kbd class="exec-approval-kbd">↵</kbd>
          </button>
        </div>
      </div>
    </div>
  `;
}
