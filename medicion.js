/* ══════════════════════════════════════════════════════════════════════════
   MEDICIÓN · bios y páginas de SaleADS
   Lo cargan las cuatro bios (/, /tik-tok, /saleads, /saleads/tik-tok), la
   lista /saleads/recursos y sus cinco páginas de recurso.

   NO lo cargan las páginas de recurso de Juan: esas tienen su propio
   /recursos/medicion.js desde antes y ya funciona. No se toca.

   POR QUÉ EXISTE. Las bios son el activo de más tráfico y hasta hoy no
   medían absolutamente nada: no se sabía qué botón se toca, cuántas
   personas llegan y se van sin tocar ninguno, ni de qué red vienen. Las
   páginas de SaleADS tampoco medían.

   CÓMO SE USA. En el <body> de cada página:
       data-marca="juan"|"saleads"     ← de qué proyecto de Clarity es
       data-pagina="bio-ig"            ← nombre corto para filtrar después
   y al final del <body>:
       <script src="/medicion.js" defer></script>

   QUÉ NO HACE. No manda nada a servidores nuestros ni guarda datos
   personales: solo etiqueta la sesión de Clarity y cuenta movimientos. Lo
   único que persiste en el navegador es de dónde vino la persona, para no
   perder el origen cuando navega dentro del sitio.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── El proyecto de Clarity de cada marca ────────────────────────────────
     Hoy las dos marcas comparten el proyecto que ya existía. NO están
     mezcladas: cada visita se etiqueta con marca=juan o marca=saleads y con
     pagina=bio-ig / recurso-<slug>, así que en Clarity se filtra por
     cualquiera de las dos y los números salen por separado.

     LO ÚNICO QUE NO SE PUEDE FILTRAR es el total de sesiones del tablero y
     los mapas de calor generales, que suman las dos marcas. El día que eso
     estorbe, se crea un proyecto aparte en clarity.microsoft.com y se pega
     su ID acá abajo: es la única línea que hay que cambiar y las seis
     páginas de SaleADS se mudan solas.                                     */
  var PROYECTOS = {
    juan: 'ybp8htwt62',
    saleads: 'ybp8htwt62'
  };

  /* Tres páginas de SaleADS no tienen etiqueta <body> en el HTML — son
     documentos mínimos y el navegador la crea sola, así que no se les puede
     colgar un data-. Para esas se deduce de la ruta, que es igual de fiable
     y evita tocar archivos que ya están en producción. */
  function deLaRuta() {
    var r = location.pathname.replace(/\/+$/, '') || '/';
    var esSaleads = r === '/saleads' || r.indexOf('/saleads/') === 0;
    var marca = esSaleads ? 'saleads' : 'juan';
    var pagina;
    if (r === '/' || r === '/saleads') pagina = 'bio-ig';
    else if (/\/tik-tok$/.test(r))     pagina = 'bio-tiktok';
    else if (r === '/saleads/recursos') pagina = 'recursos-lista';
    else if (r.indexOf('/saleads/recursos/') === 0) pagina = 'recurso-' + r.split('/').pop();
    else pagina = r;
    return { marca: marca, pagina: pagina };
  }

  var cuerpo = document.body;
  var deRuta = deLaRuta();
  var MARCA  = (cuerpo && cuerpo.getAttribute('data-marca'))  || deRuta.marca;
  var PAGINA = (cuerpo && cuerpo.getAttribute('data-pagina')) || deRuta.pagina;
  var ID     = PROYECTOS[MARCA] || '';

  /* ── almacenamiento que no revienta en incógnito ── */
  var CLAVE = 'sa_atrib_v1';
  var DIAS = 30;
  function leer(k)    { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ── carga de Clarity, solo si hay ID ── */
  if (ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', ID);
  }

  function aClarity() {
    try { if (typeof window.clarity === 'function') window.clarity.apply(null, arguments); } catch (e) {}
  }
  function etiqueta(k, v) {
    if (v === undefined || v === null || v === '') return;
    aClarity('set', k, String(v).slice(0, 120));
  }
  function evento(nombre) { try { aClarity('event', nombre); } catch (e) {} }

  /* ═══ 1. DE DÓNDE VINO ═══════════════════════════════════════════════════
     Se guarda el PRIMER contacto y se refresca el ÚLTIMO. El primero dice
     quién la trajo; el último, desde dónde volvió hoy. Sin esto, quien entra
     por la bio con UTMs y luego abre un recurso pierde el origen: en la
     página del recurso la URL ya viene limpia.                             */

  var CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICS  = ['fbclid', 'gclid', 'ttclid', 'msclkid'];

  function deLaUrl() {
    var q = {};
    try {
      var p = new URLSearchParams(location.search);
      CAMPOS.concat(CLICS).forEach(function (k) {
        var v = p.get(k); if (v) q[k] = v.slice(0, 120);
      });
    } catch (e) {}
    return q;
  }

  function refHost() {
    try {
      if (!document.referrer) return '(directo)';
      var h = new URL(document.referrer).hostname.replace(/^www\./, '');
      return h === location.hostname ? '(interno)' : h;
    } catch (e) { return '(directo)'; }
  }

  var atrib = null;
  try { atrib = JSON.parse(leer(CLAVE) || 'null'); } catch (e) { atrib = null; }

  var ahora = Date.now();
  if (atrib && atrib.t && (ahora - atrib.t) > DIAS * 864e5) atrib = null;  /* caducó */

  var nuevos = deLaUrl();
  var hayNuevos = Object.keys(nuevos).length > 0;

  if (!atrib) {
    atrib = { t: ahora, primero: hayNuevos ? nuevos : {}, primerRef: refHost(), primeraPag: PAGINA };
  }
  if (hayNuevos || !atrib.ultimo) {
    atrib.ultimo = hayNuevos ? nuevos : atrib.primero;
    atrib.ultimoRef = refHost();
  }
  escribir(CLAVE, JSON.stringify(atrib));

  var P = atrib.primero || {}, U = atrib.ultimo || {};
  etiqueta('marca',          MARCA);
  etiqueta('pagina',         PAGINA);
  etiqueta('origen',         P.utm_source || atrib.primerRef);
  etiqueta('medio',          P.utm_medium);
  etiqueta('campana',        P.utm_campaign);
  etiqueta('cuenta',         P.utm_term);         /* JUAN o SALEADS en los links de Black Friday */
  etiqueta('origen_ultimo',  U.utm_source || atrib.ultimoRef);
  etiqueta('referente',      atrib.primerRef);
  etiqueta('pagina_entrada', atrib.primeraPag);
  etiqueta('id_de_clic',     P.fbclid ? 'facebook' : (P.gclid ? 'google' : (P.ttclid ? 'tiktok' : '')));

  evento('pagina_vista');

  /* ═══ 2. QUÉ TOCÓ ════════════════════════════════════════════════════════
     En una bio la pregunta es cuál de los botones se lleva los toques, y
     cuánta gente se va sin tocar ninguno. Se lee el título visible del
     bloque, que es lo que de verdad identifica al botón.                   */

  var toco = false;

  function tituloDe(a) {
    var t = a.querySelector('.t, .nv-t, .paso-t');
    var txt = (t ? t.textContent : a.textContent) || '';
    return txt.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') return;

    toco = true;
    etiqueta('ultimo_toque', tituloDe(a));

    var externo = /^https?:/i.test(href) && href.indexOf(location.hostname) === -1;
    if (externo) {
      var destino = '';
      try { destino = new URL(href).hostname.replace(/^www\./, ''); } catch (e) {}
      etiqueta('salida_a', destino);
      /* app.saleads.co es el acortador: todo lo que pasa por ahí es un lead
         o una venta en potencia, y conviene poder separarlo del resto. */
      evento(destino === 'app.saleads.co' ? 'clic_acortador' : 'salida_externa');
    } else {
      evento('navega_interno');
    }
  }, true);

  /* ═══ 3. HASTA DÓNDE LEYÓ Y CUÁNTO SE QUEDÓ ══════════════════════════════
     En las bios el scroll dice si llegaron a los botones de abajo. En los
     recursos dice si llegaron al final o se cayeron antes.                 */

  var hitos = [25, 50, 75, 90], vistos = {}, maxPct = 0;
  window.addEventListener('scroll', function () {
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto <= 0) return;
    var pct = Math.round(window.scrollY / alto * 100);
    if (pct > maxPct) maxPct = pct;
    for (var i = 0; i < hitos.length; i++) {
      if (pct >= hitos[i] && !vistos[hitos[i]]) {
        vistos[hitos[i]] = 1;
        evento('lectura_' + hitos[i]);
      }
    }
  }, { passive: true });

  /* pagehide y visibilitychange son los que sí disparan en móvil;
     beforeunload no es de fiar ahí. */
  var t0 = ahora, cerrado = false;
  function cierre() {
    if (cerrado) return; cerrado = true;
    etiqueta('segundos',  Math.round((Date.now() - t0) / 1000));
    etiqueta('leido_pct', maxPct);
    if (!toco) evento('se_fue_sin_tocar');
  }
  window.addEventListener('pagehide', cierre);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') cierre();
  });

  /* Para depurar desde la consola del navegador. */
  window.__medicion = { marca: MARCA, pagina: PAGINA, clarity: ID || '(sin ID)', atrib: atrib };
})();
