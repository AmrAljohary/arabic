const FacebookStrategy = require("passport-facebook").Strategy;
const user = require("../model/user");
const clientID = require("../config/facebookData.js").clientId;
const clientSecret = require("../config/facebookData.js").clientSecret;
const webURL = process.env.webURL;

module.exports = function(passport) {
    passport.use(
        new FacebookStrategy({
                clientID: clientID,
                clientSecret: clientSecret,
                callbackURL: webURL + "/facebook/callback",
            },
            (accessToken, refreshToken, profile, done) => {
                // find if a user exists with this email or not
                user.findOne({ email: profile._json.email }).then((data) => {
                    if (data) {
                        // User exists, update data if needed
                        return done(null, data);
                    } else {
                        // Create a new user
                        const newUser = new user({
                            username: profile.displayName,
                            email: profile._json.email,
                            image: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                            facebookId: profile.id,
                            password: null,
                            provider: "facebook",
                            isVerified: true,
                        });

                        newUser.save((err, data) => {
                            if (err) {
                                console.error(err);
                                return done(err, null);
                            }
                            return done(null, data);
                        });
                    }
                });
            }
        )
    );

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        user.findById(id, function(err, user) {
            done(err, user);
        });
    });
};