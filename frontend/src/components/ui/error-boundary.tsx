"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface Props {
 children: ReactNode;
 fallback?: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
 constructor(props: Props) {
 super(props);
 this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 render() {
 if (this.state.hasError) {
 if (this.props.fallback) return this.props.fallback;

 return (
 <ErrorFallback
 message={this.state.error?.message}
 onReload={() => {
 this.setState({ hasError: false, error: null });
 window.location.reload();
 }}
 />
 );
 }

 return this.props.children;
 }
}

/** The class above cannot call hooks; its fallback can. */
function ErrorFallback({ message, onReload }: { message?: string; onReload: () => void }) {
 const { t } = useTranslation();
 return (
 <div className="flex min-h-[300px] items-center justify-center p-8">
 <div className="max-w-md text-center">
 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-danger-soft">
 <AlertTriangle className="h-6 w-6 text-danger-fg" />
 </div>
 <h2 className="mb-2 text-lg font-semibold text-text">
 {t("err.title")}
 </h2>
 <p className="mb-4 text-sm text-text-muted">
 {message || t("err.unexpected")}
 </p>
 <button
 onClick={onReload}
 className="inline-flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
 >
 <RefreshCw className="h-4 w-4" aria-hidden="true" />
 {t("err.reload")}
 </button>
 </div>
 </div>
 );
}
