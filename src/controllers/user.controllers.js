import asyncHandler from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validators/user.validator.js';
import ApiError from '../utils/apiError.js'
import User from '../models/user.model.js'
import { uploadToCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/apiResponse.js';
import fs from 'fs';
import { OPTIONS } from '../constant.js';

const generateAccessAndRefreshToken = async (user) => {
    try {
        const accessToken = user.generateAuthToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, 'Token Generation Error', error.message);
    }
}


const registerUser = asyncHandler(async (req, res, next) => {
    try {
        console.log(req.body);

        if (!req.body || Object.keys(req.body).length === 0) {
            throw new ApiError(400, 'Validation Error', ['Request body is missing or empty']);
        }

        await registerSchema.validateAsync(req.body);
    } catch (error) {
        console.log(error);

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
        throw new ApiError(409, 'User with given email or username already exists');
    }

    const avatarLocalPath = req.files && req.files['avatar'] && req.files['avatar'][0].path;
    const coverImageLocalPath = req.files && req.files['coverImage'] ? req.files['coverImage'][0].path : '';

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required');
    }

    const avatar = await uploadToCloudinary(avatarLocalPath, 'avatars')
    const coverImage = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath, 'coverImages') : '';

    const newUser = new User({
        username, fullName, email, password, avatar: avatar.secure_url, coverImage: coverImage ? coverImage.secure_url : ''
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
    .json(new ApiResponse(200, 'Login successful', { user, accessToken, refreshToken }));

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
        .json(new ApiResponse(200, 'Token refreshed successfully', { accessToken, refreshToken: newRefreshToken }));
    } catch (error) {
        throw new ApiError(500, 'Token Refresh Error', error?.message || 'An error occurred while refreshing token');
    }
});


export { registerUser, loginUser, logoutUser, refreshToken };