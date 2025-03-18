var express = require('express');
var path = require('path');
var fs = require('fs');

var app = express();

// Serve static files from public directory
app.use(express.static('public'));
app.use('/vendor', express.static('public/vendor'));

// Legacy-style template engine with layout and component support
function readFileSync(filepath) {
    try {
        return fs.readFileSync(filepath, 'utf8');
    } catch (err) {
        console.error('Error reading file:', filepath, err);
        return null;
    }
}

function parseMetaTags(content) {
    var meta = {};
    var lines = content.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith('<!-- @')) {
            var tag = line.replace('<!-- @', '').replace(' -->', '');
            var parts = tag.split(':');
            if (parts.length === 2) {
                meta[parts[0]] = parts[1];
            }
        }
    }
    
    return meta;
}

function injectComponent(content, componentName) {
    var componentPath = path.join(__dirname, 'src/components', componentName + '.html');
    var componentContent = readFileSync(componentPath);
    if (!componentContent) {
        return content;
    }
    return content.replace('<!-- @inject:' + componentName + ' -->', componentContent);
}

function renderWithLayout(content, layoutName, variables) {
    var layoutPath = path.join(__dirname, 'src/layout', layoutName + '.html');
    var layoutContent = readFileSync(layoutPath);
    if (!layoutContent) {
        return content;
    }
    
    // Inject the page content into the layout
    layoutContent = layoutContent.replace('<!-- @content -->', content);
    
    // Inject components
    layoutContent = injectComponent(layoutContent, 'topbar');
    layoutContent = injectComponent(layoutContent, 'footer');
    
    return renderTemplate(layoutContent, variables);
}

function renderTemplate(template, variables) {
    var content = template;
    for (var key in variables) {
        content = content.replace(new RegExp('{{' + key + '}}', 'g'), variables[key]);
    }
    return content;
}

// Routes
function renderPage(req, res) {
    var pagePath = path.join(__dirname, 'src/pages/home.html');
    var content = readFileSync(pagePath);
    
    if (!content) {
        return res.status(500).send('Error loading template');
    }
    
    var meta = parseMetaTags(content);
    var variables = {
        title: meta.title || '10x CMS',
        currentYear: new Date().getFullYear()
    };
    
    // Remove meta tags from content
    content = content.split('\n').filter(function(line) {
        return !line.trim().startsWith('<!-- @');
    }).join('\n');
    
    if (meta.layout) {
        content = renderWithLayout(content, meta.layout, variables);
    }
    
    res.send(content);
}

app.get('/', renderPage);
app.get('/home', renderPage);

var server = app.listen(3000, function() {
    console.log('Server is running on port 3000');
});