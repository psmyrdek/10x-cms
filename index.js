var express = require("express");
var path = require("path");
var templating = require("./src/server/templating");
var storageModule = require("./src/server/storage");
var mediaModule = require("./src/server/media");
var apiRoutes = require("./src/server/api");
var webhooksModule = require("./src/server/webhooks");
var bodyParser = require("body-parser");
var dotenv = require("dotenv");
var fs = require("fs");
var multer = require("multer");

var multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

var upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

if (fs.existsSync(".env.development")) {
  dotenv.config({path: ".env.development"});
} else {
  dotenv.config();
}

var app = express();

app.use(express.static("public"));
app.use("/vendor", express.static("public/vendor"));
app.use("/images", express.static("public/images"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use("/api", apiRoutes);

app.use(function (req, res, next) {
  var cookies = {};
  var cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(";").forEach(function (cookie) {
      var parts = cookie.split("=");
      cookies[parts[0].trim()] = (parts[1] || "").trim();
    });
  }

  req.cookies = cookies;

  res.setCookie = function (name, value, options) {
    options = options || {};
    var cookieStr = name + "=" + value;

    if (options.maxAge) cookieStr += "; Max-Age=" + options.maxAge;
    if (options.path) cookieStr += "; Path=" + options.path;
    if (options.httpOnly) cookieStr += "; HttpOnly";
    if (options.secure) cookieStr += "; Secure";

    this.setHeader("Set-Cookie", cookieStr);
    return this;
  };

  next();
});

function requireAuth(req, res, next) {
  if (!req.cookies.auth) {
    return res.redirect("/login");
  }
  next();
}

function renderPage(req, res) {
  var pageName = req.path === "/" ? "home" : req.path.substring(1);
  var content = templating.renderPage(pageName, req);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
}

app.get("/webhooks", requireAuth, function (req, res) {
  var webhooksListHtml = "";
  var collections = storageModule.getCollections();
  var collectionsDropdownHtml = "";

  if (collections.length === 0) {
    collectionsDropdownHtml =
      '<option value="">No collections available</option>';
  } else {
    collectionsDropdownHtml = '<option value="">Select collection...</option>';
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      collectionsDropdownHtml +=
        '<option value="' +
        collection.id +
        '">' +
        collection.name +
        "</option>";
    }

    var hasWebhooks = false;
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      var webhooks = storageModule.getWebhooks(collection.id);

      if (webhooks.length > 0) {
        hasWebhooks = true;
        webhooksListHtml += '<div class="mb-4">';
        webhooksListHtml += '<h6 class="mb-3">' + collection.name + "</h6>";

        for (var j = 0; j < webhooks.length; j++) {
          var webhook = webhooks[j];
          webhooksListHtml += '<div class="card mb-2">';
          webhooksListHtml += '<div class="card-body">';
          webhooksListHtml +=
            '<div class="d-flex justify-content-between align-items-center">';
          webhooksListHtml += "<div>";
          webhooksListHtml +=
            '<p class="mb-1"><strong>URL:</strong> ' + webhook.url + "</p>";
          webhooksListHtml +=
            '<p class="mb-0"><small class="text-muted">Events: ' +
            webhook.events.join(", ") +
            "</small></p>";
          webhooksListHtml += "</div>";
          webhooksListHtml +=
            '<button class="btn btn-danger btn-sm delete-webhook" data-id="' +
            webhook.id +
            '">Delete</button>';
          webhooksListHtml += "</div>";
          webhooksListHtml += "</div>";
          webhooksListHtml += "</div>";
        }

        webhooksListHtml += "</div>";
      }
    }

    if (!hasWebhooks) {
      webhooksListHtml =
        "<p class='alert alert-info text-dark'>No webhooks configured yet.</p>";
    }
  }

  var content = templating.renderPage("webhooks", req, {
    webhooksListHtml: webhooksListHtml,
    collectionsDropdownHtml: collectionsDropdownHtml,
  });

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
});

