import type { Route } from "./+types/item-original";
import type { SiteItemDetail } from "@aihot/contracts/site";
import { apiGet, loadOr404, pageExpiresAt } from "../lib/api.server";
import { cachedLoader } from "../lib/page-reuse";
import { loadParts, readParts } from "../site-modules";
export const clientLoader = cachedLoader<typeof loader>();
export { default, handle, headers, meta } from "./item";

export { shouldRevalidate } from "../lib/page-reuse";
// The item page's component draws the modules' parts too (itemPart): the original reads them the same way.
const PARTS = await loadParts((m) => m.itemPart);
export async function loader({ params, request }: Route.LoaderArgs) {
  const [item, parts] = await Promise.all([
    loadOr404<SiteItemDetail>(`/api/site/items/${encodeURIComponent(params.id)}/original`, { signal: request.signal }),
    readParts(PARTS, params.id, (path) => apiGet(path, { signal: request.signal })),
  ]);
  return { item, parts, expiresAt: pageExpiresAt(600) };
}
