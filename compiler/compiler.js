let dictionary = {};
let grammar = {};
let ready = false;

// Load dictionary and grammar first
Promise.all([
  fetch('zenith/dictionary/dictionary.json').then(res => res.json()),
  fetch('zenith/grammar/grammar.json').then(res => res.json())
]).then(([dict, gram]) => {
  dictionary = dict;
  grammar = gram;
  ready = true;
});
  
// Compiler: outputs { html, css, warnings }
function compileZenithToHTMLandCSS(code) {
  if (!ready) return { html: '', css: '', warnings: ['Waiting for dictionary/grammar to load...'] };

  const lines = code.split('\n');
  let html = '';
  let css = '';
  let warnings = [];
  let stack = [];
  const generatedClasses = new Set();

  function getIndent(line) {
    return line.match(/^(\s*)/)[1].length;
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (!line.trim()) return;

    const indent = getIndent(line);
    line = line.trim();

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

      const parent = stack.length ? stack[stack.length - 1].name : null;
      if (parent && grammar.nesting_rules[parent] && !grammar.nesting_rules[parent].includes(name)) {
        warnings.push(`Line ${lineNum}: '${name}' should not be inside '${parent}'`);
      }

      const tag = def.tag || 'div';
      const classAttr = (def.type === 'layout' || def.type === 'component') ? ` class="${name}"` : '';
      html += tag === 'img'
        ? `<img src="${content}" alt="" />\n`
        : `<${tag}${classAttr}>${content}</${tag}>\n`;

      if (def.style && !generatedClasses.has(name)) {
        if (classAttr) css += `.${name} { ${def.style} }\n`;
        else css += `${tag} { ${def.style} }\n`;
        generatedClasses.add(name);
      }

      if (def.type === 'layout' || def.type === 'section' || def.type === 'component') {
        stack.push({ name, indent });
      }

    } else {
      html += `<p>${line}</p>\n`;
    }
  });

  return { html, css, warnings };
}