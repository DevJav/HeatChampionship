# Data access

Read queries used by pages live here, one module per domain.

Every exported read starts with `await connection()`. The SQLite driver is
synchronous, so without it Next.js (Cache Components) would try to run the
query at build time and bake the result into the static page.

Writes (used from server actions) don't need it.
