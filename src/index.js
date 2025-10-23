import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import express from 'express'
import connectDB from './db/index.js';

dotenv.config({path : './.env'})

const app = express();

app.use(cookieParser())
app.use(express.json());


connectDB().then(() => {
    app.listen(process.env.PORT, ()=> {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
}).catch((error) => {
    console.log("Failed to connect to database", error);
});


