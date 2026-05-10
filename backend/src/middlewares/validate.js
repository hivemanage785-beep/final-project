import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    // Reassign req.body so Zod's transformations (like lowercase) are kept
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};
