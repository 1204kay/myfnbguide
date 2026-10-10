# 把漏斗、平台、校准的数字排成 Markdown 表（podcasts-phase1.md 里的表从这里来）。
# 用法：python -I -X utf8 05_report_tables.py <work 目录> <输出目录>  > work/report-tables.md
import sys, os, json, csv, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pilib
import importlib.util
_spec = importlib.util.spec_from_file_location('keywords', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'keywords.py'))
keywords = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(keywords)
work, out_dir = sys.argv[1], sys.argv[2]
S = json.load(open(os.path.join(work, 'scan-stats.json'), encoding='utf-8'))
F = json.load(open(os.path.join(work, 'funnel.json'), encoding='utf-8'))
C = collections.Counter
rows = list(csv.DictReader(open(os.path.join(out_dir, 'podcasts-candidates.csv'), encoding='utf-8-sig')))
V = ['allowed', 'own', 'unread', 'banned']
VN = {'allowed': '允许的平台', 'own': '自有域名', 'unread': '未读的平台和多节目主机', 'banned': '禁止的平台'}
A = ['90d', '2y', 'older', 'nodate']
AN = {'90d': '近 90 天有更新', '2y': '90 天以前、两年以内', 'older': '两年以前', 'nodate': '没有日期'}
f = lambda n: format(n, ',')

print('## 表 1 整库：去重和平台结论（订阅数）\n')
st = S['stats']
print('| 步骤 | 订阅数 |\n|---|---|')
print('| 整库 | %s |' % f(st['total']))
print('| 去掉 duplicateOf 非空的 | −%s |' % f(st.get('drop_duplicateOf', 0)))
print('| 去掉 dead 的 | −%s |' % f(st.get('drop_dead', 0)))
print('| 同一个 podcastGuid 或 itunesId 只留一个 | −%s（%s 组） |' % (f(st.get('drop_same_guid_or_itunes', 0)), f(S['dedupe']['groups'])))
print('| 留下 | %s |' % f(st['kept']))
print()
bva = S['by_verdict_activity']
print('| 平台结论 | 合计 | ' + ' | '.join(AN[a] for a in A) + ' |\n|---|---|' + '---|' * len(A))
for v in V:
    print('| %s | %s | %s |' % (VN[v], f(sum(bva.get('%s|%s' % (v, a), 0) for a in A)), ' | '.join(f(bva.get('%s|%s' % (v, a), 0)) for a in A)))
print('| 合计 | %s | %s |' % (f(st['kept']), ' | '.join(f(sum(bva.get('%s|%s' % (v, a), 0) for v in V)) for a in A)))
print()

print('## 表 2 题材候选：平台结论 × 信号 × 活跃程度\n')
print('进题材筛的行（标题或简介里有餐饮词根）：%s；筛中：%s。\n' % (f(F['anchored_in']), f(F['candidates'])))
c = C((r['verdict'], r['signal'], r['activity']) for r in rows)
print('| 平台结论 | 信号 | 合计 | ' + ' | '.join(AN[a] for a in A) + ' |\n|---|---|---|' + '---|' * len(A))
for v in V:
    for s in ('strong', 'weak'):
        print('| %s | %s | %s | %s |' % (VN[v], '强' if s == 'strong' else '弱', f(sum(c[(v, s, a)] for a in A)), ' | '.join(f(c[(v, s, a)]) for a in A)))
    print('| %s | 小计 | **%s** | %s |' % (VN[v], f(sum(c[(v, s, a)] for a in A for s in ('strong', 'weak'))),
                                      ' | '.join(f(c[(v, 'strong', a)] + c[(v, 'weak', a)]) for a in A)))
print('| 合计 | | %s | %s |' % (f(len(rows)), ' | '.join(f(sum(c[(v, s, a)] for v in V for s in ('strong', 'weak'))) for a in A)))
print()

print('## 表 3 题材候选：扣掉账本里已有的、同名重复的、少于 5 集的\n')
print('| 平台结论 | 筛中 | 其中账本里已有 | 其中同名重复 | 新候选 | 新候选里 5 集以上 | 其中强信号 | 新候选里少于 5 集 |\n|---|---|---|---|---|---|---|---|')
for v in V:
    sub = [r for r in rows if r['verdict'] == v]
    new = [r for r in sub if not r['in_ledger'] and not r['same_title_as']]
    ge5 = [r for r in new if int(r['episodeCount'] or 0) >= 5]
    print('| %s | %s | %s | %s | %s | **%s** | %s | %s |' % (VN[v], f(len(sub)), f(sum(1 for r in sub if r['in_ledger'])),
          f(sum(1 for r in sub if r['same_title_as'] and not r['in_ledger'])), f(len(new)), f(len(ge5)),
          f(sum(1 for r in ge5 if r['signal'] == 'strong')), f(len(new) - len(ge5))))
