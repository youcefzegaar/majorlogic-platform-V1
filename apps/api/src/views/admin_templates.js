import { escapeHtml } from "./templates.js";

const TRANSLATIONS = {
  en: {
    title: "Constitutional Audit Dashboard",
    subtitle: "Transparency & Integrity Layer (Last run decision trace)",
    toggleLang: "عربي",
    langCode: "ar",
    overview: "Run Overview",
    runId: "Run ID",
    date: "Date",
    catalogVersion: "Catalog Version",
    trustMetrics: "Trust Metrics",
    transparencyScore: "Transparency Score",
    confidence: "Source Confidence",
    tradeoffsAllowed: "Tradeoffs Allowed",
    cardsAccepted: "Cards Accepted",
    decisionTrace: "Decision Trace Visualizer",
    reason: "Reason for selection",
    badNews: "Bad News (Transparency)",
    hero: "Hero Pick",
    alt: "Alternative",
    noDecisions: "No decisions found. Run a search query first.",
    backToSearch: "Back to Matchmaker"
  },
  ar: {
    title: "لوحة التدقيق الدستوري",
    subtitle: "طبقة الشفافية والنزاهة (مراجعة آخر قرار للمحرك)",
    toggleLang: "English",
    langCode: "en",
    overview: "نظرة عامة على الجلسة",
    runId: "معرف الجلسة",
    date: "التاريخ",
    catalogVersion: "نسخة الكتالوج",
    trustMetrics: "مقاييس الثقة والدستورية",
    transparencyScore: "مستوى الشفافية",
    confidence: "موثوقية المصادر",
    tradeoffsAllowed: "التنازلات المسموحة",
    cardsAccepted: "البطاقات المقبولة",
    decisionTrace: "سجل تتبع القرارات",
    reason: "مبرر الاختيار",
    badNews: "أخبار سيئة (إفصاح ملزم)",
    hero: "الخيار البطل",
    alt: "بديل مقترح",
    noDecisions: "لا توجد قرارات. قم بإجراء عملية بحث أولاً.",
    backToSearch: "العودة للبحث"
  }
};

function renderCard(card, idx, t) {
  const isHero = card.cardType === "hero" || idx === 0;
  const cardLabel = isHero ? ("👑 " + t.hero) : ("🔹 " + t.alt);
  const badgeColor = isHero
    ? "background:#FFF9E6;color:#B78103;border:1px solid #FDE68A;"
    : "background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;";
  const badNewsHtml = card.badNews
    ? '<div style="background:#FEF2F2;padding:12px;border-radius:8px;border-left:4px solid #EF4444;">' +
      '<strong style="display:block;font-size:0.85rem;color:#B91C1C;margin-bottom:4px;">' + t.badNews + ':</strong>' +
      escapeHtml(card.badNews) + "</div>"
    : "";

  return (
    '<div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,0.03);margin-bottom:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">' +
    '<h4 style="font-size:1.25rem;">' + escapeHtml(card.title) + "</h4>" +
    '<div style="padding:4px 12px;border-radius:99px;font-weight:700;font-size:0.85rem;' + badgeColor + '">' + cardLabel + "</div>" +
    "</div>" +
    '<div style="display:grid;gap:12px;">' +
    '<div style="background:#FAFAFA;padding:12px;border-radius:8px;border-left:4px solid var(--primary);">' +
    '<strong style="display:block;font-size:0.85rem;color:var(--muted);margin-bottom:4px;">' + t.reason + ":</strong>" +
    escapeHtml(card.whyThis || card.tradeoff || "Matches constraints optimally") +
    "</div>" +
    badNewsHtml +
    "</div></div>"
  );
}

function shellHtml(lang, title, body) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const arabicFix = lang === "ar"
    ? "* { font-family: 'Segoe UI', Arial, sans-serif !important; } .header { text-align: right; }"
    : "";
  return (
    '<!doctype html><html lang="' + lang + '" dir="' + dir + '">' +
    "<head>" +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + escapeHtml(title) + "</title>" +
    '<link rel="stylesheet" href="/public/styles.css">' +
    "<style>body{background:#F8FAFC;}" + arabicFix + "</style>" +
    "</head>" +
    "<body>" + body + "</body></html>"
  );
}

