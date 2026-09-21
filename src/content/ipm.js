// What the app says for each class the model can return.
// The class keys MUST match the Teachable Machine class names exactly.
//
// CONTENT TEAM: every line starting with "TODO" shows up highlighted in the app.
// Fill it from the Maharashtra SAU package of practices (Dr PDKV Akola / MPKV
// Rahuri / VNMKV Parbhani), ICAR-CICR advisories and CIB&RC label claims, and put
// the reference in `source`. Never invent a product or dose.
// Marathi text needs review by a native speaker.

export const THRESHOLD = 0.7; // below this top-1 confidence the app does not prescribe

// Field severity index = % plants infected × average leaf severity ÷ 100 (0–100).
// Chemical step unlocks at or above this. TODO (content team): replace with the
// real economic threshold for each pest/disease from the SAU package of practices.
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
    steps: [
      { tier: 'cultural', text: { en: 'Avoid evening and overhead irrigation; keep the field free of weeds. Next season: treated seed of a tolerant variety.', mr: 'संध्याकाळी व वरून पाणी देणे टाळा; शेत तणमुक्त ठेवा. पुढील हंगामात प्रक्रिया केलेले, सहनशील वाणाचे बियाणे वापरा.' } },
      { tier: 'mechanical', text: { en: 'Pick and destroy badly infected leaves. Do not work in the crop while leaves are wet.', mr: 'जास्त बाधित पाने तोडून नष्ट करा. पाने ओली असताना पिकात काम करू नका.' } },
      { tier: 'biological', text: { en: 'TODO: biological option and dose from the SAU package of practices.', mr: 'TODO' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'TODO: label-claim product for cotton bacterial blight', gPerTank: null, tankL: 15, tanksPerAcre: 3, waitDays: null, ppe: 'Gloves, mask, full sleeves', source: 'TODO' }
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
      { tier: 'mechanical', text: { en: 'Yellow sticky traps to monitor whitefly, the virus carrier.', mr: 'पांढरी माशी पाहण्यासाठी पिवळे चिकट सापळे लावा.' } },
      { tier: 'biological', text: { en: 'TODO: whitefly biological control from the SAU package of practices.', mr: 'TODO' } }
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
    etl: { en: 'TODO: confirm ETL (ICAR-CICR gives nymphs per leaf)', mr: 'TODO' },
    steps: [
      { tier: 'cultural', text: { en: 'Avoid excess nitrogen; remove weed hosts.', mr: 'जास्त नत्र टाळा; तण काढा.' } },
      { tier: 'mechanical', text: { en: 'Yellow sticky traps; count nymphs on 20 leaves from the top of the plant.', mr: 'पिवळे चिकट सापळे; झाडाच्या वरच्या 20 पानांवरील पिल्ले मोजा.' } },
      { tier: 'biological', text: { en: 'Conserve lady beetles and lacewings. TODO: neem-based spray and dose from the SAU package of practices.', mr: 'ढालकिडे व क्रायसोपा यांचे संवर्धन करा. TODO' } },
      { tier: 'chemical', onlyAboveEtl: true, product: 'TODO: label-claim product for cotton jassids', gPerTank: null, tankL: 15, tanksPerAcre: 3, waitDays: null, ppe: 'Gloves, mask, full sleeves', source: 'TODO' }
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
