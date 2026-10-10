# 公用函数：主机和注册域名、音频地址去统计前缀、平台名单与结论、文字清洗。
# 平台名单的依据写在每一行的 ledger 字段（myfnb/sources-ledger.tsv 的行号，2026-10-10 的版本）。
import re, html, unicodedata
from urllib.parse import urlsplit, unquote

# ---------- 主机 ----------
SECOND = {'co', 'com', 'net', 'org', 'edu', 'gov', 'ac', 'or', 'ne', 'go', 'gob', 'gov', 'mil', 'nom', 'info', 'biz',
          'web', 'int', 'ltd', 'plc', 'me', 'sch', 'k12', 'gv', 'gr', 'ed', 'lg', 'in', 'nic', 'res', 'firm', 'gen', 'ind'}
IP = re.compile(r'^\d+\.\d+\.\d+\.\d+$')

def host_of(u):
    try:
        return (urlsplit((u or '').strip()).hostname or '').lower().rstrip('.')
    except Exception:
        return ''

def reg_domain(h):
    """注册域名的近似（没有用公共后缀表）：两段国家后缀按三段取。"""
    if not h or IP.match(h):
        return h
    p = h.split('.')
    if len(p) <= 2:
        return h
    if len(p[-1]) == 2 and p[-2] in SECOND:
        return '.'.join(p[-3:])
    return '.'.join(p[-2:])

# 云存储和通用托管：主机名属于云厂商，真正的归属要看整段主机名（路径式的再加第一段路径）。
CLOUD_SUFFIX = ('amazonaws.com', 'cloudfront.net', 'googleapis.com', 'googleusercontent.com', 'b-cdn.net',
                'digitaloceanspaces.com', 'windows.net', 'r2.dev', 'backblazeb2.com', 'akamaized.net', 'akamaihd.net',
                'wasabisys.com', 'dropbox.com', 'dropboxusercontent.com', 'github.io', 'netlify.app', 'herokuapp.com',
                'web.app', 'firebaseapp.com', 'pages.dev', 'vercel.app', 'azurewebsites.net', 'cloudwaysapps.com',
                'hostingersite.com', 'wpengine.com', 'kinsta.cloud', 'myftpupload.com', 'secureservercdn.net',
                'linodeobjects.com', 'r2.cloudflarestorage.com', 'supabase.co', 'appspot.com', 'edgekey.net', 'fastly.net')
PATH_STYLE = re.compile(r'^(s3[.-][a-z0-9.-]*amazonaws\.com|s3\.amazonaws\.com|storage\.googleapis\.com|'
                        r'[a-z0-9-]+\.digitaloceanspaces\.com|s3\.[a-z0-9-]+\.wasabisys\.com|dl\.dropbox\.com|'
                        r'www\.dropbox\.com|firebasestorage\.googleapis\.com|secureservercdn\.net)$')

def is_cloud(h):
    return any(h == s or h.endswith('.' + s) for s in CLOUD_SUFFIX)

def unit_of(u, h=None):
    """计数单位：普通主机用注册域名；云存储用整段主机名，路径式的加第一段路径。"""
    h = h if h is not None else host_of(u)
    if not h:
        return ''
    if is_cloud(h):
        if PATH_STYLE.match(h):
            try:
                seg = [s for s in urlsplit(u).path.split('/') if s]
            except Exception:
                seg = []
            return h + '/' + (seg[0].lower() if seg else '')
        return h
    return reg_domain(h)

