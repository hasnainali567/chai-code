import { Playlist } from "../models/playlist.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getUserPlaylists = asyncHandler(async (req, res) => {
    const user = req.user;

    const playlists = await Playlist.aggregate([
        {
            $match: { createdBy: user._id }
        },
        {
            $addFields: {
                videosCount: { $size: "$videos" }
            }
        },
        {
            $project: {
                __v: 0
            }
        }
    ]);

    if (!playlists) {
        throw new ApiError(404, 'Playlists not found');
    }

    res.status(200).json(new ApiResponse(200, 'Playlists fetched successfully', { playlists }));
});

const createPlaylist = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!req?.body?.title) {
        throw new ApiError(400, 'Validation Error', 'Title is required');
    }

    const { title, description } = req.body;

    const newPlaylist = new Playlist({
        title,
        description,
        createdBy: user._id
    });

    await newPlaylist.save();

    res.status(201).json(new ApiResponse(201, 'Playlist created successfully', { playlist: newPlaylist }));
});

const getUserPlaylistById = (req, res) => {

}

const updatePlaylistById = asyncHandler(async (req, res) => {
    const user = req.user;
    const { playlistId } = req.params;
    const { title, description, videos } = req.body;

    const playlist = await Playlist.findOne({ _id: playlistId, createdBy: user._id });
    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }
    if (title) playlist.title = title;
    if (description) playlist.description = description;
    if (videos) playlist.videos = videos;
    await playlist.save();
    res.status(200).json(new ApiResponse(200, 'Playlist updated successfully', { playlist }));
});


const deletePlaylistById = (req, res) => {

}
export { getUserPlaylists, createPlaylist, getUserPlaylistById, deletePlaylistById };