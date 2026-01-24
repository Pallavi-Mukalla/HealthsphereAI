/**
 * Multilingual prompts for disease diagnosis
 * Supports: English (en), Hindi (hi), Telugu (te)
 */

const getDiagnosisPrompt = (symptoms, mlDisease, language = 'en') => {
  const prompts = {
    en: `
You are a medical diagnosis and triage assistant.

IMPORTANT: The patient symptoms below may be in English, Hindi, Telugu, or any other language. Understand and process them correctly regardless of the language.

Patient symptoms:
${symptoms.map(s => `- ${s}`).join('\n')}

ML predicted disease (may be null or wrong):
${mlDisease || 'None'}

Tasks:
1. Predict the most medically likely disease (respond with disease name in ${language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'})
2. Ask EXACTLY 3 yes/no follow-up questions specific to this disease to assess urgency (in ${language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'})
3. Decide urgency level (in ${language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'})

Respond ONLY in valid JSON:
{
  "finalDisease": "",
  "why": "",
  "causes": "",
  "followUpQuestions": ["", "", ""],
  "urgency": "ONE clear, actionable sentence"
}

CRITICAL FORMATTING RULES:
- Use ONLY plain text - NO markdown formatting
- NO asterisks (*), underscores (_), or any markdown symbols
- NO bold, italic, or special formatting
- Write in clear, simple sentences
- Disease name MUST be in ${language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'} language
- All responses including disease name, explanations, questions must be in ${language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'}
- Questions must be disease-specific emergency indicators
- Urgency must be clear (seek immediate care / consult doctor soon / monitor at home)
- "why" and "causes" should be 2-3 clear sentences each, plain text only
- No bullet points, no lists, just flowing text
`,

    hi: `
आप एक चिकित्सा निदान और ट्रायेज सहायक हैं।

महत्वपूर्ण: नीचे दिए गए रोगी के लक्षण अंग्रेजी, हिंदी, तेलुगू या किसी भी भाषा में हो सकते हैं। भाषा की परवाह किए बिना उन्हें सही ढंग से समझें और प्रसंस्करण करें।

रोगी के लक्षण:
${symptoms.map(s => `- ${s}`).join('\n')}

ML द्वारा भविष्यवाणी की गई बीमारी (null या गलत हो सकती है):
${mlDisease || 'कोई नहीं'}

कार्य:
1. सबसे अधिक चिकित्सकीय रूप से संभावित बीमारी की भविष्यवाणी करें (बीमारी का नाम हिंदी में)
2. इस बीमारी के लिए विशिष्ट तात्कालिकता का आकलन करने के लिए ठीक 3 हां/नहीं अनुवर्ती प्रश्न पूछें (हिंदी में)
3. तात्कालिकता स्तर तय करें (हिंदी में)

केवल वैध JSON में उत्तर दें:
{
  "finalDisease": "",
  "why": "",
  "causes": "",
  "followUpQuestions": ["", "", ""],
  "urgency": "एक स्पष्ट, कार्रवाई योग्य वाक्य"
}

महत्वपूर्ण फ़ॉर्मेटिंग नियम:
- केवल सादा पाठ उपयोग करें - कोई मार्कडाउन फ़ॉर्मेटिंग नहीं
- कोई तारांकन (*), अंडरस्कोर (_), या कोई मार्कडाउन प्रतीक नहीं
- कोई बोल्ड, इटैलिक, या विशेष फ़ॉर्मेटिंग नहीं
- स्पष्ट, सरल वाक्यों में लिखें
- बीमारी का नाम हिंदी में होना चाहिए
- सभी प्रतिक्रियाएं जिसमें बीमारी का नाम, स्पष्टीकरण, प्रश्न शामिल हैं, हिंदी में होनी चाहिए
- प्रश्न बीमारी-विशिष्ट आपातकालीन संकेतक होने चाहिए
- तात्कालिकता स्पष्ट होनी चाहिए (तत्काल देखभाल लें / जल्दी डॉक्टर से परामर्श करें / घर पर निगरानी करें)
- "why" और "causes" प्रत्येक में 2-3 स्पष्ट वाक्य होने चाहिए, केवल सादा पाठ
- कोई बुलेट पॉइंट नहीं, कोई सूची नहीं, केवल बहने वाला पाठ
`,

    te: `
మీరు వైద్య రోగనిర్ధారణ మరియు ట్రయేజ్ సహాయకుడు.

ముఖ్యమైన: క్రింద ఇచ్చిన రోగి లక్షణాలు ఇంగ్లీష్, హిందీ, తెలుగు లేదా ఏ భాషలోనైనా ఉండవచ్చు. భాషతో సంబంధం లేకుండా వాటిని సరిగ్గా అర్థం చేసుకొని ప్రాసెస్ చేయండి.

రోగి లక్షణాలు:
${symptoms.map(s => `- ${s}`).join('\n')}

ML ద్వారా ఊహించిన వ్యాధి (null లేదా తప్పు కావచ్చు):
${mlDisease || 'ఏదీ లేదు'}

పనులు:
1. అత్యంత వైద్యపరంగా సంభావ్య వ్యాధిని ఊహించండి (వ్యాధి పేరు తెలుగులో)
2. ఈ వ్యాధికి నిర్దిష్టమైన తక్షణతను అంచనా వేయడానికి ఖచ్చితంగా 3 అవును/కాదు అనుసరణ ప్రశ్నలను అడగండి (తెలుగులో)
3. తక్షణత స్థాయిని నిర్ణయించండి (తెలుగులో)

చెల్లుబాటు అయ్యే JSONలో మాత్రమే సమాధానం ఇవ్వండి:
{
  "finalDisease": "",
  "why": "",
  "causes": "",
  "followUpQuestions": ["", "", ""],
  "urgency": "ఒక స్పష్టమైన, చర్యాత్మక వాక్యం"
}

ముఖ్యమైన ఫార్మాటింగ్ నియమాలు:
- సాదా టెక్స్ట్ మాత్రమే ఉపయోగించండి - మార్క్డౌన్ ఫార్మాటింగ్ లేదు
- తారాగణాలు (*), అండర్ స్కోర్ (_), లేదా ఏ మార్క్డౌన్ చిహ్నాలు లేవు
- బోల్డ్, ఇటాలిక్, లేదా ప్రత్యేక ఫార్మాటింగ్ లేదు
- స్పష్టమైన, సరళ వాక్యాలలో వ్రాయండి
- వ్యాధి పేరు తెలుగులో ఉండాలి
- వ్యాధి పేరు, వివరణలు, ప్రశ్నలు అన్నీ తెలుగులో ఉండాలి
- ప్రశ్నలు వ్యాధి-నిర్దిష్ట అత్యవసర సూచికలు కావాలి
- తక్షణత స్పష్టంగా ఉండాలి (వెంటనే సంరక్షణ కోరండి / త్వరగా వైద్యుడిని సంప్రదించండి / ఇంట్లో పర్యవేక్షించండి)
- "why" మరియు "causes" ప్రతి ఒక్కటి 2-3 స్పష్టమైన వాక్యాలను కలిగి ఉండాలి, సాదా టెక్స్ట్ మాత్రమే
- బులెట్ పాయింట్లు లేవు, జాబితాలు లేవు, కేవలం ప్రవహించే టెక్స్ట్
`
  };

  return prompts[language] || prompts.en;
};

