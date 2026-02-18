/**
 * Navigation Island - Interactive sidebar + topbar for Astro pages.
 *
 * Handles tab switching via full page navigation (Astro routing),
 * collapsible nav groups, connection status, and theme toggle.
 */

import { StoreController } from "@nanostores/lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { $gatewayError } from "../../services/gateway.ts";
import { gateway } from "../../services/gateway.ts";
import { $connected, $theme, $themeResolved } from "../../stores/app.ts";
import { $hello } from "../../stores/gateway.ts";
import { icons } from "../icons.ts";
import { TAB_GROUPS, iconForTab, titleForTab, pathForTab, type Tab } from "../navigation.ts";
import { loadSettings, saveSettings } from "../storage.ts";
import { resolveTheme, type ThemeMode, type ResolvedTheme } from "../theme.ts";

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

@customElement("nav-island")
export class NavIsland extends LitElement {
  @property({ type: String }) tab: string = "chat";

  // Reactive store subscriptions
  private connectedCtrl = new StoreController(this, $connected);
  private helloCtrl = new StoreController(this, $hello);
  private themeCtrl = new StoreController(this, $theme);
  private themeResolvedCtrl = new StoreController(this, $themeResolved);
  private errorCtrl = new StoreController(this, $gatewayError);

  @state() private navCollapsed = false;
  @state() private navGroupsCollapsed: Record<string, boolean> = {};

  // Light DOM - inherit page CSS
  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    const settings = loadSettings();
    this.navCollapsed = settings.navCollapsed;
    this.navGroupsCollapsed = settings.navGroupsCollapsed;

    // Apply saved theme
    const resolved = resolveTheme(settings.theme);
    $theme.set(settings.theme);
    $themeResolved.set(resolved);
    applyTheme(resolved);

