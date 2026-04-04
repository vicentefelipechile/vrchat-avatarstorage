# Security Policy

## Supported Versions

Because VRCStorage is a continuously deployed web service, we only support the latest deployed version of the application.

| Version            | Supported          |
| ------------------ | ------------------ |
| Current deployment | :white_check_mark: |
| Older commits      | :x:                |

## Reporting a Vulnerability

We take the security of VRCStorage very seriously. If you discover a security vulnerability, we would appreciate it if you could report it to us privately.

**Please do not open a public issue for security vulnerabilities.**

To report a vulnerability, please use **GitHub's private vulnerability reporting feature** located in the "Security" tab of this repository, or contact the project maintainers directly.

Please include the following information in your report:

- A detailed description of the vulnerability.
- Steps to reproduce the vulnerability.
- Any potential impact or risk associated with the vulnerability.

We aim to:

- Acknowledge your report within 48 hours.
- Provide a preliminary assessment and timeline for a fix.
- Address critical vulnerabilities as quickly as possible.

## Scope

The scope of this security policy includes the VRCStorage codebase:

- The Backend logic and API endpoints (Cloudflare Workers).
- The Frontend Service and API integrations.
- Data access patterns and validation layers.

**Out of scope:**

- Vulnerabilities within the underlying Cloudflare infrastructure itself (these should be reported directly to Cloudflare).
- Third-party dependencies (unless the vulnerability is actively exploitable due to how we use the dependency).
- Social engineering or phishing attacks against users.
