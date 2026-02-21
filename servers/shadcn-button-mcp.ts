#!/usr/bin/env node

/**
 * Shadcn UI Button MCP Server
 *
 * Exposes Shadcn Button component documentation and utilities as MCP tools
 * Allows agents to query button variants, sizes, states, accessibility
 *
 * Tools exposed:
 * - list_variants: All button size/variant combinations
 * - button_props: Complete props reference
 * - button_examples: Code examples for common patterns
 * - button_accessibility: a11y checklist
 * - button_with_icon: Icon integration patterns
 */

import Anthropic from "@anthropic-ai/sdk";

const BUTTON_VARIANTS = {
  sizes: {
    sm: { padding: "h-8 px-3", text: "text-xs", example: "Small button" },
    default: {
      padding: "h-10 px-4",
      text: "text-sm",
      example: "Default button (most common)",
    },
    lg: { padding: "h-12 px-8", text: "text-base", example: "Large button" },
    icon: { padding: "h-10 w-10", text: "text-sm", example: "Icon-only button" },
  },

  variants: {
    default: {
      description: "Primary action button (filled background)",
      css: "bg-primary text-primary-foreground hover:bg-primary/90",
      usage: "Primary CTA, submit, confirm",
      example: `<Button>Click me</Button>`,
    },

    secondary: {
      description: "Secondary action button (contrasting background)",
      css: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      usage: "Secondary actions, alternatives",
      example: `<Button variant="secondary">Learn more</Button>`,
    },

    destructive: {
      description: "Danger/delete button (red, warning color)",
      css: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      usage: "Delete, cancel, dangerous actions",
      example: `<Button variant="destructive">Delete</Button>`,
    },

    outline: {
      description: "Border-only button (transparent background)",
      css: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      usage: "Secondary actions, alternatives",
      example: `<Button variant="outline">Outline</Button>`,
    },

    ghost: {
      description: "Minimal button (no background, no border)",
      css: "hover:bg-accent hover:text-accent-foreground",
      usage: "Tertiary actions, minimal visual weight",
      example: `<Button variant="ghost">Ghost</Button>`,
    },

    link: {
      description: "Link-style button (text only, underline)",
      css: "text-primary underline-offset-4 hover:underline",
      usage: "Navigation, link-like actions",
      example: `<Button variant="link">Link button</Button>`,
    },
  },

  states: {
    default: "Normal state",
    hover: "Cursor over button",
    active: "Button pressed/clicked",
    disabled: "Button disabled (not clickable)",
    loading: "Async operation in progress",
    focus: "Keyboard focus (for accessibility)",
  },
};

const BUTTON_PROPS = [
  {
    name: "variant",
    type: '"default" | "secondary" | "destructive" | "outline" | "ghost" | "link"',
    description: "Visual style of the button",
    default: '"default"',
  },
  {
    name: "size",
    type: '"sm" | "default" | "lg" | "icon"',
    description: "Button size/padding",
    default: '"default"',
  },
  {
    name: "disabled",
    type: "boolean",
    description: "Disable button interaction and show disabled state",
    default: "false",
  },
  {
    name: "asChild",
    type: "boolean",
    description: "Render as Link or custom element instead of button",
    default: "false",
  },
  {
    name: "onClick",
    type: "(e: React.MouseEvent) => void",
    description: "Click handler function",
    default: "undefined",
  },
  {
    name: "className",
    type: "string",
    description: "Additional CSS classes",
    default: '""',
  },
  {
    name: "type",
    type: '"button" | "submit" | "reset"',
    description: "HTML button type",
    default: '"button"',
  },
];

