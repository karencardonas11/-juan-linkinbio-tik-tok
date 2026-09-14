/* ══════════════════════════════════════════════════════════════════
   JAVASCRIPT COMPARTIDO DE LAS PAGINAS DE RECURSO
   Copiar al portapapeles + telemetria. Lo usan todas las paginas de
   /recursos/<slug>/. El id del recurso NO va aqui: sale de
   <body data-recurso="...">, asi este archivo no se toca nunca.
   ══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function track(name, params){
    params = params || {};
    try {
      if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        var d = { event: name }; for (var k in params) d[k] = params[k];
        window.dataLayer.push(d);
      }
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
      if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params);
    } catch(e){}
  }

  var RECURSO = document.body.dataset.recurso || 'sin-nombre';
  track('recurso_view', { recurso: RECURSO });

  /* Copiar. navigator.clipboard no existe en http ni en navegadores viejos,
     asi que hay respaldo con textarea + execCommand. Sin el respaldo, en el
     navegador de Instagram el boton no hace nada y no se nota. */
  function copiar(texto){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise(function(res, rej){
      try {
        var ta = document.createElement('textarea');
        ta.value = texto;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? res() : rej();
      } catch(e){ rej(e); }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-copia]'), function(btn){
    var id = btn.dataset.copia;
    var lbl = btn.querySelector('span');
    var base = lbl.textContent;
    var t;
    btn.addEventListener('click', function(){
      var src = document.getElementById(id);
      if (!src) return;
      copiar(src.textContent).then(function(){
        btn.dataset.ok = '1'; lbl.textContent = 'Copiado';
        track('prompt_copiado', { recurso: RECURSO, bloque: id });
      }).catch(function(){
        lbl.textContent = 'Selecciónalo y cópialo';
        try {
          var r = document.createRange(); r.selectNodeContents(src);
          var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        } catch(e){}
        track('prompt_copiado_fallo', { recurso: RECURSO, bloque: id });
      }).then(function(){
        clearTimeout(t);
        t = setTimeout(function(){ lbl.textContent = base; btn.removeAttribute('data-ok'); }, 2600);
      });
    });
  });

  var cta = document.getElementById('cta');
  if (cta) cta.addEventListener('click', function(){
    track('cta_sofia', { recurso: RECURSO });
  });

  /* Cuanto de la pagina se leyo de verdad. Sin esto sabes que entraron, no que
     llegaron al prompt ni a los errores. */
  var hitos = [25, 50, 75, 100], vistos = {};
  window.addEventListener('scroll', function(){
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto <= 0) return;
    var pct = Math.round(window.scrollY / alto * 100);
    hitos.forEach(function(h){
      if (pct >= h && !vistos[h]) { vistos[h] = 1; track('scroll_recurso', { recurso: RECURSO, pct: h }); }
    });
  }, { passive: true });
})();
