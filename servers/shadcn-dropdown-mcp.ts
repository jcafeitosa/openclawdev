#!/usr/bin/env node

/**
 * Shadcn UI Dropdown Menu MCP Server
 *
 * Dropdown menus for user actions, navigation, and context menus
 * Exposes dropdown patterns, items, keyboard shortcuts, and recipes
 *
 * Tools: dropdown_items, dropdown_structure, dropdown_examples,
 *        dropdown_keyboard, dropdown_recipes, dropdown_accessibility,
 *        integration_example
 */

import Anthropic from "@anthropic-ai/sdk";

const DROPDOWN_ITEMS = {
  basic_item: {
    description: "Standard clickable menu item",
    component: "DropdownMenuItem",
    example: `<DropdownMenuItem>
  Profile
</DropdownMenuItem>`,
  },

  item_with_icon: {
    description: "Menu item with leading icon",
    component: "DropdownMenuItem",
    example: `<DropdownMenuItem>
  <User className="mr-2 h-4 w-4" />
  <span>Profile</span>
</DropdownMenuItem>`,
  },

  item_with_shortcut: {
    description: "Menu item with keyboard shortcut display",
    component: "DropdownMenuItem + DropdownMenuShortcut",
    example: `<DropdownMenuItem>
  <User className="mr-2 h-4 w-4" />
  <span>Profile</span>
  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
</DropdownMenuItem>`,
  },

  destructive_item: {
    description: "Destructive action item (delete, remove)",
    component: "DropdownMenuItem",
    example: `<DropdownMenuItem className="text-red-600">
  <Trash2 className="mr-2 h-4 w-4" />
  <span>Delete</span>
  <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
</DropdownMenuItem>`,
  },

  checkbox_item: {
    description: "Menu item with checkbox (toggle state)",
    component: "DropdownMenuCheckboxItem",
    example: `<DropdownMenuCheckboxItem
  checked={showStatusBar}
  onCheckedChange={setShowStatusBar}
>
  Status Bar
</DropdownMenuCheckboxItem>`,
  },

  radio_group: {
    description: "Radio group for exclusive selection",
    component: "DropdownMenuRadioGroup + DropdownMenuRadioItem",
    example: `<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
  <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
</DropdownMenuRadioGroup>`,
  },

  separator: {
    description: "Visual separator between menu items",
    component: "DropdownMenuSeparator",
    example: `<DropdownMenuItem>Item 1</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem>Item 2</DropdownMenuItem>`,
  },

  label: {
    description: "Non-interactive label/header for grouping",
    component: "DropdownMenuLabel",
    example: `<DropdownMenuLabel>My Account</DropdownMenuLabel>
<DropdownMenuSeparator />
<DropdownMenuItem>Profile</DropdownMenuItem>`,
  },

  disabled_item: {
    description: "Disabled menu item (non-clickable)",
    component: "DropdownMenuItem",
    example: `<DropdownMenuItem disabled>
  <Settings className="mr-2 h-4 w-4" />
  <span>Settings</span>
</DropdownMenuItem>`,
  },
};

