var fs = require("fs");
var path = require("path");

// Base directory for media storage
var MEDIA_DIR = path.join(process.cwd(), "src/server/data");
var MEDIA_FILE = "media.json";
var UPLOADS_DIR = path.join(process.cwd(), "public/uploads");

// Ensure directories exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Get full path for media data file
function getMediaFilePath() {
  return path.join(MEDIA_DIR, MEDIA_FILE);
}

// Get all media items
function getAllMedia() {
  ensureDirectoriesExist();

  var mediaPath = getMediaFilePath();

  if (!fs.existsSync(mediaPath)) {
    // Initialize with empty array if file doesn't exist
    fs.writeFileSync(mediaPath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(mediaPath, "utf8"));
  } catch (err) {
    console.error("Error reading media data:", err);
    return [];
  }
}

// Add a new media item
function addMedia(file, description) {
  ensureDirectoriesExist();

  var media = getAllMedia();
  
  // Create new media item
  var newMedia = {
    id: Date.now().toString(),
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: "/uploads/" + file.filename,
    description: description || "",
    uploadDate: new Date().toISOString()
  };
  
  // Add to media array
  media.push(newMedia);
  
  // Save updated media data
  fs.writeFileSync(getMediaFilePath(), JSON.stringify(media, null, 2));
  
  return newMedia;
}

// Delete a media item
function deleteMedia(id) {
  var media = getAllMedia();
  var mediaToDelete = null;
  
  // Find the media item to delete
  for (var i = 0; i < media.length; i++) {
    if (media[i].id === id) {
      mediaToDelete = media[i];
      media.splice(i, 1);
      break;
    }
  }
  
  if (!mediaToDelete) {
    return false;
  }
  
  // Delete the file
  try {
    var filePath = path.join(process.cwd(), "public", mediaToDelete.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    // Continue even if file deletion fails
  }
  
  // Save updated media data
  fs.writeFileSync(getMediaFilePath(), JSON.stringify(media, null, 2));
  
  return true;
}

// Get a specific media item by ID
function getMediaById(id) {
  var media = getAllMedia();
  
  for (var i = 0; i < media.length; i++) {
    if (media[i].id === id) {
      return media[i];
    }
  }
  
  return null;
}

// Initialize media storage
function initializeMediaStorage() {
  ensureDirectoriesExist();
  
  // Initialize with empty array if file doesn't exist
  var mediaPath = getMediaFilePath();
  if (!fs.existsSync(mediaPath)) {
    fs.writeFileSync(mediaPath, JSON.stringify([], null, 2));
  }
}

module.exports = {
  getAllMedia: getAllMedia,
  addMedia: addMedia,
  deleteMedia: deleteMedia,
  getMediaById: getMediaById,
  initializeMediaStorage: initializeMediaStorage
};
