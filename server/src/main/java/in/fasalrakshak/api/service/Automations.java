package in.fasalrakshak.api.service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import in.fasalrakshak.api.domain.CaseEntity;
import in.fasalrakshak.api.domain.PlotRepo;
import in.fasalrakshak.api.domain.RegistrationRepo;
import in.fasalrakshak.api.domain.SentKey;
import in.fasalrakshak.api.domain.SentKeyRepo;

// The scheduled risk engine's messaging, run every few minutes:
// - block alerts: when a disease on a crop reaches 15 counted farms in a taluka in
//   14 days, every number registered in that taluka gets an SMS (once a day);
// - response-time clock: a case unanswered for 24 h is escalated to the district
//   officer by SMS (once per case).
@Component
public class Automations {
	private static final Logger log = LoggerFactory.getLogger(Automations.class);
	private static final long DAY = 86_400_000L;
	public static final int HIGH = 15;
	public static final long ESCALATE_AFTER_H = 24;

	private final CaseService cases;
	private final SmsService sms;
	private final SmsTexts texts;
	private final RegistrationRepo registrations;
	private final PlotRepo plots;
	private final SentKeyRepo sent;
	private final String officer;

	public Automations(CaseService cases, SmsService sms, SmsTexts texts, RegistrationRepo registrations, PlotRepo plots,
		SentKeyRepo sent, @Value("${app.officer-contact}") String officer) {
		this.cases = cases; this.sms = sms; this.texts = texts; this.registrations = registrations; this.plots = plots;
		this.sent = sent; this.officer = officer;
	}

	@Scheduled(fixedDelayString = "${app.automation-interval-ms:300000}", initialDelay = 15000)
	public void run() {
		long now = System.currentTimeMillis();
		String day = java.time.LocalDate.now().toString();
		Map<String, Long> groups = new HashMap<>();
		int escalated = 0, alerts = 0;
		for (CaseEntity e : cases.all()) {
			if (e.createdAt == null) continue;
			Map<String, Object> c = cases.read(e);
			if (e.createdAt >= now - 14 * DAY && cases.countsForAlert(e, c))
				groups.merge(e.taluka + "|" + (e.crop == null ? "Cotton" : e.crop) + "|" + e.label, 1L, Long::sum);
			if ("pending_review".equals(e.status) && now - e.createdAt >= ESCALATE_AFTER_H * 3_600_000 && once("esc|" + e.id)) {
				sms.send(officer, texts.escalation(e.crop, e.taluka, (now - e.createdAt) / 3_600_000), "escalation", e.taluka);
				escalated++;
			}
		}
		for (var g : groups.entrySet()) {
			if (g.getValue() < HIGH || !once("alert|" + g.getKey() + "|" + day)) continue;
			String[] k = g.getKey().split("\\|");
			Map<String, String> to = new LinkedHashMap<>(); // phone -> language
			registrations.findByTaluka(k[0]).stream().filter(r -> r.crop == null || r.crop.equals(k[1])).forEach(r -> to.put(r.phone, r.lang));
			plots.findByTalukaAndSmsConsentTrue(k[0]).stream().filter(p -> p.phone != null && k[1].equals(p.crop)).forEach(p -> to.putIfAbsent(p.phone, p.lang));
			to.forEach((phone, lang) -> sms.send(phone, texts.blockAlert(k[0], k[1], k[2], g.getValue(), lang == null ? "mr" : lang), "alert", k[0]));
			alerts += to.size();
		}
		if (escalated + alerts > 0) log.info("automations: {} escalation SMS, {} block-alert SMS", escalated, alerts);
	}

	private boolean once(String key) {
		if (sent.existsById(key)) return false;
		SentKey s = new SentKey(); s.k = key; s.at = System.currentTimeMillis(); sent.save(s);
		return true;
	}
}
