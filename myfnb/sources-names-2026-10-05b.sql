-- 2026-10-05（第二份）：来源名括号里的类型写清是谁在说话（全站布局方案 D8，myfnb/layout-2026-10-05.md）。参考库的故事卡写
-- 「国家 · 来源类型 · 年月」，读者看得到这一段；写故事的模型也按它分清店家和顾问、服务商、媒体（顾问和服务商计「业内人士」）。
-- 原来 33 个只写「播客」：按每个节目订阅里的介绍和主持人公开的资料（2026-10-05 查）补成「餐厅顾问的播客」「收银系统公司的播客」
-- 「餐饮业访谈播客」这类；店主博客、系统公司和服务商的博客与专栏也写明是哪一种。industry/sources.json 已同步。
-- seed.ts 不改已有来源，所以线上要跑这一份。只改名字不同的行，可以重复跑：第一次打印 renamed 45，再跑打印 renamed 0。
--   cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -At -v ON_ERROR_STOP=1 -f - < myfnb/sources-names-2026-10-05b.sql
WITH changed AS (
UPDATE sources s SET name = v.name, updated_at = now()
FROM (VALUES
  ('pod-a-la-carte-par-fooddy-le-podcast-qui-par', 'A LA CARTE par Fooddy（法国 · 餐饮培训平台的播客）'),
  ('pod-build-a-better-restaurant', 'Build A Better Restaurant（美国 · 餐厅老板兼顾问的播客）'),
  ('pod-coffee-experts-club', 'The Coffee Experts Club Podcast（美国 · 咖啡业顾问的播客）'),
  ('pod-der-gastro-podcast', 'DER GASTRO PODCAST（德国 · 餐饮业访谈播客）'),
  ('pod-elevated-hospitality', 'The Elevated Hospitality Podcast（美国 · 餐饮服务培训播客）'),
  ('pod-entre-hosteleros', 'ENTRE HOSTELEROS（西班牙 · 餐饮业访谈播客）'),
  ('pod-fettgespraeche', 'Fettgespräche（德国 · 餐饮业对谈播客）'),
  ('pod-food-business-blueprint', 'The Food Business Blueprint Podcast（美国 · 餐饮企业主的播客）'),
  ('pod-fr-passe-moi-le-sel', 'Passe moi le sel（法国 · 餐厅管理顾问的播客）'),
  ('pod-great-work-for-restaurants', 'Great Work for Restaurants（加拿大 · 餐厅营销服务商的播客）'),
  ('pod-horeca-audio-news-le-pillole-quotidiane', 'HORECA AUDIO NEWS（意大利 · 餐饮新闻网站的播客）'),
  ('pod-horeca-channel-italia', 'HORECA CHANNEL ITALIA（意大利 · 餐饮媒体的播客）'),
  ('pod-jp-omise-radio-smaregi', 'お店ラジオ2（日本 · 店主访谈电台节目）'),
  ('pod-keys-to-the-shop', 'Keys To The Shop（美国 · 咖啡店顾问的播客）'),
  ('pod-marketing-morsels-for-restaurants', 'Marketing Morsels for Restaurants（美国 · 餐厅营销顾问的播客）'),
  ('pod-qsr-uncut', 'QSR Uncut（美国 · 快餐媒体的播客）'),
  ('pod-restaurant-finance-podcast', 'The Restaurant Finance Podcast（美国 · 餐厅财务服务商的播客）'),
  ('pod-restaurant-growth-accelerator', 'Restaurant Growth Accelerator（加拿大 · 餐厅老板兼培训师的播客）'),
  ('pod-restaurant-hero', 'Restaurant Hero（德国 · 餐饮在线课程平台的播客）'),
  ('pod-restaurant-marketing-secrets', 'Restaurant Marketing Secrets（美国 · 餐厅营销公司的播客）'),
  ('pod-restaurant-prosperity-formula', 'The Restaurant Prosperity Formula（美国 · 餐厅顾问的播客）'),
  ('pod-restaurant-reset', 'Restaurant Reset（美国 · 收银系统公司的播客）'),
  ('pod-restaurant-rockstars', 'Restaurant Rockstars Podcast（美国 · 餐厅老板兼顾问的播客）'),
  ('pod-restaurant-strategy', 'Restaurant Strategy（美国 · 餐厅顾问的播客）'),
  ('pod-restaurant-wealth', 'Restaurant Wealth Podcast（美国 · 餐厅顾问的播客）'),
  ('pod-say86-hospitality', 'say86 Hospitality Podcast（英国 · 餐饮采购平台的播客）'),
  ('pod-strategic-business-growth-systems-restau', 'Strategic Business Growth Systems（美国 · 餐厅营销顾问的播客）'),
  ('pod-the-bar-business-podcast-bar-pub-owner-p', 'The Bar Business Podcast（美国 · 酒吧经营顾问的播客）'),
  ('pod-the-build-restuarant-201', 'The Build: Restuarant 201（美国 · 工作服品牌的餐厅纪实节目）'),
  ('pod-the-restaurant-technology-guys-podcast-b', 'The Restaurant Technology Guys Podcast（美国 · 收银系统公司的播客）'),
  ('pod-the-ristoratori', 'The Ristoratori（意大利 · 餐饮创业者访谈播客）'),
  ('pod-total-food-service', 'Total Food Service（美国 · 餐饮媒体的播客）'),
  ('pod-tw-renren-canyin', '人人品牌 · 餐飲經營筆記（中国台湾 · 餐饮顾问公司的播客）'),
  ('rss-marginedge', 'MarginEdge（美国 · 餐厅财务软件公司的博客）'),
  ('blog-eats365', 'Eats365 博客（中国香港 · 收银系统公司的博客）'),
  ('rss-petpooja', 'Petpooja 博客（印度 · 收银系统公司的博客）'),
  ('web-goomer-blog', 'Goomer 博客（巴西 · 点餐系统公司的博客）'),
  ('web-gnavi-pro-tokushu', 'ぐるなび通信 · 特集（日本 · 餐饮信息平台的专栏）'),
  ('web-gnavi-pro-hanjo', 'ぐるなび通信 · 今、繁盛している店（日本 · 餐饮信息平台的专栏）'),
  ('rss-tenpo-biz-column', '店舗流通ネット（日本 · 店铺租赁服务商的专栏）'),
  ('rss-caroline-bower', 'Bluebird Bread Co. · Caroline Bower（美国 · 微型面包店店主的博客）'),
  ('rss-miraishokudo', '未来食堂日記（日本 · 定食店店主的博客）'),
  ('rss-kojinkuroji', '小さなお店の黒字力（日本 · 个体餐饮店店主的博客）'),
  ('rss-ryourigaka', '料理画家クチーナカメヤマ（日本 · 意大利小酒馆店主的博客）'),
  ('rss-yoshitencho', 'ヨッシー店長の家 · 飲食店開業（日本 · 咖啡店店主的博客）')
) AS v(id, name)
WHERE s.id = v.id AND s.name IS DISTINCT FROM v.name
RETURNING s.id
)
SELECT 'renamed ' || count(*) FROM changed;
