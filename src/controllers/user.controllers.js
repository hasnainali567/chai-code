import asyncHandler from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validators/user.validator.js';
import ApiError from '../utils/apiError.js'
import User from '../models/user.model.js'
import Video from '../models/video.model.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/apiResponse.js';
import fs from 'fs';
import { OPTIONS } from '../constant.js';
import jwt from 'jsonwebtoken';
import generateAccessAndRefreshToken from '../utils/jwtTokens.js';

const registerUser = asyncHandler(async (req, res, next) => {
    try {

        if (!req.body || Object.keys(req.body).length === 0) {
            throw new ApiError(400, 'Validation Error', ['Request body is missing or empty']);
        }

        await registerSchema.validateAsync(req.body);
    } catch (error) {
        throw new ApiError(
            400,
            'Validation Error',
            error?.details?.map(err => err.message) || [error.message]
        );
    }

    const { username, fullName, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        if (req.files && req.files['avatar']) {
            const avatarLocalPath = req.files['avatar'][0].path;
            fs.unlinkSync(avatarLocalPath);
        }

        if (req.files && req.files['coverImage']) {
            const coverImageLocalPath = req.files['coverImage'][0].path;
            fs.unlinkSync(coverImageLocalPath);
        }
        return new ApiError(409, 'User with given email or username already exists');
    }

    console.log(req.files);
    

    const avatarLocalPath = req.files && req.files['avatar'] && req.files['avatar'][0].path;
    const coverImageLocalPath = req.files && req.files['coverImage'] ? req.files['coverImage'][0].path : null;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required');
    }

    const avatar = await uploadToCloudinary(avatarLocalPath, 'avatars')
    const coverImage = coverImageLocalPath && await uploadToCloudinary(coverImageLocalPath, 'coverImages');

    const normalizedUsername = username.trim().toLowerCase();
    const newUser = new User({
        username: normalizedUsername, fullName, email, password, avatar, coverImage
    });
    await newUser.save();

    const registeredUser = await User.findById(newUser._id).select('-password -__v -refreshToken');

    if (!registeredUser) {
        throw new ApiError(500, 'User registration failed');
    }
    res.status(201).json(new ApiResponse(201, 'User registered successfully', { user: registeredUser }));





});

const loginUser = asyncHandler(async (req, res, next) => {

    if (!req.body || Object.keys(req.body).length == 0) {
        throw new ApiError(400, 'Validation Error', 'Request body is missing or empty');
    }

    const { username, email, password } = req.body;

    if (!(username && email && password)) {
        throw new ApiError(400, 'Validation Error', 'Username or email and password are required');
    }

    if (!email) {
        throw new ApiError(400, 'Validation Error', 'Email is required for login');
    }

    if (!password) {
        throw new ApiError(400, 'Validation Error', 'Password is required for login');
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

    const loggedInUser = await User.findById(user._id).select('-password -__v -refreshToken');

    res.status(200)
        .cookie('refreshToken', refreshToken, OPTIONS)
        .cookie('accessToken', accessToken, OPTIONS)
        .json(new ApiResponse(200, 'Login successful', { loggedInUser, accessToken }));

});

const logoutUser = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const user = await User.findByIdAndUpdate(userId, { $set: { refreshToken: undefined } }, { new: true });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    res.status(200)
        .clearCookie('refreshToken', OPTIONS)
        .clearCookie('accessToken', OPTIONS)
        .json(new ApiResponse(200, 'Logout successful'));
});

const refreshToken = asyncHandler(async (req, res, next) => {
    try {
        const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];
        if (!oldRefreshToken) {
            throw new ApiError(401, 'Refresh token is missing');
        }
        let decoded;

        try {
            decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_JWT_SECRET);
        } catch (error) {
            throw new ApiError(401, 'Invalid or expired refresh token');
        }
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== oldRefreshToken) {
            throw new ApiError(401, 'Invalid refresh token');
        }
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user);
        res.status(200)
            .cookie('refreshToken', newRefreshToken, OPTIONS)
            .cookie('accessToken', accessToken, OPTIONS)
            .json(new ApiResponse(200, 'Token refreshed successfully', { accessToken }));
    } catch (error) {
        throw new ApiError(500, 'Token Refresh Error', error?.message || 'An error occurred while refreshing token');
    }
});

const resetCurrentUserPassword = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!(currentPassword && newPassword)) {
        throw new ApiError(400, 'Validation Error', 'Current password and new password are required');
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    if (!(await user.comparePassword(currentPassword))) {
        throw new ApiError(401, 'Current password is incorrect');
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: true });
    res.status(200).json(new ApiResponse(200, 'Password reset successful'));
});

const getCurrentUserProfile = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    res.status(200).json(new ApiResponse(200, 'User profile fetched successfully', { user }));
});

const updateCurrentUserProfile = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { username, fullName, } = req.body;

    if (!username && !fullName) {
        throw new ApiError(400, 'No data provided for update');
    }

    if (username) {
        const normalizedUsername = username?.trim().toLowerCase();


        if (normalizedUsername && normalizedUsername === user.username?.toLowerCase()) {
            throw new ApiError(304, 'New username must be different from the current username');
        }

        const existingUser = await User.findOne({ username, _id: { $ne: user._id } }).lean();

        if (existingUser) {
            throw new ApiError(409, 'Username is already taken by another user');
        }
    }

    const updatedFields = {
        ...(username && { username }),
        ...(fullName && { fullName }),
    };

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        updatedFields,
        { new: true, runValidators: true }
    ).select('-password -__v -refreshToken');

    if (!updatedUser) {
        throw new ApiError(404, 'User not found');
    }
    res.status(200).json(new ApiResponse(200, 'User profile updated successfully', { user: updatedUser }));
});

const updateCurrentUserAvatar = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!req.file) {
        throw new ApiError(400, 'No avatar file uploaded');
    }
    const avatarLocalPath = req.file.path;
    const avatar = await uploadToCloudinary(avatarLocalPath, 'avatars');
    
    user.avatar = avatar;
    await user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, 'User avatar updated successfully', { avatar: user.avatar }));
    await deleteFromCloudinary(user.avatar.public_id);
});

const updateCurrentUserCoverImage = async (req, res) => {
    const user = req.user;
    if (!req.file) {
        throw new ApiError(400, 'No cover image uploaded');
    }

    const coverImageLocalPath = req.file.path;
    const coverImage = await uploadToCloudinary(coverImageLocalPath, 'cover');

    user.coverImage = coverImage;
    await user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, 'User cover image updated successfully', { coverImage: user.coverImage }));
}

const getWatchHistory = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const user = await User.findById(userId).populate('watchHistory');
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    res.status(200).json(new ApiResponse(200, 'Watch history fetched successfully', { watchHistory: user.watchHistory }));

});


    
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    resetCurrentUserPassword,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    updateCurrentUserAvatar,
    updateCurrentUserCoverImage,
    getWatchHistory
};
