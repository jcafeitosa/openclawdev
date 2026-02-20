import { html, nothing } from "lit";
import type { AuthProviderEntry, OAuthFlowState } from "../controllers/auth.ts";
import type {
  FreeModelEntry,
  FreeModelsSummary,
  ModelCostTier,
  ProfileHealthEntry,
  ProviderHealthEntry,
  ProviderModelEntry,
  ProviderSubscription,
  UsageWindowEntry,
} from "../controllers/providers-health.ts";
import { icons } from "../icons.ts";
import { renderEmptyState } from "../render-utils.ts";

export type ProvidersProps = {
  loading: boolean;
  error: string | null;
  entries: ProviderHealthEntry[];
  updatedAt: number | null;
  showAll: boolean;
  expandedId: string | null;
  instanceCount: number;
  sessionCount: number | null;
  agentRunning: boolean;
  modelAllowlist: Set<string>;
  primaryModel: string | null;
  modelFallbacks: string[];
  modelsSaving: boolean;
  modelsCostFilter: "all" | "high" | "medium" | "low" | "free";
  authConfigProvider: string | null;
  authConfigSaving: boolean;
  authProvidersList: AuthProviderEntry[] | null;
  oauthFlow: OAuthFlowState | null;
  removingProvider: string | null;
  checkingProvider: string | null;
  healthCheckResult: { providerId: string; healthy: boolean; status: string } | null;
  rankedProviders: string[];
  onRefresh: () => void;
  onToggleShowAll: () => void;
  onToggleExpand: (id: string) => void;
  onToggleModel: (key: string) => void;
  onSetPrimary: (key: string) => void;
  onSaveModels: () => void;
  onCostFilterChange: (filter: "all" | "high" | "medium" | "low" | "free") => void;
  onConfigureProvider: (id: string | null) => void;
  onSaveCredential: (
    provider: string,
    credential: string,
    credentialType: "api_key" | "token",
  ) => void;
  onStartOAuth: (provider: string) => void;
  onCancelOAuth: () => void;
  onSubmitOAuthCode: (code: string) => void;
  onRemoveCredential: (provider: string) => void;
  selectedProfiles: Set<string>;
  removingProfiles: boolean;
  onToggleProfileSelection: (profileId: string) => void;
  onRemoveSelectedProfiles: () => void;
  onSelectAllModels: (modelKeys: string[], select: boolean) => void;
  freeModels: FreeModelEntry[];
  freeModelsSummary: FreeModelsSummary | null;
  providerSubscriptions: Record<string, ProviderSubscription>;
  probingFreeModels: boolean;
  activeBillingProviders: Set<string>;
  onProbeFreeModels: () => void;
  onToggleBilling: (providerId: string) => void;
  onCheckHealth: (providerId: string) => void;
  onLoadRanked: () => void;
};

export function renderProviders(props: ProvidersProps) {
  const detectedCount = props.entries.filter((e) => e.detected).length;
  const totalCount = props.entries.length;

  return html`
    <section class="grid grid-cols-3" style="margin-bottom: 18px;">
      <div class="card stat-card">
        <div class="stat-label">Instances</div>
        <div class="stat-value">${props.instanceCount}</div>
        <div class="muted">Active presence beacons.</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Sessions</div>
        <div class="stat-value">${props.sessionCount ?? "n/a"}</div>
        <div class="muted">Tracked session keys.</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Agent</div>
        <div class="stat-value ${props.agentRunning ? "ok" : ""}">${props.agentRunning ? "Running" : "Idle"}</div>
        <div class="muted">${props.agentRunning ? "An agent run is in progress." : "No active agent run."}</div>
      </div>
    </section>

    ${renderSystemModelConfig(props)}
    ${renderFreeModelsSection(props)}

    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">Provider Health</div>
          <div class="card-sub">
            ${detectedCount} detected${props.showAll ? ` / ${totalCount} total` : ""}
            ${props.updatedAt ? html` &mdash; updated ${formatTimeAgo(props.updatedAt)}` : nothing}
          </div>
        </div>
        <div class="row" style="gap: 8px;">
          <label class="row" style="gap: 4px; cursor: pointer; font-size: 13px;">
            <input
              type="checkbox"
              ?checked=${props.showAll}
              @change=${props.onToggleShowAll}
            />
            Show all
          </label>
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      ${
        props.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
          : nothing
      }

      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
        ${(() => {
          const visible = props.showAll ? props.entries : props.entries.filter((e) => e.detected);
          if (visible.length === 0) {
            return renderEmptyState({
              icon: icons.plug,
              title: "No providers detected",
              subtitle: "Configure API keys to enable providers.",
            });
          }
          return visible.map((entry) =>
            renderProviderCard(entry, props.expandedId === entry.id, props, () =>
              props.onToggleExpand(entry.id),
            ),
          );
        })()}
      </div>
    </section>
  `;
}

function resolveAuthInfo(entry: ProviderHealthEntry, _props: ProvidersProps) {
  const authModes = entry.authModes ?? [];
  const hasApiKey = authModes.includes("api-key");
  const hasToken = authModes.includes("token");
  const hasOAuth = authModes.includes("oauth");
  const hasAwsSdk = authModes.includes("aws-sdk");
  // A provider is configurable if it supports any of our active auth methods
  const canConfigure = hasApiKey || hasToken || (hasOAuth && entry.oauthAvailable) || hasAwsSdk;
  return { authModes, hasApiKey, hasToken, hasOAuth, hasAwsSdk, canConfigure };
}

function renderSubscriptionBadge(entry: ProviderHealthEntry) {
  if (!entry.subscriptionTier || entry.subscriptionTier === "unknown") {
    return nothing;
  }
  if (entry.subscriptionTier === "paid") {
    const tooltip =
      entry.subscriptionConfidence === "high"
        ? "Paid billing detected (high confidence)"
        : "Paid billing detected (low confidence)";
    return html`<span
      class="chip"
      style="font-size: 10px; background: color-mix(in srgb, var(--ok) 12%, transparent); color: var(--ok); border-color: color-mix(in srgb, var(--ok) 25%, transparent);"
      title=${tooltip}
    >
      Paid
    </span>`;
  }
  // free tier
  const tooltip =
    entry.subscriptionConfidence === "high"
      ? "Free tier detected (high confidence)"
      : "Free tier detected (low confidence)";
  return html`<span
    class="chip"
    style="font-size: 10px; background: color-mix(in srgb, var(--info) 12%, transparent); color: var(--info); border-color: color-mix(in srgb, var(--info) 25%, transparent);"
    title=${tooltip}
  >
    Free tier
  </span>`;
}

