var fs = require("fs").promises;
var fsSync = require("fs");
var path = require("path");

// Base directory for media storage
var MEDIA_DIR = path.join(process.cwd(), "src/server/data");
var MEDIA_FILE = "media.json";
var UPLOADS_DIR = path.join(process.cwd(), "public/uploads");

/**
 * Ensures that the necessary directories for media storage and uploads exist.
 * Creates them recursively if they do not exist.
 */
function ensureDirectoriesExist() {
  if (!fsSync.existsSync(MEDIA_DIR)) {
    fsSync.mkdirSync(MEDIA_DIR, {recursive: true});
  }
  if (!fsSync.existsSync(UPLOADS_DIR)) {
    fsSync.mkdirSync(UPLOADS_DIR, {recursive: true});
  }
}

/**
 * Gets the full file path for the media data JSON file.
 * @returns {string} The absolute path to the media data file.
 */
function getMediaFilePath() {
  return path.join(MEDIA_DIR, MEDIA_FILE);
}

/**
 * Retrieves all media items stored in the media data file.
 * If the file does not exist, it initializes it with an empty array.
 * If reading fails, it logs an error and returns an empty array.
 * @returns {Array<Object>} An array of media objects.
 */
function getAllMedia() {
  ensureDirectoriesExist();

  var mediaPath = getMediaFilePath();

  if (!fsSync.existsSync(mediaPath)) {
    // Initialize with empty array if file doesn't exist
    fs.writeFile(mediaPath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    // Use sync read here as the original code uses sync check
    var data = fsSync.readFileSync(mediaPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading media data:", err);
    return [];
  }
}

/**
 * Adds a new media item to the storage.
 * Creates a new media object from the provided file details and description,
 * adds it to the existing media array, and saves the updated array.
 * @param {Object} file - An object containing file details (e.g., from a file upload middleware).
 * @param {string} file.filename - The name of the file.
 * @param {string} file.originalname - The original name of the file.
 * @param {string} file.mimetype - The MIME type of the file.
 * @param {number} file.size - The size of the file in bytes.
 * @param {string} description - A description for the media item.
 * @returns {Object} The newly created media object.
 */
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
    path: "/uploads/" + file.filename, // Path relative to public dir
    description: description || "",
    uploadDate: new Date().toISOString(),
  };

  // Add to media array
  media.push(newMedia);

  // Save updated media data
  // Using async writeFile, note that this might lead to race conditions if multiple writes happen concurrently
  fs.writeFile(getMediaFilePath(), JSON.stringify(media, null, 2));

  return newMedia;
}

/**
 * Deletes a media item by its ID.
 * Removes the item from the media array and attempts to delete the associated file.
 * Saves the updated media array regardless of file deletion success.
 * @param {string} id - The ID of the media item to delete.
 * @returns {boolean} True if the item was found and removed from the data, false otherwise.
 */
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
    // Construct absolute path to the file in the public directory
    var filePath = path.join(process.cwd(), "public", mediaToDelete.path);
    if (fsSync.existsSync(filePath)) {
      // Using async unlink, note that this might not complete before writeFile below
      fs.unlink(filePath);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    // Continue even if file deletion fails
  }

  // Save updated media data
  // Using async writeFile, note that this might lead to race conditions
  fs.writeFile(getMediaFilePath(), JSON.stringify(updatedMedia, null, 2));

  return true;
}

/**
 * Retrieves a specific media item by its ID.
 * Searches the media array for an item with the matching ID.
 * @param {string} id - The ID of the media item to find.
 * @returns {Object|null} The found media object, or null if no item with the ID is found.
 */
function getMediaById(id) {
  var media = getAllMedia();
  return (
    media.find(function (item) {
      return item.id === id;
    }) || null
  );
}

/**
 * Initializes the media storage setup.
 * Ensures directories exist and creates the media data file with an empty array
 * if it doesn't already exist.
 */
function initializeMediaStorage() {
  ensureDirectoriesExist();

  // Initialize with empty array if file doesn't exist
  var mediaPath = getMediaFilePath();
  if (!fsSync.existsSync(mediaPath)) {
    // Using async writeFile
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