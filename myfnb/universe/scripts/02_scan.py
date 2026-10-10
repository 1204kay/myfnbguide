# 第 1、2 步：扫整库两遍。第一遍数每个主机上的订阅数（用来分「自有域名」和「没读过的平台」），
# 第二遍给每个订阅判平台结论、去重、对账本，并把标题或简介里有餐饮词根的行写进中间文件，供第 3 步细筛。
# 用法（一个进程扫完全库要半小时以上，所以分段并行；run_all.sh 里是完整的顺序）：
#   python -I -X utf8 02_scan.py <podcastindex_feeds.db> <仓库根目录> <work 目录> cache    只做第一遍和去重，存成 pass1-cache.pkl
#   python -I -X utf8 02_scan.py <podcastindex_feeds.db> <仓库根目录> <work 目录> k/n      第二遍的第 k 段（按 id 平分成 n 段，k 从 0 起）
# 每一段的输出在 work/parts/，由 02b_merge.py 合并成 scan-stats.json、platform-counts.tsv、anchored.jsonl、ledger-hits.jsonl
import sqlite3, sys, os, json, re, csv, collections, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pilib
from anchor import anchored as is_anchored
import pickle

db_path, repo, work = sys.argv[1], sys.argv[2], sys.argv[3]
mode = sys.argv[4] if len(sys.argv) > 4 else 'cache'
os.makedirs(work, exist_ok=True)
db = sqlite3.connect('file:' + db_path.replace('\\', '/') + '?mode=ro', uri=True)
db.execute('pragma temp_store=FILE')
t0 = time.time()
now = db.execute('select max(lastUpdate) from podcasts').fetchone()[0]
D90, D2Y = now - 90 * 86400, now - 730 * 86400

# ---------- 账本和已接入的来源 ----------
URLRX = re.compile(r'https?://[^\s；;，,）)（(「」]+')
led_url, led_dom, led_rows = {}, {}, []
with open(os.path.join(repo, 'myfnb', 'sources-ledger.tsv'), encoding='utf-8') as f:
    for i, r in enumerate(csv.reader(f, delimiter='\t', quoting=csv.QUOTE_NONE), start=1):
        if i == 1 or len(r) < 6:
            continue
        led_rows.append((i, r))
        if r[0].startswith('platform-'):
            continue
        for u in URLRX.findall(r[2]):
            nu = pilib.norm_url(u)
            led_url.setdefault(nu, r[0])
            h = pilib.host_of(u)
            if h and not pilib.platform_of_host(h) and not pilib.is_cloud(h):
                led_dom.setdefault(pilib.reg_domain(h), r[0])
src = json.load(open(os.path.join(repo, 'industry', 'sources.json'), encoding='utf-8'))['sources']
active_ids = set()
for s in src:
    active_ids.add(s['id'])
    for u in URLRX.findall(json.dumps(s.get('config', {}), ensure_ascii=False)):
        u = u.rstrip('"')
        led_url.setdefault(pilib.norm_url(u), s['id'])
# 校准用的正例：按节目名也找一遍（账本里的名称去掉全角括号里的说明）
pos_ids = set(json.load(open(os.path.join(work, 'positives.json'), encoding='utf-8'))) if os.path.exists(os.path.join(work, 'positives.json')) else set()
led_title = {}
for i, r in led_rows:
    if r[0] in pos_ids:
        name = re.sub(r'（.*$', '', r[1]).strip()
        if len(name) >= 6:
            led_title.setdefault(pilib.norm_text(name), r[0])

# ---------- 第一遍和去重（结果存成缓存，整库没换就不重算）----------
st = os.stat(db_path)
cache_path = os.path.join(work, 'pass1-cache.pkl')
cache = None
if os.path.exists(cache_path):
    c = pickle.load(open(cache_path, 'rb'))
    if c.get('key') == (st.st_size, int(st.st_mtime)):
        cache = c
