let dictionary = {};

// Load your dictionary JSON
fetch('zenith/dictionary/dictionary.json')
  .then(res => res.json())
  .then(data => {
    dictionary = data;
  });

// Function to compile Zenith code to raw HTML
function compileZenithToHTML(code) {
  if (!dictionary || Object.keys(dictionary).length === 0) return '';

  const lines = code.split('\n');
  let output = '';

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith('/')) {
      const [el, ...rest] = line.split(' ');
      const content = rest.join(' ').replace(/^"|"$/g, '');
      const def = dictionary[el.slice(1)];

      if (!def) {
        output += `<!-- Unknown element: ${el.slice(1)} -->\n`;
        return;
      }

      const tag = def.tag || 'div';
      const style = def.style ? ` style="${def.style}"` : '';

      if (tag === 'img') {
        output += `<img src="${content}" alt=""${style} />\n`;
      } else if (tag === 'a') {
        output += `<a href="#">${content}</a>\n`;
      } else {
        output += `<${tag}${style}>${content}</${tag}>\n`;
      }

    } else {
      output += `<p>${line}</p>\n`;
    }
  });

  return output;
}