"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Star } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  listMyReviews,
  submitReview,
  type MyPeerReview,
} from "@/lib/api/peer-review";

function ReviewForm({
  review,
  onDone,
}: {
  review: MyPeerReview;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(review.rating ?? 0);
  const [comment, setComment] = useState(review.comment ?? "");

  const mutation = useMutation({
    mutationFn: () => submitReview(review.id, { rating, comment }),
    onSuccess: () => {
      toast.success(t("peerReview.submitted"));
      onDone();
    },
    onError: () => toast.error(t("peerReview.submitFailed")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1) {
          toast.error(t("peerReview.ratingRequired"));
          return;
        }
        mutation.mutate();
      }}
      className="mt-3 space-y-3 border-t border-border pt-3"
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${t("peerReview.rating")} ${n}`}
            className="text-primary"
          >
            <Star
              className="h-5 w-5"
              fill={n <= rating ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      <textarea
        placeholder={t("peerReview.commentPlaceholder")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {t("peerReview.submit")}
        </button>
      </div>
    </form>
  );
}

export default function StudentPeerReviewPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["peer-review", "my-reviews"],
    queryFn: listMyReviews,
  });

  const reviews = data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{t("peerReview.studentTitle")}</h1>
        <p className="text-base text-text-muted">{t("peerReview.studentSubtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("peerReview.noReviews")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const done = r.status === "completed";
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-700">
                        {r.assignment_title}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {t("peerReview.reviewing")}: {r.reviewee_name}
                      </p>
                    </div>
                    {done ? (
                      <span className="flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-medium text-success-fg">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("peerReview.statusValue.completed")}
                        {r.rating ? ` · ${r.rating}/5` : ""}
                      </span>
                    ) : (
                      <button
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
                      >
                        {t("peerReview.review")}
                      </button>
                    )}
                  </div>
                  {!done && openId === r.id && (
                    <ReviewForm
                      review={r}
                      onDone={() => {
                        setOpenId(null);
                        qc.invalidateQueries({
                          queryKey: ["peer-review", "my-reviews"],
                        });
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
