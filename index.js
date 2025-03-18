var express = require("express");
var path = require("path");
var templating = require("./src/server/templating");

var app = express();

app.use(express.static("public"));
app.use("/vendor", express.static("public/vendor"));

// Routes
function renderPage(req, res) {
  var pageName = req.path === "/" ? "home" : req.path.substring(1);
  var content = templating.renderPage(pageName);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
}

app.get("/", renderPage);
app.get("/home", renderPage);

var server = app.listen(3000, function () {
  console.log("Server is running on port 3000");
});
