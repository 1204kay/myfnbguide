// A shop's old address (/reference/shops/:key). Its page listed its stories, which went on 11-03 (backend/read.ts):
// the address goes to the library. Nothing is read.
import { redirect } from "react-router";

export function loader() {
  throw redirect("/reference", 308);
}

export default function ShopRoute() {
  return null;
}
