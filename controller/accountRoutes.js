const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const ResetToken = require("../model/resetTokens");
const { User } = require("../model/user");
const mailer = require("./sendMail");
const bcryptjs = require("bcryptjs");
const verifyToken = require("../model/verifyToken");
const OTP_EXPIRATION_TIME = 10 * 60 * 1000;
const MAX_DAILY_ATTEMPTS = 10;
const MAX_WEEKLY_ATTEMPTS = 20;
const MAX_MONTHLY_ATTEMPTS = 50;
const MAX_ATTEMPTS_PER_HOUR = 5;
const ONE_DAY = 24 * 60 * 60 * 1000; // milliseconds in a day
const ONE_WEEK = 7 * ONE_DAY; // milliseconds in a week
const ONE_MONTH = 30 * ONE_DAY; // milliseconds in a month
const ONE_HOUR = 60 * 1000; // milliseconds in an hour;
function formatRemainingTime(remainingTime) {
  const seconds = Math.floor(remainingTime / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const formattedTime = `${hours}h:${minutes}m:${seconds % 60}s`;
  return formattedTime;
}

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    res.set(
      "Cache-Control",
      "no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0"
    );
    next();
  } else {
    res.status(401).json({ message: "Please Login to continue!" });
  }
}
// adding the checkAuth middleware to make sure that
// only authenticated users can send emails
router.get("/user/send-verification-email", checkAuth, async (req, res) => {
  // check if user is google or already verified
  if (req.user.isVerified || req.user.provider == "google") {
    // already verified or google user
    // since we won't show any such option in the UI
    // most probably this is being called by mistake or can be an attack
    // simply redirect to profile
    res.json({ message: "You are verified back to profile" });
  } else {
    // generate a token
    var token = crypto.randomBytes(32).toString("hex");
    // add that to database
    await verifyToken({ token: token, email: req.user.email }).save();
    // send an email for verification
    mailer.sendVerifyEmail(req.user.email, token);
    res.json({
      message: "Verification email sent successfully",
      username: req.user.username,
      verified: req.user.isVerified,
      emailsent: true,
    });
  }
});

