// lib/net.ts
import { setGlobalDispatcher, Agent } from 'undici';

let installed = false;
export function installUndiciIPv4() {
  if (installed) return;
  setGlobalDispatcher(new Agent({
    // forza IPv4 (evita risoluzioni DNS IPv6 che spesso causano "fetch failed")
    connect: { family: 4 },
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10,
  }));
  installed = true;
}
