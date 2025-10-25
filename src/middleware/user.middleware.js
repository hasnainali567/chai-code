import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyUser = asyncHandler(async (req, res, next) => { 
    try {
        const token = req.cookies.accessToken || req.headers['authorization']?.split(' ')[1];

        
        if (!token) {
            return res.status(401).json({ message: 'Access token is missing' });
        }
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
        const user = await User.findById(decoded.id).select('-password -__v -refreshToken');
       if (!user) {
           return res.status(404).json({ message: 'User not found' });
       }
       req.user = user;
       next();
    } catch (error) {
        throw new ApiError(401, 'Invalid or expired token');
    }
});

export { verifyUser };