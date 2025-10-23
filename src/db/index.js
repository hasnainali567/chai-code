import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
    try {
        const connectionInctence =  await mongoose.connect(`${process.env.MONGO_URL}`, {
            dbName: DB_NAME,
        });
        console.log(`\n Database Connected to ${DB_NAME} Successfully`);
        console.log(connectionInctence.connection.host);
        
    } catch (error) {
        console.log("Error while connecting to database", error);
        process.exit(1);
    }
};

export default connectDB;