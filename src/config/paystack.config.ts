// src/config/paystack.config.ts
import { registerAs } from '@nestjs/config';

export const paystackConfig = registerAs('paystack', () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
}));