app.post("/api/webhooks", requireAuth, function (req, res) {
  var collectionId = req.body.collection;
  var url = req.body.url;
  var events = [];

  if (req.body.event_create) events.push("create");
  if (req.body.event_update) events.push("update");
  if (req.body.event_delete) events.push("delete");

  if (!collectionId || !url || events.length === 0) {
    return res.status(400).json({error: "Missing required fields"});
  }

  var webhook = storageModule.addWebhook(collectionId, url, events);
  res.json(webhook);
});

app.delete("/api/webhooks/:id", requireAuth, function (req, res) {
  var success = storageModule.deleteWebhook(req.params.id);
  if (success) {
    res.json({success: true});
  } else {
    res.status(404).json({error: "Webhook not found"});
  }
});

app.get("/collections", requireAuth, function (req, res) {
  var collections = storageModule.getCollections();
  var collectionsHtml = "";

  if (collections.length === 0) {
    collectionsHtml =
      '<div class="col-12"><p class="alert alert-info text-dark">No collections found. Create your first collection to get started.</p></div>';
  } else {
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      collectionsHtml += '<div class="col-md-4 mb-4">';
      collectionsHtml += '<div class="card">';
      collectionsHtml += '<div class="card-body">';
      collectionsHtml += "<!-- @collectionId:" + collection.id + " -->";
      collectionsHtml += '<h5 class="card-title">' + collection.name + "</h5>";
      collectionsHtml +=
        '<p class="card-text">Items: ' + collection.items.length + "</p>";
      collectionsHtml += '<div class="d-flex justify-content-between">';
      collectionsHtml +=
        '<a href="/collections/' +
        collection.id +
        '" class="btn btn-primary">View Collection</a>';
      collectionsHtml +=
        '<button class="btn btn-danger delete-collection-btn" data-id="' +
        collection.id +
        '" data-name="' +
        collection.name +
        '">Delete</button>';
      collectionsHtml += "</div>";
      collectionsHtml += "</div></div></div>";
    }
  }

  var variables = {
    collectionsHtml: collectionsHtml,
  };

  var content = templating.renderPage("collections", req, variables);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
});

app.get("/collections/:id", requireAuth, function (req, res) {
  var collectionId = req.params.id;
  var collection = storageModule.getCollectionById(collectionId);

  if (!collection) {
    return res.status(404).send("Collection not found");
  }

  var itemsHtml = "";
  var formFieldsHtml = "";

  for (var field in collection.schema) {
    var fieldType = collection.schema[field];
    var inputType = "text";

    if (fieldType === "number") {
      inputType = "number";
    } else if (fieldType === "date") {
      inputType = "date";
    }

    formFieldsHtml += '<div class="mb-3">';
    formFieldsHtml +=
      '<label for="' + field + '" class="form-label">' + field + "</label>";

    if (fieldType === "text") {
      formFieldsHtml +=
        '<textarea class="form-control" id="' +
        field +
        '" name="' +
        field +
        '" rows="3"></textarea>';
    } else if (fieldType === "media") {
      formFieldsHtml +=
        '<div class="input-group">' +
        '<input type="hidden" id="' +
        field +
        '" name="' +
        field +
        '" class="media-field-input">' +
        '<input type="text" class="form-control media-field-display" id="' +
        field +
        '_display" readonly placeholder="No image selected">' +
        '<button type="button" class="btn btn-primary media-selector-btn" data-field="' +
        field +
        '">Select Image</button>' +
        "</div>" +
        '<div class="mt-2 media-preview-container" id="' +
        field +
        '_preview"></div>';
    } else {
      formFieldsHtml +=
        '<input type="' +
        inputType +
        '" class="form-control" id="' +
        field +
        '" name="' +
        field +
        '">';
    }

    formFieldsHtml += "</div>";
  }

  if (collection.items.length === 0) {
    itemsHtml =
      '<p class="alert alert-info text-dark">No items in this collection yet. Add your first item to get started.</p>';
  } else {
    itemsHtml =
      '<div class="table-responsive"><table class="table table-striped">';
    itemsHtml += "<thead><tr>";

    for (var field in collection.schema) {
      itemsHtml += "<th>" + field + "</th>";
    }
    itemsHtml += "<th>Actions</th></tr></thead>";

    itemsHtml += "<tbody>";
    for (var i = 0; i < collection.items.length; i++) {
      var item = collection.items[i];
      itemsHtml += '<tr data-id="' + item.id + '">';

      for (var field in collection.schema) {
        var fieldType = collection.schema[field];
        if (fieldType === "media" && item[field]) {
          itemsHtml +=
            '<td><img src="' +
            item[field] +
            '" alt="Media" class="img-thumbnail" style="max-width: 50px; max-height: 50px;"></td>';
        } else {
          itemsHtml += "<td>" + (item[field] || "") + "</td>";
        }
      }

      itemsHtml += "<td>";
      itemsHtml +=
        '<button class="btn btn-sm btn-primary edit-item-btn">Edit</button> ';
      itemsHtml +=
        '<button class="btn btn-sm btn-danger delete-item-btn">Delete</button>';
      itemsHtml += "</td></tr>";
    }

    itemsHtml += "</tbody></table></div>";
  }

  var variables = {
    collectionName: collection.name,
    itemsHtml: itemsHtml,
    formFieldsHtml: formFieldsHtml,
    collectionId: collection.id,
  };

  var content = templating.renderPage("collection", req, variables);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
});

