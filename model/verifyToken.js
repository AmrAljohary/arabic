const mongoose = require("mongoose");
const crypto = require("crypto");

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

const verifyTokensSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    created: {
        type: Date,
        default: Date.now,
    },
    expire_at: {
        type: Date,
        default: () => Date.now() + OTP_EXPIRATION_TIME,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    lastAttemptTime: {
        type: Date,
        default: null,
    },
});

// Set up TTL index on the `expire_at` field
verifyTokensSchema.index({ expire_at: 1 }, { expireAfterSeconds: 0 });

// Method to generate a new OTP token
verifyTokensSchema.statics.generateToken = function() {
    return crypto.randomBytes(32).toString("hex");
};

module.exports = mongoose.model("verifyToken", verifyTokensSchema);