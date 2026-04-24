# CazadorEbay

Web app full-stack para evaluar listings de marketplace con `Next.js + TypeScript + Prisma + Supabase Postgres`, pensada para desarrollo local y despliegue en Vercel.

## Estado del proyecto

- Monolito modular con dominio separado de infraestructura.
- Prisma configurado para Supabase Postgres.
- Build listo para Vercel.
- Seed coherente con el `schema.prisma` actual.
- Runtime con dos modos de datos:
  - `USE_FIXTURE_DATA=false`: usa Prisma/Supabase.
  - `USE_FIXTURE_DATA=true`: usa fixtures locales como fallback controlado.

## Variables de entorno

Define estas variables en local y en Vercel:

```bash
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
USE_FIXTURE_DATA="false"
EBAY_ENABLED="false"
EBAY_CLIENT_ID=""
EBAY_CLIENT_SECRET=""
EBAY_ENVIRONMENT="sandbox"
EBAY_MARKETPLACE_ID="EBAY_US"
EBAY_BROWSE_SCOPE="https://api.ebay.com/oauth/api_scope"
EBAY_SEARCH_LIMIT="12"
```

### Que hace cada variable

- `DATABASE_URL`: connection string del pooler de Supabase. Es la que debe usar la app en runtime, especialmente en Vercel.
- `DIRECT_URL`: conexion directa a la base. Prisma la usa para `migrate dev` y `migrate deploy`.
- `USE_FIXTURE_DATA`: fuerza el uso del repository de fixtures. Util para demo local sin DB. En produccion debe quedar en `false`.
- `EBAY_ENABLED`: activa la ingestión real desde eBay cuando el runtime usa el repository de fixtures.
- `EBAY_CLIENT_ID`: App ID de eBay Developer.
- `EBAY_CLIENT_SECRET`: Cert ID / client secret de eBay Developer.
- `EBAY_ENVIRONMENT`: `sandbox` o `production`.
- `EBAY_MARKETPLACE_ID`: marketplace para Browse API, por ejemplo `EBAY_US`.
- `EBAY_BROWSE_SCOPE`: scope OAuth para Browse API. Por defecto `https://api.ebay.com/oauth/api_scope`.
- `EBAY_SEARCH_LIMIT`: máximo de resultados por perfil en la primera integración.

## Prisma + Supabase

- En Supabase conviene usar el pooler (`6543`) para runtime serverless.
- Prisma necesita ademas `DIRECT_URL` porque las migraciones no deben ir por PgBouncer.
- `postinstall`, `build` y `vercel-build` ejecutan `prisma generate`, lo que evita fallos comunes en Vercel cuando el cliente Prisma no esta generado.
- La app no depende implicitamente de fixtures en produccion. Si `USE_FIXTURE_DATA=false`, el catalogo se carga desde Prisma.
- La integración de eBay usa Browse API `item_summary/search` y OAuth client credentials con credenciales del Developer Program.

## Flujo local exacto

1. Instala dependencias:

```bash
npm install
```

2. Copia variables de entorno:

```bash
Copy-Item .env.example .env
```

3. Genera el cliente Prisma:

```bash
npm run prisma:generate
```

4. Crea la primera migracion si aun no existe historial en `prisma/migrations`:

```bash
npx prisma migrate dev --name init
```

5. Para iteraciones posteriores, aplica migraciones en desarrollo:

```bash
npm run prisma:migrate
```

6. Carga datos de ejemplo:

```bash
npm run prisma:seed
```

7. Ejecuta la suite de dominio:

```bash
npm run test
```

8. Levanta la app:

```bash
npm run dev
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run vercel-build
npm run start
npm run typecheck
npm run test
npm run test:watch
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Despliegue en Vercel

1. Crea el proyecto en Supabase.
2. Copia `DATABASE_URL` del pooler y `DIRECT_URL` de la conexion directa.
3. En Vercel configura:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `USE_FIXTURE_DATA=false`
4. Asegurate de haber commiteado el directorio `prisma/migrations` generado localmente.
5. Ejecuta migraciones contra la base destino:

```bash
npm run prisma:migrate:deploy
```

6. Usa como build command de Vercel:

```bash
npm run vercel-build
```

7. Despliega. El build ya corre `prisma generate && next build`.

## Conectar Supabase

1. En Supabase crea un proyecto y espera a que la base este disponible.
2. En `Project Settings > Database` copia:
   - la URI del pooler para `DATABASE_URL`
   - la URI directa para `DIRECT_URL`
3. Mantén SSL activado en ambas URIs.
4. Usa la misma base tanto para local como para Vercel solo si entiendes el impacto. Para trabajo normal conviene una base de desarrollo y otra de produccion.

## Fuente de datos en runtime

- La UI y el API consumen el resultado final del pipeline.
- El servicio intenta cargar catalogo desde Prisma cuando `USE_FIXTURE_DATA=false`.
- Si quieres una demo sin DB, usa `USE_FIXTURE_DATA=true`.
- Si ademas activas `EBAY_ENABLED=true` con credenciales validas, el repository de fixtures reemplaza los listings locales por listings reales de eBay y cae a fixtures si la llamada falla.
- Los fixtures ya no son una dependencia implicita del runtime productivo; ahora son un modo explicito.

## Ingestión inicial desde eBay

- Provider contract: `lib/server/listing-providers/contracts.ts`
- Adaptor eBay: `lib/server/listing-providers/ebay/index.ts`
- Servicio de ingestión: `lib/server/listing-ingestion-service.ts`

La primera integración mantiene intacto el motor de evaluación:

1. el provider de eBay llama Browse API
2. mapea `itemSummaries` al shape actual de `ListingRaw`
3. el servicio de ingestión deduplica y hace fallback a fixtures
4. el pipeline existente evalúa esos listings sin lógica específica de eBay

### Probar localmente sin credenciales

```bash
USE_FIXTURE_DATA=true
EBAY_ENABLED=false
npm run dev
```

La app usa fixtures de siempre.

### Probar localmente con credenciales de eBay

```bash
USE_FIXTURE_DATA=true
EBAY_ENABLED=true
EBAY_CLIENT_ID=tu_app_id
EBAY_CLIENT_SECRET=tu_cert_id
EBAY_ENVIRONMENT=sandbox
EBAY_MARKETPLACE_ID=EBAY_US
npm run dev
```

Con esa configuración la app intenta traer listings reales desde eBay. Si faltan credenciales o falla la llamada, vuelve automaticamente a fixtures.

## Prisma y el modelo actual

- `ListingRaw`, `ListingNormalized` y `ListingEvaluation` ya estan separados en el schema.
- El seed crea `ListingRaw`, `ListingNormalized`, `MarketSnapshot` y `ListingEvaluation` a partir de fixtures realistas.
- El repository Prisma reconstruye el catalogo de dominio desde la base sin recalcular reglas en la UI.

## Estructura relevante

- `app/`: UI y rutas HTTP.
- `lib/modules/`: dominio y pipeline.
- `lib/server/fixture-repository.ts`: catalogo por fixtures.
- `lib/server/prisma-repository.ts`: catalogo desde Prisma.
- `lib/db/prisma.ts`: singleton PrismaClient.
- `prisma/schema.prisma`: modelo de datos.
- `prisma/seed.ts`: carga datos de ejemplo compatibles con el schema actual.

## Pantallas

- `/` dashboard
- `/profiles` perfiles de busqueda
- `/opportunities` oportunidades por evaluacion
- `/opportunities/[opportunityId]` detalle de la oportunidad
