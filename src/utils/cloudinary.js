import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import 'dotenv/config';
import ApiError from './apiError.js';



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath, folder) => {
    try {
        if (!filePath) {
            throw new Error('File path is required for upload');
        }
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            folder,
            use_filename: true,
            unique_filename: false,
            overwrite: true,
        });
        fs.unlinkSync(filePath); // Delete the local file after upload

        return { url: result.secure_url || '', public_id: result.public_id || '' };
    } catch (error) {
        fs.unlinkSync(filePath); // Delete the local file in case of error
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) {
            throw new Error('Public ID is required for deletion');
        }
        const result = await cloudinary.uploader.destroy(publicId);
        return result;

    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw new Error(500, 'Cloudinary Deletion Error', error.message);
    }
};

const uploadVideoToCloudinary = async (filePath) => {
    try {
        if (!filePath) {
            throw new Error('File path is required for upload');
        }
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'video',
            folder: "videos",
            use_filename: true,
            unique_filename: false,
            overwrite: true,
        });
        fs.unlinkSync(filePath); // Delete the local file after upload

        return result;
    } catch (error) {
        fs.unlinkSync(filePath); // Delete the local file in case of error
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};
    

export { uploadToCloudinary, deleteFromCloudinary, cloudinary , uploadVideoToCloudinary };