/* Pruebas de regresión de /recursos/ sobre DOM simulado.
   Correr:  npm install jsdom && node test/recursos.test.js            */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FILE = path.join(__dirname, '..', 'recursos', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');
const SCRIPT = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const URL_BASE = 'http://localhost/recursos/';

function stubs(w) {
  w.matchMedia = w.matchMedia || ((q) => ({
    matches: false, media: q,
    addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}
  }));
  w.scrollTo = () => {};
  w.requestAnimationFrame = (cb) => cb(0);
}

let fails = 0, passes = 0;
const is = (cond, m) => { cond ? (passes++, console.log('  ✓ ' + m)) : (fails++, console.log('  ✗ ' + m)); };

function boot(url = URL_BASE) {
  const errors = [];
  const vc = new VirtualConsole()
    .on('jsdomError', e => errors.push(e.message))
    .on('error', e => errors.push(String(e)));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse: stubs, url, virtualConsole: vc
  });
  return { w: dom.window, d: dom.window.document, errors };
}

/* Arranca el script a mano, con el almacenamiento ya poblado (simula 2ª visita). */
function reboot(saved, url = URL_BASE) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', beforeParse: stubs, url });
  const w = dom.window;
  stubs(w);
  if (saved) w.localStorage.setItem('jads_recursos_v1', saved);
  w.eval(SCRIPT);
  return { w, d: w.document };
}

const TOTAL = 27;
const all      = (d) => [...d.querySelectorAll('.res')];
const visibles = (d) => all(d).filter(c => !c.hidden && c.style.display !== 'none');
const ord      = (c) => Number(c.style.order);
const enRuta   = (d) => all(d).filter(c => c.dataset.inPath === '1').sort((a,b) => ord(a) - ord(b));
const resto    = (d) => all(d).filter(c => c.dataset.inPath === '0').sort((a,b) => ord(a) - ord(b));
const ids      = (list) => list.map(c => c.dataset.id);

/* ── invariante que atraviesa toda la suite ── */
function nadaOculto(d, contexto) {
  is(all(d).length === TOTAL, `${contexto}: existen los ${TOTAL} recursos`);
  is(visibles(d).length === TOTAL, `${contexto}: los ${TOTAL} siguen visibles (vi ${visibles(d).length})`);
}

console.log('\n── 1. Arranque limpio ──');
{
  const { d, errors } = boot();
  is(errors.length === 0, 'sin errores de JS' + (errors.length ? ': ' + errors[0] : ''));
  nadaOculto(d, 'arranque');
  is([...d.querySelectorAll('.g-head:not(.rest)')].every(h => !h.hidden), 'los 3 encabezados de grupo visibles');
  is(d.getElementById('rest-head').hidden, 'separador "el resto" oculto sin ruta');
  is(d.body.dataset.mode === 'all', 'modo = all');
  is(d.getElementById('ctx').hidden, 'banda de contexto oculta');
  is(d.getElementById('track').hidden, 'barra de avance oculta (0 abiertos)');
  is(all(d).every(c => c.querySelector('.meta').innerHTML.trim()), 'todas pintaron metadatos');
  is(all(d).every(c => !c.querySelector('.stepn').textContent), 'ninguna muestra número de paso');
  const pre = d.querySelector('[data-prereq="mcp"] .pre');
  is(/Antes conviene/.test(pre.textContent), 'prerequisito aparece como pendiente');
  is(/MCP de Meta/.test(pre.textContent), 'y nombra el recurso correcto');
}

console.log('\n── 2. Ruta "Empiezo de cero" — ordena sin ocultar ──');
{
  const { d, errors } = boot();
  d.querySelector('[data-path="cero"]').click();
  is(errors.length === 0, 'sin errores al seleccionar' + (errors.length ? ': ' + errors[0] : ''));
  nadaOculto(d, 'con ruta activa');
  is(d.body.dataset.mode === 'path', 'modo = path');
  const ruta = enRuta(d);
  is(ruta.length === 5, `5 recursos en la ruta (vi ${ruta.length})`);
  is(ids(ruta).join() === 'dominar,academy,skills5,clonar,mundialistas',
     'orden: ' + ids(ruta).join(' → '));
  is(ruta.map(c => c.querySelector('.stepn').textContent).join() === '1,2,3,4,5', 'numerados 1..5');
  const fuera = resto(d);
  is(fuera.length === 22, `los otros 22 siguen presentes (vi ${fuera.length})`);
  is(fuera.every(c => !c.querySelector('.stepn').textContent), 'los de fuera no llevan número');
  is(Math.max(...ruta.map(ord)) < Math.min(...fuera.map(ord)), 'la ruta va por encima del resto');
  is(!d.getElementById('rest-head').hidden, 'separador "el resto" visible');
  is(ord(d.getElementById('rest-head')) > Math.max(...ruta.map(ord)) &&
     ord(d.getElementById('rest-head')) < Math.min(...fuera.map(ord)),
     'el separador queda justo entre ruta y resto');
  is([...d.querySelectorAll('.g-head:not(.rest)')].every(h => h.hidden), 'encabezados de grupo se repliegan');
  is(d.querySelector('[data-path="cero"]').getAttribute('aria-pressed') === 'true', 'botón marcado');
  is(/Los otros 22 quedan abajo/.test(d.getElementById('ctx-t').textContent), 'el texto avisa que el resto sigue abajo');
}