const BUTTON_PATTERNS = {
  primary_cta: {
    name: "Primary Call-to-Action",
    description: "Large, prominent button for main action",
    code: `<Button size="lg" variant="default">
  Get Started
</Button>`,
    use_when: "Main action on page, form submission",
  },

  submit_form: {
    name: "Form Submit",
    description: "Submit button for forms",
    code: `<Button type="submit" disabled={isLoading}>
  {isLoading ? "Submitting..." : "Submit"}
</Button>`,
    use_when: "At end of form, indicates action",
  },

  icon_button: {
    name: "Icon Button",
    description: "Small icon-only button",
    code: `<Button variant="ghost" size="icon">
  <ChevronDown className="h-4 w-4" />
  <span className="sr-only">Menu</span>
</Button>`,
    use_when: "Toolbar, menu triggers, compact spaces",
  },

  with_text_and_icon: {
    name: "Icon + Text",
    description: "Button with both icon and text",
    code: `<Button variant="default">
  <Plus className="mr-2 h-4 w-4" />
  Add Item
</Button>`,
    use_when: "Common pattern, improves UX",
  },

  link_button: {
    name: "Link-style Button",
    description: "Looks like a link but acts like button",
    code: `<Button variant="link" asChild>
  <a href="/docs">View Documentation</a>
</Button>`,
    use_when: "Navigation that should look like a link",
  },

  loading_state: {
    name: "Loading/Async",
    description: "Show loading state during async operation",
    code: `const [isLoading, setIsLoading] = useState(false);

const handleClick = async () => {
  setIsLoading(true);
  await someAsyncOperation();
  setIsLoading(false);
};

<Button onClick={handleClick} disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : (
    "Process"
  )}
</Button>`,
    use_when: "Async operations (API calls, uploads)",
  },

  destructive_action: {
    name: "Destructive Action",
    description: "Danger button for destructive actions",
    code: `<Button 
  variant="destructive" 
  onClick={() => deleteItem()}
>
  Delete Forever
</Button>`,
    use_when: "Delete, destructive operations, warnings",
  },

  group_buttons: {
    name: "Button Group",
    description: "Multiple related buttons",
    code: `<div className="flex gap-2">
  <Button variant="default">Save</Button>
  <Button variant="outline">Cancel</Button>
  <Button variant="ghost">Reset</Button>
</div>`,
    use_when: "Related actions, form controls",
  },
};

const BUTTON_A11Y = [
  {
    item: "Screen Reader Text",
    description: "Use sr-only class for icon-only buttons",
    example: '<span className="sr-only">Menu</span>',
    importance: "Critical",
  },
  {
    item: "Keyboard Navigation",
    description: "Button must be focusable with Tab key",
    example: "Press Tab to focus, Enter/Space to activate",
    importance: "Critical",
  },
  {
    item: "Focus Visible",
    description: "Clear focus indicator for keyboard users",
    example: "Browser provides default, Tailwind enhances with focus:ring",
    importance: "Critical",
  },
  {
    item: "Disabled State",
    description: "Disabled buttons should have reduced opacity, not clickable",
    example: "<Button disabled>Disabled</Button>",
    importance: "Important",
  },
  {
    item: "Color Contrast",
    description: "WCAG AA minimum 4.5:1 contrast ratio",
    example: "Default button has 8.3:1 contrast (AAA)",
    importance: "Important",
  },
  {
    item: "Touch Target Size",
    description: "Minimum 44x44px for touch targets (mobile)",
    example: "Default size (h-10) = 40px, lg (h-12) = 48px recommended",
    importance: "Important",
  },
  {
    item: "Loading State",
    description: "Clear indication of async operation",
    example: 'Spinner icon + "Loading..." text',
    importance: "Recommended",
  },
  {
    item: "Tooltip/Title",
    description: "Brief description for icon-only buttons",
    example: "<Tooltip>Information about action</Tooltip>",
    importance: "Recommended",
  },
];

const tools: Anthropic.Tool[] = [
  {
    name: "list_variants",
    description: "List all button variants and sizes",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: {
          type: "string",
          enum: ["variants", "sizes", "states", "all"],
          description: "Filter what to list",
        },
      },
      required: [],
    },
  },
  {
    name: "button_props",
    description: "Get complete props reference for Button component",
    input_schema: {
      type: "object" as const,
      properties: {
        prop_name: {
          type: "string",
          description: "Specific prop to detail (or 'all')",
        },
      },
      required: [],
    },
  },
  {
    name: "button_examples",
    description: "Get code examples for common button patterns",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Button pattern (primary_cta, submit_form, icon_button, etc.)",
        },
      },
      required: [],
    },
  },
  {
    name: "button_accessibility",
    description: "Get accessibility checklist and best practices",
    input_schema: {
      type: "object" as const,
      properties: {
        item: {
          type: "string",
          description: "Specific a11y item or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "button_recipe",
    description: "Get a complete, copy-paste ready button solution",
    input_schema: {
      type: "object" as const,
      properties: {
        use_case: {
          type: "string",
          description: "What you want the button for (e.g., 'submit form', 'delete action')",
        },
      },
      required: ["use_case"],
    },
  },
];

function execute_list_variants(filter?: string): string {
  if (!filter || filter === "all") {
    return JSON.stringify(
      {
        sizes: BUTTON_VARIANTS.sizes,
        variants: Object.fromEntries(
          Object.entries(BUTTON_VARIANTS.variants).map(([k, v]) => [
            k,
            { description: v.description, usage: v.usage },
          ]),
        ),
        states: BUTTON_VARIANTS.states,
      },
      null,
      2,
    );
  }

  if (filter === "sizes") {
    return JSON.stringify(BUTTON_VARIANTS.sizes, null, 2);
  }

  if (filter === "variants") {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(BUTTON_VARIANTS.variants).map(([k, v]) => [
          k,
          { description: v.description, usage: v.usage },
        ]),
      ),
      null,
      2,
    );
  }

  if (filter === "states") {
    return JSON.stringify(BUTTON_VARIANTS.states, null, 2);
  }

  return JSON.stringify({ error: "Invalid filter. Use: variants, sizes, states, all" }, null, 2);
}

