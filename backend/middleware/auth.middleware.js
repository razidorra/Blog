import { clerkMiddleware, getAuth } from "@clerk/express";

export const createClerkAuth = (authorizedParties) =>
  clerkMiddleware({ authorizedParties });

export const protectRoute = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res
      .status(401)
      .json({ error: "Not authorized – please sign in" });
  }
  next();
};

export const getUserId = (req) => {
  const { userId } = getAuth(req);
  return userId;
};
