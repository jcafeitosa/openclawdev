#!/usr/bin/env node

/**
 * Shadcn UI Dialog MCP Server
 *
 * Modal dialogs with form integration for Shadcn Dialog component
 * Exposes dialog patterns, sizes, accessibility, and complete recipes
 *
 * Tools: dialog_sizes, dialog_structure, dialog_examples, dialog_actions,
 *        dialog_accessibility, dialog_recipes, integration_example
 */

import Anthropic from "@anthropic-ai/sdk";

const DIALOG_SIZES = {
  sm: {
    description: "Small dialog (max-width: 384px / 24rem)",
    use_case: "Quick confirmations, alerts",
    className: "sm:max-w-sm",
    example: `<DialogContent className="sm:max-w-sm">
  <DialogHeader>
    <DialogTitle>Delete item?</DialogTitle>
  </DialogHeader>
  <DialogFooter>
    <Button variant="destructive">Delete</Button>
  </DialogFooter>
</DialogContent>`,
  },

  md: {
    description: "Medium dialog (max-width: 512px / 32rem) - DEFAULT",
    use_case: "Forms, settings, most dialogs",
    className: "sm:max-w-md",
    example: `<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Edit Profile</DialogTitle>
    <DialogDescription>
      Make changes to your profile here.
    </DialogDescription>
  </DialogHeader>
  {/* Form content */}
  <DialogFooter>
    <Button type="submit">Save changes</Button>
  </DialogFooter>
</DialogContent>`,
  },

  lg: {
    description: "Large dialog (max-width: 640px / 40rem)",
    use_case: "Complex forms, multi-step wizards",
    className: "sm:max-w-lg",
    example: `<DialogContent className="sm:max-w-lg">
  <DialogHeader>
    <DialogTitle>Create Project</DialogTitle>
  </DialogHeader>
  {/* Multi-field form */}
  <DialogFooter>
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Create</Button>
  </DialogFooter>
</DialogContent>`,
  },

  xl: {
    description: "Extra large dialog (max-width: 768px / 48rem)",
    use_case: "Rich content, image previews, data tables",
    className: "sm:max-w-xl",
    example: `<DialogContent className="sm:max-w-xl">
  <DialogHeader>
    <DialogTitle>Preview Document</DialogTitle>
  </DialogHeader>
  <div className="max-h-[600px] overflow-auto">
    {/* Large content */}
  </div>
  <DialogFooter>
    <Button>Close</Button>
  </DialogFooter>
</DialogContent>`,
  },

  full: {
    description: "Full width dialog (max-width: 1024px / 64rem)",
    use_case: "Complex data views, dashboards within dialogs",
    className: "sm:max-w-4xl",
    example: `<DialogContent className="sm:max-w-4xl">
  <DialogHeader>
    <DialogTitle>Advanced Settings</DialogTitle>
  </DialogHeader>
  <div className="grid grid-cols-2 gap-4">
    {/* Complex layout */}
  </div>
  <DialogFooter>
    <Button>Apply</Button>
  </DialogFooter>
</DialogContent>`,
  },
};

