const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  points: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
    default:
      "https://media.istockphoto.com/id/1337144146/vector/default-avatar-profile-icon-vector.jpg?s=612x612&w=0&k=20&c=BIbFwuv7FxTWvh5S3vB6bkT0Qv8Vn8N5Ffseq84ClGI=",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String,
  },
  provider: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
  },
  fatherPhone: {
    type: Number,
  },
  grade: {
    type: String,
  }
});
const User = mongoose.model("user", userSchema, "user");

module.exports = { User };
