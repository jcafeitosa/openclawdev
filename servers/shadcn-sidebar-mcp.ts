#!/usr/bin/env node

/**
 * Shadcn UI Sidebar MCP Server
 *
 * Exposes Shadcn Sidebar component documentation and utilities as MCP tools
 * Allows agents to query components, props, examples, theming, RTL support
 *
 * Tools exposed:
 * - list_components: List all Sidebar components
 * - component_props: Get properties of a specific component
 * - component_examples: Get code examples for a component
 * - sidebar_themes: Get CSS theming variables
 * - sidebar_rtl: Get RTL configuration guide
 * - component_structure: Understand sidebar hierarchy
 */

import Anthropic from "@anthropic-ai/sdk";

// Component definitions from Shadcn Sidebar documentation
const SIDEBAR_COMPONENTS = {
  SidebarProvider: {
    description: "Root provider that handles collapsible state for the entire sidebar",
    props: [
      {
        name: "defaultOpen",
        type: "boolean",
        description: "Default open state of the sidebar",
      },
      {
        name: "open",
        type: "boolean",
        description: "Open state (controlled mode)",
      },
      {
        name: "onOpenChange",
        type: "(open: boolean) => void",
        description: "Callback when sidebar open state changes",
      },
    ],
    usage: `<SidebarProvider>
  <AppSidebar />
  <main>
    <SidebarTrigger />
    {children}
  </main>
</SidebarProvider>`,
  },

  Sidebar: {
    description: "Main sidebar container component",
    props: [
      {
        name: "side",
        type: '"left" | "right"',
        description: "Which side the sidebar appears on",
        default: '"left"',
      },
      {
        name: "variant",
        type: '"sidebar" | "floating" | "inset"',
        description: "Visual variant of sidebar",
        default: '"sidebar"',
      },
      {
        name: "collapsible",
        type: '"offcanvas" | "icon" | "none"',
        description: "How sidebar collapses",
        default: '"offcanvas"',
      },
    ],
    variants: {
      offcanvas: "Slides in/out from edge",
      icon: "Collapses to icon-only view",
      none: "Non-collapsible sidebar",
    },
    usage: `<Sidebar>
  <SidebarHeader />
  <SidebarContent>
    <SidebarGroup />
  </SidebarContent>
  <SidebarFooter />
</Sidebar>`,
  },

  SidebarHeader: {
    description: "Sticky header at top of sidebar",
    props: [],
    usage: `<SidebarHeader>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton>
            Select Workspace
            <ChevronDown className="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Acme Inc</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarHeader>`,
  },

  SidebarFooter: {
    description: "Sticky footer at bottom of sidebar",
    props: [],
    usage: `<SidebarFooter>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton>
        <User2 /> Username
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>`,
  },

  SidebarContent: {
    description: "Scrollable content area containing SidebarGroups",
    props: [],
    usage: `<SidebarContent>
  <SidebarGroup>
    <SidebarGroupLabel>Application</SidebarGroupLabel>
    <SidebarGroupContent />
  </SidebarGroup>
  <SidebarGroup>
    <SidebarGroupLabel>Projects</SidebarGroupLabel>
    <SidebarGroupContent />
  </SidebarGroup>
</SidebarContent>`,
  },

  SidebarGroup: {
    description: "Logical section within sidebar",
    props: [],
    hasLabel: true,
    hasContent: true,
    hasAction: true,
    usage: `<SidebarGroup>
  <SidebarGroupLabel>Application</SidebarGroupLabel>
  <SidebarGroupAction>
    <Plus /> <span className="sr-only">Add Project</span>
  </SidebarGroupAction>
  <SidebarGroupContent />
</SidebarGroup>`,
  },

  SidebarMenu: {
    description: "Menu container for sidebar items",
    props: [],
    usage: `<SidebarMenu>
  {projects.map((project) => (
    <SidebarMenuItem key={project.name}>
      <SidebarMenuButton asChild>
        <a href={project.url}>
          <project.icon />
          <span>{project.name}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ))}
</SidebarMenu>`,
  },

  SidebarMenuItem: {
    description: "Individual menu item in SidebarMenu",
    props: [],
    usage: `<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <a href="#home">
      <Home />
      <span>Home</span>
    </a>
  </SidebarMenuButton>
  <SidebarMenuAction>
    <Plus />
  </SidebarMenuAction>
</SidebarMenuItem>`,
  },

  SidebarMenuButton: {
    description: "Clickable button within menu item",
    props: [
      {
        name: "asChild",
        type: "boolean",
        description: "Render as Link or anchor instead of button",
      },
      {
        name: "isActive",
        type: "boolean",
        description: "Mark menu item as active",
      },
    ],
    usage: `<SidebarMenuButton asChild isActive>
  <a href="/home">
    <Home />
    <span>Home</span>
  </a>
</SidebarMenuButton>`,
  },

  SidebarMenuAction: {
    description: "Action icon/button within menu item",
    props: [],
    usage: `<SidebarMenuAction>
  <Plus /> <span className="sr-only">Add Project</span>
</SidebarMenuAction>`,
  },

  SidebarMenuSub: {
    description: "Submenu within SidebarMenu",
    props: [],
    usage: `<SidebarMenuItem>
  <SidebarMenuButton />
  <SidebarMenuSub>
    <SidebarMenuSubItem>
      <SidebarMenuSubButton />
    </SidebarMenuSubItem>
  </SidebarMenuSub>
</SidebarMenuItem>`,
  },

  SidebarMenuBadge: {
    description: "Badge displayed in menu item (e.g., notification count)",
    props: [],
    usage: `<SidebarMenuItem>
  <SidebarMenuButton />
  <SidebarMenuBadge>24</SidebarMenuBadge>
</SidebarMenuItem>`,
  },

  SidebarTrigger: {
    description: "Button that toggles the sidebar open/closed",
    props: [],
    usage: `<SidebarTrigger />
or
<button onClick={toggleSidebar}>Toggle Sidebar</button>`,
  },

  SidebarRail: {
    description: "Interactive rail on sidebar edge for collapsing",
    props: [],
    usage: `<Sidebar>
  <SidebarHeader />
  <SidebarContent />
  <SidebarFooter />
  <SidebarRail />
</Sidebar>`,
  },

  useSidebar: {
    description: "Hook to access and control sidebar state",
    type: "hook",
    returns: [
      { name: "state", type: '"expanded" | "collapsed"', desc: "Current state" },
      { name: "open", type: "boolean", desc: "Whether open" },
      {
        name: "setOpen",
        type: "(open: boolean) => void",
        desc: "Control open state",
      },
      { name: "openMobile", type: "boolean", desc: "Mobile state" },
      {
        name: "setOpenMobile",
        type: "(open: boolean) => void",
        desc: "Control mobile state",
      },
      { name: "isMobile", type: "boolean", desc: "Is mobile view" },
      {
        name: "toggleSidebar",
        type: "() => void",
        desc: "Toggle sidebar (desktop/mobile)",
      },
    ],
    usage: `import { useSidebar } from "@/components/ui/sidebar"

export function AppSidebar() {
  const { state, open, setOpen, toggleSidebar } = useSidebar()
  
  return (
    <div>
      State: {state}
      <button onClick={toggleSidebar}>Toggle</button>
    </div>
  )
}`,
  },
};

