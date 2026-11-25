# Taro

Bitácora de tarot y cielo para dos. Registra tiradas diarias de 3 a 6 cartas con la baraja Rider-Waite-Smith (Pamela Colman Smith, 1909, dominio público), mira el panorama del mes, cruza cada tirada con los tránsitos planetarios y con tu carta natal.

Dirección visual: **Soft Cosmic — Playful Mysticism**. Fondos crema, gradientes nacarados, personajes astrológicos de gel glossy (sol, luna, estrella, planeta, cometa, nebulosa) y Fraunces + Inter.

## Stack

- **React + Vite + TypeScript**: una sola base de código.
- **Supabase**: base de datos Postgres, cuentas por correo, cambios en vivo y políticas de seguridad (RLS).
- **Capacitor**: empaqueta la misma app para iPhone y Android.
- **astronomy-engine**: posiciones planetarias calculadas en el dispositivo.
- **GitHub Pages**: versión web, se publica sola con cada push a `main`.

Sin Supabase configurado, la app abre en **modo demo** (datos de ejemplo guardados solo en tu navegador).

## Estructura

```
src/
  lib/        tarot.ts (cartas), analysis.ts (consejo del mes), astro.ts (tránsitos y carta natal), repo.ts (datos)
  components/ Character.tsx (personajes SVG), ui.tsx (iconos, cartas, avatares)
  screens/    Hoy, Mes, Historial, Cielo, Ajustes, Nueva tirada, Login
  styles/     tokens.css (sistema de diseño), app.css
supabase/
  migrations/0001_init.sql      tablas + seguridad
  functions/deep-reading/       lectura profunda con Claude (opcional)
public/cards/                   78 cartas Rider-Waite-Smith
```

## Puesta en marcha

### 1. Supabase (una vez)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pega `supabase/migrations/0001_init.sql` y dale **Run**.
3. **Authentication → URL Configuration**: en *Site URL* y *Redirect URLs* agrega `https://valentinovergara.github.io/taro/` (y `http://localhost:5173/` para desarrollo).
4. Opcional, para entrar con código además del enlace: **Authentication → Emails → Magic Link** y añade `{{ .Token }}` a la plantilla.
5. **Project Settings → API**: copia *Project URL* y *anon public key*.

### 2. GitHub Pages

En el repo: **Settings → Secrets and variables → Actions → Variables** crea:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Luego **Actions → Publicar en GitHub Pages → Run workflow** (o haz cualquier push a `main`).

La anon key es pública por diseño: lo que protege los datos son las políticas RLS del SQL. Nunca pongas aquí la `service_role` key.

### 3. Entrar y compartir con Diego

1. Entra con tu correo, crea tu perfil (usuario `valentino`) y **crea un círculo**.
2. En **Ajustes** copia el **código del círculo** y mándaselo a Diego.
3. Diego entra con su correo, crea su perfil (usuario `diego`) y elige **Tengo un código**.
4. Link directo de Diego: `https://valentinovergara.github.io/taro/#/diego`

Cada quien ve las tiradas del otro y solo puede crear o editar las suyas. El *contexto privado* de Ajustes solo lo ve su dueño.

### 4. Lectura profunda con Claude (opcional)

```bash
supabase functions deploy deep-reading
supabase secrets set ANTHROPIC_API_KEY=tu_clave
```

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # llena los valores, o déjalo vacío para modo demo
npm run dev
```

## Camino a la App Store

Necesitas una Mac con Xcode y una cuenta de Apple Developer (99 USD/año).

```bash
npm run build
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios        # abre Xcode: firma, ícono, y Product → Archive
```

Para que el enlace de acceso por correo abra la app en el iPhone, configura un *Universal Link* o un esquema propio (`taro://`) y agrégalo a las Redirect URLs de Supabase. El acceso con código de 6 dígitos funciona sin eso.

Android: `npm install @capacitor/android && npx cap add android && npx cap open android`.

## Diseño

- Tokens en `src/styles/tokens.css`: tema claro y oscuro, identidad lavanda (Valentino `#B58CE7`) y menta (Diego `#69CDA6`), colores por palo.
- Cartas: siempre la ilustración original, `object-fit: contain`, sin recortes ni filtros.
- Movimiento: personajes con *float* y *breathing*, transiciones de 180–250 ms, todo se apaga con `prefers-reduced-motion`.
- Probado en 320, 390, 768 y 1440 px.

Las ilustraciones de las cartas vienen del paquete npm `@cometpisces/tarot-kit-images` (escaneos de la edición de 1909, dominio público).
