import { Router } from "express";
import { verifyUser } from "../middleware/user.middleware.js";
import { createPlaylist, deletePlaylistById, getUserPlaylistById, getUserPlaylists } from "../controllers/playlist.controllers.js";

const router = Router();

router.use(verifyUser)

router.route('/').get(getUserPlaylists).post(createPlaylist);

router.route('/:playlistId')
    .get(getUserPlaylistById)
    .delete(deletePlaylistById);


export default router;
