"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface CertificateData {
 id: string;
 course_id: string;
 course_title: string;
 certificate_number: string;
 issued_at: string;
}

export default function CertificatesPage() {
 const { t } = useTranslation();
 const [certificates, setCertificates] = useState<CertificateData[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 apiClient
 .get("/certificates/my-certificates")
 .then(({ data }) => setCertificates(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-4xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">{t("certs.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {t("certs.subtitle")}
 </p>
 </div>

 {certificates.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <div className="mb-4 rounded-pill bg-ink-100 p-4">
 <Award className="h-8 w-8 text-text-subtle" />
 </div>
 <h3 className="text-lg font-semibold text-text-muted ">{t("certs.noTitle")}</h3>
 <p className="mt-1 text-sm text-text-subtle ">
 {t("certs.noCerts")}
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-4">
 {certificates.map((cert) => (
 <Card key={cert.id} className="hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-5">
 <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-50">
 <Award className="h-6 w-6 text-warning-fg" />
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-semibold text-ink-700 ">
 {cert.course_title}
 </h3>
 <p className="text-xs text-text-subtle ">
 {t("certs.certNumber")}{cert.certificate_number} · {t("certs.issued")}{" "}
 {new Date(cert.issued_at).toLocaleDateString()}
 </p>
 </div>
 <button
 onClick={async () => {
   try {
     const { data } = await apiClient.get(`/certificates/${cert.id}/download`, { responseType: "text" });
     const w = window.open("", "_blank");
     if (w) { w.document.write(data); w.document.close(); }
   } catch { /* toast handled by interceptor */ }
 }}
 className="flex items-center gap-1.5 rounded-lg border border-primary-soft bg-success-soft px-3 py-2 text-xs font-medium text-success-fg hover:bg-primary-soft cursor-pointer"
 >
 <Download className="h-3.5 w-3.5" />
 {t("certs.view")}
 </button>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
