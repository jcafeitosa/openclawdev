# Frontend Design Skill

Use this skill when asked to:

- Design UI components for the Astro + React Islands stack
- Review or audit frontend design decisions
- Avoid generic "AI product" aesthetics
- Define component architecture and visual patterns
- Plan interactive islands vs static content boundaries

---

## The Problem: Generic AI Product UI

Most AI-adjacent products ship the same aesthetic:

- Purple/indigo gradients on everything
- Glassmorphism cards with `backdrop-blur`
- Floating orbs and particle effects
- "Chat bubble" as the primary interaction pattern
- Roboto or Inter at 14px with low contrast

**This is a design failure.** It signals "we're an AI startup", not "we're a product that solves your problem."

### Anti-pattern checklist (avoid these):

| Anti-pattern                       | What it signals         | Alternative                             |
| ---------------------------------- | ----------------------- | --------------------------------------- |
| Purple gradient hero               | Generic AI              | Brand color with purpose                |
| Glassmorphism everywhere           | Trend-chasing           | Clean surfaces with structure           |
| Loading spinner during AI response | Disconnected UX         | Streaming text, progress indicators     |
| "Powered by AI" badge              | Defensive               | Let the product speak                   |
| Chat-only interface                | Limited thinking        | Task-centric, contextual AI assist      |
| Hover tooltips for key actions     | Discoverability failure | Visible labels + progressive disclosure |

---

## Stack: Astro + React Islands

### Architecture Principle

```
Static (Astro/HTML)     →  Everything that doesn't need JS
Interactive (React Island) →  Only what needs state/event handling
```

**Rule:** Start static. Add an island only when you have:

- User interaction (forms, toggles, filters)
- Real-time data (websocket, polling)
- Client-side state that persists

### Island Directives

```astro
<!-- Loads immediately — use for above-the-fold interactive -->
<SearchBar client:load />

<!-- Loads when visible — use for below-the-fold components -->
<DataTable client:visible />

<!-- Loads only on user interaction — use for heavy components -->
<RichEditor client:idle />

<!-- Never hydrates — use for display-only "fake" interactive appearance -->
<StaticChart />
```

### File Structure Convention

```
src/
├── components/
│   ├── ui/              # Pure display components (no state)
│   │   ├── Button.astro
│   │   ├── Badge.astro
│   │   └── Card.astro
│   ├── islands/         # React Islands (client-side state)
│   │   ├── SearchBar.tsx
│   │   ├── DataTable.tsx
│   │   └── CommandPalette.tsx
│   └── layouts/         # Page-level layout shells
│       └── AppShell.astro
├── pages/
└── styles/
    └── globals.css      # Design tokens only
```

---

## Design Tokens First

Define tokens before components. Never hardcode colors, spacing, or type scales.

```css
/* styles/tokens.css */
:root {
  /* Color: functional, not decorative */
  --color-surface: #ffffff;
  --color-surface-subtle: #f8f9fa;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-muted: #6b7280;
  --color-accent: #2563eb; /* One accent, max */
  --color-accent-hover: #1d4ed8;
  --color-destructive: #dc2626;
  --color-success: #16a34a;

  /* Spacing: 4px base grid */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */

  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --leading-tight: 1.25;
  --leading-normal: 1.5;

  /* Radius: consistent, not random */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

---

## Component Patterns

### Button: Intention-Driven Variants

```tsx
// ✅ Variants match user intent
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

// ❌ Variants match visual style
type ButtonVariant = "blue" | "outlined" | "text" | "red";
```

```astro
---
// Button.astro — static variant (no JS needed)
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}
const { variant = 'primary', size = 'md', disabled = false } = Astro.props;
---
<button
  class:list={['btn', `btn--${variant}`, `btn--${size}`]}
  disabled={disabled}
>
  <slot />
</button>
```

### State Communication (Loading, Error, Empty)

Every interactive component must handle all states:

```tsx
// ✅ Full state coverage
function DataList({ query }: { query: string }) {
  const { data, isLoading, error } = useData(query);

  if (isLoading) return <Skeleton rows={5} />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data?.length) return <EmptyState message="No results found" />;

  return (
    <ul>
      {data.map((item) => (
        <ListItem key={item.id} {...item} />
      ))}
    </ul>
  );
}

// ❌ Only the happy path
function DataList({ data }) {
  return (
    <ul>
      {data.map((item) => (
        <li>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Streaming AI Output

When displaying AI-generated content, stream — don't wait:

```tsx
// ✅ Stream with visible progress
function AIResponse({ prompt }: { prompt: string }) {
  const [chunks, setChunks] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stream = streamCompletion(prompt);
    stream.on("chunk", (text) => setChunks((prev) => [...prev, text]));
    stream.on("done", () => setDone(true));
    return () => stream.abort();
  }, [prompt]);

  return (
    <div className="prose">
      {chunks.join("")}
      {!done && (
        <span className="cursor-blink" aria-hidden>
          ▊
        </span>
      )}
    </div>
  );
}
```

---

## Accessibility (Non-Negotiable)

```astro
<!-- ✅ Always: labels, roles, keyboard navigation -->
<button
  type="button"
  aria-label="Close dialog"
  aria-pressed={isOpen}
  onClick={close}
>
  <IconX aria-hidden="true" />
</button>

<!-- ✅ Skip links for keyboard users -->
<a href="#main-content" class="skip-link">Skip to content</a>

<!-- ✅ Focus management on island mount -->
useEffect(() => {
  if (isOpen) firstFocusableRef.current?.focus();
}, [isOpen]);
```

Minimum contrast ratios:

- Normal text: **4.5:1**
- Large text (18px+): **3:1**
- Interactive elements: **3:1** against adjacent colors

---

## Responsive Design

Mobile-first. No magic breakpoints — use content as the breakpoint.

```css
/* ✅ Content-driven breakpoints */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

/* ❌ Device-specific breakpoints */
@media (max-width: 768px) { ... }
@media (max-width: 1024px) { ... }
```

---

## Performance Checklist

Before shipping any UI component:

- [ ] **Images**: `loading="lazy"` below fold; explicit `width`/`height` to prevent CLS
- [ ] **Fonts**: `font-display: swap`; preload critical fonts only
- [ ] **Islands**: Verify `client:` directive is appropriate (not `client:load` for everything)
- [ ] **Bundle**: No unused imports; check island bundle size (`astro build --verbose`)
- [ ] **Animation**: `prefers-reduced-motion` respected; no JS animations for CSS-able effects
- [ ] **LCP**: Largest Contentful Paint element is server-rendered, not island-dependent

---

## Code Review Checklist (Frontend)

For every PR touching UI:

- [ ] Component has all states: loading, error, empty, populated
- [ ] No hardcoded colors/spacing (tokens only)
- [ ] Interactive island uses correct `client:` directive
- [ ] Accessible: labels, roles, keyboard navigable
- [ ] Mobile layout verified (resize browser or DevTools)
- [ ] No `console.log` left in
- [ ] TypeScript strict: no `any`, no `!` non-null assertions
- [ ] Build passes: `pnpm build && pnpm check`

---

## Related Skills

- `skills/design/SKILL.md` — System and API design
- `skills/implement/SKILL.md` — Full feature implementation workflow
- `skills/validate/SKILL.md` — Pre-delivery quality checks
