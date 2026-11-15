# EIV — borrador para villafortech.com

Caso de investigación e ingeniería personal de Roberto Villafuerte.

## Revisar el borrador

Desde la raíz de este checkout:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory drafts/eiv
```

Abrir **http://127.0.0.1:4174/preview.html**. Las vistas «En tus proyectos» y «Caso de estudio EIV» permiten revisar la incorporación al catálogo y el artículo. La navegación externa abre el sitio actual; los enlaces técnicos abren el repositorio público. El preview carga el trébol y fuentes locales. El control «EN» abre el micrositio ilustrativo en inglés, conservado como vista separada; la adaptación inglesa al layout nativo queda para una revisión editorial futura. No necesita un archivo abierto desde Finder ni un despliegue.

`eiv-es.mdx` contiene el artículo completo y comandos reproducibles. `preview.html` es la propuesta visual estática, con ejemplo de registro explícitamente ilustrativo. No invoca el verificador Python. El laboratorio real se inicia con `python3 -m eiv.web` desde EIV y usa http://127.0.0.1:8765.

## Encaje con el sitio

Se revisó `villafortech-labs/villafortech-site` en `71294e3c15166bf270151100688a62f339a7a3a9`. El esquema MDX y sus clases se mantienen compatibles con ese checkout. La página pública actual, leída el 15 de noviembre de 2026, incorpora overrides posteriores: Manrope también en titulares, trébol con wordmark y tokens paper/forest/leaf/sage actualizados. El HTML sigue ese diseño en producción; el checkout conserva todavía la versión anterior con serif y firma. Esta diferencia debe reconciliarse antes de una integración nativa. `website-design-reference.json` conserva URL, tokens observados y digests del HTML/CSS y del trébol SVG leído sin modificaciones desde el sitio. Las fuentes mantienen sus licencias SIL OFL incluidas. Los enlaces y resultados se refieren a EIV v0.4.0, con licencia MIT.

Este directorio queda fuera de `src/content/projects`, `src/pages` y `public`. El frontmatter conserva además `evidence: hold`. Los filtros actuales excluyen `hold` de listas y rutas. Estos archivos no crean ninguna URL de producción y la propuesta no reemplaza el proyecto destacado de portada.

## Activación futura

La integración sigue como borrador. Para una futura publicación autorizada se deberá colocar el contenido español en `src/content/projects/es-eiv.mdx`, preparar la versión inglesa en `src/content/projects/eiv.mdx`, revisar ambos textos, decidir la posición en el catálogo, cambiar el estado `evidence` a `public` y ejecutar `npm run verify`. `translationKey: eiv` produce `/es/projects/eiv/`; `slug: eiv` debe usarse en el archivo inglés para `/projects/eiv/`.

No se modifican los archivos de producción ni se despliega villafortech.com como parte de este borrador. Las acciones y permisos de EIV son simulados; no hay agente conversacional completo ni ejecución de herramientas reales. Las pruebas sintéticas no son garantías de seguridad real.
