import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const likeSchema = new Schema({
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet',
    },
}, { timestamps: true });
likeSchema.plugin(mongooseAggregatePaginate);

export const Like = mongoose.model('Like', likeSchema);