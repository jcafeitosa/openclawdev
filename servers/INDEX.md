# OpenClaw MCP Servers Index

**Last Updated**: 2026-02-19  
**Total MCPs**: 5 (Live) + 10 (Planned)

---

## 🟢 **LIVE MCPs**

### 1. **Shadcn Sidebar**

- **Status**: ✅ Live
- **Tools**: 8 (list, props, examples, structure, themes, rtl, install, sizing)
- **Components**: 17 (SidebarProvider, Sidebar, SidebarMenu, etc.)
- **File**: `servers/shadcn-sidebar-mcp.ts`
- **Docs**: `servers/SHADCN_SIDEBAR_MCP.md`
- **Agents**: Frontend Architect, UI Designer, UI Components

### 2. **Shadcn Button**

- **Status**: ✅ Live
- **Tools**: 5 (variants, props, examples, accessibility, recipes)
- **File**: `servers/shadcn-button-mcp.ts`
- **Docs**: Inline documentation
- **Agents**: Frontend Developer, UX Designer

### 3. **Shadcn Input**

- **Status**: ✅ Live
- **Tools**: 6 (types, props, validation, masks, accessibility, email_recipe)
- **File**: `servers/shadcn-input-mcp.ts`
- **Docs**: Inline documentation
- **Agents**: Frontend Developer, Form Builder

### 4. **Shadcn Card**

- **Status**: ✅ Live
- **Tools**: 5 (components, props, examples, responsive, spacing)
- **File**: `servers/shadcn-card-mcp.ts`
- **Docs**: Inline documentation
- **Agents**: Layout Designer, Component Architect

### 5. **Shadcn Form (React Hook Form + Zod)**

- **Status**: ✅ Live (Just Deployed!)
- **Tools**: 8 (structure, validation_schemas, error_handling, submit_patterns, field_components, form_recipes, accessibility, integration_example)
- **File**: `servers/shadcn-form-mcp.ts` (1192 lines, 33 KB)
- **Docs**: `servers/SHADCN_FORM_MCP.md`
- **Test**: `servers/test-shadcn-form.sh` ✅
- **Agents**: Frontend Architect, Form Builder, Full-Stack Developer

---

## 🟡 **PLANNED MCPs (Tier 1 - This Week)**

### 6. **Shadcn Dialog**

- **Priority**: 🟠 High
- **Frequency**: 60%+ of apps
- **Tools**: 5
  - `dialog_sizes()` — sm, md, lg, xl variants
  - `dialog_examples()` — Form in dialog, confirmation, etc.
  - `dialog_actions()` — Button placement patterns
  - `dialog_accessibility()` — Focus management, keyboard
  - `dialog_animation()` — Transition effects
- **Complexity**: Medium
- **ETA**: 45 min
- **Use Case**: "Build confirmation dialog"

### 7. **Shadcn Dropdown Menu**

- **Priority**: 🟠 High
- **Frequency**: 55%+ of apps
- **Tools**: 5
  - `dropdown_items()` — Links, buttons, checkboxes
  - `dropdown_examples()` — User menu, actions menu
  - `dropdown_submenus()` — Nested menus
  - `dropdown_keyboard()` — Keyboard shortcuts, accessibility
  - `dropdown_styling()` — Variants, custom styling
- **Complexity**: Medium
- **ETA**: 40 min
- **Use Case**: "Build user profile dropdown menu"

---

## 🔵 **PLANNED MCPs (Tier 2 - Next Week)**

### 8. **Shadcn Data Table**

- **Priority**: 🟠 High (complex, used in 40% of apps)
- **Tools**: 8
  - `table_schema()` — Column definitions
  - `table_sorting()` — Sort state management
  - `table_filtering()` — Filter patterns
  - `table_pagination()` — Pagination setup
  - `table_selection()` — Row/bulk selection
  - `table_examples()` — Full data table example
  - `table_accessibility()` — Semantic HTML, ARIA
  - `table_performance()` — Virtual scrolling for large datasets
- **Complexity**: Very High
- **ETA**: 90 min

### 9. **Shadcn Calendar**

- **Priority**: 🟠 High (date input is common)
- **Tools**: 6
  - `calendar_modes()` — Single, range, multiple
  - `calendar_validation()` — Disabled dates, ranges
  - `calendar_examples()` — Date picker patterns
  - `calendar_formats()` — Date formatting
  - `calendar_localization()` — i18n support
  - `calendar_accessibility()` — Keyboard navigation
- **Complexity**: High
- **ETA**: 60 min

### 10. **Shadcn Combobox**

- **Priority**: 🟠 Medium-High (searchable selects)
- **Tools**: 6
  - `combobox_filtering()` — Search/filter logic
  - `combobox_async()` — Async data loading
  - `combobox_examples()` — Various use cases
  - `combobox_keyboard()` — Keyboard shortcuts
  - `combobox_custom()` — Custom rendering
  - `combobox_accessibility()` — Screen reader support
- **Complexity**: High
- **ETA**: 60 min

### 11. **Shadcn Tabs**

- **Priority**: 🟡 Medium
- **Tools**: 5
  - `tabs_layout()` — Horizontal, vertical
  - `tabs_examples()` — Content sections
  - `tabs_keyboard()` — Arrow key navigation
  - `tabs_styling()` — Active, hover states
  - `tabs_accessibility()` — ARIA roles
- **Complexity**: Low
- **ETA**: 35 min

### 12. **Shadcn Popover**

- **Priority**: 🟡 Medium
- **Tools**: 5
  - `popover_positioning()` — Placement options
  - `popover_trigger()` — Click, hover, focus
  - `popover_examples()` — Tooltip, dropdown, custom
  - `popover_animations()` — Transitions
  - `popover_accessibility()` — Focus trap, escape key
