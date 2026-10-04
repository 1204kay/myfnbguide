// The reference library's addresses (modules/reference): its pages and the api paths behind them.
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "reference",
  pages: [
    { path: "reference", file: "web/home.tsx", id: "reference-home" },
    { path: "reference/cases/:id", file: "web/case.tsx", id: "reference-case" },
    { path: "reference/shops/:key", file: "web/shop.tsx", id: "reference-shop" },
    { path: "reference/:slug", file: "web/situation.tsx", id: "reference-situation" },
  ],
  apiPaths: [/^\/api\/reference(?:\/|$)/],
});