if cache is None:
    # 每个主机（计数单位）上的订阅数
    feed_cnt, audio_cnt, link_cnt = collections.Counter(), collections.Counter(), collections.Counter()
    for url, enc, link in db.execute('select url, newestEnclosureUrl, link from podcasts'):
        feed_cnt[pilib.unit_of(url)] += 1
        if enc:
            pre, ah, stripped = pilib.audio_chain(enc)
            if ah:
                audio_cnt[pilib.unit_of(stripped, ah)] += 1
        if link:
            link_cnt[pilib.reg_domain(pilib.host_of(link))] += 1
    print('pass 1 done', round(time.time() - t0), 's; feed units', len(feed_cnt), 'audio units', len(audio_cnt), flush=True)
    # 去重：duplicateOf、同一个 podcastGuid、同一个 itunesId（留最近更新的那个，其次集数多的，再次编号小的）
    def members(col, cond):
        q = ('select id, %s, newestItemPubdate, episodeCount from podcasts where %s and %s in '
             '(select %s from podcasts where %s group by 1 having count(*) > 1)') % (col, cond, col, col, cond)
        return db.execute(q).fetchall()
    notdup = "(duplicateOf is null or duplicateOf = '' or duplicateOf = 0)"
    parent, info = {}, {}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    n_rows = {}
    for col, cond in (('podcastGuid', "podcastGuid <> '' and " + notdup), ('itunesId', "itunesId <> '' and itunesId <> 0 and " + notdup)):
        first = {}
        ms = members(col, cond)
        n_rows[col] = len(ms)
        for pid, key, newest, eps in ms:
            info[pid] = (newest or 0, eps or 0, -pid)
            parent.setdefault(pid, pid)
            if key in first:
                parent[find(pid)] = find(first[key])
            else:
                first[key] = pid
    groups = collections.defaultdict(list)
    for pid in parent:
        groups[find(pid)].append(pid)
    drop_dup = set()
    for g in groups.values():
        if len(g) > 1:
            keep = max(g, key=lambda p: info[p])
            drop_dup.update(p for p in g if p != keep)
    dedupe = {'guid_group_rows': n_rows['podcastGuid'], 'itunes_group_rows': n_rows['itunesId'],
              'groups': sum(1 for g in groups.values() if len(g) > 1), 'dropped': len(drop_dup)}
    print('dedupe done', round(time.time() - t0), 's', dedupe, flush=True)
    cache = {'key': (st.st_size, int(st.st_mtime)), 'feed_cnt': feed_cnt, 'audio_cnt': audio_cnt, 'link_cnt': link_cnt,
             'drop_dup': drop_dup, 'dedupe': dedupe}
    pickle.dump(cache, open(cache_path, 'wb'))
feed_cnt, audio_cnt, link_cnt, drop_dup, dedupe = cache['feed_cnt'], cache['audio_cnt'], cache['link_cnt'], cache['drop_dup'], cache['dedupe']
if mode == 'cache':
    print('cache ready', dedupe)
    sys.exit(0)
part, nparts = [int(x) for x in mode.split('/')]
max_id = db.execute('select max(id) from podcasts').fetchone()[0]
lo, hi = max_id * part // nparts, (max_id * (part + 1) // nparts if part + 1 < nparts else max_id)
parts_dir = os.path.join(work, 'parts')
os.makedirs(parts_dir, exist_ok=True)

# ---------- 第二遍 ----------
stats = collections.Counter()
by_va = collections.Counter()       # (verdict, activity)
plat = collections.defaultdict(lambda: [None, 0, 0, 0])  # name -> [verdict, feeds, feeds_90d, feeds_2y]
own_bucket = collections.Counter()
fa = open(os.path.join(parts_dir, 'anchored.%d.jsonl' % part), 'w', encoding='utf-8', newline='\n')
fl = open(os.path.join(parts_dir, 'ledger-hits.%d.jsonl' % part), 'w', encoding='utf-8', newline='\n')
cols = ('id, url, title, link, lastHttpStatus, dead, itunesId, originalUrl, itunesAuthor, generator, newestItemPubdate, language, '
        'oldestItemPubdate, episodeCount, newestEnclosureUrl, description, category1, category2, category3, category4, duplicateOf')
