/* Pruebas de la PLANTILLA de las páginas de recurso — /recursos/<slug>/
   Correr:  node test/recurso-pagina.test.js

   No prueba una pagina sola: recorre TODAS las subcarpetas de /recursos/ que
   tengan un index.html y les exige lo mismo. Cada recurso nuevo queda cubierto solo, sin tocar este
   archivo. Eso es el punto: son 22 páginas por hacer y los errores de plantilla
   (un botón de copiar apuntando a un bloque que no existe, una página sin
   Clarity, un enlace roto a un recurso hermano) no se ven a ojo.            */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'recursos');
const CLARITY = 'ybp8htwt62';

let fails = 0, passes = 0;
const is = (cond, m) => { cond ? (passes++, console.log('  ✓ ' + m)) : (fails++, console.log('  ✗ ' + m)); };

/* Los slugs son las subcarpetas de /recursos/ que tienen index.html. */
const slugs = fs.readdirSync(DIR, { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(DIR, e.name, 'index.html')))
  .map(e => e.name);

console.log(`\n── Páginas de recurso encontradas: ${slugs.length} ──`);
console.log('   ' + (slugs.join(', ') || '(ninguna)'));

/* ── Los archivos compartidos tienen que existir ── */
console.log('\n── 0. Los compartidos ──');
{
  const css = path.join(DIR, 'recurso.css');
  const js  = path.join(DIR, 'recurso.js');
  is(fs.existsSync(css), 'existe recursos/recurso.css');
  is(fs.existsSync(js),  'existe recursos/recurso.js');
  if (fs.existsSync(js)) {
    const src = fs.readFileSync(js, 'utf8');
    is(/dataset\.recurso/.test(src),
       'el JS compartido saca el id del recurso del body, no lo lleva escrito');
    is(!/informe-meta-ads/.test(src),
       'el JS compartido no menciona ningún recurso concreto');
  }
}

/* ── Lo que toda página de recurso tiene que cumplir ── */
for (const slug of slugs) {
  console.log(`\n── /recursos/${slug}/ ──`);
  const file = path.join(DIR, slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const errores = [];
  const dom = new JSDOM(html, { url: `http://localhost/recursos/${slug}/` });
  const d = dom.window.document;

  is(html.includes(CLARITY), 'lleva la etiqueta de Clarity');
  is(/<link[^>]+href="\/recursos\/recurso\.css"/.test(html), 'usa el CSS compartido por ruta absoluta');
  is(/<script[^>]+src="\/recursos\/recurso\.js"/.test(html), 'usa el JS compartido por ruta absoluta');
  is(!/<style>/.test(html), 'no trae CSS suelto adentro (si no, se desincroniza del resto)');

  is(d.body.dataset.recurso === slug,
     `body data-recurso dice "${slug}" (dice "${d.body.dataset.recurso}")`);
  is(!!d.title && d.title.length > 12, 'tiene <title> propio');
  is(!!d.querySelector('meta[name="description"]'), 'tiene meta description');
  is(!!d.querySelector('h1'), 'tiene un h1');

  const og = d.querySelector('meta[property="og:url"]');
  is(!!og && og.content === `https://bio.saleads.co/recursos/${slug}/`,
     'og:url apunta a su propia ruta con barra final');

  /* Cada botón de copiar tiene que apuntar a un bloque que exista y que traiga
     algo. Es el error más fácil de cometer al duplicar la plantilla. */
  /* No se exige que haya bloques copiables: hay recursos que son una
     estructura o una lista y no tienen nada que copiar. Lo que sí se exige es
     que los que existan apunten a algo real. */
  const btns = [...d.querySelectorAll('[data-copia]')];
  console.log(`   (${btns.length} bloque(s) para copiar)`);
  btns.forEach(b => {
    const src = d.getElementById(b.dataset.copia);
    is(!!src && src.textContent.trim().length > 0,
       `el botón "${b.dataset.copia}" apunta a un bloque que existe y no está vacío`);
  });

  /* Volver a la lista: sin esto la página es un callejón sin salida. */
  const vuelve = [...d.querySelectorAll('a')].filter(a => a.getAttribute('href') === '/recursos/');
  is(vuelve.length >= 1, 'se puede volver a /recursos/');

  /* Los enlaces internos tienen que existir en el disco. Vercel no redirige
     /ruta a /ruta/, así que un enlace sin barra final da 404 silencioso. */
  [...d.querySelectorAll('a[href^="/"]')].forEach(a => {
    const href = a.getAttribute('href').split(/[?#]/)[0];
    if (!href.endsWith('/')) {
      if (!fs.existsSync(path.join(RAIZ, href))) errores.push(`enlace sin barra final ni archivo: ${href}`);
      return;
    }
    if (!fs.existsSync(path.join(RAIZ, href, 'index.html'))) errores.push(`enlace a página inexistente: ${href}`);
  });
  is(errores.length === 0, 'todos sus enlaces internos existen' + (errores.length ? ' — ' + errores.join(' · ') : ''));

  /* Los externos se abren fuera y con noopener. */
  const ext = [...d.querySelectorAll('a[href^="http"]')];
  is(ext.every(a => a.getAttribute('target') === '_blank' && /noopener/.test(a.getAttribute('rel') || '')),
     `sus ${ext.length} enlace(s) externo(s) abren en pestaña nueva con rel=noopener`);

  is(!/pauta/i.test(d.body.textContent), 'no usa la palabra «pauta» (Karen la vetó)');
}

/* ── La lista y las páginas tienen que estar de acuerdo ── */
console.log('\n── Coherencia con /recursos/ ──');
{
  const lista = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const d = new JSDOM(lista).window.document;
  const internas = [...d.querySelectorAll('.res')]
    .filter(c => c.getAttribute('href').startsWith('/recursos/'));
  console.log(`   tarjetas que apuntan a una página interna: ${internas.length} de ${d.querySelectorAll('.res').length}`);
  internas.forEach(c => {
    const slug = c.getAttribute('href').replace(/^\/recursos\//, '').replace(/\/$/, '');
    is(slugs.includes(slug), `la tarjeta "${c.dataset.id}" apunta a /recursos/${slug}/ y esa página existe`);
    is(c.getAttribute('href').endsWith('/'), `y su enlace lleva barra final (Vercel no redirige sin ella)`);
    is(!c.getAttribute('target'), `y abre en la misma pestaña, porque no sale del sitio`);
    is(c.dataset.formato === 'Página', `y su formato dice "Página" (dice "${c.dataset.formato}")`);
  });
}

console.log('\n──────────────────────────────────────────────');
console.log(`${passes} pasaron · ${fails} fallaron`);
process.exit(fails ? 1 : 0);
