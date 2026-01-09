# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of CoreX seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**[INSERT SECURITY EMAIL]**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### What to Expect

After you submit a report, we will:

1. **Confirm receipt** of your vulnerability report within 48 hours
2. **Assess the issue** and determine its severity and scope
3. **Work on a fix** based on the severity:
   - Critical: Within 24-48 hours
   - High: Within 7 days
   - Medium: Within 30 days
   - Low: Within 90 days
4. **Release a patch** and publicly disclose the issue
5. **Credit you** (if desired) in the security advisory

### Safe Harbor

We consider security research conducted under this policy to be:

- Authorized concerning any applicable anti-hacking laws
- Authorized concerning any relevant anti-circumvention laws
- Exempt from restrictions in our Terms of Service that would interfere with conducting security research

We will not pursue civil action or initiate a complaint to law enforcement for accidental, good-faith violations of this policy.

## Security Best Practices

When using CoreX, follow these security best practices:

### Environment Variables

- **Never commit** `.env` files to version control
- Use **strong, unique secrets** for `INTERNAL_API_SECRET` and `JWT_SECRET`
- Rotate secrets periodically
- Use environment-specific configurations

### Authentication

- Enable **multi-factor authentication** when possible
- Use **short-lived access tokens** (configured by default)
- Implement **session timeout** for sensitive applications
- Monitor for suspicious login attempts

### Database

- Enable **Row Level Security (RLS)** on all tables
- Use **service role key** only for server-side operations
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Regularly audit database permissions

### API Security

- Always **validate inputs** with Zod schemas
- Enable **rate limiting** in production
- Use **HTTPS** everywhere
- Implement proper **CORS configuration**

### Dependencies

- Run `pnpm audit` regularly
- Keep dependencies up to date
- Review dependency changes in pull requests
- Use lockfiles for reproducible builds

## Security Features in CoreX

CoreX includes several security features by default:

| Feature                | Description                     | Configuration                     |
| ---------------------- | ------------------------------- | --------------------------------- |
| **CSP**                | Content Security Policy headers | `src/server/security/headers.ts`  |
| **HSTS**               | HTTP Strict Transport Security  | `next.config.ts`                  |
| **Input Sanitization** | XSS prevention utilities        | `src/server/security/sanitize.ts` |
| **Rate Limiting**      | API abuse prevention            | `src/server/rateLimit/`           |
| **RBAC/PBAC**          | Role & permission-based access  | `src/lib/auth/roles.ts`           |
| **Session Management** | Secure cookie handling          | `src/server/auth/session.ts`      |

For detailed security documentation, see [docs/SECURITY.md](docs/SECURITY.md).

## Acknowledgments

We thank the security researchers who have helped improve CoreX's security:

<!-- Add names/handles of contributors who have reported security issues -->

---

Thank you for helping keep CoreX and its users safe!
