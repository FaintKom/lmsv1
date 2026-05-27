"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import {
  initiateDonation,
  getDonationStatus,
  type Recurrence,
} from "@/lib/api/donations";

const AMOUNTS = [5, 10, 15, 50] as const;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

const schema = z.object({
  amount: z
    .number({ error: "Required" })
    .int()
    .min(1, { message: "min" })
    .max(10000, { message: "max" }),
  recurrence: z.enum(["one_time", "monthly"]),
  donorName: z.string().max(120).optional().or(z.literal("")),
  donorEmail: z.string().email().optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  anonymous: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function DonationForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState<string | null>(null);
  const pollStartRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 5,
      recurrence: "one_time",
      donorName: "",
      donorEmail: "",
      message: "",
      anonymous: false,
    },
  });

  const anonymous = watch("anonymous");
  const recurrence = watch("recurrence");

  useEffect(() => {
    if (!pollingId) return;
    pollStartRef.current = Date.now();
    const interval = setInterval(async () => {
      try {
        const status = await getDonationStatus(pollingId);
        if (status.status === "confirmed") {
          clearInterval(interval);
          router.push(`/support/thanks?d=${pollingId}`);
          return;
        }
        if (Date.now() - (pollStartRef.current ?? 0) > POLL_TIMEOUT_MS) {
          clearInterval(interval);
          setShowFallback(t("support.didPaymentGoThrough"));
        }
      } catch {
        // keep polling on transient errors
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollingId, router, t]);

  const pickPreset = (amount: number) => {
    setSelectedPreset(amount);
    setValue("amount", amount, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const resp = await initiateDonation({
        amount_cents: Math.round(values.amount * 100),
        recurrence: values.recurrence as Recurrence,
        donor_name: values.anonymous ? null : values.donorName || null,
        donor_email: values.anonymous ? null : values.donorEmail || null,
        message: values.message || null,
        anonymous: values.anonymous,
      });
      const popup = window.open(
        resp.oc_checkout_url,
        "oc_checkout",
        "width=480,height=720",
      );
      if (!popup) {
        setShowFallback(resp.oc_checkout_url);
        return;
      }
      setPollingId(resp.donation_id);
    } catch {
      toast.error(t("support.donationServiceUnavailable"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border border-border bg-paper-2 p-6">
      <div role="group" aria-label={t("support.amountLabel")} className="flex gap-2">
        <button
          type="button"
          aria-pressed={recurrence === "one_time"}
          onClick={() => setValue("recurrence", "one_time", { shouldValidate: true })}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
            recurrence === "one_time"
              ? "border-primary bg-success-soft text-success-fg"
              : "border-border text-text-muted"
          }`}
        >
          {t("support.recurrenceOneTime")}
        </button>
        <button
          type="button"
          aria-pressed={recurrence === "monthly"}
          onClick={() => setValue("recurrence", "monthly", { shouldValidate: true })}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
            recurrence === "monthly"
              ? "border-primary bg-success-soft text-success-fg"
              : "border-border text-text-muted"
          }`}
        >
          {t("support.recurrenceMonthly")}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            aria-pressed={selectedPreset === amount}
            onClick={() => pickPreset(amount)}
            className={`rounded-md border px-3 py-3 text-sm font-bold ${
              selectedPreset === amount
                ? "border-primary bg-success-soft text-success-fg"
                : "border-border text-text"
            }`}
          >
            ${amount}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-semibold text-text-muted">
          {t("support.customAmountPlaceholder")}
        </label>
        <input
          type="number"
          min={1}
          max={10000}
          step={1}
          {...register("amount", { valueAsNumber: true })}
          onChange={(e) => {
            register("amount", { valueAsNumber: true }).onChange(e);
            setSelectedPreset(null);
          }}
          className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
        />
        {errors.amount?.message === "min" && (
          <p className="text-xs text-coral-500">{t("support.amountTooSmall")}</p>
        )}
        {errors.amount?.message === "max" && (
          <p className="text-xs text-coral-500">{t("support.amountTooLarge")}</p>
        )}
      </div>

      {!anonymous && (
        <>
          <div>
            <label className="block text-sm font-semibold text-text-muted">
              {t("support.donorNameLabel")}
            </label>
            <input
              type="text"
              maxLength={120}
              {...register("donorName")}
              className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-muted">
              {t("support.donorEmailLabel")}
            </label>
            <input
              type="email"
              {...register("donorEmail")}
              className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-semibold text-text-muted">
          {t("support.messageLabel")}
        </label>
        <textarea
          maxLength={2000}
          rows={3}
          {...register("message")}
          className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...register("anonymous")} />
        {t("support.anonymousLabel")}
      </label>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {t("support.cta")}
      </Button>
      <p className="text-center text-xs text-text-subtle">{t("support.handledBy")}</p>

      {showFallback && (
        <div className="rounded-md border border-warning bg-sun-50 p-3 text-sm">
          {showFallback === t("support.didPaymentGoThrough") ? (
            <p className="font-semibold">{t("support.didPaymentGoThrough")}</p>
          ) : (
            <>
              <p className="mb-2 font-semibold">{t("support.popupBlocked")}</p>
              <a href={showFallback} target="_blank" rel="noreferrer noopener" className="text-primary underline">
                {showFallback}
              </a>
            </>
          )}
        </div>
      )}
    </form>
  );
}
