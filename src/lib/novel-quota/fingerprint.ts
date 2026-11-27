import { z } from "zod";

/** FingerprintJS visitorId；非管理员创建任务时必填。 */
export const novelFingerprintSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[\w-]+$/);