router.get("/user/verifyemail", async (req, res) => {
  // grab the token
  const token = req.query.token;

  if (token) {
    var check = await verifyToken.findOne({ token: token });
    if (check) {
      // token verified
      // set the property of verified to true for the user
      var userData = await User.findOne({ email: check.email });
      userData.isVerified = true;
      await userData.save();
      // delete the token now itself
      await verifyToken.findOneAndDelete({ token: token });
      res.json({
        message: "Email verified successfully",
        username: userData.username,
        verified: userData.isVerified,
      });
    } else {
      res.status(400).json({
        message: "Invalid token or Token has expired, Try again.",
      });
    }
  } else {
    // doesn't have a token
    res.status(400).json({
      message: "Token not provided",
    });
  }
});
router.post("/user/forgot-password", async (req, res) => {
  const { email } = req.body;

  // Check if email is empty
  if (!email) {
    res.status(400).json({
      message: "Email is required.",
    });
    return;
  }

  const userData = await User.findOne({ email: email });

  if (userData) {
    if (userData.provider === "google") {
      res.status(400).json({
        message:
          "User exists with Google account. Try resetting your Google account password or logging using it.",
      });
    } else {
      // Check if there is an existing OTP for the email
      const existingOTP = await ResetToken.findOne({ email: email });

      if (existingOTP) {
        const currentTime = Date.now();
        const lastAttemptTime = existingOTP.lastAttemptTime.getTime(); // Convert to milliseconds

        // Check if the user has reached the maximum number of attempts in an hour
        if (
          existingOTP.attempts >= MAX_ATTEMPTS_PER_HOUR &&
          currentTime - lastAttemptTime < ONE_HOUR
        ) {
          const remainingTime = ONE_HOUR - (currentTime - lastAttemptTime);
          const formattedTime = formatRemainingTime(remainingTime);
          res.status(400).json({
            message: `Maximum attempts reached in an hour. Try again in ${formattedTime}.`,
            remainingAttempts: MAX_ATTEMPTS_PER_HOUR - existingOTP.attempts,
          });
          return;
        }

        // Check if the user has reached the maximum number of attempts in a day
        if (
          existingOTP.attempts >= MAX_DAILY_ATTEMPTS &&
          currentTime - lastAttemptTime < ONE_DAY
        ) {
          const remainingTime = ONE_DAY - (currentTime - lastAttemptTime);
          const formattedTime = formatRemainingTime(remainingTime);
          res.status(400).json({
            message: `Maximum daily attempts reached. Try again in ${formattedTime}.`,
            remainingAttempts: MAX_DAILY_ATTEMPTS - existingOTP.attempts,
          });
          return;
        }

        // Check if the user has reached the maximum number of attempts in a week
        if (
          existingOTP.attempts >= MAX_WEEKLY_ATTEMPTS &&
          currentTime - lastAttemptTime < ONE_WEEK
        ) {
          const remainingTime = ONE_WEEK - (currentTime - lastAttemptTime);
          const formattedTime = formatRemainingTime(remainingTime);
          res.status(400).json({
            message: `Maximum weekly attempts reached. Try again in ${formattedTime}.`,
            remainingAttempts: MAX_WEEKLY_ATTEMPTS - existingOTP.attempts,
          });
          return;
        }

        // Check if the user has reached the maximum number of attempts in a month
        if (
          existingOTP.attempts >= MAX_MONTHLY_ATTEMPTS &&
          currentTime - lastAttemptTime < ONE_MONTH
        ) {
          const remainingTime = ONE_MONTH - (currentTime - lastAttemptTime);
          const formattedTime = formatRemainingTime(remainingTime);
          res.status(400).json({
            message: `Maximum monthly attempts reached. Try again in ${formattedTime}.`,
            remainingAttempts: MAX_MONTHLY_ATTEMPTS - existingOTP.attempts,
          });
          return;
        }

        // If the user is within the allowed limits, update the existingOTP document
        existingOTP.otp = Math.floor(100000 + Math.random() * 900000);
        existingOTP.otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);
        existingOTP.created = new Date();
        existingOTP.expire_at = new Date(Date.now() + OTP_EXPIRATION_TIME);
        existingOTP.attempts += 1;
        existingOTP.lastAttemptTime = new Date();

        await existingOTP.save();

        // send OTP in the email for verification
        mailer.sendResetOTP(email, existingOTP.otp);

        res.status(200).json({
          message: "Reset OTP sent. Check your email for more info.",
          remainingAttempts: MAX_ATTEMPTS_PER_HOUR - existingOTP.attempts,
        });
      } else {
        // Create a new OTP and save it in the collection
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);
        const newResetToken = new ResetToken({
          otp: otp,
          otpExpiration: otpExpiration,
          email: email,
          attempts: 1,
          lastAttemptTime: Date.now(),
          created: new Date(), // Set the created time for the new OTP
          expire_at: new Date(Date.now() + OTP_EXPIRATION_TIME), // Set the expire time for the new OTP
        });

        await newResetToken.save();

        // send OTP in the email for verification
        mailer.sendResetOTP(email, otp);

        res.status(200).json({
          message: "Reset OTP sent. Check your email for more info.",
        });
      }
    }
  } else {
    res.status(400).json({
      message: "No user exists with this email.",
    });
  }
});
router.get("/user/reset-password", async (req, res) => {
  const otp = req.query.otp;
  console.log(otp);

  if (!otp) {
    return res.status(400).json({
      message:
        "OTP not provided. Please enter the OTP you received in your email.",
    });
  }

  const currentTime = Date.now(); // Get the current date and time as a timestamp (number)
  console.log(currentTime);

  const check = await ResetToken.findOne({
    otp: otp,
  });

  if (check) {
    const otpExpirationTime = new Date(check.expire_at).getTime(); // Convert the string to a timestamp (number)
    console.log(otpExpirationTime);

    if (otpExpirationTime > currentTime) {
      // OTP verified and not expired
      // send forgot-password page with reset to true
      // this will render the form to reset password
      // sending email too to grab email later
      return res.json({
        reset: true,
        email: check.email,
        msg: "Valid OTP. Proceed to reset password.",
      });
    } else {
      return res.status(400).json({
        message: "Invalid OTP or OTP has expired. Please request a new OTP.",
      });
    }
  } else {
    return res.status(400).json({
      message: "Invalid OTP. Please check the OTP and try again.",
    });
  }
});

router.post("/user/reset-password", async (req, res) => {
  const { password, confirmpassword, email } = req.body;

  if (!email) {
    return res.status(400).json({
      reset: false,
      err: "Email not provided.",
    });
  }

  if (!password) {
    return res.status(400).json({
      reset: false,
      err: "Password not provided.",
    });
  }

  // Find the user by email
  const userData = await User.findOne({ email: email });

  // Check if the user has a valid OTP and OTP is not expired
  const validOTP = await ResetToken.findOne({
    otp: req.query.otp,
  });

  if (!validOTP || validOTP.email !== email) {
    return res.status(400).json({
      reset: false,
      err: "Invalid OTP for the provided email. Please request a new OTP.",
    });
  }

  if (!userData) {
    return res.status(400).json({
      reset: false,
      err: "User not found.",
    });
  }

  const currentTime = Date.now();
  const otpExpirationTime = new Date(validOTP.expire_at).getTime();

  if (otpExpirationTime <= currentTime) {
    return res.status(400).json({
      reset: false,
      err: "Invalid OTP or OTP has expired. Please request a new OTP.",
    });
  }

  if (password !== confirmpassword) {
    return res.status(400).json({
      reset: true,
      err: "Passwords do not match. Please try again.",
      email: email,
    });
  }

  // OTP verified and not expired
  // Encrypt the new password and update the user's password in the database
  const salt = await bcryptjs.genSalt(12);
  if (salt) {
    const hash = await bcryptjs.hash(password, salt);
    await User.findOneAndUpdate({ email: email }, { $set: { password: hash } });

    // Delete the OTP from the database as it has been used
    await ResetToken.findOneAndDelete({ otp: req.query.otp });

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } else {
    return res.status(500).json({
      reset: true,
      err: "Unexpected Error, Please try again.",
      email: email,
    });
  }
});

module.exports = router;