// API routes for collections
app.post("/api/collections", requireAuth, function (req, res) {
  var name = req.body.name;
  var schema = {};

  if (req.body.fieldName && req.body.fieldType) {
    for (var i = 0; i < req.body.fieldName.length; i++) {
      schema[req.body.fieldName[i]] = req.body.fieldType[i];
    }
  }

  var collection = storageModule.createCollection(name, schema);

  res.json({success: true, collection: collection});
});

app.post("/api/collections/:id/items", requireAuth, async function (req, res) {
  console.log("Creating item in collection:", req.params.id);
  var collectionId = req.params.id;
  var collection = storageModule.getCollectionById(collectionId);

  if (!collection) {
    return res.status(404).json({error: "Collection not found"});
  }

  var item = {};

  for (var field in collection.schema) {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  }

  var addedItem = storageModule.addItemToCollection(collectionId, item);

  // Wait for webhook but handle errors silently
  try {
    await webhooksModule.onItemCreated(collectionId, addedItem);
  } catch (error) {
    console.error("Error calling webhook for item creation:", error);
  }

  res.json({success: true, item: addedItem});
});

app.put(
  "/api/collections/:collectionId/items/:itemId",
  requireAuth,
  async function (req, res) {
    var collectionId = req.params.collectionId;
    var itemId = req.params.itemId;
    var collection = storageModule.getCollectionById(collectionId);

    if (!collection) {
      return res.status(404).json({error: "Collection not found"});
    }

    var updates = {};

    for (var field in collection.schema) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    var result = storageModule.updateItemInCollection(
      collectionId,
      itemId,
      updates
    );

    if (!result) {
      return res.status(404).json({error: "Item not found"});
    }

    // Wait for webhook but handle errors silently
    try {
      await webhooksModule.onItemUpdated(collectionId, result);
    } catch (error) {
      console.error("Error calling webhook for item update:", error);
    }

    res.json({success: true, item: result});
  }
);

app.delete(
  "/api/collections/:collectionId/items/:itemId",
  requireAuth,
  async function (req, res) {
    var collectionId = req.params.collectionId;
    var itemId = req.params.itemId;

    var success = storageModule.deleteItemFromCollection(collectionId, itemId);

    if (success) {
      // Wait for webhook but handle errors silently
      try {
        await webhooksModule.onItemDeleted(collectionId, itemId);
      } catch (error) {
        console.error("Error calling webhook for item deletion:", error);
      }

      res.json({success: true, message: "Item deleted successfully"});
    } else {
      res.status(404).json({error: "Collection or item not found"});
    }
  }
);

app.delete("/api/collections/:id", requireAuth, function (req, res) {
  var collectionId = req.params.id;

  if (!collectionId) {
    return res.status(400).json({error: "Collection ID is required"});
  }

  var success = storageModule.deleteCollection(collectionId);

  if (success) {
    res.json({success: true, message: "Collection deleted successfully"});
  } else {
    res.status(404).json({error: "Collection not found"});
  }
});

