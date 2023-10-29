const bcryptjs = require("bcryptjs");

// Middleware to verify the old password before changing it
const verifyPassword = async (req, res, next) => {
  const { oldPassword } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const isPasswordMatch = await bcryptjs.compare(oldPassword, user.password);

  if (!isPasswordMatch) {
    return res.status(400).json({ message: "Incorrect old password." });
  }

  next();
};
module.exports = verifyPassword;
