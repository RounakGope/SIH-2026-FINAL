// What the app says for each class the model can return.
// The class keys MUST match the model's class_names.json exactly (see below).
//
// CONTENT TEAM: every line starting with "TODO" shows up highlighted in the app.
// Fill it from the Maharashtra SAU package of practices (Dr PDKV Akola / MPKV
// Rahuri / VNMKV Parbhani), ICAR-CICR advisories and CIB&RC label claims, and put
// the reference in `source`. Never invent a product or dose.
// Marathi text needs review by a native speaker.
//
// Every crop has its own set of classes: the keys MUST match that crop's
// public/model/<crop>/class_names.json. The same name can mean different advice on
// different crops (soybean and cotton both have "bacterial_blight"), so always
// look content up with ipmFor(label, crop).
//
// Sources for products, doses and thresholds:
//   Cotton     ICAR-CICR Nagpur, "Strategies and Advisory for Cotton Pest and
//              Disease Management for the year 2024-25", sections D and E.
//   Soybean,   TNAU Agritech Portal (Tamil Nadu Agricultural University), Crop
//   Sugarcane, Protection pages for each disease; soybean rust from Indian field
//   Chickpea   trials of hexaconazole (see the step's `source`).
//   Products India has since banned are left out even where a source lists them:
//   streptomycin/streptocycline (banned in agriculture from 1 Jan 2024), benomyl,
//   tridemorph, MEMC/Aretan, phorate and phosphamidon (2018 ban order).
// STILL NEEDS A DOMAIN CHECK before any farmer acts on it: (a) a KVK/SAU agronomist
// should confirm each product is label-claimed for its crop in Maharashtra, and
// (b) the Marathi needs a native speaker.

export const THRESHOLD = 0.7; // below this top-1 confidence the app does not prescribe

// ICAR-CICR spray volume for cotton: 150–200 L of water per acre (375–500 L/ha).
// A 15 L knapsack therefore needs ~13 tanks to cover one acre (≈195 L/acre), and
// every `perTank` below is the source's per-litre dose scaled to a 15 L tank.
export const TANK_L = 15;
export const TANKS_PER_ACRE = 13;

// Field severity index = % plants infected × average leaf severity ÷ 100 (0–100).
// The chemical rung unlocks at or above this. NOTE: this is a whole-field severity
// gate, not a per-pest ETL — the real ETLs are per pest and in different units
// (jassid: 2 nymphs/leaf, whitefly: 6/leaf, pink bollworm: 8 moths/trap for 3
// nights). Each entry carries its own `etl` string; the index gate is the app's
// coarse "don't reach for chemicals yet" guard on top of that.
export const CHEM_UNLOCK_INDEX = 5;

