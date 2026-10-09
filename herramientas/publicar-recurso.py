#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mete una tarjeta nueva en /recursos/, rota la banda «Lo nuevo» y ajusta
las pruebas. No despliega: eso se hace aparte, para poder revisar antes.

    python3 herramientas/publicar-recurso.py <slug> <data-id> <fecha>

El resto (título, resumen, icono) lo saca de la propia página del recurso y
del fichero de pendientes herramientas/pendientes.json.
"""
import io, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def leer(p):  return io.open(p, encoding='utf-8').read()
def escribir(p, s): io.open(p, 'w', encoding='utf-8').write(s)

def main(slug, did, fecha):
    pend = json.loads(leer(os.path.join(RAIZ, 'herramientas', 'pendientes.json')))
    if slug not in pend:
        sys.exit('no hay ficha de %s en pendientes.json' % slug)
    f = pend[slug]

    pagina = os.path.join(RAIZ, 'recursos', slug, 'index.html')
    if not os.path.exists(pagina):
        sys.exit('no existe la pagina %s' % pagina)

    ip = os.path.join(RAIZ, 'recursos', 'index.html')
    s = leer(ip)
    if slug in s:
        sys.exit('la tarjeta de %s ya esta en el indice' % slug)

    # 1 · renumerar descendente para abrir el hueco en `orden`
    orden = int(f['orden'])
    altos = sorted((int(n) for n in re.findall(r'style="order:(\d+)"', s)), reverse=True)
    for n in altos:
        if n >= orden and n < 99:
            a, b = 'style="order:%d"' % n, 'style="order:%d"' % (n + 1)
            assert s.count(a) == 1, ('orden repetido o ausente', n)
            s = s.replace(a, b)

    # 2 · la tarjeta, justo antes de la que ocupaba ese orden
    ancla = '<a class="res hi reveal" style="order:%d"' % (orden + 1)
    if s.count(ancla) != 1:
        ancla = '<a class="res reveal" style="order:%d"' % (orden + 1)
    assert s.count(ancla) == 1, 'no encuentro donde insertar'
    tarjeta = (u'''      <a class="res hi reveal" style="order:%d"
         data-id="%s" data-nivel="%s" data-tiempo="%s" data-formato="Página" data-added="%s"
         href="/recursos/%s/">
        <span class="ic">%s<span class="chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span></span>
        <span class="ct">
          <span class="hd"><span class="stepn"></span><span class="t">%s</span></span>
          <span class="s">%s</span>
          <span class="meta"></span>
          <span class="pre"></span>
          <span class="bot"><span class="open"><span>Ver en la página</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></span>
        </span>
      </a>

''' % (orden, did, f['nivel'], f['tiempo'], fecha, slug, f['icono'], f['titulo'], f['resumen']))
    s = s.replace('      ' + ancla, tarjeta + '      ' + ancla)

    # 3 · la banda «Lo nuevo»
    s = re.sub(r'(<a class="nuevo reveal" id="nuevo" data-for=")[a-z0-9]+(")',
               r'\g<1>%s\g<2>' % did, s, count=1)
    s = re.sub(r'(id="nuevo"[^>]*\n\s+href=")[^"]+(")',
               r'\g<1>/recursos/%s/\g<2>' % slug, s, count=1)
    s = re.sub(r'(<span class="nv-t">)[^<]+(</span>)',
               lambda m: m.group(1) + f['titulo'] + m.group(2), s, count=1)
    escribir(ip, s)

    # 4 · las pruebas: todas las constantes suben de uno
    tp = os.path.join(RAIZ, 'test', 'recursos.test.js')
    t = leer(tp)
    total = int(re.search(r'const TOTAL = (\d+);', t).group(1))
    n = total
    t = t.replace('const TOTAL = %d;' % n, 'const TOTAL = %d;' % (n + 1))
    for viejo, nuevo in [('fuera.length === %d', 'fuera.length === %d'),
                         ('los otros %d siguen presentes', 'los otros %d siguen presentes'),
                         ('/Los otros %d quedan abajo/', '/Los otros %d quedan abajo/')]:
        m = re.search(viejo.replace('%d', r'(\d+)').replace('/', r'/'), t)
        if m:
            k = int(m.group(1))
            t = t.replace(viejo % k, nuevo % (k + 1))
    for k in sorted(set(int(x) for x in re.findall(r'resto\(d\)\.length === (\d+)', t)), reverse=True):
        t = t.replace('resto(d).length === %d' % k, 'resto(d).length === %d' % (k + 1))
        t = t.replace("los otros %d quedan abajo" % k, "los otros %d quedan abajo" % (k + 1))
        t = t.replace("los otros %d abajo" % k, "los otros %d abajo" % (k + 1))
    t = t.replace('(1/%d*100)' % n, '(1/%d*100)' % (n + 1)).replace('(100/%d)' % n, '(100/%d)' % (n + 1))
    escribir(tp, t)

    ords = sorted(int(x) for x in re.findall(r'style="order:(\d+)"', leer(ip)))
    cards = [o for o in ords if o != 99]
    dup = [o for o in set(cards) if cards.count(o) > 1]
    huecos = [k for k in range(cards[-1] + 1) if k not in cards]
    print('tarjeta %s en order:%d · total %d · duplicados %s · huecos %s'
          % (slug, orden, total + 1, dup or 'ninguno', huecos or 'ninguno'))

if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
