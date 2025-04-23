var storage = require("./storage");
var httpClient = require("@10xdevspl/http-client");

/**
 * Retrieves webhooks registered for a specific collection and event type.
 * @param {string} collectionId - The ID of the collection.
 * @param {string} eventType - The type of the event (e.g., 'create', 'update', 'delete').
 * @returns {Promise<Array<{ url: string, events: string[] }>>} A promise that resolves to an array of webhook objects matching the criteria.
 */
async function getWebhooksForEvent(collectionId, eventType) {
  var webhooks = await storage.getWebhooks(collectionId);

  return webhooks.filter(function (webhook) {
    return webhook.events.indexOf(eventType) !== -1;
  });
}

/**
 * Calls a single webhook URL with the given data payload.
 * @param {{ url: string }} webhook - The webhook object, must contain a 'url' property.
 * @param {object} data - The data payload to send to the webhook.
 * @returns {Promise<object>} A promise that resolves to the HTTP client response.
 */
async function callWebhook(webhook, data) {
  return await httpClient.post(webhook.url, data, {
    "Content-Type": "application/json",
    "User-Agent": "10xCMS-Webhook-Service/1.0",
    "X-Webhook-Event": data.event,
  });
}

/**
 * Notifies all relevant webhooks for a specific event on a collection.
 * Fetches webhooks, constructs the payload, and calls each webhook URL,
 * logging results and errors.
 * @param {string} collectionId - The ID of the collection where the event occurred.
 * @param {string} eventType - The type of the event (e.g., 'create', 'update', 'delete').
 * @param {object} data - The data related to the event (e.g., item data or item ID).
 * @returns {Promise<void>} A promise that resolves when all webhook calls have been attempted.
 */
async function notifyWebhooks(collectionId, eventType, data) {
  var webhooks = await getWebhooksForEvent(collectionId, eventType);

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  var collection = await storage.getCollectionById(collectionId);
  if (!collection) {
    console.error(
      "Collection not found for webhook notification: " + collectionId
    );
    return;
  }

  var payload = {
    event: eventType,
    collection: {
      id: collection.id,
      name: collection.name,
    },
    data: data,
    timestamp: new Date().toISOString(),
  };

  console.log(
    "Notifying " +
      webhooks.length +
      " webhooks for " +
      collection.name +
      " - " +
      eventType
  );

  const promises = webhooks.map(function (webhook) {
    return callWebhook(webhook, payload);
  });

  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        "Error calling webhook: " + webhooks[index].url,
        result.reason
      );
    }
  });

  console.log(
    "Webhook notification complete with results:",
    results.map((r) => r.status).join(", ")
  );
}

/**
 * Handles the 'item created' event by notifying relevant webhooks.
 * @param {string} collectionId - The ID of the collection where the item was created.
 * @param {object} item - The data of the newly created item.
 * @returns {Promise<void>} A promise that resolves when webhook notifications are complete.
 */
async function onItemCreated(collectionId, item) {
  await notifyWebhooks(collectionId, "create", item);
}

/**
 * Handles the 'item updated' event by notifying relevant webhooks.
 * @param {string} collectionId - The ID of the collection where the item was updated.
 * @param {object} item - The data of the updated item.
 * @returns {Promise<void>} A promise that resolves when webhook notifications are complete.
 */
async function onItemUpdated(collectionId, item) {
  await notifyWebhooks(collectionId, "update", item);
}

/**
 * Handles the 'item deleted' event by notifying relevant webhooks.
 * @param {string} collectionId - The ID of the collection where the item was deleted.
 * @param {string} itemId - The ID of the deleted item.
 * @returns {Promise<void>} A promise that resolves when webhook notifications are complete.
 */
async function onItemDeleted(collectionId, itemId) {
  await notifyWebhooks(collectionId, "delete", {id: itemId});
}

module.exports = {
  onItemCreated: onItemCreated,
  onItemUpdated: onItemUpdated,
  onItemDeleted: onItemDeleted,
};