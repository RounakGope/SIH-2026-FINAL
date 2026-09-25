package in.fasalrakshak.api.service;

import org.springframework.stereotype.Component;

// The same message wording as the app's src/content/sms.js.
@Component
public class SmsTexts {
	private final Names names;
	public SmsTexts(Names names) { this.names = names; }

	public String expertReply(String status, String crop, String label, String lang, String kind) {
		String d = names.disease(crop, label, lang);
		// A voice report's caller may have no smartphone: the expert has called them back.
		if ("ivr".equals(kind) && !"lab_referred".equals(status)) return switch (lang) {
			case "mr" -> "KVK तज्ञांचे निदान: " + d + ". फोनवर तज्ञांनी सांगितलेले उपाय करा.";
			case "hi" -> "KVK विशेषज्ञ का निदान: " + d + "। फ़ोन पर विशेषज्ञ के बताए उपाय करें।";
			default -> "KVK expert's diagnosis: " + d + ". Follow the steps the expert gave you on the call.";
		};
		// A verdict of "healthy" or "can't tell from this photo" has no treatment to open.
		if (!"lab_referred".equals(status) && !names.diseased(crop, label)) return "other".equals(label)
			? switch (lang) {
				case "mr" -> "फोटोवरून KVK तज्ञांना सांगता आले नाही. कृपया स्पष्ट फोटो पाठवा: एकच पान पूर्ण फ्रेममध्ये, सावलीत.";
				case "hi" -> "फ़ोटो से KVK विशेषज्ञ तय नहीं कर पाए। कृपया साफ़ फ़ोटो भेजें: एक पत्ता पूरे फ़्रेम में, छाँव में।";
				default -> "KVK expert could not tell from the photo. Please send a clearer one: one leaf filling the frame, in shade.";
			}
			: switch (lang) {
				case "mr" -> "KVK तज्ञांच्या मते पान निरोगी आहे: उपचाराची गरज नाही. पुढच्या आठवड्यात पुन्हा स्कॅन करा.";
				case "hi" -> "KVK विशेषज्ञ के अनुसार पत्ता स्वस्थ है: इलाज की ज़रूरत नहीं। अगले हफ़्ते फिर स्कैन करें।";
				default -> "KVK expert says the leaf looks healthy: no treatment needed. Scan again next week.";
			};
		return switch (status) {
			case "confirmed" -> switch (lang) {
				case "mr" -> "KVK तज्ञांनी खात्री केली: " + d + ". उपायांसाठी फसलरक्षक उघडा.";
				case "hi" -> "KVK विशेषज्ञ ने पुष्टि की: " + d + "। इलाज के लिए फ़सलरक्षक खोलें।";
				default -> "KVK expert confirmed: " + d + ". Open FasalRakshak for the treatment steps.";
			};
			case "corrected" -> switch (lang) {
				case "mr" -> "KVK तज्ञांच्या मते हे " + d + " आहे. उपायांसाठी फसलरक्षक उघडा.";
				case "hi" -> "KVK विशेषज्ञ के अनुसार यह " + d + " है। इलाज के लिए फ़सलरक्षक खोलें।";
				default -> "KVK expert says it is " + d + ". Open FasalRakshak for the treatment steps.";
			};
			case "lab_referred" -> switch (lang) {
				case "mr" -> "KVK तज्ञांनी नमुना मागितला: 3-4 बाधित पाने कागदी पिशवीत KVK सेलसुरा येथे न्या.";
				case "hi" -> "KVK विशेषज्ञ ने नमूना माँगा: 3-4 प्रभावित पत्तियाँ काग़ज़ की थैली में KVK सेलसुरा ले जाएँ।";
				default -> "KVK expert asks for a sample: take 3-4 affected leaves in a paper bag to KVK Selsura.";
			};
			default -> null;
		};
	}

	public String blockAlert(String taluka, String crop, String label, long farms, String lang) {
		String d = names.disease(crop, label, lang), t = names.taluka(taluka, lang);
		return switch (lang) {
			case "mr" -> "फसलरक्षक इशारा: " + t + " मध्ये 14 दिवसांत " + farms + " शेतांत " + d + ". या आठवड्यात शेत तपासा.";
			case "hi" -> "फ़सलरक्षक चेतावनी: " + t + " में 14 दिनों में " + farms + " खेतों में " + d + "। इस हफ़्ते खेत जाँचें।";
			default -> "FasalRakshak alert: " + d + " reported on " + farms + " farms in " + t + " in 14 days. Check your field this week.";
		};
	}

	public String escalation(String crop, String taluka, long hours) {
		return "FasalRakshak: " + crop + " case from " + taluka + " has waited " + hours + " h for a KVK expert. Please assign or decide.";
	}
}
