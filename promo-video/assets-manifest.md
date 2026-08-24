# Promo video asset manifest

All screenshot outputs are non-destructive derivatives. The source files in `/Users/jianghong/Desktop/图片` were not modified. Screenshot derivatives retain their original pixel dimensions and were not cropped or resized.

## Safety treatment

- Every selected full-page or modal screenshot has an opaque lower-left identity mask at `x=2, y=height-165, w=356, h=163`.
  - White-page captures use `#FEFEFF`.
  - Dimmed modal captures use `#C6C6C7`.
- `home.png` also masks the comma and account name in the greeting at `x=539, y=193, w=138, h=55` with white, leaving only `晚上好`.
- The three `translate-*` images also mask the account name in the right-side creator, updater, and publisher value cells at `x=2518, y=508/632/756, w=87, h=38` with white. Dates, visibility, separators, and the card outline remain intact.
- `subscribe-strip.png` masks the email-address placeholder at `x=491, y=98, w=995, h=58` with white. The field is intentionally blank.
- No output contains the login screenshot, login form, email address, or default password. `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_14.16.23.png` was explicitly excluded.
- `login-hero.webp` is the form-free illustration copied from the project brand assets; it contains no credentials or UI form.

## Selected assets

| Source | Output | Pixels | Treatment | Intended video use |
| --- | --- | ---: | --- | --- |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_14.21.51.png` | `public/screens/home.png` | 3010×1724 | Lower-left identity mask; greeting account name masked; no crop | Platform home reveal / product overview |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_14.02.48.png` | `public/screens/brief-overview.png` | 3012×1714 | Lower-left identity mask; no crop | AI Brief hero and featured-card overview |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.47.55.png` | `public/screens/brief-timeline.png` | 3000×1718 | Lower-left identity mask; no crop | Daily brief timeline / feed close-up |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.48.10.png` | `public/screens/tool-gemini.png` | 3016×1716 | Lower-left identity mask; no crop | External-tool detail montage |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.48.23.png` | `public/screens/tool-deepseek.png` | 3008×1724 | Lower-left identity mask; no crop | External-tool detail montage |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.48.43.png` | `public/screens/tool-internal.png` | 3008×1724 | Lower-left identity mask; no crop | Internal employee-assistant feature |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_02.30.54.png` | `public/screens/translate-overview.png` | 3010×1724 | Lower-left identity mask; creator/updater/publisher account names masked; no crop | Translation Skill overview |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_02.31.01.png` | `public/screens/translate-quickstart.png` | 3012×1722 | Lower-left identity mask; creator/updater/publisher account names masked; no crop | Translation Skill quick-start flow |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_02.31.08.png` | `public/screens/translate-files.png` | 3016×1724 | Lower-left identity mask; creator/updater/publisher account names masked; no crop | Translation Skill package/file browser |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.52.16.png` | `public/screens/ppt-overview.png` | 3016×1712 | Lower-left identity mask; no crop | PPT Skill overview |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.52.33.png` | `public/screens/ppt-files.png` | 3016×1712 | Lower-left identity mask; no crop | PPT Skill package/file browser |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_01.52.39.png` | `public/screens/ppt-version.png` | 3016×1720 | Lower-left identity mask; no crop | PPT Skill version/lifecycle view |
| `/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_14.02.56.png` | `public/screens/subscribe-strip.png` | 1778×252 | Email placeholder removed; no crop | Subscription/download callout |
| `/Users/project/MSSClaw/apps/web/public/brand/login-hero.webp` | `public/brand/login-hero.webp` | 1920×1003 | Exact copy; pure illustration; no crop | Opening/closing brand atmosphere |

## Excluded sensitive source

`/Users/jianghong/Desktop/图片/HapiGo_2026-08-20_14.16.23.png` was not copied or transformed because it contains a login form, an email field, and a password field.
