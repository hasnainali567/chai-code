import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use(express.json());

app.use(urlencoded({ extended: truem, limit: '16kb', }));
app.use(express.static('public'));
app.use(cookieParser());
export default app;