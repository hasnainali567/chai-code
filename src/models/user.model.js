import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const avatarSchema = new Schema({
    public_id: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
}, { _id: false });

const coverImageSchema = new Schema({
    public_id: {
        type: String,
    },
    url: {
        type: String,
    },
}, { _id: false });


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    avatar: {
        type: avatarSchema,
        required: true,
    },
    coverImage: {
        type: coverImageSchema,
        default: null,
    },
    refreshToken: {
        type: String,
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video',
        }
    ],
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'password is required'],
    },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
}
);

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ id: this._id, email: this.email, username: this.username, fullName: this.fullName }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY,
    });
    return token;
}

userSchema.methods.generateRefreshToken = function () {
    const refreshToken = jwt.sign({ id: this._id }, process.env.REFRESH_JWT_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
    return refreshToken;

}
const User = mongoose.model('User', userSchema);
export default User;
