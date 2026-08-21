"use client";

/**
 * A school's public enquiry page, at /s/{slug}/enquire.
 *
 * Outside every route group on purpose: the (dashboard) and (admin) layouts
 * guard their children, and nobody arriving here has an account yet. This is
 * the page a school links from its own website.
 *
 * The answer after sending is the same whether the address has written before
 * or not, because the endpoint behind it answers the same way (FR-019). There
 * is deliberately nothing here that reports back on the enquiry.
 */

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SchoolMark } from "@/components/layout/school-mark";
import { fetchPublicSchool, type PublicSchool, submitPublicEnquiry } from "@/lib/api/crm";
import { useTranslation } from "@/lib/i18n/context";

export default function EnquirePage() {
  const { t } = useTranslation();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [school, setSchool] = useState<PublicSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [studentName, setStudentName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetchPublicSchool(slug)
      .then(setSchool)
      .catch(() => setSchool(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() && !contactPhone.trim()) {
      setError(t("enquire.needContact"));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await submitPublicEnquiry(slug, {
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        student_name: studentName.trim() || undefined,
        interest_course_id: courseId || undefined,
        interest_note: note.trim() || undefined,
      });
      setSent(true);
    } catch {
      setError(t("enquire.failed"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <main className="mx-auto max-w-xl p-6 py-16">
        <h1 className="text-2xl font-bold text-text">{t("enquire.notFound")}</h1>
      </main>
    );
  }

  const field =
    "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text";
  const label = "flex flex-col gap-1 text-xs text-text-muted";

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6 py-12">
      <header className="space-y-1">
        {/* The page a school links from its own website: it should look
            like the school, not like us. */}
        <SchoolMark branding={school.branding} />
        <p className="text-sm font-semibold text-primary">{school.name}</p>
        <h1 className="text-2xl font-bold text-text">{t("enquire.heading")}</h1>
        <p className="text-base text-text-muted">{t("enquire.intro")}</p>
      </header>

      {sent ? (
        <div role="status" className="space-y-2 rounded-xl border border-border-strong p-5">
          <h2 className="text-lg font-semibold text-text">{t("enquire.thanks")}</h2>
          <p className="text-sm text-text-muted">{t("enquire.thanksBody")}</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={send}>
          <label className={label}>
            {t("enquire.contactName")}
            <input
              required
              maxLength={255}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={field}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("enquire.contactEmail")}
              <input
                type="email"
                maxLength={255}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={field}
              />
            </label>
            <label className={label}>
              {t("enquire.contactPhone")}
              <input
                maxLength={50}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={field}
              />
            </label>
          </div>
          <p className="text-xs text-text-muted">{t("enquire.contactHint")}</p>

          <label className={label}>
            {t("enquire.studentName")}
            <input
              maxLength={255}
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className={field}
            />
          </label>

          {school.courses.length > 0 && (
            <label className={label}>
              {t("enquire.course")}
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className={field}
              >
                <option value="">{t("enquire.courseAny")}</option>
                {school.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className={label}>
            {t("enquire.note")}
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={field}
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={sending}>
            {sending ? t("enquire.sending") : t("enquire.submit")}
          </Button>
        </form>
      )}
    </main>
  );
}
