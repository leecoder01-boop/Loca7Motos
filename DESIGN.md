---

## Overview

**Creative North Star: "Roadbook de Rally Editorial"**

Rastro Motos transforma a página em uma sequência de trechos: campos de asfalto quase preto, intervalos de papel técnico e vermelho pista conduzem o visitante da promessa de liberdade até a comparação objetiva e o contato. A atmosfera é sofisticada e mecânica sem virar decoração temática; motos, números, especificações e decisões continuam no primeiro plano.

A assinatura nasce da continuidade dos marcos quilométricos, da linguagem de rota, das linhas técnicas e dos filtros que tornam o catálogo navegável como um roadbook. A experiência permanece honesta: preços, frota, endereço e imagens de categoria são explicitamente demonstrativos.

**Key Characteristics:**

- Contraste cinematográfico entre asfalto, papel técnico e vermelho pista.
- Tipografia condensada, maiúscula e monumental para voz editorial; sans humanista para leitura e ação.
- Composição modular, linhas finas e cantos retos inspirados em placas e fichas de percurso.
- Marcos KM e vocabulário de rota conectando as seções sem ornamento persistente na viewport.
- Catálogo comparável, filtrável e progressivo no celular, com verdade visual explícita sobre as imagens.

**The Route Continuity Rule.** Preserve the sequence through KM markers, route language, section contrast, and navigable filters.

## Colors

### Primary

- **Rally Red:** ação principal, estado ativo, preços e grandes campos de serviço ou conversão. Use-o como decisão, não como ruído.
- **Rally Red Dark:** estado de hover para superfícies vermelhas e botões primários.
- **Rally Red Bright:** pequenos destaques sobre fundos escuros, como preço, palavra da marca e contagem do catálogo.

### Neutral

- **Asphalt:** fundo estrutural da página e das seções escuras.
- **Coal:** camada imediatamente acima do asfalto, especialmente no hero.
- **Catalog Card / Catalog Card Hover:** variação tonal mínima que mantém o grid plano e revela interação sem sombra.
- **Roadbook Mist:** fundo das seções de história e processo; é um papel técnico frio, não branco puro.
- **Technical White / Pure White:** texto principal e contraste máximo em controles e estados de foco.
- **Muted on Dark / Line on Dark:** texto secundário e divisórias de baixa ênfase.

### Utility

- **WhatsApp Green:** reservado ao botão flutuante de contato.
- **Status Green:** reservado ao ponto de disponibilidade no hero.

**The Red Field Rule.** Use rally red for decisive states and occasional full-width fields; never scatter it as decoration across every component.

**The Technical Paper Rule.** Light sections use the cool roadbook mist so the page feels printed and mechanical rather than sterile.

## Typography

Barlow Condensed carries all display and route language. The hero uses the `display-hero` role with an exceptionally tight line height, while section titles use `display-section`; both are uppercase and balanced. Manrope carries paragraphs, controls, metadata, and supporting copy.

The title role is used for motorcycle names and compact component headings. The label role uses tracked uppercase text for KM markers, route labels, categories, and small technical annotations. Body copy stays at the base role and should not imitate the display face.

On narrow screens, the hero display resolves to `clamp(4.1rem, 23vw, 6.6rem)` and section titles to `3.4rem`; the dense line height remains part of the identity.

**The Two Voices Rule.** Barlow Condensed announces route, speed, and hierarchy; Manrope explains, compares, and enables action. Do not swap their jobs.

## Layout

The content frame is generous and editorial: primary sections cap at `1380px`, the hero frame at `1460px`, and horizontal padding follows the `section-x` token. Most sections open with `90px` vertical padding and a KM marker before the main two-column composition.

Desktop layouts use deliberate asymmetry—typically a dominant heading column beside a narrower explanatory or operational column. The catalog is a three-column ruled grid. At the medium breakpoint (`980px`), navigation collapses, major compositions become one column, and the catalog becomes two columns. At the mobile breakpoint (`640px`), gutters become `20px`, cards become one column, controls stack, the fixed header shortens from `76px` to `66px`, and section headings hold at `3.4rem`.

The default mobile catalog exposes six motorcycles, then offers a full-width “Mostrar as 24 motos restantes” control. Selecting a category or typing a search renders every matching result immediately. This keeps the first scan concise without hiding deliberate queries.

**The Progressive Catalog Rule.** On mobile, show six cards only for the untouched all-motorcycles state; filters and search must always reveal their complete matching set.

**The Fixed Action Rule.** The mobile navigation must carry its own full-width WhatsApp action because the desktop header action is hidden below `980px`; the floating contact remains a secondary persistent route.

## Elevation & Depth

The system is predominantly flat. Depth comes from tonal layering, image gradients, ruled borders, and the alternation of full-width color fields rather than stacked card shadows. Catalog cards shift from Catalog Card to Catalog Card Hover over `250ms` without lifting.

The fixed header is the one architectural glass layer: translucent asphalt with `14px` backdrop blur and a fine Line on Dark divider. The circular WhatsApp action uses the only substantial ambient shadow (`0 12px 34px rgba(0,0,0,.38)`), while the status dot uses a small green halo (`0 0 0 5px rgba(85,216,144,.12)`).

**The Flat Machinery Rule.** Use borders and tonal steps for ordinary hierarchy; reserve ambient shadow for persistent floating utility.

## Shapes

Most controls, cards, grids, and contact tiles are rectangular with square corners. This keeps the page closer to a technical roadbook than a soft consumer dashboard. The brand mark is the exception: a clipped quadrilateral (`polygon(0 0, 100% 0, 78% 100%, 0 100%)`) suggests forward motion.

