/**
 * Email Nurture Job
 *
 * يعمل يومياً: يرسل تسلسل إيميلات بعد التسجيل
 * - اليوم 3: "هل ما زلت تبحث؟"
 * - اليوم 7: "أكثر 3 أسئلة يطرحها طلاب CS"
 *
 * يتحقق من جدول nurture_emails لتفادي الإرسال المكرر
 */

import { sendNurtureEmail, sendRegretCheckEmail } from "../../../../packages/email-service/src/index.js";

const SEQUENCE_DAYS = [3, 7, 30];

export async function runEmailNurture(repository) {
  const results = { processed: 0, sent: 0, errors: 0 };

  for (const day of SEQUENCE_DAYS) {
    let leads;
    try {
      leads = await repository.getLeadsForNurtureDay(day);
    } catch (err) {
      console.error(`[EmailNurture] Failed to fetch leads for day ${day}:`, err.message);
      continue;
    }

    for (const lead of leads) {
      results.processed++;
      const { id: leadId, email, metadata = {} } = lead;
      try {
        const sendFn = day === 30 ? sendRegretCheckEmail : sendNurtureEmail;
        await sendFn({ email, sequenceDay: day, metadata, decisionRunId: lead.decision_run_id ?? null });
        await repository.recordNurtureEmail({ leadId, email, sequenceDay: day });
        results.sent++;
        console.log(`[EmailNurture] Day ${day} sent → ${email}`);
      } catch (err) {
        results.errors++;
        console.error(`[EmailNurture] Error sending to ${email} (day ${day}):`, err.message);
      }
    }
  }

  console.log(`[EmailNurture] Done. Processed: ${results.processed}, Sent: ${results.sent}, Errors: ${results.errors}`);
  return results;
}
