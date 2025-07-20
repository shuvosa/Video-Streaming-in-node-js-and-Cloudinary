// server.js
// This Node.js script sets up an Express server to handle video uploads to Cloudinary.
// It uses Multer for file processing and dotenv for environment variables.
// It also includes basic admin authentication and in-memory storage for video metadata.

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const crypto = require('crypto'); // For generating simple admin session ID

const app = express();
const port = process.env.PORT || 3000;

// --- Cloudinary Configuration ---
// Ensure your .env file has CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Multer Configuration ---
// Configures Multer to store uploaded files in memory.
// Sets a file size limit of 10 MB (10 * 1024 * 1024 bytes).
const upload = multer({
    storage: multer.memoryStorage(), // Use memory storage for direct Cloudinary upload
    limits: { fileSize: 10 * 1024 * 1024 } // Max 10MB per video file
});

// --- Express Middleware ---
app.use(express.json()); // Parses JSON bodies for API requests
// Serves static files (like index.html and admin.html) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- In-Memory Data Store (IMPORTANT: Data is lost on server restart!) ---
// In a production application, replace this with a persistent database (e.g., MongoDB, PostgreSQL, Firestore).
// Hardcoded initial video for demonstration. This will be available immediately.
let videos = [
    {
        id: 'hardcoded_video_1',
        title: 'Peaceful Nature Sounds',
        url: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
        thumbnail: 'https://res.cloudinary.com/demo/video/upload/v1600000000/elephants.jpg'
    }
    // More videos will be added here dynamically via the admin panel
];


// --- Admin Authentication (VERY BASIC - NOT FOR PRODUCTION) ---
// This uses a simple hardcoded password and an in-memory session ID.
// For a real application, implement robust authentication (e.g., JWT, OAuth, session management with database).
const ADMIN_PASSWORD = "admin";
let adminSessionId = null; // Stores a simple session token if admin is logged in

/**
 * Handles admin login by checking the provided password.
 */
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        adminSessionId = crypto.randomBytes(16).toString('hex'); // Generate a random session ID
        res.json({ success: true, message: 'Login successful!', sessionId: adminSessionId });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

/**
 * Middleware to authenticate admin requests.
 * Checks for the presence and validity of the X-Admin-Session header.
 */
function authenticateAdmin(req, res, next) {
    const sentSessionId = req.headers['x-admin-session'];
    if (adminSessionId && sentSessionId === adminSessionId) {
        next(); // Admin is authenticated, proceed to the next middleware/route handler
    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required or session expired.' });
    }
}


// --- API Endpoints ---

/**
 * GET /videos
 * Public endpoint to retrieve the list of all available videos.
 * No authentication required.
 */
app.get('/videos', (req, res) => {
    res.status(200).json(videos);
});

/**
 * POST /admin/upload
 * Admin-only endpoint to upload a new video file to Cloudinary and add its metadata to the list.
 * Requires admin authentication.
 * Uses Multer to handle video file upload.
 */
app.post('/admin/upload', authenticateAdmin, upload.single('videoFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        if (!req.body.videoTitle || req.body.videoTitle.trim() === '') { // Use videoTitle to match frontend FormData
            return res.status(400).json({ message: 'Video title is required.' });
        }

        // Upload the video buffer directly to Cloudinary
        // The `upload_stream` method is efficient for handling buffers
        cloudinary.uploader.upload_stream(
            {
                resource_type: 'video', // Specify that it's a video file
                folder: 'my_videos',    // Optional: Organize uploads into a specific folder in Cloudinary
                public_id: `video_${Date.now()}` // Generate a unique public ID for the video
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ message: 'Cloudinary upload failed.', error: error.message });
                }
                console.log('Cloudinary upload successful:', result);

                // Create a new video object with details from Cloudinary and the title from request body
                const newVideo = {
                    id: result.public_id, // Cloudinary's public_id serves as our unique identifier
                    title: req.body.videoTitle.trim(), // Use the title provided by the admin
                    url: result.secure_url, // The secure URL for streaming
                    // Generate a thumbnail URL from the video using Cloudinary's transformation
                    thumbnail: cloudinary.url(result.public_id, {
                        format: 'jpg',
                        resource_type: 'video',
                        transformation: [{ width: 300, crop: 'scale', quality: 'auto' }]
                    })
                };
                videos.push(newVideo); // Add the new video to our in-memory list
                res.status(200).json({ message: 'Video uploaded successfully!', video: newVideo });
            }
        ).end(req.file.buffer); // End the stream with the file buffer

    } catch (error) {
        // Handle Multer file size limit error specifically
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File size too large. Max 10MB allowed.' });
        }
        console.error('Server error during upload:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
});

/**
 * PUT /admin/videos/:id
 * Admin-only endpoint to update the title of an existing video.
 * Requires admin authentication.
 */
app.put('/admin/videos/:id', authenticateAdmin, (req, res) => {
    const videoId = req.params.id; // Get video ID from URL parameters
    const { title } = req.body;   // Get new title from request body

    if (!title || title.trim() === '') {
        return res.status(400).json({ message: 'New title is required.' });
    }

    // Find the video by ID in our in-memory array
    const videoIndex = videos.findIndex(v => v.id === videoId);

    if (videoIndex > -1) {
        videos[videoIndex].title = title.trim(); // Update the title
        res.json({ success: true, message: 'Video title updated successfully.', video: videos[videoIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Video not found.' });
    }
});

/**
 * DELETE /admin/videos/:id
 * Admin-only endpoint to delete a video from Cloudinary and from the list.
 * Requires admin authentication.
 */
app.delete('/admin/videos/:id', authenticateAdmin, async (req, res) => {
    const videoId = req.params.id; // Get video ID from URL parameters

    const videoIndex = videos.findIndex(v => v.id === videoId);

    if (videoIndex > -1) {
        try {
            // Attempt to delete the video from Cloudinary
            // `resource_type: 'video'` is important for proper deletion
            await cloudinary.uploader.destroy(videoId, { resource_type: 'video' });
            videos.splice(videoIndex, 1); // Remove the video from our in-memory list
            res.json({ success: true, message: 'Video deleted successfully.' });
        } catch (error) {
            console.error('Cloudinary deletion error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete video from Cloudinary.', error: error.message });
        }
    } else {
        res.status(404).json({ success: false, message: 'Video not found.' });
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Public frontend: http://localhost:${port}/`);
    console.log(`Admin panel: http://localhost:${port}/admin.html`);
});
