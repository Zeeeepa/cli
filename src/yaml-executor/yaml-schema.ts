import { z } from 'zod';

// Base action schema
export const BaseActionSchema = z.object({
  type: z.string(),
});

// Navigate action
export const NavigateActionSchema = BaseActionSchema.extend({
  type: z.literal('navigate'),
  url: z.string().url(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('networkidle'),
  timeout: z.number().positive().optional().default(30000),
});

// Click action
export const ClickActionSchema = BaseActionSchema.extend({
  type: z.literal('click'),
  selector: z.string(),
  button: z.enum(['left', 'right', 'middle']).optional().default('left'),
  clickCount: z.number().int().min(1).max(2).optional().default(1),
  delay: z.number().nonnegative().optional().default(0),
  timeout: z.number().positive().optional().default(5000),
});

// Type action
export const TypeActionSchema = BaseActionSchema.extend({
  type: z.literal('type'),
  selector: z.string(),
  text: z.string(),
  delay: z.number().nonnegative().optional().default(0),
  clear: z.boolean().optional().default(false),
  timeout: z.number().positive().optional().default(5000),
});

// Wait action
export const WaitActionSchema = BaseActionSchema.extend({
  type: z.literal('wait'),
  condition: z.enum(['selector', 'timeout', 'navigation']),
  selector: z.string().optional(),
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional().default('visible'),
  duration: z.number().positive().optional(),
  timeout: z.number().positive().optional().default(10000),
});

// Screenshot action
export const ScreenshotActionSchema = BaseActionSchema.extend({
  type: z.literal('screenshot'),
  path: z.string(),
  fullPage: z.boolean().optional().default(false),
  selector: z.string().optional(),
  quality: z.number().int().min(0).max(100).optional().default(90),
  type: z.enum(['png', 'jpeg']).optional().default('png'),
});

// Evaluate action
export const EvaluateActionSchema = BaseActionSchema.extend({
  type: z.literal('evaluate'),
  script: z.string(),
  returnVariable: z.string().optional(),
});

// AssertExists action
export const AssertExistsActionSchema = BaseActionSchema.extend({
  type: z.literal('assertExists'),
  selector: z.string(),
  state: z.enum(['visible', 'hidden', 'attached']).optional().default('attached'),
  timeout: z.number().positive().optional().default(5000),
  message: z.string().optional(),
});

// Union of all action types
export const ActionSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  ClickActionSchema,
  TypeActionSchema,
  WaitActionSchema,
  ScreenshotActionSchema,
  EvaluateActionSchema,
  AssertExistsActionSchema,
]);

// Metadata schema
export const MetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  created: z.string().datetime().optional(),
});

// Network config schema
export const NetworkConfigSchema = z.object({
  allowedDomains: z.array(z.string()).optional().default(['localhost', '127.0.0.1']),
  deniedDomains: z.array(z.string()).optional().default(['*']),
});

// Filesystem config schema
export const FilesystemConfigSchema = z.object({
  allowRead: z.array(z.string()).optional().default(['.']),
  allowWrite: z.array(z.string()).optional().default(['./screenshots', './logs']),
  denyRead: z.array(z.string()).optional().default(['~/.ssh', '~/.aws']),
  denyWrite: z.array(z.string()).optional().default(['/etc', '/usr', '/System']),
});

// Sandbox config schema
export const SandboxConfigSchema = z.object({
  network: NetworkConfigSchema.optional(),
  filesystem: FilesystemConfigSchema.optional(),
  allowUnixSockets: z.array(z.string()).optional(),
  allowLocalBinding: z.boolean().optional().default(false),
});

// Main YAML schema
export const YAMLSchemaV1 = z.object({
  version: z.literal('1.0'),
  metadata: MetadataSchema,
  sandbox: SandboxConfigSchema.optional(),
  actions: z.array(ActionSchema).min(1),
});

// Type exports
export type NavigateAction = z.infer<typeof NavigateActionSchema>;
export type ClickAction = z.infer<typeof ClickActionSchema>;
export type TypeAction = z.infer<typeof TypeActionSchema>;
export type WaitAction = z.infer<typeof WaitActionSchema>;
export type ScreenshotAction = z.infer<typeof ScreenshotActionSchema>;
export type EvaluateAction = z.infer<typeof EvaluateActionSchema>;
export type AssertExistsAction = z.infer<typeof AssertExistsActionSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
export type FilesystemConfig = z.infer<typeof FilesystemConfigSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
export type YAMLTestSpec = z.infer<typeof YAMLSchemaV1>;

// Validation helper
export function validateYAMLSpec(data: unknown): YAMLTestSpec {
  return YAMLSchemaV1.parse(data);
}

// Safe validation with error details
export function safeValidateYAMLSpec(data: unknown): {
  success: boolean;
  data?: YAMLTestSpec;
  errors?: z.ZodError;
} {
  const result = YAMLSchemaV1.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

