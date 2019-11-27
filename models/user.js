const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

// Schema Setup
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  avatar: String,
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isAdmin: { type: Boolean, default: false }
});

//adds methods to User
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
