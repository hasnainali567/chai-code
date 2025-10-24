import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import 'dotenv/config';



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath) => {
    try {
        if (!filePath) {
            throw new Error('File path is required for upload');
        }
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            folder: 'chai-code',
            use_filename: true,
            unique_filename: false,
            overwrite: true,
        });
        fs.unlinkSync(filePath); // Delete the local file after upload

        return {secure_url: result.secure_url, public_id: result.public_id};
    } catch (error) {
        fs.unlinkSync(filePath); // Delete the local file in case of error
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};
export { uploadToCloudinary, cloudinary };