#!/usr/bin/env node

/**
 * Shadcn UI Input MCP Server
 *
 * Exposes Shadcn Input component documentation for text fields
 * Allows agents to query input types, validation, masks, accessibility
 *
 * Tools: list_types, input_props, validation_patterns, input_masks, accessibility, examples
 */

import Anthropic from "@anthropic-ai/sdk";

const INPUT_TYPES = {
  text: {
    description: "General text input",
    html: 'type="text"',
    use: "Names, generic text",
    validation: "Custom (no built-in)",
  },
  email: {
    description: "Email address input",
    html: 'type="email"',
    use: "Email addresses",
    validation: "Basic email pattern",
  },
  password: {
    description: "Hidden/masked password input",
    html: 'type="password"',
    use: "Passwords (hide characters)",
    validation: "Custom (check length, strength)",
  },
  number: {
    description: "Numeric input",
    html: 'type="number"',
    use: "Ages, quantities, prices",
    validation: "Range (min/max)",
  },
  tel: {
    description: "Telephone number input",
    html: 'type="tel"',
    use: "Phone numbers",
    validation: "Pattern (regex for format)",
  },
  url: {
    description: "URL input",
    html: 'type="url"',
    use: "Website URLs",
    validation: "URL format",
  },
  date: {
    description: "Date picker input",
    html: 'type="date"',
    use: "Birth dates, event dates",
    validation: "ISO date format",
  },
  search: {
    description: "Search field input",
    html: 'type="search"',
    use: "Search bars",
    validation: "Custom",
  },
};

const INPUT_PROPS = [
  {
    name: "type",
    type: "string",
    description: "HTML input type (text, email, password, etc)",
    default: '"text"',
  },
  {
    name: "placeholder",
    type: "string",
    description: "Placeholder text when empty",
    default: '""',
  },
  {
    name: "disabled",
    type: "boolean",
    description: "Disable input",
    default: "false",
  },
  {
    name: "required",
    type: "boolean",
    description: "Mark as required field",
    default: "false",
  },
  {
    name: "value",
    type: "string",
    description: "Current input value",
    default: '""',
  },
  {
    name: "onChange",
    type: "(e: React.ChangeEvent) => void",
    description: "Change event handler",
    default: "undefined",
  },
  {
    name: "className",
    type: "string",
    description: "Additional CSS classes",
    default: '""',
  },
  {
    name: "autoComplete",
    type: "string",
    description: "Autocomplete hint (email, name, tel, etc)",
    default: '"off"',
  },
];

const VALIDATION_PATTERNS = {
  email: {
    pattern: "/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/",
    description: "Basic email validation",
    zod: 'z.string().email("Invalid email")',
    react_hook_form:
      'pattern: { value: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, message: "Invalid email" }',
  },

  password: {
    pattern: "Minimum 8 chars + uppercase + lowercase + number + symbol",
    description: "Strong password validation",
    zod: "z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[!@#$%^&*]/)",
    react_hook_form:
      'pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[a-zA-Z\\d!@#$%^&*]{8,}$/, message: "Must be 8+ chars with uppercase, lowercase, number, symbol" }',
  },

  phone: {
    pattern: "/^[\\d\\s\\-\\(\\)\\+]+$/",
    description: "Phone number format",
    zod: 'z.string().regex(/^[\\d\\s\\-\\(\\)\\+]+$/, "Invalid phone")',
    react_hook_form: 'pattern: { value: /^[\\d\\s\\-\\(\\)\\+]+$/, message: "Invalid phone" }',
  },

  url: {
    pattern: "URL format validation",
    description: "Website URL",
    zod: 'z.string().url("Invalid URL")',
    react_hook_form: 'pattern: { value: /^https?:\\/\\/.+/, message: "Invalid URL" }',
  },

  number_range: {
    pattern: "min: X, max: Y",
    description: "Numeric range validation",
    zod: "z.coerce.number().min(0).max(100)",
    react_hook_form: "min: 0, max: 100",
  },
};

