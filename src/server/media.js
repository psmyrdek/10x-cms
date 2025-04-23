const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// Base directory for media storage
const MEDIA_DIR = path.join(process.cwd(), "src/server/data");
const MEDIA_FILE = "media.json";
const UPLOADS_DIR = path.join(process.cwd(), "public/uploads");

// Ensure directories exist
function ensureDirectoriesExist() {
  if (!fsSync.existsSync(MEDIA_DIR)) {
    fsSync.mkdirSync(MEDIA_DIR, {recursive: true});
  }
  if (!fsSync.existsSync(UPLOADS_DIR)) {
    fsSync.mkdirSync(UPLOADS_DIR, {recursive: true});
  }
}

// Get full path for media data file
function getMediaFilePath() {
  return path.join(MEDIA_DIR, MEDIA_FILE);
}

// Get all media items
async function getAllMedia() {
  ensureDirectoriesExist();

  const mediaPath = getMediaFilePath();

  if (!fsSync.existsSync(mediaPath)) {
    // Initialize with empty array if file doesn't exist
    await fs.writeFile(mediaPath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const data = await fs.readFile(mediaPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading media data:", err);
    return [];
  }
}

// Add a new media item
async function addMedia(file, description) {
  ensureDirectoriesExist();

  const media = await getAllMedia();

  // Create new media item
  const newMedia = {
    id: Date.now().toString(),
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: `/uploads/${file.filename}`,
    description: description || "",
    uploadDate: new Date().toISOString(),
  };

  // Add to media array
  media.push(newMedia);

  // Save updated media data
  await fs.writeFile(getMediaFilePath(), JSON.stringify(media, null, 2));

  return newMedia;
}

// Delete a media item
async function deleteMedia(id) {
  const media = await getAllMedia();
  const mediaToDelete = media.find((item) => item.id === id);

  if (!mediaToDelete) {
    return false;
  }

  // Remove item from array
  const updatedMedia = media.filter((item) => item.id !== id);

  // Delete the file
  try {
    const filePath = path.join(process.cwd(), "public", mediaToDelete.path);
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    // Continue even if file deletion fails
  }

  // Save updated media data
  await fs.writeFile(getMediaFilePath(), JSON.stringify(updatedMedia, null, 2));

  return true;
}

// Get a specific media item by ID
async function getMediaById(id) {
  const media = await getAllMedia();
  return media.find((item) => item.id === id) || null;
}

// Initialize media storage
async function initializeMediaStorage() {
  ensureDirectoriesExist();

  // Initialize with empty array if file doesn't exist
  const mediaPath = getMediaFilePath();
  if (!fsSync.existsSync(mediaPath)) {
    await fs.writeFile(mediaPath, JSON.stringify([], null, 2));
  }
}

module.exports = {
  getAllMedia,
  addMedia,
  deleteMedia,
  getMediaById,
  initializeMediaStorage,
};
