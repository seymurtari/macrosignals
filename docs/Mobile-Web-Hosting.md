# Mobile web edition

The source now includes a browser bridge, authenticated Node server, PostgreSQL persistence and Replit configuration. The web build preserves the four pages, 50 KPIs, nine catalogue groups and up to 20 years of actual historical coverage.

Follow [Replit-Hosting.md](Replit-Hosting.md) for deployment. The private source repository is [seymurtari/macrosignals](https://github.com/seymurtari/macrosignals). The running website has not been published yet.

GitHub stores the private source. Replit hosts the running website and database. Ordinary GitHub Pages cannot run this Node backend; personal private repositories do not themselves make Pages websites private.

The web edition protects its assets and data with server-verified sessions. Production requires an HTTPS origin, a strong password supplied through Secrets, and persistent PostgreSQL storage. The Windows executable remains a separate desktop release and is not used by Replit.
