import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getAllLikedVideos = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const likedVideos = await Like.aggregate([
        {
            $match: { likedBy: user._id, video: { $ne: null } }
        },
        { $lookup: {
            from: 'videos',
            localField: 'video',
            foreignField: '_id',
            as: 'videoDetails'
        }},
        { $unwind: '$videoDetails' },
        { $project: {
            _id: 0,
            videoId: '$videoDetails._id',
            title: '$videoDetails.title',
            description: '$videoDetails.description',
            thumbnail: '$videoDetails.thumbnail',
            url: '$videoDetails.video.url',
            owner: '$videoDetails.owner',
        }}
    ]);
    res.status(200).json(new ApiResponse(200, 'Liked videos fetched successfully', { likedVideos }));
});

const toggleLikeOnVideo = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { videoId } = req.body || req.params;

    if (!videoId) {
        throw new ApiError(400, 'Video ID is required');
    }
    const existingLike = await Like.findOne({ likedBy: user._id, video: videoId });
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, 'Video unliked successfully'));
    }
    const newLike = new Like({
        likedBy: user._id,
        video: videoId
    });
    await newLike.save();
    res.status(201).json(new ApiResponse(201, 'Video liked successfully'));
});

const toggleLikeOnComment = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { commentId } = req.body || req.params;
    if (!commentId) {
        throw new ApiError(400, 'Comment ID is required');
    }
    const existingLike = await Like.findOne({ likedBy: user._id, comment: commentId });
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, 'Comment unliked successfully'));
    }
    const newLike = new Like({
        likedBy: user._id,
        comment: commentId
    });
    await newLike.save();
    res.status(201).json(new ApiResponse(201, 'Comment liked successfully'));
});

const toggleLikeOnTweet = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { tweetId } = req.body || req.params;
    if (!tweetId) {
        throw new ApiError(400, 'Comment ID is required');
    }
    const existingTweet = await Like.findOne({ $and : [{ likedBy: user._id }, { tweet: tweetId }] });
    if (existingTweet) {
        await Tweet.findByIdAndDelete(existingTweet._id);
        return res.status(200).json(new ApiResponse(200, 'Comment unliked successfully'));
    }
    const newTweet = new Like({
        likedBy: user._id,
        tweet: tweetId
    });
    await newTweet.save();
    res.status(201).json(new ApiResponse(201, 'Comment liked successfully'));
});


export {
    getAllLikedVideos,
    toggleLikeOnComment,
    toggleLikeOnTweet,
    toggleLikeOnVideo
};
