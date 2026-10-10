# 题材粗筛的关键词表。每一轮的版本另存在 rounds/ 目录，各轮的查全率记在 podcasts-phase1.md。
# 全部在 pilib.norm_text() 处理过的文字上匹配：小写、去 HTML、拉丁字母去重音
# （café→cafe、hostelería→hosteleria、bäckerei→backerei、nhà hàng→nha hang），阿拉伯语去音符并把 أ إ آ 写成 ا。
# 强信号：标题或简介里出现任何一条就算。
# 弱信号：一个「店或行业」词和一个「经营」词同时出现：两个词都在标题里，或在文字里相隔不超过 WINDOW 个字符。
import re

VENUE_EN = (r'restaurants?|cafes?|coffee ?shops?|coffee ?houses?|coffee bars?|bakery|bakeries|bars?|pubs?|taverns?|pizzerias?|'
            r'pizza shops?|food ?trucks?|food carts?|food stalls?|diners?|eatery|eateries|delis?|bistros?|taprooms?|brewpubs?|'
            r'nightclubs?|ice cream shops?|tea shops?|bubble tea shops?|boba shops?|juice bars?|donut shops?|bagel shops?|'
            r'sandwich shops?|burger joints?|catering (?:business|company)|food business(?:es)?|hospitality business(?:es)?|'
            r'hospitality venues?|cocktail bars?|wine bars?|steakhouses?|bbq joints?|sushi bars?|ramen shops?|dessert shops?')

GERMAN = re.compile(r'\b(?:und|der|die|das|fur|mit|uber|nicht|wir|ist|von|den|dem|ein|eine)\b')
FRENCH = re.compile(r'\b(?:le|les|des|et|une|pour|dans|avec|sur|nous|vous|est|qui)\b')

