import asyncHandler from '../utils/asyncHandler.js';
import { registerSchema } from '../validators/user.validator.js';
import ApiError from '../utils/apiError.js'
import User from '../models/user.model.js'
import { uploadToCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/apiResponse.js';

const generateAccessAndRefreshToken = (user) => {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    return { accessToken, refreshToken }
}


const registerUser = asyncHandler(async (req, res, next) => {
    try {
        await registerSchema.validateAsync(req.body, { abortEarly: false });
    } catch (error) {
        throw new ApiError(400, 'Validation Error', error.details.map(err => err.message));
    }

    const { username, fullName, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, 'User with given email or username already exists');
    }

    const avatarLocalPath = req.files && req.files['avatar'] && req.files['avatar'][0].path;
    const coverImageLocalPath = req.files && req.files['coverImage'] ? req.files['coverImage'][0].path : '';

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required');
    }

    const avatar = await uploadToCloudinary(avatarLocalPath, 'avatars')
    const coverImage = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath, 'coverImages') : '';

    // const newUser = new User({
    //     username, fullName, email, password, avatar: avatar.secure_url, coverImage : coverImage ? coverImage.secure_url : ''
    // });
    // await newUser.save();

    // const registeredUser = await User.findById(newUser._id).select('-password -__v -refreshToken');

    // if (!registeredUser) {
    //     throw new ApiError(500, 'User registration failed');
    // }
    res.status(201).json(new ApiResponse(201, 'User registered successfully', { user: username, avatar, coverImage, email, fullName }));





});


export { registerUser };