const DROPDOWN_STRUCTURE = {
  basic: {
    description: "Basic dropdown menu structure",
    pattern: "DropdownMenu → Trigger → Content → Items",
    components: ["DropdownMenu", "DropdownMenuTrigger", "DropdownMenuContent", "DropdownMenuItem"],
    example: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },

  with_grouping: {
    description: "Dropdown with labeled groups",
    pattern: "Groups with labels and separators",
    example: `<DropdownMenuContent>
  <DropdownMenuLabel>My Account</DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuItem>Profile</DropdownMenuItem>
  <DropdownMenuItem>Billing</DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem>Logout</DropdownMenuItem>
</DropdownMenuContent>`,
  },

  submenu: {
    description: "Dropdown with nested sub-menu",
    pattern: "DropdownMenuSub for nested items",
    example: `<DropdownMenuItem>Profile</DropdownMenuItem>
<DropdownMenuSub>
  <DropdownMenuSubTrigger>
    <UserPlus className="mr-2 h-4 w-4" />
    <span>Invite users</span>
  </DropdownMenuSubTrigger>
  <DropdownMenuSubContent>
    <DropdownMenuItem>Email</DropdownMenuItem>
    <DropdownMenuItem>Message</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>More...</DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>`,
  },

  controlled: {
    description: "Controlled dropdown with state",
    pattern: "useState for programmatic control",
    example: `const [open, setOpen] = useState(false)

<DropdownMenu open={open} onOpenChange={setOpen}>
  <DropdownMenuTrigger asChild>
    <Button>Open</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setOpen(false)}>
      Close after click
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },
};

const DROPDOWN_EXAMPLES = {
  user_menu: {
    description: "User profile dropdown menu",
    use_case: "Header user menu with profile, settings, logout",
    code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/avatars/01.png" alt="@username" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56" align="end" forceMount>
    <DropdownMenuLabel className="font-normal">
      <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium leading-none">John Doe</p>
        <p className="text-xs leading-none text-muted-foreground">
          john@example.com
        </p>
      </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <User className="mr-2 h-4 w-4" />
        <span>Profile</span>
        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <CreditCard className="mr-2 h-4 w-4" />
        <span>Billing</span>
        <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <LogOut className="mr-2 h-4 w-4" />
      <span>Log out</span>
      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },

  actions_menu: {
    description: "Actions menu for items (edit, delete, share)",
    use_case: "Row actions in tables, card actions",
    code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="h-8 w-8 p-0">
      <span className="sr-only">Open menu</span>
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.id)}>
      <Copy className="mr-2 h-4 w-4" />
      Copy ID
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Share className="mr-2 h-4 w-4" />
      Share
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-red-600">
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },

  checkbox_menu: {
    description: "Dropdown with checkbox toggles",
    use_case: "View options, feature toggles",
    code: `const [showStatusBar, setShowStatusBar] = useState(true)
const [showActivityBar, setShowActivityBar] = useState(false)
const [showPanel, setShowPanel] = useState(false)

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">View</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuCheckboxItem
      checked={showStatusBar}
      onCheckedChange={setShowStatusBar}
    >
      Status Bar
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={showActivityBar}
      onCheckedChange={setShowActivityBar}
      disabled
    >
      Activity Bar
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={showPanel}
      onCheckedChange={setShowPanel}
    >
      Panel
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },

  radio_menu: {
    description: "Dropdown with radio group selection",
    use_case: "Single choice selection (theme, language, position)",
    code: `const [position, setPosition] = useState("bottom")

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Panel Position</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
      <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>`,
  },

  submenu_example: {
    description: "Dropdown with sub-menus",
    use_case: "Nested navigation, complex menus",
    code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <User className="mr-2 h-4 w-4" />
        <span>Profile</span>
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <UserPlus className="mr-2 h-4 w-4" />
          <span>Invite users</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>
            <Mail className="mr-2 h-4 w-4" />
            <span>Email</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Message</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>More...</span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>`,
  },
};

const DROPDOWN_KEYBOARD = {
  navigation: {
    description: "Keyboard navigation shortcuts",
    shortcuts: {
      "Arrow Down": "Move focus to next item",
      "Arrow Up": "Move focus to previous item",
      "Enter/Space": "Activate focused item",
      Escape: "Close dropdown menu",
      Tab: "Close menu and move focus to next element",
      Home: "Move focus to first item",
      End: "Move focus to last item",
    },
  },

  shortcuts_display: {
    description: "How to display keyboard shortcuts",
    pattern: "DropdownMenuShortcut component",
    symbols: {
      "⌘": "Command (Mac)",
      "⌃": "Control",
      "⌥": "Option/Alt",
      "⇧": "Shift",
      "⏎": "Enter",
      "⌫": "Delete",
      "⎋": "Escape",
    },
    example: `<DropdownMenuItem>
  <span>Save</span>
  <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
</DropdownMenuItem>`,
  },

  custom_shortcuts: {
    description: "Implementing actual keyboard shortcuts",
    pattern: "useEffect + event listener",
    example: `useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])`,
  },
};

const DROPDOWN_RECIPES = {
  user_account_menu: {
    description: "Complete user account menu",
    copy_paste: true,
    code: `"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User, CreditCard, Settings, LogOut } from "lucide-react"

