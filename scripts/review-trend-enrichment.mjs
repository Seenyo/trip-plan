// Editorial summaries of recurring review themes. Source pages were checked on 2026-09-24.
// Store short paraphrases only; do not copy review text or reviewer details.
export const reviewTrendDate = '2026-09-24';

const trend = (text, sources) => ({
  title: `レビューで多い傾向（${reviewTrendDate}確認）`,
  text,
  sources,
});

const review = (title, url) => ({ title, url });

export const reviewTrends = {
  'iceland-kef-arrival': [trend(
    'レンタカー利用者のレビューでは、空港外営業所へのシャトルがスムーズという声と、会社名・乗り場が分かりにくいという声が併記される。予約票で営業所の住所・ブランド名・シャトル乗り場を照合し、到着後は空港案内の「Other Buses」エリアを確認する。',
    [review('レンタカー利用者の傾向', 'https://www.northbound.is/car-rental/kef-airport-reviews'), review('KEF空港：レンタカーとシャトル', 'https://www.kefairport.is/en/services/car-rental')],
  )],
  'iceland-car-pickup': [trend(
    '空港で受け取るつもりでも営業所がターミナル外だった、というレビューがある。受取時は車体の傷・燃料・保険・緊急連絡先を撮影して保存し、疲れた状態で急いで出発しない。',
    [review('レンタカー利用者の傾向', 'https://www.northbound.is/car-rental/kef-airport-reviews'), review('KEF空港：レンタカー案内', 'https://www.kefairport.is/en/services/car-rental')],
  )],
  'iceland-golden-circle': [trend(
    'レビューでは、地質・歴史・滝・間欠泉を短時間でまとめて見られる点が高評価。一方、昼前後は大型バスや駐車待ちが目立つという声も多い。朝早く出るか、到着日の疲れに合わせて翌朝へ分けると動きやすい。',
    [review('ゴールデンサークルのレビュー傾向', 'https://www.tripadvisor.com/Attraction_Review-g3676471-d261431-Reviews-Golden_Circle_Route-South_Region.html'), review('シンクヴェリトル公式：駐車サービス', 'https://www.thingvellir.is/en/service/parking-service/')],
  )],
  'iceland-golden-circle-rest': [trend(
    '主要スポットを一日で回れることが人気だが、各駐車場から歩く時間と人混みで想定より時間が延びるという声がある。グトルフォスは風としぶきで冷えやすく、公式の歩道・駐車案内を優先する。',
    [review('ゴールデンサークルのレビュー傾向', 'https://www.tripadvisor.com/Attraction_Review-g3676471-d261431-Reviews-Golden_Circle_Route-South_Region.html'), review('グトルフォス公式：駐車場', 'https://www.gullfoss.org/parking/')],
  )],
  'iceland-efra-sel': [trend(
    '静かな郊外の立地、快適なベッド、セルフサービス型の気軽さが好意的に語られる。一方、共用キッチンは宿泊者が重なると狭く感じる、朝食は付かないという指摘もある。食料はフルージル側で先に買い、洗濯機や共有設備は到着前に宿へ確認する。',
    [review('Efra Sel Hostel：確認済みレビュー', 'https://www.booking.com/reviews/is/hotel/efra-sel-hostel-fludir.nl.html'), review('南アイスランド公式資料：Efra-Sel', 'https://www.south.is/static/files/brochures/south-2016-17-low.pdf')],
  )],
  'iceland-seljalandsfoss': [trend(
    '滝の裏側まで歩ける体験と、駐車場から近く短時間でも寄れる点が高評価。裏側の道は濡れやすく滑る、混雑時は細い道が詰まるという声が繰り返される。レインウェア上下、防水靴、スマホ用の防水袋を準備する。',
    [review('セリャラントスフォスのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g608875-d555030-Reviews-Seljalandsfoss_waterfall-Hella_South_Region.html'), review('セリャラントスフォス公式：駐車場', 'https://seljalandsfoss.org/parking/')],
  )],
  'iceland-skogafoss': [trend(
    '駐車場からすぐ見える迫力と、階段の上からの別景観が好評。上段へは400段前後の階段が負担、水しぶきで濡れる、昼は混雑するという声も多い。まず下段で見学し、体力と時間があれば上段へ進む。',
    [review('スコゥガフォスのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g608884-d555031-Reviews-or2040-Skogafoss-Skogar_South_Region.html'), review('スコゥガフォス公式：駐車場・トイレ', 'https://skogafoss.org/parking/')],
  )],
  'iceland-reynisfjara': [trend(
    '黒砂、柱状節理、海食柱は強く印象に残るという評価が多い。一方、突然のスニーカウェーブへの警告もほぼ共通している。海に背を向けず、波打ち際や洞窟へ近づかず、警告・閉鎖があれば入らない。',
    [review('レイニスフィヤラのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g189978-d8004333-Reviews-Reynisfjara_Beach-Vik_South_Region.html'), review('アイスランド観光局：安全案内', 'https://www.ferdamalastofa.is/en/news/increased-safety-and-better-information-with-new-signs-in-reynisfjara-black-sand-beach')],
  )],
  'iceland-vik-shopping': [trend(
    'ヴィークは観光地というより、南海岸の食料・燃料・軽食・衣類を補給する小さなサービス拠点として評価される。大型都市の品揃えを期待せず、氷河方面へ進む前に水・朝食・軽食を確保する。',
    [review('ヴィークのサービス案内', 'https://visitvik.is/'), review('Krónan Vík公式', 'https://kronan.is/verslanir/148')],
  )],
  'iceland-vik-stay': [trend(
    '1908 Hostel by Tröllは中心部・黒砂海岸に近く、無料駐車、共同キッチン、朝食が便利という評価がある。一方、部屋の狭さ、階段・防音、キッチンの混雑、共用浴室の利用が気になるという声もある。遅い時間の自炊を避け、階段で荷物を運ぶ前提にする。',
    [review('1908 Hostel by Tröll：施設・レビュー', 'https://www.booking.com/hotel/is/welcome-puffin-hostel.en-gb.html'), review('Vík Tröll Hótel by Troll.isのレビュー', 'https://www.tripadvisor.com/Hotel_Review-g189978-d6509643-Reviews-Vik_Troll_Hotel_by_Troll_is-Vik_South_Region.html')],
  )],
  'iceland-katla-tour': [trend(
    'スーパージープで黒い砂原を進み、火山下の氷洞・氷河を歩く体験が旅のハイライトという声が多い。揺れの強い移動や登り道が負担という声、氷洞は季節や融解で写真と変わるという注意もある。集合場所・服装・催行会社の当日判断を優先する。',
    [review('カトラ氷洞ツアーのレビュー', 'https://www.viator.com/tours/Vik/Ice-Cave-underneath-the-Volcano/d25269-50287P20'), review('Visit Vík：Katlatrack', 'https://visitvik.is/katlatrack/')],
  )],
  'iceland-vatnajokull': [trend(
    '氷河を背景に複数のトレイルを歩けるスケール感、ビジターセンター・カフェ・トイレの使いやすさが高評価。短時間では足りなかったという声も多いので、当日のトレイル状態を確認し、氷河上へはガイドなしで入らない。',
    [review('スカフタフェルのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g612424-d522831-Reviews-Skaftafell_National_Park-Vatnajokull_National_Park_East_Region.html'), review('ヴァトナヨークトル国立公園公式', 'https://www.vatnajokulsthjodgardur.is/en')],
  )],
  'iceland-diamond-beach': [trend(
    '黒砂に打ち上がる氷の大きさ・青さと、ヨークルスアゥルロゥンから歩いて組み合わせられる点が人気。氷の量は日によって変わり、砂が靴に入りやすいという実用的な声もある。氷に登らず、風雨が強ければ滞在を短くする。',
    [review('ダイヤモンドビーチのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g12344476-d23692562-Reviews-Diamond_Beach-Jokulsarlon_East_Region.html'), review('ヨークルスアゥルロゥン公式', 'https://www.vatnajokulsthjodgardur.is/en/areas/jokulsarlon')],
  )],
  'iceland-hali-stay': [trend(
    'Skyrhúsiðは氷河湖から近く、清潔で静か、スタッフ・ベッド・景色が良いという評価が集中する。共用キッチンは自炊に十分だが混雑し、共用浴室も時間帯によって混むという声がある。周辺に店が少ないため、HöfnかSkaftafellで食料を買っておく。',
    [review('Skyrhúsiðの確認済みレビュー', 'https://www.booking.com/reviews/is/hotel/skyrhusid-guesthouse.html'), review('Skyrhúsið公式', 'https://skyrhusid.is/')],
  )],
  'iceland-ice-cave': [trend(
    'ガイドの安全判断と説明で氷河・氷洞を短時間で体験できる点が好評。天候や氷の状態で近づけない、行程変更・中止がある、アクセスが想像より歩きにくいという声もある。写真と同じ洞窟を期待せず、集合場所と代替条件を予約票で確認する。',
    [review('氷河湖周辺アクティビティのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g12344476-d276577-Reviews-Glacier_Lagoon-Jokulsarlon_East_Region.html'), review('ヴァトナヨークトル国立公園公式', 'https://www.vatnajokulsthjodgardur.is/en')],
  )],
  'iceland-zodiac': [trend(
    '大型の氷山に近づけること、ガイドの説明、アザラシに出会える可能性が評価される。雨・風・氷の状態で中止や船変更があるという声もある。開始30分前チェックイン、防寒具・手袋・防水靴、参加条件を公式で確認する。',
    [review('氷河湖のレビュー', 'https://www.tripadvisor.com/Attraction_Review-g12344476-d276577-Reviews-Glacier_Lagoon-Jokulsarlon_East_Region.html'), review('Ice Lagoon公式：ゾディアック', 'https://icelagoon.is/tours/zodiac-boat-tour/')],
  )],
  'iceland-hofn-stay': [trend(
    'Central Stay Höfnは清潔でモダン、ベッド・浴室・セルフチェックインが快適という声が多い。入口や駐車位置が分かりにくい、遮光やドア音が気になるという指摘もある。暗証番号・駐車位置を保存し、朝食と車内用の軽食をHöfnで準備する。',
    [review('Central Stay Höfnのレビュー', 'https://www.tripadvisor.com/Hotel_Review-g189960-d34171088-Reviews-Central_Stay_Hofn-Hofn_East_Region.html'), review('Höfnの充電器一覧', 'https://hledslukort.is/hofn?lang=en')],
  )],
  'iceland-vestrahorn': [trend(
    '黒い砂丘、尖った山、水面の反射、海岸の散歩が写真目的の旅行者から高評価。私有地への入場料を知らず驚く声がある一方、支払えば広く歩ける点は好評。入口のViking Caféで料金・通行条件を確認し、砂丘の植生を踏まない。',
    [review('ヴェストラホルンのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g189960-d10765153-Reviews-Vestrahorn-Hofn_East_Region.html'), review('Visit Vatnajökull：Horn / Stokksnes', 'https://visitvatnajokull.is/attraction/horn-stokksnes/')],
  )],
  'iceland-egilsstadir': [trend(
    'エイイルススタジルは観光地というより、東部の給油・買い物・食事をまとめる交通拠点として評価される。Vök Bathsやスチュズラギルを周辺候補にする声もある。Route 94へ入る前に燃料、食料、道路・峠の状況を確認する。',
    [review('エイイルススタジルと周辺の観光傾向', 'https://www.tripadvisor.com/Attractions-g315847-Activities-Egilsstadir_East_Region.html'), review('東アイスランド公式案内', 'https://www.east.is/en/destinations/communities/egilsstadir')],
  )],
  'iceland-borgarfjordur-stay': [trend(
    'Blábjörgは海辺の立地、親切なスタッフ、朝食、レストラン、清潔な部屋、スパが高評価。スパは別料金を見落としたという声もある。10月はパフィン観察を目的にせず、予約・追加料金とRoute 94の当日状況を確認する。',
    [review('Blábjörg Resortのレビュー', 'https://www.tripadvisor.com/Hotel_Review-g3226240-d3322642-Reviews-Blabjorg_Resort-Borgarfjordur_Eystri_East_Region.html'), review('Blábjörg公式', 'https://blabjorg.is/')],
  )],
  'iceland-diamond-circle-drive': [trend(
    'ゴールデンサークルより静かで、滝・火山・地熱・森林峡谷・港町をまとめて巡れる点が高評価。一日で詰め込むと運転だけで終わるという声が多く、給油・食事の選択肢も限られる。最低一日、できれば観光時間を別に確保する。',
    [review('ダイヤモンドサークルの旅行案内', 'https://www.icelandair.com/arora/diamond-circle-tourist-route/'), review('北アイスランド公式：ダイヤモンドサークル', 'https://www.northiceland.is/en/travel-trade/featured-services/diamond-circle')],
  )],
  'iceland-skulagardur-stay': [trend(
    'Skúlagarðurは田園の静けさ、自然の眺め、清潔で暖かい部屋、ベッド、スタッフが好評。朝食ビュッフェやレストランを評価する声がある一方、朝食が追加料金だったという投稿もある。4〜10月のランドリーサービスはセルフ洗濯機とは限らないため、提供時間・料金を到着時に確認する。',
    [review('Skúlagarðurのレビュー', 'https://www.tripadvisor.co.uk/Hotel_Review-g7892530-d2177307-Reviews-Hotel_Skulagardur-Asbyrgi_Northeast_Region.html'), review('Skúlagarður公式：施設・食事・ランドリー', 'https://skulagardur.com/')],
  )],
  'iceland-husavik-drive': [trend(
    '港の景観、港沿いの食事、ホエールウォッチング前後のHúsavík Whale Museumが好評。ツアー受付と駐車を先に確認し、出航前に予定を詰めすぎず、終了後に博物館や食事を調整する。',
    [review('Húsavík Whale Museumのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g189963-d519917-Reviews-The_Husavik_Whale_Museum-Husavik_Northeast_Region.html'), review('North Sailing：準備案内', 'https://www.northsailing.is/whale-watching-tour-tips/')],
  )],
  'iceland-husavik-sightseeing': [trend(
    'Húsavíkは港町の散策と展示を、ホエールウォッチングの前後に組み合わせる使い方が好評。食事や博物館の営業時間は季節で変わるため、当日の開館情報を確認する。',
    [review('Húsavík Whale Museumのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g189963-d519917-Reviews-The_Husavik_Whale_Museum-Husavik_Northeast_Region.html'), review('北アイスランド公式：街と村', 'https://www.northiceland.is/en/destinations/towns')],
  )],
  'iceland-whale-watching': [trend(
    'ガイドの知識、クジラを探す過程、湾の景色が高評価。目撃距離や時間は自然条件次第で、荒天・強風・船酔い・ツアー変更への言及もある。海上は陸上より寒いので、防水の上着・重ね着・帽子・手袋を前提にする。',
    [review('ホエールウォッチングのレビュー', 'https://www.tripadvisor.co.uk/Attraction_Review-g189963-d3961627-Reviews-Salka_Whale_Watching-Husavik_Northeast_Region.html'), review('North Sailing：FAQ', 'https://www.northsailing.is/whale-watching/frequently-asked-questions/')],
  )],
  'iceland-akureyri-drive': [trend(
    'アークレイリは北部観光の買い物・食事・給油をまとめる拠点として使いやすいという評価が多い。長距離移動の前後で補給・トイレを済ませ、出発前に道路状況と市街地の駐車表示を確認する。',
    [review('北アイスランド公式：街と村', 'https://www.northiceland.is/en/destinations/towns'), review('道路状況', 'https://www.road.is/')],
  )],
  'iceland-leave-akureyri': [trend(
    'アークレイリを拠点にすると買い物や食事をまとめられるという声がある。西へ長距離移動する日は、前夜に給油・食料・トイレを済ませ、出発時に道路状況を確認しておくと安心。',
    [review('北アイスランド公式：街と村', 'https://www.northiceland.is/en/destinations/towns'), review('道路状況', 'https://www.road.is/')],
  )],
  'iceland-forest-lagoon': [trend(
    '森越しのフィヨルドとアークレイリの眺め、清潔な更衣室、落ち着いた雰囲気が特に好評。時間帯による混雑、料金の高さ、期待よりぬるく感じるという声もある。予約時間、水着・タオルの条件を公式FAQで確認する。',
    [review('Forest Lagoonのレビュー', 'https://www.tripadvisor.co.uk/Attraction_Review-g189954-d24825037-Reviews-Forest_Lagoon-Akureyri_Northeast_Region.html'), review('Forest Lagoon公式FAQ', 'https://www.forestlagoon.is/faq')],
  )],
  'iceland-akureyri-stay': [trend(
    '共有キッチンの広さ、調理器具・食器、中心部まで徒歩約10分という立地が好評。共有浴室、メール中心のセルフチェックイン、階段やドアの扱いを事前に知っておくべきという声もある。到着前にキッチンの利用時間とセルフチェックインを確認する。',
    [review('Akureyri Hostelのレビュー', 'https://www.booking.com/reviews/is/hotel/akureyri-h-i-hostel.en-gb.html'), review('Akureyri Hostelの施設情報', 'https://www.booking.com/hotel/is/akureyri-h-i-hostel.html')],
  )],
  'iceland-hvammstangi-tbd': [trend(
    'クヴァンムスタンギ周辺の自由時間には、アザラシ観察の候補を入れる旅行者が多いが、野生動物は場所・時間・個体数が変わる。Icelandic Seal Centerの開館・ツアー情報と道路状況を確認し、動物へ近づきすぎない。',
    [review('フンギング地域公式案内', 'https://www.visithunathing.is/'), review('北アイスランド：アザラシ案内', 'https://www.northiceland.is/static/files/Baeklingar/the-arctic-north-iceland-english.pdf')],
  )],
  'iceland-vidihlid-stay': [trend(
    'Aurora Igloo Northはドームの非日常感、山や馬の眺め、清潔な共用設備、暖かい寝床が好評。共用キッチン・浴室が別棟、セルフチェックインや道路音、朝食なしが注意点として挙がる。鍵の場所と共用棟の位置を保存し、オーロラは天候次第と考える。',
    [review('Aurora Igloo Northの公開レビュー', 'https://www.hotels.com/ho3958042880/'), review('Aurora Igloo Northの掲載情報', 'https://www.booking.com/hotel/is/aurora-igloo-north.en-gb.html')],
  )],
  'iceland-reykjavik-drive': [trend(
    'レイキャヴィーク中心部は徒歩で回りやすく、港・ハルパ・サンボイジャー・教会・博物館を天候で組み替える旅程が好まれる。車を置いて歩くと動きやすく、雨の日は屋内施設へ切り替える。',
    [review('レイキャヴィーク公式：見どころ', 'https://visitreykjavik.is/exploring-reykjavik-attractions'), review('レイキャヴィーク公式：交通', 'https://visitreykjavik.is/plan-your-trip/getting-around')],
  )],
  'iceland-reykjavik-tbd': [trend(
    '街歩きは港・カフェ・展示を天気と気分で短く組み合わせる評価が多い。中心部の駐車条件や施設の営業時間は当日確認し、雨なら博物館へ切り替えられるよう余白を残す。',
    [review('レイキャヴィーク公式：中心部', 'https://visitreykjavik.is/city-areas/reykjavik-city-centre'), review('レイキャヴィーク公式：City Card', 'https://visitreykjavik.is/reykjavik-city-card')],
  )],
  'iceland-reykjavik-stay-one': [trend(
    'Guesthouse PaviはLaugavegur、教会、バス停、スーパーに近い立地、価格、共用キッチン、清潔さが評価される。一方、エレベーターがなく、共有キッチン・浴室や夜間の生活音にばらつきがある。大きな荷物は階段で運び、共有スペースが混む時間を避ける。',
    [review('Guesthouse Paviの最新レビュー', 'https://www.booking.com/hotel/is/guesthouse-pavi.en-gb.html?came_from_hotel_review=1&keep_landing=1'), review('Guesthouse Paviのレビュー', 'https://www.tripadvisor.com/Hotel_Review-g189970-d669720-Reviews-Pavi_Guesthouse-Reykjavik_Capital_Region.html')],
  )],
  'iceland-reykjavik-stay-two': [trend(
    '2連泊では、立地の便利さを活かして荷物整理や自炊の時間帯を共有設備の混雑とずらすと使いやすい。セルフチェックイン時間帯と階段のみの動線を到着前に確認する。',
    [review('Guesthouse Paviの最新レビュー', 'https://www.booking.com/hotel/is/guesthouse-pavi.en-gb.html?came_from_hotel_review=1&keep_landing=1'), review('Guesthouse Paviのレビュー', 'https://www.booking.com/reviews/is/hotel/guesthouse-pavi.en-gb.html?page=2')],
  )],
  'iceland-blue-lagoon': [trend(
    '青白い水、シリカマスク、サウナ・スチーム、バーが人気の理由。予約時間制は好評だが、人気時間帯の浴場・更衣室の混雑と価格の高さを指摘する声もある。入水前のシャワー、時間枠、営業・火山活動による変更を公式で確認する。',
    [review('ブルーラグーンのレビュー', 'https://www.tripadvisor.com/Attraction_Review-g608874-d207805-Reviews-Blue_Lagoon-Grindavik_Reykjanes_Peninsula.html'), review('ブルーラグーン公式：スパエチケット', 'https://www.bluelagoon.com/spa-etiquette')],
  )],
  'iceland-phallological-museum': [trend(
    '独特なテーマながら説明が教育的で、展示・インタラクティブ要素・カフェを楽しめるという評価が多い。所要は1〜2時間という扱いが多く、入館料やカフェ価格を高めに感じる声もある。古い住所を使わず、公式のHafnartorg／Reykjastræti 4と当日の開館時間を確認する。',
    [review('アイスランド・ペニス博物館のレビュー', 'https://www.tripadvisor.com/Attraction_Review-g189970-d2039593-Reviews-Icelandic_Phallological_Museum-Reykjavik_Capital_Region.html'), review('アイスランド・ペニス博物館公式', 'https://www.phallus.is/')],
  )],
  'iceland-car-return': [trend(
    '返却自体は簡単という声がある一方、営業所から空港までのシャトル待ち、早朝の運行開始時刻、返却場所の分かりにくさへの不満もある。予約先の営業時間・返却場所・早朝シャトルを確認し、給油・撮影・荷物確認・ターミナル移動を別々に見積もる。',
    [review('レンタカー返却の利用者傾向', 'https://www.northbound.is/car-rental/kef-airport-reviews'), review('KEF空港：レンタカー位置', 'https://www.kefairport.is/en/services/car-rental')],
  )],
  'iceland-kef-departure': [trend(
    '早朝便では、返却営業所とターミナルが同じ場所とは限らず、シャトル待ちが余裕を削るという声がある。出発便に対する返却締切とシャトル開始時刻を予約先へ確認し、空港案内のレンタカー位置も照合する。',
    [review('レンタカー返却の利用者傾向', 'https://www.northbound.is/car-rental/kef-airport-reviews'), review('KEF空港公式', 'https://www.kefairport.is/en/services/car-rental')],
  )],
};

export function appendReviewTrends(document, additions) {
  const blocks = [...document.blocks];
  const extra = [];
  const links = [];
  additions.forEach((addition, index) => {
    const prefix = `review-trend.${reviewTrendDate}.${document.activity_id}.${index}`;
    if (!blocks.some((block) => block.id === `${prefix}.heading` || block.id === `${prefix}.text`)) {
      extra.push({ id: `${prefix}.heading`, type: 'heading', text: addition.title }, { id: `${prefix}.text`, type: 'text', text: addition.text });
    }
    addition.sources.forEach((source, sourceIndex) => {
      const id = `${prefix}.source.${sourceIndex}`;
      if (!blocks.some((block) => block.type === 'link' && block.url === source.url) && !links.some((block) => block.url === source.url)) {
        links.push({ id, type: 'link', text: source.title, url: source.url });
      }
    });
  });
  const sourceIndex = blocks.findIndex((block) => block.type === 'heading' && block.text === '出典・最新情報');
  blocks.splice(sourceIndex < 0 ? blocks.length : sourceIndex, 0, ...extra);
  blocks.push(...links);
  return { ...document, blocks };
}
