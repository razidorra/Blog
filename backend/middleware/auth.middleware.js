import { clerkMiddleware, getAuth } from "@clerk/express";

export const clerkAuth = clerkMiddleware();

export const protectRoute = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res
      .status(401)
      .json({ error: "Nicht autorisiert – bitte anmelden" });
  }
  next();
};

export const getUserId = (req) => {
  const { userId } = getAuth(req);
  return userId;
};
