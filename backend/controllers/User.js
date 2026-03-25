const User = require("../models/User");
const crypto = require("crypto");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/Cloudinary");
const Mailer = require("../utils/Mailer");
const admin = require("../utils/firebaseAdmin");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client();
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "311416409407-0723d495b5ohme2egqji7c7lfbek4g4k.apps.googleusercontent.com";

const getBackendBaseUrl = (req) =>
  process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;

const getFrontendBaseUrl = () =>
  process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";

const sendVerificationEmail = async (user, req) => {
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${getBackendBaseUrl(req)}/api/v1/users/verify-email/${verificationToken}`;
  const appName = process.env.APP_NAME || "Infinite Pulls";
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c1d19;">
      <div style="background: #f28c79; color: #2a201d; padding: 24px; border-radius: 18px 18px 0 0;">
        <h2 style="margin: 0;">Welcome to ${appName}</h2>
      </div>
      <div style="background: #fff7f1; padding: 24px; border: 1px solid #e7c3b4; border-top: 0; border-radius: 0 0 18px 18px;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Thanks for registering. Verify your email to activate your account and start collecting.</p>
        <div style="margin: 28px 0;">
          <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 22px; background: #f28c79; color: #2a201d; text-decoration: none; font-weight: bold; border-radius: 12px;">Verify Email</a>
        </div>
        <p style="font-size: 13px; color: #6f5a52;">If the button does not work, copy this link into your browser:</p>
        <p style="font-size: 12px; word-break: break-all; color: #6f5a52;">${verificationUrl}</p>
      </div>
    </div>
  `;

  return Mailer({
    email: user.email,
    subject: `Verify your email - ${appName}`,
    message,
  });
};

