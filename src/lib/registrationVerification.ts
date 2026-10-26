import { createHash, randomInt } from "node:crypto";
import { PendingRegistration } from "@/models/PendingRegistration";
import { sendOtpEmail } from "@/lib/sendEmail";

export function hashRegistrationOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

export class VerificationEmailError extends Error {}

export async function sendRegistrationCode(details: { email: string; name?: string; password: string }) {
  const otp = randomInt(100000, 1000000).toString();
  // A rejected email must not persist a new attempt or invalidate a previous code.
  try {
    await sendOtpEmail(details.email, otp);
  } catch {
    throw new VerificationEmailError("Verification email delivery failed");
  }
  await PendingRegistration.findOneAndUpdate({ email: details.email }, {
    $set: {
      ...details,
      otpHash: hashRegistrationOtp(otp),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      attempts: 0,
    },
  }, { upsert: true, new: true, runValidators: true });
}