console.log('\n── 3. Ruta "Reemplazar mi agencia" — arranca por el prerequisito ──');
{
  const { d } = boot();
  d.querySelector('[data-path="agencia"]').click();
  nadaOculto(d, 'ruta agencia');
  const ruta = enRuta(d);
  is(ruta.length === 6, `6 en la ruta (vi ${ruta.length})`);
  is(ruta[0].dataset.id === 'mcp', 'el paso 1 es el MCP de Meta');
  is(ids(ruta).join() === 'mcp,skills22,anuncios3,paidmedia,masterprompt,clonar',
     'orden: ' + ids(ruta).join(' → '));
  is(resto(d).length === 21, 'y los otros 21 quedan abajo');
}

console.log('\n── 4. Ruta "Conectar a mis cuentas" ──');
{
  const { d } = boot();
  d.querySelector('[data-path="conectar"]').click();
  nadaOculto(d, 'ruta conectar');
  const ruta = enRuta(d);
  is(ids(ruta).join() === 'mcp,tutorial,googleads,masterprompt,paidmedia,docsmeta',
     'orden: ' + ids(ruta).join(' → '));
  is(resto(d).length === 21, 'los otros 21 abajo');
}

console.log('\n── 5. Cambiar de ruta y quitar el orden ──');
{
  const { d } = boot();
  d.querySelector('[data-path="cero"]').click();
  d.querySelector('[data-path="conectar"]').click();
  nadaOculto(d, 'tras cambiar de ruta');
  is(enRuta(d).length === 6, 'se recalcula la ruta nueva (6)');
  is(d.querySelector('[data-path="cero"]').getAttribute('aria-pressed') === 'false', 'la anterior se desmarca');

  d.getElementById('ctx-clear').click();
  nadaOculto(d, 'tras quitar el orden');
  is(d.body.dataset.mode === 'all', 'vuelve a modo all');
  is(all(d).every(c => !c.dataset.inPath), 'se limpia la marca de ruta');
  is(d.getElementById('rest-head').hidden, 'separador vuelve a ocultarse');
  is([...d.querySelectorAll('.g-head:not(.rest)')].every(h => !h.hidden), 'encabezados de grupo vuelven');
  const o = all(d).map(ord);
  is(JSON.stringify(o) === JSON.stringify([...o].sort((a,b)=>a-b)), 'orden original restaurado');

  d.querySelector('[data-path="cero"]').click();
  d.querySelector('[data-path="cero"]').click();
  is(d.body.dataset.mode === 'all', 'pulsar dos veces la misma ruta la apaga');
  nadaOculto(d, 'tras el doble clic');
}

console.log('\n── 6. Estado: visitado, avance y prerequisito cumplido ──');
{
  const { w, d } = boot();
  const mcp = d.querySelector('[data-id="mcp"]');
  mcp.click();
  is(mcp.dataset.visited === '1', 'la tarjeta queda marcada');
  is(d.getElementById('tk-done').textContent === '1', 'contador = 1');
  is(!d.getElementById('track').hidden, 'aparece la barra de avance');
  is(d.getElementById('tk-bar').style.width === (1/27*100) + '%', 'barra al ' + (100/27).toFixed(1) + '%');
  const dep = d.querySelector('[data-prereq="mcp"]');
  is(dep.dataset.prereqDone === '1', 'el dependiente marca el prereq como cumplido');
  is(/Listo: ya abriste/.test(dep.querySelector('.pre').textContent), 'texto cambia a "Listo"');
  is(JSON.parse(w.localStorage.getItem('jads_recursos_v1')).visited.includes('mcp'), 'guardado en localStorage');
  nadaOculto(d, 'tras marcar visitado');
}

