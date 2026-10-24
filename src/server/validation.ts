import { z } from "zod";
const text = (max = 300) => z.string().trim().max(max);
export const money = z.number().int().min(0).max(2147483647);
export const isoDate = z
  .string()
  .refine((v) => Number.isFinite(new Date(v).getTime()), "Enter a valid date.");
export const talentSchema = z
  .object({
    fullName: text(120).min(2, "Full name is required."),
    category: z.enum(["Influencer", "Model", "Actor", "UGC creator"]),
    email: z.string().trim().email("Enter a valid email."),
    phone: text(40).nullable().optional(),
    city: text(100).min(1, "City is required."),
    links: text(2000)
      .default("")
      .refine(
        (v) =>
          v.split(/[\n,]+/).every((link) => {
            if (!link.trim()) return true;
            try {
              return ["http:", "https:"].includes(
                new URL(link.trim()).protocol,
              );
            } catch {
              return false;
            }
          }),
        "Use HTTP(S) portfolio links, separated by commas or new lines.",
      ),
    contentCategory: text(150).default(""),
    languages: text(200).default(""),
    representation: text(200).default(""),
    rateMinPaise: money.nullable().optional(),
    rateMaxPaise: money.nullable().optional(),
    availability: z
      .enum(["AVAILABLE", "BUSY", "UNAVAILABLE"])
      .default("AVAILABLE"),
    notes: text(5000).default(""),
    verified: z.boolean().default(false),
  })
  .refine(
    (v) =>
      v.rateMinPaise == null ||
      v.rateMaxPaise == null ||
      v.rateMinPaise <= v.rateMaxPaise,
    "Minimum rate cannot exceed maximum rate.",
  );
export const campaignSchema = z
  .object({
    brandName: text(150).min(1, "Brand name is required."),
    name: text(200).min(2, "Campaign name is required."),
    budgetPaise: money,
    startDate: isoDate,
    endDate: isoDate,
    manager: text(120).default("Avni Sharma"),
    status: z
      .enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"])
      .default("ACTIVE"),
    objective: text(3000).default(""),
    requiredCategory: text(100).default("Influencer"),
    creatorCount: z.number().int().min(1).max(10000).default(1),
    deliverableBrief: text(2000).default("1 Instagram reel"),
    approvalRequired: z.boolean().default(true),
  })
  .refine(
    (v) => new Date(v.endDate) >= new Date(v.startDate),
    "End date must follow start date.",
  );
export const assignmentSchema = z.object({
  talentId: text(100).min(1),
  task: text(2000).min(1),
  dueDate: isoDate,
});
export const assignmentUpdateSchema = z
  .object({
    status: z
      .enum(["INVITED", "CONFIRMED", "DECLINED", "CANCELLED"])
      .optional(),
    task: text(2000).min(1).optional(),
    dueDate: isoDate.optional(),
    deliverableStatus: z
      .enum([
        "NOT_STARTED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "PUBLISHED",
      ])
      .optional(),
    url: z
      .string()
      .max(2000)
      .url()
      .refine(
        (v) => ["https:", "http:"].includes(new URL(v).protocol),
        "Use an HTTP or HTTPS link.",
      )
      .optional(),
    approvalStatus: z
      .enum(["NOT_REQUIRED", "PENDING", "APPROVED", "CHANGES_REQUESTED"])
      .optional(),
    paymentStatus: z.enum(["NOT_INVOICED", "PENDING", "PAID"]).optional(),
    amountPaise: money.optional(),
    followUp: z.boolean().optional(),
  })
  .strict();
export const taskSchema = z.object({
  title: text(1000).min(2),
  dueDate: isoDate,
  assignmentId: text(100).nullable().optional(),
});
