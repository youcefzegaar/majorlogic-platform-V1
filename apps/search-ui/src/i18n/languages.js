export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    nativeLabel: 'English',    flag: '🇺🇸', dir: 'ltr' },
  { code: 'ar', label: 'Arabic',     nativeLabel: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
  { code: 'fr', label: 'French',     nativeLabel: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español',    flag: '🇪🇸', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português',  flag: '🇧🇷', dir: 'ltr' },
  { code: 'zh', label: 'Chinese',    nativeLabel: '中文',        flag: '🇨🇳', dir: 'ltr' },
  { code: 'hi', label: 'Hindi',      nativeLabel: 'हिन्दी',     flag: '🇮🇳', dir: 'ltr' },
];

export const RTL_LANGUAGES = new Set(['ar']);

export function getDir(langCode) {
  return RTL_LANGUAGES.has(langCode) ? 'rtl' : 'ltr';
}