const INPUT_MASKS = {
  phone_us: {
    format: "(XXX) XXX-XXXX",
    example: "(555) 123-4567",
    library: "react-input-mask or imask",
    code: '<IMaskInput mask="(999) 999-9999" />',
  },

  credit_card: {
    format: "XXXX XXXX XXXX XXXX",
    example: "4532 1234 5678 9010",
    library: "react-input-mask",
    code: '<IMaskInput mask="9999 9999 9999 9999" />',
  },

  date_us: {
    format: "MM/DD/YYYY",
    example: "12/25/2024",
    library: "react-input-mask",
    code: '<IMaskInput mask="99/99/9999" />',
  },

  ssn: {
    format: "XXX-XX-XXXX",
    example: "123-45-6789",
    library: "react-input-mask",
    code: '<IMaskInput mask="999-99-9999" />',
  },

  zip_code: {
    format: "XXXXX or XXXXX-XXXX",
    example: "12345 or 12345-6789",
    library: "react-input-mask",
    code: '<IMaskInput mask="99999[-9999]" />',
  },
};

const INPUT_A11Y = [
  {
    item: "Label Association",
    description: "Link input with label using htmlFor",
    example: '<label htmlFor="email">Email:</label><input id="email" type="email" />',
    importance: "Critical",
  },
  {
    item: "Required Indicator",
    description: "Mark required fields with * and required attribute",
    example: '<label>Email <span className="text-red-500">*</span></label><input required />',
    importance: "Important",
  },
  {
    item: "Error Messages",
    description: "Display validation errors near input",
    example: '{error && <span className="text-red-500">{error}</span>}',
    importance: "Critical",
  },
  {
    item: "Placeholder vs Label",
    description: "Use label as main description, placeholder as hint only",
    example: '<label>Email</label><input placeholder="john@example.com" />',
    importance: "Important",
  },
  {
    item: "Focus Visible",
    description: "Clear focus indicator for keyboard users",
    example: "Browser provides default, Tailwind enhances with focus:ring",
    importance: "Critical",
  },
  {
    item: "Type Attribute",
    description: "Use correct type (email, tel, etc) for mobile keyboards",
    example: 'type="email" triggers email keyboard on mobile',
    importance: "Important",
  },
  {
    item: "autoComplete",
    description: "Hint browser for autofill (email, name, tel)",
    example: '<input type="email" autoComplete="email" />',
    importance: "Recommended",
  },
];

const tools: Anthropic.Tool[] = [
  {
    name: "list_types",
    description: "List all input types and their uses",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "input_props",
    description: "Get props reference for Input component",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "validation_patterns",
    description: "Get validation patterns (email, password, phone, etc)",
    input_schema: {
      type: "object" as const,
      properties: { pattern_type: { type: "string" } },
      required: [],
    },
  },
  {
    name: "input_masks",
    description: "Get input masking examples (phone, card, date, etc)",
    input_schema: {
      type: "object" as const,
      properties: { mask_type: { type: "string" } },
      required: [],
    },
  },
  {
    name: "accessibility",
    description: "Get a11y checklist for input fields",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "email_field_recipe",
    description: "Get copy-paste ready email field with validation",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "list_types":
      return JSON.stringify(INPUT_TYPES, null, 2);

    case "input_props":
      return JSON.stringify(INPUT_PROPS, null, 2);

    case "validation_patterns":
      const ptype = tool_input.pattern_type || "all";
      if (ptype === "all") {
        return JSON.stringify(VALIDATION_PATTERNS, null, 2);
      }
      return JSON.stringify(
        (VALIDATION_PATTERNS as any)[ptype] || { error: "Pattern not found" },
        null,
        2,
      );

    case "input_masks":
      const mtype = tool_input.mask_type || "all";
      if (mtype === "all") {
        return JSON.stringify(INPUT_MASKS, null, 2);
      }
      return JSON.stringify((INPUT_MASKS as any)[mtype] || { error: "Mask not found" }, null, 2);

    case "accessibility":
      return JSON.stringify(INPUT_A11Y, null, 2);

    case "email_field_recipe":
      return JSON.stringify(
        {
          description: "Complete email field with React Hook Form",
          recipe: `import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { z } from "zod"

const schema = z.object({
  email: z.string().email("Invalid email address"),
})

export function EmailField() {
  const { register, formState: { errors } } = useForm()

  return (
    <div className="space-y-2">
      <label htmlFor="email">
        Email <span className="text-red-500">*</span>
      </label>
      <Input
        id="email"
        type="email"
        placeholder="john@example.com"
        autoComplete="email"
        {...register("email")}
        className={errors.email ? "border-red-500" : ""}
      />
      {errors.email && (
        <span className="text-sm text-red-500">{errors.email.message}</span>
      )}
    </div>
  )
}`,
          copy_paste: true,
        },
        null,
        2,
      );

    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();
  console.log("✉️ Shadcn UI Input MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools`);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Build an email input field with validation",
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

  console.log("✅ Input MCP Ready");
}

main().catch(console.error);