# ---------- 音频地址前面的统计前缀 ----------
# 这些主机只做统计或广告归因，真正的音频主机写在路径里。平台自己的跟踪前缀（sw.soundon.fm 等）也在这里，
# 剥掉以后仍按平台名单判（链上每一个主机都查名单）。
PREFIX_HOSTS = {
    'dts.podtrac.com', 'www.podtrac.com', 'podtrac.com', 'play.podtrac.com', 'publisher.podtrac.com',
    'media.blubrry.com', 'media.rawvoice.com', 'www.blubrry.com',
    'pdcn.co', 'op3.dev', 'pscrb.fm', 'verifi.podscribe.com', 'chrt.fm', 'chtbl.com', 'pdst.fm', 'mgln.ai',
    'p.podderapp.com', 'prfx.byspotify.com', '2.gum.fm', 's.gum.fm', 'claritaspod.com', 'clrtpod.com',
    'tracking.swap.fm', 'swap.fm', 'pdrl.fm', 'enrichment.soundstack.com', 'arttrk.com', 'prefix.up.audio',
    'growx.podkite.com', 'cohst.app', 'r.zencastr.com', 'stats-test.pod.fo', 'adbarker.com', 'bktrks.co',
    'share.ism.bible', 'share.ttb.bible', 'www.rssinsight.com', 'podcaster.click', 'track.zayads.ru',
    'audio.voxnest.com', 'sw.soundon.fm', 'track.fstry.me', 'dts-api.xiaoyuzhoufm.com', 'tr.ausha.co',
    'flex.acast.com', 'flex2.acast.com', 'cdn.meinpodcast.io', 'main.podcast-hosting.org', 'deliver.audiotakes.net',
    'pfx.vpixl.com', 'm.pfxes.com', 'r.zen.ai', 'gateway.zippycast.io', 'fdlyr.co', 'traffic.cast.plus',
    'feedproxy.google.com', 'api.himalaya.com',
}
PREFIX_IF_TRACK = {'m.cdn.firstory.me', 'letscast.fm'}  # 只有路径以 /track/ 开头时才是前缀
HOSTLIKE = re.compile(r'^(?:[a-z0-9-]+\.)+[a-z]{2,}$')
NOT_HOST_END = ('.mp3', '.m4a', '.mp4', '.wav', '.ogg', '.aac', '.m4v', '.mov', '.php', '.html', '.xml', '.rss',
                '.opus', '.flac', '.jpg', '.png', '.pdf')

def _embedded(u):
    """返回路径里第一个像主机名的段，以及从它开始的剩余地址。"""
    try:
        path = unquote(urlsplit(u).path)
    except Exception:
        return None
    path = path.replace('https://', '/').replace('http://', '/').replace('https:/', '/').replace('http:/', '/')
    segs = [s for s in path.split('/') if s]
    for i, s in enumerate(segs[:8]):
        s2 = s.lower().split(':')[0]
        if HOSTLIKE.match(s2) and not s2.endswith(NOT_HOST_END):
            return 'https://' + '/'.join([s2] + segs[i + 1:])
    return None

def audio_chain(enc):
    """返回（统计前缀主机列表，真正的音频主机，剥完前缀的地址）。"""
    prefixes = []
    u = (enc or '').strip()
    for _ in range(12):
        h = host_of(u)
        if not h:
            return prefixes, '', u
        is_prefix = h in PREFIX_HOSTS or (h in PREFIX_IF_TRACK and '/track/' in u)
        if not is_prefix:
            return prefixes, h, u
        nxt = _embedded(u)
        if not nxt:
            return prefixes, h, u  # 前缀主机自己就是终点（例如 media.blubrry.com 直接放音频）
        prefixes.append(h)
        u = nxt
    return prefixes, host_of(u), u

