const db = require("./db/connection");

/**
 * Creates a new collection in the database.
 *
 * @async
 * @param {string} name - The name of the collection.
 * @param {object} [schema={}] - The schema for the collection (optional).
 * @param {boolean} [shouldLogResult=false] - Indicates whether to log the result to the console.
 * @returns {Promise<object>} The newly created collection object.
 */
async function createCollection(name, schema, shouldLogResult = false) {
  const collection = {
    id: Date.now().toString(),
    name: name,
    schema: schema || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("collections").insert(collection);

  if (shouldLogResult) {
    console.log("Collection created:", collection);
  }

  return collection;
}

/**
 * Retrieves all collections from the database.
 *
 * @async
 * @returns {Promise<Array<object>>} An array of collection objects.
 */
async function getCollections() {
  return await db("collections").select("*");
}

/**
 * Retrieves a collection by its ID.
 * @async
 * @param {string} id - The ID of the collection to retrieve.
 * @returns {Promise<object|undefined>} The collection object, or undefined if not found.
 */
async function getCollectionById(id) {
  const collection = await db("collections").where({id}).first();
  if (collection) {
    collection.items = await db("items").where({collection_id: id});
  }
  return collection;
}

/**
 * Updates a collection with the given ID.
 *
 * @async
 * @param {string} id - The ID of the collection to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {Promise<object>} The updated collection object.
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
 * @async
 * @param {string} id - The ID of the collection to delete.
 * @returns {Promise<boolean>} True if the collection was successfully deleted, false otherwise.
 */
async function deleteCollection(id) {
  const deleted = await db("collections").where({id}).delete();

  return deleted > 0;
}

/**
 * Adds an item to a collection.
 *
 * @async
 * @param {string} collectionId - The ID of the collection to add the item to.
 * @param {object} item - The item data to add.
 * @returns {Promise<object>} The newly created item object.
 */
async function addItemToCollection(collectionId, item) {
  const newItem = {
    id: Date.now().toString(),
    collection_id: collectionId,
    data: item,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("items").insert(newItem);
  return newItem;
}

/**
 * Updates an item in a collection.
 *
 * @async
 * @param {string} collectionId - The ID of the collection containing the item.
 * @param {string} itemId - The ID of the item to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {Promise<object>} The updated item object.
 */
async function updateItemInCollection(collectionId, itemId, updates) {
  const updateData = {
    data: JSON.stringify(updates),
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
 * Deletes an item from a collection.
 *
 * @async
 * @param {string} collectionId - The ID of the collection containing the item.
 * @param {string} itemId - The ID of the item to delete.
 * @returns {Promise<boolean>} True if the item was successfully deleted, false otherwise.
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
 * Retrieves all webhooks for a given collection.
 *
 * @async
 * @param {string} collectionId - The ID of the collection to retrieve webhooks for.
 * @returns {Promise<Array<object>>} An array of webhook objects.
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
 * Adds a webhook to a collection.
 *
 * @async
 * @param {string} collectionId - The ID of the collection to add the webhook to.
 * @param {string} url - The URL to send the webhook to.
 * @param {Array<string>} events - An array of event names to trigger the webhook.
 * @returns {Promise<object>} The newly created webhook object.
 */
async function addWebhook(collectionId, url, events) {
  const webhook = {
    id: Date.now().toString(),
    collection_id: collectionId,
    url: url,
    events: JSON.stringify(events),
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
 * Deletes a webhook.
 *
 * @async
 * @param {string} webhookId - The ID of the webhook to delete.
 * @returns {Promise<boolean>} True if the webhook was successfully deleted, false otherwise.
 */
async function deleteWebhook(webhookId) {
  const deleted = await db("webhooks").where({id: webhookId}).delete();

  return deleted > 0;
}

/**
 * Initializes the database storage by running the latest migrations.
 *
 * @async
 * @returns {Promise<void>}
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