- **Complexity**: Medium
- **ETA**: 35 min

### 13. **Shadcn Toast/Sonner**

- **Priority**: 🟡 Medium
- **Tools**: 5
  - `toast_types()` — Success, error, info, warning
  - `toast_positions()` — Top, bottom, left, right
  - `toast_examples()` — Various messages
  - `toast_actions()` — Dismiss, custom action
  - `toast_accessibility()` — ARIA live regions
- **Complexity**: Low
- **ETA**: 30 min

### 14. **Shadcn Chart**

- **Priority**: 🟡 Medium (domain-specific)
- **Tools**: 6
  - `chart_types()` — Line, bar, pie, area, radar
  - `chart_data()` — Data format, series, categories
  - `chart_theming()` — Colors, legends, tooltips
  - `chart_examples()` — Different chart types
  - `chart_responsive()` — Mobile rendering
  - `chart_accessibility()` — Data table fallback
- **Complexity**: High
- **ETA**: 75 min

---

## 📊 **Implementation Timeline**

```
TODAY (Feb 19):
  ✅ Sidebar (DONE)
  ✅ Button (DONE)
  ✅ Input (DONE)
  ✅ Card (DONE)
  ✅ Form (DONE) — 60 min on schedule
  ━━━━━━━━━━━━━━
  Total: 5 MCPs LIVE 🚀

NEXT (Tier 1 Completion):
  🔄 Dialog (45 min) — START IMMEDIATELY
  🔄 Dropdown Menu (40 min)
  🔄 Tabs (35 min)
  ━━━━━━━━━━━━━━
  Total: 120 min → 8 MCPs live

THIS WEEK (Feb 20-23):
  Continue TIER 1 Foundation
  ━━━━━━━━━━━━━━
  Target: 8 MCPs live by end of week

NEXT WEEK (Feb 24-28):
  🔄 Data Table (90 min)
  🔄 Calendar (60 min)
  🔄 Combobox (60 min)
  🔄 Tabs (35 min)
  🔄 Popover (35 min)
  🔄 Toast (30 min)
  🔄 Chart (75 min)
  ━━━━━━━━━━━━━━
  Total: 385 min → 14 MCPs live
```

---

## 🎯 **Coverage Goals**

| Milestone   | MCPs | Components | Coverage            |
| ----------- | ---- | ---------- | ------------------- |
| **Week 1**  | 4    | ~25        | Basic layouts       |
| **Week 2**  | 7    | ~50        | Forms + dialogs     |
| **Week 3**  | 14   | ~80+       | Advanced components |
| **Month 2** | 20+  | ~120+      | Full Shadcn suite   |

---

## 🤖 **Agent Usage Patterns**

### **Frontend Architect (Aninha)**

- ✅ Sidebar → Button → Input → Card
- 🔄 Form → Dialog → Data Table
- 📅 Calendar → Combobox

### **UI Designer (Letícia)**

- ✅ Card → Button
- 🔄 Dialog → Popover → Toast
- 📅 Chart (for dashboards)

### **Backend Architect (Carlos)**

- 🔄 Form → Input → Button
- 📅 Data Table (API design)
- 🔄 Tabs (API versioning UI)

### **Tech Lead (Matheus)**

- ✅ All components
- Special focus: Form, Data Table, Chart

---

## 📈 **Success Metrics**

**After Week 1:**

- 4 MCPs deployed
- 80% of basic UI covered
- Agents can build simple forms + layouts

**After Week 2:**

- 7 MCPs deployed
- 90% of common UI covered
- Agents can build full-featured UIs
- Form validation automated

**After Week 3:**

- 14 MCPs deployed
- 95% of Shadcn covered
- Agents can query ANY component
- Data-heavy UIs possible

---

## 🔧 **MCP Server Template**

All MCPs follow this structure:

```typescript
servers/shadcn-{component}-mcp.ts (300-600 lines)
  ├── Component definitions
  ├── Props + types
  ├── Tool implementations
  └── Example codes

servers/SHADCN_{COMPONENT}_MCP.md (5-10 KB)
  ├── Overview
  ├── Tools reference
  ├── Agent use cases
  └── Integration guide

servers/test-shadcn-{component}.sh
  └── Validation script
```

---

## 🚀 **How to Implement Next MCP**

```bash
# 1. Copy template
cp servers/shadcn-sidebar-mcp.ts servers/shadcn-button-mcp.ts

# 2. Update component definitions
# 3. Implement tool functions
# 4. Add documentation

# 5. Test
bash servers/test-shadcn-button.sh

# 6. Integrate
# Update .mcp.json with new server

# Done! Button MCP live.
```

---

## 🎓 **Key Learnings from Sidebar MCP**

✅ **What Worked:**

- Clear tool naming (list*, component*, sidebar\_)
- Comprehensive props documentation
- Real code examples
- Theme variables included
- RTL support documented

⚠️ **Improvements for Next MCPs:**

- Add performance tips
- Include TypeScript types
- Add integration examples (React Query, etc.)
- Include accessibility checklists
- Add common patterns section

---

## 📌 **Current Status**

```
MCP Ecosystem: TIER 1 PLANNING PHASE
├── ✅ Foundation (Sidebar)
├── 🔄 Tier 1 Ready (Button, Input, Card, Form)
├── 📋 Tier 2 Planned (Data Table, Calendar, etc.)
└── 🎯 Full suite by end of month

Total Development Time: ~15-20 hours
Delivered Value: 60+ agent-queryable components
```

---

**What MCP should we implement next?**

**A) Quick Tier 1 (Button + Input + Card) = 75 min**  
**B) High-ROI Tier 1 (Form) = 60 min**  
**C) Full Tier 1 (All 5 + Form) = 150 min**

Choose your adventure! 🚀
