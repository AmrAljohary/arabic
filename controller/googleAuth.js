var GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../model/user");
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const webURL = process.env.webURL;

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: webURL + "/google/callback",
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, done) => {
        const authData = JSON.parse(req.query.state); // Parsing the state parameter
        console.log(authData);
        User.findOne({ email: profile.emails[0].value })
          .then((data) => {
            if (data) {
              // User exists, return the user data
              return done(null, data);
            } else {
              const newUser = new User({
                username: profile.displayName,
                email: profile.emails[0].value,
                password: null,
                image: profile.photos[0].value,
                googleId: profile.id,
                provider: "google",
                isVerified: true,
                phone: authData.phone, // Include the role from authData
                fatherPhone: authData.fatherPhone, // Include the role from authData
                grade: authData.grade // Include the role from authData
              });

              // Save the new user
              newUser.save(function (err, createdUser) {
                if (err) {
                  return done(err, null);
                }
                return done(null, createdUser);
              });
            }
          })
          .catch((err) => {
            return done(err, null);
          });
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
