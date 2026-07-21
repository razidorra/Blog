import { getAuth } from "@clerk/express";
import { asTrimmedString } from "./validation.js";

const cleanDisplayName = (value) =>
  String(value || "Community Member")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 80) || "Community Member";

export const getIdentity = (req) => {
  const { userId, sessionClaims } = getAuth(req);
  const isAdmin = userId === process.env.ADMIN_USER_ID;
  const claimedName =
    sessionClaims?.first_name ||
    sessionClaims?.name ||
    sessionClaims?.email ||
    "Community Member";

  return {
    userId,
    isAdmin,
    displayName: isAdmin ? "Raaji Baluch" : cleanDisplayName(claimedName),
  };
};

export const resolveByline = (identity, requestedValue) => {
  const requestedByline = asTrimmedString(requestedValue);

  if (!requestedByline) {
    return { byline: identity.displayName };
  }
  if (requestedByline.length > 80) {
    return { error: "Author name cannot exceed 80 characters" };
  }
  if (
    !identity.isAdmin &&
    /^(admin|administrator|raaji baluch)$/i.test(requestedByline)
  ) {
    return { error: "This author name is reserved" };
  }

  return { byline: requestedByline };
};
