const db = require("./db/connection");

/**
 * Creates a new collection in the database.
 *
 * @param {string} name - The name of the collection.
 * @param {object} [schema={}] - The schema definition for the collection (optional).
 * @returns {Promise<object>} A promise that resolves with the created collection object.
 */
async function createCollection(name, schema) {
  const collection = {
    id: Date.now().toString(),
    name: name,
    schema: schema || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("collections").insert(collection);
  return collection;
}

/**
 * Retrieves all collections from the database.
 *
 * @returns {Promise<Array<object>>} A promise that resolves with an array of collection objects.
 */
async function getCollections() {
  return await db("collections").select("*");
}

/**
 * Retrieves a single collection by its ID, including its associated items.
 *
 * @param {string} id - The ID of the collection to retrieve.
 * @returns {Promise<object|undefined>} A promise that resolves with the collection object (including items) or undefined if not found.
 */
async function getCollectionById(id) {
  const collection = await db("collections").where({id}).first();
  if (collection) {
    collection.items = await db("items").where({collection_id: id});
  }
  return collection;
}

/**
 * Updates a collection in the database.
 *
 * @param {string} id - The ID of the collection to update.
 * @param {object} updates - An object containing the fields to update (e.g., { name: 'New Name' }).
 * @returns {Promise<object|undefined>} A promise that resolves with the updated collection object or undefined if the original was not found.
 */
async function updateCollection(id, updates) {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db("collections").where({id}).update(updateData);

  return await getCollectionById(id);
}

/**
 * Deletes a collection from the database.
 *
 * @param {string} id - The ID of the collection to delete.
 * @returns {Promise<boolean>} A promise that resolves with true if the collection was deleted, false otherwise.
 */
async function deleteCollection(id) {
  const deleted = await db("collections").where({id}).delete();

  return deleted > 0;
}

/**
 * Adds a new item to a specific collection.
 *
 * @param {string} collectionId - The ID of the collection to add the item to.
 * @param {object} item - The item data to be stored.
 * @returns {Promise<object>} A promise that resolves with the newly created item object.
 */
async function addItemToCollection(collectionId, item) {
  const newItem = {
    id: Date.now().toString(),
    collection_id: collectionId,
    data: item, // Storing the object directly in the 'data' field
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("items").insert(newItem);
  return newItem;
}

/**
 * Updates an item within a specific collection.
 *
 * @param {string} collectionId - The ID of the collection the item belongs to.
 * @param {string} itemId - The ID of the item to update.
 * @param {object} updates - An object containing the item data updates.
 * @returns {Promise<object|undefined>} A promise that resolves with the updated item object or undefined if not found.
 */
async function updateItemInCollection(collectionId, itemId, updates) {
  const updateData = {
    data: updates, // Storing the object directly, assuming knex/db handles serialization if needed
    updated_at: new Date().toISOString(),
  };

  await db("items")
    .where({
      id: itemId,
      collection_id: collectionId,
    })
    .update(updateData);

  return await db("items").where({id: itemId}).first();
}

/**
 * Deletes an item from a specific collection.
 *
 * @param {string} collectionId - The ID of the collection the item belongs to.
 * @param {string} itemId - The ID of the item to delete.
 * @returns {Promise<boolean>} A promise that resolves with true if the item was deleted, false otherwise.
 */
async function deleteItemFromCollection(collectionId, itemId) {
  const deleted = await db("items")
    .where({
      id: itemId,
      collection_id: collectionId,
    })
    .delete();

  return deleted > 0;
}

/**
 * Retrieves webhooks for a specific collection, parsing the events JSON string.
 *
 * @param {string} collectionId - The ID of the collection to get webhooks for.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of webhook objects, with events parsed.
 */
async function getWebhooks(collectionId) {
  const webhooks = await db("webhooks")
    .where({collection_id: collectionId})
    .select("*");
  return webhooks.map(function (webhook) {
    if (typeof webhook.events === "string") {
      try {
        webhook.events = JSON.parse(webhook.events);
      } catch (e) {
        webhook.events = [];
      }
    }
    return webhook;
  });
}

/**
 * Adds a new webhook for a specific collection.
 *
 * @param {string} collectionId - The ID of the collection to add the webhook to.
 * @param {string} url - The URL of the webhook endpoint.
 * @param {Array<string>} events - An array of event types the webhook should listen for.
 * @returns {Promise<object>} A promise that resolves with the newly created webhook object (with events as an array).
 */
async function addWebhook(collectionId, url, events) {
  const webhook = {
    id: Date.now().toString(),
    collection_id: collectionId,
    url: url,
    events: JSON.stringify(events), // Store events as a JSON string
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("webhooks").insert(webhook);
  return {
    ...webhook,
    events: events, // Return the original array for the response
  };
}

/**
 * Deletes a webhook by its ID.
 *
 * @param {string} webhookId - The ID of the webhook to delete.
 * @returns {Promise<boolean>} A promise that resolves with true if the webhook was deleted, false otherwise.
 */
async function deleteWebhook(webhookId) {
  const deleted = await db("webhooks").where({id: webhookId}).delete();

  return deleted > 0;
}

/**
 * Initializes the database schema by running migrations.
 *
 * @returns {Promise<void>} A promise that resolves when migrations are complete.
 */
async function initializeStorage() {
  await db.migrate.latest();
}

module.exports = {
  createCollection,
  getCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addItemToCollection,
  updateItemInCollection,
  deleteItemFromCollection,
  getWebhooks,
  addWebhook,
  deleteWebhook,
  initializeStorage,
};