print()

print('## 表 4 题材候选：平台结论 × 语言（前 14 种语言）\n')
langs = [l for l, n in C(r['language'] for r in rows).most_common(14)]
cl = C((r['verdict'], r['language']) for r in rows)
print('| 平台结论 | ' + ' | '.join(langs) + ' | 其他 |\n|---|' + '---|' * (len(langs) + 1))
for v in V:
    tot = sum(1 for r in rows if r['verdict'] == v)
    print('| %s | %s | %s |' % (VN[v], ' | '.join(f(cl[(v, l)]) for l in langs), f(tot - sum(cl[(v, l)] for l in langs))))
print('| 合计 | %s | %s |' % (' | '.join(f(sum(cl[(v, l)] for v in V)) for l in langs), f(len(rows) - sum(cl[(v, l)] for v in V for l in langs))))
print()

print('## 表 5 平台名单上的平台：整库订阅数和题材候选数\n')
pc = {}
with open(os.path.join(work, 'platform-counts.tsv'), encoding='utf-8') as fh:
    for r in csv.DictReader(fh, delimiter='\t'):
        pc[r['platform']] = r
cp = collections.defaultdict(C)
for r in rows:
    p = cp[r['platform']]
    p['all'] += 1; p[r['signal']] += 1; p[r['activity']] += 1
    if not r['in_ledger'] and not r['same_title_as'] and int(r['episodeCount'] or 0) >= 5:
        p['new5'] += 1
print('| 平台 | 结论 | 整库订阅数 | 近 90 天有更新 | 题材候选 | 强信号 | 候选里近 90 天有更新 | 新候选且 5 集以上 | 依据（账本行） |\n|---|---|---|---|---|---|---|---|---|')
for name, verdict, doms, gen, led in pilib.PLATFORMS:
    if verdict == 'unread' and not led:
        continue
    x = pc.get(name, {'feeds': '0', 'feeds_90d': '0'})
    p = cp[name]
    print('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (name, {'allowed': '允许', 'banned': '禁止', 'unread': '未读'}[verdict], f(int(x['feeds'])),
          f(int(x['feeds_90d'])), f(p['all']), f(p['strong']), f(p['90d']), f(p['new5']), led))
print()

print('## 表 6 未读的平台和多节目主机：按整库订阅数排前 60\n')
un = sorted([r for r in pc.values() if r['verdict'] == 'unread'], key=lambda r: -int(r['feeds']))
print('| 序号 | 平台或主机 | 整库订阅数 | 近 90 天有更新 | 题材候选 | 强信号 | 新候选且 5 集以上 |\n|---|---|---|---|---|---|---|')
for i, r in enumerate(un[:60], 1):
    p = cp[r['platform']]
    print('| %d | %s | %s | %s | %s | %s | %s |' % (i, r['platform'], f(int(r['feeds'])), f(int(r['feeds_90d'])), f(p['all']), f(p['strong']), f(p['new5'])))
print()

print('## 表 7 未读的平台和多节目主机：按题材候选数排前 30（读条款的先后按这张表）\n')
unc = sorted([(n, p) for n, p in cp.items() if pc.get(n, {}).get('verdict') == 'unread' or (n not in pc and any(r['platform'] == n and r['verdict'] == 'unread' for r in rows[:0]))],
             key=lambda kv: -kv[1]['all'])
unread_names = {r['platform'] for r in rows if r['verdict'] == 'unread'}
unc = sorted([(n, cp[n]) for n in unread_names], key=lambda kv: (-kv[1]['all'], kv[0]))
print('| 序号 | 平台或主机 | 题材候选 | 强信号 | 近 90 天有更新 | 新候选且 5 集以上 | 整库订阅数 |\n|---|---|---|---|---|---|---|')
for i, (n, p) in enumerate(unc[:30], 1):
    print('| %d | %s | %s | %s | %s | %s | %s |' % (i, n, f(p['all']), f(p['strong']), f(p['90d']), f(p['new5']), f(int(pc[n]['feeds'])) if n in pc else '不到 20'))
rest = unc[30:]
print('\n其余 %s 个未读平台或主机上共有题材候选 %s 个（其中只有 1 个候选的主机 %s 个）。\n' % (f(len(rest)), f(sum(p['all'] for n, p in rest)), f(sum(1 for n, p in unc if p['all'] == 1))))

