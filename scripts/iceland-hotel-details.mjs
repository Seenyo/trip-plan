export const hotelResearchDate = '2026-09-24';

const source = (title, url) => ({ title, url });

export const icelandHotelDetails = {
  'iceland-efra-sel': {
    title: 'Efra-Sel Hostel',
    timelineNotes: 'エコノミーツイン（シングル2台・共用バスルーム）。共用キッチンと洗濯機あり。',
    rows: [
      ['宿泊', '10/6（火）→10/7（水）・1泊'],
      ['部屋・ベッド', 'エコノミー ツイン／シングルベッド2台'],
      ['お風呂・トイレ', '共用。タオル・リネン・ドライヤーあり'],
      ['朝食', '予約には含まれない。共用キッチンで自炊向き'],
      ['キッチン', '共用のフルキッチン。調理器具・食器類あり'],
      ['ランドリー', '洗濯機あり。乾燥機の有無と料金は現地確認'],
      ['駐車', '公開情報では敷地内無料。予約時の希望は空き状況次第'],
    ],
    sections: [
      ['チェックイン', '15:00〜23:30、チェックアウトは11:00まで。セルフチェックイン式。入館・客室のコードは予約メッセージで確認し、共有ページには転記しない。Wi-Fi名とパスワードはロビー掲示。'],
      ['EV充電', '宿に充電器があることは確認できない。おすすめはフルージル中心部の InstaVolt（Hrunamannavegur 1-5）。24時間利用できる160kW DC急速充電で、CCS2・CHAdeMOに対応し、非接触カード決済が使える。'],
      ['使い方のコツ', '共用キッチンと洗濯機がそろうため、旅の最初に洗濯を済ませ、翌朝分と移動中の軽食もここで準備すると後半が楽。'],
    ],
    sources: [
      source('Efra-Sel Hostel：客室・共用設備', 'https://www.booking.com/hotel/is/efra-sel-hostel-fludir.en-gb.html'),
      source('InstaVolt Flúðir：充電器・支払方法', 'https://instavolt.is/en/location/electric-vehicle-charging-station-fludir-000006/'),
    ],
  },
  'iceland-vik-stay': {
    title: '1908 Hostel by Tröll',
    timelineNotes: 'ベーシックツイン（シングル2台・共用バスルーム）。共用キッチンあり、館内ランドリーなし。',
    rows: [
      ['宿泊', '10/7（水）→10/8（木）・1泊'],
      ['部屋・ベッド', 'ベーシック ツイン／シングルベッド2台'],
      ['お風呂・トイレ', '共用'],
      ['朝食', '予約確認は「食事なし」。公式サイトは無料朝食7:00〜9:00と案内しているため要確認'],
      ['キッチン', '設備の整った共用キッチンとダイニングあり'],
      ['ランドリー', '現行公式情報ではセルフ式・館内ランドリーともになし'],
      ['建物', '築100年以上。階段のみでエレベーターなし'],
    ],
    sections: [
      ['チェックイン時刻の差', '予約確認は15:00以降・10:00までにチェックアウト。現行公式ページは16:00〜24:00・11:00までと記載が異なる。予約確認と直前案内を優先し、遅れる場合は事前連絡する。'],
      ['EV充電', '宿の充電器は確認できない。おすすめは Austurvegur 20 の InstaVolt Vík。24時間利用できる160kW DC急速充電で、CCS2・CHAdeMOに対応し、非接触カード決済が使える。'],
      ['食事の準備', '食事条件に不一致があるので、朝食は含まれない前提で準備する。ヴィークで買い出しを済ませ、共用キッチンで翌朝分も用意しておくと確実。'],
    ],
    sources: [
      source('1908 Hostel 公式：設備・ポリシー', 'https://hotels.troll.is/1908-hostel/'),
      source('InstaVolt Vík：充電器・支払方法', 'https://instavolt.is/location/electric-vehicle-charging-station-vik-000012/'),
    ],
  },
  'iceland-hali-stay': {
    title: 'Skyrhúsið Guesthouse',
    timelineNotes: 'ツイン（シングル2台のリクエスト承認済み・共用バスルーム）。共用キッチンあり。',
    rows: [
      ['宿泊', '10/8（木）→10/9（金）・1泊'],
      ['部屋・ベッド', 'ダブルまたはツイン／シングル2台の希望が承認済み'],
      ['お風呂・トイレ', '共用。客室内に洗面台、タオル・リネンあり'],
      ['朝食', '予約には含まれない。コーヒー・紅茶・ジュースは無料提供'],
      ['キッチン', '設備の整った共用キッチン。朝・昼・夕食を自炊できる'],
      ['ランドリー', '宿の公開情報で利用可と確認できないため、ない前提で計画'],
      ['駐車', '敷地内無料'],
    ],
    sections: [
      ['チェックイン', '17:00〜21:30、チェックアウトは7:00〜10:00。時間外到着は事前連絡が必要。ヨークルスアゥルロゥンから車で約10〜15分のため、ツアー集合時刻から逆算しやすい。'],
      ['EV充電', '宿の充電器は確認できない。おすすめは翌日の行程上にあるヨークルスアゥルロゥン駐車場の ON 急速充電（CCS・CHAdeMO各50kW）。充電器の稼働状況と駐車料金は当日にONアプリ等で確認する。'],
      ['食事の準備', '近隣の選択肢が少ないため、ヴィーク方面で食材を買ってから到着する。共用キッチンは簡単な食事だけでなく通常の自炊にも使える。'],
    ],
    sources: [
      source('Skyrhúsið 公式：客室・共用キッチン', 'https://skyrhusid.is/'),
      source('Skyrhúsið 公式：共用設備', 'https://skyrhusid.is/about/'),
      source('ON Jökulsárlón：充電器情報', 'https://juiceup.is/station/on-jokulsarlon'),
    ],
  },
  'iceland-hofn-stay': {
    title: 'Central Stay Höfn',
    timelineNotes: 'ダブルまたはツイン（専用バスルーム）。室内はコーヒーメーカーと電気ポットのみで自炊設備なし。',
    rows: [
      ['宿泊', '10/9（金）→10/10（土）・1泊'],
      ['部屋・ベッド', 'ダブルまたはツイン。公開中の同室タイプはシングル2台表示だが、予約上の最終配置は要確認'],
      ['お風呂・トイレ', '専用。シャワー、タオル、ドライヤー、アメニティあり'],
      ['朝食', '予約には含まれない'],
      ['キッチン', '共用・専用キッチンなし。室内にコーヒーメーカー、電気ポット、お茶・コーヒー'],
      ['ランドリー', '宿の公開設備に記載なし'],
      ['駐車', '敷地内無料'],
    ],
    sections: [
      ['セルフチェックイン', 'チェックインは16:00〜24:00。入室方法は到着前日に届く予定。予約画面のチェックアウトは10:00までだが、宿のメッセージには11:00前とあるため、安全側の10:00までに出る。'],
      ['EV充電', '宿の充電器は確認できない。おすすめは町内の Ísorka–Olís Höfn（最大150kW、CCS・CHAdeMO・Type 2）。HöfnにはほかにTesla 250kWやOrkusalan 150kWもあるので、対応コネクタと空きをHleðslukortで確認する。'],
      ['食事', '自炊設備はないが、港・レストラン・スーパーへ歩きやすい立地。翌日は長距離なので、夕食と同時に朝食・車内用の軽食を調達する。'],
    ],
    sources: [
      source('Central Stay Höfn：客室・設備', 'https://www.booking.com/hotel/is/central-stays-hofn.en-gb.html'),
      source('Höfnの充電器一覧・稼働状況', 'https://hledslukort.is/hofn?lang=en'),
    ],
  },
  'iceland-borgarfjordur-stay': {
    title: 'Blábjörg Resort',
    timelineNotes: 'デラックスダブル（160cmベッド・専用バスルーム・海側バルコニー）。朝食込み。',
    rows: [
      ['宿泊', '10/10（土）→10/11（日）・1泊'],
      ['部屋・ベッド', 'デラックス ダブル／幅160cmのダブルベッド1台、海側バルコニー'],
      ['お風呂・トイレ', '専用。ウォークインシャワー、タオル、ドライヤーあり'],
      ['朝食', '料金に含まれる。アレルギー、グルテンフリー、ヴィーガン等は相談可'],
      ['キッチン', 'デラックス客室に調理キッチンなし。コーヒーメーカー・お茶類あり'],
      ['ランドリー', '施設のランドリーサービスあり。客室内洗濯機ではないため、料金・受付時間を確認'],
      ['駐車', '無料'],
    ],
    sections: [
      ['スパ', 'Musterið Spa は宿泊料金に含まれず別予約・別料金。宿泊者割引あり。一般入場は90分で、屋内外ホットタブ、冷水浴、フィンランド式・赤外線サウナ、スチームバスを利用できる。事前予約推奨。'],
      ['EV充電', '宿専用の充電器は確認できない。Bakkagerðiには公共Type 2充電があるが低速・台数限定。Route 94へ入る前に、選択肢が多いEgilsstaðir（最大280kW、複数事業者）で十分に急速充電し、村の充電は補助と考えるのが安全。'],
      ['10月の営業', 'レストランとスパは季節で営業が変わる。夕食は当日の営業確認と予約をしておく。チェックイン15:00〜22:00、チェックアウト8:00〜11:00。22:00を過ぎる場合は要連絡。'],
    ],
    sources: [
      source('Blábjörg公式：デラックス客室', 'https://blabjorg.is/accomodation/deluxe-rooms-with-private-facilities/'),
      source('Blábjörg公式：朝食の食事制限対応', 'https://blabjorg.is/accessibility/'),
      source('Blábjörg公式：スパの利用条件', 'https://blabjorg.is/faq/'),
      source('Musterið Spa 公式：設備', 'https://blabjorg.is/spa/'),
      source('Egilsstaðirの充電器一覧・稼働状況', 'https://hledslukort.is/egilsstadir?lang=en'),
      source('Bakkagerðiの公共充電器', 'https://www.electromaps.com/en/charging-stations/iceland/mulaing/bakkageri'),
    ],
  },
  'iceland-skulagardur-stay': {
    title: 'Skúlagarður Country Hotel',
    timelineNotes: 'ファミリールーム（大型ダブル1台＋二段ベッド1台・専用バスルーム）。ランドリーサービスあり。',
    rows: [
      ['宿泊', '10/11（日）→10/12（月）・1泊'],
      ['部屋・ベッド', 'ファミリールーム／大型ダブル1台＋二段ベッド1台（上下2床）'],
      ['お風呂・トイレ', '専用。バスタブまたはシャワー、タオル、ドライヤーあり'],
      ['朝食', '予約には含まれない。4〜10月は7:30〜9:30に提供されるため有料追加を相談'],
      ['キッチン', '客用キッチンは希望すれば利用相談可。客室にコーヒーメーカーとダイニングテーブルあり'],
      ['ランドリー', '4〜10月はランドリーサービスあり。料金・締切を到着時に確認'],
      ['駐車', '敷地内無料'],
    ],
    sections: [
      ['チェックイン', '現行の公式規約では通常16:00〜21:00、21:00以降はセルフチェックイン。チェックアウトは11:00。予約画面の「0:00〜0:00」表示は実用的でないため、公式時刻を基準にする。'],
      ['EV充電', 'ホテルに充電器があることは確認できない。おすすめは約11km先のÁsbyrgi（Gljúfrastofaビジターセンター）のON急速充電。CCS・CHAdeMO 50kWとType 2 43kWがある。'],
      ['食事', 'Grös Bistroは5〜10月営業案内だが、10月11日の夕食営業は要確認。客用キッチンも自動的に付く部屋ではないので、利用希望はチェックイン時に伝える。'],
    ],
    sources: [
      source('Skúlagarður公式：客室・朝食・ランドリー', 'https://skulagardur.com/'),
      source('Skúlagarður公式：チェックイン規約', 'https://skulagardur.com/terms-and-conditions/'),
      source('Skúlagarður：ファミリールームのベッド構成', 'https://www.booking.com/hotel/is/skulagardur.en-gb.html'),
      source('ON Ásbyrgi：充電器情報', 'https://www.goingelectric.de/stromtankstellen/Island/Asbyrgi/Besucherzentrum-Asbyrgi-Gljufrastofa-/77462/'),
    ],
  },
  'iceland-akureyri-stay': {
    title: 'Akureyri Hostel',
    timelineNotes: 'スモールツイン（シングル2台・共用バスルーム）。共用キッチンは7:00〜22:00、ランドリーなし。',
    rows: [
      ['宿泊', '10/12（月）→10/13（火）・1泊'],
      ['部屋・ベッド', 'Private Small Twin／シングルベッド2台'],
      ['お風呂・トイレ', '共用。2024年改装。リネンとタオル込み'],
      ['朝食', '予約には含まれない。近くのベーカリー利用案内あり'],
      ['キッチン', '共用キッチン・ダイニングを7:00〜22:00利用可。コンロあり、オーブンなし'],
      ['ランドリー', '現行公式FAQではAkureyri Hostelのランドリー提供なし'],
      ['駐車', '敷地内または周辺道路に無料駐車'],
    ],
    sections: [
      ['セルフチェックイン', '到着前にメールで入館手順と個別コードが届く。宿は24時間電話サポートを案内している。コードは予約メッセージで確認し、共有ページには転記しない。'],
      ['EV充電', '宿専用の充電器は確認できない。近いGlerártorg周辺に充電施設がまとまり、Akureyri市内には複数の急速充電がある。Hleðslukortで空きを見て、GlerártorgまたはHörgárbrautの急速充電を選ぶ。'],
      ['買い出し', 'Bónusがすぐ近く。キッチンは22:00までなので、Forest Lagoon後に21:00到着する予定なら、先に食材を買い、到着後すぐ調理できるものにする。'],
    ],
    sources: [
      source('Akureyri Hostel公式：Stórholtの客室・キッチン', 'https://www.akureyrihostel.is/st%C3%B3rholt-info'),
      source('Akureyri Hostel公式FAQ：ランドリー・駐車・入館', 'https://www.akureyrihostel.is/info'),
      source('Akureyri Hostel：ベッド構成', 'https://www.booking.com/hotel/is/akureyri-h-i-hostel.en-gb.html'),
      source('Akureyriの充電器一覧・稼働状況', 'https://hledslukort.is/akureyri?lang=en'),
    ],
  },
  'iceland-vidihlid-stay': {
    title: 'Aurora Igloo North',
    timelineNotes: 'オーロラドーム（ダブルベッド・共用バスルーム）。設備の整った共用キッチンあり。',
    rows: [
      ['宿泊', '10/13（火）→10/14（水）・1泊'],
      ['部屋・ベッド', 'Aurora Standard Igloo North／ダブルベッド1台'],
      ['お風呂・トイレ', '共用。ドームの外、短い徒歩移動が必要。タオル・ドライヤーあり'],
      ['朝食', '予約には含まれない'],
      ['キッチン', '共用。冷蔵庫、電子レンジ、コンロ、食洗機、トースター、電気ポット、コーヒーメーカー'],
      ['ランドリー', '宿の公開設備に記載なし'],
      ['立地', 'Hvammstangi中心部から約19km。North West Restaurantまで約300〜400m'],
    ],
    sections: [
      ['チェックイン', '16:00以降、チェックアウトは11:00まで。詳細は施設から届くメールで確認。夜に共用棟へ移動するため、滑りにくい靴と小さなライトをすぐ出せる場所に入れておく。'],
      ['EV充電', '宿専用の充電器は確認できないが、徒歩圏のNorth West Hotel & RestaurantにONの急速充電がある。24時間利用でき、CCSは最大225kW、CHAdeMOは50kW。今回の宿では最も使いやすい代替充電場所。'],
      ['食事とオーロラ', 'North West Restaurantは施設サイトで毎日8:00〜22:00の案内。朝食は季節提供で予約には含まれないため、10月13〜14日の営業を確認する。ドーム周辺は市街光が少ないので、就寝前に雲量とオーロラ予報を確認。'],
    ],
    sources: [
      source('Aurora Igloo公式：ベッド・浴室・立地', 'https://auroraigloo.is/'),
      source('Aurora Igloo North：キッチン設備', 'https://aurora-igloo-north.north-iceland.com/'),
      source('North West Hotel & Restaurant公式', 'https://www.nwest.is/'),
      source('North WestのON急速充電', 'https://www.goingelectric.de/stromtankstellen/Island/Hvammstaga/North-West-Hotel-Restaurant-Vidigerdi-/53845/'),
    ],
  },
  'iceland-reykjavik-stay-one': {
    title: 'Guesthouse Pavi',
    timelineNotes: 'ツイン（シングル2台・共用バスルーム）。2連泊。共用キッチンあり、階段のみ。',
    rows: [
      ['宿泊', '10/14（水）→10/16（金）・2泊'],
      ['部屋・ベッド', 'ツイン／シングルベッド2台'],
      ['お風呂・トイレ', '共用。タオル・リネンあり'],
      ['朝食', '予約には含まれない'],
      ['キッチン', '共用キッチン。冷蔵庫、食器、カトラリー、基本的な調理器具あり'],
      ['ランドリー', '宿の予約設備には記載がなく、公開情報も一致しないため利用できない前提'],
      ['建物', '客室は階段でアクセス。エレベーターなし、常時有人ではない'],
    ],
    sections: [
      ['チェックイン', '予約上部は14:00以降だが、重要情報は有人チェックイン15:00〜18:00、18:00以降はセルフチェックインと案内。直前メッセージを優先する。チェックアウトは10:00まで。チェックイン前後の荷物預かりはない。'],
      ['洗濯するなら', '確実な候補は中心部Austurstræti 9のLaundromat Café。地下にセルフサービスの洗濯機・乾燥機があり、待ち時間に食事できる。料金は安くないため、必要量をまとめて洗う。'],
      ['EV充電', '宿専用の充電器は確認できない。近い候補はHlemmur周辺の公共充電。工事や稼働状況が変わりやすいので、Hleðslukortで空きを確認し、埋まっていればKringlanや市内急速充電へ切り替える。'],
    ],
    sources: [
      source('Guesthouse Pavi：客室・共用設備', 'https://w1.booking.com/hotel/is/guesthouse-pavi.en-gb.html'),
      source('Guesthouse Pavi：客室タイプとキッチン', 'https://www.hostelworld.com/bed-and-breakfasts/p/15720/guesthouse-pavi/'),
      source('Laundromat Café：店舗・ランドリー', 'https://www.ferdalag.is/en/service/laundromat-cafe'),
      source('Reykjavíkの充電器マップ', 'https://hledslukort.is/en?p=64.14174%2C-21.91056'),
    ],
  },
};

