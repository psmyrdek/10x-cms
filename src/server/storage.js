var fs = require("fs");
var path = require("path");

// Base directory for data storage
var DATA_DIR = path.join(process.cwd(), "src/server/data");

// Ensure data directory exists
function ensureDataDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get full path for a collection file
function getCollectionPath(collectionName) {
  return path.join(DATA_DIR, collectionName + ".json");
}

// Create a new collection
function createCollection(name, schema) {
  ensureDataDirExists();

  var collection = {
    id: Date.now().toString(),
    name: name,
    schema: schema || {},
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  var collectionsPath = getCollectionPath("collections");
  var collections = [];

  // Load existing collections if available
  if (fs.existsSync(collectionsPath)) {
    try {
      collections = JSON.parse(fs.readFileSync(collectionsPath, "utf8"));
    } catch (err) {
      console.error("Error reading collections:", err);
    }
  }

  // Add new collection
  collections.push(collection);

  // Save updated collections
  fs.writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));

  return collection;
}

// Get all collections
function getCollections() {
  ensureDataDirExists();

  var collectionsPath = getCollectionPath("collections");

  if (!fs.existsSync(collectionsPath)) {
    // Initialize with empty array if file doesn't exist
    fs.writeFileSync(collectionsPath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(collectionsPath, "utf8"));
  } catch (err) {
    console.error("Error reading collections:", err);
    return [];
  }
}

// Get a specific collection by ID
function getCollectionById(id) {
  var collections = getCollections();

  for (var i = 0; i < collections.length; i++) {
    if (collections[i].id === id) {
      return collections[i];
    }
  }

  return null;
}

// Update a collection
function updateCollection(id, updates) {
  var collections = getCollections();
  var updated = false;

  for (var i = 0; i < collections.length; i++) {
    if (collections[i].id === id) {
      // Update fields
      for (var key in updates) {
        collections[i][key] = updates[key];
      }

      // Update timestamp
      collections[i].updatedAt = new Date().toISOString();
      updated = true;
      break;
    }
  }

  if (updated) {
    // Save updated collections
    var collectionsPath = getCollectionPath("collections");
    fs.writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));
    return getCollectionById(id);
  }

  return null;
}

// Delete a collection
function deleteCollection(id) {
  var collections = getCollections();
  var index = -1;

  for (var i = 0; i < collections.length; i++) {
    if (collections[i].id === id) {
      index = i;
      break;
    }
  }

  if (index !== -1) {
    collections.splice(index, 1);

    // Save updated collections
    var collectionsPath = getCollectionPath("collections");
    fs.writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));
    return true;
  }

  return false;
}

// Add an item to a collection
function addItemToCollection(collectionId, item) {
  var collection = getCollectionById(collectionId);

  if (!collection) {
    return null;
  }

  // Add ID and timestamps to item
  item.id = Date.now().toString();
  item.createdAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();

  // Add item to collection
  collection.items.push(item);

  // Update collection
  return updateCollection(collectionId, { items: collection.items });
}

// Update an item in a collection
function updateItemInCollection(collectionId, itemId, updates) {
  var collection = getCollectionById(collectionId);

  if (!collection) {
    return null;
  }

  var itemIndex = -1;
  var item = null;

  // Find the item by ID
  for (var i = 0; i < collection.items.length; i++) {
    if (collection.items[i].id === itemId) {
      itemIndex = i;
      item = collection.items[i];
      break;
    }
  }

  if (itemIndex === -1) {
    return null;
  }

  // Update fields
  for (var key in updates) {
    item[key] = updates[key];
  }

  // Update timestamp
  item.updatedAt = new Date().toISOString();

  // Update collection
  collection.items[itemIndex] = item;
  updateCollection(collectionId, { items: collection.items });

  return item;
}

// Delete an item from a collection
function deleteItemFromCollection(collectionId, itemId) {
  var collection = getCollectionById(collectionId);

  if (!collection) {
    return false;
  }

  var itemIndex = -1;

  // Find the item by ID
  for (var i = 0; i < collection.items.length; i++) {
    if (collection.items[i].id === itemId) {
      itemIndex = i;
      break;
    }
  }

  if (itemIndex === -1) {
    return false;
  }

  // Remove the item
  collection.items.splice(itemIndex, 1);

  // Update collection
  updateCollection(collectionId, { items: collection.items });

  return true;
}

// Initialize storage with default collections if needed
function initializeStorage() {
  ensureDataDirExists();

  // Only ensure data directory exists, but don't create default collections
  var collectionsPath = getCollectionPath("collections");
  
  // Initialize with empty array if file doesn't exist
  if (!fs.existsSync(collectionsPath)) {
    fs.writeFileSync(collectionsPath, JSON.stringify([], null, 2));
  }
}

module.exports = {
  createCollection: createCollection,
  getCollections: getCollections,
  getCollectionById: getCollectionById,
  updateCollection: updateCollection,
  deleteCollection: deleteCollection,
  addItemToCollection: addItemToCollection,
  updateItemInCollection: updateItemInCollection,
  deleteItemFromCollection: deleteItemFromCollection,
  initializeStorage: initializeStorage
};