function renderProviderCard(
  entry: ProviderHealthEntry,
  expanded: boolean,
  props: ProvidersProps,
  onToggle: () => void,
) {
  const color = getHealthColor(entry.healthStatus);
  const label = getHealthLabel(entry.healthStatus);
  const dotStyle = `width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;`;
  const isConfiguring = props.authConfigProvider === entry.id;

  return html`
    <div
      class="list-item"
      style="border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; cursor: pointer;"
      @click=${onToggle}
    >
      <div style="display: flex; align-items: center; gap: 12px; grid-column: 1 / -1;">
        <div style="${dotStyle}"></div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-weight: 600;">${entry.name}</span>
            ${
              entry.authMode && entry.authMode !== "unknown"
                ? html`<span class="chip">${entry.authMode}</span>`
                : nothing
            }
            ${
              entry.isLocal
                ? html`
                    <span class="chip">local</span>
                  `
                : nothing
            }
            ${renderSubscriptionBadge(entry)}
          </div>
          ${renderQuickStatus(entry)}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span
            class="chip"
            style="background: color-mix(in srgb, ${color} 12%, transparent); color: ${color}; border-color: color-mix(in srgb, ${color} 25%, transparent);"
          >
            ${label}
          </span>
          <span style="font-size: 12px; opacity: 0.5;">${expanded ? "▾" : "▸"}</span>
        </div>
      </div>

      ${
        expanded
          ? html`
            <div
              style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); grid-column: 1 / -1;"
              @click=${(e: Event) => e.stopPropagation()}
            >
              ${renderCredentialInfo(entry, props)}
              ${renderConfigureSection(entry, props, isConfiguring)}
              ${renderBillingSection(entry, props)}
              ${renderModelsSection(entry, props)}
              ${renderUsageSection(entry)}
              ${renderHealthCheckSection(entry, props)}
            </div>
          `
          : nothing
      }
    </div>
  `;
}

function renderAuthModeChips(authModes: string[]) {
  if (authModes.length === 0) {
    return nothing;
  }
  return html`
    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
      ${authModes.map(
        (mode) => html`
          <span
            class="chip"
            style="font-size: 11px; background: color-mix(in srgb, var(--info) 10%, transparent); color: var(--info);"
          >
            ${mode}
          </span>
        `,
      )}
    </div>
  `;
}

function renderOAuthFlowStatus(entry: ProviderHealthEntry, props: ProvidersProps) {
  const flow = props.oauthFlow;
  if (!flow || flow.provider !== entry.id) {
    return nothing;
  }

  if (flow.status === "starting") {
    return html`
      <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px">
        <span class="spinner"></span>
        <span>Starting OAuth flow...</span>
      </div>
    `;
  }

  if (flow.status === "waiting" && flow.needsCode) {
    const isCallbackServer = flow.hasCallbackServer ?? false;
    const promptMsg =
      flow.codePromptMessage ??
      (isCallbackServer
        ? "Complete sign-in in the browser. The code will be captured automatically, or you can paste the redirect URL below."
        : "Complete sign-in in the browser, then paste the authorization code (or full redirect URL) shown on the callback page.");

    return html`
      <div style="margin-top: 8px; padding: 10px; border: 1px dashed var(--info); border-radius: 6px; background: color-mix(in srgb, var(--info) 5%, transparent);">
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">
          ${isCallbackServer ? "Waiting for callback..." : "Paste authorization code"}
        </div>
        ${
          isCallbackServer
            ? html`
                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 6px">
                  <span class="spinner" style="width: 12px; height: 12px"></span>
                  <span class="muted">Listening for automatic callback</span>
                </div>
              `
            : nothing
        }
        <div class="muted" style="font-size: 12px; margin-bottom: 8px;">
          ${promptMsg}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            type="text"
            class="input"
            placeholder="Paste code or redirect URL here..."
            style="flex: 1; font-size: 13px; font-family: monospace;"
            @click=${(e: Event) => e.stopPropagation()}
            @keydown=${(e: KeyboardEvent) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                const input = e.target as HTMLInputElement;
                const code = input.value.trim();
                if (code) {
                  props.onSubmitOAuthCode(code);
                }
              }
            }}
          />
          <button
            class="btn btn-sm btn-primary"
            @click=${(e: Event) => {
              e.stopPropagation();
              const wrapper = (e.target as HTMLElement).parentElement;
              const input = wrapper?.querySelector("input") as HTMLInputElement | null;
              const code = input?.value.trim();
              if (code) {
                props.onSubmitOAuthCode(code);
              }
            }}
          >
            Submit
          </button>
          <button
            class="btn btn-sm"
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onCancelOAuth();
            }}
          >
            Cancel
          </button>
        </div>
        ${
          flow.authUrl
            ? html`
              <div style="margin-top: 6px;">
                <a
                  href=${flow.authUrl}
                  target="_blank"
                  rel="noopener"
                  class="muted"
                  style="font-size: 11px;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  Re-open sign-in page
                </a>
              </div>
            `
            : nothing
        }
      </div>
    `;
  }

  // Code submitted — waiting for token exchange
  if (
    flow.status === "waiting" &&
    (flow as OAuthFlowState & { codeSubmitted?: boolean }).codeSubmitted
  ) {
    return html`
      <div
        style="
          margin-top: 8px;
          padding: 10px;
          border: 1px dashed var(--info);
          border-radius: 6px;
          background: color-mix(in srgb, var(--info) 5%, transparent);
        "
      >
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px">
          <span class="spinner"></span>
          <span style="font-weight: 600">Exchanging authorization code for tokens...</span>
        </div>
      </div>
    `;
  }

  if (flow.status === "waiting") {
    const progressMsg = flow.progressMessage;
    return html`
      <div style="margin-top: 8px; padding: 10px; border: 1px dashed var(--info); border-radius: 6px; background: color-mix(in srgb, var(--info) 5%, transparent);">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px;">
          <span class="spinner"></span>
          <span style="font-weight: 600;">Waiting for authentication...</span>
        </div>
        <div class="muted" style="font-size: 12px; margin-bottom: 8px;">
          ${progressMsg ?? "A browser window should have opened. Complete the sign-in flow there, then return here."}
        </div>
        ${
          flow.authUrl
            ? html`
              <div style="display: flex; gap: 8px; align-items: center;">
                <a
                  href=${flow.authUrl}
                  target="_blank"
                  rel="noopener"
                  class="btn btn-sm"
                  style="text-decoration: none;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  Open again
                </a>
                <button
                  class="btn btn-sm"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    props.onCancelOAuth();
                  }}
                >
                  Cancel
                </button>
              </div>
            `
            : html`
              <button
                class="btn btn-sm"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  props.onCancelOAuth();
                }}
              >
                Cancel
              </button>
            `
        }
      </div>
    `;
  }

  if (flow.status === "error") {
    return html`
      <div style="margin-top: 8px; padding: 10px; border: 1px solid var(--danger); border-radius: 6px; background: color-mix(in srgb, var(--danger) 5%, transparent);">
        <div style="font-size: 13px; color: var(--danger); margin-bottom: 6px;">
          OAuth failed: ${flow.error ?? "Unknown error"}
        </div>
        <div style="display: flex; gap: 8px;">
          <button
            class="btn btn-sm btn-primary"
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onCancelOAuth();
              props.onStartOAuth(entry.id);
            }}
          >
            Retry
          </button>
          <button
            class="btn btn-sm"
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onCancelOAuth();
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    `;
  }

  return nothing;
}