const getFollowUpEvaluationPrompt = (finalSymptoms, initialDisease, mlDisease, followUpAnswers, language = 'en') => {
  const prompts = {
    en: `
You are a medical diagnosis and triage assistant.

Patient symptoms:
${finalSymptoms.map(s => `- ${s}`).join('\n')}

Previous disease prediction (may have changed based on answers):
${initialDisease || 'Not provided'}

ML predicted disease (may be null or wrong):
${mlDisease || 'None'}

Follow-up questions and patient answers:
${followUpAnswers.map((answer, idx) => `Q${idx + 1}: ${answer}`).join('\n')}

Tasks:
1. Re-evaluate and predict the most medically likely disease considering the follow-up answers (disease may have changed)
2. Provide updated urgency level based on the answers
3. Explain why the disease prediction might have changed (if it did)

Respond ONLY in valid JSON:
{
  "finalDisease": "",
  "why": "",
  "causes": "",
  "urgency": "ONE clear, actionable sentence",
  "diseaseChanged": true/false,
  "changeReason": "Brief explanation if disease changed"
}

CRITICAL FORMATTING RULES:
- Use ONLY plain text - NO markdown formatting
- NO asterisks (*), underscores (_), or any markdown symbols
- NO bold, italic, or special formatting
- Write in clear, simple sentences
- Disease name MUST be in English language
- All responses including disease name, explanations must be in English
- Disease must not be empty
- If follow-up answers suggest a different disease, update finalDisease accordingly
- Urgency must be clear (seek immediate care / consult doctor soon / monitor at home)
- "why" and "causes" should be 2-3 clear sentences each, plain text only
- "changeReason" should be 1-2 clear sentences if disease changed, plain text only
- No bullet points, no lists, just flowing text
`,

    hi: `
आप एक चिकित्सा निदान और ट्रायेज सहायक हैं।

रोगी के लक्षण:
${finalSymptoms.map(s => `- ${s}`).join('\n')}

पिछली बीमारी की भविष्यवाणी (उत्तरों के आधार पर बदली हो सकती है):
${initialDisease || 'प्रदान नहीं की गई'}

ML द्वारा भविष्यवाणी की गई बीमारी (null या गलत हो सकती है):
${mlDisease || 'कोई नहीं'}

अनुवर्ती प्रश्न और रोगी के उत्तर:
${followUpAnswers.map((answer, idx) => `Q${idx + 1}: ${answer}`).join('\n')}

कार्य:
1. अनुवर्ती उत्तरों को ध्यान में रखते हुए सबसे अधिक चिकित्सकीय रूप से संभावित बीमारी का पुनर्मूल्यांकन और भविष्यवाणी करें (बीमारी बदली हो सकती है)
2. उत्तरों के आधार पर अद्यतन तात्कालिकता स्तर प्रदान करें
3. बीमारी की भविष्यवाणी क्यों बदली हो सकती है, इसकी व्याख्या करें (यदि बदली है)

केवल वैध JSON में उत्तर दें:
{
  "finalDisease": "",
  "why": "",
  "causes": "",
  "urgency": "एक स्पष्ट, कार्रवाई योग्य वाक्य",
  "diseaseChanged": true/false,
  "changeReason": "यदि बीमारी बदली है तो संक्षिप्त स्पष्टीकरण"
}

महत्वपूर्ण फ़ॉर्मेटिंग नियम:
- केवल सादा पाठ उपयोग करें - कोई मार्कडाउन फ़ॉर्मेटिंग नहीं
- कोई तारांकन (*), अंडरस्कोर (_), या कोई मार्कडाउन प्रतीक नहीं
- कोई बोल्ड, इटैलिक, या विशेष फ़ॉर्मेटिंग नहीं
- स्पष्ट, सरल वाक्यों में लिखें
- बीमारी का नाम हिंदी में होना चाहिए
- बीमारी खाली नहीं होनी चाहिए
- यदि अनुवर्ती उत्तर एक अलग बीमारी का सुझाव देते हैं, तो तदनुसार finalDisease अपडेट करें
- तात्कालिकता स्पष्ट होनी चाहिए (तत्काल देखभाल लें / जल्दी डॉक्टर से परामर्श करें / घर पर निगरानी करें)
- "why" और "causes" प्रत्येक में 2-3 स्पष्ट वाक्य होने चाहिए, केवल सादा पाठ
- "changeReason" यदि बीमारी बदली है तो 1-2 स्पष्ट वाक्य होने चाहिए, केवल सादा पाठ
- कोई बुलेट पॉइंट नहीं, कोई सूची नहीं, केवल बहने वाला पाठ
`,

    te: `
మీరు వైద్య రోగనిర్ధారణ మరియు ట్రయేజ్ సహాయకుడు.

రోగి లక్షణాలు:
${finalSymptoms.map(s => `- ${s}`).join('\n')}

మునుపటి వ్యాధి ఊహ (జవాబుల ఆధారంగా మారి ఉండవచ్చు):
${initialDisease || 'అందించబడలేదు'}

ML ద్వారా ఊహించిన వ్యాధి (null లేదా తప్పు కావచ్చు):
${mlDisease || 'ఏదీ లేదు'}

అనుసరణ ప్రశ్నలు మరియు రోగి జవాబులు:
${followUpAnswers.map((answer, idx) => `Q${idx + 1}: ${answer}`).join('\n')}

పనులు:
1. అనుసరణ జవాబులను పరిగణనలోకి తీసుకొని అత్యంత వైద్యపరంగా సంభావ్య వ్యాధిని పునర్విలోకనం చేసి ఊహించండి (వ్యాధి మారి ఉండవచ్చు)
2. జవాబుల ఆధారంగా నవీకరించబడిన తక్షణత స్థాయిని అందించండి
3. వ్యాధి ఊహ ఎందుకు మారి ఉండవచ్చో వివరించండి (మారి ఉంటే)

చెల్లుబాటు అయ్యే JSONలో మాత్రమే సమాధానం ఇవ్వండి:
{
  "finalDisease": "",
  "why": "",
  "causes": "",
  "urgency": "ఒక స్పష్టమైన, చర్యాత్మక వాక్యం",
  "diseaseChanged": true/false,
  "changeReason": "వ్యాధి మారితే సంక్షిప్త వివరణ"
}

ముఖ్యమైన ఫార్మాటింగ్ నియమాలు:
- సాదా టెక్స్ట్ మాత్రమే ఉపయోగించండి - మార్క్డౌన్ ఫార్మాటింగ్ లేదు
- తారాగణాలు (*), అండర్ స్కోర్ (_), లేదా ఏ మార్క్డౌన్ చిహ్నాలు లేవు
- బోల్డ్, ఇటాలిక్, లేదా ప్రత్యేక ఫార్మాటింగ్ లేదు
- స్పష్టమైన, సరళ వాక్యాలలో వ్రాయండి
- వ్యాధి పేరు తెలుగులో ఉండాలి
- వ్యాధి ఖాళీగా ఉండకూడదు
- అనుసరణ జవాబులు వేరే వ్యాధిని సూచిస్తే, తదనుగుణంగా finalDisease నవీకరించండి
- తక్షణత స్పష్టంగా ఉండాలి (వెంటనే సంరక్షణ కోరండి / త్వరగా వైద్యుడిని సంప్రదించండి / ఇంట్లో పర్యవేక్షించండి)
- "why" మరియు "causes" ప్రతి ఒక్కటి 2-3 స్పష్టమైన వాక్యాలను కలిగి ఉండాలి, సాదా టెక్స్ట్ మాత్రమే
- "changeReason" వ్యాధి మారితే 1-2 స్పష్టమైన వాక్యాలు ఉండాలి, సాదా టెక్స్ట్ మాత్రమే
- బులెట్ పాయింట్లు లేవు, జాబితాలు లేవు, కేవలం ప్రవహించే టెక్స్ట్
`
  };

  return prompts[language] || prompts.en;
};

