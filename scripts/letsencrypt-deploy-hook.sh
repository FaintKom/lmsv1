#!/bin/sh
# Put a renewed certificate where nginx can actually read it.
#
# nginx does not read /etc/letsencrypt. It reads /opt/lms/nginx/ssl, which is
# bind-mounted into the container, so a renewal that stops at certbot is a
# renewal nobody sees: the container keeps serving the old file until it
# expires, and the failure looks like an expiry rather than a plumbing fault.
#
# Replaces /etc/letsencrypt/renewal-hooks/deploy/lms-reload.sh, which copied
# the site certificate unconditionally — including when the certificate that
# had just renewed was a different one. With a second lineage on the box
# (`turn.grasslms.online`, for TURN over TLS) that becomes wrong rather than
# merely wasteful: the relay's certificate would renew and never arrive.
#
# certbot sets $RENEWED_LINEAGE to the live directory of the certificate that
# was renewed, and runs this hook once per certificate.
#
# Install on the prod box (one time, as root):
#   install -m 755 /opt/lms/scripts/letsencrypt-deploy-hook.sh \
#       /etc/letsencrypt/renewal-hooks/deploy/lms-reload.sh
#
# Test without waiting for a renewal:
#   RENEWED_LINEAGE=/etc/letsencrypt/live/grasslms.online \
#       /etc/letsencrypt/renewal-hooks/deploy/lms-reload.sh && echo ok
set -eu

LINEAGE="${RENEWED_LINEAGE:?this hook is run by certbot, which sets RENEWED_LINEAGE}"
SSL_DIR=/opt/lms/nginx/ssl

install_cert() {
    dest="$1"
    mkdir -p "$dest"
    cat "$LINEAGE/fullchain.pem" > "$dest/cert.pem"
    cat "$LINEAGE/privkey.pem"  > "$dest/key.pem"
    chmod 600 "$dest/key.pem"
}

case "$(basename "$LINEAGE")" in
    grasslms.online)
        install_cert "$SSL_DIR"
        ;;
    turn.grasslms.online)
        # Deliberately a separate directory and a separate certificate. Adding
        # `turn.` to the site's bundle would tie the site's expiry to it: on
        # 2026-07-29 one bundled subdomain failed its challenge and certbot
        # abandoned the whole renewal, and the site went down. Two lineages
        # cannot do that to each other.
        install_cert "$SSL_DIR/turn"
        ;;
    *)
        # staging and the nip.io fallback renew on their own and are not
        # mounted into this nginx. Nothing to copy, and silently copying them
        # over the site's certificate is exactly the bug this replaces.
        exit 0
        ;;
esac

# A reload, not a restart: nginx picks up the new files without dropping the
# connections it is already serving, and a lesson in progress never notices.
docker exec lms-nginx-1 nginx -s reload 2>/dev/null || true
