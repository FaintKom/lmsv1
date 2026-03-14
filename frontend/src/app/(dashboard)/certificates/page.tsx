"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CertificateData {
  id: string;
  course_id: string;
  course_title: string;
  certificate_number: string;
  issued_at: string;
}

export default function CertificatesPage() {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Certificates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Certificates earned upon course completion
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Award className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600">No certificates yet</h3>
            <p className="mt-1 text-sm text-slate-400">
              Complete a course to earn your first certificate!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {cert.course_title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Certificate #{cert.certificate_number} · Issued{" "}
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/api/v1/certificates/${cert.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  View
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
