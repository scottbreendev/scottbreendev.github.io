# Instagram stencils

Templates for the developer account: every post built from the same parts, so it all looks like
one brand. Each stencil is a plain HTML page at its real pixel size, styled by one stylesheet
(`kit.css`). `render.mjs` turns them into PNGs in `out/`.

This folder starts with an underscore so Jekyll leaves it out of the public site.

## The stencils

| File | Size | What it is for |
|---|---|---|
| `launch-weekendbuddy.html` | 1080×1350 | Launch or announcement, with two phones. Sample: Weekend Buddy, "Out now in Australia." |
| `launch-tzbuddy-mac.html` | 1080×1350 | The same stencil with a Mac window. Sample: Time Zone Buddy, "Now on Mac." |
| `spotlight.html` | 1080×1350 | Feature spotlight: one screenshot in the phone frame, one short headline. |
| `text-thought.html` | 1080×1350 | Build-in-public text post: a thought or lesson, set big, on cream. |
| `text-number.html` | 1080×1350 | The same, led by one big number. Shown in the dark brand theme. |
| `carousel-1-cover.html` | 1080×1350 | Carousel cover. |
| `carousel-2-slide.html` | 1080×1350 | Carousel content slide. Copy it once per point. |
| `carousel-3-end.html` | 1080×1350 | Carousel end card: "Follow for more" and the handle. Also works alone. |
| `family.html` | 1080×1350 | Meet the family: one card per app, each in its own colours. |
| `story.html` | 1080×1920 | Story, with a band reserved for a link, poll or quiz sticker. |
| `reel-cover.html` | 1080×1920 | Reel cover that also reads in the grid and feed crops. |
| `profile-picture.html` | 1080×1080 | Profile picture: the pineapple, safe inside Instagram's circle. |
| `og-image.html` | 1200×630 | Link preview for the website. Exports to `out/og-image.png`. |

## Change the handle

One place: the `--handle` line at the top of `kit.css`.

```css
--handle: "@scottbreendev";
```

Every template shows it through `<i class="handle"></i>`. Change the line, export again.
A handle up to about 16 characters sits on one line in the launch header. A longer one wraps the
app name there; delete the tag (`<span class="tag">`) to make room.

## Change the copy

Open the template and edit the text on the lines marked `<!-- EDIT -->`. It is plain text.

- Pick out words in the highlight colour with `<span class="hi">…</span>`.
- Headline sizes are classes: `h-xl` (148px), `h-l` (124px), `h-m` (100px), `h-s` (80px).
  If a headline runs to too many lines, step down one size.
- Screenshots and icons are read from `../images/`. Swap the `src`. iPhone captures are 600px
  wide, so keep a phone under about 600px (`--pw`). The app icons are only 192px, so keep them
  under about 200px.
- Voice: friendly, plain, short lines, sentence case, no emoji in the artwork.

## Change the app theme

Set `data-app` on the template's `<main>`:

| `data-app` | Look |
|---|---|
| `brand` | Cream page, pineapple gold, leaf green (the default) |
| `brand-dark` | The site's dark theme |
| `weekend` | Weekend Buddy: sunset on paper |
| `tz` | Time Zone Buddy: teal on navy |
| `score` | Score Buddy: blue to violet |
| `commission` | Commission Buddy: lime on eucalyptus |
| `yakable` | Yakable: orange, pink and violet on near-black |

Each theme is a short block of colours near the top of `kit.css`. A new app is one more block.

## Export the PNGs

```sh
node _social/render.mjs                  # every template -> _social/out/<name>.png
node _social/render.mjs story og-image   # just those
node _social/render.mjs --guides         # with the safe zones drawn on, into _social/out/guides/
```

Nothing to install. The script drives a headless Chromium that is already on this Mac (the one
Playwright keeps in `~/Library/Caches/ms-playwright`; otherwise Chrome, Edge, Chromium or Brave
in `/Applications`; or set `CHROME=/path/to/chrome`). It needs Node 22 or later and, because the
fonts come from Google Fonts as they do on the website, an internet connection. If a font or an
image fails to load it stops with an error instead of exporting a wrong PNG.

To use the new link preview on the site, copy `out/og-image.png` over `../images/og-image.png`.

## Safe zones

Use the whole frame. Don't stack everything under the headline and leave the bottom empty.

- **Feed posts and carousels (1080×1350):** balance top to bottom; no big empty lower third.
  The profile grid crops these to 3:4, which trims about 34px off each side, so keep copy inside
  the 84px margins.
- **Stories (1080×1920):** content in y ≈ 250–1670, visually centred. Leave a clear band for any
  sticker inside that range. In `story.html` that band is the empty gap under the cue line;
  make it taller for a poll or quiz with `style="--sticker-h: 320px"` on `.sticker-slot`.
  The phone runs off the bottom on purpose: only its top needs to be seen.
- **Reels (1080×1920):** the headline can sit at the top (about y 214), but the main visual is
  centred in the frame, its mass around y 900–1000, inside y ≈ 250–1450. No text in the top
  220px, the bottom 450px, or the right 140px below y ≈ 1000. End cards centre vertically too.
- **Reel covers and grid covers:** the grid shows the centre 3:4 (y 240–1680) and the feed the
  centre 4:5 (y 285–1635). `reel-cover.html` keeps everything inside y 330–1604.
- **Profile picture:** Instagram shows the circle inscribed in the square.

Before posting, look at the exported PNG and check the vertical balance, not just overlap.
`--guides` draws the no-go zones (red hatching) and the grid crop (blue lines) on top.

## Files

- `kit.css`: the handle, the themes, and every template's layout.
- `render.mjs`: the exporter.
- `assets/scorebuddy-icon.svg`: the Score Buddy icon. On the site it exists only inline in
  `index.html`, so this is a standalone copy. Every other image is read from `../images/`.
- `out/`: the exported PNGs.

## Publishing to iCloud

The repo keeps the source only. Finished assets live in iCloud Drive, under
`~/Library/Mobile Documents/com~apple~CloudDocs/Dev/Scott Breen Dev/social/` (the same layout the
app repos use):

- `profile-pic-1080.png`: the Instagram profile picture.
- `stencils/`: one sample PNG per stencil.
- `<YYYY-MM-slug>/`: one folder per finished post, holding `post.png` (or numbered slides) and a
  `caption.txt` ready to paste.

`./publish.sh` exports everything and refreshes the profile picture and `stencils/`. Set
`SBD_OUTPUT` to publish somewhere else. Post folders are made by hand: copy the exported PNG in and
write the caption beside it. `out/` is git-ignored.

## Photo post

`photo-post.html` (1080×1350) is a full-bleed photo with a headline over the top and the signature
over the bottom; it works as a feed post or a carousel cover. The photo is a 1080×1350 JPEG in
`assets/`. Before a photo goes in, check it for number plates, faces, street signs and shop names,
crop them out rather than blurring, and strip the metadata (iPhone photos carry the location).
