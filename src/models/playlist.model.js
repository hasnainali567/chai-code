import mongoose, {Schema} from "mongoose";

const playlistSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    videos: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video',
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

export const Playlist = mongoose.model('Playlist', playlistSchema);
