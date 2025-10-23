import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './db/index.js';
import app from './app.js';

dotenv.config({path : './.env'})

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
    app.listen(PORT, ()=> {
        console.log(`Server is running on port ${PORT}`);
    })
}).catch((error) => {
    console.log("Failed to connect to database", error);
});


