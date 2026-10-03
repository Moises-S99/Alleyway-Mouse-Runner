import fs from 'fs';
import path from 'path';

console.log('Building 100% self-contained standalone offline game bundle...');

// 1. Locate Vite production assets in dist/assets
const assetsDir = path.resolve('dist/assets');
if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets directory does not exist! Run vite build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('Could not find compiled JS or CSS in dist/assets!');
  process.exit(1);
}

let jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
console.log(`Found Vite compiled JS: ${jsFile} (${(jsContent.length / 1024).toFixed(1)} KB)`);
console.log(`Found Vite compiled CSS: ${cssFile} (${(cssContent.length / 1024).toFixed(1)} KB)`);

// 2. Embed official game icon as base64 Data URL so it loads with zero network
let iconDataUrl = '';
const iconPath = path.resolve('public/app-icon.png');
if (fs.existsSync(iconPath)) {
  const iconBase64 = fs.readFileSync(iconPath).toString('base64');
  iconDataUrl = `data:image/png;base64,${iconBase64}`;
  console.log(`Embedded base64 official game icon (${(iconBase64.length / 1024).toFixed(1)} KB)`);

  // Replace references to '/app-icon.png' in the JS code with the inline base64 string
  jsContent = jsContent.replaceAll('`/app-icon.png`', JSON.stringify(iconDataUrl));
  jsContent = jsContent.replaceAll('"/app-icon.png"', JSON.stringify(iconDataUrl));
  jsContent = jsContent.replaceAll("'/app-icon.png'", JSON.stringify(iconDataUrl));
}

// 3. Assemble the 100% self-contained single-file HTML (works on file:// and all browsers)
const htmlTemplate = `<!doctype html>
<html lang="es" class="bg-slate-950">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>Alleyway Mouse Runner Mobile</title>
    <meta name="description" content="Juego endless runner arcade optimizado para dispositivos móviles Android con base de datos local robusta, modo sin conexión y controles táctiles." />
    <meta name="theme-color" content="#020617" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="MouseRunner" />
    ${iconDataUrl ? `<link rel="icon" type="image/png" href="${iconDataUrl}" />` : ''}
    ${iconDataUrl ? `<link rel="apple-touch-icon" href="${iconDataUrl}" />` : ''}
    <style>
/* Reset & Critical dark background to prevent any white flash */
html, body {
  background-color: #020617 !important;
  color: #f8fafc;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
#root {
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
${cssContent}
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 overflow-x-hidden select-none">
    <div id="root"></div>
    <script>
      window.__IS_STANDALONE_BUNDLE__ = true;
    </script>
    <script>
${jsContent}
    </script>
  </body>
</html>`;

// 4. Ensure public and dist directories exist and write standalone file
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const publicOut = path.join(publicDir, 'Raton_Callejero_Juego_Completo.html');
fs.writeFileSync(publicOut, htmlTemplate, 'utf-8');
console.log(`Saved standalone game to: ${publicOut} (${(htmlTemplate.length / 1024).toFixed(1)} KB)`);

const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  const distOut = path.join(distDir, 'Raton_Callejero_Juego_Completo.html');
  fs.writeFileSync(distOut, htmlTemplate, 'utf-8');
  console.log(`Saved copy to: ${distOut}`);
}

console.log('Standalone offline game built successfully!');
