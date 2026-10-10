# 校准用的对照集：从账本里取「判过内容、题材对路」的播客（正例）和「判过内容、题材不合」的播客（难的反例）。
# 用法：python -I -X utf8 00_positives.py <仓库根目录> <work 目录>
# 输出：positives.json（账本 id 列表）、positives.tsv（带来历）、hard-negatives.json
import csv, json, os, re, sys, collections
repo, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
rows = []
with open(os.path.join(repo, 'myfnb', 'sources-ledger.tsv'), encoding='utf-8') as f:
    for i, r in enumerate(csv.reader(f, delimiter='\t', quoting=csv.QUOTE_NONE), start=1):
        if i > 1 and len(r) >= 6:
            rows.append((i, r))
by_id = collections.defaultdict(list)
for i, r in rows:
    by_id[r[0]].append((i, r))

# 内容被判为不对路的说法（出现在任何一行就不算正例）
OFF = re.compile(r'不是讲餐饮经营|内容不合|写给食客|写给喝咖啡|泛创业|讲酒店|餐饮很少|不讲餐饮|不谈经营|不是餐饮')
ROUND2 = '2026-10-10·店主来源第二轮'
# 第二轮里「因条款或读不到而不接」但不算题材正例的四行，和原因
R2_SKIP = {'c1010-the-taproom-podcast': '主持人不是店主，早期多是品酒闲聊',
           'c1010-brunch-10-5': '博客平台，不是播客',
           'c1010-ivoox': '整个平台的一行，不是一个节目',
           'c1010-podbbang': '没有订阅地址'}
pos, neg = {}, {}
for pid, lst in by_id.items():
    if pid.startswith('platform-'):
        continue
    is_pod = pid.startswith('pod') or any('播客' in r[3] for i, r in lst)
    off = any(OFF.search(r[5]) for i, r in lst)
    if is_pod and any(r[4] in ('接入', '保留') for i, r in lst) and not off:
        i, r = [x for x in lst if x[1][4] in ('接入', '保留')][0]
        pos[pid] = ('接入或保留', i, r[1], r[2])
    for i, r in lst:
        if r[3].startswith(ROUND2):
            if r[5].startswith('内容不合'):
                neg[pid] = (i, r[1], r[2], r[5][:80])
            elif r[4] in ('不接', '待定') and pid not in R2_SKIP and not pid.startswith('platform-'):
                pos[pid] = ('第二轮：内容对路，因条款或读不到不接', i, r[1], r[2])
json.dump(sorted(pos), open(os.path.join(work, 'positives.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(sorted(neg), open(os.path.join(work, 'hard-negatives.json'), 'w', encoding='utf-8'), ensure_ascii=False)
with open(os.path.join(work, 'positives.tsv'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('ledger_id\tkind\tledger_line\tname\turl\n')
    for pid, (kind, i, name, url) in sorted(pos.items()):
        f.write('%s\t%s\tL%d\t%s\t%s\n' % (pid, kind, i, name, url[:200]))
print('positives', len(pos), collections.Counter(v[0] for v in pos.values()), 'hard negatives', len(neg))
