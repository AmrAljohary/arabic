const express = require("express");
const router = express.Router();
const { User } = require("../model/user");
const bcryptjs = require("bcryptjs");
const passport = require("passport");
require("./passportLocal")(passport);
require("./googleAuth")(passport);
// require("./facebookAuth")(passport);
const userRoutes = require("./accountRoutes");
const HandelValidation = require("../middleWare/handelValidation");
const { userRegistrationValidation } = require("../validation/signup");
const verifyPassword = require("../middleWare/passwordMiddleware");
const multerUpload = require("../middleWare/image uploader");
const uploadVideoMiddleware = require("../middleWare/videouploader");
const uploadImageMiddleware = require("../middleWare/image uploader");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const streamifier = require("streamifier");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Configure Cloudinary
cloudinary.config({
  cloud_name: "dzuwpvydm",
  api_key: "669714923474566",
  api_secret: "wTt4h4lidYWvHyH_qDPXDLrz-7E",
});
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
const activeSessions = {};

router.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      logged: true,
    });
  } else {
    res.json({ logged: false });
  }
});
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Error during authentication" });
    }

    if (!user) {
      return res.status(401).json({
        message: "User Doesn't Exist!",
      });
    }

    // Update session data to track active user
    req.session.activeUserId = user._id.toString();

    // Check if the user already has an active session
    if (activeSessions[req.session.activeUserId]) {
      return res
        .status(403)
        .json({ message: "User is already logged in on another device." });
    }

    // Mark the user as active and store session data
    activeSessions[req.session.activeUserId] = req.sessionID;

    req.logIn(user, async (err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging in" });
      }

      return res.status(200).json({ message: "Login successful" });
    });
  })(req, res, next);
});
router.post(
  "/signup",
  HandelValidation(userRegistrationValidation),
  async (req, res) => {
    const { username, email, password, phone, fatherPhone, grade } = req.body;

    try {
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        return res.status(409).json({ error: "User already exists." });
      }

      const salt = await bcryptjs.genSalt(12);
      const hash = await bcryptjs.hash(password, salt);

      const userData = {
        username: username,
        email: email,
        password: hash,
        googleId: null,
        provider: "email",
        fatherPhone: fatherPhone,
        phone: phone,
        grade:grade
      };
      await User.create(userData);
      res.status(200).json({ message: "User registered successfully!" });
    } catch (error) {
      res.status(500).json({ error: "An internal server error occurred." });
    }
  }
);
router.get("/logout", (req, res) => {
  const userId = req.session.activeUserId; // Using activeUserId for tracking

  // Clear the active session and log the user out
  delete activeSessions[userId]; // Remove user's active session
  req.logout(); // Log the user out
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error while logging out" });
    }
    // User successfully logged out
    res.status(200).json({ message: "Logout successful." });
  });
});
router.get("/google", (req, res, next) => {
  // Retrieve additional data from query parameters or request body
  const phone = req.query.phone || req.body.phone || "";
  const fatherPhone = req.query.fatherPhone || req.body.fatherPhone || "";
  const grade = req.query.grade || req.body.grade || "";

  // Initialize the Google authentication process
  passport.authenticate("google", {
    scope: ["profile", "email"],
    passReqToCallback: true, // Pass the req object to the callback
    state: JSON.stringify({
      phone,
      fatherPhone,
      grade,
    }),
  })(req, res, next);
});
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // If the user authentication with Google fails, this block will not be reached.
    // However, if you want to handle an additional failure case (e.g., if Google authentication succeeds but your app-specific check fails),
    // you can add that check here and send a custom error message.

    // If you want to send a message for failed authentication, you can do something like this:
    if (!req.user) {
      return res.status(401).json({ message: "Google authentication failed." });
    }

    // If the authentication was successful, send a success message.
    res.status(200).json({ message: "Google authentication successful." });
  }
);
router.get("/profile", checkAuth, async (req, res) => {
  try {
    // Assuming the user data is available in the req.user object
    const userData = await User.findById(req.user._id);

    // Create a custom response object
    const customResponse = {
      username: userData.username,
      email: userData.email,
      image: userData.image,
      isVerified: userData.isVerified,
      provider: userData.provider,
      phone: userData.phone,
      fatherPhone: userData.fatherPhone,
      grade: userData.grade,
    };

    // Send the custom response as a JSON response
    res.json(customResponse);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Middleware to ensure the user is authenticated
function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ message: "Please log in to continue!" });
  }
}

// Update user data
const allowedFields = ["username", "image", "phone", "fatherPhone"];

router.put(
  "/user/edit",
  checkAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const updatedUserData = req.body; // Send all user details for update

      // Check if the user's provider is not 'email'
      if (req.user.provider !== "email") {
        return res.status(403).json({
          message: "User's provider does not allow data modification.",
        });
      }

      // Filter out fields that are not allowed
      for (const key in updatedUserData) {
        if (!allowedFields.includes(key)) {
          return res.status(500).json({ message: `Invalid field: ${key}` }); // Return an error response
        }
      }

      // Handle image upload
      if (req.file) {
        const posterFile = req.file;
        const stream = streamifier.createReadStream(posterFile.buffer);

        const cloudinaryUploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "image", folder: "posters" },
          (posterError, posterResult) => {
            if (posterError) {
              console.error("Cloudinary Poster Error:", posterError);
              return res
                .status(500)
                .json({ message: "Error uploading poster to Cloudinary." });
            }

            updatedUserData.image = posterResult.secure_url;

            // Update user data
            updateUser(userId, updatedUserData, res);
          }
        );

        stream.pipe(cloudinaryUploadStream);
      } else {
        // No image to upload, directly update user data
        updateUser(userId, updatedUserData, res);
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  }
);

const updateUser = async (userId, updatedUserData, res) => {
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Update user data
  for (const key in updatedUserData) {
    user[key] = updatedUserData[key];
  }

  const updatedUser = await user.save();

  // Do not include password in the response
  updatedUser.password = undefined;

  res
    .status(200)
    .json({ message: "User data updated successfully", user: updatedUser });
};

// Change password
router.put("/user/changePassword", checkAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the user's provider is not 'email'
    if (req.user.provider !== "email") {
      return res
        .status(403)
        .json({ message: "User's provider does not allow password change." });
    }

    // Verify the old password
    const isMatch = await bcryptjs.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password does not match." });
    }

    // Update the password
    const salt = await bcryptjs.genSalt(12);
    const hash = await bcryptjs.hash(newPassword, salt);
    user.password = hash;

    const updatedUser = await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

// router.get(
//     "/facebook",
//     passport.authenticate("facebook", { scope: ["email"] })
// );

// router.get(
//     "/facebook/callback",
//     passport.authenticate("facebook", { failureRedirect: "/login" }),
//     (req, res) => {
//         res.redirect("/profile");
//     }
// );
router.use(userRoutes);

module.exports = router;
