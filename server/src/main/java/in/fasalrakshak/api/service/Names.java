package in.fasalrakshak.api.service;

import java.io.InputStream;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

// Disease, crop and taluka names in en/mr/hi, exported from the app's own content
// (npm run export-names -> names.json), so SMS wording matches the app exactly.
@Component
public class Names {
	private final Map<String, Map<String, Object>> diseases, crops, talukas;

	public Names(ObjectMapper json) throws Exception {
		try (InputStream in = new ClassPathResource("names.json").getInputStream()) {
			Map<String, Map<String, Map<String, Object>>> all = json.readValue(in, new TypeReference<>() {});
			diseases = all.get("diseases"); crops = all.get("crops"); talukas = all.get("talukas");
		}
	}

	private static String pick(Map<String, Object> m, String lang, String fallback) {
		if (m == null) return fallback;
		Object v = m.get(lang);
		return v != null ? v.toString() : String.valueOf(m.getOrDefault("en", fallback));
	}

	public String disease(String crop, String label, String lang) { return pick(diseases.get((crop == null ? "Cotton" : crop) + "|" + label), lang, label); }
	public String crop(String crop, String lang) { return pick(crops.get(crop), lang, crop); }
	public String taluka(String taluka, String lang) { return pick(talukas.get(taluka), lang, taluka); }

	public boolean diseased(String crop, String label) {
		Map<String, Object> m = diseases.get((crop == null ? "Cotton" : crop) + "|" + label);
		return m != null ? Boolean.TRUE.equals(m.get("diseased")) : label != null && !label.equals("healthy") && !label.equals("other");
	}
}