# （语言标记，正则，需要的上下文或 None）
STRONG = [
    # ---- 英语 ----
    ('en', r'\brestaurant (?:owners?|operators?|entrepreneurs?|business(?:es)?|industry|management|managers?|marketing|leaders?|'
           r'leadership|profits?|profitab\w+|consult\w+|coach\w*|success|startups?|founders?|franchis\w+|operations|tech\w*|'
           r'finance|accounting|growth|sales|professionals?|executives?|groups?|brands?|chains?|concepts?|world|space|people|life|'
           r'trends|news|ownership|investors?|unstoppable|strateg\w+|systems|staff\w*|teams?|workers?|pros)\b', None),
    ('en', r'\brestaurante?urs?\b|\brestauranteurs?\b', None),
    ('en', r'\b(?:own|owns|owning|owned|run|runs|running|open|opens|opening|opened|start|starting|started|operate|operating|'
           r'grow|growing|scale|scaling|manage|managing|launch|launching|launched|build|building|buy|buying|sell|selling) '
           r'(?:(?:a|an|your|their|his|her|my|our|the|own|new|first|second|successful|profitable|independent|small|local|'
           r'multiple|several|two|three|better|great|thriving|dream|next|more) )*(?:%s)\b' % VENUE_EN, None),
    ('en', r'\b(?:%s)[ -](?:owners?|operators?|entrepreneurs?|business(?:es)?|industry|management|managers?|marketing|profits?|'
           r'profitab\w+|startups?|founders?|ownership|consult\w+|coach\w*|franchis\w+|proprietors?|professionals?)\b' % VENUE_EN, None),
    ('en', r'\b(?:hospitality|foodservice|food service|food ?& ?beverage|food and beverage|food and drink|f ?& ?b|quick[- ]service|'
           r'fast[- ]casual|fast[- ]food|full[- ]service|catering|coffee|cafe|bar|pub|nightlife|bakery|baking|cake|cookie|'
           r'pizza|pizzeria|food ?truck|street food|mobile food|drinks|on[- ]trade|licensed trade)[ -]?(?:industry|business(?:es)?|operators?|'
           r'owners?|entrepreneurs?|professionals?|leaders|sector|trade|management|executives?)\b', None),
    ('en', r'\b(?:ghost|cloud|dark|virtual|commissary|commercial) kitchens?\b|\bvirtual (?:restaurants?|brands?)\b|\bqsr\b|'
           r'\bquick[- ]service restaurants?\b|\bfast[- ]casual\b|\bmulti[- ]unit (?:operators?|restaurants?|franchis\w+|brands?)\b|'
           r'\b(?:restaurant|food|qsr|pizza|coffee|burger|fast[- ]food|f&b) franchis\w+|\bfranchis\w+ restaurants?\b|'
           r'\bfoodservice\b|\bfood service\b|\bf ?& ?b\b|\bmicro ?baker(?:y|ies)\b|\bcottage (?:bakery|baker|food)\w*\b|'
           r'\bhome bakery\b|\bpublicans\b|\bchef[- /]+(?:and |& )?(?:owners?|proprietors?|restaurateurs?|partners?|founders?)\b|'
           r'\bowner[- /]+(?:and |& )?(?:chefs?|operators?)\b|\bhospo\b|\bindependent (?:restaurants?|cafes?|coffee shops?|pubs?|bars?)\b|'
           r'\bcoffee (?:pros|retail(?:ers?)?)\b|\b(?:life|work|working|career|careers|jobs?|people) in (?:the )?(?:hospitality|restaurants?|the restaurant)\b|\bhospitality (?:world|space|scene|workers?|people|pros|folks|careers?|operations)\b|\bfood cost\w*\b|\bfront of house\b|\bback of house\b|'
           r'\b(?:for|helps?|helping) (?:independent |local |small |busy |fellow )?(?:restaurants|restaurateurs|'
           r'bars|pubs|cafes|coffee shops|bakeries|food trucks|caterers)\b', None),
    # ---- 多国通用的行业词 ----
    ('xx', r'\bhoreca\b|\bho\.re\.ca\b|\bgastro[- ]?(?:business|podcast|branche|unternehm\w+|talk|marketing|bar)\b', None),
    # ---- 德语 ----
    ('de', r'\bgastronom(?:en|in|innen)?\b|\bgastgewerbe\w*|\bsystemgastronom\w*|\bgastronomiebetrieb\w*|\bgastrobetrieb\w*|'
           r'\bgastronomie(?:unternehm|branche|konzept|marketing|berat|grund)\w*|\bgastwirt\w*|\bwirtshaus\w*|'
           r'\b(?:restaurant|cafe|bar|kneipen|lokal|imbiss|backerei|konditorei|eisdielen|foodtruck)-?(?:betreiber|besitzer|inhaber|'
           r'grunder|leiter|manager)(?:in|innen|n)?\b|\b(?:restaurant|cafe|bar|kneipe|backerei|konditorei|imbiss|foodtruck|'
           r'eisdiele|gastronomie|gastro)\w* (?:eroffn|grund|fuhr|betreib|ubernehm|ubernomm)\w+|\beigene[sn]? (?:restaurant|cafe|lokal|bar|'
           r'backerei|kneipe|gastronomie)\b|\bhotellerie und gastronomie\b|\bgastronomie und hotellerie\b|\bbackerhandwerk\w*|'
           r'\bbacker(?:ei|eien)?[- ]?(?:unternehm|inhaber|branche|betrieb)\w*', None),
    ('de', r'\bgastro\b|\bwirt(?:e|en|in|innen)\b', GERMAN),
    # ---- 法语 ----
    ('fr', r'\brestaurat(?:eur|eurs|rice|rices)\b|\b(?:ouvrir|ouverture d\'|creer|gerer|tenir|lancer|monter|reprendre|ouvert|cree) '
           r'(?:un |une |son |sa |ton |ta |votre |leur |mon |ma |le |la |des |leurs |ses )?(?:propre |premier |premiere )?(?:restaurant|cafe|bar|'
           r'boulangerie|food ?truck|coffee ?shop|salon de the|bistrot|brasserie|patisserie|pizzeria|creperie)s?\b|'
           r'\b(?:professionnels?|metiers?|entrepreneurs?|acteurs?|secteur|monde|univers|patrons?|independants?|business|industrie|filiere|marche) '
           r'(?:de|dans|en) (?:la |l\')?(?:restauration|hotellerie[- ]restauration|boulangerie|bouche|food)\b|'
           r'\bentreprendre (?:en|dans la) restauration\b|\brestauration (?:rapide|commerciale|independante|collective|traditionnelle|hors domicile)\b|'
           r'\bhotellerie[- ](?:et |& )?restauration\b|\bcafes?,? hotels?,? restaurants?\b|\b(?:patron|patronne|gerant|gerante|'
           r'proprietaire|fondateur|fondatrice|dirigeant)s? (?:de|d\'un|d\'une|du) (?:restaurant|bar|cafe|bistrot|boulangerie|brasserie|'
           r'coffee ?shop|food ?truck|patisserie)s?\b|\bartisans? boulangers?\b|\bboulang(?:er|ers|ere)s?[- ](?:patissiers?|entrepreneurs?)\b|'
           r'\bmetiers de bouche\b|\bfranchise (?:de )?restauration\b|\bbistrotiers?\b|\bcafetiers?\b', None),
    ('fr', r'\bchr\b', FRENCH),
    # ---- 西班牙语 ----
    ('es', r'\bhosteler[oa]s?\b|\brestauranter[oa]s?\b|\bduen[oa]s? de (?:un |una |su |el |la )?(?:restaurante|bar|cafeteria|cafe|panaderia|'
           r'pasteleria|negocio gastronomico|negocio de comida|local|taqueria|food ?truck)s?\b|\bnegocios? (?:gastronomic\w+|de restauracion|'
           r'de hosteleria|de comida|de alimentos y bebidas|de restaurantes?|de cafeteria|hosteler\w+|de alimentos)\b|'
           r'\b(?:abrir|montar|emprender|administrar|gestionar|gestion de|rentabilizar|operar|dirigir|llevar|tener) (?:un |una |tu |su |mi |el |la )?'
           r'(?:propio |propia )?(?:restaurante|bar|cafeteria|panaderia|pasteleria|food ?truck|negocio gastronomico|negocio de comida|'
           r'negocio de hosteleria|local de hosteleria)s?\b|\b(?:sector|industria|gremio|empresarios?|emprendedor\w*|profesionales|'
           r'marketing|gestion|consultor\w*|negocio|direccion) (?:de |del |de la |en |en la |para )?(?:la )?(?:hosteler\w+|restauracion|restaurantes?|'
           r'gastronomic\w+|restauranter\w+|hospitalidad|alimentos y bebidas|horeca)\b|\bemprend\w+ gastronomic\w+\b|'
           r'\bgastronomic\w+ (?:emprend\w+|rentab\w+|exitos\w+)\b|\bpara (?:restaurantes|hosteleros|restauranteros|bares y restaurantes)\b|'
           r'\bbares y restaurantes\b|\brestaurantes y bares\b|\bhosteleria\b', None),
    # ---- 葡萄牙语 ----
    ('pt', r'\bdon[oa]s? de (?:um |uma |seu |sua )?(?:restaurante|bar|lanchonete|padaria|cafeteria|pizzaria|hamburgueria|food ?truck|'
           r'confeitaria|negocio de alimentacao|delivery|bares)s?\b|\bgest(?:ao|or|ores) de (?:restaurantes?|bares|food service|'
           r'negocios de alimentacao|alimentos e bebidas|a&b|padarias?|cafeterias?)\b|\bbares e restaurantes\b|\brestaurantes e bares\b|'
           r'\balimentacao fora do lar\b|\bempreend\w+ (?:gastronomic\w+|na gastronomia|no food service|em alimentacao)\b|'
           r'\b(?:negocios?|mercado|setor|segmento|ramo) (?:gastronomic\w+|de alimentacao|de comida|de gastronomia|de food ?service|'
           r'de restaurantes?|de bares|de alimentos e bebidas)\b|\b(?:abrir|montar|gerir|administrar|ter) (?:um |uma |seu |sua |o seu |a sua )?'
           r'(?:proprio |propria )?(?:restaurante|bar|lanchonete|padaria|cafeteria|pizzaria|hamburgueria|confeitaria|food ?truck)\b|'
           r'\bpara (?:restaurantes|donos de restaurantes?|bares e restaurantes)\b|\bempresarios? (?:do setor de alimentacao|gastronomic\w+)\b|'
           r'\bconfeitar\w+ (?:empreend\w+|lucrativ\w+|de sucesso)\b', None),
    # ---- 意大利语 ----
    ('it', r'\bristorat(?:ore|ori|rice|rici)\b|\bristorazione\b|\b(?:aprire|gestire|gestione di|avviare|gestisce|aperto) (?:un |una |il tuo |'
           r'la tua |il proprio |la propria |il suo |la sua )?(?:ristorante|bar|locale|pizzeria|caffetteria|pasticceria|gelateria|panificio|'
           r'attivita di ristorazione|food ?truck)\b|\bimprenditor\w+ (?:della ristorazione|del food|nel food|del settore food)\b|'
           r'\b(?:titolar[ei]|gestor[ei]|proprietar\w+) di (?:un |una )?(?:ristorant[ei]|bar|local[ei]|pizzeri[ae]|pasticceri[ae])\b|'
           r'\bpubblici esercizi\b|\bgestione (?:del |di un |dei )?(?:ristorant[ei]|local[ei]|bar)\b', None),
    # ---- 荷兰语、北欧、波兰语 ----
    ('nl', r'\bhoreca\w*|\b(?:restaurant|cafe|kroeg|koffiebar|bakkerij|lunchroom|snackbar)-?(?:eigenaar|eigenaren|houder|houders|baas|ondernemer|ondernemers)\b|'
           r'\beigen (?:restaurant|cafe|koffiebar|bakkerij|lunchroom|zaak in de horeca|horecazaak)\b|\bbakkers?ondernemers?\b|\bkroegbaas\b', None),
    ('sv', r'\brestaurangbransch\w*|\bkrogare\b|\bkrogbransch\w*|\brestaurat[oø]r(?:er|en)?\b|\brestaurationsbranchen\b|'
           r'\brestaurantbranchen\b|\brestaurangagare\b|\butelivsbransjen\b|\bserveringsbransjen\b|\bbesoksnaring\w*', None),
    ('pl', r'\bbranz[ay] gastronomiczn\w+|\bbiznes\w* gastronomiczn\w+|\bgastronomi\w+ biznes\w*|\brestaurator(?:ow|zy|em)\b|'
           r'\bwlasciciel\w* (?:restauracji|kawiarni|baru|lokalu|piekarni|cukierni)\b|\bprowadz\w+ (?:restauracj\w+|kawiarni\w+|lokal\w* gastronomiczn\w+)', None),
    # ---- 土耳其语 ----
    ('tr', r'\b(?:restoran|restorant|kafe|cafe|lokanta|pastane|mekan|kahve dukkani|kahveci)\w* (?:isletme\w*|sahib\w*|sahipleri|yonetim\w*|'
           r'sektor\w*|girisim\w*|pazarlama\w*|acmak|isletmeci\w*)|\byeme[- ]icme (?:sektor\w*|isletme\w*|dunya\w*|girisim\w*)|'
           r'\byiyecek[- ](?:ve )?icecek (?:sektor\w*|isletme\w*)|\bgastronomi (?:sektor\w*|girisim\w*|isletme\w*)|\brestoran isletmeciligi\b|'
           r'\bisletmeci\w* (?:restoran|kafe|cafe)\w*', None),
    # ---- 印尼语、马来语 ----
    ('id', r'\b(?:bisnis|usaha|pengusaha|pebisnis|industri|wirausaha|bisnes|perniagaan|usahawan|peniaga|niaga) '
           r'(?:kuliner|makanan|f ?& ?b|fnb|restoran|kafe|cafe|kopi|kedai kopi|coffee ?shop|warung|minuman|katering|roti|bakery|'
           r'kedai makan|makanan dan minuman|resto|warkop)\b|\b(?:pemilik|owner|buka|membuka|punya|mengelola|kelola) '
           r'(?:restoran|kafe|cafe|warung|kedai kopi|coffee ?shop|usaha kuliner|resto|kedai makan|rumah makan|warkop)\b|'
           r'\b(?:franchise|waralaba) (?:makanan|kuliner|minuman|f&b)\b|\bkulinerpreneur\b|\bfoodpreneur\w*', None),
    # ---- 越南语（去声调以后）----
    ('vi', r'\b(?:kinh doanh|khoi nghiep|van hanh|quan ly|quan tri|nganh|chuoi|nhuong quyen|mo hinh) '
           r'(?:nha hang|quan an|an uong|quan ca phe|ca phe|cafe|f ?& ?b|am thuc|tra sua|do an|quan nhau|tiem banh|dich vu an uong)\b|'
           r'\bmo (?:quan (?:an|ca phe|cafe|nhau|tra sua|com|pho|bun|oc|lau)|nha hang|tiem banh|tiem ca phe)\b|'
           r'\bchu (?:nha hang|tiem banh|quan (?:an|ca phe|cafe|nhau|tra sua|com|pho))\b', None),
    # ---- 俄语、乌克兰语 ----
    ('ru', r'ресторатор|ресторанн\w+ (?:бизнес|индустри|рын|дел)|ресторанний бізнес|общепит|бизнес\w* в (?:общепите|ресторан)|'
           r'владел\w+ (?:ресторан|кафе|бар(?:а|ов|ами)?\b|кофейн|пекарн|кондитерск)|власник\w* (?:ресторан|кафе|кав\'ярн|закладу)|'
           r'откры\w+ (?:свой |свою |своё |свое )?(?:ресторан|кафе|бар\b|кофейн|пекарн|кондитерск|пиццери)|'
           r'відкри\w+ (?:свій |свою |власн\w+ )?(?:ресторан|кафе|кав\'ярн|пекарн)|хорека|'
           r'управлени\w+ ресторан|кофейн\w+ бизнес|бизнес\w* кофейн|индустри\w+ гостеприимства|гастробизнес|гастропредпринимател|'
           r'(?:ресторан|кафе|кофейн|пекарн|общепит)\w* (?:бизнес|франшиз)|франшиз\w+ (?:кафе|ресторан|кофейн|общепит)', None),
    # ---- 阿拉伯语 ----
    ('ar', r'(?:صاحب|اصحاب|ملاك|مالك|مؤسس|قطاع|ادارة|مشروع|مشاريع|تشغيل|صناعة|مجال|تجارة|بزنس|افتتاح|فتح|تسويق|ارباح|استثمار) '
           r'(?:ال)?(?:مطعم|مطاعم|مقهى|مقاهي|كافيه|كافيهات|كوفي|مخبز|مخابز|ضيافة|اغذية والمشروبات|اغذية ومشروبات)|'
           r'المطاعم والمقاهي|المطاعم والكافيهات|مطاعم وكافيهات|الاغذية والمشروبات|ريادة الاعمال في (?:قطاع )?المطاعم', None),
    # ---- 印地语（也常写成英语，由英语规则接住）----
    ('hi', r'(?:रेस्टोरेंट|रेस्टोरेन्ट|रेस्तरां|रेस्तराँ|रेस्टॉरेंट|कैफे|ढाबा|बेकरी|फूड|खाद्य|क्लाउड किचन|फूड ट्रक) '
           r'(?:बिजनेस|बिजनस|व्यवसाय|मालिक|कारोबार|खोल\w*|चलान\w*|उद्यमी|स्टार्टअप)|क्लाउड किचन|फूड ट्रक', None),
    # ---- 日语 ----
    ('ja', r'飲食店(?:の)?(?:経営|オーナー|開業|集客|売上|店主|主|向け|コンサル|運営|起業|独立|ビジネス|専門|経営者|店長|業界|を経営|を開|を営|をやって|の作り方|開店)|'
           r'飲食(?:経営|業界|ビジネス|コンサル|起業|人|業|事業|企業|関係者|プロデュー)|外食(?:産業|業界|ビジネス|経営|企業|チェーン|ニュース|トレンド|市場|最前線)|繁盛店|'
           r'(?:カフェ|喫茶店|居酒屋|(?<![ァ-ヶー])バー|ラーメン[店屋]|パン屋|ベーカリー|レストラン|焼肉店|食堂|スナック|菓子店|ケーキ屋|弁当屋|たこ焼き屋|蕎麦屋|寿司屋|鮨屋|酒場|ビストロ)'
           r'(?:の)?(?:経営|開業|オーナー|店主|を経営|を開業|を開いた|を開く|を営|起業|独立|の開き方|の作り方|集客)|オーナーシェフ|キッチンカー|移動販売|'
           r'フードビジネス|フードトラック|飲食フランチャイズ|飲食で独立|間借り(?:営業|カレー|カフェ)|ゴーストレストラン', None),
    # ---- 韩语 ----
    ('ko', r'외식업|요식업|외식 ?경영|외식 ?창업|외식 ?산업|외식 ?사업|외식 ?프랜차이즈|외식 ?컨설|외식 ?자영업|외식인|'
           r'(?<!네이버 )(?<!다음 )(?:식당|음식점|카페|빵집|베이커리|술집|주점|치킨집|고깃집|분식집|밥집|맛집|커피숍|디저트 ?카페|포차|이자카야|레스토랑|푸드트럭|배달 ?전문점) ?'
           r'(?:창업|운영|사장|경영|점주|장사|개업|폐업|매출|사업|대표|주인|오너|마케팅|컨설팅)|음식 ?장사|장사의 ?신|장사 ?노하우|푸드트럭|오너 ?셰프|골목 ?식당', None),
    # ---- 中文（简繁）----
    ('zh', r'餐[饮飲](?:创业|創業|经营|經營|老板|老闆|人|行业|行業|业|業|管理(?!有限|公司|股份)|营销|行銷|连锁|連鎖|加盟|品牌|生意|门店|門店|外卖|外送|顾问|顧問|咨询|諮詢|'
           r'从业|從業|投资|投資|企业|企業|商业|商業|店主|创始人|創辦人|圈|界|市场|市場|零售|数字化|數位|运营|營運|供应链|供應鏈)|'
           r'[开開](?:一[家间間]|了|过|過|间|間|家)?(?:餐[厅廳馆館]|咖啡[店馆館廳厅]|奶茶店|[饮飲]料店|[面麵]包店|烘焙[店坊]|酒吧|[饭飯][店馆館]|小吃店|'
           r'火[锅鍋]店|早餐店|便當店|甜[点點品]店|茶[饮飲]店|手搖[飲店]|居酒屋|小館|拉[面麵]店|[烧燒]烤店|快餐店|[面麵]館|面馆)|'
           r'(?:餐[厅廳馆館]|咖啡[店馆館廳厅]|奶茶店|[饮飲]料店|[面麵]包店|烘焙[店坊]|酒吧|小吃店|火[锅鍋]店|早餐店|甜[点點品]店|茶[饮飲]店|手搖[飲店]|居酒屋|'
           r'[烧燒]烤店|快餐店|小[馆館]|食肆|茶餐[厅廳]|大排[档檔]|夜市|[摆擺][摊攤]|餐[车車]|外[卖賣]店?)(?:的)?(?:老板|老闆|[经經][营營]|[创創][业業]|管理|店[长長]|'
           r'主理人|店主|[创創][始办辦]人|[营營][销運]|行銷|生意|加盟|[连連][锁鎖])|[开開]店(?:创业|創業|指南|笔记|筆記|日[记記]|经验|經驗|心得)|'
           r'茶[饮飲](?:行业|行業|业|業|品牌|加盟|创业|創業)|烘焙(?:创业|創業|行业|行業|业者|業者|店主)|手搖[飲饮](?:业|業|品牌|加盟|創業)|'
           r'咖啡(?:创业|創業|行业|行業|产业|產業|职人|從業|从业)|[摆擺][摊攤](?:创业|創業)|夜市(?:創業|创业|[摊攤]商)|餐[车車](?:創業|创业)|'
           r'外[卖賣](?:运营|運營|營運|商家|创业|創業)|食肆(?:經營|东主|東主|老闆)', None),
    # ---- 泰语 ----
    ('th', r'(?:ธุรกิจ|แฟรนไชส์|ผู้ประกอบการ|เจ้าของ)(?:ร้าน)?(?:อาหาร|กาแฟ|คาเฟ่|เบเกอรี่|ขนม|เครื่องดื่ม|ชานม|เหล้า|บาร์|สตรีทฟู้ด)|'
           r'(?:เปิด|ทำ|คนทำ|บริหาร|การตลาด)ร้าน(?:อาหาร|กาแฟ|ขนม|เหล้า|เบเกอรี่|ชานม|เครื่องดื่ม)|(?:เปิด|ทำ)(?:คาเฟ่|บาร์)', None),
]

