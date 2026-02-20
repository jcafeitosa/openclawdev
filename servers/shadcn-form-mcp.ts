#!/usr/bin/env node

/**
 * Shadcn UI Form MCP Server
 *
 * React Hook Form + Zod validation integration for Shadcn Form component
 * Exposes form patterns, validation schemas, error handling, and complete recipes
 *
 * Tools: form_structure, validation_schemas, error_handling, submit_patterns,
 *        field_components, form_recipes, accessibility, integration_example
 */

import Anthropic from "@anthropic-ai/sdk";

const FORM_STRUCTURES = {
  basic: {
    description: "Simple form with React Hook Form",
    pattern: "Single FormProvider with fields",
    use_case: "Login, simple contact forms",
    structure: {
      wrapper: "FormProvider",
      fields: "FormField components",
      submit: "handleSubmit wrapper",
    },
    example: `<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="email" />
    <Button type="submit">Submit</Button>
  </form>
</Form>`,
  },

  multi_step: {
    description: "Multi-step form with progress",
    pattern: "State machine + conditional rendering",
    use_case: "Signup wizards, onboarding",
    structure: {
      state: "Step counter",
      validation: "Per-step schemas",
      navigation: "Next/Previous buttons",
    },
    example: `const [step, setStep] = useState(0)
const schemas = [step1Schema, step2Schema, step3Schema]

<Form {...form}>
  {step === 0 && <Step1Fields />}
  {step === 1 && <Step2Fields />}
  {step === 2 && <Step3Fields />}
</Form>`,
  },

  dynamic_fields: {
    description: "Form with dynamic field arrays",
    pattern: "useFieldArray hook",
    use_case: "Item lists, multiple contacts",
    structure: {
      array: "useFieldArray",
      add: "append() method",
      remove: "remove(index) method",
    },
    example: `const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "items"
})

{fields.map((field, index) => (
  <FormField key={field.id} name={\`items.\${index}.value\`} />
))}`,
  },

  nested_forms: {
    description: "Forms with nested objects",
    pattern: "Dot notation field names",
    use_case: "Address forms, complex data",
    structure: {
      schema: "Nested Zod objects",
      fields: "Dot notation (user.address.street)",
      validation: "Deep validation",
    },
    example: `const schema = z.object({
  user: z.object({
    address: z.object({
      street: z.string(),
      city: z.string()
    })
  })
})

<FormField name="user.address.street" />`,
  },
};

const VALIDATION_SCHEMAS = {
  login: {
    description: "Login form validation",
    fields: ["email", "password"],
    schema: `import { z } from "zod"

const loginSchema = z.object({
  email: z.string()
    .email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
})

type LoginForm = z.infer<typeof loginSchema>`,
  },

  signup: {
    description: "Signup form with password confirmation",
    fields: ["email", "password", "confirmPassword"],
    schema: `import { z } from "zod"

const signupSchema = z.object({
  email: z.string()
    .email("Invalid email address"),
  password: z.string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupForm = z.infer<typeof signupSchema>`,
  },

  contact: {
    description: "Contact form with message",
    fields: ["name", "email", "subject", "message"],
    schema: `import { z } from "zod"

const contactSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters"),
  email: z.string()
    .email("Invalid email address"),
  subject: z.string()
    .min(5, "Subject must be at least 5 characters"),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(500, "Message too long (max 500 characters)"),
})

type ContactForm = z.infer<typeof contactSchema>`,
  },

  profile: {
    description: "User profile with optional fields",
    fields: ["username", "bio", "website", "twitter"],
    schema: `import { z } from "zod"

const profileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  bio: z.string()
    .max(160, "Bio too long")
    .optional(),
  website: z.string()
    .url("Invalid URL")
    .optional()
    .or(z.literal("")),
  twitter: z.string()
    .regex(/^@?[a-zA-Z0-9_]+$/, "Invalid Twitter handle")
    .optional()
    .or(z.literal("")),
})

type ProfileForm = z.infer<typeof profileSchema>`,
  },

  payment: {
    description: "Payment form with card validation",
    fields: ["cardNumber", "expiry", "cvv", "name"],
    schema: `import { z } from "zod"

const paymentSchema = z.object({
  cardNumber: z.string()
    .regex(/^[0-9]{16}$/, "Invalid card number"),
  expiry: z.string()
    .regex(/^(0[1-9]|1[0-2])\\/[0-9]{2}$/, "Format: MM/YY"),
  cvv: z.string()
    .regex(/^[0-9]{3,4}$/, "Invalid CVV"),
  name: z.string()
    .min(3, "Name on card required"),
})

type PaymentForm = z.infer<typeof paymentSchema>`,
  },
};

