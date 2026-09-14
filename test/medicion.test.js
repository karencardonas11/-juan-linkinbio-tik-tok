/* Pruebas de recursos/medicion.js — atribución y movimientos.
   Correr:  node test/medicion.test.js

   Se prueba con un Clarity de mentira que guarda todo lo que recibe, porque lo
   que importa no es que el código corra: es que a Clarity le LLEGUEN las
   etiquetas y los eventos. Antes de este módulo no le llegaba nada — los
   track() empujaban a dataLayer, gtag y fbq, y ninguno está instalado.       */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'recursos', 'medicion.js'), 'utf8');

let fails = 0, passes = 0;
const is = (cond, m) => { cond ? (passes++, console.log('  ✓ ' + m)) : (fails++, console.log('  ✗ ' + m)); };

/* Monta una página con Clarity falso y corre el módulo. */
function montar({ url, recurso = 'lista', alto = 3000, almacen = true, referrer } = {}) {
  const opciones = { url, pretendToBeVisual: true, runScripts: 'outside-only' };
  if (referrer) opciones.referrer = referrer;   // jsdom rechaza referrer vacío
  const dom = new JSDOM(
    `<body data-recurso="${recurso}"><a id="cta" href="https://app.saleads.co/_0RM">Sofía</a>` +
    `<a class="salir" href="https://github.com/x/y">fuera</a>` +
    `<a href="/recursos/tienda-online/">hermano</a>` +
    `<div style="height:${alto}px"></div></body>`,
    opciones);

  const w = dom.window;
  const recibido = { tags: {}, eventos: [] };
  w.clarity = (accion, a, b) => {
    if (accion === 'set') recibido.tags[a] = b;
    if (accion === 'event') recibido.eventos.push(a);
  };
  if (!almacen) {
    Object.defineProperty(w, 'localStorage', { get() { throw new Error('bloqueado'); } });
  }
  Object.defineProperty(w.document.documentElement, 'scrollHeight', { value: alto, configurable: true });
  Object.defineProperty(w, 'innerHeight', { value: 800, configurable: true });

  w.eval(SRC);
  return { w, d: w.document, recibido };
}

const BASE = 'https://bio.saleads.co/recursos/';

console.log('\n── 1. Atribución de entrada ──');
{
  const { recibido, w } = montar({
    url: BASE + '?utm_source=instagram&utm_medium=bio&utm_campaign=regalos&fbclid=ABC123'
  });
  is(recibido.tags.origen === 'instagram', `origen = instagram (fue "${recibido.tags.origen}")`);
  is(recibido.tags.medio === 'bio', 'medio = bio');
  is(recibido.tags.campana === 'regalos', 'campaña = regalos');
  is(recibido.tags.id_de_clic === 'facebook', 'reconoce el clic de Facebook');
  is(recibido.tags.recurso === 'lista', 'marca la página como "lista"');
  is(recibido.eventos.includes('pagina_vista'), 'dispara pagina_vista');
  is(!!w.__medicion.atrib.primero.utm_source, 'guarda el primer contacto');
}