BIZ_LATIN = (
    r'\b(?:business(?:es)?|owners?|ownership|entrepreneur\w*|operators?|operations|ops|management|managers?|marketing|profit\w*|revenue|'
    r'margins?|startups?|start-ups?|founders?|co-founders?|industry|leadership|leaders?|consult\w+|coach(?:ing|es)?|staffing|hiring|'
    r'labor costs?|p&l|proprietors?|ceo|investors?|small business|'
    r'unternehm\w+|inhaber\w*|betreiber\w*|grunder\w*|geschaftsfuhr\w+|selbststandig\w*|branche|umsatz|gewinn\w*|fachkraftemangel|'
    r'entreprendre|entreprise\w*|gerants?|dirigeants?|fondateurs?|fondatrices?|rentabilite|chiffre d\'affaires|gestion|'
    r'negocios?|empresari\w+|emprend\w+|duen[oa]s?|propietari\w+|rentab\w+|fundador\w*|gerentes?|'
    r'empreend\w+|don[oa]s?|proprietari\w+|lucro\w*|faturamento|gestao|gestor\w*|franquead\w+|'
    r'imprenditor\w+|titolar[ei]|gestor[ei]|fatturato|impresa|imprese|'
    r'ondernem\w+|eigenaar|eigenaren|omzet|'
    r'bisnis|usaha|pengusaha|pemilik|bisnes|perniagaan|usahawan|untung|'
    r'kinh doanh|khoi nghiep|doanh thu|loi nhuan|'
    r'isletme\w*|girisim\w*|sahib\w*|ciro|biznes\w*|wlasciciel\w*|przedsiebior\w+)\b')

