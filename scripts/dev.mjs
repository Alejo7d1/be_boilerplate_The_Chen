#!/usr/bin/env node
// Orquestador del modo desarrollo: `nest build --watch` → reescritura de path
// aliases → `node dist/main.js`.
//
// Reemplaza a `concurrently "nest start --watch" "tsc-alias -w"` por dos
// motivos:
//
// 1. `tsc-alias -w` se fuga memoria en cada recompilación (≈55 MB → 350 MB →
//    700 MB por rebuild) y termina con "JavaScript heap out of memory" a los
//    pocos minutos. Correrlo una vez por compilación no acumula estado.
// 2. El orden importa: los alias tienen que estar reescritos *antes* de
//    arrancar la app, o Node ESM falla con ERR_MODULE_NOT_FOUND. Con dos
//    procesos en paralelo ese orden no está garantizado.
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const NEST_CLI = join('node_modules', '@nestjs', 'cli', 'bin', 'nest.js');
const TSC_ALIAS_BIN = join('node_modules', 'tsc-alias', 'dist', 'bin', 'index.js');
const APP_ENTRY = join('dist', 'main.js');
const COMPILED_MARKER = 'Found 0 errors';

const inspect = process.argv.includes('--inspect');
const log = (message) => console.log(`[dev] ${message}`);

let app = null;
let build = null;
let busy = false;
let queued = false;
let shuttingDown = false;

function stopApp() {
  if (!app) return;
  const child = app;
  app = null;
  child.kill();
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [command, ...args], {
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function compileAndStart() {
  const aliasExit = await run(TSC_ALIAS_BIN, ['-p', 'tsconfig.build.json']);
  if (aliasExit !== 0) {
    log('No se pudieron reescribir los path aliases; la app no se reinicia.');
    return;
  }
  if (shuttingDown) return;

  stopApp();
  app = spawn(
    process.execPath,
    [...(inspect ? ['--inspect'] : []), APP_ENTRY],
    { stdio: 'inherit' },
  );
}

function scheduleCycle() {
  if (busy) {
    queued = true;
    return;
  }
  busy = true;
  void compileAndStart().finally(() => {
    busy = false;
    if (queued) {
      queued = false;
      scheduleCycle();
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopApp();
  build?.kill();
  process.exit(code);
}

log(`nest build --watch${inspect ? ' + --inspect' : ''}, alias y app`);

build = spawn(process.execPath, [NEST_CLI, 'build', '--watch'], {
  stdio: ['inherit', 'pipe', 'inherit'],
});

let buffer = '';
build.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);

  const text = chunk.toString();
  buffer += text;
  // Cada compilación exitosa imprime "Found 0 errors. Watching for file changes."
  let index = buffer.indexOf(COMPILED_MARKER);
  while (index !== -1) {
    buffer = buffer.slice(index + COMPILED_MARKER.length);
    scheduleCycle();
    index = buffer.indexOf(COMPILED_MARKER);
  }
  if (buffer.length > 4096) buffer = buffer.slice(-1024);
});

build.on('exit', (code) => {
  if (shuttingDown) return;
  log(`nest build terminó con código ${code}`);
  shutdown(code ?? 1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}
