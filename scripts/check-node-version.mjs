/**
 * Falla temprano y con un mensaje claro si la versión de Node no soporta las
 * dependencias del proyecto. Sin esto, Node 18 revienta con un
 * "Unexpected token 'with'" al parsear cli-spinners, que no dice nada útil.
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REQUIRED = '^20.19 || ^22.12 || >=24';
const [major, minor] = process.versions.node.split('.').map(Number);

const supported =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 12) ||
  major >= 24;

if (!supported) {
  const localNode = join(homedir(), '.local/share/node22/bin/node');

  console.error('');
  console.error(`❌ Node ${process.versions.node} no es compatible con este proyecto.`);
  console.error(`   Versión requerida: ${REQUIRED}`);
  console.error('');
  console.error('   Opciones:');

  if (existsSync(localNode)) {
    console.error('     source ~/.bashrc && npm start');
    console.error('     export PATH="$HOME/.local/bin:$PATH"');
  }

  console.error('     nvm install 22 && nvm use 22    # si usás nvm');
  console.error('     o instalá Node 22 desde https://nodejs.org');
  console.error('');
  process.exit(1);
}
