# Video-Streaming-in-node-js-and-Cloudinary

This is a Node.js application that allows users to upload and stream videos using Cloudinary for storage and streaming. It includes a basic admin panel for managing video content.
# Features

Upload videos to Cloudinary via an admin panel.
Stream videos from Cloudinary.
Basic admin authentication for managing videos.
In-memory storage for video metadata (note: data is lost on server restart).

# Prerequisites

Node.js (v14 or higher) and npm installed on your system.

# Installation Instructions

Clone the repository:
```
git clone https://github.com/shuvosa/Video-Streaming-in-node-js-and-Cloudinary.git
```

Navigate to the project directory:
cd video-streaming


Install dependencies:
```
npm install

```
Create a .env file in the root directory and add your Cloudinary credentials:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

```
Start the server:
```
npm start
```

or for development with nodemon
```
npm run dev
```


# Usage
```
Access the public frontend at http://localhost:3000/
Access the admin panel at http://localhost:3000/admin.html
To log in to the admin panel, use the password "admin" (note: this is for demonstration purposes only and should be changed in production).
```
# Configuration

The application uses environment variables for Cloudinary credentials. Ensure these are set in the .env file.
The admin password is hardcoded as "admin" for simplicity. In a production environment, implement a secure authentication system.

# API Endpoints
```
GET /videos: Retrieve the list of all available videos.
POST /admin/login: Admin login endpoint.
POST /admin/upload: Upload a new video (admin only).
PUT /admin/videos/:id: Update the title of an existing video (admin only).
DELETE /admin/videos/:id: Delete a video (admin only).
```

# Dependencies
```
cloudinary: ^2.6.1
dotenv: ^16.5.0
express: ^5.1.0
multer: ^2.0.1
nodemon: ^3.1.10 (dev dependency)
```
# Notes

This project uses in-memory storage for video metadata, which means data is lost when the server restarts. For production, consider using a persistent database (e.g., MongoDB, PostgreSQL).
The admin authentication is very basic and not suitable for production. Implement a robust authentication system (e.g., JWT, OAuth) for real-world applications.
The maximum file size for video uploads is 10MB, as configured in Multer.

