// The archive's addresses (modules/archive): only its status, in numbers.
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "archive",
  apiPaths: [/^\/api\/archive(?:\/|$)/],
});