const ERROR_HANDLING = {
  field_errors: {
    description: "Display validation errors per field",
    pattern: "FormMessage component",
    example: `<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* Auto displays error */}
    </FormItem>
  )}
/>`,
  },

  manual_errors: {
    description: "Set custom errors programmatically",
    pattern: "setError method",
    example: `form.setError("email", {
  type: "manual",
  message: "This email is already taken"
})

// Or root-level errors
form.setError("root", {
  type: "server",
  message: "Server error, please try again"
})`,
  },

  async_validation: {
    description: "Async validation (check username availability)",
    pattern: "Zod refine with async",
    example: `const schema = z.object({
  username: z.string()
    .min(3)
    .refine(async (username) => {
      const available = await checkUsername(username)
      return available
    }, {
      message: "Username already taken"
    })
})`,
  },

  error_summary: {
    description: "Display all errors at top of form",
    pattern: "errors object iteration",
    example: `{Object.keys(form.formState.errors).length > 0 && (
  <Alert variant="destructive">
    <AlertTitle>Please fix the following errors:</AlertTitle>
    <AlertDescription>
      <ul className="list-disc pl-4">
        {Object.entries(form.formState.errors).map(([field, error]) => (
          <li key={field}>{error.message}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}`,
  },
};

const SUBMIT_PATTERNS = {
  basic_submit: {
    description: "Simple form submission",
    pattern: "handleSubmit wrapper",
    example: `const onSubmit = (data: LoginForm) => {
  console.log(data)
  // Send to API
}

<form onSubmit={form.handleSubmit(onSubmit)}>
  {/* fields */}
  <Button type="submit">Submit</Button>
</form>`,
  },

  async_submit: {
    description: "Async submission with loading state",
    pattern: "isSubmitting state",
    example: `const onSubmit = async (data: LoginForm) => {
  try {
    await api.login(data)
    toast.success("Login successful!")
  } catch (error) {
    toast.error("Login failed")
  }
}

<Button 
  type="submit" 
  disabled={form.formState.isSubmitting}
>
  {form.formState.isSubmitting ? "Loading..." : "Submit"}
</Button>`,
  },

  optimistic_submit: {
    description: "Optimistic UI updates",
    pattern: "Update UI before server response",
    example: `const onSubmit = async (data: CommentForm) => {
  // Optimistically add comment
  addComment(data)
  
  try {
    const result = await api.createComment(data)
    updateComment(result)
  } catch (error) {
    removeComment(data.id)
    toast.error("Failed to post comment")
  }
}`,
  },

  server_validation: {
    description: "Handle server-side validation errors",
    pattern: "setError from API response",
    example: `const onSubmit = async (data: SignupForm) => {
  try {
    await api.signup(data)
  } catch (error) {
    if (error.field === "email") {
      form.setError("email", {
        type: "server",
        message: error.message
      })
    }
  }
}`,
  },

  reset_after_submit: {
    description: "Reset form after successful submission",
    pattern: "reset method",
    example: `const onSubmit = async (data: ContactForm) => {
  await api.sendMessage(data)
  form.reset() // Clear all fields
  toast.success("Message sent!")
}`,
  },
};

const FIELD_COMPONENTS = {
  text_field: {
    description: "Standard text input field",
    component: "Input",
    example: `<FormField
  control={form.control}
  name="username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username</FormLabel>
      <FormControl>
        <Input placeholder="johndoe" {...field} />
      </FormControl>
      <FormDescription>Your public display name</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>`,
  },

  textarea_field: {
    description: "Multi-line text area",
    component: "Textarea",
    example: `<FormField
  control={form.control}
  name="bio"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Bio</FormLabel>
      <FormControl>
        <Textarea 
          placeholder="Tell us about yourself" 
          className="resize-none" 
          {...field} 
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`,
  },

  select_field: {
    description: "Dropdown select field",
    component: "Select",
    example: `<FormField
  control={form.control}
  name="country"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Country</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="us">United States</SelectItem>
          <SelectItem value="uk">United Kingdom</SelectItem>
          <SelectItem value="ca">Canada</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>`,
  },

  checkbox_field: {
    description: "Checkbox for boolean values",
    component: "Checkbox",
    example: `<FormField
  control={form.control}
  name="terms"
  render={({ field }) => (
    <FormItem className="flex items-start space-x-3">
      <FormControl>
        <Checkbox 
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Accept terms and conditions</FormLabel>
        <FormDescription>
          You agree to our Terms of Service and Privacy Policy
        </FormDescription>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>`,
  },

  radio_field: {
    description: "Radio group for exclusive choices",
    component: "RadioGroup",
    example: `<FormField
  control={form.control}
  name="plan"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Subscription Plan</FormLabel>
      <FormControl>
        <RadioGroup 
          onValueChange={field.onChange}
          defaultValue={field.value}
        >
          <FormItem className="flex items-center space-x-3">
            <FormControl>
              <RadioGroupItem value="free" />
            </FormControl>
            <FormLabel className="font-normal">Free</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3">
            <FormControl>
              <RadioGroupItem value="pro" />
            </FormControl>
            <FormLabel className="font-normal">Pro ($9/mo)</FormLabel>
          </FormItem>
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`,
  },

  switch_field: {
    description: "Toggle switch for boolean",
    component: "Switch",
    example: `<FormField
  control={form.control}
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between">
      <div>
        <FormLabel>Email notifications</FormLabel>
        <FormDescription>
          Receive emails about your account activity
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>`,
  },
};

