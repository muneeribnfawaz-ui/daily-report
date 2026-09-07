const { z } = require("zod");

const PAYMENT_MODES = [
  "cash",
  "upi_qr_code"
];

const schema1 = z.enum(PAYMENT_MODES).or(z.literal("")).optional().default("");
console.log("schema1('invalid_string'):", schema1.safeParse("invalid_string").error?.issues[0]?.message);

