# 第 0 步：数出整库里各订阅主机、音频主机、生成器的订阅数，用来编平台名单。
# 用法：python -I -X utf8 01_explore_hosts.py <podcastindex_feeds.db> <输出目录>
# 输出：explore-feedhosts.tsv、explore-audiohosts.tsv、explore-generators.tsv、explore-prefix-candidates.tsv
import sqlite3, sys, re, collections, os
from urllib.parse import urlsplit, unquote

db_path, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
db = sqlite3.connect('file:' + db_path.replace('\\', '/') + '?mode=ro', uri=True)
now = db.execute('select max(lastUpdate) from podcasts').fetchone()[0]
d90 = now - 90 * 86400

def host_of(u):
    try:
        h = urlsplit(u.strip()).hostname
        return (h or '').lower()
    except Exception:
        return ''

HOSTLIKE = re.compile(r'^(?:[a-z0-9-]+\.)+[a-z]{2,}$')

def embedded_host(u):
    """路径前几段里出现另一个主机名的，返回那个主机名（用来发现统计前缀）。"""
    try:
        p = unquote(urlsplit(u).path).lower()
    except Exception:
        return ''
    segs = [s for s in p.split('/') if s][:6]
    for s in segs:
        s = s.split(':')[0]
        if HOSTLIKE.match(s) and not s.endswith(('.mp3', '.m4a', '.mp4', '.wav', '.ogg', '.aac', '.m4v', '.mov', '.php', '.html', '.xml', '.rss', '.opus', '.flac')):
            return s
    return ''

feed = collections.Counter(); feed90 = collections.Counter()
dbhost = collections.Counter()
audio = collections.Counter(); audio90 = collections.Counter()
gen = collections.Counter(); gen90 = collections.Counter()
prefix = collections.Counter(); prefix_ex = {}
n = 0
VER = re.compile(r'[\s/]*v?\d+(\.\d+)+.*$|\s*\(https?://[^)]*\)|\s*-?\s*https?://\S+')
for url, host, enc, g, newest in db.execute('select url, host, newestEnclosureUrl, generator, newestItemPubdate from podcasts'):
    n += 1
    recent = (newest or 0) >= d90
    fh = host_of(url)
    feed[fh] += 1
    dbhost[(host or '').lower()] += 1
    ah = host_of(enc) if enc else ''
    audio[ah] += 1
    g2 = VER.sub('', (g or '').strip())[:60].lower()
    gen[g2] += 1
    if recent:
        feed90[fh] += 1; audio90[ah] += 1; gen90[g2] += 1
    if enc:
        e = embedded_host(enc)
        if e and e != ah:
            prefix[ah] += 1
            prefix_ex.setdefault(ah, enc[:160])

def dump(name, c, c90=None, top=1500):
    with open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write('key\tfeeds\tfeeds_90d\n')
        for k, v in c.most_common(top):
            f.write('%s\t%d\t%s\n' % (k, v, c90[k] if c90 is not None else ''))

dump('explore-feedhosts.tsv', feed, feed90)
dump('explore-audiohosts.tsv', audio, audio90)
dump('explore-generators.tsv', gen, gen90, 600)
with open(os.path.join(out_dir, 'explore-prefix-candidates.tsv'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('outer_host\tfeeds_with_embedded_host\tall_feeds_on_this_audio_host\texample\n')
    for k, v in prefix.most_common(400):
        f.write('%s\t%d\t%d\t%s\n' % (k, v, audio[k], prefix_ex[k]))
print('rows', n, 'now', now, 'distinct feed hosts', len(feed), 'distinct audio hosts', len(audio), 'db host distinct', len(dbhost))
