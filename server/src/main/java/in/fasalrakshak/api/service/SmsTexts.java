package in.fasalrakshak.api.service;

import org.springframework.stereotype.Component;

// The same message wording as the app's src/content/sms.js.
@Component
public class SmsTexts {
	private final Names names;
	public SmsTexts(Names names) { this.names = names; }

	public String expertReply(String status, String crop, String label, String lang) {
		String d = names.disease(crop, label, lang);
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
