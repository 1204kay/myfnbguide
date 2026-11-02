// A story's old address (/reference/cases/:id). The stories were folded on 10-24 and their code removed on 11-03
// (backend/read.ts): a story's id is its item's, so the address goes to the item's page, as a merged story goes to its
// event (AIHOT routes/story.tsx). Nothing is read; an id that never was a story reaches an item page that answers 404.
import { redirect, type LoaderFunctionArgs } from "react-router";

export function loader({ params }: LoaderFunctionArgs) {
  throw redirect(`/items/${encodeURIComponent(params.id!)}`, 308);
}

export default function CaseRoute() {
  return null;
}
