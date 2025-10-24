import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { upload } from './middleware/multer.middleware.js';
import router from './routes/user.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use(urlencoded({ extended: true, limit: '16kb', }));
app.use(express.static('public'));
app.use(cookieParser());

app.use('/api/v1/users', router);
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || [],
    });
});

export default app;