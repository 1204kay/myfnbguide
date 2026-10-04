-- 2026-10-04：作者把“首次导入之后只收 48 小时以内的条目”改成默认行为，删掉了 _aihot.initialBackfillOnly 这个配置项。
-- 服务器上的来源配置还带着它；这一句把它从所有来源（含停用的）里去掉。可以重复跑，第二次打印 0。
-- 跑完以后，packages/backend/src/sources/config-keys.ts 里认这个旧键的那一行就可以删掉。
WITH changed AS (
  UPDATE sources SET config = jsonb_set(config, '{_aihot}', (config->'_aihot') - 'initialBackfillOnly'), updated_at = now()
  WHERE config->'_aihot' ? 'initialBackfillOnly'
  RETURNING id
)
SELECT 'removed initialBackfillOnly from ' || count(*) || ' sources' FROM changed;
