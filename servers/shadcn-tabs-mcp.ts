#!/usr/bin/env node

/**
 * Shadcn UI Tabs MCP Server
 *
 * Tab navigation for multi-section content organization
 * Exposes tab patterns, layouts, keyboard navigation, and recipes
 *
 * Tools: tabs_structure, tabs_layout, tabs_examples, tabs_keyboard,
 *        tabs_recipes, tabs_accessibility, integration_example
 */

import Anthropic from "@anthropic-ai/sdk";

const TABS_STRUCTURE = {
  basic: {
    description: "Basic tabs structure",
    pattern: "Tabs → TabsList → TabsTrigger + TabsContent",
    components: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    example: `<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    Account content
  </TabsContent>
  <TabsContent value="password">
    Password content
  </TabsContent>
</Tabs>`,
  },

  controlled: {
    description: "Controlled tabs with state",
    pattern: "useState to control active tab",
    use_case: "Programmatic tab switching, URL sync",
    example: `const [activeTab, setActiveTab] = useState("account")

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">...</TabsContent>
  <TabsContent value="password">...</TabsContent>
</Tabs>`,
  },

  with_icons: {
    description: "Tabs with icons",
    pattern: "Icon + text in TabsTrigger",
    example: `<TabsList>
  <TabsTrigger value="overview">
    <Home className="mr-2 h-4 w-4" />
    Overview
  </TabsTrigger>
  <TabsTrigger value="analytics">
    <BarChart className="mr-2 h-4 w-4" />
    Analytics
  </TabsTrigger>
</TabsList>`,
  },

  disabled_tab: {
    description: "Disabled tab",
    pattern: "disabled prop on TabsTrigger",
    example: `<TabsTrigger value="settings" disabled>
  Settings
</TabsTrigger>`,
  },
};

const TABS_LAYOUT = {
  horizontal: {
    description: "Default horizontal tab layout",
    orientation: "horizontal",
    use_case: "Standard tabs, top navigation",
    className: "Default (no className needed)",
    example: `<TabsList className="grid w-full grid-cols-2">
  <TabsTrigger value="account">Account</TabsTrigger>
  <TabsTrigger value="password">Password</TabsTrigger>
</TabsList>`,
  },

  vertical: {
    description: "Vertical tab layout (sidebar)",
    orientation: "vertical",
    use_case: "Settings pages, sidebars",
    className: "flex flex-col",
    example: `<Tabs defaultValue="general" orientation="vertical" className="flex">
  <TabsList className="flex flex-col h-full">
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="general" className="flex-1">...</TabsContent>
  <TabsContent value="security" className="flex-1">...</TabsContent>
  <TabsContent value="notifications" className="flex-1">...</TabsContent>
</Tabs>`,
  },

  full_width: {
    description: "Full-width tabs (equal distribution)",
    pattern: "Grid layout with equal columns",
    example: `<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
</TabsList>`,
  },

  compact: {
    description: "Compact tabs with minimal spacing",
    pattern: "Smaller padding and gap",
    example: `<TabsList className="h-9">
  <TabsTrigger value="tab1" className="text-sm">Tab 1</TabsTrigger>
  <TabsTrigger value="tab2" className="text-sm">Tab 2</TabsTrigger>
</TabsList>`,
  },
};

