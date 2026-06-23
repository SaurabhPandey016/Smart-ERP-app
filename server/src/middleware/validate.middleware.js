// Validate middleware — wraps Zod schema parse, lets ZodError bubble to error handler
export const validate = (schema) => (req, res, next) => {
  req.body = schema.parse(req.body);
  next();
};
