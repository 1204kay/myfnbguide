# 校准：查全率（账本里的正例有多少被筛中）、难的反例有多少被筛中、随机抽 200 个候选供逐个判断（查准率）。
# 用法：python -I -X utf8 04_calibrate.py <work 目录> <输出目录> [轮次名]
# 抽样的判断写在 <work>/judgements.tsv（id、判断 Y/N/?、说明），本脚本把它并进 sample-200.csv 并算查准率。
# 抽样用固定的种子，候选表不变则抽到的 200 个不变。
import sys, os, json, csv, random, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pilib
# 关键词表默认用同目录的 keywords.py；量旧一轮的数字时用环境变量 KW_FILE 指到 rounds/ 里的旧版
import importlib.util
_kw = os.environ.get('KW_FILE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'keywords.py')
_spec = importlib.util.spec_from_file_location('keywords', _kw)
keywords = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(keywords)

def classify(r):
    """返回（signal，rule，where）。where：命中在标题（title）、简介前 300 个字符（head）还是更后面（tail）。"""
    res = keywords.classify(pilib.norm_text(r['title']), pilib.norm_text(r['desc']), r['lang'])
    return (res[0], res[1], res[2] if len(res) > 2 else '')

work, out_dir = sys.argv[1], sys.argv[2]
rnd = sys.argv[3] if len(sys.argv) > 3 else ''
pos = set(json.load(open(os.path.join(work, 'positives.json'), encoding='utf-8')))
neg = set(json.load(open(os.path.join(work, 'hard-negatives.json'), encoding='utf-8')))
names = {}
with open(os.path.join(work, 'positives.tsv'), encoding='utf-8') as f:
    for r in csv.DictReader(f, delimiter='\t'):
        names[r['ledger_id']] = r['name']

best = {}  # 账本 id -> 记录（优先按订阅地址对上的）
PRI = {'url': 0, 'title': 1, 'domain': 2, 'link-domain': 3}
with open(os.path.join(work, 'ledger-hits.jsonl'), encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        for lid, how in ((r['in_ledger'], r['ledger_match']), (r.get('title_hit'), 'title')):
            if lid and (lid in pos or lid in neg):
                if lid not in best or PRI[how] < PRI[best[lid][0]]:
                    best[lid] = (how, r)

def sig(r):
    if not r.get('anchored'):
        return '', 'not-anchored', ''
    return classify(r)

res = {'round': rnd}
found = [p for p in pos if p in best]
hit = {p: sig(best[p][1]) for p in found}
caught = [p for p in found if hit[p][0]]
res['positives_total'] = len(pos)
res['positives_found_in_db'] = len(found)
res['found_by'] = dict(collections.Counter(best[p][0] for p in found))
res['caught'] = len(caught)
res['caught_strong'] = sum(1 for p in caught if hit[p][0] == 'strong')
res['recall'] = round(len(caught) / max(1, len(found)), 4)
res['recall_by_lang'] = {}
bl = collections.defaultdict(lambda: [0, 0])
for p in found:
    l = best[p][1]['lang']
    bl[l][1] += 1
    bl[l][0] += 1 if hit[p][0] else 0
res['recall_by_lang'] = {k: '%d/%d' % tuple(v) for k, v in sorted(bl.items(), key=lambda kv: -kv[1][1])}
res['missed'] = [{'ledger_id': p, 'name': names.get(p, ''), 'db_title': best[p][1]['title'], 'lang': best[p][1]['lang'],
                  'matched_by': best[p][0], 'desc': best[p][1]['desc'][:260]} for p in found if not hit[p][0]]
res['not_in_db'] = sorted(p for p in pos if p not in best)
nf = [p for p in neg if p in best]
res['hard_negatives_found'] = len(nf)
res['hard_negatives_caught'] = sum(1 for p in nf if sig(best[p][1])[0])
json.dump(res, open(os.path.join(work, 'calibration%s.json' % ('-' + rnd if rnd else '')), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'not_in_db'}, ensure_ascii=False, indent=1))
print('not in db:', len(res['not_in_db']))

# ---------- 抽样 ----------
cand = os.path.join(out_dir, 'podcasts-candidates.csv')
if os.path.exists(cand) and (len(sys.argv) > 4 and sys.argv[4] == 'sample'):
    rows = list(csv.DictReader(open(cand, encoding='utf-8-sig')))
    # 上一次抽到的 200 个只要还都在候选表里就沿用（判断是按 id 记的）；否则重新抽，抽样与候选表的行序无关
    by_id = {r['id']: r for r in rows}
    prev = os.path.join(out_dir, 'sample-200.csv')
    prev_ids = [r['id'] for r in csv.DictReader(open(prev, encoding='utf-8-sig'))] if os.path.exists(prev) else []
    if len(prev_ids) == 200 and all(i in by_id for i in prev_ids):
        sample = [by_id[i] for i in prev_ids]
    else:
        rows.sort(key=lambda r: int(r['id']))
        random.Random(20261010).shuffle(rows)
        sample = rows[:200]
        print('重新抽了 200 个，以前的判断只对还在样本里的行有效')
    full = {}
    with open(os.path.join(work, 'anchored.jsonl'), encoding='utf-8') as f:
        want = {r['id'] for r in sample}
        for line in f:
            r = json.loads(line)
            if str(r['id']) in want:
                full[str(r['id'])] = r
    judg = {}
    # 判断存在 scripts/judgements-*.tsv（按 id 记：id、Y/N/?、说明、标题），work/judgements.tsv 有的话也读
    here = os.path.dirname(os.path.abspath(__file__))
    jfiles = sorted(os.path.join(here, x) for x in os.listdir(here) if x.startswith('judgements-') and x.endswith('.tsv'))
    jfiles.append(os.path.join(work, 'judgements.tsv'))
    for jp in jfiles:
        if not os.path.exists(jp):
            continue
        for line in open(jp, encoding='utf-8'):
            p = line.rstrip('\n').split('\t')
            if len(p) >= 2 and p[0].isdigit():
                judg[p[0]] = (p[1], p[2] if len(p) > 2 else '')
    with open(os.path.join(out_dir, 'sample-200.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['n', 'id', 'title', 'language', 'verdict', 'platform', 'signal', 'rule', 'where', 'episodeCount', 'newestItemPubdate',
                    'judgement', 'note', 'description', 'url'])
        for n, r in enumerate(sample, 1):
            j = judg.get(r['id'], ('', ''))
            w.writerow([n, r['id'], r['title'], r['language'], r['verdict'], r['platform'], r['signal'], r['rule'], r['where'], r['episodeCount'],
                        r['newestItemPubdate'], j[0], j[1], full.get(r['id'], {}).get('desc', r['description'])[:700], r['url']])
    done = [(r, judg[r['id']][0]) for r in sample if r['id'] in judg and judg[r['id']][0] in ('Y', 'N', '?')]
    prec = {}
    if done:
        # 查准率给一个区间：下限把「?」都算不是，上限把「?」都算是
        def rate(sub):
            y = sum(1 for r, j in sub if j == 'Y')
            q = sum(1 for r, j in sub if j == '?')
            n = len(sub)
            return {'n': n, 'Y': y, '?': q, 'N': n - y - q, 'low': round(100 * y / n, 1), 'high': round(100 * (y + q) / n, 1)}
        prec['all'] = rate(done)
        for r, j in done:
            r['signal_where'] = r['signal'] + '/' + r['where']
            r['family'] = r['signal'] + ':' + r['rule'].split(':')[0]
            r['ge5'] = '5 集以上' if int(r['episodeCount'] or 0) >= 5 else '少于 5 集'
        for key in ('signal', 'signal_where', 'language', 'verdict', 'family', 'ge5'):
            g = collections.defaultdict(list)
            for r, j in done:
                g[r[key]].append((r, j))
            prec[key] = {k: rate(v) for k, v in sorted(g.items(), key=lambda kv: -len(kv[1]))}
        json.dump(prec, open(os.path.join(work, 'precision.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(json.dumps(prec, ensure_ascii=False))
    print('sample written', len(sample), 'judged', len(done))
