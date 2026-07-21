export const asTrimmedString = (value) =>
  typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
