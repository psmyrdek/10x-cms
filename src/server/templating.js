var fs = require("fs");
var path = require("path");

/**
 * Reads a file synchronously and returns its content, or null on error.
 * @param {string} filepath - The path to the file.
 * @returns {string|null} The file content as a string, or null if an error occurred.
 */
function readFileSync(filepath) {
  try {
    return fs.readFileSync(filepath, "utf8");
  } catch (err) {
    console.error("Error reading file:", filepath, err);
    return null;
  }
}

/**
 * Parses special meta tags from an HTML content string.
 * Expected format: `<!-- @tag:value -->`.
 * @param {string} content - The HTML content string.
 * @returns {object} An object containing the parsed meta tags as key-value pairs.
 */
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

/**
 * Reads a component file, renders it with provided variables, and injects it into the main content string.
 * Searches for `<!-- @inject:componentName -->` placeholder.
 * @param {string} content - The main content string where the component should be injected.
 * @param {string} componentName - The name of the component file (without extension).
 * @param {object} variables - An object containing variables to render within the component template.
 * @returns {string} The content string with the component injected, or the original content if the component file wasn't found.
 */
function injectComponent(content, componentName, variables) {
  var componentPath = path.join(
    process.cwd(),
    "src/components",
    componentName + ".html"
  );
  var componentContent = readFileSync(componentPath);
  if (!componentContent) {
    return content;
  }

  // Process the component content with variables before injecting
  componentContent = renderTemplate(componentContent, variables);

  return content.replace(
    "<!-- @inject:" + componentName + " -->",
    componentContent
  );
}

/**
 * Reads a layout file, injects the main content into it, processes standard components (topbar, footer), and renders variables within the layout.
 * Searches for `<!-- @content -->` placeholder in the layout.
 * @param {string} content - The main content string to be placed inside the layout.
 * @param {string} layoutName - The name of the layout file (without extension).
 * @param {object} variables - An object containing variables to render within the layout and its injected components.
 * @returns {string} The main content rendered within the specified layout, or the original content if the layout file wasn't found.
 */
function renderWithLayout(content, layoutName, variables) {
  var layoutPath = path.join(process.cwd(), "src/layout", layoutName + ".html");
  var layoutContent = readFileSync(layoutPath);
  if (!layoutContent) {
    return content;
  }

  layoutContent = layoutContent.replace("<!-- @content -->", content);

  // Pass variables to component injections
  layoutContent = injectComponent(layoutContent, "topbar", variables);
  layoutContent = injectComponent(layoutContent, "footer", variables);

  return renderTemplate(layoutContent, variables);
}

/**
 * Processes conditional blocks (`<!-- @if:variable --> ... <!-- @endif -->`) in a template string based on provided variables.
 * If the variable is truthy in the `variables` object, the content inside the block is kept; otherwise, the entire block is removed.
 * @param {string} content - The template string containing conditional blocks.
 * @param {object} variables - An object containing variables to evaluate for the conditional blocks.
 * @returns {string} The template string with conditional blocks processed.
 */
function processConditionals(content, variables) {
  // Process if conditions
  var ifRegex = /<!-- @if:(\w+) -->([\s\S]*?)<!-- @endif -->/g;
  var match;

  while ((match = ifRegex.exec(content)) !== null) {
    var condition = match[1];
    var conditionalContent = match[2];

    // Check if the condition variable exists and is truthy
    if (variables[condition]) {
      // Replace the entire conditional block with just the content
      content = content.replace(match[0], conditionalContent);
    } else {
      // Remove the entire conditional block
      content = content.replace(match[0], "");
    }
  }

  return content;
}

/**
 * Renders a template string by processing conditional blocks and replacing `{{variable}}` placeholders with values from the provided variables object.
 * @param {string} template - The template string to render.
 * @param {object} variables - An object containing variables to use for rendering conditionals and replacing placeholders.
 * @returns {string} The rendered template string.
 */
function renderTemplate(template, variables) {
  var content = template;

  // First process conditionals
  content = processConditionals(content, variables);

  // Then replace variables
  for (var key in variables) {
    if (
      typeof variables[key] === "string" ||
      typeof variables[key] === "number"
    ) {
      content = content.replace(
        new RegExp("{{" + key + "}}", "g"),
        variables[key]
      );
    }
  }

  return content;
}

/**
 * Renders a complete page by reading its file, parsing meta tags, preparing variables (including current year, auth status from request, and custom variables),
 * removing meta tags from the content, and applying a layout if specified in the meta tags.
 * @param {string} pageName - The name of the page file (without extension).
 * @param {object} [req] - An optional request object (e.g., from Express) used to check for cookies/authentication status.
 * @param {object} [customVariables] - An optional object of custom variables to merge with the default and meta variables.
 * @returns {string|null} The fully rendered HTML page content, or null if the page file wasn't found.
 */
function renderPage(pageName, req, customVariables) {
  var pagePath = path.join(process.cwd(), "src/pages", pageName + ".html");
  var content = readFileSync(pagePath);

  if (!content) {
    return null;
  }

  var meta = parseMetaTags(content);
  var variables = {
    title: meta.title || "10xCMS",
    currentYear: new Date().getFullYear(),
    // Add authentication status if request object is provided
    isAuthenticated: req && req.cookies && req.cookies.auth ? true : false,
  };

  // Merge custom variables if provided
  if (customVariables) {
    for (var key in customVariables) {
      variables[key] = customVariables[key];
    }
  }

  // Remove meta tag lines from the actual content before rendering
  content = content
    .split("\n")
    .filter(function (line) {
      return !line.trim().startsWith("<!-- @");
    })
    .join("\n");

  // Apply layout if specified in meta tags
  if (meta.layout) {
    content = renderWithLayout(content, meta.layout, variables);
  } else {
    // If no layout, just render the page content directly with variables
    content = renderTemplate(content, variables);
  }


  return content;
}

module.exports = {
  renderPage: renderPage,
  renderTemplate: renderTemplate,
  renderWithLayout: renderWithLayout,
  parseMetaTags: parseMetaTags,
};