// Login routes
app.get("/login", function (req, res) {
  if (req.cookies.auth) {
    return res.redirect("/home");
  }
  renderPage(req, res);
});

app.post("/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    res.setCookie("auth", "authenticated", {
      maxAge: 3600, // 1 hour
      path: "/",
      httpOnly: true,
    });

    return res.status(200).json({success: true});
  }

  return res.status(401).json({error: "Invalid credentials"});
});

app.get("/logout", function (req, res) {
  res.setCookie("auth", "", {
    maxAge: -1,
    path: "/",
  });

  res.redirect("/login");
});

// Protected routes
app.get("/", requireAuth, renderPage);
app.get("/home", requireAuth, renderPage);

// Media Library routes
app.get("/media", requireAuth, function (req, res) {
  var mediaItems = mediaModule.getAllMedia();
  var mediaHtml = "";

  if (mediaItems.length === 0) {
    mediaHtml =
      '<div class="col-12"><p class="alert alert-info text-dark">No images found. Upload your first image to get started.</p></div>';
  } else {
    for (var i = 0; i < mediaItems.length; i++) {
      var item = mediaItems[i];
      mediaHtml += '<div class="col-md-3 mb-4">';
      mediaHtml += '<div class="card h-100">';
      mediaHtml +=
        '<img src="' +
        item.path +
        '" class="card-img-top" alt="' +
        item.originalname +
        '" style="height: 150px; object-fit: cover;">';
      mediaHtml += '<div class="card-body">';
      // Add meta tag with media ID
      mediaHtml += "<!-- @mediaId:" + item.id + " -->";
      mediaHtml +=
        '<h6 class="card-title text-truncate">' + item.originalname + "</h6>";
      mediaHtml +=
        '<p class="card-text small text-muted">' +
        (item.description || "No description") +
        "</p>";
      mediaHtml += '<div class="d-flex justify-content-between">';
      mediaHtml +=
        '<button class="btn btn-sm btn-primary preview-image-btn" data-id="' +
        item.id +
        '" data-path="' +
        item.path +
        '" data-name="' +
        item.originalname +
        '" data-description="' +
        (item.description || "") +
        '">Preview</button>';
      mediaHtml +=
        '<button class="btn btn-sm btn-danger delete-image-btn" data-id="' +
        item.id +
        '">Delete</button>';
      mediaHtml += "</div>";
      mediaHtml += "</div></div></div>";
    }
  }

  var variables = {
    mediaHtml: mediaHtml,
  };

  var content = templating.renderPage("media", req, variables);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
});

// API routes for media
app.post(
  "/api/media",
  requireAuth,
  upload.single("image"),
  function (req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({error: "No image file uploaded"});
      }

      var description = req.body.description || "";
      var mediaItem = mediaModule.addMedia(req.file, description);

      res.json({success: true, media: mediaItem});
    } catch (err) {
      console.error("Error uploading image:", err);
      res.status(500).json({error: "Error uploading image: " + err.message});
    }
  }
);

app.get("/api/media", requireAuth, function (req, res) {
  try {
    var mediaItems = mediaModule.getAllMedia();
    res.json({success: true, media: mediaItems});
  } catch (err) {
    console.error("Error retrieving media:", err);
    res.status(500).json({error: "Error retrieving media: " + err.message});
  }
});

app.delete("/api/media/:id", requireAuth, function (req, res) {
  var mediaId = req.params.id;

  if (!mediaId) {
    return res.status(400).json({error: "Media ID is required"});
  }

  var success = mediaModule.deleteMedia(mediaId);

  if (success) {
    res.json({success: true, message: "Media deleted successfully"});
  } else {
    res.status(404).json({error: "Media not found or could not be deleted"});
  }
});

// Initialize storage
storageModule.initializeStorage();

// Initialize media storage
mediaModule.initializeMediaStorage();

// Start server
var server = app.listen(3000, function () {
  console.log("Server is running on http://localhost:3000");
});