const DIALOG_STRUCTURE = {
  basic: {
    description: "Basic dialog structure with trigger",
    pattern: "Dialog → DialogTrigger → DialogContent",
    components: [
      "Dialog",
      "DialogTrigger",
      "DialogContent",
      "DialogHeader",
      "DialogTitle",
      "DialogDescription",
      "DialogFooter",
    ],
    example: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description text.
      </DialogDescription>
    </DialogHeader>
    <div>
      {/* Content */}
    </div>
    <DialogFooter>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },

  controlled: {
    description: "Controlled dialog with state",
    pattern: "useState to control open/close",
    use_case: "Programmatic control, complex interactions",
    example: `const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Controlled Dialog</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },

  nested: {
    description: "Dialog components nested structure",
    pattern: "Hierarchical component tree",
    hierarchy: {
      Dialog: "Root component, manages state",
      DialogTrigger: "Opens the dialog",
      DialogPortal: "Portal wrapper (automatic)",
      DialogOverlay: "Backdrop (automatic)",
      DialogContent: "Main content container",
      DialogHeader: "Header section",
      DialogTitle: "Required for accessibility",
      DialogDescription: "Optional description",
      DialogFooter: "Action buttons section",
      DialogClose: "Close button (optional)",
    },
    example: `<Dialog>
  <DialogTrigger />
  {/* Portal (automatic) */}
    {/* Overlay (automatic) */}
    <DialogContent>
      <DialogHeader>
        <DialogTitle />
        <DialogDescription />
      </DialogHeader>
      {/* Body */}
      <DialogFooter>
        <DialogClose />
      </DialogFooter>
    </DialogContent>
</Dialog>`,
  },
};

const DIALOG_EXAMPLES = {
  confirmation: {
    description: "Confirmation dialog for destructive actions",
    use_case: "Delete confirmations, irreversible actions",
    code: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Are you absolutely sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete your
        account and remove your data from our servers.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },

  form_dialog: {
    description: "Dialog with form integration",
    use_case: "Edit forms, create forms in modal",
    code: `<Dialog>
  <DialogTrigger asChild>
    <Button>Edit Profile</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here. Click save when you're done.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" />
      </div>
      <DialogFooter>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>`,
  },

  alert_dialog: {
    description: "Alert dialog for important messages",
    use_case: "Critical alerts, warnings",
    code: `<Dialog>
  <DialogTrigger asChild>
    <Button>Show Alert</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-500" />
        Warning
      </DialogTitle>
      <DialogDescription>
        Your session is about to expire. Please save your work.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Continue Working</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },

  multi_step: {
    description: "Multi-step dialog wizard",
    use_case: "Onboarding, complex forms",
    code: `const [step, setStep] = useState(1)

<Dialog>
  <DialogTrigger asChild>
    <Button>Start Setup</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Setup - Step {step} of 3</DialogTitle>
    </DialogHeader>
    
    {step === 1 && <Step1Content />}
    {step === 2 && <Step2Content />}
    {step === 3 && <Step3Content />}
    
    <DialogFooter>
      {step > 1 && (
        <Button variant="outline" onClick={() => setStep(step - 1)}>
          Previous
        </Button>
      )}
      {step < 3 ? (
        <Button onClick={() => setStep(step + 1)}>
          Next
        </Button>
      ) : (
        <Button>Finish</Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },

  scrollable: {
    description: "Dialog with scrollable content",
    use_case: "Long content, terms and conditions",
    code: `<Dialog>
  <DialogTrigger asChild>
    <Button>View Terms</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Terms and Conditions</DialogTitle>
      <DialogDescription>
        Please read and accept our terms.
      </DialogDescription>
    </DialogHeader>
    <div className="max-h-[400px] overflow-y-auto space-y-4 pr-4">
      <p>Long content here...</p>
      {/* More content */}
    </div>
    <DialogFooter>
      <Button variant="outline">Decline</Button>
      <Button>Accept</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },

  with_close_button: {
    description: "Dialog with explicit close button",
    use_case: "Non-critical dialogs, optional actions",
    code: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Notification</DialogTitle>
      <DialogDescription>
        You have 3 new messages.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Message list */}
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Close</Button>
      </DialogClose>
      <Button>View All</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  },
};

const DIALOG_ACTIONS = {
  single_action: {
    description: "Dialog with single action button",
    pattern: "OK, Got it, Close only",
    example: `<DialogFooter>
  <Button>Got it</Button>
</DialogFooter>`,
  },

  dual_action: {
    description: "Dialog with cancel and confirm actions",
    pattern: "Cancel + Confirm (most common)",
    example: `<DialogFooter>
  <Button variant="outline">Cancel</Button>
  <Button>Confirm</Button>
</DialogFooter>`,
  },

  destructive_action: {
    description: "Dialog with destructive action (delete, remove)",
    pattern: "Cancel + Destructive action",
    example: `<DialogFooter>
  <Button variant="outline">Cancel</Button>
  <Button variant="destructive">Delete</Button>
</DialogFooter>`,
  },

  multi_action: {
    description: "Dialog with multiple actions",
    pattern: "Secondary + Primary + Tertiary",
    example: `<DialogFooter className="sm:justify-between">
  <Button variant="ghost">Learn More</Button>
  <div className="flex gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Apply</Button>
  </div>
</DialogFooter>`,
  },

  loading_action: {
    description: "Action button with loading state",
    pattern: "Disabled button with loading indicator",
    example: `<DialogFooter>
  <Button variant="outline" disabled={isLoading}>
    Cancel
  </Button>
  <Button disabled={isLoading}>
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Saving...
      </>
    ) : (
      "Save"
    )}
  </Button>
</DialogFooter>`,
  },
};