const SIDEBAR_STRUCTURE = {
  hierarchy: `
SidebarProvider (root)
├── Sidebar
│   ├── SidebarHeader (sticky top)
│   ├── SidebarContent (scrollable)
│   │   ├── SidebarGroup
│   │   │   ├── SidebarGroupLabel
│   │   │   ├── SidebarGroupAction (optional)
│   │   │   └── SidebarGroupContent
│   │   │       └── SidebarMenu
│   │   │           └── SidebarMenuItem
│   │   │               ├── SidebarMenuButton
│   │   │               ├── SidebarMenuAction (optional)
│   │   │               ├── SidebarMenuBadge (optional)
│   │   │               └── SidebarMenuSub (optional)
│   │   └── SidebarGroup (...)
│   ├── SidebarFooter (sticky bottom)
│   └── SidebarRail (optional)
└── main
    ├── SidebarTrigger
    └── children
  `,
  description: "Standard hierarchical structure of sidebar components",
};

const CSS_VARIABLES = {
  light: {
    "--sidebar-background": "0 0% 98%",
    "--sidebar-foreground": "240 5.3% 26.1%",
    "--sidebar-primary": "240 5.9% 10%",
    "--sidebar-primary-foreground": "0 0% 98%",
    "--sidebar-accent": "240 4.8% 95.9%",
    "--sidebar-accent-foreground": "240 5.9% 10%",
    "--sidebar-border": "220 13% 91%",
    "--sidebar-ring": "217.2 91.2% 59.8%",
  },
  dark: {
    "--sidebar-background": "240 5.9% 10%",
    "--sidebar-foreground": "240 4.8% 95.9%",
    "--sidebar-primary": "0 0% 98%",
    "--sidebar-primary-foreground": "240 5.9% 10%",
    "--sidebar-accent": "240 3.7% 15.9%",
    "--sidebar-accent-foreground": "240 4.8% 95.9%",
    "--sidebar-border": "240 3.7% 15.9%",
    "--sidebar-ring": "217.2 91.2% 59.8%",
  },
};