function execute_button_props(prop_name?: string): string {
  if (!prop_name || prop_name === "all") {
    return JSON.stringify(BUTTON_PROPS, null, 2);
  }

  const prop = BUTTON_PROPS.find((p) => p.name === prop_name);
  if (prop) {
    return JSON.stringify(prop, null, 2);
  }

  return JSON.stringify(
    { error: `Prop '${prop_name}' not found`, available: BUTTON_PROPS.map((p) => p.name) },
    null,
    2,
  );
}

function execute_button_examples(pattern?: string): string {
  if (!pattern) {
    return JSON.stringify(
      {
        patterns: Object.keys(BUTTON_PATTERNS),
        note: "Specify a pattern name to get code example",
      },
      null,
      2,
    );
  }

  const pat = (BUTTON_PATTERNS as Record<string, unknown>)[pattern];
  if (pat) {
    return JSON.stringify(pat, null, 2);
  }

  return JSON.stringify(
    {
      error: `Pattern '${pattern}' not found`,
      available: Object.keys(BUTTON_PATTERNS),
    },
    null,
    2,
  );
}

function execute_button_accessibility(item?: string): string {
  if (!item || item === "all") {
    return JSON.stringify(BUTTON_A11Y, null, 2);
  }

  const a11y = BUTTON_A11Y.find((a) => a.item.toLowerCase().includes(item.toLowerCase()));
  if (a11y) {
    return JSON.stringify(a11y, null, 2);
  }

  return JSON.stringify(
    { error: `Item '${item}' not found`, available: BUTTON_A11Y.map((a) => a.item) },
    null,
    2,
  );
}

function execute_button_recipe(use_case: string): string {
  if (use_case.includes("submit")) {
    return JSON.stringify(
      {
        use_case: "Form submission",
        recipe: `import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"

export function FormSubmit() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await submitForm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      type="submit" 
      disabled={isLoading}
      onClick={handleSubmit}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? "Submitting..." : "Submit"}
    </Button>
  )
}`,
        copy_paste: true,
      },
      null,
      2,
    );
  }

  if (use_case.includes("delete")) {
    return JSON.stringify(
      {
        use_case: "Delete/destructive action",
        recipe: `<Button 
  variant="destructive" 
  size="default"
  onClick={() => {
    if (confirm("Are you sure?")) {
      deleteItem()
    }
  }}
>
  Delete
</Button>`,
        copy_paste: true,
      },
      null,
      2,
    );
  }

  if (use_case.includes("icon")) {
    return JSON.stringify(
      {
        use_case: "Icon-only button",
        recipe: `import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

<Button variant="ghost" size="icon">
  <Menu className="h-4 w-4" />
  <span className="sr-only">Open menu</span>
</Button>`,
        copy_paste: true,
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      default: "Primary action button",
      recipe: `<Button variant="default" size="lg">
  Click me
</Button>`,
      copy_paste: true,
    },
    null,
    2,
  );
}

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "list_variants":
      return execute_list_variants(tool_input.filter);
    case "button_props":
      return execute_button_props(tool_input.prop_name);
    case "button_examples":
      return execute_button_examples(tool_input.pattern);
    case "button_accessibility":
      return execute_button_accessibility(tool_input.item);
    case "button_recipe":
      return execute_button_recipe(tool_input.use_case);
    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();

  console.log("🎯 Shadcn UI Button MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools for agent access`);
  console.log("---");

  // Example: Query button variants
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "I need to build a submit button for a form. What are my options?",
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

  // Agentic loop
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
    const tool_result = process_tool_call(tool_name, tool_input);

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

    response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });

    console.log(`Stop Reason: ${response.stop_reason}`);
  }

  const final_text_block = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  if (final_text_block) {
    console.log("\n📝 Final Response:");
    console.log(final_text_block.text);
  }

  console.log("\n✅ Button MCP Demo Complete");
}

main().catch(console.error);
