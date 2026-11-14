// backend/controller/auth.controller.js
import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import JWT from "jsonwebtoken";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// `sameSite: "none"` requires `secure: true`, which browsers only honour over
// HTTPS - hardcoding it broke the cookie during local http development.
const cookieOptions = () => {
  const crossSite = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite,
    path: "/",
  };
};

const signToken = (user) =>
  JWT.sign(
    { id: user._id.toString(), userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "7d" }
  );

export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters" });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    // Generate random avatar
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    // Create user
    const newUser = await User.create({
      email,
      password,
      fullName,
      profilePicture: randomAvatar,
    });

    // Create Stream user (don't let it block signup)
    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        role: "user",
        name: newUser.fullName,
        image: newUser.profilePicture || "",
      });
      console.log(`Stream user created for ${newUser.fullName}`);
    } catch (error) {
      console.log("Error in creating stream user:", error);
    }

    // Generate JWT
    const token = signToken(newUser);

    res.cookie("jwt", token, { ...cookieOptions(), maxAge: SEVEN_DAYS_MS });

    // Return user without password
    const userWithoutPassword = newUser.toObject();
    delete userWithoutPassword.password;

    // The cookie is httpOnly, so the browser cannot read it back for the
    // Socket.IO handshake or an Authorization header - return the token too.
    res.status(201).json({ success: true, token, user: userWithoutPassword });

  } catch (error) {
    console.log("Error in signup controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);

    res.cookie("jwt", token, { ...cookieOptions(), maxAge: SEVEN_DAYS_MS });

    // Return user without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.json({ success: true, token, user: userWithoutPassword });

  } catch (error) {
    console.log("Error in login controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt", cookieOptions());
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user?._id;

    const {
      fullName,
      bio,
      nativeLanguage,
      learningLanguage,
      location
    } = req.body;

    // Validate fields
    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
          !location && "location",
        ].filter(Boolean),
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullName,
        bio,
        nativeLanguage,
        learningLanguage,
        location,
        isOnboarded: true,
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePicture || "",
      });
      console.log(`Stream user updated for ${updatedUser.fullName}`);
    } catch (streamError) {
      console.log("Error in updating stream user:", streamError);
    }

    res.status(200).json({
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error("Error in onboard controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}