const COTTON = {
  healthy: {
    name: { en: 'Healthy leaf', mr: 'निरोगी पान', hi: 'स्वस्थ पत्ती' },
    markers: { en: 'No lesions, curling or hopper burn found on this leaf.', mr: 'या पानावर डाग, गुंडाळणे किंवा करपा आढळला नाही.', hi: 'इस पत्ती पर धब्बे, मुड़ाव या हॉपर बर्न नहीं मिला।' },
    diseased: false,
    referLab: false,
    steps: [
      { tier: 'cultural', text: { en: 'Keep scouting weekly on the same 10-plant walk.', mr: 'दर आठवड्याला त्याच 10 झाडांची पाहणी सुरू ठेवा.', hi: 'हर हफ़्ते उन्हीं 10 पौधों की निगरानी जारी रखें।' } }
    ]
  },
  bacterial_blight: {
    name: { en: 'Bacterial blight', mr: 'जिवाणूजन्य करपा', hi: 'जीवाणु झुलसा' },
    markers: {
      en: 'Angular, water-soaked spots bounded by the leaf veins, turning brown; can run along the veins.',
      mr: 'शिरांच्या मर्यादेत कोनदार, पाणथळ ठिपके जे नंतर तपकिरी होतात.', hi: 'पत्ती की नसों से घिरे कोणीय, पानी-भरे धब्बे जो भूरे हो जाते हैं; नसों के साथ फैल सकते हैं।'
    },
    diseased: true,
    referLab: false,
    etl: { en: 'No spray threshold is published for bacterial blight. Treat on visible spread, and only after the cultural and mechanical steps.', mr: 'जिवाणूजन्य करप्यासाठी ठराविक पातळी नाही. प्रादुर्भाव वाढताना, मशागत व यांत्रिक उपायांनंतरच फवारणी करा.', hi: 'जीवाणु झुलसा के लिए कोई छिड़काव सीमा प्रकाशित नहीं है। प्रकोप बढ़ता दिखे तभी, और खेती व यांत्रिक उपायों के बाद ही, इलाज करें।' },
    steps: [
      { tier: 'cultural', text: { en: 'Avoid evening and overhead irrigation; keep the field free of weeds. Next season: treated seed of a tolerant variety.', mr: 'संध्याकाळी व वरून पाणी देणे टाळा; शेत तणमुक्त ठेवा. पुढील हंगामात प्रक्रिया केलेले, सहनशील वाणाचे बियाणे वापरा.', hi: 'शाम को और ऊपर से सिंचाई न करें; खेत खरपतवार-मुक्त रखें। अगले मौसम में: सहनशील किस्म का उपचारित बीज।' } },
      { tier: 'mechanical', text: { en: 'Pick and destroy badly infected leaves. Do not work in the crop while leaves are wet.', mr: 'जास्त बाधित पाने तोडून नष्ट करा. पाने ओली असताना पिकात काम करू नका.', hi: 'ज़्यादा संक्रमित पत्तियाँ तोड़कर नष्ट करें। पत्तियाँ गीली हों तब फ़सल में काम न करें।' } },
      { tier: 'biological', text: { en: 'Seed treatment next season: Pseudomonas fluorescens WP at 10 g per kg of seed. For plants showing early symptoms, drench them and the ring around them with Trichoderma harzianum or T. viride 1% WP at 50 g per 10 L of water.', mr: 'पुढील हंगामात बीजप्रक्रिया: स्यूडोमोनास फ्लुरोसेन्स WP 10 ग्रॅम प्रति किलो बियाणे. सुरुवातीची लक्षणे दिसणाऱ्या झाडांभोवती ट्रायकोडर्मा हर्जियानम किंवा व्हिरिडी 1% WP 50 ग्रॅम प्रति 10 लिटर पाण्यात आळवणी करा.', hi: 'अगले मौसम में बीज उपचार: स्यूडोमोनास फ्लोरेसेंस WP 10 ग्राम प्रति किलो बीज। शुरुआती लक्षण वाले पौधों और उनके आसपास ट्राइकोडर्मा हर्ज़ियानम या ट्राइकोडर्मा विरिडी 1% WP 50 ग्राम प्रति 10 लीटर पानी में घोलकर डालें।' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Copper oxychloride 50% WP — 1 to 2 foliar sprays at weekly interval (ICAR dose: 25 g per 10 L of water)', perTank: 37.5, unit: 'g', tankL: 15, tanksPerAcre: 13, waitDays: null, ppe: 'Gloves, mask, full sleeves', source: 'ICAR-CICR Nagpur, Cotton Pest and Disease Advisory 2024-25, section E (bacterial leaf blight, 45–120 DAS)' }
    ]
  },
  leaf_curl: {
    name: { en: 'Leaf curl (suspected virus)', mr: 'पाने गुंडाळणे (विषाणूजन्य संशय)', hi: 'पत्ती मरोड़ (विषाणु की आशंका)' },
    markers: {
      en: 'Upward or downward curling, thickened veins, sometimes leaf-like outgrowths under the leaf. Spread by whitefly.',
      mr: 'पाने वर/खाली गुंडाळतात, शिरा जाड होतात. पांढरी माशी प्रसार करते.', hi: 'पत्तियाँ ऊपर या नीचे मुड़ती हैं, नसें मोटी होती हैं, कभी पत्ती के नीचे पत्ती जैसी बढ़वार। सफ़ेद मक्खी से फैलता है।'
    },
    diseased: true,
    referLab: true,
    steps: [
      { tier: 'cultural', text: { en: 'Uproot and destroy infected plants early; remove weed hosts around the field.', mr: 'बाधित झाडे लवकर उपटून नष्ट करा; शेताभोवतीचे तण काढा.', hi: 'संक्रमित पौधे जल्दी उखाड़कर नष्ट करें; खेत के आसपास के खरपतवार हटाएँ।' } },
      { tier: 'mechanical', text: { en: 'Yellow sticky traps to monitor whitefly, the virus carrier: 20 per hectare to watch, 100 per hectare to knock the population down.', mr: 'पांढरी माशी पाहण्यासाठी पिवळे चिकट सापळे: निरीक्षणासाठी हेक्टरी 20, नियंत्रणासाठी हेक्टरी 100.', hi: 'विषाणु फैलाने वाली सफ़ेद मक्खी के लिए पीले चिपचिपे ट्रैप: निगरानी के लिए 20 प्रति हेक्टेयर, संख्या घटाने के लिए 100 प्रति हेक्टेयर।' } },
      { tier: 'biological', text: { en: 'Control the whitefly and you control the virus. Two sprays of neem oil in the early crop, up to 60 days after sowing — NSKE 5% plus neem oil at 5 ml per litre of water, with 1 g of laundry detergent per litre as the emulsifier.', mr: 'पांढरी माशी आवरली की विषाणूही आवरतो. पेरणीनंतर 60 दिवसांपर्यंत निंबोळी तेलाच्या दोन फवारण्या — NSKE 5% अधिक निंबोळी तेल 5 मिली प्रति लिटर पाण्यात, 1 ग्रॅम धुण्याची पावडर मिसळून.', hi: 'सफ़ेद मक्खी पर काबू यानी विषाणु पर काबू। बुवाई के 60 दिन तक नीम तेल के दो छिड़काव — NSKE 5% और नीम तेल 5 मिली प्रति लीटर पानी, घोल के लिए 1 ग्राम कपड़े धोने का पाउडर प्रति लीटर।' } }
    ]
  },
  jassid_damage: {
    name: { en: 'Jassid (leafhopper) damage', mr: 'तुडतुड्यांचा प्रादुर्भाव', hi: 'जैसिड (हरा तेला) का नुकसान' },
    markers: {
      en: 'Leaf edges yellow then reddish-brown and curl down ("hopper burn"); green nymphs on the underside.',
      mr: 'पानांच्या कडा पिवळ्या-लालसर होऊन खाली वळतात; पानाखाली हिरवी पिल्ले.', hi: 'पत्तियों के किनारे पीले फिर लाल-भूरे होकर नीचे मुड़ते हैं ("हॉपर बर्न"); निचली सतह पर हरे शिशु कीट।'
    },
    diseased: true,
    referLab: false,
    etl: { en: 'Economic threshold: 2 nymphs per leaf on average, or 25% of plants showing hopper-burn grade II or worse, counted on 20 plants per acre.', mr: 'आर्थिक नुकसान पातळी: सरासरी 2 पिल्ले प्रति पान, किंवा 25% झाडांवर ग्रेड II किंवा अधिक करपा. एकरी 20 झाडांवर मोजणी करा.', hi: 'आर्थिक नुकसान स्तर: औसतन 2 शिशु कीट प्रति पत्ती, या 25% पौधों पर ग्रेड II या उससे ज़्यादा हॉपर बर्न; प्रति एकड़ 20 पौधों पर गिनती।' },
    steps: [
      { tier: 'cultural', text: { en: 'Avoid excess nitrogen; remove weed hosts.', mr: 'जास्त नत्र टाळा; तण काढा.', hi: 'ज़्यादा नाइट्रोजन से बचें; खरपतवार हटाएँ।' } },
      { tier: 'mechanical', text: { en: 'Yellow sticky traps; count nymphs on 20 leaves from the top of the plant.', mr: 'पिवळे चिकट सापळे; झाडाच्या वरच्या 20 पानांवरील पिल्ले मोजा.', hi: 'पीले चिपचिपे ट्रैप; पौधे के ऊपरी हिस्से की 20 पत्तियों पर शिशु कीट गिनें।' } },
      { tier: 'biological', text: { en: 'Conserve lady beetles and lacewings. In the first 60 days after sowing, spray NSKE 5% plus neem oil at 5 ml per litre of water (300 or 1500 ppm formulation), with 1 g of laundry detergent per litre as the emulsifier — 1 to 2 sprays.', mr: 'ढालकिडे व क्रायसोपा यांचे संवर्धन करा. पेरणीनंतर पहिल्या 60 दिवसांत NSKE 5% अधिक निंबोळी तेल 5 मिली प्रति लिटर पाण्यात (300 किंवा 1500 ppm), 1 ग्रॅम धुण्याची पावडर मिसळून — 1 ते 2 फवारण्या.', hi: 'लेडी बीटल और लेसविंग को बचाएँ। बुवाई के पहले 60 दिनों में NSKE 5% और नीम तेल 5 मिली प्रति लीटर पानी (300 या 1500 ppm), घोल के लिए 1 ग्राम कपड़े धोने का पाउडर प्रति लीटर — 1 से 2 छिड़काव।' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Flonicamid 50% WG (ICAR dose: 4 g per 10 L of water, 200 g/ha). Do not repeat the same insecticide more than twice in a season.', perTank: 6, unit: 'g', tankL: 15, tanksPerAcre: 13, waitDays: 25, ppe: 'Gloves, mask, full sleeves', source: 'ICAR-CICR Nagpur, Cotton Pest and Disease Advisory 2024-25, section D (jassid, 60–90 DAS); waiting period from the Flonicamid 50% WG label for cotton — confirm against the pack you buy' }
    ]
  },
  other: {
    name: { en: 'Could not recognise this photo', mr: 'फोटो ओळखता आला नाही', hi: 'यह फ़ोटो पहचान नहीं पाए' },
    markers: {
      en: 'Retake with one cotton leaf filling the frame, in shade, or send it to the KVK expert.',
      mr: 'एक कापसाचे पान पूर्ण फ्रेममध्ये, सावलीत पुन्हा फोटो घ्या किंवा तज्ञांकडे पाठवा.', hi: 'कपास की एक पत्ती पूरे फ़्रेम में, छाँव में, फिर से फ़ोटो लें, या KVK विशेषज्ञ को भेजें।'
    },
    diseased: false,
    referLab: false,
    steps: []
  }
};

export const TIER_LABEL = {
  cultural: { en: 'Cultural', mr: 'मशागत', hi: 'खेती के तरीके' },
  mechanical: { en: 'Mechanical', mr: 'यांत्रिक', hi: 'यांत्रिक' },
  biological: { en: 'Biological', mr: 'जैविक', hi: 'जैविक' },
  chemical: { en: 'Chemical: only above the economic threshold', mr: 'रासायनिक: फक्त आर्थिक नुकसान पातळीवर', hi: 'रासायनिक: सिर्फ़ आर्थिक नुकसान स्तर पार होने पर' }
};

// ---------- shared by the other crops ----------
const TNAU = 'TNAU Agritech Portal (Tamil Nadu Agricultural University), Crop Protection';
const PPE = 'Gloves, mask, full sleeves';

const healthy = {
  name: { en: 'Healthy', mr: 'निरोगी', hi: 'स्वस्थ' },
  markers: { en: 'No disease symptoms found in this photo.', mr: 'या फोटोत रोगाची लक्षणे आढळली नाहीत.', hi: 'इस फ़ोटो में रोग के लक्षण नहीं मिले।' },
  diseased: false,
  referLab: false,
  steps: [
    { tier: 'cultural', text: { en: 'Keep scouting weekly on the same 10-plant walk.', mr: 'दर आठवड्याला त्याच 10 झाडांची पाहणी सुरू ठेवा.', hi: 'हर हफ़्ते उन्हीं 10 पौधों की निगरानी जारी रखें।' } }
  ]
};
const other = (en, mr, hi) => ({
  name: { en: 'Could not recognise this photo', mr: 'फोटो ओळखता आला नाही', hi: 'यह फ़ोटो पहचान नहीं पाए' },
  markers: {
    en: `Retake with one ${en} filling the frame, in shade, or send it to the KVK expert.`,
    mr: `${mr} पूर्ण फ्रेममध्ये, सावलीत पुन्हा फोटो घ्या किंवा तज्ञांकडे पाठवा.`,
    hi: `${hi} पूरे फ़्रेम में, छाँव में, फिर से फ़ोटो लें, या KVK विशेषज्ञ को भेजें।`
  },
  diseased: false,
  referLab: false,
  steps: []
});
COTTON.other = other('cotton leaf', 'एक कापसाचे पान', 'कपास की एक पत्ती');

// ---------- soybean ----------
const SOYBEAN = {
  healthy,
  bacterial_blight: {
    name: { en: 'Bacterial blight', mr: 'जिवाणूजन्य करपा', hi: 'जीवाणु झुलसा' },
    markers: {
      en: 'Small, angular, water-soaked spots, yellow to light brown, mostly on young leaves; they merge into large dead patches. Black lesions on stems and leaf stalks.',
      mr: 'कोवळ्या पानांवर लहान, कोनदार, पाणथळ पिवळसर-तपकिरी ठिपके; ते मिसळून मोठे करपलेले भाग तयार होतात. खोड व देठांवर काळे डाग.', hi: 'ज़्यादातर नई पत्तियों पर छोटे, कोणीय, पानी-भरे पीले से हल्के भूरे धब्बे; ये मिलकर बड़े सूखे हिस्से बनाते हैं। तने और डंठलों पर काले धब्बे।'
    },
    diseased: true,
    referLab: false,
    steps: [
      { tier: 'cultural', text: { en: 'Deep summer ploughing; destroy infected crop debris. Next season: healthy, certified seed.', mr: 'उन्हाळ्यात खोल नांगरट करा; बाधित पिकाचे अवशेष नष्ट करा. पुढील हंगामात निरोगी, प्रमाणित बियाणे वापरा.', hi: 'गर्मी में गहरी जुताई; संक्रमित फ़सल अवशेष नष्ट करें। अगले मौसम में: स्वस्थ, प्रमाणित बीज।' } },
      { tier: 'mechanical', text: { en: 'Pick and destroy badly infected leaves. Do not work in the crop while leaves are wet.', mr: 'जास्त बाधित पाने तोडून नष्ट करा. पाने ओली असताना पिकात काम करू नका.', hi: 'ज़्यादा संक्रमित पत्तियाँ तोड़कर नष्ट करें। पत्तियाँ गीली हों तब फ़सल में काम न करें।' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Copper oxychloride 50% WP (dose: 2 g per litre of water). The source pairs it with streptocycline — do not use that: antibiotics are banned on crops in India since January 2024.', perTank: 30, unit: 'g', tankL: 15, tanksPerAcre: 13, waitDays: null, ppe: PPE, source: `${TNAU}: Diseases of Soybean — Bacterial blight` }
    ]
  },
  cercospora_leaf_blight: {
    name: { en: 'Cercospora leaf blight', mr: 'सर्कोस्पोरा पानांवरील करपा', hi: 'सर्कोस्पोरा पत्ती झुलसा' },
    markers: {
      en: 'Leaves turn leathery and dark reddish-purple, starting on young upper leaves; fast yellowing and dead patches, then leaf drop. Seeds can carry a purple stain.',
      mr: 'वरची कोवळी पाने चामड्यासारखी, गडद लालसर-जांभळी होतात; लवकर पिवळी पडून करपतात व गळतात. बियांवर जांभळा डाग येऊ शकतो.', hi: 'ऊपर की नई पत्तियों से शुरू होकर पत्तियाँ चमड़े जैसी, गहरी लाल-बैंगनी हो जाती हैं; जल्दी पीली पड़कर सूखती और झड़ती हैं। बीजों पर बैंगनी दाग आ सकता है।'
    },
    diseased: true,
    referLab: false,
    steps: [
      { tier: 'cultural', text: { en: 'Remove the previous crop\'s debris. Next season: healthy, certified seed, treated with thiram + carbendazim (2:1) at 3 g per kg of seed.', mr: 'मागील पिकाचे अवशेष काढा. पुढील हंगामात निरोगी, प्रमाणित बियाणे; थायरम + कार्बेन्डाझिम (2:1) 3 ग्रॅम प्रति किलो बियाण्यास लावा.', hi: 'पिछली फ़सल के अवशेष हटाएँ। अगले मौसम में: स्वस्थ, प्रमाणित बीज, थायरम + कार्बेन्डाज़िम (2:1) 3 ग्राम प्रति किलो बीज से उपचारित।' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Mancozeb 75% WP (dose: 2.5 g per litre of water)', perTank: 37.5, unit: 'g', tankL: 15, tanksPerAcre: 13, waitDays: null, ppe: PPE, source: `${TNAU}: Diseases of Soybean — Cercospora leaf blight` }
    ]
  },
  rust: {
    name: { en: 'Rust', mr: 'तांबेरा', hi: 'गेरुआ (रस्ट)' },
    markers: {
      en: 'Small tan to reddish-brown raised pustules, mostly on the underside of the leaves. Leaves turn yellow and drop early. Spreads fast in cool, humid weather.',
      mr: 'पानांच्या खालच्या बाजूला लहान, उंचावलेले तपकिरी-लालसर पुटकुळे. पाने पिवळी पडून लवकर गळतात. थंड, दमट हवेत झपाट्याने पसरतो.', hi: 'पत्तियों की निचली सतह पर छोटे, उभरे भूरे से लाल-भूरे फफोले। पत्तियाँ पीली होकर जल्दी झड़ती हैं। ठंडे, नम मौसम में तेज़ी से फैलता है।'
    },
    diseased: true,
    referLab: false,
    etl: { en: 'No numeric threshold: spray at the first sign of rust, then once more 15 days later.', mr: 'ठराविक पातळी नाही: तांबेरा दिसताच फवारणी करा, नंतर 15 दिवसांनी पुन्हा एकदा.', hi: 'कोई तय सीमा नहीं: गेरुआ दिखते ही छिड़काव करें, फिर 15 दिन बाद एक बार और।' },
    steps: [
      { tier: 'cultural', text: { en: 'Next season: a rust-tolerant variety and early sowing where rust comes every year, so the crop matures before it arrives.', mr: 'पुढील हंगामात तांबेरा-सहनशील वाण आणि दरवर्षी तांबेरा येणाऱ्या भागात लवकर पेरणी करा.', hi: 'अगले मौसम में: गेरुआ-सहनशील किस्म, और जहाँ हर साल गेरुआ आता है वहाँ जल्दी बुवाई, ताकि उससे पहले फ़सल पक जाए।' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Hexaconazole 5% EC — 0.1% (10 ml per 10 L of water), 2 sprays 15 days apart', perTank: 15, unit: 'ml', tankL: 15, tanksPerAcre: 13, waitDays: null, ppe: PPE, source: 'Indian field trials on Asian soybean rust (Indian Journal of Plant Protection; reviewed in Frontiers in Microbiology, 2023); 10 ml per 10 L as in Maharashtra university advisories' }
    ]
  },
  sudden_death_syndrome: {
    name: { en: 'Sudden death syndrome (suspected)', mr: 'अचानक मर (संशयित)', hi: 'अचानक मृत्यु रोग (आशंका)' },
    markers: {
      en: 'Yellow patches between the veins that turn brown while the veins stay green, usually from flowering on; leaflets drop but the leaf stalks stay on. Rare in India — root rots such as charcoal rot look similar, so get it confirmed.',
      mr: 'शिरांमधील भाग पिवळा होऊन तपकिरी होतो, शिरा हिरव्याच राहतात; पर्णिका गळतात पण देठ राहतात. भारतात दुर्मिळ — कोळशी कूज सारखे मुळकूज रोग असेच दिसतात, म्हणून खात्री करून घ्या.', hi: 'फूल आने के बाद से अक्सर नसों के बीच पीले धब्बे जो भूरे हो जाते हैं जबकि नसें हरी रहती हैं; पर्णक झड़ जाते हैं पर डंठल लगे रहते हैं। भारत में दुर्लभ — चारकोल सड़न जैसे जड़ सड़न रोग ऐसे ही दिखते हैं, इसलिए पुष्टि करवाएँ।'
    },
    diseased: true,
    referLab: true,
    steps: [
      { tier: 'cultural', text: { en: 'Avoid waterlogging and soil compaction; rotate with a non-legume crop. Next season: seed treated with thiram + carbendazim (2:1) at 3 g per kg of seed. A leaf spray does not reach a root infection, so none is advised.', mr: 'पाणी साचू देऊ नका, माती दबू देऊ नका; द्विदल नसलेल्या पिकाची फेरपालट करा. पुढील हंगामात थायरम + कार्बेन्डाझिम (2:1) 3 ग्रॅम प्रति किलो बियाण्यास लावा. मुळांतील संसर्गावर पानांवरील फवारणी पोहोचत नाही, म्हणून फवारणी सुचवलेली नाही.', hi: 'पानी भराव और मिट्टी दबने से बचें; दलहन के अलावा किसी फ़सल से फ़सल-चक्र अपनाएँ। अगले मौसम में: थायरम + कार्बेन्डाज़िम (2:1) 3 ग्राम प्रति किलो बीज से उपचारित बीज। पत्ती पर छिड़काव जड़ के संक्रमण तक नहीं पहुँचता, इसलिए छिड़काव नहीं सुझाया गया है।' } },
      { tier: 'mechanical', text: { en: 'Pull up a few affected plants and check the roots before deciding anything.', mr: 'निर्णय घेण्यापूर्वी काही बाधित झाडे उपटून मुळे तपासा.', hi: 'कोई फ़ैसला लेने से पहले कुछ प्रभावित पौधे उखाड़कर जड़ें देखें।' } }
    ]
  },
  other: other('soybean leaf', 'एक सोयाबीनचे पान', 'सोयाबीन की एक पत्ती')
};

// ---------- sugarcane ----------
const SUGARCANE = {
  healthy,
  red_rot: {
    name: { en: 'Red rot', mr: 'लाल कूज', hi: 'लाल सड़न' },
    markers: {
      en: 'The third or fourth leaf turns orange, then yellow, and leaves dry from the bottom up; reddish spots on the back of the midrib. Split the cane: inside it is red with white patches across it.',
      mr: 'तिसरे-चौथे पान नारिंगी, मग पिवळे होते आणि पाने खालून वर वाळतात; मध्यशिरेच्या मागे लालसर ठिपके. ऊस उभा चिरा: आतून लाल, आडवे पांढरे पट्टे.', hi: 'तीसरी-चौथी पत्ती नारंगी फिर पीली होती है और पत्तियाँ नीचे से ऊपर सूखती हैं; मध्य शिरा के पीछे लाल धब्बे। गन्ना बीच से चीरें: अंदर लाल, बीच-बीच में आड़ी सफ़ेद पट्टियाँ।'
    },
    diseased: true,
    referLab: false,
    steps: [
      { tier: 'cultural', text: { en: 'Next planting: setts only from healthy cane in a disease-free field, dipped in carbendazim 50% WP at 1 g per litre for 15 minutes; a resistant variety such as Co 86032. Rotate an affected field — rice for one season and other crops for two.', mr: 'पुढील लागवडीत रोगमुक्त शेतातील निरोगी उसाचीच बेणे, कार्बेन्डाझिम 50% WP 1 ग्रॅम प्रति लिटरमध्ये 15 मिनिटे बुडवून; Co 86032 सारखे प्रतिकारक वाण. बाधित शेतात फेरपालट — एक हंगाम भात, दोन हंगाम इतर पिके.', hi: 'अगली बुवाई में: रोग-मुक्त खेत के स्वस्थ गन्ने से ही बीज टुकड़े, कार्बेन्डाज़िम 50% WP 1 ग्राम प्रति लीटर में 15 मिनट डुबोकर; Co 86032 जैसी प्रतिरोधी किस्म। प्रभावित खेत में फ़सल-चक्र — एक मौसम धान, दो मौसम अन्य फ़सलें।' } },
      { tier: 'mechanical', text: { en: 'Uproot affected clumps early and burn them. Do not keep a ratoon from an affected field.', mr: 'बाधित बेटे लवकर उपटून जाळा. बाधित शेताचा खोडवा ठेवू नका.', hi: 'प्रभावित झुंड जल्दी उखाड़कर जला दें। प्रभावित खेत की पेड़ी (रैटून) न रखें।' } },
      { tier: 'chemical', onlyAboveEtl: true, spot: true, product: 'Carbendazim 50% WP — soil drench where affected clumps were removed', perLitre: '1 g', ppe: PPE, source: `${TNAU}: Diseases of Sugarcane — Red rot; sett dip from ICAR-Sugarcane Breeding Institute sett-treatment trials` }
    ]
  },
  rust: {
    name: { en: 'Rust', mr: 'तांबेरा', hi: 'गेरुआ (रस्ट)' },
    markers: {
      en: 'Small, long yellowish spots on both sides of the leaf that turn orange-brown to red-brown and merge into large dead patches; leaves die early.',
      mr: 'पानाच्या दोन्ही बाजूंना लहान लांबट पिवळसर ठिपके, जे नारिंगी-तपकिरी होऊन मोठे करपलेले भाग बनवतात; पाने लवकर मरतात.', hi: 'पत्ती के दोनों ओर छोटे, लंबे पीले धब्बे जो नारंगी-भूरे से लाल-भूरे होकर मिल जाते हैं और बड़े सूखे हिस्से बनाते हैं; पत्तियाँ जल्दी मर जाती हैं।'
    },
    diseased: true,
    referLab: false,
    steps: [
      { tier: 'cultural', text: { en: 'Next planting: a rust-resistant variety recommended for your area.', mr: 'पुढील लागवडीत तुमच्या भागासाठी शिफारस केलेले तांबेरा-प्रतिकारक वाण.', hi: 'अगली बुवाई में: आपके इलाके के लिए अनुशंसित गेरुआ-प्रतिरोधी किस्म।' } },
      { tier: 'mechanical', text: { en: 'Remove affected leaves and burn them straight away.', mr: 'बाधित पाने काढून लगेच जाळा.', hi: 'प्रभावित पत्तियाँ हटाकर तुरंत जला दें।' } },
      // TNAU gives both 2 g per litre and 2.0 kg/ha, i.e. about 1000 L of spray per
      // hectare for this tall crop: 27 knapsacks of 15 L per acre.
      { tier: 'chemical', onlyAboveEtl: true, product: 'Mancozeb 75% WP (dose: 2 g per litre of water; 2.0 kg per hectare)', perTank: 30, unit: 'g', tankL: 15, tanksPerAcre: 27, waitDays: null, ppe: PPE, source: `${TNAU}: Diseases of Sugarcane — Rust` }
    ]
  },
  mosaic: {
    name: { en: 'Mosaic (virus)', mr: 'मोझॅक (विषाणूजन्य)', hi: 'मोज़ेक (विषाणु)' },
    markers: {
      en: 'Pale green to yellow streaks and mottling between darker green areas, clearest on young leaves. Spread by aphids and by cutting setts from infected cane.',
      mr: 'कोवळ्या पानांवर गडद हिरव्या भागांमध्ये फिकट हिरवे-पिवळे पट्टे व ठिपके. मावा किडीमुळे व बाधित उसाच्या बेण्यामुळे पसरतो.', hi: 'गहरे हरे हिस्सों के बीच हल्के हरे से पीली धारियाँ और चितकबरापन, नई पत्तियों पर सबसे साफ़। माहू से और संक्रमित गन्ने के बीज टुकड़ों से फैलता है।'
    },
    diseased: true,
    referLab: true,
    steps: [
      { tier: 'cultural', text: { en: 'No spray cures a virus. Next planting: mosaic-free seed cane or tissue-culture seedlings, never setts from an infected field; a resistant variety. Do not ratoon a badly infected field.', mr: 'कोणतीही फवारणी विषाणू बरा करत नाही. पुढील लागवडीत मोझॅकमुक्त बेणे किंवा ऊती-संवर्धित रोपे; बाधित शेतातील बेणे कधीही नको; प्रतिकारक वाण. जास्त बाधित शेताचा खोडवा ठेवू नका.', hi: 'कोई छिड़काव विषाणु ठीक नहीं करता। अगली बुवाई में: मोज़ेक-मुक्त बीज गन्ना या टिशू कल्चर पौधे, संक्रमित खेत के बीज टुकड़े कभी नहीं; प्रतिरोधी किस्म। ज़्यादा संक्रमित खेत की पेड़ी न रखें।' } },
      { tier: 'mechanical', text: { en: 'Uproot infected clumps early; keep grass weeds and sorghum near the field in check, since they carry the virus too.', mr: 'बाधित बेटे लवकर उपटा; शेताजवळील गवत व ज्वारी आटोक्यात ठेवा, कारण त्यातही विषाणू राहतो.', hi: 'संक्रमित झुंड जल्दी उखाड़ें; खेत के पास घास वाले खरपतवार और ज्वार पर काबू रखें, क्योंकि उनमें भी विषाणु रहता है।' } }
    ]
  },
  yellow_leaf: {
    name: { en: 'Yellow leaf disease (virus)', mr: 'पिवळ्या पानांचा रोग (विषाणूजन्य)', hi: 'पीली पत्ती रोग (विषाणु)' },
    markers: {
      en: 'The midrib and the leaf around it turn yellow on the top 3–5 leaves, then dry along the midrib; the midrib can turn reddish. Short internodes and a bunchy top when severe.',
      mr: 'वरच्या 3-5 पानांची मध्यशीर व भोवतालचा भाग पिवळा होऊन मध्यशिरेलगत वाळतो; मध्यशीर लालसर होऊ शकते. तीव्र असल्यास कांडी आखूड व शेंडा गुच्छासारखा.', hi: 'ऊपर की 3–5 पत्तियों की मध्य शिरा और उसके आसपास का हिस्सा पीला होकर मध्य शिरा के साथ सूखता है; मध्य शिरा लाल हो सकती है। गंभीर होने पर पोरियाँ छोटी और शीर्ष गुच्छेदार।'
    },
    diseased: true,
    referLab: true,
    steps: [
      { tier: 'cultural', text: { en: 'No spray cures a virus. Next planting: disease-free planting material, preferably tissue-culture (meristem) plants raised in a nursery first; balanced nutrition and a resistant variety.', mr: 'कोणतीही फवारणी विषाणू बरा करत नाही. पुढील लागवडीत रोगमुक्त लागवड साहित्य, शक्यतो रोपवाटिकेत वाढवलेली ऊती-संवर्धित (मेरिस्टेम) रोपे; संतुलित खते व प्रतिकारक वाण.', hi: 'कोई छिड़काव विषाणु ठीक नहीं करता। अगली बुवाई में: रोग-मुक्त रोपण सामग्री, बेहतर हो नर्सरी में पहले तैयार टिशू कल्चर (मेरिस्टेम) पौधे; संतुलित पोषण और प्रतिरोधी किस्म।' } },
      { tier: 'mechanical', text: { en: 'Remove infected clumps and keep the field clean. Ask the KVK before spraying anything for the aphids that spread it.', mr: 'बाधित बेटे काढा व शेत स्वच्छ ठेवा. प्रसार करणाऱ्या माव्यासाठी काहीही फवारण्यापूर्वी KVK चा सल्ला घ्या.', hi: 'संक्रमित झुंड हटाएँ और खेत साफ़ रखें। इसे फैलाने वाले माहू के लिए कुछ भी छिड़कने से पहले KVK से पूछें।' } }
    ]
  },
  other: other('sugarcane leaf', 'उसाचे एक पान', 'गन्ने की एक पत्ती')
};

// ---------- chickpea (Fusarium wilt, graded by the model) ----------
const wiltSteps = [
  { tier: 'cultural', text: { en: 'Deep summer ploughing; long crop rotation (the source advises up to 6 years with sorghum); 10–15 cart loads of FYM per hectare; avoid sowing in hot weather. Next season: disease-free seed of a wilt-resistant variety recommended by your KVK.', mr: 'उन्हाळ्यात खोल नांगरट; दीर्घ फेरपालट (ज्वारीसोबत 6 वर्षांपर्यंत); हेक्टरी 10-15 गाड्या शेणखत; उष्ण हवामानात पेरणी टाळा. पुढील हंगामात KVK ने शिफारस केलेल्या मर-प्रतिकारक वाणाचे रोगमुक्त बियाणे.', hi: 'गर्मी में गहरी जुताई; लंबा फ़सल-चक्र (स्रोत ज्वार के साथ 6 साल तक की सलाह देता है); प्रति हेक्टेयर 10–15 गाड़ी गोबर खाद; गर्म मौसम में बुवाई से बचें। अगले मौसम में: KVK द्वारा अनुशंसित उकठा-प्रतिरोधी किस्म का रोग-मुक्त बीज।' } },
  { tier: 'mechanical', text: { en: 'Pull out wilted plants with their roots and destroy them, away from the field.', mr: 'मर झालेली झाडे मुळासकट उपटून शेतापासून दूर नष्ट करा.', hi: 'मुरझाए पौधे जड़ समेत उखाड़कर खेत से दूर नष्ट करें।' } },
  { tier: 'biological', text: { en: 'Next season: seed treatment with Trichoderma viride at 4 g per kg or Pseudomonas fluorescens at 10 g per kg of seed. Now: Pseudomonas fluorescens or T. viride at 2.5 kg per hectare mixed with 50 kg of FYM, applied to the affected patches.', mr: 'पुढील हंगामात बीजप्रक्रिया: ट्रायकोडर्मा व्हिरिडी 4 ग्रॅम किंवा स्यूडोमोनास फ्लुरोसेन्स 10 ग्रॅम प्रति किलो बियाणे. आता: स्यूडोमोनास किंवा ट्रायकोडर्मा हेक्टरी 2.5 किलो, 50 किलो शेणखतात मिसळून बाधित भागात द्या.', hi: 'अगले मौसम में बीज उपचार: ट्राइकोडर्मा विरिडी 4 ग्राम या स्यूडोमोनास फ्लोरेसेंस 10 ग्राम प्रति किलो बीज। अभी: स्यूडोमोनास या ट्राइकोडर्मा 2.5 किलो प्रति हेक्टेयर, 50 किलो गोबर खाद में मिलाकर प्रभावित हिस्सों में डालें।' } },
  { tier: 'chemical', onlyAboveEtl: true, spot: true, product: 'Carbendazim — spot drench around the wilting patches', perLitre: '1 g', ppe: PPE, source: `${TNAU}: Diseases of Bengal gram — Fusarium wilt` }
];
const CHICKPEA = {
  healthy,
  wilt_moderate: {
    name: { en: 'Fusarium wilt (moderate)', mr: 'मर रोग (मध्यम)', hi: 'उकठा रोग (मध्यम)' },
    markers: {
      en: 'Leaf stalks and leaflets droop, often in patches. Split the stem near the base: dark brown discolouration inside confirms wilt.',
      mr: 'देठ व पर्णिका लोंबकळतात, बहुधा पट्ट्यांमध्ये. खोडाचा खालचा भाग चिरा: आत गडद तपकिरी रंग दिसल्यास मर रोग निश्चित.', hi: 'डंठल और पर्णक लटक जाते हैं, अक्सर टुकड़ों में। तने का निचला हिस्सा चीरें: अंदर गहरा भूरा रंग उकठा की पुष्टि करता है।'
    },
    diseased: true,
    referLab: false,
    steps: wiltSteps
  },
  wilt_severe: {
    name: { en: 'Fusarium wilt (severe)', mr: 'मर रोग (तीव्र)', hi: 'उकठा रोग (गंभीर)' },
    markers: {
      en: 'Whole plants dried and collapsed, in patches, with dark discolouration inside the lower stem. Dead plants will not recover — the aim now is to stop the spread and protect next season.',
      mr: 'पट्ट्यांमध्ये संपूर्ण झाडे वाळून कोलमडलेली, खोडाच्या खालच्या भागात आत गडद रंग. मेलेली झाडे पुन्हा जगत नाहीत — आता प्रसार थांबवणे व पुढील हंगाम वाचवणे हे ध्येय.', hi: 'टुकड़ों में पूरे पौधे सूखकर गिरे हुए, तने के निचले हिस्से में अंदर गहरा रंग। मरे पौधे दोबारा नहीं बचते — अब लक्ष्य फैलाव रोकना और अगला मौसम बचाना है।'
    },
    diseased: true,
    referLab: false,
    steps: wiltSteps
  },
  other: other('chickpea plant', 'एक हरभऱ्याचे झाड', 'चने का एक पौधा')
};

export const IPM_BY_CROP = { Cotton: COTTON, Soybean: SOYBEAN, Sugarcane: SUGARCANE, Chickpea: CHICKPEA };

// What the app says about `label` on `crop`. Unknown crops fall back to cotton
// (older cases have no crop field and were all cotton); unknown labels to "other".
export function ipmFor(label, crop) {
  const set = IPM_BY_CROP[crop] || COTTON;
  return set[label] || set.other;
}

// The classes an expert can pick when correcting a case on this crop.
export function classesFor(crop) {
  return Object.keys(IPM_BY_CROP[crop] || COTTON).filter(l => l !== 'other');
}
