import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Shared email format check — also imported by the auth routes for input validation.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      // IMPORTANT: this validator runs on the PLAINTEXT password.
      // Mongoose runs validation BEFORE the pre('save') hash hook below,
      // so the 8-char minimum is enforced before the value is hashed.
      minlength: [8, "Password must be at least 8 characters"],
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// Hash the password before saving — but only when it was set or changed,
// so updating other fields later won't re-hash an already-hashed password.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10); // 10 rounds
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compares a plaintext attempt against the stored hash.
// Resolves to a boolean (bcrypt.compare is async).
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
