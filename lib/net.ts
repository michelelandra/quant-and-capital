// lib/net.ts
import { setGlobalDispatcher, Agent } from 'undici';

let installed = false;
export function installUndiciIPv4() {
  if (installed) return;
  setGlobalDispatcher(
    new Agent({
      connect: { family: 4 },      // <-- forza IPv4
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    })
  );
  installed = true;
}
