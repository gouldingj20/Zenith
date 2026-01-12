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

function compileZenithToHTML(code) {
  if (!dictionary || !grammar) return '';

  const lines = code.split('\n');
  let output = '';
  let warnings = [];
  let parentStack = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    line = line.trim();
    if (!line) return;

    if (line.startsWith('/')) {
      const [el, ...rest] = line.split(' ');
      const name = el.slice(1);
      const content = rest.join(' ').replace(/^"|"$/g, '');
      const def = dictionary[name];

      if (!def) {
        warnings.push(`Line ${lineNum}: Unknown element '${name}'`);
        output += `<!-- Unknown element: ${name} -->\n`;
        return;
      }

      // Check grammar nesting rules
      const parent = parentStack[parentStack.length - 1];
      if (parent && grammar.nesting_rules[parent] && !grammar.nesting_rules[parent].includes(name)) {
        warnings.push(`Line ${lineNum}: '${name}' should not be inside '${parent}'`);
      }

      // Add element to output
      const tag = def.tag || 'div';
      const style = def.style ? ` style="${def.style}"` : '';

      if (tag === 'img') {
        output += `<img src="${content}" alt=""${style} />\n`;
      } else if (tag === 'a') {
        output += `<a href="#">${content}</a>\n`;
      } else {
        output += `<${tag}${style}>${content}</${tag}>\n`;
      }

      // Push container elements to parent stack
      if (def.type === 'layout' || def.type === 'section' || def.type === 'component') {
        parentStack.push(name);
      }

    } else {
      output += `<p>${line}</p>\n`;
    }

    // Pop from stack if indentation decreases (optional: advanced)
    // For now, just keep it simple
  });

  if (warnings.length) {
    output += '\n<!-- WARNINGS -->\n' + warnings.map(w => `<!-- ${w} -->`).join('\n') + '\n';
  }

  return output;
}