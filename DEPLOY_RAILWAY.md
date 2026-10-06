# Despliegue en Railway

El proyecto esta preparado como un servicio Node estatico: Railway sirve `index.html` y sus recursos; los disenos se guardan en IndexedDB en el navegador de cada usuario.

## Ajustes incluidos

- `npm start` inicia `server.mjs` y el servidor escucha en `0.0.0.0` cuando Railway proporciona `PORT`.
- `/health` responde `200` con `{ "status": "ok" }` para comprobar que el servicio esta disponible.
- `package.json` solicita Node.js 20 o superior.
- No requiere base de datos, secretos, volumen persistente ni comando de compilacion.

## Crear el servicio

Este repositorio tiene el remoto GitHub `BreinerBravo/MostacillaEditor` y la rama local `main`.

1. En Railway, crea un proyecto y selecciona **Deploy from GitHub repo**.
2. Conecta `BreinerBravo/MostacillaEditor` y selecciona la rama `main`.
3. Deja el directorio raiz como `/`. Railway detectara Node mediante `package.json` y usara `npm start`.
4. En Settings, establece el healthcheck path en `/health`.
5. En Settings > Networking, genera un dominio publico de Railway.

No se define `railway.json`: la configuracion antigua de Railway esta obsoleta para servicios nuevos y la deteccion automatica ya cubre este servicio. La configuracion del healthcheck se introduce en los ajustes del servicio de Railway.

## Comprobacion posterior

- La URL publica abre la aplicacion.
- `https://<dominio-publico>/health` responde HTTP 200.
- El editor importa sus modulos, hojas CSS, manifiesto e icono.
- Tras abrirla por primera vez, el Service Worker permite cargar los recursos cacheados sin conexion.

Los patrones viven en el almacenamiento del navegador y estan separados por origen. Al abrir el dominio Railway por primera vez, importa alli cualquier archivo JSON exportado desde `localhost` si quieres llevar tus disenos existentes. Un redeploy no borra el IndexedDB de los navegadores; limpiar los datos del sitio si puede hacerlo.

## Limite de esta preparacion

La configuracion local esta lista, pero el servicio aun debe crearse en una cuenta Railway, conectarse a GitHub y recibir un dominio desde el panel. Este proyecto no esta enlazado a un proyecto Railway existente.
