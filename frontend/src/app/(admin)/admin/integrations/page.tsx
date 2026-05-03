"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Video,
  FileText,
  Users,
  MonitorPlay,
  HardDrive,
  Youtube,
  CreditCard,
  CheckCircle,
  Circle,
  ExternalLink,
  Settings,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

interface Connection {
  id: string;
  provider: string;
  is_active: boolean;
  account_email: string | null;
  account_name: string | null;
  created_at: string | null;
}

interface IntegrationDef {
  provider: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  features: string[];
  docsUrl: string;
  status: "available" | "coming_soon";
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    provider: "youtube",
    name: "YouTube",
    description: "Rich video embeds with titles, thumbnails, and duration. Search and insert videos directly.",
    icon: <Youtube className="h-6 w-6" />,
    color: "text-coral-500",
    bgColor: "bg-coral-50",
    features: ["Rich video embeds", "Auto metadata", "Playlist support"],
    docsUrl: "https://developers.google.com/youtube",
    status: "available",
  },
  {
    provider: "google_drive",
    name: "Google Drive",
    description: "Attach files from Google Drive to lessons and assignments. Students submit work from Drive.",
    icon: <HardDrive className="h-6 w-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: ["File picker", "Assignment submissions", "Shared materials"],
    docsUrl: "https://developers.google.com/drive",
    status: "available",
  },
  {
    provider: "zoom",
    name: "Zoom",
    description: "Create live lessons with Zoom meetings. Students join directly from the platform.",
    icon: <Video className="h-6 w-6" />,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    features: ["Create meetings", "Join links", "Recording access"],
    docsUrl: "https://developers.zoom.us",
    status: "available",
  },
  {
    provider: "google_meet",
    name: "Google Meet",
    description: "Free video meetings via Google Calendar. Perfect for schools with Google Workspace.",
    icon: <MonitorPlay className="h-6 w-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    features: ["Calendar integration", "One-click meetings", "Free for schools"],
    docsUrl: "https://developers.google.com/meet",
    status: "available",
  },
  {
    provider: "google_classroom",
    name: "Google Classroom",
    description: "Import students and classes. Sync grades back to Google Classroom automatically.",
    icon: <Users className="h-6 w-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    features: ["Import roster", "Grade sync", "Assignment sync"],
    docsUrl: "https://developers.google.com/classroom",
    status: "available",
  },
  {
    provider: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Create Teams meetings for live lessons. Import classes from Microsoft 365 Education.",
    icon: <FileText className="h-6 w-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    features: ["Teams meetings", "Class import", "Education API"],
    docsUrl: "https://learn.microsoft.com/graph",
    status: "coming_soon",
  },
  {
    provider: "stripe",
    name: "Stripe",
    description: "Accept payments for courses and subscriptions. Cards, Apple Pay, Google Pay, and more.",
    icon: <CreditCard className="h-6 w-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    features: ["Subscriptions", "One-time payments", "Invoices"],
    docsUrl: "https://stripe.com/docs",
    status: "coming_soon",
  },
];

const OAUTH_PROVIDERS: Record<string, string> = {
  zoom: "/api/v1/integrations/zoom/authorize",
  google_meet: "/api/v1/integrations/google/authorize?provider=google_meet",
  google_drive: "/api/v1/integrations/google/authorize?provider=google_drive",
  google_classroom: "/api/v1/integrations/google/authorize?provider=google_classroom",
};

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    apiClient
      .get("/integrations/status")
      .then(({ data }) => setConnections(data.connections || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Handle OAuth callback messages
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`);
      // Refresh connections
      apiClient.get("/integrations/status").then(({ data }) => setConnections(data.connections || []));
      // Clean URL
      window.history.replaceState({}, "", "/admin/integrations");
    }
    if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", "/admin/integrations");
    }
  }, [searchParams]);

  const handleConnect = useCallback((provider: string) => {
    if (provider === "youtube") {
      // YouTube uses an org-wide API key, not OAuth. The key lives in the
      // backend env (YOUTUBE_API_KEY) and falls back to public oEmbed
      // metadata if missing.
      toast.info(
        "YouTube videos work out of the box — no connection needed. " +
          "For richer metadata, set YOUTUBE_API_KEY on the backend."
      );
      return;
    }
    const authUrl = OAUTH_PROVIDERS[provider];
    if (authUrl) {
      // Browsers strip Authorization on cross-origin redirects, so pass JWT
      // explicitly so the OAuth callback can associate the connection with
      // the right user/org.
      const token = typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
      const sep = authUrl.includes("?") ? "&" : "?";
      const fullUrl = token ? `${authUrl}${sep}token=${encodeURIComponent(token)}` : authUrl;
      window.location.href = fullUrl;
    } else {
      toast.info("This integration is coming soon");
    }
  }, []);

  const getConnection = (provider: string) =>
    connections.find((c) => c.provider === provider && c.is_active);

  const handleDisconnect = async (provider: string) => {
    try {
      await apiClient.delete(`/integrations/${provider}`);
      setConnections((prev) => prev.filter((c) => c.provider !== provider));
      toast.success("Integration disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Integrations</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Connect external services to enhance your learning platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((intg) => {
          const conn = getConnection(intg.provider);
          const isConnected = !!conn;
          const isComingSoon = intg.status === "coming_soon";

          return (
            <Card
              key={intg.provider}
              className={`relative overflow-hidden transition-all ${
                isComingSoon ? "opacity-75" : "hover:shadow-lg"
              }`}
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${intg.bgColor} ${intg.color}`}>
                      {intg.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-900 dark:text-ink-100">{intg.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isConnected ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-[10px] font-medium text-green-600">Connected</span>
                          </>
                        ) : isComingSoon ? (
                          <>
                            <Circle className="h-3 w-3 text-sun-400" />
                            <span className="text-[10px] font-medium text-sun-500">Coming soon</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-3 w-3 text-ink-300" />
                            <span className="text-[10px] font-medium text-ink-400">Not connected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-ink-500 dark:text-ink-400 mb-3 leading-relaxed">
                  {intg.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {intg.features.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500 dark:bg-white/10 dark:text-ink-400"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs text-ink-400">
                      {conn.account_email || conn.account_name || "Connected"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-coral-500 hover:text-coral-500 hover:bg-coral-50"
                      onClick={() => handleDisconnect(intg.provider)}
                    >
                      <Unplug className="h-3.5 w-3.5 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                ) : isComingSoon ? (
                  <Button size="sm" variant="outline" disabled className="w-full opacity-50">
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(intg.provider)}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Connect {intg.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info box */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-200 mb-2">
            How integrations work
          </h3>
          <ul className="space-y-1.5 text-xs text-ink-500 dark:text-ink-400">
            <li>Each integration connects to your organization's external account via secure OAuth</li>
            <li>Only admins and teachers can connect/disconnect integrations</li>
            <li>Student data is never shared with third-party services without explicit action</li>
            <li>Disconnecting an integration removes all stored tokens immediately</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
