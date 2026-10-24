// Which sources are one publisher, for counting how many tell a trend (backend/compose.ts): two columns of the same
// media are one voice. Columns named "红餐网 · 资讯" and "红餐网 · 专栏" share the name before " · "; editions whose
// names differ are listed here by source id (found in the 10-24 trend measurement, 手册
// 业务线/myfnbguide/记录/2026-10-24/趋势测量-结果.md).
const SAME: Record<string, string> = {
  "web-qsrmedia-asia": "QSR Media",
};

/** The publisher: a source named above, else the part of the name before its first " · " or "（". */
export function publisherOf(sourceId: string, sourceName: string): string {
  if (SAME[sourceId]) return SAME[sourceId]!;
  return sourceName.split(/ · |（|\(/)[0]!.trim() || sourceId;
}
