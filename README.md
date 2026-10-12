# IAT · Informe técnico de investigación de accidente de trabajo

## Ejecución local

```sh
npm install
npm run dev
```

La aplicación queda en `http://127.0.0.1:5173`. El borrador se guarda automáticamente en SQLite, en `data/iat.sqlite`; también se conserva una copia local del navegador como respaldo. El archivo de la base de pruebas queda fuera de Git.

Para servir una compilación:

```sh
npm run build
npm start
```

La impresión genera una hoja A4 con los datos del informe, tablas y encabezados azules inspirados en la plantilla Excel. En el diálogo del navegador, selecciona **Guardar como PDF**.

La app usa React, TypeScript y Vite. El servidor local usa SQLite integrado en Node.js 22.13 o posterior.