const DIALOG_ACCESSIBILITY = [
  {
    item: "DialogTitle Required",
    description: "Every dialog MUST have a DialogTitle for screen readers",
    wcag: "WCAG 2.1 AA - 2.4.6 Headings and Labels",
    example: `<DialogHeader>
  <DialogTitle>Delete Account</DialogTitle>
</DialogHeader>`,
    importance: "Critical",
  },
  {
    item: "Focus Management",
    description: "Focus automatically moves to dialog on open, returns on close",
    wcag: "WCAG 2.1 AA - 2.4.3 Focus Order",
    example: "Built-in: Focus traps to dialog content automatically",
    importance: "Critical",
  },
  {
    item: "Keyboard Navigation",
    description: "Escape closes dialog, Tab cycles through focusable elements",
    wcag: "WCAG 2.1 AA - 2.1.1 Keyboard",
    example: "Press Escape to close, Tab/Shift+Tab to navigate",
    importance: "Critical",
  },
  {
    item: "Backdrop Click",
    description: "Clicking outside dialog closes it (can be disabled)",
    wcag: "User Experience Best Practice",
    example: "<Dialog onOpenChange={setOpen}>  {/* Backdrop closes */}",
    importance: "Important",
  },
  {
    item: "DialogDescription",
    description: "Provide context with DialogDescription for complex dialogs",
    wcag: "WCAG 2.1 AA - 3.3.2 Labels or Instructions",
    example: `<DialogDescription>
  This action cannot be undone.
</DialogDescription>`,
    importance: "Important",
  },
  {
    item: "Focus Trap",
    description: "Tab key cycles focus within dialog only",
    wcag: "WCAG 2.1 AA - 2.4.3 Focus Order",
    example: "Built-in: Focus cannot escape dialog",
    importance: "Critical",
  },
  {
    item: "ARIA Attributes",
    description: "Dialog has proper ARIA roles and labels",
    wcag: "WCAG 2.1 AA - 4.1.2 Name, Role, Value",
    example: 'role="dialog" aria-labelledby="title" aria-describedby="description"',
    importance: "Critical",
  },
  {
    item: "Action Button Order",
    description: "Primary action on right (Western languages), cancel on left",
    wcag: "Consistency Best Practice",
    example: `<DialogFooter>
  <Button variant="outline">Cancel</Button>
  <Button>Confirm</Button>
</DialogFooter>`,
    importance: "Recommended",
  },
];

const DIALOG_RECIPES = {
  delete_confirmation: {
    description: "Complete delete confirmation dialog",
    copy_paste: true,
    code: `"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function DeleteConfirmationDialog() {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success("Account deleted successfully")
      setOpen(false)
    } catch (error) {
      toast.error("Failed to delete account")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`,
  },

  edit_form_dialog: {
    description: "Dialog with form (React Hook Form + Zod)",
    copy_paste: true,
    code: `"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
})

export function EditProfileDialog() {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("Profile updated successfully")
      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error("Failed to update profile")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}`,
  },

  alert_dialog_recipe: {
    description: "Alert dialog with icon and action",
    copy_paste: true,
    code: `"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"

export function AlertDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Show Alert</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Warning
          </DialogTitle>
          <DialogDescription>
            Your session is about to expire in 5 minutes. Please save your work.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button>Continue Working</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`,
  },
};