function renderConfigureSection(
  entry: ProviderHealthEntry,
  props: ProvidersProps,
  isConfiguring: boolean,
) {
  const { authModes, hasApiKey, hasToken, hasOAuth, hasAwsSdk, canConfigure } = resolveAuthInfo(
    entry,
    props,
  );

  if (authModes.length === 0) {
    return nothing;
  }

  // Check if there's an active OAuth flow for this provider
  const hasActiveOAuth = props.oauthFlow?.provider === entry.id;

  if (!isConfiguring && !hasActiveOAuth) {
    const buttons: unknown[] = [];

    if (canConfigure) {
      buttons.push(html`
        <button
          class="btn btn-sm"
          @click=${(e: Event) => {
            e.stopPropagation();
            props.onConfigureProvider(entry.id);
          }}
        >
          ${entry.detected ? "Reconfigure Key" : "Set API Key"}
        </button>
      `);
    }

    if (hasOAuth && entry.oauthAvailable) {
      buttons.push(html`
        <button
          class="btn btn-sm btn-primary"
          @click=${(e: Event) => {
            e.stopPropagation();
            props.onStartOAuth(entry.id);
          }}
        >
          ${entry.detected ? "Re-authenticate OAuth" : "Sign in with OAuth"}
        </button>
      `);
    }

    if (entry.detected) {
      const isRemoving = props.removingProvider === entry.id;
      buttons.push(html`
        <button
          class="btn btn-sm"
          style="color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, transparent);"
          ?disabled=${isRemoving}
          @click=${(e: Event) => {
            e.stopPropagation();
            if (confirm(`Remove credentials for ${entry.name}?`)) {
              props.onRemoveCredential(entry.id);
            }
          }}
        >
          ${isRemoving ? "Removing..." : "Remove"}
        </button>
      `);
    }

    const hints: unknown[] = [];

    if (hasOAuth && !entry.oauthAvailable) {
      hints.push(html`
        <div class="muted" style="font-size: 12px;">
          OAuth: <code style="font-size: 11px">openclaw models auth login --provider ${entry.id}</code>
        </div>
      `);
    }

    if (hasAwsSdk) {
      hints.push(html`
        <div class="muted" style="font-size: 12px">
          AWS SDK: set <code style="font-size: 11px">AWS_ACCESS_KEY_ID</code> and
          <code style="font-size: 11px">AWS_SECRET_ACCESS_KEY</code> env vars
        </div>
      `);
    }

    if (entry.envVars && entry.envVars.length > 0 && !hasAwsSdk) {
      hints.push(html`
        <div class="muted" style="font-size: 12px;">
          Env: ${entry.envVars.map((v) => html`<code style="font-size: 11px">${v}</code> `)}
        </div>
      `);
    }

    return html`
      <div style="margin: 8px 0 12px 0;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Authentication</div>
        ${renderAuthModeChips(authModes)}
        ${
          buttons.length > 0
            ? html`<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: ${hints.length > 0 ? "8" : "0"}px;">${buttons}</div>`
            : nothing
        }
        ${hints.length > 0 ? html`<div style="display: flex; flex-direction: column; gap: 4px;">${hints}</div>` : nothing}
      </div>
    `;
  }

  // Active OAuth flow
  if (hasActiveOAuth) {
    return html`
      <div style="margin: 8px 0 12px 0;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Authentication</div>
        ${renderAuthModeChips(authModes)}
        ${renderOAuthFlowStatus(entry, props)}
      </div>
    `;
  }

  // Configuring mode — show credential input form
  if (!canConfigure) {
    return nothing;
  }

  const credentialType = hasToken && !hasApiKey ? "token" : "api_key";
  const inputLabel = credentialType === "token" ? "Token" : "API Key";
  const inputId = `auth-input-${entry.id}`;

  return html`
    <div style="margin: 8px 0 12px 0;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Authentication</div>
      ${renderAuthModeChips(authModes)}
      <div style="padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: color-mix(in srgb, var(--bg-elevated) 50%, var(--bg));">
        <div style="font-size: 13px; margin-bottom: 8px; color: var(--text);">
          ${inputLabel} for ${entry.name}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            id=${inputId}
            type="password"
            placeholder=${`Enter ${inputLabel.toLowerCase()}...`}
            style="flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 13px; font-family: inherit;"
            autocomplete="off"
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                const input = document.getElementById(inputId) as HTMLInputElement | null;
                const value = input?.value?.trim();
                if (value) {
                  props.onSaveCredential(entry.id, value, credentialType);
                }
              }
            }}
          />
          <button
            class="btn btn-sm"
            ?disabled=${props.authConfigSaving}
            @click=${(e: Event) => {
              e.stopPropagation();
              const input = document.getElementById(inputId) as HTMLInputElement | null;
              const value = input?.value?.trim();
              if (value) {
                props.onSaveCredential(entry.id, value, credentialType);
              }
            }}
          >
            ${props.authConfigSaving ? "Saving..." : "Save"}
          </button>
          <button
            class="btn btn-sm"
            ?disabled=${props.authConfigSaving}
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onConfigureProvider(null);
            }}
          >
            Cancel
          </button>
        </div>
        ${
          hasOAuth && entry.oauthAvailable
            ? html`
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
                  <button
                    class="btn btn-sm"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      props.onConfigureProvider(null);
                      props.onStartOAuth(entry.id);
                    }}
                  >
                    Or sign in with OAuth instead
                  </button>
                </div>
              `
            : nothing
        }
      </div>
    </div>
  `;
}

function renderQuickStatus(entry: ProviderHealthEntry) {
  if (!entry.detected) {
    return html`
      <div class="muted" style="font-size: 12px">Not configured</div>
    `;
  }

  const parts: unknown[] = [];

  if (entry.inCooldown && entry.cooldownRemainingMs > 0) {
    parts.push(
      html`<span style="color: var(--danger); font-size: 12px;">
        Cooldown: ${formatCountdown(entry.cooldownRemainingMs)}
      </span>`,
    );
  }

  if (
    entry.tokenValidity === "expiring" &&
    entry.tokenRemainingMs !== null &&
    entry.tokenRemainingMs > 0
  ) {
    parts.push(
      html`<span style="color: var(--warn); font-size: 12px;">
        Token expires: ${formatCountdown(entry.tokenRemainingMs)}
      </span>`,
    );
  }

  if (entry.lastUsed) {
    const lastUsedTs = new Date(entry.lastUsed).getTime();
    if (Number.isFinite(lastUsedTs)) {
      parts.push(
        html`<span class="muted" style="font-size: 12px;">
          Last used: ${formatTimeAgo(lastUsedTs)}
        </span>`,
      );
    }
  }

  if (parts.length === 0) {
    return nothing;
  }

  return html`<div
    style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 2px;"
  >
    ${parts}
  </div>`;
}

function renderCredentialInfo(entry: ProviderHealthEntry, props: ProvidersProps) {
  if (!entry.detected) {
    return html`
      <div class="muted" style="font-size: 13px">
        Provider not detected. Configure credentials to enable.
      </div>
    `;
  }

  // When multiple profiles exist, show individual profile list
  if (entry.profiles && entry.profiles.length > 1) {
    return renderMultiProfileCredentials(entry, entry.profiles, props);
  }

  return html`
    <div style="margin-bottom: 12px;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Credentials</div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; font-size: 13px;">
        <span class="muted">Source</span>
        <span>${entry.authSource ?? "unknown"}</span>

        <span class="muted">Mode</span>
        <span>${entry.authMode}</span>

        <span class="muted">Token</span>
        <span>
          ${
            entry.tokenValidity === "valid"
              ? entry.tokenRemainingMs != null && entry.tokenRemainingMs > 0
                ? html`<span style="color: var(--success)">Valid</span>
                    <span class="muted">(expires in ${formatCountdown(entry.tokenRemainingMs)})</span>`
                : html`
                    <span style="color: var(--success)">Valid</span>
                  `
              : entry.tokenValidity === "expiring"
                ? html`<span style="color: var(--warn)">Expiring</span>
                  ${
                    entry.tokenRemainingMs !== null
                      ? html` <span style="color: var(--warn)">(${formatCountdown(entry.tokenRemainingMs)})</span>`
                      : nothing
                  }`
                : entry.tokenValidity === "expired"
                  ? html`
                      <span style="color: var(--danger)">Expired</span>
                    `
                  : "No expiration"
          }
        </span>

        <span class="muted">Errors</span>
        <span>${entry.errorCount}</span>

        ${
          entry.inCooldown && entry.cooldownRemainingMs > 0
            ? html`
              <span class="muted">Cooldown</span>
              <span style="color: var(--danger);">
                ${formatCountdown(entry.cooldownRemainingMs)}
              </span>
            `
            : nothing
        }
        ${
          entry.disabledReason
            ? html`
              <span class="muted">Disabled</span>
              <span style="color: var(--danger);">${entry.disabledReason}</span>
            `
            : nothing
        }
      </div>
    </div>
  `;
}

function renderProfileTokenBadge(profile: ProfileHealthEntry) {
  if (profile.tokenValidity === "valid") {
    return html`<span
      class="chip"
      style="font-size: 11px; background: color-mix(in srgb, var(--ok) 12%, transparent); color: var(--ok);"
    >
      ${
        profile.tokenRemainingMs != null && profile.tokenRemainingMs > 0
          ? `Valid (${formatCountdown(profile.tokenRemainingMs)})`
          : "Valid"
      }
    </span>`;
  }
  if (profile.tokenValidity === "expiring") {
    return html`<span
      class="chip"
      style="font-size: 11px; background: color-mix(in srgb, var(--warn) 12%, transparent); color: var(--warn);"
    >
      Expiring${profile.tokenRemainingMs != null ? ` (${formatCountdown(profile.tokenRemainingMs)})` : ""}
    </span>`;
  }
  if (profile.tokenValidity === "expired") {
    return html`
      <span
        class="chip"
        style="
          font-size: 11px;
          background: color-mix(in srgb, var(--danger) 12%, transparent);
          color: var(--danger);
        "
      >
        Expired
      </span>
    `;
  }
  return nothing;
}

function renderMultiProfileCredentials(
  entry: ProviderHealthEntry,
  profiles: ProfileHealthEntry[],
  props: ProvidersProps,
) {
  const selectedCount = profiles.filter((p) => props.selectedProfiles.has(p.profileId)).length;

  return html`
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div style="font-weight: 600; font-size: 13px;">
          Credentials (${profiles.length} accounts)
        </div>
        ${
          selectedCount > 0
            ? html`
            <button
              class="btn btn-sm"
              style="color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, transparent);"
              ?disabled=${props.removingProfiles}
              @click=${(e: Event) => {
                e.stopPropagation();
                props.onRemoveSelectedProfiles();
              }}
            >
              ${props.removingProfiles ? "Removing..." : `Remove Selected (${selectedCount})`}
            </button>
          `
            : nothing
        }
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        ${profiles.map((profile) => {
          const isSelected = props.selectedProfiles.has(profile.profileId);
          return html`
            <div
              style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: var(--bg-elevated); border: 1px solid ${isSelected ? "color-mix(in srgb, var(--danger) 40%, transparent)" : "transparent"};"
            >
              <label
                style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; cursor: pointer;"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  ?checked=${isSelected}
                  @change=${() => props.onToggleProfileSelection(profile.profileId)}
                />
                <span
                  style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px;"
                  title=${profile.profileId}
                >
                  ${profile.profileId}
                </span>
              </label>
              <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <span class="chip" style="font-size: 11px;">${profile.type}</span>
                ${renderProfileTokenBadge(profile)}
                ${
                  profile.isActive
                    ? html`
                        <span
                          class="chip"
                          style="
                            font-size: 10px;
                            background: color-mix(in srgb, var(--ok) 15%, transparent);
                            color: var(--ok);
                            border-color: color-mix(in srgb, var(--ok) 30%, transparent);
                          "
                        >
                          Active
                        </span>
                      `
                    : nothing
                }
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

function formatContextWindow(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  const k = n / 1000;
  return Number.isInteger(k) ? `${k}k` : `${k.toFixed(0)}k`;
}

type CostFilterOption = { value: "all" | "high" | "medium" | "low" | "free"; label: string };
const COST_FILTER_OPTIONS: CostFilterOption[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "free", label: "Free" },
];

function matchesCostFilter(
  tier: ModelCostTier,
  filter: "all" | "high" | "medium" | "low" | "free",
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "high") {
    return tier === "expensive";
  }
  if (filter === "medium") {
    return tier === "moderate";
  }
  if (filter === "free") {
    return tier === "free";
  }
  // low = cheap + free
  return tier === "cheap" || tier === "free";
}

function costTierLabel(tier: ModelCostTier): string {
  switch (tier) {
    case "expensive":
      return "High";
    case "moderate":
      return "Medium";
    case "cheap":
      return "Low";
    case "free":
      return "Free";
    default:
      return tier;
  }
}

function costTierColor(tier: ModelCostTier): string {
  switch (tier) {
    case "expensive":
      return "var(--danger)";
    case "moderate":
      return "var(--warn)";
    case "cheap":
      return "var(--ok)";
    case "free":
      return "var(--info)";
    default:
      return "var(--muted)";
  }
}

function renderBillingSection(entry: ProviderHealthEntry, props: ProvidersProps) {
  if (!entry.detected) {
    return nothing;
  }
  const providerId = entry.id.toLowerCase();
  const hasBilling = props.activeBillingProviders.has(providerId);
  const sub = props.providerSubscriptions[providerId];
  const isAutoDetected = sub?.method === "probe-inference" && hasBilling;

  return html`
    <div style="margin-bottom: 12px;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Free Model Discovery</div>
      <label
        style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;"
        @click=${(e: Event) => e.stopPropagation()}
        title="When checked, only tagged-free models are probed for this provider (paid models are skipped during free model discovery)."
      >
        <input
          type="checkbox"
          ?checked=${hasBilling}
          @change=${() => props.onToggleBilling(providerId)}
        />
        Active billing
        ${
          isAutoDetected
            ? html`
                <span class="muted" style="font-size: 11px">(auto-detected)</span>
              `
            : nothing
        }
      </label>
      <div class="muted" style="font-size: 11px; margin-top: 4px;">
        ${
          hasBilling
            ? "Only tagged-free models are probed. Paid models are skipped."
            : "All models are probed to discover secretly-free ones."
        }
      </div>
    </div>
  `;
}

function renderModelsSection(entry: ProviderHealthEntry, props: ProvidersProps) {
  if (!entry.detected || entry.models.length === 0) {
    if (entry.detected) {
      return html`
        <div style="margin-bottom: 12px">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px">Models</div>
          <div class="muted" style="font-size: 12px">No models discovered.</div>
        </div>
      `;
    }
    return nothing;
  }

  const allowlistEmpty = props.modelAllowlist.size === 0;
  const filteredModels = entry.models.filter((m) =>
    matchesCostFilter(m.costTier, props.modelsCostFilter),
  );

  const filteredKeys = filteredModels.map((m) => m.key);
  const allFilteredSelected =
    filteredKeys.length > 0 &&
    filteredKeys.every((k) => allowlistEmpty || props.modelAllowlist.has(k));
  const someFilteredSelected = filteredKeys.some((k) => props.modelAllowlist.has(k));

  return html`
    <div style="margin-bottom: 12px;">
      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"
      >
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-weight: 600; font-size: 13px;">
            Models (${entry.models.length})
          </div>
          ${
            filteredModels.length > 0
              ? html`
              <label
                style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: var(--text-secondary);"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  .checked=${allFilteredSelected}
                  .indeterminate=${someFilteredSelected && !allFilteredSelected}
                  @change=${() => props.onSelectAllModels(filteredKeys, !allFilteredSelected)}
                />
                ${allFilteredSelected ? "Deselect all" : "Select all"}
              </label>
            `
              : nothing
          }
        </div>
        <button
          class="btn btn-sm"
          ?disabled=${props.modelsSaving}
          @click=${(e: Event) => {
            e.stopPropagation();
            props.onSaveModels();
          }}
        >
          ${props.modelsSaving ? "Saving..." : "Save"}
        </button>
      </div>

      <div
        style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;"
        @click=${(e: Event) => e.stopPropagation()}
      >
        ${COST_FILTER_OPTIONS.map(
          (opt) => html`
            <button
              class="chip"
              style="cursor: pointer; font-size: 11px; padding: 2px 8px; border: 1px solid var(--border); ${
                props.modelsCostFilter === opt.value
                  ? "background: var(--text-strong); color: var(--bg); border-color: var(--text-strong);"
                  : ""
              }"
              @click=${() => props.onCostFilterChange(opt.value)}
            >
              ${opt.label}
            </button>
          `,
        )}
      </div>

      ${
        allowlistEmpty
          ? html`
              <div class="muted" style="font-size: 11px; margin-bottom: 6px">
                No allowlist configured — all models are available.
              </div>
            `
          : nothing
      }
      <div
        style="display: flex; flex-direction: column; gap: 4px; font-size: 13px;"
      >
        ${
          filteredModels.length === 0
            ? html`
                <div class="muted" style="font-size: 12px">No models match this filter.</div>
              `
            : filteredModels.map((model) =>
                renderModelRow(model, props, allowlistEmpty, entry.healthStatus),
              )
        }
      </div>
    </div>
  `;
}

function renderModelRow(
  model: ProviderModelEntry,
  props: ProvidersProps,
  allowlistEmpty: boolean,
  providerHealth?: string,
) {
  const isAllowed = allowlistEmpty || props.modelAllowlist.has(model.key);
  const isPrimary = props.primaryModel === model.key;
  const hasVision = model.input?.includes("image");
  const isProviderUnavailable =
    providerHealth === "cooldown" || providerHealth === "disabled" || providerHealth === "expired";

  return html`
    <div
      style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 6px; background: var(--bg-elevated);${isProviderUnavailable ? " opacity: 0.5;" : ""}"
      title=${isProviderUnavailable ? `Provider is ${providerHealth}` : ""}
    >
      <label
        style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; cursor: pointer;"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          ?checked=${isAllowed}
          @change=${() => props.onToggleModel(model.key)}
        />
        <span
          style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
          title=${model.key}
        >
          ${model.name}
        </span>
        ${
          isProviderUnavailable
            ? html`
                <span
                  class="chip"
                  style="
                    font-size: 10px;
                    background: color-mix(in srgb, var(--danger) 12%, transparent);
                    color: var(--danger);
                    border-color: color-mix(in srgb, var(--danger) 25%, transparent);
                  "
                >
                  unavailable
                </span>
              `
            : nothing
        }
      </label>
      <div
        style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;"
      >
        ${
          model.contextWindow
            ? html`<span
              class="chip"
              style="font-size: 11px;"
              title="Context window"
            >
              ${formatContextWindow(model.contextWindow)}
            </span>`
            : nothing
        }
        ${
          model.reasoning
            ? html`
                <span
                  class="chip"
                  style="
                    font-size: 11px;
                    background: color-mix(in srgb, var(--ok) 12%, transparent);
                    color: var(--ok);
                  "
                >
                  reasoning
                </span>
              `
            : nothing
        }
        ${
          hasVision
            ? html`
                <span
                  class="chip"
                  style="
                    font-size: 11px;
                    background: color-mix(in srgb, var(--info) 12%, transparent);
                    color: var(--info);
                  "
                >
                  vision
                </span>
              `
            : nothing
        }
        <span
          class="chip"
          style="font-size: 10px; background: color-mix(in srgb, ${costTierColor(model.costTier)} 12%, transparent); color: ${costTierColor(model.costTier)}; border-color: color-mix(in srgb, ${costTierColor(model.costTier)} 25%, transparent);"
          title="Cost tier: ${model.costTier}"
        >
          ${costTierLabel(model.costTier)}
        </span>
        ${
          isPrimary
            ? html`
                <span
                  class="chip"
                  style="
                    font-size: 11px;
                    background: color-mix(in srgb, var(--warn) 15%, transparent);
                    color: var(--warn);
                    border-color: color-mix(in srgb, var(--warn) 30%, transparent);
                  "
                >
                  Default
                </span>
              `
            : html`<button
              class="btn btn-sm"
              style="font-size: 11px; padding: 1px 6px;"
              @click=${(e: Event) => {
                e.stopPropagation();
                props.onSetPrimary(model.key);
              }}
            >
              Set default
            </button>`
        }
      </div>
    </div>
  `;
}

function renderUsageSection(entry: ProviderHealthEntry) {
  if (entry.usageError) {
    return html`
      <div>
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Usage Quota</div>
        <div class="muted" style="font-size: 12px;">${entry.usageError}</div>
      </div>
    `;
  }

  if (!entry.usageWindows || entry.usageWindows.length === 0) {
    if (entry.usagePlan) {
      return html`
        <div>
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Usage Quota</div>
          <div class="muted" style="font-size: 12px;">Plan: ${entry.usagePlan}</div>
        </div>
      `;
    }
    return nothing;
  }

  return html`
    <div>
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">
        Usage Quota
        ${entry.usagePlan ? html`<span class="muted" style="font-weight: 400;"> (${entry.usagePlan})</span>` : nothing}
      </div>
      ${entry.usageWindows.map((w) => renderUsageBar(w))}
    </div>
  `;
}

function renderHealthCheckSection(entry: ProviderHealthEntry, props: ProvidersProps) {
  if (!entry.detected) {
    return nothing;
  }
  const isChecking = props.checkingProvider === entry.id;
  const result = props.healthCheckResult?.providerId === entry.id ? props.healthCheckResult : null;

  return html`
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          class="btn btn-secondary"
          style="font-size: 12px; padding: 4px 12px;"
          ?disabled=${isChecking}
          @click=${() => props.onCheckHealth(entry.id)}
        >
          ${isChecking ? "Checking..." : "Check Health"}
        </button>
        ${
          result
            ? html`
              <span
                class="chip"
                style="background: ${result.healthy ? "var(--ok)" : "var(--danger)"}20; color: ${result.healthy ? "var(--ok)" : "var(--danger)"};"
              >
                ${result.healthy ? "Healthy" : result.status}
              </span>
            `
            : nothing
        }
      </div>
    </div>
  `;
}

function renderUsageBar(window: UsageWindowEntry) {
  const pct = Math.min(100, Math.max(0, window.usedPercent));
  const barColor = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warn)" : "var(--ok)";

  return html`
    <div style="margin-bottom: 8px;">
      <div
        style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 3px;"
      >
        <span>${window.label}</span>
        <span>
          ${pct.toFixed(1)}%
          ${
            window.resetRemainingMs !== null && window.resetRemainingMs > 0
              ? html`<span class="muted"> &middot; Resets: ${formatCountdown(window.resetRemainingMs)}</span>`
              : nothing
          }
        </span>
      </div>
      <div
        style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;"
      >
        <div
          style="height: 100%; width: ${pct}%; background: ${barColor}; border-radius: 3px; transition: width 1s linear;"
        ></div>
      </div>
    </div>
  `;
}

function renderSystemModelConfig(props: ProvidersProps) {
  const detectedProviderIds = new Set(
    props.entries.filter((e) => e.detected).map((e) => e.id.toLowerCase()),
  );

  // Check if primary model is from a detected provider
  const primaryProvider = props.primaryModel?.split("/")[0]?.toLowerCase();
  const isPrimaryValid = primaryProvider ? detectedProviderIds.has(primaryProvider) : false;

  // Check which fallbacks are from detected providers
  const fallbacksInfo = props.modelFallbacks.map((fb) => {
    const provider = fb.split("/")[0]?.toLowerCase();
    const isValid = provider ? detectedProviderIds.has(provider) : false;
    return { key: fb, isValid };
  });

  const validFallbacks = fallbacksInfo.filter((f) => f.isValid);
  const invalidFallbacks = fallbacksInfo.filter((f) => !f.isValid);

  return html`
    <section class="card" style="margin-bottom: 18px;">
      <div class="card-title">System Default Model</div>
      <div class="card-sub" style="margin-bottom: 12px;">
        The default model used for all agents unless overridden. All other models in the allowlist
        become fallbacks automatically.
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Primary</div>
          ${
            props.primaryModel
              ? html`
                  <div
                    class="chip"
                    style="font-size: 12px; padding: 4px 10px; ${
                      isPrimaryValid
                        ? "background: color-mix(in srgb, var(--ok) 12%, transparent); color: var(--ok); border-color: color-mix(in srgb, var(--ok) 25%, transparent);"
                        : "background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 25%, transparent);"
                    }"
                    title=${isPrimaryValid ? "Provider is configured" : "Provider not configured!"}
                  >
                    ${props.primaryModel}
                    ${
                      !isPrimaryValid
                        ? html`
                            <span style="margin-left: 6px">⚠️ Provider not detected</span>
                          `
                        : nothing
                    }
                  </div>
                `
              : html`
                  <span class="muted" style="font-size: 13px">No default model set</span>
                `
          }
        </div>

        <div>
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">
            Fallbacks (${props.modelFallbacks.length})
          </div>
          ${
            props.modelFallbacks.length === 0
              ? html`
                  <span class="muted" style="font-size: 13px">No fallbacks configured</span>
                `
              : html`
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${validFallbacks.map(
                      (fb) => html`
                        <span
                          class="chip"
                          style="font-size: 11px; background: color-mix(in srgb, var(--ok) 10%, transparent); color: var(--ok);"
                          title="Provider is configured"
                        >
                          ${fb.key}
                        </span>
                      `,
                    )}
                    ${invalidFallbacks.map(
                      (fb) => html`
                        <span
                          class="chip"
                          style="font-size: 11px; background: color-mix(in srgb, var(--danger) 10%, transparent); color: var(--danger); text-decoration: line-through; opacity: 0.7;"
                          title="Provider not configured - will be skipped"
                        >
                          ${fb.key}
                        </span>
                      `,
                    )}
                  </div>
                  ${
                    invalidFallbacks.length > 0
                      ? html`
                          <div
                            class="muted"
                            style="font-size: 11px; margin-top: 6px; color: var(--warn);"
                          >
                            ⚠️ ${invalidFallbacks.length} fallback(s) from unconfigured providers will
                            be skipped.
                          </div>
                        `
                      : nothing
                  }
                `
          }
        </div>
      </div>

      ${
        !isPrimaryValid && props.primaryModel
          ? html`
              <div
                class="callout danger"
                style="margin-top: 12px; font-size: 13px;"
              >
                <strong>Warning:</strong> The current default model
                <code>${props.primaryModel}</code> is from a provider that is not configured. Select
                a model from a detected provider below to fix this.
              </div>
            `
          : nothing
      }
    </section>
  `;
}

function renderProbeStatusBadge(status?: string) {
  if (!status || status === "unknown") {
    return html`
      <span
        class="chip"
        style="
          font-size: 10px;
          background: color-mix(in srgb, var(--muted) 12%, transparent);
          color: var(--muted);
        "
        >not probed</span
      >
    `;
  }
  if (status === "ok") {
    return html`
      <span
        class="chip"
        style="
          font-size: 10px;
          background: color-mix(in srgb, var(--ok) 12%, transparent);
          color: var(--ok);
        "
        >verified</span
      >
    `;
  }
  if (status === "no_credentials") {
    return html`
      <span
        class="chip"
        style="
          font-size: 10px;
          background: color-mix(in srgb, var(--warn) 12%, transparent);
          color: var(--warn);
        "
        >no creds</span
      >
    `;
  }
  if (status === "rate_limit") {
    return html`
      <span
        class="chip"
        style="
          font-size: 10px;
          background: color-mix(in srgb, var(--warn) 12%, transparent);
          color: var(--warn);
        "
        >rate limited</span
      >
    `;
  }
  // failed, timeout, auth, billing, unexpected_response
  return html`<span class="chip" style="font-size: 10px; background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger);">${status.replace(/_/g, " ")}</span>`;
}

function renderFreeModelsSection(props: ProvidersProps) {
  if (props.freeModels.length === 0) {
    return nothing;
  }

  const detectedProviderIds = new Set(
    props.entries.filter((e) => e.detected).map((e) => e.id.toLowerCase()),
  );

  // Group free models by provider
  const byProvider = new Map<string, FreeModelEntry[]>();
  for (const m of props.freeModels) {
    const provider = m.provider.toLowerCase();
    const list = byProvider.get(provider) ?? [];
    list.push(m);
    byProvider.set(provider, list);
  }

  // Sort: configured providers first, then alphabetically
  const providers = [...byProvider.entries()].toSorted((a, b) => {
    const aDetected = detectedProviderIds.has(a[0]);
    const bDetected = detectedProviderIds.has(b[0]);
    if (aDetected !== bDetected) {
      return aDetected ? -1 : 1;
    }
    return a[0].localeCompare(b[0]);
  });

  const summary = props.freeModelsSummary;
  const configuredCount = providers
    .filter(([p]) => detectedProviderIds.has(p))
    .reduce((sum, [, m]) => sum + m.length, 0);
  const unconfiguredCount = props.freeModels.length - configuredCount;
  const discoveredCount = props.freeModels.filter((m) => m.discoveredFree).length;

  return html`
    <section class="card" style="margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title" style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: var(--info);">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
            Free Models
          </div>
          <div class="card-sub">
            ${props.freeModels.length} free model${props.freeModels.length !== 1 ? "s" : ""} across ${byProvider.size} provider${byProvider.size !== 1 ? "s" : ""}
            ${
              summary
                ? html` &mdash;
                  <span style="color: var(--ok);">${summary.verifiedCount} verified</span>${
                    summary.failedCount > 0
                      ? html`, <span style="color: var(--danger);">${summary.failedCount} failed</span>`
                      : nothing
                  }${
                    summary.noCredentialsCount > 0
                      ? html`, <span class="muted">${summary.noCredentialsCount} no creds</span>`
                      : nothing
                  }${
                    (summary.discoveredFreeCount ?? 0) > 0
                      ? html`, <span style="color: #a855f7;">${summary.discoveredFreeCount} discovered</span>`
                      : nothing
                  }`
                : configuredCount > 0 && unconfiguredCount > 0
                  ? html` &mdash; <span style="color: var(--ok);">${configuredCount} ready</span>, <span class="muted">${unconfiguredCount} need credentials</span>`
                  : configuredCount > 0
                    ? html`
                        &mdash; <span style="color: var(--ok)">all ready to use</span>
                      `
                    : html`
                        &mdash; <span class="muted">configure credentials to use</span>
                      `
            }
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${
            summary?.lastFullProbe
              ? html`<span class="muted" style="font-size: 11px;">Probed ${formatTimeAgo(summary.lastFullProbe)}</span>`
              : nothing
          }
          <button
            class="btn btn-sm"
            ?disabled=${props.probingFreeModels}
            @click=${(e: Event) => {
              e.stopPropagation();
              props.onProbeFreeModels();
            }}
            title="Run PING/PONG health check on all models to verify free ones and discover secretly-free models"
          >
            ${
              props.probingFreeModels
                ? html`
                    <span class="spinner" style="width: 12px; height: 12px; margin-right: 4px"></span> Probing...
                  `
                : "Probe All"
            }
          </button>
        </div>
      </div>

      ${
        discoveredCount > 0
          ? html`
          <div style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: color-mix(in srgb, #a855f7 6%, transparent); border: 1px solid color-mix(in srgb, #a855f7 20%, transparent);">
            <span style="font-size: 12px; color: #a855f7; font-weight: 600;">${discoveredCount} secretly-free model${discoveredCount !== 1 ? "s" : ""} discovered</span>
            <span class="muted" style="font-size: 12px;"> &mdash; These models responded to PONG on providers without active billing.</span>
          </div>`
          : nothing
      }

      <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
        ${providers.map(([providerId, models]) => {
          const isDetected = detectedProviderIds.has(providerId);
          const providerEntry = props.entries.find((e) => e.id.toLowerCase() === providerId);
          const providerName = providerEntry?.name ?? providerId;
          const verifiedInProvider = models.filter((m) => m.probeStatus === "ok").length;
          const discoveredInProvider = models.filter((m) => m.discoveredFree).length;

          return html`
            <div style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; ${!isDetected ? "opacity: 0.7;" : ""}">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-weight: 600; font-size: 13px;">${providerName}</span>
                ${
                  isDetected
                    ? html`
                        <span
                          class="chip"
                          style="
                            font-size: 10px;
                            background: color-mix(in srgb, var(--ok) 12%, transparent);
                            color: var(--ok);
                          "
                          >configured</span
                        >
                      `
                    : html`
                        <span
                          class="chip"
                          style="
                            font-size: 10px;
                            background: color-mix(in srgb, var(--muted) 12%, transparent);
                            color: var(--muted);
                          "
                          >not configured</span
                        >
                      `
                }
                <span class="muted" style="font-size: 12px;">${models.length} model${models.length !== 1 ? "s" : ""}${verifiedInProvider > 0 ? `, ${verifiedInProvider} verified` : ""}${discoveredInProvider > 0 ? `, ${discoveredInProvider} discovered` : ""}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 3px;">
                ${models.map((m) => {
                  const key = `${providerId}/${m.id}`;
                  const isInAllowlist = props.modelAllowlist.has(key);
                  const isDiscovered = m.discoveredFree === true;
                  return html`
                    <div
                      style="display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 4px; background: ${isDiscovered ? "color-mix(in srgb, #a855f7 5%, var(--bg-elevated))" : "var(--bg-elevated)"}; cursor: ${isDetected ? "pointer" : "default"};"
                      title="${key}${isInAllowlist ? " (in allowlist)" : isDetected ? " (click to add)" : " (configure provider first)"}${isDiscovered ? " — Discovered free (not tagged)" : ""}"
                      @click=${
                        isDetected
                          ? () => {
                              if (!isInAllowlist) {
                                props.onToggleModel(key);
                              }
                            }
                          : undefined
                      }
                    >
                      <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px;">
                        ${m.name ?? m.id}
                        ${
                          isInAllowlist
                            ? html`
                                <span style="color: var(--ok); margin-left: 2px; font-size: 10px">&#10003;</span>
                              `
                            : nothing
                        }
                      </span>
                      <div style="display: flex; align-items: center; gap: 3px; flex-shrink: 0;">
                        ${
                          isDiscovered
                            ? html`
                                <span
                                  class="chip"
                                  style="
                                    font-size: 10px;
                                    background: color-mix(in srgb, #a855f7 12%, transparent);
                                    color: #a855f7;
                                    border-color: color-mix(in srgb, #a855f7 25%, transparent);
                                  "
                                  >discovered</span
                                >
                              `
                            : nothing
                        }
                        ${renderProbeStatusBadge(m.probeStatus)}
                        ${
                          m.probeLatencyMs != null && m.probeStatus === "ok"
                            ? html`<span class="chip" style="font-size: 10px;">${m.probeLatencyMs < 1000 ? `${m.probeLatencyMs}ms` : `${(m.probeLatencyMs / 1000).toFixed(1)}s`}</span>`
                            : nothing
                        }
                        ${
                          m.contextWindow
                            ? html`<span class="chip" style="font-size: 10px;" title="Context window">${formatContextWindow(m.contextWindow)}</span>`
                            : nothing
                        }
                        ${
                          m.reasoning
                            ? html`
                                <span
                                  class="chip"
                                  style="
                                    font-size: 10px;
                                    background: color-mix(in srgb, var(--ok) 12%, transparent);
                                    color: var(--ok);
                                  "
                                  >reasoning</span
                                >
                              `
                            : nothing
                        }
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>
    </section>
  `;
}

// --- Helpers ---

function getHealthColor(status: string): string {
  switch (status) {
    case "healthy":
      return "var(--ok)";
    case "warning":
      return "var(--warn)";
    case "cooldown":
    case "expired":
    case "disabled":
      return "var(--danger)";
    case "missing":
      return "var(--muted)";
    default:
      return "var(--muted)";
  }
}

function getHealthLabel(status: string): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "cooldown":
      return "Cooldown";
    case "expired":
      return "Expired";
    case "disabled":
      return "Disabled";
    case "missing":
      return "Not detected";
    default:
      return status;
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return "0s";
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatTimeAgo(timestampMs: number): string {
  const diff = Date.now() - timestampMs;
  if (diff < 0) {
    return "just now";
  }
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
