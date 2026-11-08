# TYM KPI

Panel web mobile-first para que los atletas del Club TYM vean, desde el celular,
los rankings del equipo y su propia ficha personal — sin que nadie tenga que
enviarles un reporte. Es un proyecto **separado** de `club-kpi-platform`: no lo
modifica ni depende de su código, solo lee el mismo Excel Maestro que esa app
ya sube a Google Drive cada semana.

## Cómo encaja con club-kpi-platform

```
club-kpi-platform (Streamlit)          tym-kpi (esta app)
  procesa Strava, genera el                   │
  reporte Word, sube el Maestro    ──────►  sync/sync_maestro_a_supabase.py
  actualizado a Google Drive          lee el Maestro (solo lectura)
                                        y sube los datos a Supabase
                                                 │
                                                 ▼
                                        Next.js (Vercel) ──► celular del atleta
```

La actualización es **semanal**: después de correr el procesamiento en
club-kpi-platform, se corre `sync/sync_maestro_a_supabase.py` una vez para que
la web quede al día.

## Estructura del repo

- `src/` — la app Next.js (App Router, TypeScript, Tailwind).
- `supabase/migrations/0001_init.sql` — el esquema completo de la base de datos.
- `sync/` — script Python que lee el Maestro desde Drive y lo sube a Supabase.
- `admin/` — script para crear las cuentas de los atletas y generar sus links
  de activación (para mandar por WhatsApp).

## Autenticación

No usamos Strava para el login (solo hay 10 atletas conectados a Strava hoy;
el club tiene más de 80). En cambio:

- **Usuario** = el mismo nombre que el atleta usa en Strava (es la misma
  llave — `MatchKey` — que ya usa club-kpi-platform para identificarlo en
  todo el sistema).
- **Contraseña** = propia de esta app, que cada atleta define la primera vez
  que entra, a través de un link de activación de un solo uso que tú le
  mandas por WhatsApp.

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
API routes, el script de sync, el script de aprovisionamiento).

### 2. Desplegar en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new) e importa el repo
   `dagoperezh-lgtm/tym-kpi`.
2. Nombre del proyecto: `tym-kpi` (queda en `tym-kpi.vercel.app`, sin tu
   nombre en la URL).
3. En **Environment Variables**, agrega las 3 del `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (genera una con `openssl rand -base64 32`)
4. Deploy.

### 3. Crear las cuentas de los atletas

```bash
cd admin
pip install -r requirements.txt
cp atletas.example.txt atletas.txt
# edita atletas.txt: un nombre por línea, tal como aparece en Strava

export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export BASE_URL=https://tym-kpi.vercel.app

python3 provisionar_atletas.py
```

El script imprime, para cada atleta que todavía no activó su cuenta, un
mensaje listo para copiar y pegar en WhatsApp con su link de activación
personal (de un solo uso). Puedes correrlo de nuevo cuando sumes atletas
nuevos — a los que ya tienen cuenta activa no les vuelve a generar nada.

### 4. Sincronizar los datos cada semana

Después de correr el procesamiento semanal en club-kpi-platform (que sube el
Maestro actualizado a Drive):

```bash
cd sync
pip install -r requirements.txt

export GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'  # el JSON completo
export DRIVE_MAESTRO_FILE_ID=...        # el mismo que usa club-kpi-platform
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...

python3 sync_maestro_a_supabase.py
```

Puedes reusar la misma cuenta de servicio de Google que ya tiene
club-kpi-platform (el JSON de credenciales) — solo necesita permiso de
**lectura** sobre el archivo Maestro en Drive, no de escritura.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```
