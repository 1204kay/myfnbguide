// The site's modules on the web (site/modules/web.ts). Shared engine files read them where they draw them,
// not when they are imported, so a module's code may import any engine file.
import { WEB_MODULES } from "@aihot/site/modules/web";
import type { Part, WebModule } from "./modules";

export function webModules(): readonly WebModule[] {
  return WEB_MODULES;
}

/**
 * In a page's loader: what each of its parts that read from the api (searchPart, itemPart) has for `key`, by
 * module name. `get` is the page's api read (lib/api.server.ts); a part whose read fails gets null, and draws nothing.
 */
export async function readParts(
  parts: ReadonlyArray<{ name: string; part: { path: (key: string) => string } }>,
  key: string,
  get: (path: string) => Promise<unknown>,
): Promise<Record<string, unknown>> {
  return Object.fromEntries(await Promise.all(parts.map(async ({ name, part }) => [name, await get(part.path(key)).catch(() => null)] as const)));
}

/** The parts a page draws, in the site's order: awaited at the top of the page's module, so they load with it. */
export async function loadParts<T>(pick: (m: WebModule) => Part<T> | undefined): Promise<Array<{ name: string; part: T }>> {
  return Promise.all(WEB_MODULES.flatMap((m) => {
    const load = pick(m);
    return load ? [load().then((loaded) => ({ name: m.name, part: loaded.default }))] : [];
  }));
}
