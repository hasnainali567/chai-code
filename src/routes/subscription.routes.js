import { Router } from 'express';
import { verifyUser } from '../middleware/user.middleware.js';
import { getAllSubscriptions, subcribeToChannel, unSubcribeFromChannel } from '../controllers/subscription.controllers.js';

const router = Router();

router.route('/subscribe/:channelId').post(verifyUser, subcribeToChannel);
router.route('/unsubscribe/:channelId').post(verifyUser, unSubcribeFromChannel);
router.route('/all-subscriptions').get(verifyUser, getAllSubscriptions);

export default router;
