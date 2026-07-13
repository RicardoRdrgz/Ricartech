# Guía de Configuración — Backend de Tickets (Google Apps Script)

## 1. Crear una nueva hoja de cálculo

1. Ve a [Google Sheets](https://sheets.google.com) e inicia sesión con tu cuenta de Google.
2. Haz clic en **Blank** (En blanco) para crear una hoja nueva.
3. Ponle un nombre descriptivo, por ejemplo: **Tickets Backend**.

## 2. Abrir el editor de Apps Script

1. En la hoja de cálculo recién creada, ve al menú **Extensiones** > **Apps Script**.
2. Se abrirá una nueva pestaña con el editor de código.
3. Verás un archivo llamado `Code.gs` con una función `myFunction()` de ejemplo. **Borra todo el contenido**.

## 3. Pegar el código

1. Abre el archivo `Code.gs` que está en este mismo directorio.
2. Copia **todo** el contenido del archivo.
3. Pégalo en el editor de Apps Script (reemplazando el código de ejemplo).
4. Haz clic en el icono de **Guardar** (disquete) o pulsa `Ctrl + S`.

## 4. Crear la hoja "Tickets" con los encabezados

El script crea automáticamente la hoja y los encabezados la primera vez que se ejecuta, pero puedes verificarlo manualmente:

1. Vuelve a tu hoja de cálculo de Google Sheets.
2. El script creará una hoja llamada **Tickets** automáticamente al recibir el primer ticket.
3. Si prefieres crearla manualmente, haz clic en el botón **+** para añadir una hoja, ponle el nombre `Tickets` y pega estos encabezados en la fila 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ID | Fecha | Estado | Nombre | Teléfono | Email | Dirección | Localidad | CP | Cliente Habitual | Tipo Dispositivo | Marca | Modelo | Serie | SO | Año | Servicios Solicitados | Síntomas | Descripción Avería | Fecha Inicio | Intentos Previos | Urgencia | Modalidad | Disponibilidad | Backup | Observaciones |

## 5. Desplegar como aplicación web

1. En el editor de Apps Script, haz clic en **Implementar** > **Nueva implementación**.
2. En el diálogo que aparece, configura:
   - **Tipo**: selecciona **Aplicación web**.
   - **Descripción**: escribe algo como `API de Tickets v1`.
   - **Ejecutar como**: selecciona **Yo** (tu cuenta de Google).
   - **Quién tiene acceso**: selecciona **Cualquier persona** (para que el formulario web pueda enviar datos sin autenticación).
3. Haz clic en **Implementar**.
4. Se te pedirá que **autorices** el script:
   - Haz clic en **Tu cuenta**.
   - En "Google no ha verificado esta app", haz clic en **Avanzado**.
   - Haz clic en **Ir a Proyecto sin título (no seguro)**.
   - Haz clic en **Permitir**.

## 6. Copiar la URL de despliegue

1. Tras autorizar, se mostrará un diálogo con la **URL de la aplicación web**.
2. Copia esa URL. Tendrá un aspecto similar a:
   ```
   https://script.google.com/macros/s/AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz/exec
   ```
3. **Guarda esta URL**, la necesitarás en el siguiente paso.

## 7. Configurar la URL en tu proyecto frontend

1. Abre el archivo `script.js` de tu proyecto web.
2. Busca la variable `BACKEND_URL` (o créala si no existe).
3. Establece el valor con la URL que copiaste:
   ```javascript
   const BACKEND_URL = "https://script.google.com/macros/s/TU_ID_AQUI/exec";
   ```

## 8. Probar que funciona

### Probar con el navegador (GET)
Abre la URL de despliegue en tu navegador. Deberías ver las instrucciones de uso del API.

### Probar con curl (POST)
```bash
curl -X POST \
  "https://script.google.com/macros/s/TU_ID_AQUI/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TKT-TEST-0001",
    "fecha": "2026-07-04T10:00:00.000Z",
    "estado": "Pendiente",
    "cliente": {
      "nombre": "Juan Pérez",
      "telefono": "600123456",
      "email": "juan@ejemplo.com",
      "direccion": "Calle Mayor 1",
      "localidad": "Madrid",
      "cp": "28001",
      "habitual": "No"
    },
    "dispositivo": {
      "tipo": "Portátil",
      "marca": "Lenovo",
      "modelo": "ThinkPad T14",
      "serie": "SN123456",
      "so": "Windows 11",
      "anio": "2023"
    },
    "averia": {
      "servicios": ["Reparación hardware", "Diagnóstico"],
      "sintomas": ["No enciende", "Pantalla negra"],
      "descripcion": "El portátil no enciende al pulsar el botón de power.",
      "fechaInicio": "2026-07-01",
      "intentos": "0"
    },
    "logistica": {
      "urgencia": "Normal",
      "modalidad": "Presencial",
      "disponibilidad": ["Lunes", "Miércoles"],
      "backup": "Sí"
    },
    "extra": {
      "observaciones": "Cliente solicita presupuesto antes de reparar."
    }
  }'
```

Deberías recibir la respuesta:
```json
{"ok":true,"id":"TKT-TEST-0001"}
```

Y en tu hoja de Google Sheets aparecerá una nueva fila con los datos del ticket.

---

## Notas importantes

- **Cada vez que modifiques el código**, debes crear una **nueva implementación** (o editar la existente) para que los cambios surtan efecto.
- Si cambias el nombre de la hoja en el código, asegúrate de que coincide con el nombre de la pestaña en Google Sheets.
- Los arrays (servicios, síntomas, disponibilidad) se guardan como texto separado por comas.
- La fecha se formatea automáticamente a `YYYY-MM-DD HH:mm`.