    // Auto-connect to gateway
    gateway.connect();
  }

  private persistNavState() {
    const settings = loadSettings();
    saveSettings({
      ...settings,
      navCollapsed: this.navCollapsed,
      navGroupsCollapsed: this.navGroupsCollapsed,
    });
  }

  private toggleNavCollapsed() {
    this.navCollapsed = !this.navCollapsed;
    this.persistNavState();
    // Update shell class for layout
    const shell = document.getElementById("app-shell");
    if (shell) {
      shell.classList.toggle("shell--nav-collapsed", this.navCollapsed);
    }
  }

  private toggleNavGroup(label: string) {
    this.navGroupsCollapsed = {
      ...this.navGroupsCollapsed,
      [label]: !this.navGroupsCollapsed[label],
    };
    this.persistNavState();
  }

  private setTheme(next: ThemeMode) {
    $theme.set(next);
    const resolved = resolveTheme(next);
    $themeResolved.set(resolved);
    applyTheme(resolved);
    const settings = loadSettings();
    saveSettings({ ...settings, theme: next });
  }

  private renderThemeToggle() {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    const index = modes.indexOf(this.themeCtrl.value);
    return html`
      <div class="theme-toggle" style="--theme-index: ${index};">
        <div class="theme-toggle__track" role="group" aria-label="Theme">
          <span class="theme-toggle__indicator"></span>
          <button
            class="theme-toggle__button ${this.themeCtrl.value === "system" ? "active" : ""}"
            @click=${() => this.setTheme("system")}
            aria-pressed=${this.themeCtrl.value === "system"}
            aria-label="System theme"
            title="System"
          >
            <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="20" height="14" x="2" y="3" rx="2"></rect>
              <line x1="8" x2="16" y1="21" y2="21"></line>
              <line x1="12" x2="12" y1="17" y2="21"></line>
            </svg>
          </button>
          <button
            class="theme-toggle__button ${this.themeCtrl.value === "light" ? "active" : ""}"
            @click=${() => this.setTheme("light")}
            aria-pressed=${this.themeCtrl.value === "light"}
            aria-label="Light theme"
            title="Light"
          >
            <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="m4.93 4.93 1.41 1.41"></path>
              <path d="m17.66 17.66 1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="m6.34 17.66-1.41 1.41"></path>
              <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
          </button>
          <button
            class="theme-toggle__button ${this.themeCtrl.value === "dark" ? "active" : ""}"
            @click=${() => this.setTheme("dark")}
            aria-pressed=${this.themeCtrl.value === "dark"}
            aria-label="Dark theme"
            title="Dark"
          >
            <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private navigateToTab(tab: Tab, event: MouseEvent) {
    // Allow modifier-key clicks to open in new tab
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    const basePath =
      ((globalThis as Record<string, unknown>).__OPENCLAW_CONTROL_UI_BASE_PATH__ as string) ?? "";
    const href = pathForTab(tab, basePath);
    globalThis.location.href = href;
  }

  private renderTab(tab: Tab) {
    const basePath =
      ((globalThis as Record<string, unknown>).__OPENCLAW_CONTROL_UI_BASE_PATH__ as string) ?? "";
    const href = pathForTab(tab, basePath);
    const isActive = this.tab === tab;

    return html`
      <a
        href=${href}
        class="nav-item ${isActive ? "active" : ""}"
        aria-current=${isActive ? "page" : "false"}
        @click=${(e: MouseEvent) => this.navigateToTab(tab, e)}
        title=${titleForTab(tab)}
      >
        <span class="nav-item__icon" aria-hidden="true">${icons[iconForTab(tab)]}</span>
        <span class="nav-item__text">${titleForTab(tab)}</span>
      </a>
    `;
  }

  render() {
    const connected = this.connectedCtrl.value;
    const lastError = this.errorCtrl.value;
    return html`
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="nav-collapse-toggle"
            @click=${() => this.toggleNavCollapsed()}
            title=${this.navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label=${this.navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span class="nav-collapse-toggle__icon">${icons.menu}</span>
          </button>
          <div class="brand">
            <div class="brand-logo">
              <img src="/favicon.svg" alt="OpenClaw" />
            </div>
            <div class="brand-text">
              <div class="brand-title">OPENCLAW</div>
              <div class="brand-sub">Gateway Dashboard</div>
            </div>
          </div>
        </div>
        <div class="topbar-status">
          <div class="pill">
            <span class="statusDot ${connected ? "ok" : ""}"></span>
            <span>Health</span>
            <span class="mono">${connected ? "OK" : "Offline"}</span>
          </div>
          ${
            lastError && !connected
              ? html`<div class="pill pill--danger">
                <span class="mono" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${lastError}
                </span>
              </div>`
              : nothing
          }
          ${this.renderThemeToggle()}
        </div>
      </header>

      <aside class="nav ${this.navCollapsed ? "nav--collapsed" : ""}">
        ${TAB_GROUPS.map((group) => {
          const isGroupCollapsed = this.navGroupsCollapsed[group.label] ?? false;
          const hasActiveTab = group.tabs.some((t) => t === this.tab);

          return html`
            <div
              class="nav-group ${isGroupCollapsed && !hasActiveTab ? "nav-group--collapsed" : ""}"
            >
              <button
                class="nav-label"
                @click=${() => this.toggleNavGroup(group.label)}
                aria-expanded=${!isGroupCollapsed}
              >
                <span class="nav-label__text">${group.label}</span>
                <span class="nav-label__chevron">${isGroupCollapsed ? "+" : "\u2212"}</span>
              </button>
              <div class="nav-group__items">
                ${group.tabs.map((t) => this.renderTab(t as Tab))}
              </div>
            </div>
          `;
        })}
        <div class="nav-group nav-group--links">
          <div class="nav-label nav-label--static">
            <span class="nav-label__text">Resources</span>
          </div>
          <div class="nav-group__items">
            <a
              class="nav-item nav-item--external"
              href="https://docs.openclaw.ai"
              target="_blank"
              rel="noreferrer"
              title="Docs (opens in new tab)"
            >
              <span class="nav-item__icon" aria-hidden="true">${icons.book}</span>
              <span class="nav-item__text">Docs</span>
            </a>
          </div>
        </div>

        <!-- Command Palette Hint -->
        <div style="padding: 8px 12px; margin-top: auto;">
          <button
            class="nav-item"
            style="width: 100%; justify-content: space-between; opacity: 0.7;"
            @click=${() => {
              const el = document.querySelector("command-palette");
              if (
                el &&
                "open" in el &&
                typeof (el as HTMLElement & { open: () => void }).open === "function"
              ) {
                (el as HTMLElement & { open: () => void }).open();
              }
            }}
            title="Search commands (${navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+K)"
          >
            <span style="display: flex; align-items: center; gap: 10px;">
              <span class="nav-item__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
              <span class="nav-item__text">Search</span>
            </span>
            <kbd style="font-size: 10px; font-family: var(--mono); padding: 2px 6px; border-radius: 4px; background: var(--bg-hover); border: 1px solid var(--border); color: var(--muted); line-height: 1.3;">
              ${navigator.platform?.includes("Mac") ? "\u2318K" : "^K"}
            </kbd>
          </button>
        </div>
      </aside>
    `;
  }
}
