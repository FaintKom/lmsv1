"use client";

/**
 * The school's funnel, as a board.
 *
 * One column per stage, one card per enquiry, and a panel for the enquiry
 * under discussion: its history, its reminders, and the button that turns it
 * into a pupil. Stages come from the server rather than a constant here, so
 * adding one stays a backend change.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Phone, Plus, StickyNote, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";
import {
  addEvent,
  completeTask,
  convertLead,
  createLead,
  createTask,
  fetchEvents,
  fetchLeads,
  fetchMeta,
  reopenLead,
  fetchSummary,
  fetchTasks,
  updateLead,
  type Lead,
  type LeadEvent,
  type LeadTask,
} from "@/lib/api/crm";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function CrmPage() {
  const { t } = useTranslation();

  const [stages, setStages] = useState<string[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Lead | null>(null);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-enquiry form.
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newStudent, setNewStudent] = useState("");
  const [saving, setSaving] = useState(false);

  // Panel forms.
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [convertEmail, setConvertEmail] = useState("");
  const [converted, setConverted] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [enquiryPath, setEnquiryPath] = useState<string | null>(null);
  // Closed enquiries are off the board by design — but a family that comes
  // back has to be findable, or the office opens a second record for them.
  const [showClosed, setShowClosed] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [rows, counts] = await Promise.all([
        fetchLeads(showClosed ? { include_closed: true } : undefined),
        fetchSummary(),
      ]);
      setLeads(rows);
      setSummary(counts);
    } catch {
      setError(t("crm.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, showClosed]);

  useEffect(() => {
    fetchMeta()
      .then((meta) => {
        setStages(meta.stages);
        setEnquiryPath(meta.enquiry_path);
      })
      .catch(() => setStages(["new", "contacted", "trial_scheduled", "trial_done"]));
    reload();
  }, [reload]);

  const openLead = useCallback(async (lead: Lead) => {
    setSelected(lead);
    setConverted(null);
    setConvertEmail("");
    setLostReason(lead.lost_reason ?? "");
    const [history, reminders] = await Promise.all([fetchEvents(lead.id), fetchTasks(lead.id)]);
    setEvents(history);
    setTasks(reminders);
  }, []);

  // Won and lost are terminal; the board shows the work in progress.
  const columns = useMemo(
    () => stages.filter((stage) => stage !== "won" && stage !== "lost"),
    [stages],
  );

  const byStage = useCallback(
    (stage: string) => leads.filter((lead) => lead.stage === stage),
    [leads],
  );

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createLead({
        contact_name: newName.trim(),
        contact_email: newEmail.trim() || null,
        student_name: newStudent.trim() || null,
      });
      setNewName("");
      setNewEmail("");
      setNewStudent("");
      await reload();
    } catch {
      setError(t("crm.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const move = async (lead: Lead, stage: string) => {
    setError(null);
    try {
      const body: Partial<Lead> = { stage };
      if (stage === "lost") body.lost_reason = lostReason.trim() || t("crm.noReasonGiven");
      const updated = await updateLead(lead.id, body);
      setSelected(updated);
      await reload();
    } catch {
      setError(t("crm.saveFailed"));
    }
  };

  const logNote = async (kind: "note" | "call") => {
    if (!selected || !note.trim()) return;
    await addEvent(selected.id, { kind, body: note.trim() });
    setNote("");
    setEvents(await fetchEvents(selected.id));
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !taskTitle.trim() || !taskDue) return;
    await createTask(selected.id, {
      title: taskTitle.trim(),
      due_at: new Date(taskDue).toISOString(),
    });
    setTaskTitle("");
    setTaskDue("");
    setTasks(await fetchTasks(selected.id));
  };

  const finishTask = async (taskId: string) => {
    await completeTask(taskId);
    if (selected) setTasks(await fetchTasks(selected.id));
  };

  const reopen = async (lead: Lead) => {
    setError(null);
    try {
      const back = await reopenLead(lead.id);
      setSelected(back);
      await reload();
      setEvents(await fetchEvents(lead.id));
    } catch {
      setError(t("crm.reopenFailed"));
    }
  };

  const convert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !convertEmail.trim()) return;
    setError(null);
    try {
      const result = await convertLead(selected.id, {
        student_email: convertEmail.trim(),
        create_parent_account: true,
      });
      // Say plainly whether anybody was actually written to. Mail is optional
      // in a deployment and its failures are swallowed on purpose, so silence
      // here would let the office believe a family had been contacted.
      setConverted(
        result.invitations_sent > 0
          ? `${t("crm.invitationsSent")} ${result.invitations_sent}`
          : t("crm.invitationsNotSent"),
      );
      setConvertEmail("");
      await reload();
      setEvents(await fetchEvents(selected.id));
      setSelected({ ...selected, stage: "won" });
    } catch {
      setError(t("crm.convertFailed"));
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{t("crm.title")}</h1>
        <p className="text-base text-text-muted">{t("crm.subtitle")}</p>
        {enquiryPath && (
          <p className="text-sm text-text-muted">
            {t("crm.enquiryPageIs")}{" "}
            <a
              href={enquiryPath}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline"
            >
              {enquiryPath}
            </a>
          </p>
        )}
      </div>

      {error && (
        <p role="status" className="text-sm text-danger">
          {error}
        </p>
      )}

      {/* New enquiry — the thing a school does twenty times a week. */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-2" onSubmit={submitLead}>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("crm.contactName")}
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="min-w-48 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("crm.contactEmail")}
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="min-w-48 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("crm.studentName")}
              <input
                value={newStudent}
                onChange={(e) => setNewStudent(e.target.value)}
                className="min-w-48 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <Button type="submit" disabled={saving}>
              <Plus className="mr-1 h-4 w-4" />
              {t("crm.addLead")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* The board */}
      <div className="grid gap-3 md:grid-cols-4">
        {columns.map((stage) => (
          <div key={stage} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-text">{t(`crm.stage.${stage}`)}</h2>
              <span className="text-xs text-text-subtle">{summary[stage] ?? 0}</span>
            </div>
            {byStage(stage).map((lead) => (
              <button
                key={lead.id}
                onClick={() => openLead(lead)}
                className="w-full rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
              >
                <p className="text-sm font-medium text-text">{lead.contact_name}</p>
                {lead.student_name && <p className="text-xs text-text-muted">{lead.student_name}</p>}
                <p className="mt-1 text-2xs text-text-subtle">{fmtDate(lead.created_at)}</p>
              </button>
            ))}
            {byStage(stage).length === 0 && (
              <p className="px-1 text-xs text-text-subtle">{t("crm.emptyStage")}</p>
            )}
          </div>
        ))}
      </div>

      {/* Closed enquiries, on request. A family that comes back has to be
          findable, or the office opens a second record for the same people
          and the funnel counts them twice. */}
      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? t("crm.hideClosed") : t("crm.showClosed")}
        </Button>
        {showClosed && (
          <div className="flex flex-wrap gap-2">
            {leads
              .filter((lead) => lead.stage === "won" || lead.stage === "lost")
              .map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  className="rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
                >
                  <p className="text-sm font-medium text-text">{lead.contact_name}</p>
                  <p className="text-xs text-text-muted">{t(`crm.stage.${lead.stage}`)}</p>
                </button>
              ))}
            {leads.filter((lead) => lead.stage === "won" || lead.stage === "lost").length === 0 && (
              <p className="px-1 text-xs text-text-subtle">{t("crm.noClosed")}</p>
            )}
          </div>
        )}
      </div>

      {/* The enquiry under discussion */}
      {selected && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-text">{selected.contact_name}</h2>
                <p className="text-sm text-text-muted">
                  {selected.contact_email || t("crm.noEmail")}
                  {selected.student_name ? ` · ${selected.student_name}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {stages
                  .filter((s) => s !== "won")
                  .map((stage) => (
                    <Button
                      key={stage}
                      variant={selected.stage === stage ? "default" : "outline"}
                      onClick={() => move(selected, stage)}
                    >
                      {t(`crm.stage.${stage}`)}
                    </Button>
                  ))}
              </div>
            </div>

            {selected.stage === "lost" && (
              <div className="space-y-1">
                <Button variant="outline" onClick={() => reopen(selected)}>
                  {t("crm.reopen")}
                </Button>
                <p className="text-xs text-text-muted">{t("crm.reopenHint")}</p>
              </div>
            )}

            {selected.stage !== "lost" && (
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                {t("crm.lostReason")}
                <input
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder={t("crm.lostReasonHint")}
                  className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                />
              </label>
            )}

            {/* History */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">{t("crm.history")}</h3>
              <ul className="space-y-1">
                {events.map((event) => (
                  <li key={event.id} className="text-sm text-text-muted">
                    <span className="text-text">{t(`crm.event.${event.kind}`)}</span>
                    {event.body ? ` — ${event.body}` : ""}
                    <span className="ml-2 text-2xs text-text-subtle">
                      {fmtDate(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("crm.notePlaceholder")}
                  className="min-w-56 flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                />
                <Button variant="outline" onClick={() => logNote("note")}>
                  <StickyNote className="mr-1 h-4 w-4" />
                  {t("crm.logNote")}
                </Button>
                <Button variant="outline" onClick={() => logNote("call")}>
                  <Phone className="mr-1 h-4 w-4" />
                  {t("crm.logCall")}
                </Button>
              </div>
            </div>

            {/* Reminders */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">{t("crm.reminders")}</h3>
              <ul className="space-y-1">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 text-sm">
                    <span className="text-text">{task.title}</span>
                    <span className="text-xs text-text-subtle">{fmtDate(task.due_at)}</span>
                    <button
                      onClick={() => finishTask(task.id)}
                      className="text-xs text-primary hover:text-success-fg"
                    >
                      <CheckCircle2 className="inline h-3.5 w-3.5" /> {t("crm.markDone")}
                    </button>
                  </li>
                ))}
                {tasks.length === 0 && (
                  <li className="text-sm text-text-subtle">{t("crm.noReminders")}</li>
                )}
              </ul>
              <form className="mt-2 flex flex-wrap gap-2" onSubmit={addReminder}>
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={t("crm.reminderPlaceholder")}
                  className="min-w-56 flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                />
                <input
                  type="datetime-local"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                />
                <Button type="submit" variant="outline">
                  {t("crm.addReminder")}
                </Button>
              </form>
            </div>

            {/* Conversion — where the funnel lands inside the product */}
            {converted && (
              <p role="status" className="text-sm text-success-fg">
                {converted}
              </p>
            )}
            {selected.converted_student_id ? (
              <p className="text-sm text-success-fg">{t("crm.alreadyConverted")}</p>
            ) : (
              <form className="flex flex-wrap items-end gap-2" onSubmit={convert}>
                <label className="flex flex-col gap-1 text-xs text-text-muted">
                  {t("crm.studentEmail")}
                  <input
                    type="email"
                    required
                    value={convertEmail}
                    onChange={(e) => setConvertEmail(e.target.value)}
                    className="min-w-56 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                  />
                </label>
                <Button type="submit">
                  <UserPlus className="mr-1 h-4 w-4" />
                  {t("crm.convert")}
                </Button>
                <p className="w-full text-xs text-text-subtle">{t("crm.convertHint")}</p>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