const sendProfileUpdatedEmail = async (user, updatedFields = []) => {
  const appName = process.env.APP_NAME || "Infinite Pulls";
  const changedFieldsMarkup = updatedFields.length
    ? `<ul style="padding-left: 18px; color: #6f5a52;">${updatedFields.map((field) => `<li>${field}</li>`).join("")}</ul>`
    : '<p style="color: #6f5a52;">Your account details were updated successfully.</p>';

  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c1d19;">
      <div style="background: #f3df9b; color: #2a201d; padding: 24px; border-radius: 18px 18px 0 0;">
        <h2 style="margin: 0;">Profile Updated</h2>
      </div>
      <div style="background: #fff7f1; padding: 24px; border: 1px solid #e7c3b4; border-top: 0; border-radius: 0 0 18px 18px;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your ${appName} profile was updated.</p>
        ${changedFieldsMarkup}
        <p style="color: #6f5a52;">If you did not make this change, please secure your account immediately.</p>
      </div>
    </div>
  `;

  return Mailer({
    email: user.email,
    subject: `Profile updated - ${appName}`,
    message,
  });
};

const mapFirebaseProvider = (provider) => {
  if (!provider) return null;
  if (provider.includes("google")) return "google";
  if (provider.includes("facebook")) return "facebook";
  return null;
};

const verifyGoogleIdentityToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      provider: mapFirebaseProvider(decodedToken.firebase?.sign_in_provider),
      email: decodedToken.email,
      uid: decodedToken.uid,
      name: decodedToken.name || decodedToken.displayName,
      picture: decodedToken.picture,
      verified: decodedToken.email_verified !== false,
    };
  } catch (firebaseError) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    return {
      provider: "google",
      email: payload?.email,
      uid: payload?.sub,
      name: payload?.name,
      picture: payload?.picture,
      verified: payload?.email_verified !== false,
    };
  }
};

// ========== REGISTER USER ==========
exports.registerUser = async (req, res) => {
  try {
    console.log("📝 Register user request received");
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    console.log("✅ Basic validation passed");

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const encodedName = encodeURIComponent(name);
    const avatarData = {
      public_id: "avatar_" + Date.now(),
      url: `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=150`,
    };

    const user = await User.create({
      name,
      email,
      password,
      avatar: avatarData,
      isVerified: false,
      isActive: true,
      authProvider: "local",
    });

    // Generate email verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // ✅ FIXED: include '/users' in the URL
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${verificationToken}`;

    const message = `
      <h2>Welcome to ${process.env.APP_NAME}</h2>
      <p>Click the link below to verify your email and activate your account:</p>
      <a href="${verificationUrl}" target="_blank" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Your Email</a>
      <br><br>
      <p>If you didn't request this, please ignore this email.</p>
      <p><small>Or copy this link: ${verificationUrl}</small></p>
    `;

    console.log("📨 Sending verification email to local user:", user.email);

    // Send email in the background (non-blocking) so registration responds quickly
    sendVerificationEmail(user, req)
      .then(() => {
        console.log("✅ Verification email sent to:", user.email);
      })
      .catch((emailErr) => {
        console.error(
          "⚠️ Verification email failed (user still registered):",
          emailErr.message,
        );
      });

    // Respond immediately without waiting for email
    res.status(201).json({
      success: true,
      message: `Registration successful! Verification email sent to ${user.email}. You can verify your email anytime from that link.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

// ========== LOGIN USER (LOCAL ONLY) ==========
exports.loginUser = async (req, res) => {
  try {
    console.log("🔐 Login attempt for:", req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please enter email and password" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isActive)
      return res
        .status(403)
        .json({ message: "Your account is inactive. Please contact support." });

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log("✅ Login successful for:", email);
    res.status(200).json({ success: true, token, user: userResponse });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: "Login failed. Please try again." });
  }
};

// ========== UPDATE PROFILE ==========
exports.updateProfile = async (req, res) => {
  try {
    console.log("📝 Update profile request for user:", req.user.id);
    console.log("User role:", req.user.role);
    console.log("Request body:", req.body);
    console.log("Has file:", !!req.file);

    // Get current user
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build update data
    const updateData = {};
    const updatedFields = [];

    // Handle name (required)
    if (req.body.name !== undefined) {
      const name = req.body.name?.trim();
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }
      updateData.name = name;
      if (name !== currentUser.name) {
        updatedFields.push("Name");
      }
    }

    // Handle contact (optional)
    if (req.body.contact !== undefined) {
      const contact = req.body.contact?.trim() || "";
      // Validate contact number if provided
      if (contact && !/^(\+?\d{10,15})$/.test(contact)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid contact number",
        });
      }
      updateData.contact = contact;
      if (contact !== (currentUser.contact || "")) {
        updatedFields.push("Contact number");
      }
    }

    // Handle address fields
    const addressFields = {};

    if (req.body.city !== undefined) {
      addressFields.city = req.body.city?.trim() || "";
    }

    if (req.body.barangay !== undefined) {
      addressFields.barangay = req.body.barangay?.trim() || "";
    }

    if (req.body.street !== undefined) {
      addressFields.street = req.body.street?.trim() || "";
    }

    if (req.body.zipcode !== undefined) {
      const zipcode = req.body.zipcode?.trim() || "";
      // Validate zipcode if provided
      if (zipcode && !/^[0-9]{4}$/.test(zipcode)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 4-digit zipcode",
        });
      }
      addressFields.zipcode = zipcode;
    }

    // Only add address if any field has value
    const hasAddressData = Object.values(addressFields).some(
      (value) => value !== "",
    );
    if (hasAddressData) {
      updateData.address = addressFields;
      updatedFields.push("Shipping address");
    }

    // Handle avatar upload
    if (req.file) {
      console.log("🖼️ Uploading avatar...");

      // Delete old avatar if exists and not default
      if (
        currentUser.avatar?.public_id &&
        !currentUser.avatar.url.includes("ui-avatars.com")
      ) {
        try {
          await deleteFromCloudinary(currentUser.avatar.public_id);
        } catch (err) {
          console.warn("Could not delete old avatar:", err.message);
        }
      }

      // Upload new avatar
      const avatarResult = await uploadToCloudinary(
        req.file.path,
        "rubbersense/avatars",
      );
      updateData.avatar = {
        public_id: avatarResult.public_id,
        url: avatarResult.url,
      };
      updatedFields.push("Profile photo");

      // Clean up temp file
      const fs = require("fs");
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Failed to delete temp file:", err.message);
      });
    }

    // DO NOT ALLOW EMAIL CHANGES
    // If email is in request body, ignore it or return error
    if (req.body.email !== undefined && req.body.email !== currentUser.email) {
      console.warn(
        "⚠️ User attempted to change email from",
        currentUser.email,
        "to",
        req.body.email,
      );
      return res.status(400).json({
        success: false,
        message:
          "Email cannot be changed. Please contact support if you need to update your email.",
      });
    }

    console.log("Update data:", updateData);

    // If no data to update, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update",
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select(
      "-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire",
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found after update",
      });
    }

    console.log("✅ Profile updated successfully for", updatedUser.role);

    sendProfileUpdatedEmail(updatedUser, [...new Set(updatedFields)]).catch(
      (emailErr) => {
        console.error("⚠️ Profile update email failed:", emailErr.message);
      },
    );

    res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Profile update failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// ========== GOOGLE LOGIN ==========
exports.firebaseGoogleAuth = async (req, res) => {
  try {
    console.log("Google auth attempt");
    const { idToken } = req.body;

    if (!idToken) {
      return res
        .status(400)
        .json({
          message: "Google identity token is required for Google login",
        });
    }

    const decodedToken = await verifyGoogleIdentityToken(idToken);
    const provider = decodedToken.provider;

    if (provider && provider !== "google") {
      return res
        .status(400)
        .json({ message: "Invalid provider token for Google login" });
    }

    const email = decodedToken.email;
    const uid = decodedToken.uid;
    const name = decodedToken.name;
    const picture = decodedToken.picture;

    if (!email)
      return res
        .status(400)
        .json({ message: "Invalid token, no email returned from provider" });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: uid,
        avatar: {
          public_id: `google_${uid}`,
          url:
            picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email.split("@")[0])}&background=random&color=fff&size=150`,
        },
        isVerified: true,
        isActive: true,
        firebaseUID: uid,
        authProvider: "google",
      });
      console.log("User auto-created for Google login");
    }

    if (user.isDeleted)
      return res.status(403).json({
        message: "Your account has been deleted. Please contact support.",
      });
    if (!user.isActive)
      return res
        .status(403)
        .json({ message: "Your account is inactive. Please contact support." });

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      token,
      user: userResponse,
      message: "Google authentication successful",
    });
  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
      error: error.message,
    });
  }
};

