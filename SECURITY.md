# Security Policy

## Supported versions

Before the first stable release, security fixes land on `main` and, when one
exists, the latest published pre-release. Older pre-releases are not supported.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Prefer GitHub private
vulnerability reporting at
`https://github.com/CyanoOrg/pi-norm-spec/security/advisories/new` once it is
enabled. If that channel is unavailable, email `bravetwo@163.com` with the
subject `pi-norm-spec security report`.

Include the affected revision, pi version, impact, a minimal reproduction, and
any proposed mitigation. Remove real credentials and private project data from
examples. We aim to acknowledge reports within five business days and will
coordinate disclosure after a fix or mitigation is available.

Security-sensitive areas include bridge command injection, path traversal,
policy-enforcement bypass, untrusted `.norm` content reaching shell execution,
escape behavior, and platform-binary distribution.
