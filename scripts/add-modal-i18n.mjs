import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const additions = {
  en: {
    buttons: {
      close: 'Close',
      cancel: 'Cancel',
    },
    flip: {
      title: "This doesn't fit — tell us why",
      subtitle: "We'll adjust and find a better match",
      trigger: "This doesn't fit — find me something else",
      reason_price_high: 'The price is too high for me',
      reason_too_heavy: 'I want something lighter to carry',
      reason_battery_short: 'I need longer battery life',
      reason_want_windows: 'I prefer Windows',
      reason_want_mac: 'I prefer macOS',
      reason_other: 'Something else',
      other_placeholder: 'Tell us more...',
      find_better: 'Find a better match',
      finding: 'Finding better match...',
    },
    settings: {
      subtitle: 'Preferences for this session',
      language: 'Language',
      appearance: 'Appearance',
      switch_light: 'Switch to Light Mode',
      switch_dark: 'Switch to Dark Mode',
      account_title: 'Save decisions across sessions',
      account_body: 'Create a free account to save your decisions and get 30-day follow-up insights. Coming soon.',
    },
    my_decisions: {
      subtitle: 'Your decision history',
      this_session: 'This session',
      view_decision: 'View Decision',
      empty_title: 'No decisions yet',
      empty_body: 'Start a new decision to see it here.',
      save_title: 'Save decisions permanently',
      save_body: 'Create a free account to save decisions across sessions and get 30-day satisfaction follow-ups. Coming soon.',
    },
  },
  ar: {
    buttons: {
      close: 'إغلاق',
      cancel: 'إلغاء',
    },
    flip: {
      title: 'هذا لا يناسبني — أخبرني لماذا',
      subtitle: 'سنعدّل ونجد خياراً أنسب لك',
      trigger: 'هذا لا يناسبني — ابحث لي عن شيء آخر',
      reason_price_high: 'السعر مرتفع جداً بالنسبة لي',
      reason_too_heavy: 'أريد شيئاً أخف للحمل',
      reason_battery_short: 'أحتاج بطارية تدوم أطول',
      reason_want_windows: 'أفضّل ويندوز',
      reason_want_mac: 'أفضّل macOS',
      reason_other: 'سبب آخر',
      other_placeholder: 'أخبرنا أكثر...',
      find_better: 'ابحث عن خيار أفضل',
      finding: 'نبحث عن خيار أفضل...',
    },
    settings: {
      subtitle: 'تفضيلات هذه الجلسة',
      language: 'اللغة',
      appearance: 'المظهر',
      switch_light: 'التبديل إلى الوضع الفاتح',
      switch_dark: 'التبديل إلى الوضع الداكن',
      account_title: 'احفظ قراراتك عبر الجلسات',
      account_body: 'أنشئ حساباً مجانياً لحفظ قراراتك والحصول على متابعة بعد 30 يوماً. قريباً.',
    },
    my_decisions: {
      subtitle: 'سجل قراراتك',
      this_session: 'هذه الجلسة',
      view_decision: 'عرض القرار',
      empty_title: 'لا توجد قرارات بعد',
      empty_body: 'ابدأ قراراً جديداً لترى نتائجه هنا.',
      save_title: 'احفظ القرارات بشكل دائم',
      save_body: 'أنشئ حساباً مجانياً لحفظ القرارات عبر الجلسات ومتابعة الرضا بعد 30 يوماً. قريباً.',
    },
  },
  fr: {
    buttons: { close: 'Fermer', cancel: 'Annuler' },
    flip: {
      title: "Ce n'est pas adapté — dites-nous pourquoi",
      subtitle: 'Nous ajusterons et trouverons mieux',
      trigger: "Ce n'est pas adapté — trouvez-moi autre chose",
      reason_price_high: 'Le prix est trop élevé pour moi',
      reason_too_heavy: 'Je veux quelque chose de plus léger',
      reason_battery_short: "J'ai besoin d'une plus longue autonomie",
      reason_want_windows: 'Je préfère Windows',
      reason_want_mac: 'Je préfère macOS',
      reason_other: 'Autre raison',
      other_placeholder: 'Dites-nous-en plus...',
      find_better: 'Trouver une meilleure option',
      finding: 'Recherche en cours...',
    },
    settings: {
      subtitle: 'Préférences pour cette session',
      language: 'Langue',
      appearance: 'Apparence',
      switch_light: 'Passer en mode clair',
      switch_dark: 'Passer en mode sombre',
      account_title: 'Sauvegarder vos décisions',
      account_body: 'Créez un compte gratuit pour sauvegarder vos décisions et recevoir un suivi à 30 jours. Bientôt disponible.',
    },
    my_decisions: {
      subtitle: 'Historique de vos décisions',
      this_session: 'Cette session',
      view_decision: 'Voir la décision',
      empty_title: 'Aucune décision pour le moment',
      empty_body: 'Commencez une nouvelle décision pour la voir ici.',
      save_title: 'Sauvegarder durablement',
      save_body: 'Créez un compte gratuit pour sauvegarder et recevoir un suivi satisfaction. Bientôt.',
    },
  },
  es: {
    buttons: { close: 'Cerrar', cancel: 'Cancelar' },
    flip: {
      title: 'Esto no me encaja — dinos por qué',
      subtitle: 'Ajustaremos y encontraremos algo mejor',
      trigger: 'Esto no me encaja — búscame algo diferente',
      reason_price_high: 'El precio es demasiado alto para mí',
      reason_too_heavy: 'Quiero algo más ligero para llevar',
      reason_battery_short: 'Necesito más duración de batería',
      reason_want_windows: 'Prefiero Windows',
      reason_want_mac: 'Prefiero macOS',
      reason_other: 'Otro motivo',
      other_placeholder: 'Cuéntanos más...',
      find_better: 'Encontrar una mejor opción',
      finding: 'Buscando mejor opción...',
    },
    settings: {
      subtitle: 'Preferencias para esta sesión',
      language: 'Idioma',
      appearance: 'Apariencia',
      switch_light: 'Cambiar a modo claro',
      switch_dark: 'Cambiar a modo oscuro',
      account_title: 'Guarda tus decisiones',
      account_body: 'Crea una cuenta gratuita para guardar decisiones y recibir seguimiento a 30 días. Próximamente.',
    },
    my_decisions: {
      subtitle: 'Historial de decisiones',
      this_session: 'Esta sesión',
      view_decision: 'Ver decisión',
      empty_title: 'Sin decisiones aún',
      empty_body: 'Inicia una nueva decisión para verla aquí.',
      save_title: 'Guarda decisiones permanentemente',
      save_body: 'Crea una cuenta gratuita para guardar decisiones y recibir seguimiento de satisfacción. Próximamente.',
    },
  },
  pt: {
    buttons: { close: 'Fechar', cancel: 'Cancelar' },
    flip: {
      title: 'Isso não serve — diga-nos por quê',
      subtitle: 'Vamos ajustar e encontrar algo melhor',
      trigger: 'Isso não serve — encontre algo diferente',
      reason_price_high: 'O preço é alto demais para mim',
      reason_too_heavy: 'Quero algo mais leve para carregar',
      reason_battery_short: 'Preciso de mais autonomia de bateria',
      reason_want_windows: 'Prefiro Windows',
      reason_want_mac: 'Prefiro macOS',
      reason_other: 'Outro motivo',
      other_placeholder: 'Conte-nos mais...',
      find_better: 'Encontrar uma opção melhor',
      finding: 'Encontrando opção melhor...',
    },
    settings: {
      subtitle: 'Preferências para esta sessão',
      language: 'Idioma',
      appearance: 'Aparência',
      switch_light: 'Mudar para modo claro',
      switch_dark: 'Mudar para modo escuro',
      account_title: 'Salve suas decisões',
      account_body: 'Crie uma conta gratuita para salvar decisões e receber acompanhamento em 30 dias. Em breve.',
    },
    my_decisions: {
      subtitle: 'Histórico de decisões',
      this_session: 'Esta sessão',
      view_decision: 'Ver decisão',
      empty_title: 'Nenhuma decisão ainda',
      empty_body: 'Inicie uma nova decisão para vê-la aqui.',
      save_title: 'Salve decisões permanentemente',
      save_body: 'Crie uma conta gratuita para salvar decisões e receber acompanhamento de satisfação. Em breve.',
    },
  },
  zh: {
    buttons: { close: '关闭', cancel: '取消' },
    flip: {
      title: '不合适——告诉我们原因',
      subtitle: '我们将调整并找到更好的选择',
      trigger: '不合适——帮我找其他选项',
      reason_price_high: '价格对我来说太高了',
      reason_too_heavy: '我想要更轻便的设备',
      reason_battery_short: '我需要更长的电池续航',
      reason_want_windows: '我更喜欢Windows',
      reason_want_mac: '我更喜欢macOS',
      reason_other: '其他原因',
      other_placeholder: '告诉我们更多...',
      find_better: '找到更好的选择',
      finding: '正在寻找更好的选择...',
    },
    settings: {
      subtitle: '本次会话的偏好设置',
      language: '语言',
      appearance: '外观',
      switch_light: '切换到浅色模式',
      switch_dark: '切换到深色模式',
      account_title: '跨会话保存决策',
      account_body: '创建免费账户以保存您的决策并获取30天后续反馈。即将推出。',
    },
    my_decisions: {
      subtitle: '您的决策历史',
      this_session: '本次会话',
      view_decision: '查看决策',
      empty_title: '暂无决策',
      empty_body: '开始新决策以在此查看。',
      save_title: '永久保存决策',
      save_body: '创建免费账户以保存决策并获取满意度跟踪。即将推出。',
    },
  },
  hi: {
    buttons: { close: 'बंद करें', cancel: 'रद्द करें' },
    flip: {
      title: 'यह उपयुक्त नहीं है — हमें बताएं क्यों',
      subtitle: 'हम समायोजित करके बेहतर विकल्प खोजेंगे',
      trigger: 'यह उपयुक्त नहीं — मेरे लिए कुछ और खोजें',
      reason_price_high: 'कीमत मेरे लिए बहुत अधिक है',
      reason_too_heavy: 'मुझे हल्का डिवाइस चाहिए',
      reason_battery_short: 'मुझे लंबी बैटरी लाइफ चाहिए',
      reason_want_windows: 'मैं Windows पसंद करता/करती हूं',
      reason_want_mac: 'मैं macOS पसंद करता/करती हूं',
      reason_other: 'कोई अन्य कारण',
      other_placeholder: 'हमें और बताएं...',
      find_better: 'बेहतर विकल्प खोजें',
      finding: 'बेहतर विकल्प खोजा जा रहा है...',
    },
    settings: {
      subtitle: 'इस सत्र के लिए प्राथमिकताएं',
      language: 'भाषा',
      appearance: 'रूप',
      switch_light: 'लाइट मोड में स्विच करें',
      switch_dark: 'डार्क मोड में स्विच करें',
      account_title: 'निर्णय सहेजें',
      account_body: 'अपने निर्णय सहेजने और 30 दिन बाद फ़ॉलोअप पाने के लिए मुफ़्त खाता बनाएं। जल्द आ रहा है।',
    },
    my_decisions: {
      subtitle: 'आपका निर्णय इतिहास',
      this_session: 'यह सत्र',
      view_decision: 'निर्णय देखें',
      empty_title: 'अभी कोई निर्णय नहीं',
      empty_body: 'यहां देखने के लिए एक नया निर्णय शुरू करें।',
      save_title: 'निर्णय स्थायी रूप से सहेजें',
      save_body: 'निर्णय सहेजने और संतुष्टि फ़ॉलोअप पाने के लिए मुफ़्त खाता बनाएं। जल्द आ रहा है।',
    },
  },
};

const LOCALES = ['en', 'ar', 'fr', 'es', 'pt', 'zh', 'hi'];

for (const locale of LOCALES) {
  const filePath = resolve(root, `apps/search-ui/public/locales/${locale}/ui.json`);
  const existing = JSON.parse(readFileSync(filePath, 'utf8'));
  const add = additions[locale];

  // Merge: buttons gets new keys merged in, flip/settings/my_decisions are added at top level
  existing.buttons = { ...existing.buttons, ...(add.buttons || {}) };
  existing.flip = { ...(existing.flip || {}), ...(add.flip || {}) };
  existing.settings = { ...(existing.settings || {}), ...(add.settings || {}) };
  existing.my_decisions = { ...(existing.my_decisions || {}), ...(add.my_decisions || {}) };

  writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`Updated ${locale}`);
}
