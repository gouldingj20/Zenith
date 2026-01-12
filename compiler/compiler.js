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
  let stack = [];

  // Determine indentation
  function getIndent(line) {
    return line.match(/^(\s*)/)[1].length;
  }

  let previousIndent = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (!line.trim()) return;

    const indent = getIndent(line);
    line = line.trim();

    // Pop stack if indentation decreased
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
        output += `<!-- Unknown element: ${name} -->\n`;
        return;
      }

      // Check grammar nesting
      const parent = stack.length ? stack[stack.length - 1].name : null;
      if (parent && grammar.nesting_rules[parent] && !grammar.nesting_rules[parent].includes(name)) {
        warnings.push(`Line ${lineNum}: '${name}' should not be inside '${parent}'`);
      }

      // Generate HTML
      const tag = def.tag || 'div';
      const style = def.style ? ` style="${def.style}"` : '';

      if (tag === 'img') {
        output += `<img src="${content}" alt=""${style} />\n`;
      } else if (tag === 'a') {
        output += `<a href="#">${content}</a>\n`;
      } else {
        output += `<${tag}${style}>${content}</${tag}>\n`;
      }

      // Push containers onto stack for nested checking
      if (def.type === 'layout' || def.type === 'section' || def.type === 'component') {
        stack.push({ name, indent });
      }

    } else {
      // Plain text
      output += `<p>${line}</p>\n`;
    }

    previousIndent = indent;
  });

  if (warnings.length) {
    output += '\n<!-- WARNINGS -->\n' + warnings.map(w => `<!-- ${w} -->`).join('\n') + '\n';
  }

  return output;
}