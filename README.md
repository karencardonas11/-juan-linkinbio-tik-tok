# Juan ADS — Link in bio

Páginas link-in-bio de Juan ADS (SaleADS). Sitio estático, sin build ni dependencias.

- `index.html` — página de Instagram, servida en la raíz
- `tik-tok/index.html` — página de TikTok, servida en `/tik-tok`
- `og.jpg` — imagen para previsualizaciones al compartir el enlace

Las dos páginas son copias independientes: se editan por separado y un cambio en una no afecta a la otra. Lo único que las diferencia hoy son las URLs de los botones y el `og:url`.

## Dominio

| Página | URL |
|---|---|
| Instagram | https://bio.saleads.co/ |
| TikTok | https://bio.saleads.co/tik-tok |

Alojado en Vercel (proyecto `juan-linkinbio`).

## Enlaces de la página

| Bloque | Instagram | TikTok |
|---|---|---|
| Ingresa a SaleADS Ahora (CTA principal) | `app.saleads.co/-HSD` | `app.saleads.co/-HYD` |
| ¿Tienes dudas para activar SaleADS? (Sofía Ventas) | `app.saleads.co/-HRq` | `app.saleads.co/-HYN` |
| La IA que duplica tus ventas (VSL V4) | `app.saleads.co/-HS4` | `app.saleads.co/-HYS` |
| Soporte SaleADS (Sofía Soporte) | `app.saleads.co/soporte` | `app.saleads.co/soporte` |

El link corto de soporte es el mismo en ambas redes, así que el tráfico de soporte no se puede separar por origen.

## Editar

Se edita el HTML directamente. Para previsualizar en local:

```
python3 -m http.server 8080
```

Luego abrir http://127.0.0.1:8080/ y http://127.0.0.1:8080/tik-tok/

Si al recargar sigues viendo la versión anterior, es caché del navegador: recarga forzada con `Cmd + Shift + R`.

## Publicar

```
vercel deploy --prod
```
