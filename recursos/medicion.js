/* ══════════════════════════════════════════════════════════════════════════
   MEDICIÓN · atribución y movimientos
   Lo cargan la lista (/recursos/) y las 29 páginas de recurso.

   POR QUÉ EXISTE. Las páginas ya llamaban a track(), que empujaba a
   window.dataLayer, a gtag y a fbq — y ninguno de los tres está instalado en
   este sitio. O sea: todo lo que medíamos se perdía. Clarity sí está puesto,
   pero no le llegaba ni un evento.

   CÓMO FUNCIONA. No toca el track() de cada página. Define window.dataLayer,
   vacía lo que ya se hubiera encolado y envuelve su push para reenviar cada
   evento a Clarity. Así los track() que ya existen empiezan a llegar sin
   cambiarles una línea, y el día que se instale GTM todo fluye solo.

   LO QUE NO PUEDE HACER. El botón de Sofía va a un acortador que mete su
   propio código en el texto de WhatsApp. Se comprobó que deja pasar
   parámetros, pero los cuelga de la URL y no del mensaje, así que NO llegan a
   SofíA. Saber qué recurso trajo cada lead dentro del chat sigue necesitando
   un código por recurso. De este lado queda todo registrado.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var CLAVE = 'jads_atrib_v1';
  var DIAS = 30;

  /* ── almacenamiento que no revienta en incógnito ── */
  function leer(k){ try { return window.localStorage.getItem(k); } catch(e){ return null; } }
  function escribir(k,v){ try { window.localStorage.setItem(k,v); } catch(e){} }

  function aClarity(){
    try { if (typeof window.clarity === 'function') window.clarity.apply(null, arguments); } catch(e){}
  }
  function etiqueta(k,v){
    if (v === undefined || v === null || v === '') return;
    aClarity('set', k, String(v).slice(0, 120));
  }

  /* ═══ 1. ATRIBUCIÓN ═══════════════════════════════════════════════════
     Se guarda el PRIMER contacto y se refresca el ÚLTIMO. El primero dice
     quién trajo a la persona; el último, desde dónde volvió hoy. Sin esto,
     alguien que entra por /recursos/?utm_source=instagram y luego abre un
     recurso pierde el origen: en la página del recurso la URL ya viene
     limpia.                                                              */

  var CAMPOS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var CLICS  = ['fbclid','gclid','ttclid','msclkid'];

  function deLaUrl(){
    var q = {};
    try {
      var p = new URLSearchParams(window.location.search);
      CAMPOS.concat(CLICS).forEach(function(k){
        var v = p.get(k); if (v) q[k] = v.slice(0, 120);
      });
      /* Parámetros cortos que usamos a mano en los enlaces de la bio. */
      ['de','r','s'].forEach(function(k){
        var v = p.get(k); if (v) q['p_' + k] = v.slice(0, 60);
      });
    } catch(e){}
    return q;
  }

  function refHost(){
    try {
      if (!document.referrer) return '(directo)';
      var h = new URL(document.referrer).hostname.replace(/^www\./, '');
      return h === window.location.hostname ? '(interno)' : h;
    } catch(e){ return '(directo)'; }
  }

  var atrib = null;
  try { atrib = JSON.parse(leer(CLAVE) || 'null'); } catch(e){ atrib = null; }

  var vence = DIAS * 864e5;
  var ahoraMs = new Date().getTime();
  if (atrib && atrib.t && (ahoraMs - atrib.t) > vence) atrib = null;   /* caducó */

  var nuevos = deLaUrl();
  var hayNuevos = Object.keys(nuevos).length > 0;

  if (!atrib) {
    atrib = {
      t: ahoraMs,
      primero: hayNuevos ? nuevos : {},
      primerRef: refHost(),
      primeraPag: window.location.pathname
    };
  }
  /* El último contacto se sobreescribe solo si la visita trae parámetros
     nuevos; si no, se conserva el de antes y no se pierde la pista. */
  if (hayNuevos || !atrib.ultimo) {
    atrib.ultimo = hayNuevos ? nuevos : atrib.primero;
    atrib.ultimoRef = refHost();
  }
  escribir(CLAVE, JSON.stringify(atrib));

  /* ── se lo contamos a Clarity como etiquetas filtrables ── */
  var P = atrib.primero || {}, U = atrib.ultimo || {};
  etiqueta('origen',          P.utm_source || atrib.primerRef);
  etiqueta('medio',           P.utm_medium);
  etiqueta('campana',         P.utm_campaign);
  etiqueta('contenido',       P.utm_content);
  etiqueta('origen_ultimo',   U.utm_source || atrib.ultimoRef);
  etiqueta('referente',       atrib.primerRef);
  etiqueta('pagina_entrada',  atrib.primeraPag);
  etiqueta('id_de_clic',      P.fbclid ? 'facebook' : (P.gclid ? 'google' : (P.ttclid ? 'tiktok' : '')));

  var RECURSO = (document.body && document.body.dataset && document.body.dataset.recurso) || 'lista';
  etiqueta('recurso', RECURSO);

  /* ═══ 2. PUENTE HACIA CLARITY ═════════════════════════════════════════
     Los track() de las páginas empujan a dataLayer. Acá se define, se vacía
     lo que ya estuviera encolado y se envuelve el push. Cero cambios en las
     páginas.                                                             */

  window.dataLayer = window.dataLayer || [];

  function reenviar(d){
    if (!d || !d.event) return;
    try {
      /* Los datos del evento van como etiquetas y después se dispara, para
         que en Clarity el evento quede filtrable por sus propios campos. */
      Object.keys(d).forEach(function(k){
        if (k !== 'event') etiqueta('ev_' + k, d[k]);
      });
      etiqueta('recurso', RECURSO);
      aClarity('event', d.event);
    } catch(e){}
  }

  try {
    window.dataLayer.forEach(reenviar);                 /* lo ya encolado */
    var pushOriginal = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function(){
      for (var i = 0; i < arguments.length; i++) reenviar(arguments[i]);
      return pushOriginal.apply(null, arguments);
    };
  } catch(e){}

  /* Función propia, para lo que medimos desde acá. */
  function evento(nombre, datos){
    var d = { event: nombre };
    if (datos) for (var k in datos) d[k] = datos[k];
    try { window.dataLayer.push(d); } catch(e){ reenviar(d); }
  }

  /* ═══ 3. MOVIMIENTOS ══════════════════════════════════════════════════ */

  evento('pagina_vista', {
    recurso: RECURSO,
    origen: P.utm_source || atrib.primerRef,
    ruta: window.location.pathname
  });

  /* Profundidad de lectura. Dice si llegaron al prompt o se cayeron antes. */
  var hitos = [25, 50, 75, 90], vistos = {}, maxPct = 0;
  function medirScroll(){
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto <= 0) return;
    var pct = Math.round(window.scrollY / alto * 100);
    if (pct > maxPct) maxPct = pct;
    for (var i = 0; i < hitos.length; i++) {
      var h = hitos[i];
      if (pct >= h && !vistos[h]) { vistos[h] = 1; evento('lectura', { recurso: RECURSO, pct: h }); }
    }
  }
  window.addEventListener('scroll', medirScroll, { passive: true });

  /* Clic en cualquier enlace: se distingue si sale del sitio o no. */
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') return;

    var externo = /^https?:/i.test(href) && href.indexOf(window.location.hostname) === -1;
    if (externo) {
      var destino = '';
      try { destino = new URL(href).hostname.replace(/^www\./, ''); } catch(e){}
      evento('salida', {
        recurso: RECURSO,
        destino: destino,
        tipo: a.id === 'cta' ? 'cta_sofia' : (a.className.indexOf('salir') > -1 ? 'recurso_externo' : 'otro'),
        leido_pct: maxPct
      });
    } else if (href.indexOf('/recursos/') === 0) {
      evento('navega_interno', { recurso: RECURSO, hacia: href });
    }
  }, true);

  /* Cuánto tiempo estuvo de verdad. pagehide y visibilitychange son los que
     sí disparan en móvil; beforeunload no es de fiar ahí. */
  var t0 = ahoraMs, cerrado = false;
  function cierre(){
    if (cerrado) return; cerrado = true;
    var seg = Math.round((new Date().getTime() - t0) / 1000);
    etiqueta('segundos', seg);
    etiqueta('leido_pct', maxPct);
    evento('salida_pagina', { recurso: RECURSO, segundos: seg, leido_pct: maxPct });
  }
  window.addEventListener('pagehide', cierre);
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') cierre();
  });

  /* Lo dejamos accesible para depurar desde la consola del navegador. */
  window.__medicion = { atrib: atrib, evento: evento, recurso: RECURSO, leido: function(){ return maxPct; } };
})();
