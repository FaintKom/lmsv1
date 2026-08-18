# TURN over TLS on 443 — what to do, in order

For the school network that allows one port and nothing else.

TURN over UDP 3478 and TURN over TCP 7881 already cover most restrictive
networks, and they are live. The networks this is for permit exactly 443, do
not care what else the media server offers, and their pupils simply never see
anybody. That is the whole gap being closed.

**Do not merge the change before step 3 finishes.** nginx refuses to start when
an `ssl_certificate` file is missing, so deploying the new configuration onto a
box without `/opt/lms/nginx/ssl/turn/cert.pem` takes the site down rather than
degrading. The steps below are ordered so that never happens.

## What changes

Port 443 stops belonging to the HTTPS server and starts belonging to a stream
listener that sorts connections by the name the client asked for, without
decrypting them:

```
                       :443  (nginx stream, ssl_preread)
                         │
      SNI = turn.grasslms.online          everything else, and no SNI at all
                         │                                │
            127.0.0.1:8444 (TLS ends here)      127.0.0.1:8443 (the site)
                         │
        plain TURN → lms-livekit-1:5349  (external_tls: true)
```

The media server never sees a certificate. One process holds a private key, one
certificate renews, and `livekit/livekit.yaml` stays identical on a laptop and
in production.

Both hops speak PROXY protocol, so the site still sees who is calling. Without
it every request arrives from `127.0.0.1` and the login rate limit — five
attempts per address per minute — locks out everyone on earth after any five
attempts. This was measured, not assumed: with the header the upstream logs the
caller's address; with the two lines removed it logs `127.0.0.1`.

## Step 1 — the DNS record (owner only)

At Hostinger, in the `grasslms.online` zone:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `turn` | `204.168.165.41` | default |

Nothing else can proceed until this resolves: Let's Encrypt validates by
connecting to the name, and today it answers `NXDOMAIN`.

Check from anywhere:

```bash
nslookup turn.grasslms.online
```

## Step 2 — install the renewal hook (prod box, one time)

The hook that currently ships the site's certificate into nginx is hard-coded
to one lineage. With a second certificate on the box it would renew the relay's
certificate and never deliver it, and the failure would appear months later as
an expiry.

```bash
install -m 755 /opt/lms/scripts/letsencrypt-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/lms-reload.sh
```

Prove it works before trusting it — this rewrites the site's own certificate
files from the same source they already came from, so it is safe to run:

```bash
RENEWED_LINEAGE=/etc/letsencrypt/live/grasslms.online /etc/letsencrypt/renewal-hooks/deploy/lms-reload.sh && echo ok
```

## Step 3 — issue the certificate (prod box)

Its own certificate, for this hostname alone. **Never add `turn.` to the
`grasslms.online` bundle.** On 2026-07-29 one bundled subdomain failed its
challenge, certbot abandoned the entire renewal, and the site went down with
`ERR_CERT_DATE_INVALID`. Two lineages cannot do that to each other.

Certbot here authenticates with `--standalone`, which needs port 80, which
nginx is holding. The `pre` and `post` hooks already stop and start it for
renewals; a first issuance has to do the same by hand, and the site is down for
those few seconds:

```bash
docker stop lms-nginx-1 && certbot certonly --standalone -d turn.grasslms.online --non-interactive --agree-tos -m faintkom@gmail.com; docker start lms-nginx-1
```

Then place the files where nginx will look, using the hook rather than copying
by hand, so the path is exercised now instead of at the next renewal:

```bash
RENEWED_LINEAGE=/etc/letsencrypt/live/turn.grasslms.online /etc/letsencrypt/renewal-hooks/deploy/lms-reload.sh && ls -l /opt/lms/nginx/ssl/turn/
```

## Step 4 — merge

Merging deploys. `deploy.yml` sees a change under `nginx/` and reloads, but
this one also changes the nginx service's `command` and mounts, so
`docker compose up -d` **recreates the container** — a few seconds of downtime,
unlike an ordinary config reload. The media container is recreated too, because
its config mount moves from a file to a directory; any lesson running at that
moment reconnects by itself.

## Step 5 — verify, with controls

A check that cannot fail proves nothing, so each of these has one:

```bash
curl -sSI https://grasslms.online/login | head -1
```

```bash
echo | openssl s_client -connect grasslms.online:443 -servername turn.grasslms.online 2>/dev/null | openssl x509 -noout -subject
```

```bash
echo | openssl s_client -connect grasslms.online:443 -servername grasslms.online 2>/dev/null | openssl x509 -noout -subject
```

Expect `CN=turn.grasslms.online` and `CN=grasslms.online` respectively. The
second is the control: if both return the relay's certificate, the map is
inverted and the site is being served by a proxy that cannot serve it.

The client's address survived the extra hop — the check that matters, because
the rate limiter depends on it:

```bash
ssh root@204.168.165.41 "docker logs lms-nginx-1 --tail 20"
```

Access-log lines should carry real addresses. A log full of `127.0.0.1 - -`
means PROXY protocol is not arriving and every visitor now shares one rate
limit.

And the relay is reachable by the name it advertises:

```bash
ssh root@204.168.165.41 "docker logs lms-livekit-1 2>&1 | grep 'Starting TURN server'"
```

Expect `turn.portTLS: 5349` and `turn.externalTLS: true`.

## Rolling back

The change is four files and one revert. `git revert` the merge commit and
push: CI runs, `deploy.yml` recreates nginx with the stock main configuration,
and 443 goes back to the HTTPS server directly. The certificate can stay where
it is — it costs nothing and saves repeating step 3.

## What was rehearsed before any of this

The whole path, on throwaway containers, using the repository's actual
configuration files rather than copies of them: `nginx -t` reaching
`test is successful` with certificates mounted, listeners bound as designed
(`0.0.0.0:443`, `127.0.0.1:8443`, `127.0.0.1:8444`), the site reachable through
the stream proxy with the caller's real address intact, SNI routing returning
the right certificate for each name and for no name at all, and a TLS
connection to the relay's name arriving at the far end as plain TURN.
