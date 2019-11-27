const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Campground = require("../models/campground");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

//Root Route
router.get("/", (req, res) => res.render("landing"));

//Show Register Form
router.get("/register", (req, res) => {
  res.render("register", { page: "register" });
});
//Handle Sign Up Logic
router.post("/register", (req, res) => {
  const newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    avatar: req.body.avatar
  });
  if (req.body.adminCode === process.env.ADMIN_KEY) {
    newUser.isAdmin = true;
  }
  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      req.flash("error", err.message);
      return res.redirect("/register");
    }
    passport.authenticate("local")(req, res, () => {
      req.flash("success", "Welcome to YelpCamp, " + user.username);
      res.redirect("/campgrounds");
    });
  });
});

//Show Login Form
router.get("/login", (req, res) => {
  res.render("login", { page: "login" });
});
//Handle Login Logic
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
  }),
  (req, res) => {}
);

//Logout Route
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "Logged Out Successfully!");
  res.redirect("/campgrounds");
});

//Reset Password Route
router.get("/forgot", (req, res) => {
  res.render("users/forgot");
});

router.post("/forgot", (req, res, next) => {
  async.waterfall(
    [
      function(done) {
        crypto.randomBytes(20, (err, buf) => {
          const token = buf.toString("hex");
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, (err, user) => {
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/forgot");
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 900000; // 15 mins

          user.save(err => {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        const smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "yelpcamp.an@gmail.com",
            pass: process.env.GMAILPWD
          }
        });
        const mailOptions = {
          to: user.email,
          from: "learntocodeinfo@gmail.com",
          subject: "Node.js Password Reset",
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n"
        };
        smtpTransport.sendMail(mailOptions, err => {
          console.log("mail sent");
          req.flash(
            "success",
            "An e-mail has been sent to " +
              user.email +
              " with further instructions."
          );
          done(err, "done");
        });
      }
    ],
    err => {
      if (err) return next(err);
      res.redirect("/forgot");
    }
  );
});

router.get("/reset/:token", (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    (err, user) => {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot");
      }
      res.render("users/reset", { token: req.params.token });
    }
  );
});

router.post("/reset/:token", (req, res) => {
  async.waterfall(
    [
      function(done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
          },
          (err, user) => {
            if (!user) {
              req.flash(
                "error",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, err => {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(err => {
                  req.logIn(user, err => {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
      function(user, done) {
        const smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "yelpcamp.an@gmail.com",
            pass: process.env.GMAILPWD
          }
        });
        const mailOptions = {
          to: user.email,
          from: "learntocodeinfo@mail.com",
          subject: "Your password has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n"
        };
        smtpTransport.sendMail(mailOptions, err => {
          req.flash("success", "Success! Your password has been changed.");
          done(err);
        });
      }
    ],
    err => {
      res.redirect("/campgrounds");
    }
  );
});

//User Profile Route
router.get("/users/:id", (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err) {
      req.flash("error", "Something went wrong!");
      return res.redirect("/");
    }
    Campground.find()
      .where("author.id")
      .equals(foundUser._id)
      .exec((err, campgrounds) => {
        if (err) {
          req.flash("error", "Something went wrong!");
          return res.redirect("/");
        }
        res.render("users/show", { user: foundUser, campgrounds: campgrounds });
      });
  });
});

module.exports = router;