# ---------- 平台名单 ----------
# verdict：allowed 允许；banned 禁止；unread 账本里没有平台级结论（含「待定」）。
# domains 按后缀匹配订阅主机、音频主机和链上的前缀主机；gen 匹配 generator（小写）。
PLATFORMS = [
    # 允许
    ('Buzzsprout', 'allowed', ['buzzsprout.com'], r'^buzzsprout', 'L8676、L8608、L8637'),
    ('Captivate', 'allowed', ['captivate.fm'], r'^captivate', 'L8709、L8644、L8624'),
    ('Podigee', 'allowed', ['podigee.io', 'podigee-cdn.net', 'podigee.com'], r'^podigee', 'L8817（开了动态广告、音频跳到 adswizz.podigee-cdn.net 的除外）'),
    ('Ausha', 'allowed', ['ausha.co'], r'^ausha', 'L8675、L8707、L8598'),
    ('Blubrry', 'allowed', ['blubrry.com', 'blubrry.net', 'rawvoice.com'], r'^blubrry (podcasting|account)', 'L8710、L8645'),
    # 禁止
    ('Spotify/Anchor', 'banned', ['anchor.fm', 'spotify.com', 'd3ctxlq1ktw2nl.cloudfront.net'], r'^anchor', 'L8596、L8597、L8639'),
    ('Spreaker', 'banned', ['spreaker.com', 'voxnest.com'], r'^spreaker', 'L8601'),
    ('SoundCloud', 'banned', ['soundcloud.com', 'sndcdn.com'], r'^soundcloud', 'L8629、L8630'),
    ('iVoox', 'banned', ['ivoox.com'], r'^ivoox', 'L8788'),
    ('RSS.com', 'banned', ['rss.com'], r'^rss\.com', 'L8815、L8783'),
    ('Podbean', 'banned', ['podbean.com'], r'podbean', 'L8813、L8745'),
    ('Libsyn', 'banned', ['libsyn.com', 'libsynpro.com'], r'^libsyn', 'L8699–L8701、L8704、L8705'),
    ('Podomatic', 'banned', ['podomatic.com', 'podomatic.net'], r'^podomatic', 'L8812、L8744'),
    ('Acast', 'banned', ['acast.com', 'pippa.io'], r'^(acast|pippa)', 'L8814、L8782'),
    ('Transistor', 'banned', ['transistor.fm'], r'^transistor', 'L8628、L8636'),
    ('喜马拉雅', 'banned', ['ximalaya.com', 'xmcdn.com'], r'^(ximalaya|喜马拉雅)', 'L8578、L8384'),
    ('小宇宙', 'banned', ['xyzfm.space', 'xiaoyuzhoufm.com', 'xyzcdn.net'], r'^(xiaoyuzhou|小宇宙)', 'L8136、L8280、L8385'),
    ('Firstory', 'banned', ['firstory.me', 'fstry.me', 'firstory-709db.cloud.goog'], r'^firstory', 'L8627'),
    ('Substack', 'banned', ['substack.com', 'substackcdn.com'], r'^substack', 'L8332、L8376'),
    ('SoundOn', 'banned', ['soundon.fm'], r'^soundon', 'L8602'),
    ('Castos', 'banned', ['castos.com'], r'^castos$', 'L8606'),
    ('Riverside', 'banned', ['riverside.fm', 'riverside.com'], r'^riverside', 'L8603、L8615'),
    ('Wix', 'banned', ['wix.com', 'wixsite.com', 'wixstatic.com', 'usrfiles.com', 'filesusr.com', 'wixmp.com'], r'^wix', 'L8713'),
    ('Medium', 'banned', ['medium.com'], r'^medium$', 'L8338、L8345'),
    ('YouTube', 'banned', ['youtube.com', 'youtu.be', 'googlevideo.com'], r'^youtube', 'L8576'),
    ('podengine.io', 'banned', ['podengine.io'], r'^podengine', 'L8702、L8703'),
    ('Fireside', 'banned', ['fireside.fm'], r'^fireside', 'L8575（账本里多出来的一条，任务名单没有列）'),
    ('痞客邦', 'banned', ['pixnet.net'], None, 'L8339（博客平台，账本里多出来的）'),
    ('方格子', 'banned', ['vocus.cc'], None, 'L8340（博客平台，账本里多出来的）'),
    ('Brunch', 'banned', ['brunch.co.kr'], None, 'L8787（博客平台，账本里多出来的）'),
    # 账本里是「待定」或只有半句的：按未读
    ('Megaphone', 'unread', ['megaphone.fm'], r'^megaphone', 'L8816 待定：条款没有读完，音频主机拒绝 AI 训练类爬虫'),
    ('ART19', 'unread', ['art19.com'], r'^art19', 'L8697、L8750：使用政策写「订阅的使用以内容所有者的条款为准」，没有平台级结论'),
    ('LetsCast', 'unread', ['letscast.fm'], r'^letscast', 'L8792 待定：法律声明里「只许私人、非商业使用」一句管不管用户节目没有判'),
    ('Kajabi', 'unread', ['kajabi.com', 'kajabi-cdn.com'], r'^kajabi', 'L8643：禁止机器人的一句写的是开户客户的义务，没有平台级结论'),
    ('声湃', 'unread', ['wav.pub', 'wavpub.com', 'wavpub.cn'], None, 'L8579 待定：声明允许转写和摘要，条件是标明来源、可识别的 UA 和联系方式'),
    ('Zencast.fm', 'unread', ['zencast.fm'], r'^zencast$', 'L8281：音频主机 robots 两次读不到（规则 5），只有一次记录'),
    # 以下账本没有任何结论，只是把同一家的几个域名归到一起，方便排读条款的顺序
    ('Simplecast', 'unread', ['simplecast.com', 'simplecastaudio.com', 'simplecast.fm'], r'^simplecast', ''),
    ('Omny Studio', 'unread', ['omnycontent.com', 'omny.fm'], r'^omny', ''),
    ('RedCircle', 'unread', ['redcircle.com'], r'^redcircle', ''),
    ('Audioboom', 'unread', ['audioboom.com'], r'^audioboom', ''),
    ('Squarespace', 'unread', ['squarespace.com', 'squarespace-cdn.com', 'sqspcdn.com'], r'^(squarespace|site-server)', ''),
    ('FeedBurner', 'unread', ['feedburner.com'], None, ''),
    ('Castbox', 'unread', ['castbox.fm'], r'^castbox', ''),
    ('Hubhopper', 'unread', ['hubhopper.com'], r'^hubhopper', ''),
    ('Mave', 'unread', ['mave.digital', 's3mts.ru'], r'^mave', ''),
    ('Subsplash', 'unread', ['subsplash.com'], r'^subsplash', ''),
    ('Pinecast', 'unread', ['pinecast.com'], r'^pinecast', ''),
    ('Audiomeans', 'unread', ['audiomeans.fr'], r'^audiomeans', ''),
    ('podcaster.de', 'unread', ['podcaster.de', 'podcast-hosting.org'], r'^podcaster\.de', ''),
    ('Zencastr', 'unread', ['zencastr.com'], r'^zencastr', ''),
    ('Internet Archive', 'unread', ['archive.org'], None, ''),
    ('WordPress.com', 'unread', ['wordpress.com', 'wp.com'], None, ''),
    ('Blogger', 'unread', ['blogspot.com', 'blogger.com'], r'^blogger$', ''),
    ('Podcastics', 'unread', ['podcastics.com'], r'^podcastics', ''),
    ('Springcast', 'unread', ['springcast.fm', 'springcast.app'], r'^springcast', ''),
    ('Julep', 'unread', ['julephosting.de', 'julep.de'], r'^julep', ''),
    ('Apple Podcasts', 'unread', ['apple.com'], None, ''),
    ('Patreon', 'unread', ['patreon.com', 'patreonusercontent.com'], r'^patreon', ''),
    ('beehiiv', 'unread', ['beehiiv.com'], r'^beehiiv', '账本没有这一家；计划 §3.3 把它列为按条款不投入的电子报平台（依据是存档和报道，没有读原文）'),
    ('Soundcast.io（Ausha 的广告拼接）', 'unread', ['soundcast.io'], None, ''),
]
_DOM = {}
for name, verdict, doms, gen, led in PLATFORMS:
    for d in doms:
        _DOM[d] = (name, verdict)
