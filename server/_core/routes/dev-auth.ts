import { Router } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../cookies";

const router = Router();

router.post("/login", (req, res) => {
  // token fake (qualquer string serve por enquanto)
  const fakeSessionToken = "dev-session-token";

  const cookieOptions = getSessionCookieOptions(req);

  res.cookie(COOKIE_NAME, fakeSessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });

  res.status(200).json({ ok: true });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(200).json({ ok: true });
});

export default router;
