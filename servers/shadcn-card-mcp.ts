#!/usr/bin/env node

/**
 * Shadcn UI Card MCP Server
 *
 * Exposes Shadcn Card component documentation
 * Simple, minimal server for card layouts
 *
 * Tools: list_components, card_props, card_examples, responsive_config
 */

import Anthropic from "@anthropic-ai/sdk";

const CARD_COMPONENTS = {
  Card: {
    description: "Main card container",
    props: ["className"],
    default_class: "rounded-lg border bg-card text-card-foreground shadow-sm",
  },

  CardHeader: {
    description: "Card header section (top)",
    props: ["className"],
    default_class: "flex flex-col space-y-1.5 p-6",
  },

  CardFooter: {
    description: "Card footer section (bottom)",
    props: ["className"],
    default_class: "flex items-center p-6 pt-0",
  },

  CardTitle: {
    description: "Card title heading",
    props: ["className"],
    default_class: "text-2xl font-semibold leading-none tracking-tight",
  },

  CardDescription: {
    description: "Card description text",
    props: ["className"],
    default_class: "text-sm text-muted-foreground",
  },

  CardContent: {
    description: "Card main content area",
    props: ["className"],
    default_class: "p-6 pt-0",
  },
};

const CARD_EXAMPLES = {
  basic: {
    name: "Basic Card",
    description: "Simple card with content",
    code: `<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>`,
  },

  with_description: {
    name: "Card with Description",
    description: "Card with title and description",
    code: `<Card>
  <CardHeader>
    <CardTitle>Settings</CardTitle>
    <CardDescription>Manage your account settings</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>`,
  },

  with_footer: {
    name: "Card with Footer",
    description: "Card with header, content, and footer actions",
    code: `<Card>
  <CardHeader>
    <CardTitle>Confirm Action</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Are you sure?</p>
  </CardContent>
  <CardFooter>
    <Button>Confirm</Button>
    <Button variant="outline">Cancel</Button>
  </CardFooter>
</Card>`,
  },

  user_profile: {
    name: "User Profile Card",
    description: "Card showing user information",
    code: `<Card className="w-full max-w-sm">
  <CardHeader>
    <CardTitle>John Doe</CardTitle>
    <CardDescription>john@example.com</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Software Engineer at Acme Inc</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline" className="w-full">View Profile</Button>
  </CardFooter>
</Card>`,
  },

  grid_layout: {
    name: "Card Grid",
    description: "Multiple cards in responsive grid",
    code: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map((item) => (
    <Card key={item.id}>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{item.description}</p>
      </CardContent>
    </Card>
  ))}
</div>`,
  },
};

const RESPONSIVE_CONFIG = {
  default: {
    width: "w-full",
    padding: "p-6",
    spacing: "space-y-4",
    description: "Default responsive (full width)",
  },

  contained: {
    width: "w-full max-w-2xl mx-auto",
    padding: "p-6",
    spacing: "space-y-4",
    description: "Contained width with auto margins",
  },

  sidebar_card: {
    width: "w-full",
    padding: "p-4",
    spacing: "space-y-2",
    description: "Compact card for sidebars",
  },

  grid_item: {
    width: "w-full",
    padding: "p-6",
    spacing: "space-y-3",
    description: "Grid-friendly card sizing",
  },

  mobile_first: {
    mobile: { width: "w-full", padding: "p-4" },
    tablet: { width: "w-full", padding: "p-5" },
    desktop: { width: "w-full max-w-lg", padding: "p-6" },
    description: "Responsive padding and width",
    classes: "p-4 sm:p-5 md:p-6",
  },
};

const SPACING_VARIANTS = {
  compact: {
    header: "p-4",
    content: "p-4 pt-0",
    footer: "p-4 pt-0",
    description: "Tight spacing for dense UIs",
  },

  normal: {
    header: "p-6",
    content: "p-6 pt-0",
    footer: "p-6 pt-0",
    description: "Default spacing (recommended)",
  },

  spacious: {
    header: "p-8",
    content: "p-8 pt-0",
    footer: "p-8 pt-0",
    description: "Extra padding for breathing room",
  },
};

const tools: Anthropic.Tool[] = [
  {
    name: "list_components",
    description: "List all Card sub-components",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "card_props",
    description: "Get props for Card components",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "card_examples",
    description: "Get code examples for card patterns",
    input_schema: {
      type: "object" as const,
      properties: { pattern: { type: "string" } },
      required: [],
    },
  },
  {
    name: "responsive_config",
    description: "Get responsive sizing and spacing configurations",
    input_schema: {
      type: "object" as const,
      properties: { config_type: { type: "string" } },
      required: [],
    },
  },
  {
    name: "spacing_variants",
    description: "Get padding/spacing variants (compact, normal, spacious)",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "list_components":
      return JSON.stringify(
        {
          components: Object.keys(CARD_COMPONENTS),
          note: "All components are compositional - combine as needed",
        },
        null,
        2,
      );

    case "card_props":
      return JSON.stringify(
        {
          all_components: CARD_COMPONENTS,
          note: "All Card components accept className for customization",
        },
        null,
        2,
      );

    case "card_examples":
      const pattern = tool_input.pattern || "all";
      if (pattern === "all") {
        return JSON.stringify(
          {
            patterns: Object.keys(CARD_EXAMPLES),
            note: "Use pattern=name to get specific example",
          },
          null,
          2,
        );
      }
      return JSON.stringify(
        (CARD_EXAMPLES as any)[pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "responsive_config":
      const config = tool_input.config_type || "all";
      if (config === "all") {
        return JSON.stringify(RESPONSIVE_CONFIG, null, 2);
      }
      return JSON.stringify(
        (RESPONSIVE_CONFIG as any)[config] || { error: "Config not found" },
        null,
        2,
      );

    case "spacing_variants":
      return JSON.stringify(SPACING_VARIANTS, null, 2);

    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();
  console.log("📦 Shadcn UI Card MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools`);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Show me how to build a user profile card",
    },
  ];

  let response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
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
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });
  }

  console.log("✅ Card MCP Ready");
}

main().catch(console.error);
