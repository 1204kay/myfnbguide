# 进中间文件的宽口径（扫整库时用）：标题或简介里只要出现任何一个「店或行业」的词根就留下，后面再细判。
# 用字面子串而不用一个大正则：大正则每个字符要试三百个分支，扫 470 万行要一个多小时；字面子串几分钟。
# 改强弱信号（keywords.py）时，新加的词根要先确认在这张表里，否则要重扫整库。
import re

ANCHOR_ASCII = (
    'restaura ristora restoran gastro hostel horeca hospitality foodservice foodtruck cafe caffe kafe coffee kaffee koffie kopi barista '
    'baker backer boulang panader panific padaria pastel pasticc patiss konditor confeit bakkerij pizz publican bartend barkeep tavern '
    'taproom brewpub nightclub nightlife bistro brasserie eatery eateries cater katering traiteur franchis franqui waralaba lanchonete '
    'hamburgueria kuliner warung warkop kedai makanan minuman kitchen chef trattoria osteria gelater heladeria sorveteria izakaya '
    'kopitiam taqueria foodpreneur boba donut doughnut bagel burger bbq barbecue sushi ramen steakhouse kneipe imbiss gastgewerbe '
    'eisdiele kroeg lunchroom snackbar kawiarni piekarni cukierni lokanta pastane kahve mekan yiyecek alimentacao hospo besoksnaring '
    'utelivsbransjen serveringsbransjen').split() + [
    'food service', 'food truck', 'rumah makan', 'food business', 'food entrepreneur', 'food industry', 'street food', 'mobile food',
    'bubble tea', 'ice cream', 'yeme-icme', 'yeme icme', 'nha hang', 'quan an', 'quan ca phe', 'ca phe', 'tra sua', 'am thuc', 'an uong',
    'tiem banh', 'mo quan', 'quan nhau', 'alimentos y bebidas', 'alimentos e bebidas', 'pubblici esercizi', 'metiers de bouche',
    'fast casual', 'fast-casual', 'fast food', 'fast-food', 'quick service', 'quick-service', 'multi-unit', 'multi unit', 'front of house',
    'back of house', 'food cost', 'drinks industry', 'drinks business', 'drinks trade', 'on-trade', 'licensed trade', 'cake business',
    'cookie business', 'baking business']

ANCHOR_OTHER = (
    "ресторан кафе кофейн пекарн общепит кондитерск пиццери хорека фудтрак шеф-повар гостеприимств гастро бар питани кав'ярн "
    'مطعم مطاعم مقهى مقاهي كافيه كوفي مخبز مخابز ضيافة شيف اغذية '
    'रेस्टोरेंट रेस्टोरेन्ट रेस्तरां रेस्तराँ रेस्टॉरेंट कैफे ढाबा बेकरी फूड खाद्य किचन शेफ '
    '飲食 外食 レストラン カフェ 喫茶 居酒屋 パン屋 ベーカリー ラーメン 繁盛 キッチンカー 移動販売 料理人 シェフ 食堂 酒場 フード 間借り バー 焼肉 '
    'スナック 菓子店 ケーキ屋 弁当屋 たこ焼き 蕎麦屋 寿司屋 鮨屋 ビストロ '
    '식당 음식점 외식 요식 카페 빵집 베이커리 술집 주점 분식 치킨집 고깃집 장사 푸드트럭 셰프 레스토랑 커피 밥집 맛집 포차 이자카야 배달 요리사 '
    '餐 咖啡 烘焙 面包店 麵包店 奶茶 茶饮 茶飲 手搖 酒吧 小吃 火锅 火鍋 外卖 外賣 食肆 开店 開店 夜市 摆摊 擺攤 厨 廚 饭店 飯店 饭馆 飯館 便當 '
    '甜点店 甜點店 甜品店 饮料店 飲料店 烧烤店 燒烤店 小馆 小館 大排档 大排檔 拉面店 拉麵店 面馆 麵館 早餐店 '
    'อาหาร กาแฟ คาเฟ่ เบเกอรี่ ร้านขนม ชานม เชฟ สตรีทฟู้ด ร้านเหล้า เครื่องดื่ม บาร์').split() + ['فود ترك', 'चाय की दुकान']

# 要整词才算的短词：先用子串粗查，命中了再跑这条小正则
ANCHOR_WORD_PRE = ('bar', 'pub', 'diner', 'deli', 'roti', 'resto', 'chr', 'qsr', 'fnb', '&', 'wirt', 'krog')
ANCHOR_WORD = re.compile(r'\b(?:bars?|bares|pubs?|diners?|delis?|roti|resto|chr|qsr|fnb|f ?& ?b|wirt\w*|krog\w*)\b')

def anchored(t):
    """t 是 pilib.norm_text() 以后的文字。"""
    for s in ANCHOR_ASCII:
        if s in t:
            return True
    if not t.isascii():
        for s in ANCHOR_OTHER:
            if s in t:
                return True
    for s in ANCHOR_WORD_PRE:
        if s in t:
            return bool(ANCHOR_WORD.search(t))
    return False
