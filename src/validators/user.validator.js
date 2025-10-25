import Joi from "joi";

const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    fullName: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});
export { registerSchema, loginSchema };