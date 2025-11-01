import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyUserOptional = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers?.authorization?.split(" ")[1];

  // 🟢 No token → treat as guest user
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "-password -__v -refreshToken"
    );

    // If token valid but user deleted from DB
    if (!user) {
      return next(); // treat as guest (don't throw error)
    }

    req.user = user;
    next();
  } catch (error) {
    // ❌ Invalid/expired token → ignore, treat as guest
    return next();
  }
});

export { verifyUserOptional };