const RTL_GUIDE = {
  support: "Full RTL support available",
  steps: [
    "Add dir prop to Sidebar component",
    "Add data-side attribute to sidebar container",
    "Update sidebar container positioning classes (use data-[side=...] selectors)",
    "Update SidebarRail positioning for physical layout",
    "Add rtl:rotate-180 to SidebarTrigger icon",
  ],
  example: `<Sidebar dir="rtl" side="right">
  <SidebarHeader />
  <SidebarContent />
  <SidebarFooter />
</Sidebar>`,
  configuration:
    "Enable RTL in your app by setting dir attribute on Sidebar or using CSS ltr:/rtl: prefixes",
};

// Tool definitions for MCP
const tools: Anthropic.Tool[] = [
  {
    name: "list_components",
    description: "List all available Sidebar components",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "component_props",
    description: "Get properties and description of a specific component",
    input_schema: {
      type: "object" as const,
      properties: {
        component_name: {
          type: "string",
          description: "Name of the component (e.g., SidebarMenu, SidebarMenuButton)",
        },
      },
      required: ["component_name"],
    },
  },
  {
    name: "component_examples",
    description: "Get code examples for a specific component",
    input_schema: {
      type: "object" as const,
      properties: {
        component_name: {
          type: "string",
          description: "Name of the component to get examples for",
        },
      },
      required: ["component_name"],
    },
  },
  {
    name: "sidebar_structure",
    description: "Get the recommended hierarchical structure of sidebar components",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "sidebar_themes",
    description: "Get CSS variables for theming sidebar (light/dark mode)",
    input_schema: {
      type: "object" as const,
      properties: {
        mode: {
          type: "string",
          enum: ["light", "dark", "both"],
          description: "Which theme to retrieve",
        },
      },
      required: ["mode"],
    },
  },
  {
    name: "sidebar_rtl",
    description: "Get RTL (Right-to-Left) configuration guide",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "installation",
    description: "Get installation instructions for Shadcn Sidebar",
    input_schema: {
      type: "object" as const,
      properties: {
        package_manager: {
          type: "string",
          enum: ["pnpm", "npm", "yarn", "bun"],
          description: "Package manager to use",
        },
      },
      required: ["package_manager"],
    },
  },
  {
    name: "size_configuration",
    description: "Get sidebar width configuration options",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Tool execution functions
function execute_list_components(): string {
  const components = Object.keys(SIDEBAR_COMPONENTS).map((name) => ({
    name,
    description: (SIDEBAR_COMPONENTS as any)[name].description,
  }));

  return JSON.stringify(
    {
      total: components.length,
      components,
      note: "Use component_props or component_examples to learn more about each component",
    },
    null,
    2,
  );
}

function execute_component_props(component_name: string): string {
  const component = (SIDEBAR_COMPONENTS as any)[component_name];

  if (!component) {
    return JSON.stringify(
      {
        error: `Component '${component_name}' not found`,
        available: Object.keys(SIDEBAR_COMPONENTS),
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      name: component_name,
      description: component.description,
      type: component.type || "component",
      props: component.props || [],
      returns: component.returns || null,
      variants: component.variants || null,
    },
    null,
    2,
  );
}

function execute_component_examples(component_name: string): string {
  const component = (SIDEBAR_COMPONENTS as any)[component_name];

  if (!component) {
    return JSON.stringify(
      {
        error: `Component '${component_name}' not found`,
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      name: component_name,
      description: component.description,
      example: component.usage || "No example available",
      note: `This is a basic example. Check Shadcn documentation for more advanced patterns.`,
    },
    null,
    2,
  );
}

function execute_sidebar_structure(): string {
  return JSON.stringify(SIDEBAR_STRUCTURE, null, 2);
}

function execute_sidebar_themes(mode: string): string {
  if (mode === "both") {
    return JSON.stringify({ light: CSS_VARIABLES.light, dark: CSS_VARIABLES.dark }, null, 2);
  }

  return JSON.stringify({ mode, variables: (CSS_VARIABLES as any)[mode] }, null, 2);
}

function execute_sidebar_rtl(): string {
  return JSON.stringify(RTL_GUIDE, null, 2);
}

function execute_installation(package_manager: string): string {
  const commands: any = {
    pnpm: "pnpm dlx shadcn@latest add sidebar",
    npm: "npx shadcn-ui@latest add sidebar",
    yarn: "yarn dlx shadcn@latest add sidebar",
    bun: "bunx shadcn@latest add sidebar",
  };

  return JSON.stringify(
    {
      package_manager,
      command: commands[package_manager] || commands.pnpm,
      manual: "Or manually copy sidebar.tsx from Shadcn GitHub repository",
      documentation: "https://ui.shadcn.com/docs/components/radix/sidebar",
    },
    null,
    2,
  );
}

function execute_size_configuration(): string {
  return JSON.stringify(
    {
      default: {
        SIDEBAR_WIDTH: "16rem (256px)",
        SIDEBAR_WIDTH_MOBILE: "18rem (288px)",
        location: "components/ui/sidebar.tsx",
      },
      custom_single: "Edit SIDEBAR_WIDTH and SIDEBAR_WIDTH_MOBILE constants",
      custom_multiple: {
        method: "Use CSS variables --sidebar-width and --sidebar-width-mobile",
        example: `<SidebarProvider
  style={{
    "--sidebar-width": "20rem",
    "--sidebar-width-mobile": "20rem",
  }}
>
  <Sidebar />
</SidebarProvider>`,
      },
      keyboard_shortcut: "cmd+b (Mac) or ctrl+b (Windows) to toggle sidebar",
    },
    null,
    2,
  );
}

// Process tool calls
function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "list_components":
      return execute_list_components();
    case "component_props":
      return execute_component_props(tool_input.component_name);
    case "component_examples":
      return execute_component_examples(tool_input.component_name);
    case "sidebar_structure":
      return execute_sidebar_structure();
    case "sidebar_themes":
      return execute_sidebar_themes(tool_input.mode || "both");
    case "sidebar_rtl":
      return execute_sidebar_rtl();
    case "installation":
      return execute_installation(tool_input.package_manager || "pnpm");
    case "size_configuration":
      return execute_size_configuration();
    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

// Main MCP server function
async function main() {
  const client = new Anthropic();

  console.log("🎨 Shadcn UI Sidebar MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools for agent access`);
  console.log("---");

  // Example: Query what sidebar components exist
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "What are all the Sidebar components available in Shadcn UI?",
    },
  ];

  let response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    tools: tools,
    messages: messages,
  });

  console.log("Initial Response:");
  console.log(`Stop Reason: ${response.stop_reason}`);

  // Agentic loop - continue until no more tool calls
  while (response.stop_reason === "tool_use") {
    const tool_use_block = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (!tool_use_block) {
      break;
    }

    const tool_name = tool_use_block.name;
    const tool_input = tool_use_block.input as Record<string, string>;

    console.log(`\n🔧 Tool Used: ${tool_name}`);
    console.log(`📥 Input: ${JSON.stringify(tool_input)}`);

    const tool_result = process_tool_call(tool_name, tool_input);

    console.log(`📤 Result: ${tool_result.substring(0, 200)}...`);

    // Add assistant response and tool result to messages
    messages.push({
      role: "assistant",
      content: response.content,
    });

    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: tool_use_block.id,
          content: tool_result,
        },
      ],
    });

    // Continue conversation
    response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });

    console.log(`Stop Reason: ${response.stop_reason}`);
  }

  // Get final text response
  const final_text_block = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  if (final_text_block) {
    console.log("\n📝 Final Response:");
    console.log(final_text_block.text);
  }

  console.log("\n✅ Shadcn Sidebar MCP Server Demo Complete");
}

main().catch(console.error);
