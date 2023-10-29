const Joi = require("joi");
const mongoose = require("mongoose");
const userRegistrationValidation = {
  body: Joi.object().keys({
    username: Joi.string().min(3).max(15).required().messages({
      "string.empty": "Display username cannot be empty",
      "string.min": "Display username must be at least 3 characters",
      "string.max": "Display username can be at most 15 characters",
      "any.required": "Display username is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),
    password: Joi.string()
      .required()
      .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
      .messages({
        "string.pattern.base":
          "Password must be alphanumeric and 3-30 characters long",
        "any.required": "Password is required",
      }),
    confirmpassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "any.required": "Confirm password is required",
        "string.empty": "Confirm password cannot be empty",
      }),
    phone: Joi.string().pattern(new RegExp("^[0-9]{11}$")).required().messages({
      "string.pattern.base": "Phone must be a 10-digit number",
      "any.required": "Phone is required",
    }),
    grade: Joi.string().required().messages({
      "string.empty": "grade cannot be empty",
      "any.required": "grade is required",
    }),
    fatherPhone: Joi.string().pattern(new RegExp("^[0-9]{11}$")).messages({
      "string.pattern.base": "Father's phone must be a 10-digit number",
    }),
  }),
};
module.exports = {
  userRegistrationValidation,

};
