# Digi Aura website

A lightweight single-page website for Digi Aura (plain HTML, CSS and vanilla JavaScript). The enquiry form saves to Supabase.

```
digi-aura/
├── index.html        Home, About, Services, Industries, Contact (all sections)
├── style.css         All styling and responsive layouts
├── script.js         Navigation, mobile menu, interactions, enquiry form logic
├── supabase.js       Supabase URL, public key and client setup
├── assets/
│   ├── images/       Section illustrations (SVG, about 40 KB in total)
│   └── logo/         digi-aura-logo.jpeg (supplied logo, unmodified)
└── supabase/
    └── schema.sql    Table, Row Level Security and insert-only policy
```

## Contact details

Set in `index.html` (search for `info@digiaura.tech` and `7305680905`): email `info@digiaura.tech` (`mailto:`) and phone `+91 7305680905` (`tel:+917305680905`). The form's error message in `script.js` also names the email.

## Supabase setup

1. If your Supabase project already has the `enquiries` table from an earlier version, re-run **section 4 only** of `supabase/schema.sql` (the `drop policy` + `create policy` block) in the SQL Editor. It now also allows the new service `Recruitment Lead Generation`; without this, enquiries choosing that option will be rejected. Otherwise run `supabase/schema.sql` in the Supabase SQL Editor.
2. Open `supabase.js` and make sure these two lines hold your project values (Project Settings → API):
   ```js
   const SUPABASE_URL = "https://your-project-ref.supabase.co";
   const SUPABASE_ANON_KEY = "your-public-anon-key";
   ```
3. Use only the public **anon/publishable** key here. Never put the `service_role` key in any browser file. The anon key is safe in the browser because Row Level Security allows it to insert valid enquiries only, never to read, update or delete.

If `supabase.js` still has the `YOUR_...` placeholders, the form tells visitors it is not connected and nothing is saved.

## Optional settings (top of `script.js`)

- `social.instagram / linkedin / facebook`: the footer icons are always shown; add each profile URL here to make it clickable (until then the icon does nothing). The WhatsApp links (footer + floating button) use `https://wa.me/917305680905`; search `index.html` for `wa.me` to change the number.
- `overseasAnswer`: replaces the FAQ answer about working outside India once confirmed.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (GitHub + Vercel)

Push the folder to GitHub, then import it in Vercel: framework preset **Other**, no build command, output directory `.` (root). No environment variables are needed because the public key lives in `supabase.js`.

## Images

The images in `assets/images/` are original illustrations drawn for this site. To use photographs instead, save them in `assets/images/` (about 800 px wide, JPEG or WebP, compressed) and change the `src` in `index.html`; the CSS crops every image to a consistent 4:3 frame.

## Spam protection

Included: field validation, length limits, a hidden honeypot field and duplicate-submission locking. For heavier traffic, add Cloudflare Turnstile or hCaptcha and move the insert into a Supabase Edge Function that verifies the token and rate-limits by IP.
