import { z } from "zod";

export const SaleEntrySchema = z.object({
  date: z.string().min(1, "date is required"),
  customerName: z.string().min(1, "customerName is required"),
  invoiceNumber: z.string().min(1, "invoiceNumber is required"),
  description: z.string().min(1, "description is required"),
  amount: z.number().positive("amount must be positive"),
  gstRate: z.number().min(0).max(100),
  gstType: z.enum(["intra", "inter"]),
  paidNow: z.number().nonnegative().optional(),
  paidVia: z.enum(["cash", "bank"]).optional(),
  reference: z.string().optional(),
});
export type SaleEntry = z.infer<typeof SaleEntrySchema>;

export const PurchaseEntrySchema = z.object({
  date: z.string().min(1, "date is required"),
  vendorName: z.string().min(1, "vendorName is required"),
  billNumber: z.string().min(1, "billNumber is required"),
  description: z.string().min(1, "description is required"),
  amount: z.number().positive("amount must be positive"),
  gstRate: z.number().min(0).max(100),
  gstType: z.enum(["intra", "inter"]),
  paidNow: z.number().nonnegative().optional(),
  paidVia: z.enum(["cash", "bank"]).optional(),
  reference: z.string().optional(),
});
export type PurchaseEntry = z.infer<typeof PurchaseEntrySchema>;

export const ExpenseEntrySchema = z.object({
  date: z.string().min(1, "date is required"),
  description: z.string().min(1, "description is required"),
  amount: z.number().positive("amount must be positive"),
  category: z.string().min(1, "category is required"),
  paidVia: z.enum(["cash", "bank"]),
});
export type ExpenseEntry = z.infer<typeof ExpenseEntrySchema>;

export const PartySchema = z.object({
  name: z.string().min(1, "name is required"),
  type: z.enum(["customer", "vendor", "both"]),
  gstin: z.string().min(1, "gstin is required"),
  pan: z.string().min(1, "pan is required"),
  phone: z.string().min(1, "phone is required"),
  email: z.string().email("invalid email").optional(),
  address: z.string().min(1, "address is required"),
  city: z.string().min(1, "city is required"),
  state: z.string().min(1, "state is required"),
  pincode: z.string().min(1, "pincode is required"),
  credit_days: z.number().int("credit_days must be an integer"),
  credit_limit: z.number(),
});
export type Party = z.infer<typeof PartySchema>;

export const EmployeeSchema = z.object({
  name: z.string().min(1, "name is required"),
  designation: z.string().min(1, "designation is required"),
  department: z.string().min(1, "department is required"),
  basic_salary: z.number().positive("basic_salary must be positive"),
  hra_percent: z.number(),
  other_allowances: z.number(),
  pf_applicable: z.boolean(),
  esi_applicable: z.boolean(),
  tds_section: z.string(),
  tds_rate: z.number(),
  bank_account: z.string().min(1, "bank_account is required"),
  bank_name: z.string().min(1, "bank_name is required"),
  ifsc: z.string().min(1, "ifsc is required"),
  joining_date: z.string().min(1, "joining_date is required"),
});
export type Employee = z.infer<typeof EmployeeSchema>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const error = result.error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
  return { ok: false, error };
}
