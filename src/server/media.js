var fs = require("fs").promises;
var fsSync = require("fs");
var path = require("path");

// Base directory for media storage
var MEDIA_DIR = path.join(process.cwd(), "src/server/data");
var MEDIA_FILE = "media.json";
var UPLOADS_DIR = path.join(process.cwd(), "public/uploads");

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
function getAllMedia() {
  ensureDirectoriesExist();

  var mediaPath = getMediaFilePath();

  if (!fsSync.existsSync(mediaPath)) {
    // Initialize with empty array if file doesn't exist
    fs.writeFile(mediaPath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    var data = fs.readFile(mediaPath, "utf8");
    return JSON.parse(data);
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
    uploadDate: new Date().toISOString(),
  };

  // Add to media array
  media.push(newMedia);

  // Save updated media data
  fs.writeFile(getMediaFilePath(), JSON.stringify(media, null, 2));

  return newMedia;
}

// Delete a media item
function deleteMedia(id) {
  var media = getAllMedia();
  var mediaToDelete = media.find(function (item) {
    return item.id === id;
  });

  if (!mediaToDelete) {
    return false;
  }

  // Remove item from array
  var updatedMedia = media.filter(function (item) {
    return item.id !== id;
  });

  // Delete the file
  try {
    var filePath = path.join(process.cwd(), "public", mediaToDelete.path);
    if (fsSync.existsSync(filePath)) {
      fs.unlink(filePath);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    // Continue even if file deletion fails
  }

  // Save updated media data
  fs.writeFile(getMediaFilePath(), JSON.stringify(updatedMedia, null, 2));

  return true;
}

// Get a specific media item by ID
function getMediaById(id) {
  var media = getAllMedia();
  return (
    media.find(function (item) {
      return item.id === id;
    }) || null
  );
}

// Initialize media storage
function initializeMediaStorage() {
  ensureDirectoriesExist();

  // Initialize with empty array if file doesn't exist
  var mediaPath = getMediaFilePath();
  if (!fsSync.existsSync(mediaPath)) {
    fs.writeFile(mediaPath, JSON.stringify([], null, 2));
  }
}

module.exports = {
  getAllMedia: getAllMedia,
  addMedia: addMedia,
  deleteMedia: deleteMedia,
  getMediaById: getMediaById,
  initializeMediaStorage: initializeMediaStorage,
};