// ========== FACEBOOK LOGIN ==========
exports.firebaseFacebookAuth = async (req, res) => {
  try {
    console.log("Facebook auth attempt via Firebase ID token");
    const { idToken } = req.body;

    if (!idToken) {
      return res
        .status(400)
        .json({ message: "Firebase idToken is required for Facebook login" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const provider = mapFirebaseProvider(
      decodedToken.firebase?.sign_in_provider,
    );

    if (provider && provider !== "facebook") {
      return res
        .status(400)
        .json({ message: "Invalid provider token for Facebook login" });
    }

    let email = decodedToken.email;
    const uid = decodedToken.uid;
    const name = decodedToken.name || decodedToken.displayName;
    const picture = decodedToken.picture;

    if (!email) {
      // Create a fallback pseudo-email if FB user didn't share email
      email = `${uid}@facebook.com`;
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: uid,
        avatar: {
          public_id: `facebook_${uid}`,
          url:
            picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email.split("@")[0])}&background=random&color=fff&size=150`,
        },
        isVerified: true,
        isActive: true,
        firebaseUID: uid,
        authProvider: "facebook",
      });
      console.log("User auto-created for Facebook login");
    }

    if (user.isDeleted)
      return res.status(403).json({
        message: "Your account has been deleted. Please contact support.",
      });
    if (!user.isActive)
      return res
        .status(403)
        .json({ message: "Your account is inactive. Please contact support." });

    const token = user.getJwtToken();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      token,
      user: userResponse,
      message: "Facebook authentication successful",
    });
  } catch (error) {
    console.error(
      "FACEBOOK AUTH ERROR:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      message: "Facebook authentication failed",
      error: error.message,
    });
  }
};

// ========== FORGOT PASSWORD ==========
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found with this email" });

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Use FRONTEND_URL env variable or fallback to localhost
    const FRONTEND_URL = getFrontendBaseUrl();
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
      <br><br>
      <p>If you did not request this email, please ignore it.</p>
      <p><small>Or copy this link: ${resetUrl}</small></p>
    `;

    await Mailer({
      email: user.email,
      subject: "Password Recovery - " + process.env.APP_NAME,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Password reset email sent to: ${user.email}`,
    });
  } catch (error) {
    console.error("❌ FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== RESET PASSWORD ==========
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }

    // Hash the token the same way it was hashed when generating reset token
    const crypto = require("crypto");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with this token and check expiration
    const user = await require("../models/User").findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // token not expired
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// ========== CHANGE PASSWORD ==========
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new passwords are required",
      });
    }

    // Fetch user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ CHANGE PASSWORD ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// ========== VERIFY EMAIL ==========
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).send("Verification token missing");

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await require("../models/User").findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).send("Invalid or expired verification token");

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Redirect to frontend page
    const FRONTEND_URL = getFrontendBaseUrl();
    return res.redirect(`${FRONTEND_URL}/email-verified`);
  } catch (error) {
    console.error("❌ EMAIL VERIFICATION ERROR:", error);
    return res.status(500).send("Server error");
  }
};

// ========== SAVE PUSH TOKEN ==========
exports.savePushToken = async (req, res) => {
  try {
    const {
      pushToken,
      source = "unknown",
      projectExperience = null,
      applicationId = null,
    } = req.body;
    const userId = req.user.id;

    console.log("📱 Saving push token for user:", userId);
    console.log(
      "📱 Push token received:",
      pushToken ? pushToken.substring(0, 20) + "..." : "none",
    );

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: "Push token is required",
      });
    }

    // Optional: Validate if it's an Expo push token
    const { Expo } = require("expo-server-sdk");
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(
        "⚠️ Warning: Token may not be a valid Expo push token:",
        pushToken,
      );
    }

    const existingUser = await User.findById(userId).select(
      "+pushToken +pushTokenSource +pushTokenUpdatedAt",
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hasNativeTokenAlready =
      existingUser.pushToken &&
      existingUser.pushTokenSource &&
      existingUser.pushTokenSource !== "expo-go";

    if (
      source === "expo-go" &&
      hasNativeTokenAlready &&
      existingUser.pushToken !== pushToken
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Native app push token already registered. Expo Go token ignored.",
        token: existingUser.pushToken,
        source: existingUser.pushTokenSource,
      });
    }

    existingUser.pushToken = pushToken;
    existingUser.pushTokenSource = source;
    existingUser.pushTokenUpdatedAt = new Date();
    existingUser.pushTokenProject = projectExperience;
    existingUser.pushTokenApplicationId = applicationId;
    await existingUser.save({ validateBeforeSave: false });

    console.log(`✅ Push token saved for user: ${userId}`);
    console.log(
      "Saved token in DB:",
      existingUser.pushToken
        ? existingUser.pushToken.substring(0, 20) + "..."
        : "none",
    );

    res.status(200).json({
      success: true,
      message: "Push notification token saved successfully",
      token: existingUser.pushToken,
      source: existingUser.pushTokenSource,
      projectExperience: existingUser.pushTokenProject,
    });
  } catch (error) {
    console.error("❌ Error saving push token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save push token",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ========== GET USER PUSH TOKEN ==========
exports.getPushToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select(
      "+pushToken +pushTokenSource +pushTokenUpdatedAt +pushTokenProject +pushTokenApplicationId",
    );

    res.status(200).json({
      success: true,
      pushToken: user?.pushToken || null,
      pushTokenSource: user?.pushTokenSource || null,
      pushTokenUpdatedAt: user?.pushTokenUpdatedAt || null,
      pushTokenProject: user?.pushTokenProject || null,
      pushTokenApplicationId: user?.pushTokenApplicationId || null,
    });
  } catch (error) {
    console.error("❌ Error getting push token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get push token",
    });
  }
};

// ========== REMOVE PUSH TOKEN ==========
exports.removePushToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pushToken } = req.body || {};
    const user = await User.findById(userId).select(
      "+pushToken +pushTokenSource +pushTokenUpdatedAt",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (pushToken && user.pushToken && user.pushToken !== pushToken) {
      return res.status(200).json({
        success: true,
        message:
          "Stored push token belongs to another app session. No change made.",
      });
    }

    user.pushToken = null;
    user.pushTokenSource = null;
    user.pushTokenUpdatedAt = null;
    user.pushTokenProject = null;
    user.pushTokenApplicationId = null;
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Push token removed for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: "Push notification token removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing push token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove push token",
    });
  }
};
