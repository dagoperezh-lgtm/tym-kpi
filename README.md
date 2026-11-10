# TYM KPI

Panel web mobile-first para que los atletas del Club TYM vean, desde el celular,
los rankings del equipo y su propia ficha personal — sin que nadie tenga que
enviarles un reporte. Es un proyecto **separado** de `club-kpi-platform`: no lo
modifica ni depende de su código, solo lee el mismo Excel Maestro que esa app
genera cada semana (el mismo que ya descargas y guardas en tu computador).

## Cómo encaja con club-kpi-platform

```
club-kpi-platform (Streamlit)          tym-kpi (esta app)
  procesa Strava, genera el                   │
  reporte Word y el Excel         ──────►  /sincronizar (subes el Excel)
  Maestro actualizado — lo              parsea el Excel y sube
  descargas a tu computador              los datos a Supabase
                                                 │
                                                 ▼
                                        Next.js (Vercel) ──► celular del atleta
```

La actualización es **semanal**: después de correr el procesamiento en
club-kpi-platform y descargar el Maestro actualizado, se entra a
`https://tym-kpi.vercel.app/sincronizar` y se sube ese mismo archivo — nada
de terminal ni de scripts, ni de Google Drive de por medio.

## Estructura del repo

- `src/` — la app Next.js (App Router, TypeScript, Tailwind).
- `supabase/migrations/0001_init.sql` — el esquema completo de la base de datos.
- `src/lib/sincronizar.ts`, `src/lib/planilla.ts` — la sincronización con el
  Maestro (parsea el Excel subido, calcula rankings/récords/fichas),
  disparada desde `/sincronizar`.

## Autenticación

No usamos Strava para el login (solo hay 10 atletas conectados a Strava hoy;
el club tiene más de 80). En cambio, el registro es **autoservicio**, sin
que el administrador tenga que crear cuentas ni mandar links uno por uno:

- **Usuario** = el mismo nombre que el atleta usa en Strava (es la misma
  llave — `MatchKey` — que ya usa club-kpi-platform para identificarlo en
  todo el sistema).
- **Contraseña** = propia de esta app. Cada atleta entra a `/activar`,
  escribe su nombre y elige su propia contraseña — no hay token ni link
  individual de por medio.

Se manda **un solo link** (`https://tym-kpi.vercel.app/activar`) al grupo de
WhatsApp del club, una vez, y cada atleta se registra solo.

**Tradeoff asumido a propósito**: como no hay token que verifique identidad,
en teoría alguien podría registrarse con el nombre de otro atleta. Para un
club cerrado donde todos se conocen, el riesgo real es bajo y se prefirió
sobre la alternativa (un link único por atleta, que resultó impráctico de
operar a mano con 80 personas). Si una cuenta ya tiene contraseña, no se
puede volver a registrar con ese mismo nombre — eso sí está bloqueado.

La tabla `activaciones` del esquema SQL quedó sin uso con este cambio (era
para el sistema de tokens individuales que se descartó). No hace daño
dejarla vacía; se puede borrar más adelante con una migración aparte.

Todos los formularios de la app (`/login`, `/activar`, `/sincronizar`, el
botón de salir) son formularios HTML clásicos, sin JavaScript de por medio en
el envío: se descartó una primera versión con `fetch()` porque, en pruebas
reales, algo en el navegador podía "tragarse" la respuesta sin mostrar ni el
resultado ni un error — con un `<form>` normal eso no puede pasar, en el peor
caso la página tarda en recargar pero siempre termina mostrando algo.

## Limitaciones conocidas (datos que el Maestro no guarda)

El Maestro de club-kpi-platform no persiste todo lo que se muestra en el
reporte semanal — solo lo que tiene una hoja histórica dedicada. Por eso,
hoy, la ficha personal **no puede mostrar**:

- **Pulso y potencia**: solo existen en el reporte Word de la semana en que
  se generaron; nunca se escriben en una hoja del Maestro.
- **TPI por disciplina** (Natación/Ciclismo/Trote): el Maestro solo guarda el
  histórico del TPI Global, no el desglose por disciplina.

La interfaz ya está preparada para mostrarlos (la ficha de "Mi Ficha" tiene
el espacio listo) — si en algún momento se agregan esas hojas en
club-kpi-platform, van a aparecer en la web automáticamente, sin tocar nada
acá. Si quieres ese dato en la web, es un cambio chico y aditivo en
club-kpi-platform (agregar 1-2 hojas que persistan esos valores semana a
semana) — avísame cuando quieras que lo hagamos.

---

## Puesta en marcha (paso a paso)

### 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, ve a **SQL Editor** → pega el contenido completo de
   `supabase/migrations/0001_init.sql` → **Run**.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → esto es `SUPABASE_URL`
   - **service_role key** (no la `anon` key) → esto es `SUPABASE_SERVICE_ROLE_KEY`

La `service_role` key da acceso total a la base de datos — nunca la pongas en
código del navegador. En esta app solo se usa del lado del servidor (Next.js
API routes).

### 2. Desplegar en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new) e importa el repo
   `dagoperezh-lgtm/tym-kpi`.
2. Nombre del proyecto: `tym-kpi` (queda en `tym-kpi.vercel.app`, sin tu
   nombre en la URL).
3. En **Environment Variables**, agrega las 4 del `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (cualquier string largo y aleatorio)
   - `SYNC_PASSWORD` (la contraseña para entrar a `/sincronizar`)
4. Deploy.

### 3. Avisarle al equipo

Manda un solo mensaje al grupo de WhatsApp del club con el link
`https://tym-kpi.vercel.app/activar` para que cada atleta cree su propia
cuenta (nombre + contraseña, sin nada más que hacer de tu parte).

### 4. Sincronizar los datos cada semana

Después de correr el procesamiento semanal en club-kpi-platform y descargar
el Excel Maestro actualizado (el mismo archivo de siempre), entra a
`https://tym-kpi.vercel.app/sincronizar`, pon la `SYNC_PASSWORD`, elige ese
archivo `.xlsx` y haz clic en **"Sincronizar ahora"**. La página confirma
cuántos atletas y récords se subieron, o muestra el error si algo falló.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```