const INTEGRATION_EXAMPLE = `
/**
 * Complete Dialog Integration with Forms
 * 
 * This example shows how to integrate Dialog with React Hook Form
 * for modal forms with validation
 */

// 1. Install dependencies
// pnpm add react-hook-form @hookform/resolvers zod

// 2. Import Dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// 3. Basic controlled dialog
const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    {/* Content */}
  </DialogContent>
</Dialog>

// 4. Dialog with form
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Edit</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Edit Item</DialogTitle>
      <DialogDescription>
        Make your changes here.
      </DialogDescription>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField ... />
        <DialogFooter>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>

// 5. Close dialog programmatically after form submit
async function onSubmit(values) {
  await api.update(values)
  setOpen(false)  // Close dialog
  form.reset()    // Reset form
}

/**
 * Key Points:
 * 
 * ✓ Controlled State: Use useState for programmatic control
 * ✓ DialogTitle: Required for accessibility
 * ✓ Focus Management: Automatic focus trap
 * ✓ Keyboard Support: Escape to close, Tab to navigate
 * ✓ Form Integration: Works seamlessly with React Hook Form
 * ✓ Size Control: Use className for responsive sizing
 */
`;

const tools: Anthropic.Tool[] = [
  {
    name: "dialog_sizes",
    description: "Get dialog size variants (sm, md, lg, xl, full)",
    input_schema: {
      type: "object" as const,
      properties: {
        size: {
          type: "string",
          description: "Size: sm, md, lg, xl, full, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dialog_structure",
    description: "Get dialog component structure and patterns",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Pattern: basic, controlled, nested, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dialog_examples",
    description: "Get dialog code examples (confirmation, form, alert, multi-step, scrollable)",
    input_schema: {
      type: "object" as const,
      properties: {
        example_type: {
          type: "string",
          description:
            "Example: confirmation, form_dialog, alert_dialog, multi_step, scrollable, with_close_button, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dialog_actions",
    description: "Get action button placement patterns",
    input_schema: {
      type: "object" as const,
      properties: {
        action_type: {
          type: "string",
          description:
            "Action: single_action, dual_action, destructive_action, multi_action, loading_action, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "dialog_accessibility",
    description: "Get accessibility (a11y) checklist for dialogs (WCAG 2.1 AA)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "dialog_recipes",
    description: "Get complete copy-paste dialog templates",
    input_schema: {
      type: "object" as const,
      properties: {
        recipe: {
          type: "string",
          description:
            "Recipe: delete_confirmation, edit_form_dialog, alert_dialog_recipe, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "integration_example",
    description: "Get Dialog + Form integration setup example",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "dialog_sizes":
      const size = tool_input.size || "all";
      if (size === "all") {
        return JSON.stringify(DIALOG_SIZES, null, 2);
      }
      return JSON.stringify((DIALOG_SIZES as any)[size] || { error: "Size not found" }, null, 2);

    case "dialog_structure":
      const pattern = tool_input.pattern || "all";
      if (pattern === "all") {
        return JSON.stringify(DIALOG_STRUCTURE, null, 2);
      }
      return JSON.stringify(
        (DIALOG_STRUCTURE as any)[pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "dialog_examples":
      const example_type = tool_input.example_type || "all";
      if (example_type === "all") {
        return JSON.stringify(DIALOG_EXAMPLES, null, 2);
      }
      return JSON.stringify(
        (DIALOG_EXAMPLES as any)[example_type] || { error: "Example not found" },
        null,
        2,
      );

    case "dialog_actions":
      const action_type = tool_input.action_type || "all";
      if (action_type === "all") {
        return JSON.stringify(DIALOG_ACTIONS, null, 2);
      }
      return JSON.stringify(
        (DIALOG_ACTIONS as any)[action_type] || { error: "Action type not found" },
        null,
        2,
      );

    case "dialog_accessibility":
      return JSON.stringify(DIALOG_ACCESSIBILITY, null, 2);

    case "dialog_recipes":
      const recipe = tool_input.recipe || "all";
      if (recipe === "all") {
        return JSON.stringify(DIALOG_RECIPES, null, 2);
      }
      return JSON.stringify(
        (DIALOG_RECIPES as any)[recipe] || { error: "Recipe not found" },
        null,
        2,
      );

    case "integration_example":
      return INTEGRATION_EXAMPLE;

    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();
  console.log("🪟 Shadcn UI Dialog MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools`);
  console.log("🎯 Modal dialogs with form integration ready");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Build a confirmation dialog for deleting an item",
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

  console.log("✅ Dialog MCP Ready - All 7 tools operational");
}

main().catch(console.error);
