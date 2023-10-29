const mongoose = require("mongoose");
const OTP_EXPIRATION_TIME = 10 * 60 * 1000;

const resetTokensSchema = new mongoose.Schema({
    otp: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    created: {
        type: Date,
        default: () => Date.now(),
    },
    expire_at: { type: Date, default: () => Date.now() + OTP_EXPIRATION_TIME },
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
resetTokensSchema.index({ expire_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("resetTokens", resetTokensSchema);