import User from "../models/user.model.js";
import { Subscription } from "../models/subcribtion.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";



const subcribeToChannel = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { channelId } = req.body || req.params;

    if (!channelId) {
        throw new ApiError(400, 'Channel ID is required');
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, 'Channel not found');
    }
    const existingSubscription = await Subscription.findOne({ $and: [{ subcriber: user._id }, { channel: channelId }] });
    if (existingSubscription) {
        throw new ApiError(409, 'Already subscribed to this channel');
    }
    const newSubscription = new Subscription({
        subscriber: user._id,
        channel: channelId
    });
    await newSubscription.save();
    res.status(201).json(new ApiResponse(201, 'Subscribed to channel successfully'));
});

const unSubcribeFromChannel = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const { channelId } = req.body || req.params;

    if (!channelId) {
        throw new ApiError(400, 'Channel ID is required');
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, 'Channel not found');
    }

    const existingSubscription = await Subscription.findOne({ $and: [{ subcriber: user._id }, { channel: channelId }] });
    if (!existingSubscription) {
        throw new ApiError(404, 'Not subscribed to this channel');
    }

    await Subscription.findByIdAndDelete(existingSubscription._id);
    res.status(200).json(new ApiResponse(200, 'Unsubscribed from channel successfully'));
});


const getAllSubscriptions = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subcriber: user._id
            }
        },
        {
            $lookup: {
                from: 'users',
                localField : 'channel',
                foreignField : '_id',
                as : 'channelDetails',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            _id: 0
                        }
                    }
                ]
            }

        }
    ])
    if (!subscriptions) {
        throw new ApiError(404, 'No subscriptions found');
    }

    res.status(200).json(new ApiResponse(200, 'Subscriptions fetched successfully', { subscriptions }));


});




export {
    subcribeToChannel,
    unSubcribeFromChannel,
    getAllSubscriptions
};