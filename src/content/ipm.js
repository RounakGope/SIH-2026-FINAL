// What the app says for each class the model can return.
// The class keys MUST match the Teachable Machine class names exactly.
//
// CONTENT TEAM: every line starting with "TODO" shows up highlighted in the app.
// Fill it from the Maharashtra SAU package of practices (Dr PDKV Akola / MPKV
// Rahuri / VNMKV Parbhani), ICAR-CICR advisories and CIB&RC label claims, and put
// the reference in `source`. Never invent a product or dose.
// Marathi text needs review by a native speaker.
//
// Products, doses and ETLs below are taken from:
//   ICAR-CICR Nagpur, "Strategies and Advisory for Cotton Pest and Disease
//   Management for the year 2024-25", sections D and E.
// STILL NEEDS A DOMAIN CHECK before any farmer acts on it: (a) a KVK/SAU agronomist
// should confirm each product is label-claimed for cotton in Maharashtra, and
// (b) the Marathi needs a native speaker.

export const THRESHOLD = 0.7; // below this top-1 confidence the app does not prescribe

// ICAR-CICR spray volume for cotton: 150–200 L of water per acre (375–500 L/ha).
// A 15 L knapsack therefore needs ~13 tanks to cover one acre (≈195 L/acre), and
// every `gPerTank` below is the ICAR per-10-L dose scaled to a 15 L tank (×1.5).
export const TANK_L = 15;
export const TANKS_PER_ACRE = 13;

// Field severity index = % plants infected × average leaf severity ÷ 100 (0–100).
// The chemical rung unlocks at or above this. NOTE: this is a whole-field severity
// gate, not a per-pest ETL — the real ETLs are per pest and in different units
// (jassid: 2 nymphs/leaf, whitefly: 6/leaf, pink bollworm: 8 moths/trap for 3
// nights). Each entry carries its own `etl` string; the index gate is the app's
// coarse "don't reach for chemicals yet" guard on top of that.
export const CHEM_UNLOCK_INDEX = 5;

