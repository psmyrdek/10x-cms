var http = require('http');
var https = require('https');
var url = require('url');
var storage = require('./storage');

// Get all webhooks for a collection that are registered for a specific event
function getWebhooksForEvent(collectionId, eventType) {
  var webhooks = storage.getWebhooks(collectionId);
  
  return webhooks.filter(function(webhook) {
    return webhook.events.indexOf(eventType) !== -1;
  });
}

// Call a single webhook with the provided data
function callWebhook(webhook, data) {
  var parsedUrl = url.parse(webhook.url);
  var protocol = parsedUrl.protocol === 'https:' ? https : http;
  var options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CMS-Webhook-Service/1.0',
      'X-Webhook-Event': data.event
    }
  };

  var req = protocol.request(options, function(res) {
    var responseData = '';
    
    res.on('data', function(chunk) {
      responseData += chunk;
    });
    
    res.on('end', function() {
      console.log('Webhook response: ' + res.statusCode);
      if (res.statusCode >= 400) {
        console.error('Webhook failed: ' + responseData);
      }
    });
  });
  
  req.on('error', function(error) {
    console.error('Error calling webhook: ' + error.message);
  });
  
  req.write(JSON.stringify(data));
  req.end();
}

// Call all webhooks for a specific collection and event
function notifyWebhooks(collectionId, eventType, data) {
  var webhooks = getWebhooksForEvent(collectionId, eventType);
  
  if (!webhooks || webhooks.length === 0) {
    return;
  }
  
  var collection = storage.getCollectionById(collectionId);
  if (!collection) {
    console.error('Collection not found for webhook notification: ' + collectionId);
    return;
  }
  
  var payload = {
    event: eventType,
    collection: {
      id: collection.id,
      name: collection.name
    },
    data: data,
    timestamp: new Date().toISOString()
  };
  
  console.log('Notifying ' + webhooks.length + ' webhooks for ' + collection.name + ' - ' + eventType);
  
  for (var i = 0; i < webhooks.length; i++) {
    callWebhook(webhooks[i], payload);
  }
}

// Event handlers for different collection operations
function onItemCreated(collectionId, item) {
  notifyWebhooks(collectionId, 'create', item);
}

function onItemUpdated(collectionId, item) {
  notifyWebhooks(collectionId, 'update', item);
}

function onItemDeleted(collectionId, itemId) {
  notifyWebhooks(collectionId, 'delete', { id: itemId });
}

// Collection-level event handlers
function onCollectionCreated(collection) {
  // Collections don't have webhooks yet when they're first created
  // This is mainly for completeness of the API
  console.log('Collection created: ' + collection.name);
}

function onCollectionDeleted(collectionId) {
  // When a collection is deleted, its webhooks are also deleted
  // This is mainly for logging purposes
  console.log('Collection deleted: ' + collectionId);
}

module.exports = {
  onItemCreated: onItemCreated,
  onItemUpdated: onItemUpdated,
  onItemDeleted: onItemDeleted,
  onCollectionCreated: onCollectionCreated,
  onCollectionDeleted: onCollectionDeleted
};
