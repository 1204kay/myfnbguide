// 金额旁边补美元（Kay 11-06）：写明币种的金额补「（约 US$…）」，两位有效数字；单写「元」看同一段说的是哪里；
// 已经有美元的不再补。汇率用 11-05 那一天官方文件里的数。
import assert from "node:assert/strict";
import { test } from "node:test";
import { addUsd, addUsdToJson, addUsdToText, usdText } from "../backend/convert.ts";
import { parseRates } from "../backend/rates.ts";

const R = { JPY: 157.9, MYR: 4.048, CNY: 6.669, TWD: 33.04, HKD: 7.844, SGD: 1.276, VND: 25643, EUR: 0.888, GBP: 0.7413 };

test("the amounts on the 开店 reference page get their US$ beside them", () => {
  assert.equal(
    addUsd("全行业开业费用平均975万日元、中位数600万日元，四成以上不到500万日元〔99〕。", R),
    "全行业开业费用平均975万日元（约 US$6.2万）、中位数600万日元（约 US$3.8万），四成以上不到500万日元（约 US$3.2万）〔99〕。",
  );
  assert.equal(addUsd("开业资金多在 400 万至 1,900 万日元", R), "开业资金多在 400 万至 1,900 万日元（约 US$2.5万至12万）");
  assert.equal(addUsd("周转金3到6万日元", R), "周转金3到6万日元（约 US$190至380）", "「3到6万」是 3 万到 6 万");
});

test("currencies written before or after the number", () => {
  assert.equal(addUsd("月租3,000令吉，押金RM 5k", R), "月租3,000令吉（约 US$740），押金RM 5k（约 US$1,200）");
  assert.equal(addUsd("人民币500万元；50万元人民币", R), "人民币500万元（约 US$75万）；50万元人民币（约 US$7.5万）");
  assert.equal(addUsd("€1.30、£16.50、80万港元、30万新台币", R), "€1.30（约 US$1.5）、£16.50（约 US$22）、80万港元（约 US$10万）、30万新台币（约 US$9,100）");
});

test("dollars, amounts already given in dollars, and amounts too small to matter are left alone", () => {
  for (const s of ["售价7.35 美元", "975万日元（约 US$6.2万）", "约合6.2万美元（975万日元）", "约0.5日元", "100元店很多", "$5 和 ¥500"]) {
    assert.equal(addUsd(s, R), s);
  }
  const once = addUsd("975万日元", R);
  assert.equal(addUsd(once, R), once, "adding twice changes nothing");
});

test("a bare 元 is the money of the one place the passage names, 人民币 when it names none", () => {
  assert.equal(addUsd("营收178.9亿元", R), "营收178.9亿元（约 US$27亿）");
  assert.equal(addUsd("台湾一碗面120元", R), "台湾一碗面120元（约 US$3.6）");
  assert.equal(addUsd("新加坡的店一份5元", R), "新加坡的店一份5元（约 US$3.9）");
  // 没提地方却写着日元的、提了两个地方的、提了不用「元」的国家的：分不清，不加。
  for (const s of ["首日营业额31750日元（约 US$200），年费88元", "台湾和香港都卖20元", "美国门店一杯5元"]) assert.equal(addUsd(s, R), s);
  assert.deepEqual(
    addUsdToJson({ items: [{ summary: "一碗面120元", source: { name: "某媒体（台湾 · 媒体）" } }, { summary: "营收8.05万元", source: { name: "36氪" } }] }, R),
    { items: [{ summary: "一碗面120元（约 US$3.6）", source: { name: "某媒体（台湾 · 媒体）" } }, { summary: "营收8.05万元（约 US$1.2万）", source: { name: "36氪" } }] },
    "an item's source says where it is",
  );
  assert.equal(
    addUsdToText("<item><title>台湾 面</title><description>120元</description></item><item><description>营收8万元</description></item>", R),
    "<item><title>台湾 面</title><description>120元（约 US$3.6）</description></item><item><description>营收8万元（约 US$1.2万）</description></item>",
  );
});

test("two significant figures, in 万 and 亿 from ten thousand", () => {
  assert.deepEqual([61747, 9080, 740.6, 4.43, 0.754, 12_345_678, 2.7e9].map(usdText), ["6.2万", "9,100", "740", "4.4", "0.75", "1200万", "27亿"]);
});

test("the rates file is read as the official format gives it, and nothing else is kept", () => {
  assert.deepEqual(parseRates({ date: "2026-11-05", usd: { jpy: 157.9, myr: 4.048, btc: 0.00001, twd: -1 } }), { date: "2026-11-05", perUsd: { JPY: 157.9, MYR: 4.048 } });
  assert.equal(parseRates({ date: "latest", usd: { jpy: 1 } }), null);
  assert.equal(parseRates({ date: "2026-11-05", usd: {} }), null);
});
