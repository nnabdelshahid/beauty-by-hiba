# Beauty by Hiba

A lightweight marketing and appointment-request site for Beauty by Hiba. The
current implementation is a static browser application deployed with Netlify.

## Current capabilities

- Responsive service and marketing landing page
- Appointment request form with single-day and multi-day date validation
- Browser-local booking portal
- Downloadable calendar (`.ics`) events
- Netlify routes for `/book` and `/portal`

## Run locally

The deployed application is static. Serve the repository root with any local
HTTP server, for example:

```bash
npx serve .
```

Then open the URL printed by the server. Directly opening the HTML files also
works for most flows, but an HTTP server more closely matches deployment.

## Data and security boundaries

Bookings are currently stored only in the user's browser through
`localStorage`. There is no shared backend, authentication layer, payment
processor, or production admin authorization yet. Do not use the current
portal to collect sensitive information.

## Project layout

- `index.html` — public landing page
- `book.html` — appointment request flow
- `portal.html` — browser-local booking view
- `script.js` — validation, local persistence, and calendar export
- `netlify.toml` — static publishing and route configuration

## Status

The public marketing and local demo flows are implemented. A production
booking backend, authenticated staff portal, notifications, and payments are
future work.
