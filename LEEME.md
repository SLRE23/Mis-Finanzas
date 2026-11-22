# Mis Finanzas

App personal para manejar **ingresos, gastos, tarjetas de crédito, pagos fijos, clientes, ahorros e inversiones**.
Funciona **sin internet**, se instala en el celular como una app y se **sincroniza sola** entre tus dispositivos.

## Qué puedes hacer

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Resumen del mes, efectivo disponible, próximos pagos, lo que te deben tus clientes, alertas y gráficas. |
| **Registro** | Ingresos, gastos (en efectivo o con tarjeta) y aportes a metas. Buscar y filtrar. |
| **Pagos** | Facturas y servicios, suscripciones, pensión alimenticia: día en que llega la factura, día límite de pago, estado (por llegar, por pagar, vencida, pagada). Las suscripciones domiciliadas se registran solas. |
| **Tarjetas** | Tu tarjeta de crédito: saldo, saldo al corte, cuánto pagar para no generar intereses y antes de qué fecha, uso del límite. También préstamos y otras deudas. |
| **Clientes** | Cuánto te paga cada cliente y cada cuánto, sus facturas, cuánto te deben y cuántas facturas están atrasadas. Crea las facturas del mes con un toque. |
| **Más** | Metas de ahorro e inversión, presupuesto 50/30/20, ajustes, sincronización y respaldo. |

### Cómo funciona la tarjeta de crédito
- Cada gasto que registres “con tarjeta” se suma a lo que le debes.
- Cuando le pagas a la tarjeta, se registra como **pago de tarjeta**: baja la deuda pero **no** cuenta como gasto (las compras ya se contaron).
- “Efectivo disponible” = lo que entró − lo que pagaste en efectivo − pagos a la tarjeta − ahorro.

---

## Activar la sincronización (una sola vez, gratis)

La sincronización usa **Firebase**, un servicio gratuito de Google. Necesitas tu cuenta de Google.

1. Entra a <https://console.firebase.google.com> y toca **Crear un proyecto** (por ejemplo “mis-finanzas”). Puedes desactivar Google Analytics.
2. **Authentication** → *Comenzar* → pestaña **Sign-in method** → activa **Correo electrónico/contraseña**.
3. **Firestore Database** → *Crear base de datos* → elige una ubicación cercana → modo **producción**.
4. En Firestore, pestaña **Reglas**: borra lo que hay, pega el contenido del archivo `firestore.rules` y toca **Publicar**. (Esto hace que solo tú puedas ver tus datos).
5. ⚙️ **Configuración del proyecto** → abajo, en “Tus apps”, toca el ícono **`</>`** (Web), ponle un nombre y regístrala. Firebase te mostrará un bloque `firebaseConfig = { apiKey: ..., ... }`.
6. Copia ese bloque en `firebase-config.js` (reemplazando `null`), o pásaselo a Claude para que lo haga.
7. Publica la app (abajo). Luego en cada dispositivo: **Más → Sincronización** → la primera vez **Crear cuenta**, y en los demás **Entrar** con el mismo correo y contraseña.

Desde ahí, todo lo que registres en un dispositivo aparece en los demás. Sin internet sigue funcionando y los cambios se suben al reconectar.

> Los datos de `firebase-config.js` no son secretos. Lo que protege tu información son las reglas del paso 4.

## Instalarla en el celular

La app debe estar publicada en una dirección **https** (gratis): GitHub Pages, Netlify o Firebase Hosting.

- **Android (Chrome):** abre la dirección → menú ⋮ → **Instalar app**.
- **iPhone (Safari):** abre la dirección → **Compartir** → **Agregar a inicio**.

## Probarla en la computadora

```powershell
powershell -ExecutionPolicy Bypass -File herramientas\servidor.ps1
```

Luego abre <http://localhost:8080>.

## Actualizar la app

Cuando cambies archivos, sube el número en `sw.js` (`misfinanzas-v2` → `misfinanzas-v3`) para que los dispositivos descarguen la versión nueva.

## Archivos

- `index.html`, `styles.css`, `app.js`: la app
- `sync.js`, `firebase-config.js`, `firestore.rules`: sincronización
- `sw.js`: hace que funcione sin internet
- `manifest.webmanifest`, `icons/`: nombre e ícono al instalarla
- `herramientas/`: servidor local de prueba y generador de íconos

**Importante:** el código se publica, tus datos no. Nunca pongas datos personales (clientes, montos) dentro de los archivos de la app.
