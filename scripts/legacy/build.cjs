/* Optional maintenance command. Normal Hugo/Python builds use the checked-in outputs. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function dependency(name) {
  try { return require(name); } catch (error) {
    try { return require('/usr/share/nodejs/' + name); } catch {
      throw new Error('Missing optional legacy tool ' + name + '. Run npm install --prefix scripts/legacy first.');
    }
  }
}
const babel = dependency('@babel/core'), preset = dependency('@babel/preset-env'), postcss = dependency('postcss'), acorn = dependency('acorn');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const inputs = ['static/js/bootstrap.js', 'static/js/device-status.js', 'static/js/status-updates.js', 'static/js/app.js', 'static/css/app.css', 'scripts/legacy/compat.js', 'scripts/legacy/layout.css', 'scripts/legacy/build.cjs', 'static/js/vendor/core-js-3.26.1.min.js', 'static/js/vendor/fetch-3.6.20.js'];
const source = read('static/css/app.css');
const duration = source.match(/animation:live-border\s+([\d.]+s)/)?.[1] || '15s';
const borderWidth = source.match(/\.device-tile\[data-power=on\][^{]+::after\{[^}]*?padding:([\d.]+)px/)?.[1] || '2';
const transform = text => babel.transformSync(text, {babelrc: false, configFile: false, sourceType: 'script', presets: [[preset, {targets: {safari: '8'}, modules: false, useBuiltIns: false}]], comments: true, compact: false}).code;
const app = ['static/js/device-status.js','static/js/status-updates.js','static/js/app.js'].map(name => transform(read(name))).join('\n');
const tileMinHeight = Number(source.match(/#device-grid\{[^}]*--tile-min-height:([\d.]+)px/)?.[1] || 240);
const compat = 'window.KennednLegacyConfig=' + JSON.stringify({borderDuration: duration, tileMinHeight}) + ';\n' + read('scripts/legacy/compat.js');
const variables = {};
const tree = postcss.parse(source);
tree.walkRules(rule => { if (rule.selector === ':root') rule.walkDecls(decl => { if (decl.prop.startsWith('--')) variables[decl.prop] = decl.value; }); });
function values(value) {
  for (let i = 0; i < 10 && value.includes('var('); i++) value = value.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/g, (_, key, fallback) => variables[key] || fallback || 'initial');
  return value.replace(/#([\da-f]{8}|[\da-f]{4})\b/gi, (_, hex) => {
    const full = hex.length === 4 ? [...hex].map(c => c + c).join('') : hex;
    return 'rgba(' + [0,2,4].map(n => parseInt(full.slice(n,n+2),16)).join(',') + ',' + (parseInt(full.slice(6,8),16) / 255).toFixed(4) + ')';
  });
}
function compatibleCSS(text) {
  const css = postcss.parse(text);
  css.walkAtRules(rule => { if (rule.name === 'property') rule.remove(); });
  css.walkDecls(decl => {
    if (decl.prop.startsWith('--')) { decl.remove(); return; }
    decl.value = values(decl.value);
    if (['flex','inline-flex'].includes(decl.value) && decl.prop === 'display') decl.cloneBefore({value: '-webkit-' + decl.value});
    if (['flex','flex-direction','flex-wrap','flex-flow','flex-grow','flex-shrink','flex-basis','align-items','align-self','align-content','justify-content','order','transform','transition','user-select','appearance'].includes(decl.prop)) decl.cloneBefore({prop: '-webkit-' + decl.prop});
  });
  return css.toString();
}
const css = compatibleCSS(source + '\n' + read('scripts/legacy/layout.css').replaceAll('LEGACY_BORDER_WIDTH', borderWidth + 'px'));
const outputs = {'static/js/legacy/app.js': app + '\n', 'static/js/legacy/compat.js': compat, 'static/css/legacy.css': css};
for (const [file, text] of Object.entries(outputs)) {
  fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
  if (file.endsWith('.js')) acorn.parse(text, {ecmaVersion: 5});
  fs.writeFileSync(path.join(root, file), text);
}
for (const file of ['static/js/bootstrap.js', 'static/js/vendor/core-js-3.26.1.min.js', 'static/js/vendor/fetch-3.6.20.js']) acorn.parse(read(file), {ecmaVersion: 5});
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
fs.writeFileSync(path.join(root, 'data/legacy.json'), JSON.stringify({version: 1, inputs: Object.fromEntries(inputs.map(file => [file, hash(file)])), outputs: Object.fromEntries(Object.keys(outputs).map(file => [file, hash(file)]))}, null, 2) + '\n');
console.log('Generated and ES5-validated Safari 8 assets. Hugo builds need no Node/npm.');