# （标记，窗口，店或行业的词，经营的词，限定语言或 None）
WEAK = [
    ('latin', 100,
     r'\b(?:restaurants?|restaurantes?|ristorant[ei]|restaurang\w*|restoran\w*|restauracj\w*|bakery|bakeries|backerei\w*|boulangerie\w*|'
     r'panaderia\w*|padaria\w*|panificio|pasticceri\w+|patisserie\w*|pasteleria\w*|confeitaria\w*|konditorei\w*|bakkerij\w*|pizzeria\w*|'
     r'pizzaiol\w+|pubs?|bartend\w+|barkeeper\w*|barista\w*|baristi|coffee ?shops?|coffee ?houses?|cafeteria\w*|caffetteri\w+|kafe|'
     r'kedai kopi|warung\w*|rumah makan|kedai makan|kuliner|lanchonete\w*|hamburgueria\w*|street food|food ?trucks?|diners?|eatery|'
     r'eateries|catering(?! to\b)|caterers?|traiteurs?|hospitality|gastronomie|gastronomia|gastronomi|gastronomy|gastro|taprooms?|brewpubs?|'
     r'bistros?|bistrots?|brasseries?|trattori[ae]|osteri[ae]|gelateri[ae]|heladeria\w*|sorveteria\w*|izakaya|kopitiam|taqueria\w*|'
     r'cuisiniers?|cocineros?|cozinheiros?|restauration|restauracion|kneipen?|imbiss\w*|nha hang|quan an|'
     r'quan ca phe|tra sua|lokanta\w*|pastane\w*|kahveci\w*|kawiarni\w*|specialty coffee|speciality coffee|bubble tea)\b',
     BIZ_LATIN, None),
    ('chef', 100, r'\bchefs?\b(?! d\'| de | des | du )', BIZ_LATIN, {'en', 'es', 'pt', 'it', 'und', 'id', 'ms', 'tl'}),
    ('ja', 30, r'飲食店|飲食業|飲食|外食|レストラン|カフェ|居酒屋|喫茶店|パン屋|ベーカリー|ラーメン[屋店]|食堂|焼肉|酒場|料理人|シェフ',
     r'経営|開業|起業|独立|集客|売上|利益|店主|オーナー|経営者|マーケティング|繁盛|創業|出店|店長|フランチャイズ|原価|人手不足|採用|資金繰り|閉店|廃業|商売', {'ja'}),
    ('ko', 30, r'식당|음식점|(?<!네이버 )(?<!다음 )카페|외식|빵집|베이커리|술집|주점|분식|치킨집|고깃집|레스토랑|셰프|요리사|커피',
     r'창업|경영|운영|사장|매출|프랜차이즈|마케팅|점주|폐업|개업|노하우|컨설팅|자영업|장사|대표님|순이익|임대료|상권', {'ko'}),
    ('zh', 30, r'餐[饮飲厅廳馆館]|咖啡[店馆館廳厅师師]|[面麵]包店|烘焙|奶茶|茶[饮飲]|手搖|[饮飲]料店|酒吧|小吃|快餐|火[锅鍋]|餐[车車]|食肆|茶餐|大排[档檔]|便當|早餐店|'
     r'甜[点點品]店|居酒屋|[厨廚][师師]|主[厨廚]|外[卖賣]|夜市|[摆擺][摊攤]|[饭飯]店',
     r'[创創][业業]|[经經][营營]|老板|老闆|[开開]店|加盟|[连連][锁鎖]|管理|[营營][销銷]|行銷|生意|店[长長]|[门門]店|[营營][业業][额額]|利[润潤]|成本|'
     r'[创創][始办辦]人|品牌|主理人|店主|[顾顧][问問]|商[业業]|[赚賺][钱錢]|选址|選址|房租|翻[台桌]率', {'zh'}),
    ('th', 40, r'ร้านอาหาร|ร้านกาแฟ|คาเฟ่|เบเกอรี่|ร้านเหล้า|ร้านขนม|ชานม|เชฟ|สตรีทฟู้ด|อาหาร',
     r'ธุรกิจ|เจ้าของ|ผู้ประกอบการ|กำไร|ยอดขาย|การตลาด|แฟรนไชส์|ต้นทุน|เปิดร้าน|บริหาร|sme|ขายดี|เจ๊ง', None),
    ('ru', 50, r'ресторан\w*|кафе|кофейн\w*|пекарн\w*|кондитерск\w*|пиццери\w*|\bбар(?:а|ы|ов|е|ом|ах)?\b|шеф-повар\w*|фудтрак\w*|общественно\w+ питани\w+',
     r'бизнес\w*|владел\w+|предпринимател\w+|управлен\w+|франшиз\w*|выручк\w+|прибыл\w+|маркетинг\w*|основател\w+|бізнес\w*|власник\w*|підприєм\w+', None),
    ('ar', 50, r'مطعم|مطاعم|مقهى|مقاهي|كافيه|كوفي شوب|مخبز|مخابز|شيف|ضيافة|فود ترك',
     r'مشروع|مشاريع|بزنس|تجارة|ريادة|رواد|ادارة|تسويق|ارباح|استثمار|صاحب|اصحاب|مؤسس|امتياز|فرنشايز', None),
    ('hi', 50, r'रेस्टोरेंट|रेस्टोरेन्ट|रेस्तरां|रेस्तराँ|कैफे|ढाबा|बेकरी|फूड|खाद्य|चाय की दुकान|शेफ',
     r'बिजनेस|बिजनस|व्यवसाय|मालिक|कारोबार|उद्यमी|स्टार्टअप|मुनाफा|कमाई|फ्रेंचाइजी', None),
]