_GEN = [(re.compile(g), name, verdict) for name, verdict, doms, g, led in PLATFORMS if g]
MEASURE_ONLY = PREFIX_HOSTS  # 纯统计前缀不参与平台结论（平台自己的跟踪主机会先被上面的域名表认出来）

def platform_of_host(h):
    if not h:
        return None
    p = h.split('.')
    for i in range(len(p) - 1):
        hit = _DOM.get('.'.join(p[i:]))
        if hit:
            return hit
    return None

def platform_of_gen(g):
    g = (g or '').strip().lower()
    if not g:
        return None
    for rx, name, verdict in _GEN:
        if rx.search(g):
            return (name, verdict)
    return None

RANK = {'banned': 3, 'unread': 2, 'allowed': 1, 'own': 0}

def judge(feed_host, feed_unit, prefixes, audio_host, audio_unit, generator, feed_cnt, audio_cnt, own_max=3):
    """返回（verdict，platform，involved）。involved 是参与判断的全部（名字，结论）。"""
    involved = []
    f = platform_of_host(feed_host)
    if f:
        involved.append(f)
    a = platform_of_host(audio_host)
    if a and a not in involved:
        involved.append(a)
    # 统计前缀：属于禁止或未读平台的（sw.soundon.fm、track.fstry.me 等）照算；
    # 属于允许平台的（media.blubrry.com 是 Blubrry 给自建站用的统计跳转）不算托管在那个平台上
    for h in prefixes:
        a = platform_of_host(h)
        if a and a[1] != 'allowed' and a not in involved:
            involved.append(a)
    g = platform_of_gen(generator)
    if g and g not in involved:
        involved.append(g)
    # 名单以外的主机：订阅数少的算节目方自己的，多的算没读过的平台或多节目主机
    unknown = []
    if not f and feed_unit:
        if feed_cnt.get(feed_unit, 0) > own_max:
            unknown.append((feed_unit, 'unread'))
    if audio_host and not platform_of_host(audio_host) and audio_unit and audio_unit != feed_unit:
        if audio_cnt.get(audio_unit, 0) > own_max:
            unknown.append((audio_unit, 'unread'))
    allv = involved + unknown
    if not allv:
        return 'own', 'own', []
    best = max(allv, key=lambda x: RANK[x[1]])
    return best[1], best[0], allv

