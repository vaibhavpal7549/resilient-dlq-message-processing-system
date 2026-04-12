const Joi = require('joi');

// Message validation schema
const messageSchema = Joi.object({
  payload: Joi.object().min(1).required(),
  source: Joi.string().max(100).optional(),
  priority: Joi.number().min(1).max(3).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  headers: Joi.object().optional()
});

/**
 * Validate incoming message
 */
const validateMessage = (req, res, next) => {
  const { error, value } = messageSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }

  req.validatedMessage = value;
  next();
};

module.exports = {
  validateMessage
};
