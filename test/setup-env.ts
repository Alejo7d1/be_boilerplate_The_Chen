import { config } from 'dotenv';

// Los e2e usan su propia base para no mezclarse con los datos de desarrollo.
// `override` hace que este archivo gane sobre lo que ya esté exportado en el
// shell; el resto de la configuración la lee la app desde process.env.
config({ path: '.env.test', override: true });
