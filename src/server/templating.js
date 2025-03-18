var fs = require("fs");
var path = require("path");

function readFileSync(filepath) {
  try {
    return fs.readFileSync(filepath, "utf8");
  } catch (err) {
    console.error("Error reading file:", filepath, err);
    return null;
  }
}

function parseMetaTags(content) {
  var meta = {};
  var lines = content.split("\n");

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith("<!-- @")) {
      var tag = line.replace("<!-- @", "").replace(" -->", "");
      var parts = tag.split(":");
      if (parts.length === 2) {
        meta[parts[0]] = parts[1];
      }
    }
  }

  return meta;
}

function injectComponent(content, componentName) {
  var componentPath = path.join(
    process.cwd(),
    "src/components",
    componentName + ".html"
  );
  var componentContent = readFileSync(componentPath);
  if (!componentContent) {
    return content;
  }
  return content.replace(
    "<!-- @inject:" + componentName + " -->",
    componentContent
  );
}

function renderWithLayout(content, layoutName, variables) {
  var layoutPath = path.join(process.cwd(), "src/layout", layoutName + ".html");
  var layoutContent = readFileSync(layoutPath);
  if (!layoutContent) {
    return content;
  }

  layoutContent = layoutContent.replace("<!-- @content -->", content);

  layoutContent = injectComponent(layoutContent, "topbar");
  layoutContent = injectComponent(layoutContent, "footer");

  return renderTemplate(layoutContent, variables);
}

function renderTemplate(template, variables) {
  var content = template;
  for (var key in variables) {
    content = content.replace(
      new RegExp("{{" + key + "}}", "g"),
      variables[key]
    );
  }
  return content;
}

function renderPage(pageName) {
  var pagePath = path.join(process.cwd(), "src/pages", pageName + ".html");
  var content = readFileSync(pagePath);

  if (!content) {
    return null;
  }

  var meta = parseMetaTags(content);
  var variables = {
    title: meta.title || "10x CMS",
    currentYear: new Date().getFullYear(),
  };

  content = content
    .split("\n")
    .filter(function (line) {
      return !line.trim().startsWith("<!-- @");
    })
    .join("\n");

  if (meta.layout) {
    content = renderWithLayout(content, meta.layout, variables);
  }

  return content;
}

module.exports = {
  renderPage: renderPage,
  renderTemplate: renderTemplate,
  renderWithLayout: renderWithLayout,
  parseMetaTags: parseMetaTags
};
