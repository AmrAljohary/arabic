const { User } = require("../model/user");
const bcryptjs = require("bcryptjs");
var localStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
  passport.use(
    new localStrategy({ usernameField: "email" }, (email, password, done) => {
      User.findOne({ email: email })
        .exec((err, data) => {
          if (err) throw err;
          if (!data) {
            return done(null, false, { message: "User Doesn't Exist !" });
          }
          bcryptjs.compare(password, data.password, (err, match) => {
            if (err) {
              return done(null, false);
            }
            if (!match) {
              return done(null, false, { message: "Password Doesn't match !" });
            }
            if (match) {
              return done(null, data);
            }
          });
        });
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