console.log('\n── 7. Persistencia entre visitas ──');
{
  const { w, d } = boot();
  d.querySelector('[data-id="mcp"]').click();
  d.querySelector('[data-id="skills22"]').click();
  d.querySelector('[data-path="agencia"]').click();
  const saved = w.localStorage.getItem('jads_recursos_v1');

  const { d: d2 } = reboot(saved);
  is(d2.querySelector('[data-id="mcp"]').dataset.visited === '1', 'recuerda lo visitado');
  is(d2.getElementById('tk-done').textContent === '2', 'recuerda el contador (2)');
  is(d2.body.dataset.mode === 'path', 'recuerda la ruta elegida');
  is(enRuta(d2).length === 6, 'restaura la ruta (6 pasos)');
  nadaOculto(d2, 'segunda visita');
}

console.log('\n── 8. Reiniciar ──');
{
  const { d } = boot();
  d.querySelector('[data-id="mcp"]').click();
  d.getElementById('tk-reset').click();
  is(d.getElementById('tk-done').textContent === '0', 'contador a 0');
  is(d.getElementById('track').hidden, 'barra de avance se oculta');
  is(d.querySelector('[data-id="mcp"]').dataset.visited === '0', 'tarjeta desmarcada');
  is(d.querySelector('[data-prereq="mcp"]').dataset.prereqDone === '0', 'prereq vuelve a pendiente');
  nadaOculto(d, 'tras reiniciar');
}

console.log('\n── 9. Ruta por URL (?ruta=conectar) ──');
{
  const { d } = boot(URL_BASE + '?ruta=conectar');
  is(enRuta(d).length === 6, 'la URL preselecciona la ruta');
  is(d.querySelector('[data-path="conectar"]').getAttribute('aria-pressed') === 'true', 'botón marcado');
  nadaOculto(d, 'ruta por URL');
  const { d: d2 } = boot(URL_BASE + '?ruta=inventada');
  is(d2.body.dataset.mode === 'all', 'una ruta inexistente en la URL no rompe nada');
  nadaOculto(d2, 'ruta inválida');
}

console.log('\n── 10. Telemetría ──');
{
  const dom = new JSDOM(html, { runScripts: 'outside-only', beforeParse: stubs, url: URL_BASE });
  const w = dom.window; stubs(w); w.dataLayer = [];
  w.eval(SCRIPT);
  const d = w.document;
  d.querySelector('[data-path="cero"]').click();
  d.querySelector('[data-id="dominar"]').click();
  d.getElementById('cta').click();
  const ev = w.dataLayer.map(e => e.event);
  ['recursos_view','ruta_seleccionada','recurso_click','cta_saleads']
    .forEach(n => is(ev.includes(n), 'evento ' + n));
  const clic = w.dataLayer.find(e => e.event === 'recurso_click');
  is(clic.recurso_id === 'dominar' && clic.ruta_activa === 'cero',
     'el evento lleva id y ruta: ' + JSON.stringify({ id: clic.recurso_id, ruta: clic.ruta_activa }));
  is(!!clic.recurso_formato && !!clic.recurso_nivel, 'y también formato y nivel');
}

console.log('\n── 11. Sin localStorage (incógnito estricto) ──');
{
  const dom = new JSDOM(html, { runScripts: 'outside-only', beforeParse: stubs, url: URL_BASE });
  const w = dom.window; stubs(w);
  Object.defineProperty(w, 'localStorage', {
    get() { throw new Error('SecurityError: almacenamiento bloqueado'); }, configurable: true
  });
  let crash = false;
  try { w.eval(SCRIPT); } catch(e) { crash = true; }
  is(!crash, 'la página no revienta sin localStorage');
  const d = w.document;
  nadaOculto(d, 'sin almacenamiento');
  let clickCrash = false;
  try { d.querySelector('[data-path="cero"]').click(); } catch(e) { clickCrash = true; }
  is(!clickCrash, 'el selector de ruta sigue funcionando');
  is(enRuta(d).length === 5, 'y sigue ordenando');
  nadaOculto(d, 'sin almacenamiento, con ruta');
}

console.log('\n' + '─'.repeat(46));
console.log(`${passes} pasaron · ${fails} fallaron`);
process.exit(fails ? 1 : 0);
