#!/bin/sh
# Warn the owner while a failed Let's Encrypt renewal is still fixable.
#
# `certbot renew` fails silently. On 2026-07-29 the prod cert had been failing
# to renew for months — a subdomain bundled into the cert had been repointed
# off this box, so its ACME challenge 404'd and certbot aborted the whole
# renewal — and nobody noticed until the site went down with
# ERR_CERT_DATE_INVALID. This is the missing smoke alarm.
#
# Install on the prod box:
#   0 8 * * * /opt/lms/scripts/check-cert-expiry.sh >> /var/log/lms-cert-check.log 2>&1
#
# Exercise the alert path without waiting for a real expiry:
#   CERT_WARN_DAYS=999 /opt/lms/scripts/check-cert-expiry.sh
set -eu

CERT="${CERT_PATH:-/etc/letsencrypt/live/grasslms.online/cert.pem}"
DAYS="${CERT_WARN_DAYS:-20}"

# ponytail: prod cert only. The staging and nip.io certs serve no user-facing
# traffic; loop over /etc/letsencrypt/live/* if that ever stops being true.
if [ -f "$CERT" ] && openssl x509 -checkend "$((DAYS * 86400))" -noout -in "$CERT" >/dev/null 2>&1; then
    exit 0
fi

if [ -f "$CERT" ]; then
    WHEN=$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)
else
    WHEN="unknown - $CERT is missing"
fi

echo "$(date -Is) TLS cert alert: expires $WHEN (threshold ${DAYS}d)"

# Same Brevo SMTP path backups/notify-fail.sh uses. Never fail the cron job.
docker exec lms-backend-1 python -c "from app.email.service import _send_email; _send_email('faintkom@gmail.com', 'GrassLMS: TLS cert needs attention', '<p>The certificate for grasslms.online expires <b>$WHEN</b> and certbot has not renewed it.</p><p>SSH in, run <code>certbot renew --dry-run</code>, and confirm every domain still in the cert resolves to this box - one stray DNS record fails the whole cert.</p>')" || true