export function renderAuditDashboard({ details, lang = "en" }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  if (!details) {
    const emptyBody =
      '<div class="container" style="text-align:center;margin-top:100px;">' +
      "<h2>" + t.noDecisions + "</h2>" +
      '<a href="/search" class="btn-primary" style="margin-top:24px;display:inline-block;">' + t.backToSearch + "</a>" +
      "</div>";
    return shellHtml(lang, t.title, emptyBody);
  }

  const { decisionRunId, createdAt, catalogVersion, cards = [], trust } = details;
  const trustMetrics = (trust && trust.metrics) || { transparency: 100, confidence: 95, numTradeoffs: 0 };
  const formattedDate = createdAt ? new Date(createdAt).toLocaleString() : "—";

  const overviewCard =
    '<div style="background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-soft);">' +
    '<h3 style="margin-bottom:16px;font-size:1.2rem;">' + t.overview + "</h3>" +
    '<ul style="list-style:none;padding:0;margin:0;line-height:2;">' +
    "<li><strong style=\"color:var(--muted);\">" + t.runId + ":</strong> <span style=\"font-family:monospace;font-size:0.85rem;\">" + escapeHtml(decisionRunId || "—") + "</span></li>" +
    "<li><strong style=\"color:var(--muted);\">" + t.date + ":</strong> " + formattedDate + "</li>" +
    "<li><strong style=\"color:var(--muted);\">" + t.catalogVersion + ":</strong> " + escapeHtml(catalogVersion || "—") + "</li>" +
    "</ul></div>";

  const metricsCard =
    '<div style="background:linear-gradient(135deg,#F8FAFC,#FFFFFF);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-soft);">' +
    '<h3 style="margin-bottom:16px;font-size:1.2rem;">' + t.trustMetrics + "</h3>" +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
    '<div style="background:#E8F5E9;padding:12px 16px;border-radius:12px;"><div style="font-size:0.85rem;color:#2E7D32;font-weight:bold;">' + t.transparencyScore + '</div><div style="font-size:1.8rem;font-weight:800;color:#1B5E20;">' + (trustMetrics.transparency || 100) + "%</div></div>" +
    '<div style="background:#E3F2FD;padding:12px 16px;border-radius:12px;"><div style="font-size:0.85rem;color:#1565C0;font-weight:bold;">' + t.confidence + '</div><div style="font-size:1.8rem;font-weight:800;color:#0D47A1;">' + (trustMetrics.confidence || 95) + "%</div></div>" +
    '<div style="background:#FFF3E0;padding:12px 16px;border-radius:12px;"><div style="font-size:0.85rem;color:#E65100;font-weight:bold;">' + t.tradeoffsAllowed + '</div><div style="font-size:1.8rem;font-weight:800;color:#BF360C;">' + (trustMetrics.numTradeoffs || 0) + "</div></div>" +
    '<div style="background:#F3E5F5;padding:12px 16px;border-radius:12px;"><div style="font-size:0.85rem;color:#6A1B9A;font-weight:bold;">' + t.cardsAccepted + '</div><div style="font-size:1.8rem;font-weight:800;color:#4A148C;">' + cards.length + "</div></div>" +
    "</div></div>";

  const cardsHtml = cards.map((card, idx) => renderCard(card, idx, t)).join("");

  const body =
    '<div class="container" style="max-width:1000px;">' +
    '<header class="header" style="align-items:start;padding-bottom:24px;border-bottom:1px solid var(--border);margin-bottom:32px;">' +
    "<div>" +
    '<h1 style="font-size:2.2rem;margin-bottom:8px;">⚖️ ' + t.title + "</h1>" +
    '<p style="color:var(--muted);font-size:1.1rem;">' + t.subtitle + "</p>" +
    "</div>" +
    '<div style="display:flex;gap:12px;align-items:center;">' +
    '<a href="/search" class="btn-outline" style="font-size:0.9rem;">' + t.backToSearch + "</a>" +
    '<a href="?lang=' + t.langCode + '" class="btn-primary" style="padding:10px 20px;border-radius:8px;">🌐 ' + t.toggleLang + "</a>" +
    "</div></header>" +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:40px;">' +
    overviewCard + metricsCard +
    "</div>" +
    '<h3 style="font-size:1.6rem;margin-bottom:20px;">' + t.decisionTrace + "</h3>" +
    cardsHtml +
    "</div>";

  return shellHtml(lang, t.title, body);
}
