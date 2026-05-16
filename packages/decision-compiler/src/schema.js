import { z } from "zod";

// Base condition schema
const conditionSchema = z.lazy(() => z.union([
  z.object({
    op: z.enum(["gte", "lte", "gt", "lt", "eq", "not_equal", "ne"]),
    left: z.union([z.string(), z.number()]),
    right: z.union([z.string(), z.number()])
  }),
  z.object({
    op: z.enum(["or", "and"]),
    args: z.array(conditionSchema)
  }),
  z.object({
    op: z.literal("not"),
    arg: conditionSchema
  })
]));

// Formula schema
const formulaSchema = z.object({
  op: z.enum(["add", "subtract", "multiply", "min", "max", "average", "clamp", "inverse"]),
  args: z.array(z.union([z.string(), z.number()]))
});

// Gate Node
const gateSchema = z.object({
  node: z.string(),
  condition: conditionSchema
});

// Penalty Schema
const penaltySchema = z.object({
  amount: z.number().positive(),
  reason: z.string(),
  condition: conditionSchema
});

// Score Node
const scoreSchema = z.object({
  weights: z.record(z.string(), z.number()),
  penalties: z.record(z.string(), penaltySchema).optional(),
  isFinal: z.boolean().optional()
});

// Intent Graph Node
const intentNodeSchema = z.object({
  title: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  expertIdentity: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  futureProjection: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  gates: z.record(z.string(), gateSchema).optional(),
  scores: z.record(z.string(), scoreSchema).optional()
});

// Full Domain Config Schema
export const DomainConfigSchema = z.object({
  domainId: z.string(),
  version: z.string(),
  expertIdentity: z.string().optional(),
  defaultLocale: z.string().optional(),
  
  atlas: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  
  profileMapping: z.record(z.string(), z.string()).optional(),
  
  intentGraph: z.record(z.string(), intentNodeSchema).optional(),
  conflictMap: z.record(z.string(), z.number()).optional(),
  
  gates: z.record(z.string(), gateSchema).optional(),
  scores: z.record(z.string(), scoreSchema).optional(),
  
  selectionStrategy: z.object({
    cardSlots: z.array(z.object({
      type: z.string(),
      pickBy: z.string(),
      priceField: z.string().optional()
    })).optional(),
    noDuplicates: z.boolean().optional()
  }).optional(),
  
  outputTemplate: z.record(z.string(), z.string()).optional(),
  taxonomy: z.record(z.string(), z.array(z.string())).optional(),
  useAI: z.boolean().optional()
}).passthrough(); // Allow extra properties for backward compatibility (e.g. attributes, metrics, rulesets)
