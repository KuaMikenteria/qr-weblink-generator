<div>
  
# QR Studio

A free, privacy-first QR code generator that runs entirely in your browser. Paste a link, get a scannable QR code instantly — no sign-up, no uploads, no tracking.

---

## Overview

QR Studio is a lightweight, single-page web app that turns any URL into a downloadable QR code in real time. It is built with plain HTML, CSS, and JavaScript — no frameworks, no build tools, no external dependencies. The QR encoder itself is embedded directly in `script.js`, so the entire tool works offline once loaded.

---

## Description

The app takes a link as input, validates and normalizes it (auto-prepending `https://` if needed), then encodes it into a QR code using byte mode at error-correction level **M**. The result is rendered on a high-resolution canvas (1024 × 1024 px) with a proper quiet zone, ready for screen use or print. Everything happens locally on your device — nothing is ever uploaded or sent to a server.

---

## Features

- ⚡ **Instant generation** — QR code appears as you paste or type
- 🔒 **100% client-side** — no uploads, no servers, no tracking
- 📦 **Zero dependencies** — QR encoder embedded in `script.js`
- 🖼️ **Print-ready PNG** — downloads at 1024 × 1024 px
- 🌗 **Dark mode** — follows system preference + manual toggle
- ♿ **Accessible** — keyboard support, ARIA labels, reduced-motion
- 📱 **Responsive** — works on mobile, tablet, and desktop
- 🧠 **Smart URL handling** — validates `http` / `https`, auto-adds scheme

---

## How to Use

1. Open `index.html` in any modern browser.
2. Paste or type a link into the input field.
3. The QR code is generated automatically.
4. Scan it with a phone camera, or click **Download PNG** to save it.

### Run Locally

=> bash <br />
=> git clone https://github.com/your-username/qr-weblink-generator.git <br />
=> cd qr-weblink-generator <br />
= >open index.html   <br />
# or just double-click the file

## How It Works

1. **Input** — User pastes or types a URL.
2. **Normalize** — The app trims the value, prepends `https://` if missing, and validates the scheme.
3. **Encode** — A compact byte-mode QR encoder picks the smallest version (1–40) that fits the data.
4. **Render** — Modules are drawn to a `<canvas>` at 1024 × 1024 with a 4-module quiet zone.
5. **Export** — Canvas converts to a PNG blob for download.

No network requests are made at any point.

---

## Future Recommendations

Ideas for extending the project (handled by maintainers):

- 🎨 **Custom colors & styles** — let users pick module/background colors and rounded dots.
- 🖼️ **Logo embedding** — center a favicon or custom logo in the QR code.
- 📄 **SVG export** — vector output for infinitely scalable printing.
- 🧾 **Multiple data types** — support vCard, Wi-Fi, email, SMS, and plain text.
- 📚 **Batch generation** — upload a CSV of links and download a ZIP of QR codes.
- 🔗 **Short-link preview** — optional integration with a URL shortener.
- 🌍 **i18n** — multi-language UI support.
- 🧪 **Unit tests** — validate the QR encoder against known vectors.

---

## License

Released under the **MIT License**.

The embedded QR encoding algorithm is based on the MIT-licensed [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase.

---

## Acknowledgements

- **Kazuhiko Arase** — original QR code generation algorithm (`qrcode-generator`).
- **DENSO WAVE INCORPORATED** — inventor and trademark holder of the QR Code.
- The open-source community for inspiration and tooling.

---

## Creator / Designer

**QR Studio** was designed and developed as a simple, private alternative to ad-heavy QR generators on the web.

- **Designer & Developer:** *[Kim Ruzzel L. Enteria]*
- **Contact:** *[[Kim Ruzzel L. Enteria](https://www.facebook.com/kritikomentaryo92)]*
- **Repository:** https://github.com/KuaMikenteria/qr-weblink-generator
> Built for the open web. 🌐

</div>