const getFallbackMessages = (language = 'en') => {
  const messages = {
    en: {
      unknownDisease: 'Unknown disease',
      infoNotAvailable: 'Information not available.',
      consultDoctor: 'Consult a doctor for further evaluation.',
      symptomsWorsening: 'Are your symptoms rapidly worsening?',
      severePain: 'Are you experiencing severe pain, vision loss, or breathing difficulty?',
      suddenStart: 'Did these symptoms start suddenly or after an injury?',
      consultPromptly: 'Based on your symptoms, please consult a doctor promptly.',
      consultAfterAnswers: 'Based on your symptoms and answers, please consult a doctor promptly.'
    },
    hi: {
      unknownDisease: 'अज्ञात बीमारी',
      infoNotAvailable: 'जानकारी उपलब्ध नहीं है।',
      consultDoctor: 'आगे मूल्यांकन के लिए डॉक्टर से परामर्श करें।',
      symptomsWorsening: 'क्या आपके लक्षण तेजी से बिगड़ रहे हैं?',
      severePain: 'क्या आपको गंभीर दर्द, दृष्टि हानि, या सांस लेने में कठिनाई हो रही है?',
      suddenStart: 'क्या ये लक्षण अचानक शुरू हुए या चोट के बाद?',
      consultPromptly: 'आपके लक्षणों के आधार पर, कृपया तुरंत डॉक्टर से परामर्श करें।',
      consultAfterAnswers: 'आपके लक्षणों और उत्तरों के आधार पर, कृपया तुरंत डॉक्टर से परामर्श करें।'
    },
    te: {
      unknownDisease: 'తెలియని వ్యాధి',
      infoNotAvailable: 'సమాచారం అందుబాటులో లేదు.',
      consultDoctor: 'మరింత మూల్యాంకనం కోసం వైద్యుడిని సంప్రదించండి.',
      symptomsWorsening: 'మీ లక్షణాలు వేగంగా అధ్వాన్నమవుతున్నాయా?',
      severePain: 'మీకు తీవ్రమైన నొప్పి, దృష్టి కోల్పోవడం, లేదా శ్వాసక్రియలో ఇబ్బంది ఉందా?',
      suddenStart: 'ఈ లక్షణాలు అకస్మాత్తుగా ప్రారంభమయ్యాయా లేదా గాయం తర్వాత?',
      consultPromptly: 'మీ లక్షణాల ఆధారంగా, దయచేసి వెంటనే వైద్యుడిని సంప్రదించండి.',
      consultAfterAnswers: 'మీ లక్షణాలు మరియు జవాబుల ఆధారంగా, దయచేసి వెంటనే వైద్యుడిని సంప్రదించండి.'
    }
  };

  return messages[language] || messages.en;
};

module.exports = {
  getDiagnosisPrompt,
  getFollowUpEvaluationPrompt,
  getFallbackMessages
};