const TABS_EXAMPLES = {
  settings_page: {
    description: "Settings page with tabs",
    use_case: "Multi-section settings, profile pages",
    code: `<Tabs defaultValue="general" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  
  <TabsContent value="general" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Manage your account settings and preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" defaultValue="John Doe" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue="john@example.com" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  </TabsContent>
  
  <TabsContent value="security" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Manage your password and security settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="current">Current Password</Label>
          <Input id="current" type="password" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new">New Password</Label>
          <Input id="new" type="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Update password</Button>
      </CardFooter>
    </Card>
  </TabsContent>
  
  <TabsContent value="notifications" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Configure how you receive notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-notifications">Email Notifications</Label>
          <Switch id="email-notifications" />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="push-notifications">Push Notifications</Label>
          <Switch id="push-notifications" />
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>`,
  },

  dashboard_tabs: {
    description: "Dashboard with data tabs",
    use_case: "Analytics, reports, data views",
    code: `<Tabs defaultValue="overview" className="w-full">
  <TabsList>
    <TabsTrigger value="overview">
      <Home className="mr-2 h-4 w-4" />
      Overview
    </TabsTrigger>
    <TabsTrigger value="analytics">
      <BarChart className="mr-2 h-4 w-4" />
      Analytics
    </TabsTrigger>
    <TabsTrigger value="reports">
      <FileText className="mr-2 h-4 w-4" />
      Reports
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview" className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Revenue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$45,231.89</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
          </p>
        </CardContent>
      </Card>
      {/* More cards */}
    </div>
  </TabsContent>
  
  <TabsContent value="analytics">
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Analytics charts */}
      </CardContent>
    </Card>
  </TabsContent>
  
  <TabsContent value="reports">
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Reports table */}
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>`,
  },

  vertical_tabs: {
    description: "Vertical tabs for navigation",
    use_case: "Settings sidebar, preferences",
    code: `<Tabs defaultValue="profile" orientation="vertical" className="flex space-x-4">
  <TabsList className="flex flex-col h-full space-y-1">
    <TabsTrigger value="profile" className="justify-start">
      <User className="mr-2 h-4 w-4" />
      Profile
    </TabsTrigger>
    <TabsTrigger value="account" className="justify-start">
      <Settings className="mr-2 h-4 w-4" />
      Account
    </TabsTrigger>
    <TabsTrigger value="appearance" className="justify-start">
      <Palette className="mr-2 h-4 w-4" />
      Appearance
    </TabsTrigger>
    <TabsTrigger value="notifications" className="justify-start">
      <Bell className="mr-2 h-4 w-4" />
      Notifications
    </TabsTrigger>
  </TabsList>
  
  <div className="flex-1">
    <TabsContent value="profile">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This is how others will see you on the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Profile form */}
        </CardContent>
      </Card>
    </TabsContent>
    
    <TabsContent value="account">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Account settings */}
        </CardContent>
      </Card>
    </TabsContent>
    
    {/* Other tabs */}
  </div>
</Tabs>`,
  },

  simple_tabs: {
    description: "Simple content tabs",
    use_case: "Documentation, FAQs, product details",
    code: `<Tabs defaultValue="description" className="w-full">
  <TabsList>
    <TabsTrigger value="description">Description</TabsTrigger>
    <TabsTrigger value="specs">Specifications</TabsTrigger>
    <TabsTrigger value="reviews">Reviews</TabsTrigger>
  </TabsList>
  
  <TabsContent value="description" className="mt-4">
    <p className="text-sm text-muted-foreground">
      High-quality product with excellent features and durability.
      Perfect for everyday use.
    </p>
  </TabsContent>
  
  <TabsContent value="specs" className="mt-4">
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="font-medium">Dimensions:</span>
        <span className="text-muted-foreground">10 x 5 x 2 cm</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Weight:</span>
        <span className="text-muted-foreground">200g</span>
      </div>
    </div>
  </TabsContent>
  
  <TabsContent value="reviews" className="mt-4">
    <p className="text-sm text-muted-foreground">
      No reviews yet. Be the first to review this product!
    </p>
  </TabsContent>
</Tabs>`,
  },
};

const TABS_KEYBOARD = {
  navigation: {
    description: "Keyboard navigation shortcuts",
    shortcuts: {
      "Arrow Left": "Move to previous tab (horizontal)",
      "Arrow Right": "Move to next tab (horizontal)",
      "Arrow Up": "Move to previous tab (vertical)",
      "Arrow Down": "Move to next tab (vertical)",
      Home: "Move to first tab",
      End: "Move to last tab",
      "Enter/Space": "Activate focused tab",
    },
    note: "Navigation is automatic and built-in to Tabs component",
  },

  url_sync: {
    description: "Sync tabs with URL hash",
    pattern: "Use router or window.location.hash",
    example: `import { useRouter } from "next/navigation"

const router = useRouter()
const [activeTab, setActiveTab] = useState("account")

// Read from URL on mount
useEffect(() => {
  const hash = window.location.hash.slice(1)
  if (hash) setActiveTab(hash)
}, [])

// Update URL on tab change
const handleTabChange = (value: string) => {
  setActiveTab(value)
  router.push(\`#\${value}\`)
}

<Tabs value={activeTab} onValueChange={handleTabChange}>
  {/* tabs */}
</Tabs>`,
  },
};