for (pid, url, title, link, http, dead, itid, ourl, author, gen, newest, lang, oldest, eps, enc, desc,
     c1, c2, c3, c4, dupof) in db.execute('select ' + cols + ' from podcasts where id > ? and id <= ?', (lo, hi)):
    stats['total'] += 1
    if dupof not in (None, '', 0):
        stats['drop_duplicateOf'] += 1
        continue
    if dead:
        stats['drop_dead'] += 1
        continue
    if pid in drop_dup:
        stats['drop_same_guid_or_itunes'] += 1
        continue
    stats['kept'] += 1
    newest = newest or 0
    act = '90d' if newest >= D90 else '2y' if newest >= D2Y else 'older' if newest > 0 else 'nodate'
    fh = pilib.host_of(url)
    fu = pilib.unit_of(url, fh)
    pre, ah, stripped = pilib.audio_chain(enc) if enc else ([], '', '')
    au = pilib.unit_of(stripped, ah) if ah else ''
    if not enc:
        stats['no_enclosure'] += 1
    if pre:
        stats['has_prefix'] += 1
    verdict, pname, involved = pilib.judge(fh, fu, pre, ah, au, gen, feed_cnt, audio_cnt)
    by_va[(verdict, act)] += 1
    p = plat[pname]
    p[0] = verdict
    p[1] += 1
    if act == '90d':
        p[2] += 1
    if act in ('90d', '2y'):
        p[3] += 1
    if verdict == 'own':
        own_bucket[act] += 1
    # 账本
    in_led, how = '', ''
    for u in (url, ourl):
        hit = led_url.get(pilib.norm_url(u))
        if hit:
            in_led, how = hit, 'url'
            break
    if not in_led and not pilib.platform_of_host(fh) and fu in led_dom and feed_cnt[fu] <= 3:
        in_led, how = led_dom[fu], 'domain'
    if not in_led and link:
        lh = pilib.host_of(link)
        ld = pilib.reg_domain(lh)
        if ld in led_dom and not pilib.platform_of_host(lh) and link_cnt[ld] <= 3:
            in_led, how = led_dom[ld], 'link-domain'
    title_s = pilib.strip_html(title)
    tn = pilib.norm_plain(title_s)
    title_hit = led_title.get(tn) if led_title else None
    desc_s = pilib.strip_html(desc)[:3000]
    anchored = is_anchored(tn + ' ' + pilib.norm_plain(desc_s))
    if not (anchored or in_led or title_hit):
        continue
    rec = {'id': pid, 'url': url, 'title': title_s, 'language': lang, 'lang': pilib.lang_of(lang, title_s + ' ' + desc_s),
           'host': fh, 'audio_host': ah, 'prefixes': pre, 'generator': (gen or '')[:80], 'platform': pname, 'verdict': verdict,
           'involved': involved, 'episodeCount': eps or 0, 'newest': newest, 'oldest': oldest or 0, 'activity': act, 'link': link,
           'itunesId': itid if itid else '', 'in_ledger': in_led, 'ledger_match': how, 'http': http, 'author': author,
           'cats': [c for c in (c1, c2, c3, c4) if c], 'desc': desc_s[:1500]}
    if anchored:
        stats['anchored'] += 1
        fa.write(json.dumps(rec, ensure_ascii=False) + '\n')
    if in_led or title_hit:
        rec['title_hit'] = title_hit or ''
        rec['anchored'] = anchored
        fl.write(json.dumps(rec, ensure_ascii=False) + '\n')
fa.close(); fl.close()

pickle.dump({'now': now, 'stats': stats, 'by_va': by_va, 'plat': dict(plat), 'dedupe': dedupe, 'db': db_path},
            open(os.path.join(parts_dir, 'stats.%d.pkl' % part), 'wb'))
print('part', part, 'of', nparts, 'done', round(time.time() - t0), 's', dict(stats), flush=True)