# ---------- 文字 ----------
TAG = re.compile(r'<[^>]{0,2000}>')
WS = re.compile(r'\s+')
_LAT = {}
for cp in list(range(0xC0, 0x250)) + list(range(0x1E00, 0x1F00)):
    d = unicodedata.normalize('NFD', chr(cp))
    if d[0] != chr(cp) and d[0].isascii():
        _LAT[cp] = d[0]
_LAT.update({ord('ß'): 'ss', ord('ı'): 'i', ord('ø'): 'o', ord('æ'): 'ae', ord('œ'): 'oe', ord('ł'): 'l', ord('đ'): 'd',
             ord('’'): "'", ord('‘'): "'", ord('“'): '"', ord('”'): '"', ord('–'): '-', ord('—'): '-',
             ord('أ'): 'ا', ord('إ'): 'ا', ord('آ'): 'ا', ord('ى'): 'ي', 0x093C: None, 0x0640: None})
for cp in range(0x064B, 0x0653):
    _LAT[cp] = None  # 阿拉伯语的音符
for cp in range(0x0300, 0x0370):
    _LAT[cp] = None  # 拉丁字母后面的组合音符

def strip_html(s):
    s = html.unescape(s or '')
    s = TAG.sub(' ', s)
    return WS.sub(' ', s).strip()

def norm_plain(s):
    """同 norm_text，但文字已经去过标签。"""
    return unicodedata.normalize('NFKC', s).casefold().translate(_LAT)

def norm_text(s):
    """去标签、统一宽度、小写、去掉拉丁字母的重音（café→cafe，hostelería→hosteleria，nhà hàng→nha hang）。"""
    s = strip_html(s)
    s = unicodedata.normalize('NFKC', s).casefold()
    return s.translate(_LAT)

SCRIPTS = [('ja', re.compile(r'[぀-ヿ]')), ('ko', re.compile(r'[가-힯]')),
           ('th', re.compile(r'[฀-๿]')), ('ar', re.compile(r'[؀-ۿ]')),
           ('hi', re.compile(r'[ऀ-ॿ]')), ('ru', re.compile(r'[Ѐ-ӿ]')),
           ('zh', re.compile(r'[一-鿿]'))]
CYR = {'ru', 'uk', 'bg', 'sr', 'mk', 'be', 'kk', 'ky', 'mn', 'tg'}
ARA = {'ar', 'fa', 'ur', 'ps', 'ku'}
IND = {'hi', 'mr', 'ne'}

def lang_of(declared, text):
    """语言：非拉丁文字按文字判（假名→ja、谚文→ko、汉字→zh……），其余用订阅自己声明的语言。"""
    d = (declared or '').strip().lower().replace('_', '-').split('-')[0][:3]
    d = {'in': 'id', 'iw': 'he', 'ji': 'yi'}.get(d, d)  # 旧的语言代码
    t = text[:400]
    n = max(1, len(t))
    for code, rx in SCRIPTS:
        k = len(rx.findall(t))
        if k >= 6 and k / n >= 0.08:
            if code == 'ru' and d in CYR:
                return d
            if code == 'ar' and d in ARA:
                return d
            if code == 'hi' and d in IND:
                return d
            if code == 'zh' and d == 'ja':
                return 'ja'
            return code
    return d if d else 'und'

def norm_url(u):
    u = (u or '').strip()
    u = re.sub(r'^[a-zA-Z]+://', '', u)
    u = re.sub(r'^www\.', '', u, flags=re.I)
    h, _, rest = u.partition('/')
    return (h.lower() + '/' + rest).rstrip('/')