# 单独成立的弱信号（不要求「经营」词）。范围 title 只看标题，any 看标题和简介。
WEAK_SINGLE = [
    # 标题里有行业用词或店的种类（查全用；里面会有写给食客的节目，留给下一步读标题和简介的模型去分）
    ('tw', 'title',
     r'\b(?:restaurants?|restaurantes?|ristorant[ei]|restaurang\w*|restoran\w*|restaurateurs?|hospitality|gastronomie|hosteleria|horeca|'
     r'ristorazione|restauration|foodservice|food service|bakery|bakeries|boulangerie|panaderia|padaria|backerei|pizzeria|baristas?|'
     r'bartenders?|coffee ?shops?|food ?trucks?|catering)\b|餐[饮飲]|飲食店|外食|외식|요식|开店|開店|ร้านอาหาร|ресторан|مطعم|مطاعم|रेस्टोरेंट|\bnha hang\b'),
    # 店主口吻
    ('own', 'any',
     r'\b(?:my|our) (?:(?:own|little|small|family|first|new) )*(?:restaurants?|cafe|coffee ?shop|bakery|bar(?! exam| review| association| tab)|pub|food ?truck|pizzeria|diner|'
     r'bistro|brewpub|taproom|eatery|deli|catering (?:business|company))\b|'
     r'\b(?:unser|unsere[mnrs]?|mein|meine[mnrs]?) (?:eigene[sn]? |kleine[sn]? )?(?:restaurant|cafe|lokal|wirtshaus|bistro|backerei|kneipe|gasthaus|gasthof)\b|'
     r'\b(?:mon|notre) (?:propre |petit )?(?:restaurant|bistrot|bar|boulangerie|salon de the|coffee ?shop)\b|'
     r'\b(?:mi|nuestro|nuestra) (?:propio |propia )?(?:restaurante|bar|cafeteria|panaderia|pasteleria|taqueria)\b|'
     r'\b(?:meu|nosso|minha|nossa) (?:proprio |propria )?(?:restaurante|bar|lanchonete|padaria|cafeteria|pizzaria|hamburgueria|confeitaria)\b|'
     r'\b(?:il mio|il nostro|la mia|la nostra) (?:ristorante|locale|bar|pizzeria|pasticceria|trattoria|osteria)\b|'
     r'\b(?:mijn|ons|onze) (?:eigen )?(?:restaurant|cafe|bakkerij|koffiebar)\b'),
]
_WEAK_SINGLE = [(tag, scope, re.compile(rx)) for tag, scope, rx in WEAK_SINGLE]

