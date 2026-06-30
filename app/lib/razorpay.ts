import Razorpay from "razorpay";

let instance: Razorpay | null = null;

// Lazily constructed singleton — throws at call time (inside a route handler,
// where it becomes a clean 503) rather than at module load (which would crash
// every route that transitively imports this file if the keys are missing).
export function getRazorpay(): Razorpay {
  if (instance) return instance;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured");
  }

  instance = new Razorpay({ key_id, key_secret });
  return instance;
}
