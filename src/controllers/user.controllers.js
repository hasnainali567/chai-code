import asyncHandler from '../utils/asyncHandler.js';
import { registerSchema } from '../validators/user.validator.js';
import ApiError from '../utils/apiError.js'
import User from '../models/user.model.js'
import Video from '../models/video.model.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/apiResponse.js';
import fs, { watch } from 'fs';
import { OPTIONS } from '../constant.js';
import jwt from 'jsonwebtoken';
import generateAccessAndRefreshToken from '../utils/jwtTokens.js';
import { Subscription } from '../models/subcribtion.model.js';
import mongoose from 'mongoose';

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

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(registeredUser);
    res.status(201)
        .cookie('refreshToken', refreshToken, OPTIONS)
        .cookie('accessToken', accessToken, OPTIONS)
        .json(new ApiResponse(201, 'User registered successfully', { user: registeredUser, accessToken }));

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

    const user = await User.findOne({ $and: [{ email }, { username }] });
    if (!user) {
        throw new ApiError(401, 'Invalid email or username');
    }

    if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, 'Invalid password');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

    const loggedInUser = await User.findById(user._id).select('-password -__v -refreshToken -watchHistory -avatar.public_id -coverImage.public_id');

    res.status(200)
        .cookie('refreshToken', refreshToken, OPTIONS)
        .cookie('accessToken', accessToken, OPTIONS)
        .json(new ApiResponse(200, 'Login successful', { user : loggedInUser, accessToken }));

});

const logoutUser = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const user = await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } }, { new: true });

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

    console.log(req.body);
    
    if (!(req.body.username || req.body.fullName)) {
        throw new ApiError(400, 'No data provided for update');
    }
    const { username, fullName, } = req.body;

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

const getUserChannelProfile = asyncHandler(async (req, res, next) => {
    const { username } = req.params;

    if (!username.trim()) {
        throw new ApiError(400, 'Username is required');
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase().trim()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribers: { $size: "$subscribers" },
                subscribedTo: { $size: "$subscribedTo" },
                isSubscribed: {
                    $in: [
                        new mongoose.Types.ObjectId(req.user ? req.user._id : null),
                        "$subscribers.subscriber"
                    ]
                }
            }
        },
        {
            $project: {
                password: 0,
                refreshToken: 0,
                __v: 0,
                "avatar.public_id": 0,
                "coverImage.public_id": 0,
                email: 0,
                watchHistory: 0,
                updatedAt: 0
            }
        },
        {
            $lookup : {
                from: "videos",
                localField : "_id",
                foreignField: 'owner',
                as : 'videos',
                pipeline : [
                    {
                        $project : {
                            updatedAt : 0,
                            'video.public_id' : 0,
                            'thumbnail.public_id' : 0,
                            owner : 0,
                            __v : 0
                        }
                    }
                ]
            }
        }
    ]);

    if (!channel || channel.length === 0) {
        throw new ApiError(404, 'User not found');
    }

    res.status(200).json(new ApiResponse(200, 'User channel profile fetched successfully', { channel: channel[0] }));
});

const getWatchHistory = asyncHandler(async (req, res, next) => {
    const user = req.user;

    const history = await User.aggregate([
        {
            $match: {
                _id: user._id
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        _id: 0
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $arrayElemAt: ["$owner", 0] }
                        }
                    },
                    {
                        $project: {
                            updatedAt: 0,
                            video: 0,
                            "thumbnail.public_id": 0,
                            __v: 0,
                            createdAt: 0
                        }
                    }
                ]
            }
        },
        {
            $project: {
                watchHistory: 1,
                _id: 0,
            }
        }
    ]);


    if (!history) {
        throw new ApiError(500, 'internal server error');
    }


    res.status(200).json(new ApiResponse(200, 'History fetched successfully ', { watchHistory: history[0].watchHistory }))
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
    getUserChannelProfile,
    getWatchHistory
};