const TABS_RECIPES = {
  settings_tabs: {
    description: "Complete settings page with tabs",
    copy_paste: true,
    code: `"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="account" className="w-full max-w-3xl">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="@johndoe" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save changes</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save password</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}`,
  },

  dashboard_tabs: {
    description: "Dashboard with icon tabs",
    copy_paste: true,
    code: `"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, BarChart, FileText } from "lucide-react"

export function DashboardTabs() {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList>
        <TabsTrigger value="overview">
          <Home className="mr-2 h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart className="mr-2 h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="reports">
          <FileText className="mr-2 h-4 w-4" />
          Reports
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          {/* More cards */}
        </div>
      </TabsContent>
      
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Data</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Analytics content */}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Reports content */}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}`,
  },

  vertical_nav_tabs: {
    description: "Vertical tabs for settings navigation",
    copy_paste: true,
    code: `"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Settings, Palette, Bell } from "lucide-react"

export function VerticalNavTabs() {
  return (
    <Tabs
      defaultValue="profile"
      orientation="vertical"
      className="flex w-full max-w-4xl space-x-4"
    >
      <TabsList className="flex flex-col h-full space-y-1 w-48">
        <TabsTrigger value="profile" className="justify-start w-full">
          <User className="mr-2 h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="account" className="justify-start w-full">
          <Settings className="mr-2 h-4 w-4" />
          Account
        </TabsTrigger>
        <TabsTrigger value="appearance" className="justify-start w-full">
          <Palette className="mr-2 h-4 w-4" />
          Appearance
        </TabsTrigger>
        <TabsTrigger value="notifications" className="justify-start w-full">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </TabsTrigger>
      </TabsList>
      
      <div className="flex-1">
        <TabsContent value="profile" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This is how others will see you on the site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Profile form */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Account settings */}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Other tabs */}
      </div>
    </Tabs>
  )
}`,
  },
};

const TABS_ACCESSIBILITY = [
  {
    item: "Keyboard Navigation",
    description: "Full arrow key navigation between tabs",
    wcag: "WCAG 2.1 AA - 2.1.1 Keyboard",
    example: "Built-in: Arrow keys, Home, End",
    importance: "Critical",
  },
  {
    item: "ARIA Roles",
    description: "Proper ARIA tablist, tab, and tabpanel roles",
    wcag: "WCAG 2.1 AA - 4.1.2 Name, Role, Value",
    example: 'role="tablist" role="tab" role="tabpanel"',
    importance: "Critical",
  },
  {
    item: "Focus Management",
    description: "Focus moves to active tab on selection",
    wcag: "WCAG 2.1 AA - 2.4.3 Focus Order",
    example: "Built-in: Automatic focus management",
    importance: "Critical",
  },
  {
    item: "Tab Labels",
    description: "Clear, descriptive labels for each tab",
    wcag: "WCAG 2.1 AA - 2.4.6 Headings and Labels",
    example: '<TabsTrigger value="account">Account Settings</TabsTrigger>',
    importance: "Critical",
  },
  {
    item: "Disabled Tabs",
    description: "Disabled tabs properly marked and skipped",
    wcag: "WCAG 2.1 AA - 4.1.2 Name, Role, Value",
    example: "<TabsTrigger disabled>Coming Soon</TabsTrigger>",
    importance: "Important",
  },
  {
    item: "Active State",
    description: "Clear visual indication of active tab",
    wcag: "WCAG 2.1 AA - 1.4.1 Use of Color",
    example: "Built-in: Background + text color change",
    importance: "Critical",
  },
  {
    item: "Content Association",
    description: "TabsContent properly associated with TabsTrigger",
    wcag: "WCAG 2.1 AA - 1.3.1 Info and Relationships",
    example: 'value="account" links trigger to content',
    importance: "Critical",
  },
];

