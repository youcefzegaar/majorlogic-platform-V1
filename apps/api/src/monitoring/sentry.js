import * as Sentry from "@sentry/node";

/**
 * يهيّئ Sentry لالتقاط الأخطاء تلقائياً في الإنتاج.
 * يُستدعى مرة واحدة عند بدء تشغيل الـ API.
 * إذا لم يُضبط SENTRY_DSN — يعمل الـ API بشكل طبيعي بدون Sentry.
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // لا نرسل أخطاء 4xx (طلبات خاطئة من المستخدم) — فقط أخطاء الـ Server
      if (event.exception?.values?.[0]?.value?.includes("validation_error")) return null;
      return event;
    }
  });
}

/**
 * Fastify plugin — يلتقط كل خطأ غير متوقع ويرسله لـ Sentry.
 */
export async function sentryPlugin(fastify) {
  if (!process.env.SENTRY_DSN) return;

  fastify.addHook("onError", async (request, _reply, error) => {
    Sentry.withScope((scope) => {
      scope.setTag("route", request.routerPath ?? request.url);
      scope.setTag("method", request.method);
      scope.setExtra("body", request.body);
      Sentry.captureException(error);
    });
  });
}
