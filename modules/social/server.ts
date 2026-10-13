// The social posts' backend: every morning a story of the day is drafted for each platform, and approved posts are
// sent. Off unless SOCIAL_POST_ENABLED is true (the owner turns it on, like COLLECT_ENABLED). A draft waits for a
// person's approval; the reviewing is myfnb/social.ts. No model is called.
import { defineServerModule } from "@aihot/backend/modules";
import { draftToday, sendApproved } from "./backend/posts.ts";

const on = () => process.env.SOCIAL_POST_ENABLED === "true";

export default defineServerModule({
  name: "social",
  schedules: [
    {
      // After the day's stories are written and before the owner's morning.
      name: "social.draft",
      cron: "0 10 * * *",
      when: on,
      run: async () => ({ drafted: await draftToday() }),
    },
    {
      name: "social.send",
      cron: "*/10 * * * *",
      when: on,
      run: async () => ({ sent: await sendApproved() }),
    },
  ],
});