const INTEGRATION_EXAMPLE = `
/**
 * Complete Tabs Integration
 * 
 * This example shows common tab patterns and usage
 */

// 1. Install Shadcn Tabs
// npx shadcn@latest add tabs

// 2. Import components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 3. Basic tabs
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>

// 4. Controlled tabs
const [activeTab, setActiveTab] = useState("account")

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">...</TabsContent>
  <TabsContent value="password">...</TabsContent>
</Tabs>

// 5. Full-width tabs (grid layout)
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
</TabsList>

// 6. Vertical tabs
<Tabs orientation="vertical" defaultValue="profile" className="flex">
  <TabsList className="flex flex-col">
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">...</TabsContent>
  <TabsContent value="settings">...</TabsContent>
</Tabs>

// 7. Tabs with icons
<TabsList>
  <TabsTrigger value="home">
    <Home className="mr-2 h-4 w-4" />
    Home
  </TabsTrigger>
  <TabsTrigger value="profile">
    <User className="mr-2 h-4 w-4" />
    Profile
  </TabsTrigger>
</TabsList>

/**
 * Key Points:
 * 
 * ✓ Keyboard Navigation: Built-in arrow key support
 * ✓ Accessibility: Full ARIA support
 * ✓ Controlled State: Use value + onValueChange
 * ✓ Layouts: Horizontal (default) or vertical
 * ✓ Icons: Add icons with lucide-react
 * ✓ Disabled: Use disabled prop on TabsTrigger
 */
`;

const tools: Anthropic.Tool[] = [
  {
    name: "tabs_structure",
    description: "Get tabs component structure and patterns",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Pattern: basic, controlled, with_icons, disabled_tab, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "tabs_layout",
    description: "Get tab layout variants (horizontal, vertical, full-width, compact)",
    input_schema: {
      type: "object" as const,
      properties: {
        layout: {
          type: "string",
          description: "Layout: horizontal, vertical, full_width, compact, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "tabs_examples",
    description: "Get tab code examples (settings, dashboard, vertical, simple)",
    input_schema: {
      type: "object" as const,
      properties: {
        example_type: {
          type: "string",
          description:
            "Example: settings_page, dashboard_tabs, vertical_tabs, simple_tabs, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "tabs_keyboard",
    description: "Get keyboard navigation and URL sync documentation",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "Topic: navigation, url_sync, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "tabs_recipes",
    description: "Get complete copy-paste tab templates",
    input_schema: {
      type: "object" as const,
      properties: {
        recipe: {
          type: "string",
          description: "Recipe: settings_tabs, dashboard_tabs, vertical_nav_tabs, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "tabs_accessibility",
    description: "Get accessibility (a11y) checklist for tabs (WCAG 2.1 AA)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "integration_example",
    description: "Get Tabs integration setup example",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "tabs_structure":
      const pattern = tool_input.pattern || "all";
      if (pattern === "all") {
        return JSON.stringify(TABS_STRUCTURE, null, 2);
      }
      return JSON.stringify(
        (TABS_STRUCTURE as any)[pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "tabs_layout":
      const layout = tool_input.layout || "all";
      if (layout === "all") {
        return JSON.stringify(TABS_LAYOUT, null, 2);
      }
      return JSON.stringify((TABS_LAYOUT as any)[layout] || { error: "Layout not found" }, null, 2);

    case "tabs_examples":
      const example_type = tool_input.example_type || "all";
      if (example_type === "all") {
        return JSON.stringify(TABS_EXAMPLES, null, 2);
      }
      return JSON.stringify(
        (TABS_EXAMPLES as any)[example_type] || { error: "Example not found" },
        null,
        2,
      );

    case "tabs_keyboard":
      const topic = tool_input.topic || "all";
      if (topic === "all") {
        return JSON.stringify(TABS_KEYBOARD, null, 2);
      }
      return JSON.stringify((TABS_KEYBOARD as any)[topic] || { error: "Topic not found" }, null, 2);

    case "tabs_recipes":
      const recipe = tool_input.recipe || "all";
      if (recipe === "all") {
        return JSON.stringify(TABS_RECIPES, null, 2);
      }
      return JSON.stringify(
        (TABS_RECIPES as any)[recipe] || { error: "Recipe not found" },
        null,
        2,
      );

    case "tabs_accessibility":
      return JSON.stringify(TABS_ACCESSIBILITY, null, 2);

    case "integration_example":
      return INTEGRATION_EXAMPLE;

    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();
  console.log("📑 Shadcn UI Tabs MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools`);
  console.log("🎯 Tab navigation for multi-section content ready");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Build a settings page with account and password tabs",
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

  console.log("✅ Tabs MCP Ready - All 7 tools operational");
}

main().catch(console.error);
