const Headermethod = ["body", "params", "query"];

const HandelValidation = (schema) => {
  return (req, res, next) => {
    let validation = [];
    Headermethod.forEach((key) => {
      if (schema[key]) {
        const validationResult = schema[key].validate(req[key]);
        if (validationResult.error) {
          validation.push(validationResult.error.details[0]);
        }
      }
    });
    if (validation.length) {
      res.status(400).json({
        message: "please enter right data error from validation",
        err: validation,
      });
    } else {
      next();
    }
  };
};

module.exports = HandelValidation;