export function UserAccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/01.png" alt="@johndoe" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">John Doe</p>
            <p className="text-xs leading-none text-muted-foreground">
              john@example.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}`,
  },

  table_row_actions: {
    description: "Actions menu for table rows",
    copy_paste: true,
    code: `"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Copy, Edit, Share, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface RowActionsProps {
  item: { id: string; name: string }
}

export function RowActions({ item }: RowActionsProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(item.id)
    toast.success("ID copied to clipboard")
  }

  const handleDelete = () => {
    // Confirm and delete
    toast.error("Delete confirmation needed")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Share className="mr-2 h-4 w-4" />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}`,
  },

  settings_menu: {
    description: "Settings menu with checkboxes",
    copy_paste: true,
    code: `"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

export function SettingsMenu() {
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [showActivityBar, setShowActivityBar] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>View Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showStatusBar}
          onCheckedChange={setShowStatusBar}
        >
          Status Bar
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showActivityBar}
          onCheckedChange={setShowActivityBar}
        >
          Activity Bar
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showPanel}
          onCheckedChange={setShowPanel}
        >
          Panel
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}`,
  },
};

const DROPDOWN_ACCESSIBILITY = [
  {
    item: "Keyboard Navigation",
    description: "Full keyboard support (arrows, enter, escape)",
    wcag: "WCAG 2.1 AA - 2.1.1 Keyboard",
    example: "Built-in: Arrow keys navigate, Enter activates, Esc closes",
    importance: "Critical",
  },
  {
    item: "Focus Management",
    description: "Focus automatically moves to menu on open",
    wcag: "WCAG 2.1 AA - 2.4.3 Focus Order",
    example: "Built-in: Focus traps to menu items",
    importance: "Critical",
  },
  {
    item: "ARIA Roles",
    description: "Proper ARIA menu roles and attributes",
    wcag: "WCAG 2.1 AA - 4.1.2 Name, Role, Value",
    example: 'role="menu" role="menuitem" aria-haspopup="true"',
    importance: "Critical",
  },
  {
    item: "Screen Reader Support",
    description: "Descriptive labels for icon-only triggers",
    wcag: "WCAG 2.1 AA - 1.1.1 Non-text Content",
    example: '<span className="sr-only">Open menu</span>',
    importance: "Critical",
  },
  {
    item: "Disabled Items",
    description: "Disabled items properly marked and skipped",
    wcag: "WCAG 2.1 AA - 4.1.2 Name, Role, Value",
    example: "<DropdownMenuItem disabled>Item</DropdownMenuItem>",
    importance: "Important",
  },
  {
    item: "Keyboard Shortcuts",
    description: "Visual display of keyboard shortcuts",
    wcag: "User Experience Best Practice",
    example: "<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>",
    importance: "Recommended",
  },
  {
    item: "Close on Select",
    description: "Menu closes after item selection (default behavior)",
    wcag: "User Experience Best Practice",
    example: "Built-in: Automatic close after selection",
    importance: "Important",
  },
];

const INTEGRATION_EXAMPLE = `
/**
 * Complete Dropdown Menu Integration
 * 
 * This example shows common dropdown menu patterns
 */

// 1. Install Shadcn Dropdown Menu
// npx shadcn@latest add dropdown-menu

// 2. Import components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"

// 3. Basic dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// 4. With grouping and labels
<DropdownMenuContent>
  <DropdownMenuLabel>My Account</DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuItem>Profile</DropdownMenuItem>
  <DropdownMenuItem>Settings</DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem>Logout</DropdownMenuItem>
</DropdownMenuContent>

// 5. With icons and shortcuts
<DropdownMenuItem>
  <User className="mr-2 h-4 w-4" />
  <span>Profile</span>
  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
</DropdownMenuItem>

// 6. Checkbox items
const [checked, setChecked] = useState(false)

<DropdownMenuCheckboxItem
  checked={checked}
  onCheckedChange={setChecked}
>
  Show Panel
</DropdownMenuCheckboxItem>

// 7. Radio group
const [value, setValue] = useState("top")

<DropdownMenuRadioGroup value={value} onValueChange={setValue}>
  <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
</DropdownMenuRadioGroup>

/**
 * Key Points:
 * 
 * ✓ Keyboard Navigation: Full arrow key support
 * ✓ Accessibility: ARIA roles built-in
 * ✓ Positioning: Automatic collision detection
 * ✓ Icons: Use lucide-react icons
 * ✓ Shortcuts: Display only, implement separately
 * ✓ Destructive Actions: Use red text color
 */
