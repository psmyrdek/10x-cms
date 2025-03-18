var express = require("express");
var path = require("path");
var templating = require("./src/server/templating");
var storageModule = require("./src/server/storage");
var mediaModule = require("./src/server/media");
var apiRoutes = require("./src/server/api");
var bodyParser = require("body-parser");
var dotenv = require("dotenv");
var fs = require("fs");
var multer = require("multer");

// Configure multer for file uploads
var multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    // Use timestamp + original extension to avoid filename conflicts
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
    // Accept only image files
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Load environment variables
if (fs.existsSync(".env.development")) {
  dotenv.config({path: ".env.development"});
} else {
  dotenv.config();
}

var app = express();

// Middleware
app.use(express.static("public"));
app.use("/vendor", express.static("public/vendor"));
app.use("/images", express.static("public/images"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// API Routes
app.use('/api', apiRoutes);

// Simple cookie middleware
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

  // Add a function to set cookies
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

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.cookies.auth) {
    return res.redirect("/login");
  }
  next();
}

// Routes
function renderPage(req, res) {
  var pageName = req.path === "/" ? "home" : req.path.substring(1);
  var content = templating.renderPage(pageName, req);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
}

// Collections routes
app.get("/collections", requireAuth, function (req, res) {
  var collections = storageModule.getCollections();
  var collectionsHtml = "";

  if (collections.length === 0) {
    collectionsHtml =
      '<div class="col-12"><div class="alert alert-info">No collections found. Create your first collection to get started.</div></div>';
  } else {
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      collectionsHtml += '<div class="col-md-4 mb-4">';
      collectionsHtml += '<div class="card">';
      collectionsHtml += '<div class="card-body">';
      // Add meta tag with collection ID
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

  // Generate form fields based on schema
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
      // Media field type
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

  // Generate items HTML
  if (collection.items.length === 0) {
    itemsHtml =
      '<div class="alert alert-info">No items in this collection yet. Add your first item to get started.</div>';
  } else {
    itemsHtml =
      '<div class="table-responsive"><table class="table table-striped">';
    itemsHtml += "<thead><tr>";

    // Table headers from schema
    for (var field in collection.schema) {
      itemsHtml += "<th>" + field + "</th>";
    }
    itemsHtml += "<th>Actions</th></tr></thead>";

    // Table body from items
    itemsHtml += "<tbody>";
    for (var i = 0; i < collection.items.length; i++) {
      var item = collection.items[i];
      itemsHtml += '<tr data-id="' + item.id + '">';

      for (var field in collection.schema) {
        var fieldType = collection.schema[field];
        if (fieldType === "media" && item[field]) {
          // For media fields, display as image thumbnail
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

  // Process schema fields from form
  if (req.body.fieldName && req.body.fieldType) {
    for (var i = 0; i < req.body.fieldName.length; i++) {
      schema[req.body.fieldName[i]] = req.body.fieldType[i];
    }
  }

  var collection = storageModule.createCollection(name, schema);
  res.json({success: true, collection: collection});
});

app.post("/api/collections/:id/items", requireAuth, function (req, res) {
  var collectionId = req.params.id;
  var collection = storageModule.getCollectionById(collectionId);

  if (!collection) {
    return res.status(404).json({error: "Collection not found"});
  }

  var item = {};

  // Process item fields from form
  for (var field in collection.schema) {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  }

  var updatedCollection = storageModule.addItemToCollection(collectionId, item);
  res.json({success: true, item: item});
});

app.put(
  "/api/collections/:collectionId/items/:itemId",
  requireAuth,
  function (req, res) {
    var collectionId = req.params.collectionId;
    var itemId = req.params.itemId;
    var collection = storageModule.getCollectionById(collectionId);

    if (!collection) {
      return res.status(404).json({error: "Collection not found"});
    }

    var updates = {};

    // Process item fields from form
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

    res.json({success: true, item: result});
  }
);

app.delete(
  "/api/collections/:collectionId/items/:itemId",
  requireAuth,
  function (req, res) {
    var collectionId = req.params.collectionId;
    var itemId = req.params.itemId;

    var success = storageModule.deleteItemFromCollection(collectionId, itemId);

    if (success) {
      res.json({success: true, message: "Item deleted successfully"});
    } else {
      res.status(404).json({error: "Collection or item not found"});
    }
  }
);

app.delete("/api/collections/:id", requireAuth, function (req, res) {
  var collectionId = req.params.id;

  // Check if collection ID is provided
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
  // If already logged in, redirect to home
  if (req.cookies.auth) {
    return res.redirect("/home");
  }
  renderPage(req, res);
});

app.post("/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  // Check credentials against environment variables
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Set auth cookie
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
  // Clear auth cookie
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
      '<div class="col-12"><div class="alert alert-info">No images found. Upload your first image to get started.</div></div>';
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
