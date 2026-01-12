let dictionary = {};
let grammar = {};

// Load dictionary and grammar
Promise.all([
  fetch('zenith/dictionary/dictionary.json').then(res => res.json()),
  fetch('zenith/grammar/grammar.json').then(res => res.json())
]).then(([dict, gram]) => {
  dictionary = dict;
  grammar = gram;
});

// Compiler: outputs { html, css, warnings }
function compileZenithToHTMLandCSS(code) {
  if (!dictionary || !grammar) return { html: '', css: '', warnings: [] };

  const lines = code.split('\n');
  let html = '';
  let css = '';
  let warnings = [];
  let stack = [];
  const generatedClasses = new Set();

  function getIndent(line) {
    return line.match(/^(\s*)/)[1].length;
  }

  let previousIndent = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (!line.trim()) return;

    const indent = getIndent(line);
    line = line.trim();

    // Pop stack if indentation decreases
    while (stack.length && indent < stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (line.startsWith('/')) {
      const [el, ...rest] = line.split(' ');
      const name = el.slice(1);
      const content = rest.join(' ').replace(/^"|"$/g, '');
      const def = dictionary[name];

      if (!def) {
        warnings.push(`Line ${lineNum}: Unknown element '${name}'`);
        html += `<!-- Unknown element: ${name} -->\n`;
        return;
      }

      // Check grammar nesting
      const parent = stack.length ? stack[stack.length - 1].name : null;
      if (parent && grammar.nesting_rules[parent] && !grammar.nesting_rules[parent].includes(name)) {
        warnings.push(`Line ${lineNum}: '${name}' should not be inside '${parent}'`);
      }

      const tag = def.tag || 'div';
      const classAttr = (def.type === 'layout' || def.type === 'component') ? ` class="${name}"` : '';
      html += tag === 'img'
        ? `<img src="${content}" alt="" />\n`
        : `<${tag}${classAttr}>${content}</${tag}>\n`;

      // Add CSS from dictionary if not already added
      if (def.style && !generatedClasses.has(name)) {
        if (classAttr) css += `.${name} { ${def.style} }\n`;
        else css += `${tag} { ${def.style} }\n`;
        generatedClasses.add(name);
      }

      // Push containers to stack
      if (def.type === 'layout' || def.type === 'section' || def.type === 'component') {
        stack.push({ name, indent });
      }

    } else {
      html += `<p>${line}</p>\n`;
    }

    previousIndent = indent;
  });

  return { html, css, warnings };
}