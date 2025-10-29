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

export default generateAccessAndRefreshToken;