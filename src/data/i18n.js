/**
 * Krishi Mitra — Multilingual Vernacular Localization Dictionary
 * Supports instant bilingual toggling (English ↔ हिंदी) for Indian farmers.
 */

export const TRANSLATIONS = {
  en: {
    brandName: 'Krishi Mitra',
    brandSub: 'Field intelligence',
    welcomeBack: 'Welcome back',
    signInTitle: 'Sign in to begin',
    signInSub: 'Use your Gmail address, or continue as a guest to explore every feature.',
    emailLabel: 'Gmail address',
    passwordLabel: 'Password',
    rememberMe: 'Keep me signed in',
    forgotPassword: 'Forgot password?',
    continueBtn: 'Continue',
    continueGuestBtn: 'Continue as guest',
    backBtn: '← Back',
    autoSaved: '● Auto-saved',
    liveSatellite: '● Live Satellite',
    simulatedMode: '● Simulated Mode',
    estimatedModel: 'Estimated Model',
    signOut: 'Sign out',

    // Steps
    step1: 'Sign In',
    step2: 'Location',
    step3: 'Trace',
    step4: 'Scan',
    step5: 'Water',
    step6: 'Crops',
    step7: 'Market',

    step2_title: 'Confirm your field',
    step2_sub: 'We start from the village. Everything after this is measured from your plot.',
    step3_title: 'Trace the exact plot',
    step3_sub: 'Tap the corners of your field. We measure area and coordinates as you go.',
    step4_title: 'Scan the plot, then plan',
    step4_sub: 'Weather, soil and satellite signals for this exact point — then tell us how you farm.',
    step5_title: 'Water today, or wait?',
    step5_sub: 'One clear answer, with the soil moisture, rain and crop demand behind it.',
    step6_title: 'What fits this field best',
    step6_sub: 'Crops ranked for this soil and season, with profit per acre and the reasoning.',
    step7_title: 'Mandi & Market Intelligence',
    step7_sub: 'Real-time APMC price arbitrage, GoI MSP spreads, storage breakeven, and CACP cultivation cost economics.',

    // Step 2
    searchPlaceholder: 'Search village, tehsil or district',
    useMyLocation: 'Use my location',
    useMyCurrentLocation: 'Use my current location',
    confirmLocation: 'Confirm this location →',
    whyWeAsk: 'Why we ask',
    whyWeAskDesc: 'A 5 km shift changes the rain forecast, soil moisture and crop window. Your pin anchors all three.',

    // Step 3
    undo: 'Undo',
    clear: 'Clear',
    finishOutline: 'Finish outline',
    scanThisPlot: 'Scan this plot →',
    use1AcreEstimate: 'Use a 1-acre estimate',
    plotArea: 'Plot area',
    cornersMarked: 'Corners marked',
    perimeter: 'Perimeter',
    center: 'Center',

    // Step 4
    planTheSeason: 'Plan the season',
    cropYouWant: 'Crop you want to grow',
    irrigationSystem: 'Irrigation system',
    sowingDate: 'Sowing date',
    fertYouPlan: 'Fertilisers you plan to use',
    areaToPlan: 'Area to plan (acres)',
    getWateringDecision: 'Get watering decision →',

    // Step 5 Verdicts
    verdict_today: 'Water today',
    verdict_today_sub: 'The root zone is running dry and no useful rain is close.',
    verdict_soon: 'Water in a day or two',
    verdict_soon_sub: 'Soil water is falling. Prepare the field now, irrigate at the next calm morning.',
    verdict_hold: 'Hold the water',
    verdict_hold_sub: 'Rain is on the way. Irrigating now would wash nutrients past the roots.',
    verdict_skip: 'No watering needed',
    verdict_skip_sub: 'Soil water is comfortably above the stress line for this crop.',

    recWater: 'Recommended water',
    bestWindow: 'Best window',
    soilWater: 'Soil water',
    cropStage: 'Crop stage',
    whyThisCall: 'Why this call',
    nextSevenDays: 'Next seven days',
    editSetup: 'Edit field setup',
    seeBestCrops: 'See best crops for this soil →',

    // Step 6
    seasonScenario: 'Season scenario',
    scenario_normal: 'Normal season',
    scenario_dry: 'Dry year (−25% water)',
    scenario_wet: 'Strong monsoon (+15%)',
    sort_fit: 'Best fit',
    sort_profit: 'Highest profit',
    profitPerAcre: 'Profit per acre',
    forYourAcres: 'For your acres',
    startOver: 'Start over',
    savePrintSummary: 'Save / print summary',
    toMarketBtn: 'See Mandi & Market Intelligence →',

    // Step 7 Mandi & Market Intelligence
    mandiArbitrageTitle: 'Regional APMC Mandi Price Realization',
    mandiArbitrageSub: 'Prices net of transport & unloading freight from your farm gate.',
    bestNetMandi: 'Top Realization',
    extraProfitLabel: 'Extra Net Gain vs Local Mandi',
    freightDeduction: 'Estimated Freight',
    netRealizedRate: 'Net In-Pocket',
    mandiModalPrice: 'Gross Mandi Modal Price',
    distanceKm: 'Distance',
    transitTime: 'Est. Transit Time',

    mspSpreadTitle: 'GoI Minimum Support Price (MSP) vs Market Spread',
    mspSpreadSub: 'Official 2024–2026 CACP benchmark compared against open market rates.',
    officialMsp: 'Official CACP MSP',
    currentMarketRate: 'Current Open Market Rate',
    mspSpread: 'MSP Spread',
    procurementRecommendation: 'Procurement Recommendation',
    mspProcurementAgency: 'Procurement Window',
    fciNafedNotice: 'Govt. Procurement (FCI / NAFED)',

    storageCalculatorTitle: 'Post-Harvest "Sell Now vs. Warehouse Storage" Breakeven',
    storageCalculatorSub: 'Evaluate holding grain in WDRA accredited warehouses vs distress sale during harvest glut.',
    immediateSaleNet: 'Immediate Sale at Harvest Glut',
    storageHoldingPeriod: 'Holding Horizon',
    storageRentCost: 'Total Warehouse Rent',
    weightShrinkage: 'Moisture Shrinkage',
    expectedAppreciation: 'Anticipated Off-Season Price',
    netStorageGain: 'Net Gain from Holding',
    holdingVerdict: 'Storage Recommendation',

    costOfCultivationTitle: 'CACP Cost-of-Cultivation (A2+FL & C2 Economics)',
    costOfCultivationSub: 'Comprehensive input cost breakdown per quintal and per acre.',
    totalCostPerAcre: 'Total Cost / Acre',
    totalRevenuePerAcre: 'Gross Revenue / Acre',
    netMarginPerAcre: 'Net Margin / Acre',
    waterSavingBenefit: 'Krishi Mitra Water Saving',
    seedsExpense: 'Certified Seeds',
    fertilizersExpense: 'Nutrients & Fertilizers',
    energyExpense: 'Tubewell Fuel & Power',
    harvestExpense: 'Harvesting & Machine Labor',
    logisticsExpense: 'Post-Harvest Logistics',

    // AI & Voice Assistant
    aiAdvisory: '✨ AI Advisory',
    aiProfitAdvisory: '✨ AI Advisory',
    aiMarketAdvisory: '✨ AI Market Briefing',
    listenAdvisory: '🔊 Listen',
    listenProfit: '🔊 Listen',
    listenMarket: '🔊 Listen / मंडी सलाह सुनें',
    stopAudio: '⏹ Stop',
    playingAudio: 'Playing...',
    generatingAi: 'Generating AI advice...',
    gemmaModelBadge: 'Gemma 2 · Google DeepMind',
    elevenLabsBadge: 'ElevenLabs Voice AI',
    copyAdvice: 'Copy',
    copied: 'Copied!',
    closeAdvice: 'Close'
  },
  hi: {
    brandName: 'कृषि मित्र',
    brandSub: 'खेत की सटीक जानकारी',
    welcomeBack: 'स्वागत है',
    signInTitle: 'शुरू करने के लिए साइन इन करें',
    signInSub: 'अपना जीमेल पता उपयोग करें, या सभी सुविधाओं को देखने के लिए अतिथि के रूप में जारी रखें।',
    emailLabel: 'जीमेल पता',
    passwordLabel: 'पासवर्ड',
    rememberMe: 'मुझे साइन इन रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    continueBtn: 'आगे बढ़ें',
    continueGuestBtn: 'अतिथि के रूप में जारी रखें',
    backBtn: '← वापस',
    autoSaved: '● सुरक्षित किया गया',
    liveSatellite: '● लाइव सैटेलाइट',
    simulatedMode: '● सिम्युलेटेड डेटा',
    estimatedModel: 'अनुमानित मॉडल',
    signOut: 'साइन आउट',

    // Steps
    step1: 'लॉग इन',
    step2: 'स्थान',
    step3: 'खेत सीमा',
    step4: 'स्कैन',
    step5: 'सिंचाई सलाह',
    step6: 'फसल चयन',
    step7: 'मंडी बाज़ार',

    step2_title: 'अपने खेत का स्थान चुनें',
    step2_sub: 'हम गांव से शुरू करते हैं। इसके बाद सब कुछ आपके खेत के सटीक बिंदु से मापा जाता है।',
    step3_title: 'खेत की सटीक सीमा बनाएं',
    step3_sub: 'खेत के कोनों पर टैप करें। हम क्षेत्रफल और सीमा तुरंत मापते हैं।',
    step4_title: 'खेत स्कैन करें और योजना बनाएं',
    step4_sub: 'इस बिंदु के लिए मौसम, मिट्टी और सैटेलाइट डेटा — फिर बताएं कि आप कैसे खेती करते हैं।',
    step5_title: 'आज पानी दें या प्रतीक्षा करें?',
    step5_sub: 'एक स्पष्ट उत्तर, मिट्टी की नमी, बारिश और फसल की जरूरत के आधार पर।',
    step6_title: 'इस खेत के लिए सबसे उपयुक्त फसलें',
    step6_sub: 'इस मिट्टी और मौसम के लिए लाभदायक फसलें, प्रति एकड़ मुनाफे के साथ।',
    step7_title: 'मंडी भाव व बाज़ार रणनीति',
    step7_sub: 'क्षेत्रीय मंडियों का शुद्ध भाव, न्यूनतम समर्थन मूल्य (MSP), भंडारण विश्लेषण और लागत मुनाफा।',

    // Step 2
    searchPlaceholder: 'गांव, तहसील या जिला खोजें',
    useMyLocation: 'मेरा GPS स्थान लें',
    useMyCurrentLocation: 'मेरा वर्तमान स्थान लें',
    confirmLocation: 'इस स्थान की पुष्टि करें →',
    whyWeAsk: 'स्थान क्यों जरूरी है',
    whyWeAskDesc: '5 किमी के बदलाव से बारिश, मिट्टी की नमी और फसल का मौसम बदल जाता है। आपका पिन इन तीनों को सही रखता है।',

    // Step 3
    undo: 'पूर्ववत',
    clear: 'हटाएं',
    finishOutline: 'सीमा सुरक्षित करें',
    scanThisPlot: 'खेत स्कैन करें →',
    use1AcreEstimate: '1-एकड़ का अनुमान लगाएं',
    plotArea: 'खेत का क्षेत्रफल',
    cornersMarked: 'चिह्नित कोने',
    perimeter: 'परिधि',
    center: 'केंद्र',

    // Step 4
    planTheSeason: 'मौसम की योजना बनाएं',
    cropYouWant: 'जो फसल आप उगाना चाहते हैं',
    irrigationSystem: 'सिंचाई का प्रकार',
    sowingDate: 'बुवाई की तारीख',
    fertYouPlan: 'खाद जो आप उपयोग करेंगे',
    areaToPlan: 'योजना के लिए क्षेत्रफल (एकड़)',
    getWateringDecision: 'सिंचाई सलाह प्राप्त करें →',

    // Step 5 Verdicts
    verdict_today: 'आज सिंचाई करें',
    verdict_today_sub: 'जड़ क्षेत्र सूख रहा है और उपयोगी बारिश की संभावना नहीं है।',
    verdict_soon: 'एक-दो दिन में पानी दें',
    verdict_soon_sub: 'मिट्टी की नमी गिर रही है। तैयारी रखें और अगली सुबह सिंचाई करें।',
    verdict_hold: 'पानी रोकें (बारिश आने वाली है)',
    verdict_hold_sub: 'बारिश आने वाली है। अभी सिंचाई करने से खाद बह जाएगी और नुकसान होगा।',
    verdict_skip: 'अभी सिंचाई की आवश्यकता नहीं है',
    verdict_skip_sub: 'मिट्टी में फसल की जरूरत के अनुसार पर्याप्त नमी उपलब्ध है।',

    recWater: 'अनुशंसित पानी',
    bestWindow: 'उपयुक्त समय',
    soilWater: 'मिट्टी की नमी',
    cropStage: 'फसल की अवस्था',
    whyThisCall: 'इस सलाह का आधार',
    nextSevenDays: 'अगले सात दिन',
    editSetup: 'खेत विवरण बदलें',
    seeBestCrops: 'मिट्टी अनुसार सर्वोत्तम फसलें देखें →',

    // Step 6
    seasonScenario: 'मौसम का परिदृश्य',
    scenario_normal: 'सामान्य मौसम',
    scenario_dry: 'सूखा वर्ष (−25% पानी)',
    scenario_wet: 'भारी मानसून (+15% पानी)',
    sort_fit: 'सर्वोत्तम अनुकूल',
    sort_profit: 'अधिकतम मुनाफा',
    profitPerAcre: 'प्रति एकड़ मुनाफा',
    forYourAcres: 'आपके खेत के लिए कुल',
    startOver: 'पुनः प्रारंभ करें',
    savePrintSummary: 'सलाह सुरक्षित / प्रिंट करें',
    toMarketBtn: 'मंडी व बाज़ार रणनीति देखें →',

    // Step 7 Mandi & Market Intelligence
    mandiArbitrageTitle: 'आस-पास की मंडियों में शुद्ध भाव तुलना',
    mandiArbitrageSub: 'खेत से ढुलाई भाड़ा काटकर जेब में आने वाली वास्तविक दर।',
    bestNetMandi: 'सर्वोत्तम शुद्ध मुनाफा',
    extraProfitLabel: 'स्थानीय मंडी की तुलना में अतिरिक्त लाभ',
    freightDeduction: 'अनुमानित मालभाड़ा',
    netRealizedRate: 'शुद्ध प्राप्त दर',
    mandiModalPrice: 'मंडी का थोक भाव',
    distanceKm: 'दूरी',
    transitTime: 'पहुंचने का समय',

    mspSpreadTitle: 'सरकारी न्यूनतम समर्थन मूल्य (MSP) बनाम बाज़ार भाव',
    mspSpreadSub: 'कृषि लागत एवं मूल्य आयोग (CACP) 2024–2026 निर्धारित दर से तुलना।',
    officialMsp: 'आधिकारिक सरकारी MSP',
    currentMarketRate: 'वर्तमान बाज़ार भाव',
    mspSpread: 'MSP का अंतर',
    procurementRecommendation: 'बिक्री की सिफ़ारिश',
    mspProcurementAgency: 'खरीद केंद्र',
    fciNafedNotice: 'सरकारी खरीद (FCI / NAFED)',

    storageCalculatorTitle: 'फसल कटाई: तुरंत बेचें या गोदाम में रखें?',
    storageCalculatorSub: 'फसल आने पर मंदी के समय तुरंत बेचने बनाम WDRA गोदाम में रखने का नफा-नुकसान।',
    immediateSaleNet: 'कटाई पर तुरंत बिक्री दर',
    storageHoldingPeriod: 'गोदाम अवधि',
    storageRentCost: 'कुल गोदाम किराया',
    weightShrinkage: 'नमी सुखाने का वजन नुकसान',
    expectedAppreciation: 'ऑफ-सीजन अनुमानित भाव',
    netStorageGain: 'गोदाम में रखने पर शुद्ध लाभ',
    holdingVerdict: 'भंडारण सिफ़ारिश',

    costOfCultivationTitle: 'CACP खेती लागत (A2+FL व C2 वित्तीय विश्लेषण)',
    costOfCultivationSub: 'बीज, खाद, बिजली-डीजल और मजदूरी पर होने वाले वास्तविक खर्चे का विवरण।',
    totalCostPerAcre: 'कुल लागत / एकड़',
    totalRevenuePerAcre: 'सकल आमदनी / एकड़',
    netMarginPerAcre: 'शुद्ध मुनाफा / एकड़',
    waterSavingBenefit: 'कृषि मित्र से सिंचाई व खाद की बचत',
    seedsExpense: 'प्रमाणित बीज',
    fertilizersExpense: 'उर्वरक व सूक्ष्म पोषक तत्व',
    energyExpense: 'ट्यूबवेल बिजली व डीजल',
    harvestExpense: 'कटाई व थ्रेशिंग मजदूरी',
    logisticsExpense: 'परिवहन व लोडिंग',

    // AI & Voice Assistant
    aiAdvisory: '✨ एआई सलाह',
    aiProfitAdvisory: '✨ एआई सलाह',
    aiMarketAdvisory: '✨ एआई मंडी ब्रीफिंग',
    listenAdvisory: '🔊 आवाज़ में सुनें',
    listenProfit: '🔊 आवाज़ में सुनें',
    listenMarket: '🔊 Listen / मंडी सलाह सुनें',
    stopAudio: '⏹ रोकें',
    playingAudio: 'आवाज़ चल रही है...',
    generatingAi: 'एआई सलाह तैयार की जा रही है...',
    gemmaModelBadge: 'गेम्मा 2 · गूगल डीपमाइंड',
    elevenLabsBadge: 'इलेवनलैब्स वॉइस एआई',
    copyAdvice: 'कॉपी करें',
    copied: 'कॉपी हो गया!',
    closeAdvice: 'बंद करें'
  }
};

let currentLang = 'en';

export function getLanguage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem('km.lang');
      if (saved === 'hi' || saved === 'en') {
        currentLang = saved;
      }
    } catch (e) {}
  }
  return currentLang;
}

export function setLanguage(lang) {
  currentLang = lang === 'hi' ? 'hi' : 'en';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('km.lang', currentLang);
    } catch (e) {}
  }
  return currentLang;
}

export function t(key, fallback = '') {
  const lang = getLanguage();
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en?.[key] ?? fallback ?? key;
}