const FORM_RECIPES = {
  login_form: {
    description: "Complete login form with validation",
    copy_paste: true,
    code: `"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export function LoginForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    </Form>
  )
}`,
  },

  contact_form: {
    description: "Contact form with textarea and validation",
    copy_paste: true,
    code: `"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters").max(500),
})

export function ContactForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success("Message sent successfully!")
    form.reset()
  }

  return (
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
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="How can we help?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us more..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/500 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </Form>
  )
}`,
  },

  profile_settings: {
    description: "Profile settings form with multiple field types",
    copy_paste: true,
    code: `"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

const formSchema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  bio: z.string().max(160).optional(),
  website: z.string().url().optional().or(z.literal("")),
  notifications: z.boolean().default(false),
})

export function ProfileSettingsForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
      website: "",
      notifications: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success("Profile updated!")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                Your public display name. Only letters, numbers, underscores.
              </FormDescription>
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
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us about yourself" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Brief description for your profile. Max 160 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Email Notifications</FormLabel>
                <FormDescription>
                  Receive emails about your account activity.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
}`,
  },
};

const ACCESSIBILITY_CHECKLIST = [
  {
    item: "Label Association",
    description: "All fields must have associated labels using FormLabel",
    wcag: "WCAG 2.1 AA - 3.3.2 Labels or Instructions",
    example: "<FormLabel>Email</FormLabel>",
    importance: "Critical",
  },
  {
    item: "Error Identification",
    description: "Errors clearly identified and associated with fields",
    wcag: "WCAG 2.1 AA - 3.3.1 Error Identification",
    example: "<FormMessage /> automatically associates errors",
    importance: "Critical",
  },
  {
    item: "Keyboard Navigation",
    description: "All fields accessible via Tab, form submits on Enter",
    wcag: "WCAG 2.1 AA - 2.1.1 Keyboard",
    example: "Native form behavior + proper focus management",
    importance: "Critical",
  },
  {
    item: "Focus Visible",
    description: "Clear focus indicators on all interactive elements",
    wcag: "WCAG 2.1 AA - 2.4.7 Focus Visible",
    example: "Shadcn components have built-in focus styles",
    importance: "Critical",
  },
  {
    item: "Required Fields",
    description: "Required fields marked with asterisk and aria-required",
    wcag: "WCAG 2.1 AA - 3.3.2 Labels or Instructions",
    example: '<FormLabel>Email <span className="text-red-500">*</span></FormLabel>',
    importance: "Important",
  },
  {
    item: "Error Prevention",
    description: "Validation prevents errors before submission",
    wcag: "WCAG 2.1 AA - 3.3.4 Error Prevention",
    example: "Real-time Zod validation + FormMessage",
    importance: "Important",
  },
  {
    item: "Help Text",
    description: "FormDescription provides context and examples",
    wcag: "WCAG 2.1 AA - 3.3.2 Labels or Instructions",
    example: "<FormDescription>Your public display name</FormDescription>",
    importance: "Recommended",
  },
  {
    item: "Submit State",
    description: "Disable submit button during submission with loading text",
    wcag: "User Experience Best Practice",
    example: "<Button disabled={form.formState.isSubmitting}>",
    importance: "Recommended",
  },
];

const INTEGRATION_EXAMPLE = `
/**
 * Complete React Hook Form + Zod + Shadcn Form Integration
 * 
 * This example shows the full setup for a production-ready form
 */

// 1. Install dependencies
// pnpm add react-hook-form @hookform/resolvers zod

// 2. Setup form schema with Zod
import { z } from "zod"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// 3. Infer TypeScript type from schema
type FormValues = z.infer<typeof formSchema>

// 4. Initialize form with React Hook Form + Zod resolver
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    email: "",
    password: "",
  },
})

// 5. Use Shadcn Form components
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Password</FormLabel>
          <FormControl>
            <Input type="password" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    
    <Button type="submit">Submit</Button>
  </form>
</Form>

// 6. Handle form submission
function onSubmit(values: FormValues) {
  console.log(values) // Type-safe values
}

/**
 * Key Points:
 * 
 * ✓ Type Safety: Zod schema → TypeScript type → Runtime validation
 * ✓ Validation: Client-side validation before submission
 * ✓ Accessibility: Built-in a11y with FormLabel, FormMessage
 * ✓ Error Handling: Automatic error display with FormMessage
 * ✓ DX: Single source of truth (schema), minimal boilerplate
 */
`;