_STRONG = [(lang, re.compile(rx), ctx) for lang, rx, ctx in STRONG]
_WEAK = [(lang, win, re.compile(a), re.compile(b), only) for lang, win, a, b, only in WEAK]

# 扫整库时用的宽口径词根表在 anchor.py。

HEAD = 300

def classify(title_n, desc_n, lang='und'):
    """返回（'strong'|'weak'|''，命中的规则，位置）。title_n、desc_n 是 norm_text() 以后的文字。
    位置：title 命中在标题里；head 在简介前 300 个字符里；tail 在更后面（多半只是顺带提到）。"""
    sep = ' ¦ '
    text = title_n + sep + desc_n
    off = len(title_n) + len(sep)
    def where(pos):
        return 'title' if pos < len(title_n) else 'head' if pos - off < HEAD else 'tail'
    best = None
    for tag, rx, ctx in _STRONG:
        m = rx.search(text)
        if m and (ctx is None or ctx.search(text)):
            if best is None or m.start() < best[0]:
                best = (m.start(), tag + ':' + m.group(0)[:60])
    if best:
        return 'strong', best[1], where(best[0])
    for tag, win, ra, rb, only in _WEAK:
        if only is not None and lang not in only:
            continue
        ta = ra.search(title_n)
        if ta and rb.search(title_n):
            return 'weak', tag + ':title:' + ta.group(0)[:30], 'title'
        A = [m.start() for m in ra.finditer(text)]
        if not A:
            continue
        B = [m.start() for m in rb.finditer(text)]
        if not B:
            continue
        for a in A:
            for b in B:
                if abs(a - b) <= win:
                    return 'weak', tag + ':' + text[max(0, min(a, b)):max(a, b) + 20][:80], where(max(a, b))
    for tag, scope, rx in _WEAK_SINGLE:
        m = rx.search(title_n if scope == 'title' else text)
        if m:
            return 'weak', tag + ':' + m.group(0)[:60], where(m.start())
    return '', '', ''