`;

const tools: Anthropic.Tool[] = [
  {
    name: "dropdown_items",
    description: "Get dropdown menu item types (basic, icon, shortcut, checkbox, radio, etc)",
    input_schema: {
      type: "object" as const,
      properties: {
        item_type: {
          type: "string",
          description:
            "Item type: basic_item, item_with_icon, item_with_shortcut, destructive_item, checkbox_item, radio_group, separator, label, disabled_item, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dropdown_structure",
    description: "Get dropdown structure patterns (basic, grouped, submenu, controlled)",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Pattern: basic, with_grouping, submenu, controlled, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dropdown_examples",
    description: "Get dropdown code examples (user menu, actions, checkbox, radio, submenu)",
    input_schema: {
      type: "object" as const,
      properties: {
        example_type: {
          type: "string",
          description:
            "Example: user_menu, actions_menu, checkbox_menu, radio_menu, submenu_example, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dropdown_keyboard",
    description: "Get keyboard navigation and shortcuts documentation",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "Topic: navigation, shortcuts_display, custom_shortcuts, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dropdown_recipes",
    description: "Get complete copy-paste dropdown templates",
    input_schema: {
      type: "object" as const,
      properties: {
        recipe: {
          type: "string",
          description: "Recipe: user_account_menu, table_row_actions, settings_menu, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dropdown_accessibility",
    description: "Get accessibility (a11y) checklist for dropdown menus (WCAG 2.1 AA)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "integration_example",
    description: "Get Dropdown Menu integration setup example",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "dropdown_items":
      const item_type = tool_input.item_type || "all";
      if (item_type === "all") {
        return JSON.stringify(DROPDOWN_ITEMS, null, 2);
      }
      return JSON.stringify(
        (DROPDOWN_ITEMS as any)[item_type] || { error: "Item type not found" },
        null,
        2,
      );

    case "dropdown_structure":
      const pattern = tool_input.pattern || "all";
      if (pattern === "all") {
        return JSON.stringify(DROPDOWN_STRUCTURE, null, 2);
      }
      return JSON.stringify(
        (DROPDOWN_STRUCTURE as any)[pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "dropdown_examples":
      const example_type = tool_input.example_type || "all";
      if (example_type === "all") {
        return JSON.stringify(DROPDOWN_EXAMPLES, null, 2);
      }
      return JSON.stringify(
        (DROPDOWN_EXAMPLES as any)[example_type] || { error: "Example not found" },
        null,
        2,
      );

    case "dropdown_keyboard":
      const topic = tool_input.topic || "all";
      if (topic === "all") {
        return JSON.stringify(DROPDOWN_KEYBOARD, null, 2);
      }
      return JSON.stringify(
        (DROPDOWN_KEYBOARD as any)[topic] || { error: "Topic not found" },
        null,
        2,
      );

    case "dropdown_recipes":
      const recipe = tool_input.recipe || "all";
      if (recipe === "all") {
        return JSON.stringify(DROPDOWN_RECIPES, null, 2);
      }
      return JSON.stringify(
        (DROPDOWN_RECIPES as any)[recipe] || { error: "Recipe not found" },
        null,
        2,
      );

    case "dropdown_accessibility":
      return JSON.stringify(DROPDOWN_ACCESSIBILITY, null, 2);

    case "integration_example":
      return INTEGRATION_EXAMPLE;

    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();
  console.log("📋 Shadcn UI Dropdown Menu MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools`);
  console.log("🎯 Dropdown menus for actions and navigation ready");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Build a user account dropdown menu with profile, settings, and logout",
    },
  ];

  let response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    tools: tools,
    messages: messages,
  });

  while (response.stop_reason === "tool_use") {
    const tool_use_block = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (!tool_use_block) {
      break;
    }

    const tool_result = process_tool_call(
      tool_use_block.name,
      tool_use_block.input as Record<string, string>,
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: tool_use_block.id, content: tool_result }],
    });

    response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      tools: tools,
      messages: messages,
    });
  }

  console.log("✅ Dropdown Menu MCP Ready - All 7 tools operational");
}

main().catch(console.error);