icelandHotelDetails['iceland-reykjavik-stay-two'] = {
  ...icelandHotelDetails['iceland-reykjavik-stay-one'],
  title: 'Guesthouse Pavi（2泊目）',
  timelineNotes: 'Guesthouse Paviの2泊目。共用キッチン・共用バスルーム。翌朝に備えて荷造り。',
};

export function appendHotelDetails(document, details) {
  const prefix = `hotel.${hotelResearchDate}.${document.activity_id}`;
  const escapedActivityId = document.activity_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const generatedBlockPattern = new RegExp(`^hotel\\.\\d{4}-\\d{2}-\\d{2}\\.${escapedActivityId}\\.`);
  const blocks = document.blocks.filter((block) => !generatedBlockPattern.test(block.id ?? ''));
  const additions = [
    { id: `${prefix}.heading`, type: 'heading', text: '今回泊まる部屋・設備' },
    { id: `${prefix}.summary`, type: 'table', text: '', rows: [['項目', '内容'], ...details.rows] },
    ...details.sections.flatMap(([title, text], index) => [
      { id: `${prefix}.section.${index}.heading`, type: 'heading', text: title },
      { id: `${prefix}.section.${index}.text`, type: 'text', text },
    ]),
  ];
  const sourceIndex = blocks.findIndex((block) => block.type === 'heading' && block.text === '出典・最新情報');
  blocks.splice(sourceIndex < 0 ? blocks.length : sourceIndex, 0, ...additions);
  for (const [index, item] of details.sources.entries()) {
    if (!blocks.some((block) => block.type === 'link' && block.url === item.url)) {
      blocks.push({ id: `${prefix}.source.${index}`, type: 'link', text: item.title, url: item.url });
    }
  }
  return { ...document, title: details.title, blocks };
}
