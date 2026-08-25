# Juan ADS — Link in bio

Páginas link-in-bio de Juan ADS (SaleADS). Sitio estático, sin build ni dependencias.

- `index.html` — página de Instagram, servida en la raíz
- `tik-tok/index.html` — página de TikTok, servida en `/tik-tok`
- `recursos/index.html` — página de recursos de la comunidad, servida en `/recursos`
- `og.jpg` — imagen para previsualizaciones al compartir el enlace (la comparten las tres páginas)
- `test/recursos.test.js` — pruebas de la página de recursos (no se despliega, ver `.vercelignore`)

Las dos páginas de link-in-bio son copias independientes: se editan por separado y un cambio en una no afecta a la otra. Lo único que las diferencia hoy son las URLs de los botones y el `og:url`.

## Dominio

| Página | URL |
|---|---|
| Instagram | https://bio.saleads.co/ |
| TikTok | https://bio.saleads.co/tik-tok |
| Recursos | https://bio.saleads.co/recursos |

Alojado en Vercel (proyecto `juan-linkinbio`). **El repo no está conectado a Vercel: hacer push aquí NO despliega.** Ver "Publicar".

## Enlaces de la página

| Bloque | Instagram | TikTok |
|---|---|---|
| Ingresa a SaleADS Ahora (CTA principal) | `app.saleads.co/-HSD` | `app.saleads.co/-HYD` |
| ¿Tienes dudas para activar SaleADS? (Sofía Ventas) | `app.saleads.co/-HRq` | `app.saleads.co/-HYN` |
| La IA que duplica tus ventas (VSL V4) | `app.saleads.co/-HS4` | `app.saleads.co/-HYS` |
| Soporte SaleADS (Sofía Soporte) | `app.saleads.co/soporte` | `app.saleads.co/soporte` |

El link corto de soporte es el mismo en ambas redes, así que el tráfico de soporte no se puede separar por origen.

## Página de recursos (`/recursos`)

18 recursos en tres grupos, con tres rutas guiadas que reordenan la lista sin ocultar nada. El estado (recursos abiertos y ruta elegida) se guarda en `localStorage` bajo `jads_recursos_v1`. Todo va embebido en un archivo: sin build, sin dependencias, sin peticiones externas.

### Al agregar o quitar un recurso hay que tocar

En `recursos/index.html`:

1. La tarjeta `<a class="res">` con su `data-id`, `data-nivel`, `data-tiempo`, `data-formato` y `data-added`.
2. Renumerar los `style="order:N"` para abrir o cerrar el hueco (el separador `rest-head` en `order:50` no se toca).
3. El total en `<b id="tk-total">`.
4. El texto del selector: "los N siguen ahí, siempre".
5. Si entra en alguna ruta, el array `ids` de `PATHS` en el `<script>` y el conteo del botón correspondiente.

En `test/recursos.test.js`: `TOTAL`, los conteos del "resto" de las tres rutas, el texto "Los otros N quedan abajo" y el ancho de la barra `(1/N*100)`.

### Correr las pruebas

```
npm install jsdom && node test/recursos.test.js
```

Espera `92 pasaron · 0 fallaron`.

`data-added` con una fecha ISO muestra la etiqueta "Nuevo" durante 21 días y luego desaparece sola. Vacío = sin etiqueta.

## Editar

Se edita el HTML directamente. Para previsualizar en local:

```
python3 -m http.server 8080
```

Luego abrir http://127.0.0.1:8080/, http://127.0.0.1:8080/tik-tok/ y http://127.0.0.1:8080/recursos/

⚠️ `http.server` no manda `Cache-Control`, así que tras editar el navegador sigue sirviendo la versión vieja y parece que el cambio no se aplicó. Recarga forzada con `Cmd + Shift + R`.

## Publicar

El deploy es **manual** y la carpeta no queda vinculada a Vercel (`.vercel/` está en `.gitignore`), así que los identificadores van por variables de entorno:

```
VERCEL_ORG_ID=team_m6ukr2qM1T3OheGv9DO603A2 \
VERCEL_PROJECT_ID=prj_o8zlg39FYP2ebeSDBi19dAlGLQZO \
vercel deploy --prod --yes
```

Verificar después:

```
curl -s -o /dev/null -w "%{http_code}\n" https://bio.saleads.co/recursos/
```