export const IPM = {
  healthy: {
    name: { en: 'Healthy leaf', mr: 'निरोगी पान' },
    markers: { en: 'No lesions, curling or hopper burn found on this leaf.', mr: 'या पानावर डाग, गुंडाळणे किंवा करपा आढळला नाही.' },
    diseased: false,
    referLab: false,
    steps: [
      { tier: 'cultural', text: { en: 'Keep scouting weekly on the same 10-plant walk.', mr: 'दर आठवड्याला त्याच 10 झाडांची पाहणी सुरू ठेवा.' } }
    ]
  },
  bacterial_blight: {
    name: { en: 'Bacterial blight', mr: 'जिवाणूजन्य करपा' },
    markers: {
      en: 'Angular, water-soaked spots bounded by the leaf veins, turning brown; can run along the veins.',
      mr: 'शिरांच्या मर्यादेत कोनदार, पाणथळ ठिपके जे नंतर तपकिरी होतात.'
    },
    diseased: true,
    referLab: false,
    etl: { en: 'No spray threshold is published for bacterial blight. Treat on visible spread, and only after the cultural and mechanical steps.', mr: 'जिवाणूजन्य करप्यासाठी ठराविक पातळी नाही. प्रादुर्भाव वाढताना, मशागत व यांत्रिक उपायांनंतरच फवारणी करा.' },
    steps: [
      { tier: 'cultural', text: { en: 'Avoid evening and overhead irrigation; keep the field free of weeds. Next season: treated seed of a tolerant variety.', mr: 'संध्याकाळी व वरून पाणी देणे टाळा; शेत तणमुक्त ठेवा. पुढील हंगामात प्रक्रिया केलेले, सहनशील वाणाचे बियाणे वापरा.' } },
      { tier: 'mechanical', text: { en: 'Pick and destroy badly infected leaves. Do not work in the crop while leaves are wet.', mr: 'जास्त बाधित पाने तोडून नष्ट करा. पाने ओली असताना पिकात काम करू नका.' } },
      { tier: 'biological', text: { en: 'Seed treatment next season: Pseudomonas fluorescens WP at 10 g per kg of seed. For plants showing early symptoms, drench them and the ring around them with Trichoderma harzianum or T. viride 1% WP at 50 g per 10 L of water.', mr: 'पुढील हंगामात बीजप्रक्रिया: स्यूडोमोनास फ्लुरोसेन्स WP 10 ग्रॅम प्रति किलो बियाणे. सुरुवातीची लक्षणे दिसणाऱ्या झाडांभोवती ट्रायकोडर्मा हर्जियानम किंवा व्हिरिडी 1% WP 50 ग्रॅम प्रति 10 लिटर पाण्यात आळवणी करा.' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Copper oxychloride 50% WP — 1 to 2 foliar sprays at weekly interval (ICAR dose: 25 g per 10 L of water)', gPerTank: 37.5, tankL: 15, tanksPerAcre: 13, waitDays: null, ppe: 'Gloves, mask, full sleeves', source: 'ICAR-CICR Nagpur, Cotton Pest and Disease Advisory 2024-25, section E (bacterial leaf blight, 45–120 DAS)' }
    ]
  },
  leaf_curl: {
    name: { en: 'Leaf curl (suspected virus)', mr: 'पाने गुंडाळणे (विषाणूजन्य संशय)' },
    markers: {
      en: 'Upward or downward curling, thickened veins, sometimes leaf-like outgrowths under the leaf. Spread by whitefly.',
      mr: 'पाने वर/खाली गुंडाळतात, शिरा जाड होतात. पांढरी माशी प्रसार करते.'
    },
    diseased: true,
    referLab: true,
    steps: [
      { tier: 'cultural', text: { en: 'Uproot and destroy infected plants early; remove weed hosts around the field.', mr: 'बाधित झाडे लवकर उपटून नष्ट करा; शेताभोवतीचे तण काढा.' } },
      { tier: 'mechanical', text: { en: 'Yellow sticky traps to monitor whitefly, the virus carrier: 20 per hectare to watch, 100 per hectare to knock the population down.', mr: 'पांढरी माशी पाहण्यासाठी पिवळे चिकट सापळे: निरीक्षणासाठी हेक्टरी 20, नियंत्रणासाठी हेक्टरी 100.' } },
      { tier: 'biological', text: { en: 'Control the whitefly and you control the virus. Two sprays of neem oil in the early crop, up to 60 days after sowing — NSKE 5% plus neem oil at 5 ml per litre of water, with 1 g of laundry detergent per litre as the emulsifier.', mr: 'पांढरी माशी आवरली की विषाणूही आवरतो. पेरणीनंतर 60 दिवसांपर्यंत निंबोळी तेलाच्या दोन फवारण्या — NSKE 5% अधिक निंबोळी तेल 5 मिली प्रति लिटर पाण्यात, 1 ग्रॅम धुण्याची पावडर मिसळून.' } }
    ]
  },
  jassid_damage: {
    name: { en: 'Jassid (leafhopper) damage', mr: 'तुडतुड्यांचा प्रादुर्भाव' },
    markers: {
      en: 'Leaf edges yellow then reddish-brown and curl down ("hopper burn"); green nymphs on the underside.',
      mr: 'पानांच्या कडा पिवळ्या-लालसर होऊन खाली वळतात; पानाखाली हिरवी पिल्ले.'
    },
    diseased: true,
    referLab: false,
    etl: { en: 'Economic threshold: 2 nymphs per leaf on average, or 25% of plants showing hopper-burn grade II or worse, counted on 20 plants per acre.', mr: 'आर्थिक नुकसान पातळी: सरासरी 2 पिल्ले प्रति पान, किंवा 25% झाडांवर ग्रेड II किंवा अधिक करपा. एकरी 20 झाडांवर मोजणी करा.' },
    steps: [
      { tier: 'cultural', text: { en: 'Avoid excess nitrogen; remove weed hosts.', mr: 'जास्त नत्र टाळा; तण काढा.' } },
      { tier: 'mechanical', text: { en: 'Yellow sticky traps; count nymphs on 20 leaves from the top of the plant.', mr: 'पिवळे चिकट सापळे; झाडाच्या वरच्या 20 पानांवरील पिल्ले मोजा.' } },
      { tier: 'biological', text: { en: 'Conserve lady beetles and lacewings. In the first 60 days after sowing, spray NSKE 5% plus neem oil at 5 ml per litre of water (300 or 1500 ppm formulation), with 1 g of laundry detergent per litre as the emulsifier — 1 to 2 sprays.', mr: 'ढालकिडे व क्रायसोपा यांचे संवर्धन करा. पेरणीनंतर पहिल्या 60 दिवसांत NSKE 5% अधिक निंबोळी तेल 5 मिली प्रति लिटर पाण्यात (300 किंवा 1500 ppm), 1 ग्रॅम धुण्याची पावडर मिसळून — 1 ते 2 फवारण्या.' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'Flonicamid 50% WG (ICAR dose: 4 g per 10 L of water, 200 g/ha). Do not repeat the same insecticide more than twice in a season.', gPerTank: 6, tankL: 15, tanksPerAcre: 13, waitDays: 25, ppe: 'Gloves, mask, full sleeves', source: 'ICAR-CICR Nagpur, Cotton Pest and Disease Advisory 2024-25, section D (jassid, 60–90 DAS); waiting period from the Flonicamid 50% WG label for cotton — confirm against the pack you buy' }
    ]
  },
  other: {
    name: { en: 'Could not recognise this photo', mr: 'फोटो ओळखता आला नाही' },
    markers: {
      en: 'Retake with one cotton leaf filling the frame, in shade, or send it to the KVK expert.',
      mr: 'एक कापसाचे पान पूर्ण फ्रेममध्ये, सावलीत पुन्हा फोटो घ्या किंवा तज्ञांकडे पाठवा.'
    },
    diseased: false,
    referLab: false,
    steps: []
  }
};

export const TIER_LABEL = {
  cultural: { en: 'Cultural', mr: 'मशागत' },
  mechanical: { en: 'Mechanical', mr: 'यांत्रिक' },
  biological: { en: 'Biological', mr: 'जैविक' },
  chemical: { en: 'Chemical: only above the economic threshold', mr: 'रासायनिक: फक्त आर्थिक नुकसान पातळीवर' }
};

export function ipmFor(label) {
  return IPM[label] || IPM.other;
}

// ILLUSTRATIVE economics, same formulas as the design. Replace with a real
// product price and the Wardha cotton mandi rate, and cite them.
export const ECONOMICS = {
  illustrative: true,
  remedyCostPerAcre: 920,     // ₹, TODO: real product + labour cost
  subsidyPct: 0,              // TODO: only if a scheme actually covers this input
  valueProtectedPerAcre: 9300 // ₹, TODO: yield (q/acre) × mandi rate × loss avoided
};