print('## 表 8 校准\n')
for rnd in ('r1', 'r2', 'r3'):
    p = os.path.join(work, 'calibration-%s.json' % rnd)
    if os.path.exists(p):
        j = json.load(open(p, encoding='utf-8'))
        print('- 第 %s 轮：正例 %d 个，整库里找到 %d 个，筛中 %d 个（强信号 %d 个），查全率 %.1f%%；难的反例找到 %d 个，筛中 %d 个。各语言：%s' % (
            rnd[1], j['positives_total'], j['positives_found_in_db'], j['caught'], j['caught_strong'], 100 * j['recall'],
            j['hard_negatives_found'], j['hard_negatives_caught'], '、'.join('%s %s' % kv for kv in j['recall_by_lang'].items())))
pp = os.path.join(work, 'precision.json')
if os.path.exists(pp):
    P = json.load(open(pp, encoding='utf-8'))
    print('\n| 分组 | 抽到 | 是 | 分不出 | 不是 | 查准率下限 | 上限 |\n|---|---|---|---|---|---|---|')
    def line(name, d):
        print('| %s | %d | %d | %d | %d | %.1f%% | %.1f%% |' % (name, d['n'], d['Y'], d['?'], d['N'], d['low'], d['high']))
    line('全部', P['all'])
    for key, label in (('signal', '信号'), ('signal_where', '信号/位置'), ('verdict', '平台结论'), ('language', '语言'), ('family', '规则族'), ('ge5', '集数')):
        for k, d in P[key].items():
            line('%s：%s' % (label, k), d)
# 正例落在哪一档（用来看只取前几档会丢多少）
pos = set(json.load(open(os.path.join(work, 'positives.json'), encoding='utf-8')))
best = {}
PRI = {'url': 0, 'title': 1, 'domain': 2, 'link-domain': 3}
with open(os.path.join(work, 'ledger-hits.jsonl'), encoding='utf-8') as fh:
    for line_ in fh:
        r = json.loads(line_)
        for lid, how in ((r['in_ledger'], r['ledger_match']), (r.get('title_hit'), 'title')):
            if lid and lid in pos and (lid not in best or PRI[how] < PRI[best[lid][0]]):
                best[lid] = (how, r)
tier = C()
for lid, (how, r) in best.items():
    if not r.get('anchored'):
        tier['没有餐饮词根'] += 1
        continue
    res = keywords.classify(pilib.norm_text(r['title']), pilib.norm_text(r['desc']), {'in': 'id'}.get(r['lang'], r['lang']))
    tier[(res[0] + '/' + res[2]) if res[0] else '有词根但没筛中'] += 1
print('\n正例（整库里找到的 %d 个）落在哪一档：%s\n' % (len(best), '、'.join('%s %d' % kv for kv in tier.most_common())))
# 候选在各档的个数
print('候选在各档的个数：%s\n' % '、'.join('%s %s' % (k, f(v)) for k, v in C(r['signal'] + '/' + r['where'] for r in rows).most_common()))

print('## 表 9 其他数字\n')
print('- 没有音频地址的订阅（整库，去重后）：%s；音频地址带统计前缀的：%s。' % (f(st.get('no_enclosure', 0)), f(st.get('has_prefix', 0))))
print('- 题材候选里音频地址带统计前缀的：%s；没有音频地址的：%s；上次读取不是 200 的：%s。' % (
    f(sum(1 for r in rows if r['audio_prefixes'])), f(sum(1 for r in rows if not r['audio_host'])), f(sum(1 for r in rows if r['lastHttpStatus'] != '200'))))
pre = C()
for r in rows:
    if r['verdict'] in ('allowed', 'own'):
        for h in r['audio_prefixes'].split():
            pre[h] += 1
print('- 允许平台和自有域名的候选里，音频要先经过的统计前缀主机：%s。' % ('、'.join('%s %d' % kv for kv in pre.most_common(12)) or '无'))
print('- 账本对上的候选：%s（按订阅地址 %s，按域名 %s，按节目网站域名 %s）。' % (
    f(sum(1 for r in rows if r['in_ledger'])), f(sum(1 for r in rows if r['ledger_match'] == 'url')),
    f(sum(1 for r in rows if r['ledger_match'] == 'domain')), f(sum(1 for r in rows if r['ledger_match'] == 'link-domain'))))
un = S['unread_hosts']
print('- 未读一类共 %s 个平台或主机：订阅数 200 以上的 %s 个（共 %s 个订阅），20–199 的共 %s 个订阅，不到 20 的共 %s 个订阅。' % (
    f(un['units']), f(un['units_ge200']), f(un['feeds_on_ge200']), f(un['feeds_on_20_199']), f(un['feeds_on_lt20'])))