const tools: Anthropic.Tool[] = [
  {
    name: "form_structure",
    description: "Get form layout patterns (basic, multi-step, dynamic, nested)",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Pattern type: basic, multi_step, dynamic_fields, nested_forms, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "validation_schemas",
    description: "Get Zod validation schema examples for common forms",
    input_schema: {
      type: "object" as const,
      properties: {
        form_type: {
          type: "string",
          description: "Form type: login, signup, contact, profile, payment, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "error_handling",
    description: "Get error handling patterns (field errors, async validation, error summary)",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description:
            "Error pattern: field_errors, manual_errors, async_validation, error_summary, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "submit_patterns",
    description: "Get form submission flow patterns (basic, async, optimistic, validation)",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description:
            "Submit pattern: basic_submit, async_submit, optimistic_submit, server_validation, reset_after_submit, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "field_components",
    description: "Get field component variants (text, textarea, select, checkbox, radio, switch)",
    input_schema: {
      type: "object" as const,
      properties: {
        field_type: {
          type: "string",
          description:
            "Field type: text_field, textarea_field, select_field, checkbox_field, radio_field, switch_field, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "form_recipes",
    description: "Get complete copy-paste form templates (login, contact, profile)",
    input_schema: {
      type: "object" as const,
      properties: {
        recipe: {
          type: "string",
          description: "Recipe type: login_form, contact_form, profile_settings, or 'all'",
        },
      },
      required: [],
    },
  },
  {
    name: "accessibility",
    description: "Get accessibility (a11y) checklist for forms (WCAG 2.1 AA)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "integration_example",
    description: "Get React Hook Form + Zod integration setup example",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

function process_tool_call(tool_name: string, tool_input: Record<string, string>): string {
  switch (tool_name) {
    case "form_structure":
      const pattern = tool_input.pattern || "all";
      if (pattern === "all") {
        return JSON.stringify(FORM_STRUCTURES, null, 2);
      }
      return JSON.stringify(
        (FORM_STRUCTURES as any)[pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "validation_schemas":
      const form_type = tool_input.form_type || "all";
      if (form_type === "all") {
        return JSON.stringify(VALIDATION_SCHEMAS, null, 2);
      }
      return JSON.stringify(
        (VALIDATION_SCHEMAS as any)[form_type] || { error: "Schema not found" },
        null,
        2,
      );

    case "error_handling":
      const err_pattern = tool_input.pattern || "all";
      if (err_pattern === "all") {
        return JSON.stringify(ERROR_HANDLING, null, 2);
      }
      return JSON.stringify(
        (ERROR_HANDLING as any)[err_pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "submit_patterns":
      const submit_pattern = tool_input.pattern || "all";
      if (submit_pattern === "all") {
        return JSON.stringify(SUBMIT_PATTERNS, null, 2);
      }
      return JSON.stringify(
        (SUBMIT_PATTERNS as any)[submit_pattern] || { error: "Pattern not found" },
        null,
        2,
      );

    case "field_components":
      const field_type = tool_input.field_type || "all";
      if (field_type === "all") {
        return JSON.stringify(FIELD_COMPONENTS, null, 2);
      }
      return JSON.stringify(
        (FIELD_COMPONENTS as any)[field_type] || { error: "Field type not found" },
        null,
        2,
      );

    case "form_recipes":
      const recipe = tool_input.recipe || "all";
      if (recipe === "all") {
        return JSON.stringify(FORM_RECIPES, null, 2);
      }
      return JSON.stringify(
        (FORM_RECIPES as any)[recipe] || { error: "Recipe not found" },
        null,
        2,
      );

    case "accessibility":
      return JSON.stringify(ACCESSIBILITY_CHECKLIST, null, 2);

    case "integration_example":
      return INTEGRATION_EXAMPLE;

    default:
      return JSON.stringify({ error: `Unknown tool: ${tool_name}` });
  }
}

async function main() {
  const client = new Anthropic();
  console.log("📝 Shadcn UI Form MCP Server Started");
  console.log(`📚 Exposed ${tools.length} tools`);
  console.log("🎯 React Hook Form + Zod integration ready");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        "Build a login form with email and password validation using React Hook Form and Zod",
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

  console.log("✅ Form MCP Ready - All 8 tools operational");
}

main().catch(console.error);
