// Numbers as the reference pages write them, on the server (examples) and in the browser alike.

/** "18,000", "10.5", "−3,810": thousands separated, at most one decimal place. */
export function num(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const [int, dec] = Math.abs(rounded).toFixed(1).split(".") as [string, string];
  const body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec === "0" ? "" : `.${dec}`);
  return rounded < 0 ? `−${body}` : body;
}