Circular geometry is reserved for status, WhatsApp, and the oversized concentric rings behind the final CTA. Those circles are signals or route echoes, not a general component language.

**The Signal Circle Rule.** Circles indicate availability, direct contact, or route resonance; never round every container to make the interface friendlier.

## Components

### Buttons

- **Primary:** square rally-red field, minimum height `52px`, internal padding `12px 20px`, bold Manrope label, and a directional arrow separated by a generous gap.
- **Hover / Focus:** primary darkens and translates upward by `2px` over `200ms`; keyboard focus always receives a `3px` white outline with `4px` offset.
- **Light:** white CTA on the red field; hover inverts to Coal.
- **Catalog action:** full-width transparent control with a fine steel border; hover flips to white with dark text.

### Chips

- **Style:** category filters are square, transparent, `42px` high, and separated by `7px`.
- **State:** hover and `aria-pressed=true` use Rally Red for both fill and border; all other chips keep the dark surface visible.

### Cards / Containers

- **Motorcycle card:** ruled rather than floating, with `255px` category artwork on desktop and `235px` on mobile, technical overlays, a compact three-column specification row, and a full-width inquiry action.
- **Image truth:** the artwork carries “Imagem de categoria,” and its accessible label states that the archetype does not represent the named model.
- **Availability panel:** translucent Asphalt, top and bottom rules, a small green status signal, and explicit demonstrative catalog copy.

### Inputs / Fields

- **Search:** transparent, borderless field inside a single bottom rule; the search icon and placeholder use muted gray. The field occupies up to `260px` on larger screens and the full width below `640px`.
- **Focus:** global visible focus applies; do not remove it in favor of color alone.

### Navigation

The desktop header is a fixed three-part grid with brand, centered anchors, and an outlined WhatsApp action. Link hover draws a `2px` red underline. Below `980px`, a `46px` menu trigger opens a full-width dark panel; the WhatsApp action moves inside that panel as a filled red row and remains operable with the other anchors.

### KM Marker

Each major section begins with a compact Barlow Condensed label such as “KM 118,” followed by a flexible one-pixel rule. The rule adapts its opacity to light, dark, or red surfaces. KM labels provide the recurring route signature; keep their sequence intentional.

### Floating WhatsApp

The persistent contact is a `58px` green circle, inset `22px` on desktop and `16px` on mobile. Hover moves it upward by `4px` and scales it to `1.03`; its shadow distinguishes utility from the otherwise flat system.

## Do's and Don'ts

### Do:

- **Do** preserve KM markers, route language, and catalog controls as the recurring roadbook signature.
- **Do** label catalog artwork as category imagery and state that it does not represent the named motorcycle.
- **Do** keep price, availability, address, hours, and operational claims visibly demonstrative until real data replaces them.
- **Do** keep specifications and price visible without hover, and retain the progressive six-card mobile catalog only in the untouched state.
- **Do** provide the WhatsApp action inside the open mobile navigation as well as the floating shortcut.
- **Do** preserve visible focus and reduced-motion behavior.

### Don't:

- **Don't** turn the catalog into detached rounded cards with diffuse shadows.
- **Don't** use red on every surface; it must retain the force of an active state or route decision.
- **Don't** use category artwork as if it were a verified photograph of a specific motorcycle model.
- **Don't** hide filtered or searched mobile results behind the initial six-card progressive limit.
- **Don't** remove the mobile-menu WhatsApp row when the desktop header action collapses.
name: "Rastro Motos"
description: "Um roadbook de rally editorial para escolher uma moto e iniciar a rota pelo WhatsApp."
colors:
  asphalt: "#09090a"
  coal: "#111113"
  technical-white: "#f8f8f5"
  pure-white: "#ffffff"
  roadbook-mist: "#e9e9e7"
  rally-red: "#c7132b"
  rally-red-dark: "#a30d21"
  rally-red-bright: "#ff6575"
  line-on-dark: "rgba(255,255,255,.15)"
  catalog-card: "#0d0d0f"
  catalog-card-hover: "#151518"
  muted-on-dark: "#aaaaaa"
  whatsapp-green: "#22c96b"
  status-green: "#55d890"
typography:
  display-hero:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(4.5rem, 10vw, 10.2rem)"
    fontWeight: 800
    lineHeight: 0.78
    letterSpacing: "-0.035em"
  display-section:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 7vw, 7.1rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  none: "0px"
  full: "999px"
spacing:
  xs: "7px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  2xl: "40px"
  section-y: "90px"
  section-x: "clamp(24px, 6vw, 92px)"
components:
  button-primary:
    backgroundColor: "{colors.rally-red}"
    textColor: "{colors.pure-white}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.rally-red-dark}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.none}"
  button-light:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.coal}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
    height: "52px"
  filter-default:
    backgroundColor: "transparent"
    textColor: "{colors.technical-white}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 15px"
    height: "42px"
  filter-active:
    backgroundColor: "{colors.rally-red}"
    textColor: "{colors.pure-white}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 15px"
    height: "42px"
  catalog-card:
    backgroundColor: "{colors.catalog-card}"
    textColor: "{colors.technical-white}"
    rounded: "{rounded.none}"
    padding: "18px 20px 22px"
  nav-header:
    backgroundColor: "rgba(9,9,10,.93)"
    textColor: "{colors.technical-white}"
    height: "76px"
  whatsapp-float:
    backgroundColor: "{colors.whatsapp-green}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.full}"
    size: "58px"
---