console.log('\n── 2. La atribución SOBREVIVE al navegar a un recurso ──');
{
  /* Es el caso que importa: la persona entra con UTMs a la lista y abre un
     recurso. En la página del recurso la URL ya viene limpia; sin persistir,
     el origen se perdía justo cuando empieza a leer. */
  const uno = montar({ url: BASE + '?utm_source=tiktok&utm_medium=bio' });
  const guardado = uno.w.localStorage.getItem('jads_atrib_v1');
  is(!!guardado, 'la primera visita deja la atribución guardada');

  const dos = new JSDOM('<body data-recurso="tienda-online"><div style="height:3000px"></div></body>',
    { url: BASE + 'tienda-online/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const w2 = dos.window;
  const rec2 = { tags: {}, eventos: [] };
  w2.clarity = (a, k, v) => { if (a === 'set') rec2.tags[k] = v; if (a === 'event') rec2.eventos.push(k); };
  w2.localStorage.setItem('jads_atrib_v1', guardado);
  w2.eval(SRC);

  is(rec2.tags.origen === 'tiktok', `en el recurso el origen sigue siendo tiktok (fue "${rec2.tags.origen}")`);
  is(rec2.tags.recurso === 'tienda-online', 'y ya sabe en qué recurso está');
}

console.log('\n── 3. El puente: los track() que ya existían ahora llegan ──');
{
  const { w, recibido } = montar({ url: BASE, recurso: 'informe-meta-ads' });
  const antes = recibido.eventos.length;
  /* Esto es exactamente lo que hace el track() de recurso.js. */
  w.dataLayer.push({ event: 'prompt_copiado', recurso: 'informe-meta-ads', bloque: 'prompt' });
  is(recibido.eventos.length === antes + 1, 'el push a dataLayer llega a Clarity como evento');
  is(recibido.eventos.includes('prompt_copiado'), 'con su nombre: prompt_copiado');
  is(recibido.tags.ev_bloque === 'prompt', 'y sus datos quedan como etiqueta filtrable (ev_bloque)');
}

console.log('\n── 4. Eventos ya encolados antes de que cargue el módulo ──');
{
  /* medicion.js va con defer, así que el script de la página puede haber
     empujado antes. Esos no se pueden perder. */
  const dom = new JSDOM('<body data-recurso="lista"></body>', { url: BASE, pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  const rec = { tags: {}, eventos: [] };
  w.clarity = (a, k, v) => { if (a === 'set') rec.tags[k] = v; if (a === 'event') rec.eventos.push(k); };
  w.dataLayer = [{ event: 'recursos_view' }, { event: 'ruta_seleccionada', ruta: 'pauta' }];
  w.eval(SRC);
  is(rec.eventos.includes('recursos_view'), 'recupera recursos_view de la cola');
  is(rec.eventos.includes('ruta_seleccionada'), 'y ruta_seleccionada');
}

console.log('\n── 5. Movimientos: salidas y navegación ──');
{
  const { d, recibido } = montar({ url: BASE, recurso: 'tienda-online' });
  d.getElementById('cta').click();
  is(recibido.eventos.includes('salida'), 'el clic en el CTA dispara salida');
  is(recibido.tags.ev_tipo === 'cta_sofia', 'y lo marca como cta_sofia');
  is(recibido.tags.ev_recurso === 'tienda-online', 'diciendo desde qué recurso salió');

  d.querySelector('.salir').click();
  is(recibido.tags.ev_tipo === 'recurso_externo', 'el clic en un recurso externo se marca aparte');
  is(recibido.tags.ev_destino === 'github.com', 'con su destino');

  d.querySelector('a[href^="/recursos/"]').click();
  is(recibido.eventos.includes('navega_interno'), 'la navegación entre recursos también se registra');
}

console.log('\n── 6. Cierre de página: tiempo y cuánto leyó ──');
{
  const { w, recibido } = montar({ url: BASE, recurso: 'tienda-online' });
  w.dispatchEvent(new w.Event('pagehide'));
  is(recibido.eventos.includes('salida_pagina'), 'al salir dispara salida_pagina');
  is(recibido.tags.segundos !== undefined, 'con los segundos que estuvo');
  is(recibido.tags.leido_pct !== undefined, 'y hasta dónde leyó');

  const antes = recibido.eventos.filter(e => e === 'salida_pagina').length;
  w.dispatchEvent(new w.Event('pagehide'));
  is(recibido.eventos.filter(e => e === 'salida_pagina').length === antes,
     'no lo dispara dos veces si el navegador avisa dos veces');
}

console.log('\n── 7. Incógnito: sin localStorage no se cae ──');
{
  let ok = true, recibido;
  try { ({ recibido } = montar({ url: BASE + '?utm_source=instagram', almacen: false })); }
  catch (e) { ok = false; console.log('     ' + e.message); }
  is(ok, 'el módulo no revienta sin almacenamiento');
  is(ok && recibido.tags.origen === 'instagram', 'y aun así atribuye la visita en curso');
  is(ok && recibido.eventos.includes('pagina_vista'), 'y sigue midiendo');
}

console.log('\n── 8. Sin Clarity cargado tampoco se cae ──');
{
  const dom = new JSDOM('<body data-recurso="lista"></body>', { url: BASE, pretendToBeVisual: true, runScripts: 'outside-only' });
  let ok = true;
  try { dom.window.eval(SRC); } catch (e) { ok = false; }
  is(ok, 'si Clarity no cargó, el módulo sigue sin lanzar errores');
  is(Array.isArray(dom.window.dataLayer), 'y deja dataLayer listo para el día que se instale GTM');
}

console.log('\n── 9. Visita directa, sin parámetros ──');
{
  const { recibido } = montar({ url: BASE });
  is(recibido.tags.origen === '(directo)', `origen = (directo) (fue "${recibido.tags.origen}")`);
  is(recibido.tags.referente === '(directo)', 'y el referente también');
}

console.log('\n── 10. Todas las páginas lo cargan ──');
{
  const dir = path.join(__dirname, '..', 'recursos');
  const slugs = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'index.html')))
    .map(e => e.name);
  const faltan = slugs.filter(s =>
    !/<script[^>]+src="\/recursos\/medicion\.js"/.test(fs.readFileSync(path.join(dir, s, 'index.html'), 'utf8')));
  is(faltan.length === 0, `las ${slugs.length} páginas de recurso cargan medicion.js` +
     (faltan.length ? ' — faltan: ' + faltan.join(', ') : ''));
  is(/<script[^>]+src="\/recursos\/medicion\.js"/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')),
     'y la lista también');
}

console.log('\n──────────────────────────────────────────────');
console.log(`${passes} pasaron · ${fails} fallaron`);
process.exit(fails ? 1 : 0);
