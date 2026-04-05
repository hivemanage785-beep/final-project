import rateLimit from 'express-rate-limit';

// ── Global: 200 req / 15 min per IP ──────────────────────────────────────────
// FIX HIGH: Old limit was 100 — legitimate mobile users with poor connections
//           retry aggressively and hit the cap, causing cascading 429 storms.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => req.path === '/health', // Never limit health checks
});

// ── Auth: 10 attempts / 15 min (brute force protection) ─────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Sync: 60 syncs / 15 min (↑ from 30 — supports burst after 7+ days offline) ──
// FIX HIGH: Old limit of 30 caused denied syncs for beekeepers returning from the field.
export const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Sync rate limit exceeded. Queue will retry automatically.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Score endpoint: 60 req / 5 min (prevents ML DoS abuse) ──────────────────
// FIX MEDIUM: /api/score was unthrottled — a single client flooding this
//             triggers cascading ML microservice calls and GeoTile DB reads.
export const scoreLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many score requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
