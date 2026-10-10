# 合并 02_scan.py 各段的输出。
# 用法：python -I -X utf8 02b_merge.py <work 目录> <段数 n>
import sys, os, json, pickle, collections
work, n = sys.argv[1], int(sys.argv[2])
parts = os.path.join(work, 'parts')
stats, by_va = collections.Counter(), collections.Counter()
plat = collections.defaultdict(lambda: [None, 0, 0, 0])
meta = {}
for k in range(n):
    p = pickle.load(open(os.path.join(parts, 'stats.%d.pkl' % k), 'rb'))  # 缺任何一段都报错，不出半份结果
    stats.update(p['stats']); by_va.update(p['by_va'])
    for name, (v, a, b, c) in p['plat'].items():
        q = plat[name]
        q[0] = v; q[1] += a; q[2] += b; q[3] += c
    meta = {'db': p['db'], 'now': p['now'], 'dedupe': p['dedupe']}
for name in ('anchored', 'ledger-hits'):
    with open(os.path.join(work, name + '.jsonl'), 'w', encoding='utf-8', newline='\n') as out:
        for k in range(n):
            with open(os.path.join(parts, '%s.%d.jsonl' % (name, k)), encoding='utf-8') as f:
                for line in f:
                    out.write(line)
unread = [(name, v) for name, v in plat.items() if v[0] == 'unread']
out = {**meta, 'stats': dict(stats), 'by_verdict_activity': {'%s|%s' % k: v for k, v in by_va.items()},
       'by_verdict': {v: sum(c for (vv, a), c in by_va.items() if vv == v) for v in ('allowed', 'banned', 'unread', 'own')},
       'unread_hosts': {'units': len(unread), 'units_ge200': sum(1 for n_, v in unread if v[1] >= 200),
                        'feeds_on_ge200': sum(v[1] for n_, v in unread if v[1] >= 200),
                        'feeds_on_20_199': sum(v[1] for n_, v in unread if 20 <= v[1] < 200),
                        'feeds_on_lt20': sum(v[1] for n_, v in unread if v[1] < 20)}}
json.dump(out, open(os.path.join(work, 'scan-stats.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open(os.path.join(work, 'platform-counts.tsv'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('platform\tverdict\tfeeds\tfeeds_90d\tfeeds_2y\n')
    for name, (v, a, b, c) in sorted(plat.items(), key=lambda kv: -kv[1][1]):
        if a >= 20 or v != 'unread':
            f.write('%s\t%s\t%d\t%d\t%d\n' % (name, v, a, b, c))
print(json.dumps(out, ensure_ascii=False, indent=1))
