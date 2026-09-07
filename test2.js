const { z } = require("zod");

const PAYMENT_MODES = [
  "cash",
  "upi_qr_code"
];

const schema1 = z.enum(PAYMENT_MODES).or(z.literal("")).optional().default("");
console.log("schema1(null):", schema1.safeParse(null).error?.issues[0]?.message);

const schema2 = z.union([z.string(), z.number()]);
console.log("schema2(null):", schema2.safeParse(null).error?.issues[0]?.message);

const financeItemSchema = z.object({
  particulars: z.string().min(1, "Particulars is required"),
  amountINR: z.number().min(0, "Value must be 0 or greater"),
  paymentMode: z.enum(PAYMENT_MODES).or(z.literal("")).optional().default("")
});
console.log("financeItemSchema paymentMode null:", financeItemSchema.safeParse({ particulars: "A", amountINR: 0, paymentMode: null }).error?.issues[0]?.message);
