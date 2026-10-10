# 第 3 步：对中间文件做题材粗筛（强信号、弱信号），写候选表和漏斗数字。
# 用法：python -I -X utf8 03_topic.py <work 目录> <输出目录>
# 输出：<输出目录>/podcasts-candidates.csv、<work>/funnel.json
import sys, os, json, csv, collections, datetime, re
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

def day(ts):
    if not ts or ts <= 0:
        return ''
    try:
        return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime('%Y-%m-%d')
    except Exception:
        return ''

rows = []
n_in = 0
with open(os.path.join(work, 'anchored.jsonl'), encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        n_in += 1
        r['lang'] = {'in': 'id', 'iw': 'he', 'ji': 'yi'}.get(r['lang'], r['lang'])  # 旧的语言代码
        sig, rule, where = classify(r)
        if sig:
            r['signal'], r['rule'], r['where'] = sig, rule, where
            rows.append(r)

# podcastGuid 和 itunesId 都对不上的重复订阅：只标出来（same_title_as 填留下的那一行的 id），不删。
# 两种：同名同作者；Buzzsprout 的同一个节目编号挂在 feeds. 和 rss. 两个主机名下。
BZ = re.compile(r'//(?:feeds|rss|www)\.buzzsprout\.com/(\d+)')
seen = {}
for r in sorted(rows, key=lambda r: (-(r['newest'] or 0), -(r['episodeCount'] or 0), r['id'])):
    keys = []
    t = pilib.norm_text(r['title'])
    if len(t) >= 4:
        keys.append((t, pilib.norm_text(r.get('author') or '')))
    m = BZ.search(r['url'].lower())
    if m:
        keys.append(('bz', m.group(1)))
    r['same_title_as'] = next((seen[k] for k in keys if k in seen), '')
    for k in keys:
        seen.setdefault(k, r['same_title_as'] or r['id'])

rows.sort(key=lambda r: ({'allowed': 0, 'own': 1, 'unread': 2, 'banned': 3}[r['verdict']], r['signal'] != 'strong', -(r['newest'] or 0)))
os.makedirs(out_dir, exist_ok=True)
head = ['id', 'url', 'title', 'language', 'host', 'audio_host', 'generator', 'platform', 'verdict', 'signal', 'episodeCount',
        'newestItemPubdate', 'oldestItemPubdate', 'link', 'itunesId', 'in_ledger', 'description',
        # 以下是多给的列
        'language_declared', 'activity', 'few_episodes', 'audio_prefixes', 'rule', 'where', 'ledger_match', 'lastHttpStatus', 'same_title_as']
with open(os.path.join(out_dir, 'podcasts-candidates.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(head)
    for r in rows:
        w.writerow([r['id'], r['url'], r['title'], r['lang'], r['host'], r['audio_host'], r['generator'], r['platform'], r['verdict'],
                    r['signal'], r['episodeCount'], day(r['newest']), day(r['oldest']), r['link'], r['itunesId'], r['in_ledger'],
                    r['desc'][:300], r['language'], r['activity'], 1 if r['episodeCount'] < 5 else 0, ' '.join(r['prefixes']),
                    r['rule'], r['where'], r['ledger_match'], r['http'], r['same_title_as']])

# ---------- 漏斗 ----------
C = collections.Counter
fun = {'anchored_in': n_in, 'candidates': len(rows)}
fun['by_verdict_signal'] = {'%s|%s' % k: v for k, v in C((r['verdict'], r['signal']) for r in rows).items()}
fun['by_verdict_activity'] = {'%s|%s' % k: v for k, v in C((r['verdict'], r['activity']) for r in rows).items()}
fun['by_verdict_signal_activity'] = {'%s|%s|%s' % k: v for k, v in C((r['verdict'], r['signal'], r['activity']) for r in rows).items()}
fun['by_verdict_lang'] = {'%s|%s' % k: v for k, v in C((r['verdict'], r['lang']) for r in rows).items()}
fun['by_lang'] = dict(C(r['lang'] for r in rows))
fun['by_lang_signal'] = {'%s|%s' % k: v for k, v in C((r['lang'], r['signal']) for r in rows).items()}
fun['few_episodes_by_verdict'] = dict(C(r['verdict'] for r in rows if r['episodeCount'] < 5))
fun['in_ledger_by_verdict'] = dict(C(r['verdict'] for r in rows if r['in_ledger']))
fun['in_ledger_by_match'] = dict(C(r['ledger_match'] for r in rows if r['in_ledger']))
fun['same_title_by_verdict'] = dict(C(r['verdict'] for r in rows if r['same_title_as']))
fun['http_not_200_by_verdict'] = dict(C(r['verdict'] for r in rows if r['http'] != 200))
fun['with_prefix_by_verdict'] = dict(C(r['verdict'] for r in rows if r['prefixes']))
fun['no_audio_by_verdict'] = dict(C(r['verdict'] for r in rows if not r['audio_host']))
# 新候选 = 不在账本里、不是同名重复
new = [r for r in rows if not r['in_ledger'] and not r['same_title_as']]
fun['new_by_verdict'] = dict(C(r['verdict'] for r in new))
fun['new_by_verdict_signal'] = {'%s|%s' % k: v for k, v in C((r['verdict'], r['signal']) for r in new).items()}
fun['new_by_verdict_activity'] = {'%s|%s' % k: v for k, v in C((r['verdict'], r['activity']) for r in new).items()}
fun['new_ge5_by_verdict'] = dict(C(r['verdict'] for r in new if r['episodeCount'] >= 5))
fun['new_ge5_by_verdict_signal'] = {'%s|%s' % k: v for k, v in C((r['verdict'], r['signal']) for r in new if r['episodeCount'] >= 5).items()}
plat = collections.defaultdict(lambda: C())
for r in rows:
    p = plat[(r['verdict'], r['platform'])]
    p['all'] += 1
    p[r['signal']] += 1
    p[r['activity']] += 1
    if not r['in_ledger'] and not r['same_title_as']:
        p['new'] += 1
fun['by_platform'] = [{'verdict': k[0], 'platform': k[1], **dict(v)} for k, v in sorted(plat.items(), key=lambda kv: -kv[1]['all'])
                      if k[0] != 'own' and (v['all'] >= 3 or k[0] != 'unread')]
fun['unread_small_hosts'] = {'platforms': sum(1 for k, v in plat.items() if k[0] == 'unread' and v['all'] < 3),
                             'candidates': sum(v['all'] for k, v in plat.items() if k[0] == 'unread' and v['all'] < 3)}
fun['by_signal_where'] = {'%s|%s' % k: v for k, v in C((r['signal'], r['where']) for r in rows).items()}
fun['rule_family'] = dict(C((r['signal'] + ':' + r['rule'].split(':')[0]) for r in rows))
json.dump(fun, open(os.path.join(work, 'funnel.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in fun.items() if k not in ('by_platform', 'by_verdict_lang', 'by_lang_signal', 'by_verdict_signal_activity')}, ensure_ascii=False, indent=1))
