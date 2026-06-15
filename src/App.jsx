import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

/**
 * Multi-niche booking platform — prototype
 * --------------------------------------------------------------
 * One shared shell (welcome -> menu -> services / booking / contact / suggestion)
 * driven by per-niche config. To add a niche later, add one entry to THEMES
 * and one to CONTENT. Nothing in the shell is hard-coded to a vertical.
 *
 * - THEMES  = look & feel tokens (color, type, shape, spacing, motion)
 * - CONTENT = words & data (name, services, booking fields, contact, labels)
 * - The booking screen renders from CONTENT.booking.fields (data-driven),
 *   which is the generic abstraction that lets all three verticals share code.
 */

/* ------------------------------------------------------------------ */
/* THEME TOKENS                                                         */
/* ------------------------------------------------------------------ */
const THEMES = {
  restaurant: {
    name: "Maison Rouge",
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'EB Garamond', Georgia, serif",
    },
    color: {
      bg: "#F7F1E3",
      bgAlt: "#F1E8D4",
      surface: "#FBF7EC",
      ink: "#2B2018",
      inkSoft: "#6A5A4A",
      primary: "#6B1F2A",
      primaryDeep: "#4A1119",
      accent: "#C9A24B",
      line: "#DCCDA8",
    },
    radius: 3,
    shadow: "0 1px 0 #DCCDA8",
    pageMaxWidth: 560,
    eyebrow: { transform: "uppercase", spacing: "0.32em", size: 12 },
    button: { radius: 2, weight: 600, transform: "uppercase", spacing: "0.18em" },
    menuStyle: "list",
    motion: "fade",
    feel: "By candlelight, nightly",
    /* ---- theatrical decoration (restaurant only; other niches omit this) ---- */
    decor: {
      ambient: "candlelight", // background treatment key read by <ThemeBackdrop>
      curtain: "#3A0E14",     // deep burgundy glow behind the welcome
      glow: "#C9A24B",        // candle gold
      ember: "#8A2B22",       // warm ember
      grain: true,            // faint paper texture so cream reads like menu stock
      shimmer: true,          // one-time gold sweep across the welcome name
      rule: true,             // gold underline that draws in under headings
      fleuron: "❧",           // ornamental divider glyph
      seal: true,             // monogram rendered as an embossed wax seal
      stagger: true,          // staggered reveal of list items
    },
  },
  medical: {
    name: "Meridian Health",
    fonts: {
      display: "'IBM Plex Sans', system-ui, sans-serif",
      body: "'IBM Plex Sans', system-ui, sans-serif",
    },
    color: {
      bg: "#F4F8FB",
      bgAlt: "#E9F2F8",
      surface: "#FFFFFF",
      ink: "#16323F",
      inkSoft: "#5A7383",
      primary: "#1F6E96",
      primaryDeep: "#12354A",
      accent: "#3FA7A0",
      line: "#D5E4ED",
    },
    radius: 8,
    shadow: "0 1px 3px rgba(18,53,74,0.08), 0 0 0 1px #D5E4ED",
    pageMaxWidth: 760,
    eyebrow: { transform: "uppercase", spacing: "0.12em", size: 11 },
    button: { radius: 7, weight: 600, transform: "none", spacing: "0.01em" },
    menuStyle: "grid",
    motion: "slide",
    feel: "Crisp, dense, status-driven",
  },
  beauty: {
    name: "Bloom Studio",
    fonts: {
      display: "'Quicksand', system-ui, sans-serif",
      body: "'Nunito Sans', system-ui, sans-serif",
    },
    color: {
      bg: "#FBF3F1",
      bgAlt: "#F6E7E8",
      surface: "#FFFFFF",
      ink: "#4A3B40",
      inkSoft: "#9A7E86",
      primary: "#C27B8E",
      primaryDeep: "#8E5B6E",
      accent: "#A8B89F",
      line: "#F0DCDD",
    },
    radius: 24,
    shadow: "0 14px 40px -16px rgba(142,91,110,0.35)",
    pageMaxWidth: 600,
    eyebrow: { transform: "uppercase", spacing: "0.24em", size: 11 },
    button: { radius: 999, weight: 700, transform: "none", spacing: "0.02em" },
    menuStyle: "soft",
    motion: "rise",
    feel: "Soft, airy, fully rounded",
  },
};

/* ------------------------------------------------------------------ */
/* CONTENT / DATA                                                       */
/* ------------------------------------------------------------------ */
const CONTENT = {
  restaurant: {
    tagline: "A neighbourhood table, set for you.",
    monogram: "MR",
    bookLabel: "Reserve a table",
    confirmLabel: "Confirm reservation",
    confirmedWord: "Reserved",
    services: [
      { name: "Dinner Service", meta: "Tue – Sun · 6pm – 11pm", desc: "Seasonal à la carte menu." },
      { name: "Weekend Brunch", meta: "Sat – Sun · 10am – 2pm", desc: "Long, unhurried mornings." },
      { name: "Private Dining", meta: "Up to 24 guests", desc: "The cellar room, your evening." },
      { name: "Sommelier Pairing", meta: "Add to any service", desc: "Five wines, five courses." },
    ],
    booking: {
      fields: [
        { key: "party", label: "Party size", type: "counter", min: 1, max: 12, suffix: "guests" },
        { key: "area", label: "Seating area", type: "choice", options: ["Main dining", "Terrace", "Bar"] },
      ],
      times: ["6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30"],
      notesLabel: "Special requests (optional)",
      notesPlaceholder: "Allergies, an occasion, a high chair…",
      availability: { mode: "capacity", perSlot: 6 },
    },
    contact: {
      lines: [
        ["Address", "14 Rue du Marché, Old Town"],
        ["Telephone", "+965 2200 1400"],
        ["Email", "table@maisonrouge.co"],
        ["Hours", "Tue – Sun, 6pm til late"],
      ],
    },
  },
  medical: {
    tagline: "Care that runs on time.",
    monogram: "+",
    bookLabel: "Book an appointment",
    confirmLabel: "Confirm appointment",
    confirmedWord: "Booked",
    services: [
      { name: "General Consultation", meta: "20 min", desc: "Primary care & referrals." },
      { name: "Health Screening", meta: "45 min", desc: "Bloodwork & full panel." },
      { name: "Specialist Review", meta: "30 min", desc: "Cardiology, derm, ortho." },
      { name: "Vaccination", meta: "10 min", desc: "Travel & routine." },
    ],
    booking: {
      fields: [
        { key: "practitioner", label: "Practitioner", type: "choice", options: ["Dr. Haddad", "Dr. Osei", "Dr. Lindqvist"] },
        { key: "visit", label: "Visit type", type: "choice", options: ["Consultation", "Follow-up", "Screening"] },
      ],
      times: ["09:00", "09:30", "10:00", "11:00", "11:30", "13:00", "14:00", "15:30"],
      notesLabel: "Notes for the clinic (optional)",
      notesPlaceholder: "Anything the practitioner should know in advance.",
      availability: { mode: "exclusive", resourceKey: "practitioner" },
    },
    contact: {
      lines: [
        ["Clinic", "Meridian Health, Tower B, Level 3"],
        ["Reception", "+965 2200 9001"],
        ["Email", "appointments@meridian.health"],
        ["Hours", "Sun – Thu, 8am – 8pm"],
      ],
    },
  },
  beauty: {
    tagline: "Time set aside, just for you.",
    monogram: "✿",
    bookLabel: "Book an appointment",
    confirmLabel: "Book my appointment",
    confirmedWord: "Booked",
    services: [
      { name: "Cut & Style", meta: "60 min · 18 KD", desc: "Consultation, cut, finish." },
      { name: "Colour & Gloss", meta: "120 min · 45 KD", desc: "Balayage to full colour." },
      { name: "Signature Facial", meta: "75 min · 32 KD", desc: "Calm, glow, reset." },
      { name: "Manicure", meta: "45 min · 14 KD", desc: "Shape, treat, polish." },
    ],
    booking: {
      fields: [
        { key: "specialist", label: "Your specialist", type: "choice", options: ["Lina", "Mariam", "Yara"] },
        { key: "service", label: "Service", type: "choice", options: ["Cut & Style", "Colour & Gloss", "Facial", "Manicure"] },
      ],
      times: ["10:00", "11:00", "12:30", "14:00", "15:00", "16:30", "17:30", "18:30"],
      notesLabel: "Notes for your specialist (optional)",
      notesPlaceholder: "Inspo, sensitivities, what you’re after…",
      availability: { mode: "exclusive", resourceKey: "specialist" },
    },
    contact: {
      lines: [
        ["Studio", "Bloom Studio, The Promenade"],
        ["Call or text", "+965 2200 5566"],
        ["Email", "hello@bloom.studio"],
        ["Hours", "Sat – Thu, 10am – 8pm"],
      ],
    },
  },
};

/* ------------------------------------------------------------------ */
/* HELPERS                                                              */
/* ------------------------------------------------------------------ */
function nextDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(d);
    dt.setDate(d.getDate() + i);
    out.push({
      key: dt.toISOString().slice(0, 10),
      dow: dt.toLocaleDateString("en-US", { weekday: "short" }),
      day: dt.getDate(),
      mon: dt.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
    });
  }
  return out;
}

// date key offset from today, for seeding example bookings
function dayKey(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// pre-existing bookings so unavailable slots are visible on first load.
// in production this comes from the backend.
const SEED_BOOKINGS = {
  restaurant: [
    ...Array.from({ length: 6 }, () => ({ date: dayKey(0), time: "7:00" })), // full
    ...Array.from({ length: 4 }, () => ({ date: dayKey(0), time: "7:30" })), // 2 left
    ...Array.from({ length: 2 }, () => ({ date: dayKey(1), time: "8:00" })),
  ],
  medical: [
    { resource: "Dr. Haddad", date: dayKey(0), time: "09:00" },
    { resource: "Dr. Haddad", date: dayKey(0), time: "10:00" },
    { resource: "Dr. Osei", date: dayKey(1), time: "11:00" },
  ],
  beauty: [
    { resource: "Lina", date: dayKey(0), time: "11:00" },
    { resource: "Mariam", date: dayKey(0), time: "14:00" },
  ],
};

// accepts a valid email OR a Kuwait mobile (8 digits, starts 5/6/9,
// optionally prefixed +965 / 00965 / 965)
function isValidContact(v) {
  const s = v.trim();
  if (!s) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return true;
  let d = s.replace(/[\s\-()]/g, "");
  if (/^\+965\d{8}$/.test(d)) d = d.slice(4);
  else if (/^00965\d{8}$/.test(d)) d = d.slice(5);
  else if (/^965\d{8}$/.test(d)) d = d.slice(3);
  return /^[569]\d{7}$/.test(d);
}

const MENU_ITEMS = [
  { id: "services", label: "Services available", desc: "What we offer", icon: "list" },
  { id: "booking", label: "__BOOK__", desc: "Pick a time", icon: "calendar" },
  { id: "contact", label: "Contact us", desc: "Find & reach us", icon: "pin" },
  { id: "suggestion", label: "Leave a suggestion", desc: "Tell us anything", icon: "chat" },
];

function Icon({ name, color, size = 22 }) {
  const s = { width: size, height: size, stroke: color, strokeWidth: 1.6, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "list": return (<svg viewBox="0 0 24 24" style={s}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>);
    case "calendar": return (<svg viewBox="0 0 24 24" style={s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>);
    case "pin": return (<svg viewBox="0 0 24 24" style={s}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case "chat": return (<svg viewBox="0 0 24 24" style={s}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>);
    case "back": return (<svg viewBox="0 0 24 24" style={s}><path d="M15 18l-6-6 6-6" /></svg>);
    case "check": return (<svg viewBox="0 0 24 24" style={{ ...s, strokeWidth: 2 }}><path d="M5 13l4 4L19 7" /></svg>);
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/* APP                                                                  */
/* ------------------------------------------------------------------ */
export default function App() {
  const [niche, setNiche] = useState("restaurant");
  const [screen, setScreen] = useState("welcome");
  const [bookings, setBookings] = useState({ restaurant: [], medical: [], beauty: [] });
  const t = THEMES[niche];
  const c = CONTENT[niche];

  // Pull current availability for a niche. The server returns ONLY aggregate
  // counts per slot (no names / numbers / notes), which we expand back into the
  // { date, time, resource } shape the Booking component already understands.
  async function refreshAvailability(n) {
    const { data, error } = await supabase.rpc("get_availability", { p_niche: n });
    if (error) {
      console.warn("[availability]", error.message);
      return;
    }
    const expanded = [];
    (data || []).forEach((row) => {
      for (let i = 0; i < row.taken; i++) {
        expanded.push({ date: row.slot_date, time: row.slot_time, resource: row.resource || null });
      }
    });
    setBookings((p) => ({ ...p, [n]: expanded }));
  }

  // Refresh whenever the active niche changes.
  useEffect(() => {
    refreshAvailability(niche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche]);

  // Atomic create: the database checks availability and inserts in one locked
  // step, so two people can't take the same slot. Returns { ok, reason }.
  async function createBooking(rec, extra) {
    const { data, error } = await supabase.rpc("create_booking", {
      p_niche: niche,
      p_resource: rec.resource ?? null,
      p_date: rec.date,
      p_time: rec.time,
      p_notes: extra.notes || null,
      p_contact: extra.contact,
      p_party: extra.party ?? null,
    });
    if (error) return { ok: false, reason: "error", message: error.message };
    await refreshAvailability(niche);
    return data;
  }

  // load fonts + global focus/motion styles once
  useEffect(() => {
    // viewport meta — width=device-width + viewport-fit=cover so iOS safe-area
    // insets resolve (needed for notch / home-indicator handling below)
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.name = "viewport";
      document.head.appendChild(vp);
    }
    vp.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");

    const id = "booking-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=EB+Garamond:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Quicksand:wght@500;600;700&family=Nunito+Sans:wght@400;600&display=swap";
      document.head.appendChild(link);
    }
    const sid = "booking-globals";
    if (!document.getElementById(sid)) {
      const st = document.createElement("style");
      st.id = sid;
      st.textContent = `
        *{ -webkit-tap-highlight-color: transparent; }
        html{ -webkit-text-size-adjust:100%; text-size-adjust:100%; }
        body{ margin:0; overflow-x:hidden; }
        /* dynamic viewport height so mobile address bars don't clip the page */
        .bk-root{ min-height:100vh; min-height:100dvh; }
        /* momentum scrolling for the horizontal date strip / pill bar */
        .bk-xscroll{ -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .bk-xscroll::-webkit-scrollbar{ display:none; }
        .bk-focus:focus-visible{outline:2px solid currentColor;outline-offset:2px;}
        @keyframes bkFade{from{opacity:0}to{opacity:1}}
        @keyframes bkRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes bkSlide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
        /* --- Maison Rouge theatrics --- */
        @keyframes bkCandleA{0%{opacity:.55;transform:translate(-4%,-2%) scale(1)}100%{opacity:.9;transform:translate(3%,2%) scale(1.08)}}
        @keyframes bkCandleB{0%{opacity:.4;transform:translate(2%,3%) scale(1.05)}100%{opacity:.75;transform:translate(-3%,-2%) scale(1)}}
        @keyframes bkEmber{0%{opacity:.25}100%{opacity:.55}}
        @keyframes bkShimmer{0%{background-position:-160% 0}60%,100%{background-position:260% 0}}
        @keyframes bkDraw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes bkSealIn{0%{opacity:0;transform:scale(.82) rotate(-8deg)}70%{transform:scale(1.04) rotate(1deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
      `;
      document.head.appendChild(st);
    }
  }, []);

  // reset to welcome when switching niche so the full feel is shown
  function switchNiche(n) {
    setNiche(n);
    setScreen("welcome");
  }

  const anim =
    t.motion === "rise" ? "bkRise 0.5s ease" :
    t.motion === "slide" ? "bkSlide 0.4s ease" :
    "bkFade 0.6s ease";

  return (
    <div
      className="bk-root"
      style={{
        background: t.color.bg,
        color: t.color.ink,
        fontFamily: t.fonts.body,
        display: "flex",
        flexDirection: "column",
        transition: "background 0.4s ease, color 0.4s ease",
      }}
    >
      <NicheSwitcher niche={niche} onSwitch={switchNiche} />
      <ThemeBackdrop t={t} screen={screen} />

      <main
        key={niche + screen}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: t.pageMaxWidth,
          margin: "0 auto",
          // safe-area aware: clears the fixed switcher + notch up top,
          // the home indicator below, and any landscape notch on the sides
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 92px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 56px)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 22px)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 22px)",
          animation: anim,
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        {screen === "welcome" && <Welcome t={t} c={c} go={setScreen} />}
        {screen === "menu" && <Menu t={t} c={c} go={setScreen} />}
        {screen === "services" && <Services t={t} c={c} back={() => setScreen("menu")} />}
        {screen === "booking" && (
          <Booking
            t={t}
            c={c}
            back={() => setScreen("menu")}
            bookings={bookings[niche]}
            onBook={createBooking}
          />
        )}
        {screen === "contact" && <Contact t={t} c={c} back={() => setScreen("menu")} />}
        {screen === "suggestion" && <Suggestion t={t} c={c} niche={niche} back={() => setScreen("menu")} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NICHE SWITCHER  (builder-facing demo control)                        */
/* ------------------------------------------------------------------ */
function NicheSwitcher({ niche, onSwitch }) {
  const items = [
    { id: "restaurant", label: "Restaurant", dot: "#6B1F2A" },
    { id: "medical", label: "Medical", dot: "#1F6E96" },
    { id: "beauty", label: "Beauty", dot: "#C27B8E" },
  ];
  return (
    <div
      className="bk-xscroll"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 14px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        gap: 4,
        padding: 4,
        maxWidth: "calc(100vw - 16px)",
        overflowX: "auto",
        borderRadius: 999,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 6px 20px -8px rgba(0,0,0,0.25)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {items.map((it) => {
        const active = it.id === niche;
        return (
          <button
            key={it.id}
            onClick={() => onSwitch(it.id)}
            className="bk-focus"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flex: "0 0 auto",
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              color: active ? "#fff" : "#444",
              background: active ? it.dot : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, flex: "0 0 auto", background: active ? "#fff" : it.dot }} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* THEME BACKDROP  (ambient atmosphere — only when t.decor is present)  */
/* ------------------------------------------------------------------ */
// Faint paper grain, generated once as an SVG data URI (no image asset).
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

function ThemeBackdrop({ t, screen }) {
  const d = t.decor;
  if (!d || d.ambient !== "candlelight") return null; // other niches: nothing

  const onWelcome = screen === "welcome";
  const layer = { position: "absolute", inset: 0, pointerEvents: "none" };

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* warm base wash: cream lifting to a soft amber centre */}
      <div
        style={{
          ...layer,
          background: `radial-gradient(120% 80% at 50% -10%, ${hexA(d.glow, 0.14)} 0%, transparent 55%),
                       radial-gradient(100% 90% at 50% 120%, ${hexA(d.ember, 0.1)} 0%, transparent 60%)`,
        }}
      />
      {/* curtain: a deep burgundy glow crowning the welcome screen only */}
      {onWelcome && (
        <div
          style={{
            ...layer,
            background: `radial-gradient(85% 55% at 50% -8%, ${hexA(d.curtain, 0.5)} 0%, ${hexA(d.curtain, 0.14)} 38%, transparent 62%)`,
            transition: "opacity 0.6s ease",
          }}
        />
      )}
      {/* two candle glows that slowly breathe out of phase */}
      <div
        style={{
          ...layer,
          left: "-8%",
          top: onWelcome ? "18%" : "10%",
          background: `radial-gradient(closest-side, ${hexA(d.glow, 0.55)}, transparent 70%)`,
          width: "55%",
          height: "55%",
          filter: "blur(36px)",
          animation: "bkCandleA 7s ease-in-out infinite alternate",
        }}
      />
      <div
        style={{
          ...layer,
          left: "auto",
          right: "-6%",
          top: onWelcome ? "30%" : "44%",
          background: `radial-gradient(closest-side, ${hexA(d.glow, 0.4)}, transparent 70%)`,
          width: "48%",
          height: "48%",
          filter: "blur(40px)",
          animation: "bkCandleB 9s ease-in-out infinite alternate",
        }}
      />
      {/* a low ember pool near the foot of the page */}
      <div
        style={{
          ...layer,
          top: "auto",
          bottom: "-12%",
          left: "20%",
          background: `radial-gradient(closest-side, ${hexA(d.ember, 0.35)}, transparent 70%)`,
          width: "60%",
          height: "40%",
          filter: "blur(50px)",
          animation: "bkEmber 6s ease-in-out infinite alternate",
        }}
      />
      {/* faint paper grain so the cream reads like menu card stock */}
      {d.grain && <div style={{ ...layer, backgroundImage: GRAIN_URI, backgroundSize: "180px 180px", opacity: 0.05, mixBlendMode: "multiply" }} />}
      {/* gentle vignette to seat everything in the room */}
      <div style={{ ...layer, boxShadow: `inset 0 0 220px 40px ${hexA(t.color.primaryDeep, 0.12)}` }} />
    </div>
  );
}

// hex (#RRGGBB) + alpha -> rgba(), so themes keep plain hex tokens
function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// gold underline that draws itself in; respects text alignment via `center`
function GoldRule({ t, center, width = 64, delay = 0.15 }) {
  if (!t.decor?.rule) return null;
  return (
    <div
      style={{
        height: 2,
        width,
        margin: center ? "14px auto 0" : "14px 0 0",
        background: `linear-gradient(90deg, transparent, ${t.color.accent} 18%, ${t.color.accent} 82%, transparent)`,
        transformOrigin: center ? "center" : "left",
        animation: `bkDraw 0.7s ${delay}s ease both`,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* SHARED PRIMITIVES                                                    */
/* ------------------------------------------------------------------ */
function Eyebrow({ t, children }) {
  return (
    <div
      style={{
        textTransform: t.eyebrow.transform,
        letterSpacing: t.eyebrow.spacing,
        fontSize: t.eyebrow.size,
        fontWeight: 600,
        color: t.color.primary,
        fontFamily: t.fonts.body,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ t, children, onClick, full, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bk-focus"
      style={{
        width: full ? "100%" : "auto",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        background: t.color.primary,
        color: "#fff",
        padding: "15px 30px",
        borderRadius: t.button.radius,
        fontFamily: t.fonts.body,
        fontWeight: t.button.weight,
        fontSize: 15,
        textTransform: t.button.transform,
        letterSpacing: t.button.spacing,
        transition: "transform 0.15s ease, background 0.2s ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function BackBar({ t, back, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
      <button
        onClick={back}
        className="bk-focus"
        aria-label="Back to menu"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: t.radius + 4,
          border: `1px solid ${t.color.line}`,
          background: t.color.surface,
          cursor: "pointer",
          color: t.color.ink,
        }}
      >
        <Icon name="back" color={t.color.ink} size={18} />
      </button>
      <span style={{ fontSize: 13, color: t.color.inkSoft, fontFamily: t.fonts.body }}>{title}</span>
    </div>
  );
}

function Heading({ t, children, size = 34 }) {
  // fluid: floors ~76% of target on tiny phones, scales up to the target by tablet
  const min = Math.round(size * 0.76);
  const vw = (size * 0.216).toFixed(2);
  return (
    <h1
      style={{
        fontFamily: t.fonts.display,
        fontWeight: t.menuStyle === "list" ? 600 : 600,
        fontSize: `clamp(${min}px, ${vw}vw, ${size}px)`,
        lineHeight: 1.12,
        margin: "0 0 8px",
        letterSpacing: t.menuStyle === "list" ? "-0.01em" : "-0.02em",
      }}
    >
      {children}
    </h1>
  );
}

/* ------------------------------------------------------------------ */
/* WELCOME                                                              */
/* ------------------------------------------------------------------ */
function Welcome({ t, c, go }) {
  const d = t.decor;

  // ---- Maison Rouge: candlelit menu-cover welcome ----
  if (d?.seal) {
    return (
      <div style={{ textAlign: "center", paddingTop: 30 }}>
        {/* wax-seal medallion */}
        <div
          style={{
            position: "relative",
            width: 104,
            height: 104,
            margin: "0 auto 26px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(120% 120% at 32% 28%, ${t.color.primary}, ${t.color.primaryDeep})`,
            color: t.color.accent,
            fontFamily: t.fonts.display,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "0.04em",
            border: `1.5px solid ${hexA(t.color.accent, 0.85)}`,
            boxShadow: `inset 0 2px 6px ${hexA("#000000", 0.35)}, inset 0 0 0 4px ${hexA(t.color.accent, 0.25)}, 0 10px 26px -12px ${hexA(t.color.primaryDeep, 0.8)}`,
            animation: "bkSealIn 0.8s cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          {c.monogram}
        </div>

        <Eyebrow t={t}>Welcome to</Eyebrow>

        {/* name with a single gold shimmer sweep */}
        <h1
          style={{
            fontFamily: t.fonts.display,
            fontWeight: 600,
            fontSize: "clamp(33px, 9.5vw, 46px)",
            lineHeight: 1.1,
            margin: "0 0 2px",
            letterSpacing: "-0.01em",
            backgroundImage: `linear-gradient(100deg, ${t.color.primary} 0%, ${t.color.primary} 38%, ${t.color.accent} 50%, ${t.color.primary} 62%, ${t.color.primary} 100%)`,
            backgroundSize: "260% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            animation: d.shimmer ? "bkShimmer 2.4s 0.3s ease both" : "none",
          }}
        >
          {t.name}
        </h1>
        <GoldRule t={t} center width={72} delay={0.5} />

        {/* fleuron divider */}
        <div style={{ color: t.color.accent, fontSize: 22, margin: "20px 0 4px", letterSpacing: "0.4em" }}>{d.fleuron}</div>

        <p
          style={{
            color: t.color.inkSoft,
            fontSize: 18,
            maxWidth: 340,
            margin: "6px auto 36px",
            lineHeight: 1.55,
            fontStyle: "italic",
          }}
        >
          {c.tagline}
        </p>

        <PrimaryButton t={t} onClick={() => go("menu")}>Be seated</PrimaryButton>

        <p style={{ marginTop: 28, fontSize: 11.5, letterSpacing: "0.28em", textTransform: "uppercase", color: t.color.inkSoft, fontFamily: t.fonts.body }}>
          {t.feel}
        </p>
      </div>
    );
  }

  // ---- default welcome (medical, beauty, and any niche without decor) ----
  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      {/* logo mark */}
      <div
        style={{
          width: 96,
          height: 96,
          margin: "0 auto 30px",
          borderRadius: t.menuStyle === "soft" ? 999 : t.radius + 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.menuStyle === "list" ? "transparent" : t.color.primary,
          border: t.menuStyle === "list" ? `1.5px solid ${t.color.accent}` : "none",
          color: t.menuStyle === "list" ? t.color.primary : "#fff",
          fontFamily: t.fonts.display,
          fontSize: 40,
          fontWeight: 600,
          boxShadow: t.menuStyle === "soft" ? t.shadow : "none",
        }}
      >
        {c.monogram}
      </div>

      <Eyebrow t={t}>Welcome to</Eyebrow>
      <Heading t={t} size={42}>{t.name}</Heading>
      <p
        style={{
          color: t.color.inkSoft,
          fontSize: 18,
          maxWidth: 360,
          margin: "10px auto 38px",
          lineHeight: 1.5,
          fontStyle: t.menuStyle === "list" ? "italic" : "normal",
        }}
      >
        {c.tagline}
      </p>

      <PrimaryButton t={t} onClick={() => go("menu")}>Enter</PrimaryButton>

      <p style={{ marginTop: 30, fontSize: 12, color: t.color.inkSoft, fontFamily: "system-ui, sans-serif" }}>
        {t.feel}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MENU                                                                 */
/* ------------------------------------------------------------------ */
function Menu({ t, c, go }) {
  const items = MENU_ITEMS.map((m) =>
    m.label === "__BOOK__" ? { ...m, label: c.bookLabel } : m
  );

  return (
    <div>
      <Eyebrow t={t}>{t.name}</Eyebrow>
      <Heading t={t}>How can we help?</Heading>
      <GoldRule t={t} width={56} />
      <p style={{ color: t.color.inkSoft, marginBottom: 30, marginTop: 14, fontSize: 16 }}>Choose where you’d like to go.</p>

      {t.menuStyle === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {items.map((m) => <MenuCard key={m.id} t={t} m={m} go={go} />)}
        </div>
      ) : t.menuStyle === "soft" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((m) => <MenuSoft key={m.id} t={t} m={m} go={go} />)}
        </div>
      ) : (
        <div style={{ borderTop: `1px solid ${t.color.line}` }}>
          {items.map((m, i) => <MenuRow key={m.id} t={t} m={m} go={go} n={i + 1} />)}
        </div>
      )}
    </div>
  );
}

function MenuRow({ t, m, go, n }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => go(m.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bk-focus"
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "20px 6px",
        background: hover ? hexA(t.color.accent, 0.06) : "transparent",
        border: "none",
        borderBottom: `1px solid ${t.color.line}`,
        cursor: "pointer",
        color: t.color.ink,
        transition: "background 0.25s ease",
        animation: t.decor?.stagger ? `bkRise 0.5s ${0.06 * n}s ease both` : "none",
      }}
    >
      <span style={{ fontFamily: t.fonts.display, color: t.color.accent, fontSize: 15, width: 28 }}>
        {String(n).padStart(2, "0")}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontFamily: t.fonts.display, fontSize: 20, transform: hover ? "translateX(4px)" : "none", transition: "transform 0.2s ease" }}>
          {m.label}
        </span>
        <span style={{ fontSize: 13, color: t.color.inkSoft, fontStyle: "italic" }}>{m.desc}</span>
      </span>
      <span style={{ color: t.color.accent, opacity: hover ? 1 : 0.4, transition: "opacity 0.2s" }}>→</span>
    </button>
  );
}

function MenuCard({ t, m, go }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => go(m.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bk-focus"
      style={{
        textAlign: "left",
        padding: 18,
        borderRadius: t.radius,
        background: t.color.surface,
        border: `1px solid ${hover ? t.color.primary : t.color.line}`,
        boxShadow: hover ? t.shadow : "none",
        cursor: "pointer",
        color: t.color.ink,
        transition: "border 0.18s ease",
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 8, marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: t.color.bgAlt,
        }}
      >
        <Icon name={m.icon} color={t.color.primary} size={20} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{m.label}</div>
      <div style={{ fontSize: 13, color: t.color.inkSoft }}>{m.desc}</div>
    </button>
  );
}

function MenuSoft({ t, m, go }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => go(m.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bk-focus"
      style={{
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 18,
        borderRadius: t.radius,
        background: t.color.surface,
        border: "none",
        boxShadow: hover ? t.shadow : "0 6px 22px -16px rgba(142,91,110,0.4)",
        cursor: "pointer",
        color: t.color.ink,
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all 0.22s ease",
      }}
    >
      <div
        style={{
          width: 48, height: 48, borderRadius: 999, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: t.color.bgAlt,
        }}
      >
        <Icon name={m.icon} color={t.color.primaryDeep} size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontFamily: t.fonts.display, fontSize: 17 }}>{m.label}</div>
        <div style={{ fontSize: 13, color: t.color.inkSoft }}>{m.desc}</div>
      </div>
      <span style={{ color: t.color.primary, fontSize: 20 }}>›</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SERVICES                                                             */
/* ------------------------------------------------------------------ */
function Services({ t, c, back }) {
  return (
    <div>
      <BackBar t={t} back={back} title="Menu" />
      <Eyebrow t={t}>What we offer</Eyebrow>
      <Heading t={t}>Services available</Heading>
      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: t.menuStyle === "soft" ? 14 : 0 }}>
        {c.services.map((s, i) => (
          <div
            key={s.name}
            style={{
              padding: t.menuStyle === "soft" ? 18 : "18px 4px",
              borderRadius: t.menuStyle === "soft" ? t.radius : 0,
              background: t.menuStyle === "soft" ? t.color.surface : "transparent",
              boxShadow: t.menuStyle === "soft" ? "0 6px 22px -16px rgba(142,91,110,0.4)" : "none",
              borderBottom: t.menuStyle === "soft" ? "none" : `1px solid ${t.color.line}`,
              borderTop: t.menuStyle !== "soft" && i === 0 ? `1px solid ${t.color.line}` : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: t.fonts.display, fontSize: 19, fontWeight: 600, marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 14, color: t.color.inkSoft }}>{s.desc}</div>
            </div>
            <div
              style={{
                fontSize: 12,
                color: t.color.primary,
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontFamily: "system-ui, sans-serif",
                padding: t.menuStyle === "grid" ? "4px 9px" : 0,
                borderRadius: 999,
                background: t.menuStyle === "grid" ? t.color.bgAlt : "transparent",
              }}
            >
              {s.meta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BOOKING  (config-driven — the generic engine)                        */
/* ------------------------------------------------------------------ */
function Booking({ t, c, back, bookings, onBook }) {
  const days = nextDays(14);
  const avail = c.booking.availability;
  const [values, setValues] = useState(() => {
    const init = {};
    c.booking.fields.forEach((f) => {
      init[f.key] = f.type === "counter" ? f.min : null;
    });
    return init;
  });
  const [date, setDate] = useState(days[0].key);
  const [time, setTime] = useState(null);
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slotError, setSlotError] = useState("");

  function set(k, v) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  // availability: capacity (shared covers) vs exclusive (one resource per slot)
  function slotInfo(tm) {
    if (avail.mode === "capacity") {
      const used = bookings.filter((b) => b.date === date && b.time === tm).length;
      const left = avail.perSlot - used;
      return { available: left > 0, left };
    }
    const res = values[avail.resourceKey];
    if (!res) return { available: true }; // undetermined until a resource is picked
    const taken = bookings.some((b) => b.resource === res && b.date === date && b.time === tm);
    return { available: !taken };
  }

  // drop a chosen time if it stops being available (resource or date changed)
  useEffect(() => {
    if (time && !slotInfo(time).available) setTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, JSON.stringify(values), bookings]);

  const contactValid = isValidContact(contact);
  const ready =
    c.booking.fields.every((f) => values[f.key] != null) &&
    date && time && slotInfo(time).available && contactValid;

  async function confirm() {
    if (!ready || submitting) return;
    if (!slotInfo(time).available) { setTime(null); return; } // last-moment guard
    setSubmitting(true);
    setSlotError("");
    const rec =
      avail.mode === "capacity"
        ? { date, time }
        : { resource: values[avail.resourceKey], date, time };
    const res = await onBook(rec, { notes, contact, party: values.party ?? null });
    setSubmitting(false);
    if (res && res.ok) {
      setDone(true);
    } else {
      const reason = res && res.reason;
      setSlotError(
        reason === "full" ? "That slot just filled up — please pick another time."
        : reason === "taken" ? "That time was just booked — please pick another."
        : "Something went wrong saving your booking. Please try again."
      );
      setTime(null); // force them to re-pick against fresh availability
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", paddingTop: 30 }}>
        <div
          style={{
            width: 70, height: 70, margin: "0 auto 22px",
            borderRadius: t.menuStyle === "soft" ? 999 : t.radius + 4,
            background: t.color.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="check" color="#fff" size={32} />
        </div>
        <Heading t={t} size={30}>{c.confirmedWord}</Heading>
        <p style={{ color: t.color.inkSoft, marginBottom: 28, fontSize: 16 }}>
          {date} at {time}. A confirmation is on its way to {contact}.
        </p>
        {notes.trim() && (
          <div
            style={{
              maxWidth: 360,
              margin: "0 auto 28px",
              padding: "12px 16px",
              textAlign: "left",
              borderRadius: t.radius,
              background: t.color.bgAlt,
              border: `1px solid ${t.color.line}`,
              fontSize: 14,
              color: t.color.ink,
            }}
          >
            <span style={{ fontSize: 12, color: t.color.inkSoft, display: "block", marginBottom: 4 }}>Your note</span>
            {notes}
          </div>
        )}
        <PrimaryButton t={t} onClick={back}>Back to menu</PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <BackBar t={t} back={back} title="Menu" />
      <Eyebrow t={t}>{c.bookLabel}</Eyebrow>
      <Heading t={t}>Pick your details</Heading>

      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 26 }}>
        {/* dynamic resource fields */}
        {c.booking.fields.map((f) => (
          <Field key={f.key} t={t} label={f.label}>
            {f.type === "counter" ? (
              <Counter t={t} value={values[f.key]} min={f.min} max={f.max} suffix={f.suffix} onChange={(v) => set(f.key, v)} />
            ) : (
              <Chips t={t} options={f.options} value={values[f.key]} onChange={(v) => set(f.key, v)} />
            )}
          </Field>
        ))}

        {/* date */}
        <Field t={t} label="Date">
          <div className="bk-xscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {days.map((d) => {
              const active = d.key === date;
              return (
                <button
                  key={d.key}
                  onClick={() => setDate(d.key)}
                  className="bk-focus"
                  style={{
                    flex: "0 0 auto",
                    width: 56,
                    padding: "10px 0",
                    borderRadius: t.radius,
                    border: `1px solid ${active ? t.color.primary : t.color.line}`,
                    background: active ? t.color.primary : t.color.surface,
                    color: active ? "#fff" : t.color.ink,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{d.isToday ? "Today" : d.dow}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: t.fonts.display }}>{d.day}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{d.mon}</div>
                </button>
              );
            })}
          </div>
        </Field>

        {/* time — availability-aware */}
        <Field t={t} label="Time">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {c.booking.times.map((tm) => {
              const info = slotInfo(tm);
              const active = tm === time;
              const off = !info.available;
              const low = avail.mode === "capacity" && info.available && info.left <= 3;
              const subLabel = off ? (avail.mode === "capacity" ? "Full" : "Booked") : low ? `${info.left} left` : "";
              return (
                <button
                  key={tm}
                  onClick={() => !off && setTime(tm)}
                  disabled={off}
                  className="bk-focus"
                  style={{
                    position: "relative",
                    padding: "9px 0 13px",
                    borderRadius: t.button.radius === 999 ? 999 : t.radius,
                    border: `1px solid ${active ? t.color.primary : t.color.line}`,
                    background: active ? t.color.primary : off ? t.color.bgAlt : t.color.surface,
                    color: active ? "#fff" : off ? t.color.inkSoft : t.color.ink,
                    cursor: off ? "not-allowed" : "pointer",
                    opacity: off ? 0.75 : 1,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "system-ui, sans-serif",
                    textDecoration: off ? "line-through" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tm}
                  {subLabel && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 3,
                        fontSize: 9,
                        fontWeight: 700,
                        textDecoration: "none",
                        color: active ? "rgba(255,255,255,0.85)" : off ? t.color.inkSoft : t.color.accent,
                      }}
                    >
                      {subLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        {/* notes — optional, config-driven label */}
        <Field t={t} label={c.booking.notesLabel}>
          <textarea
            className="bk-focus"
            placeholder={c.booking.notesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 15px",
              minHeight: 84,
              resize: "vertical",
              borderRadius: t.radius,
              border: `1px solid ${t.color.line}`,
              background: t.color.surface,
              color: t.color.ink,
              fontSize: 16,
              fontFamily: t.fonts.body,
              outline: "none",
            }}
          />
        </Field>

        {/* contact — required, email or Kuwait number, to send the confirmation */}
        <Field t={t} label="Where should we send your confirmation?">
          <input
            className="bk-focus"
            inputMode="email"
            placeholder="Email or Kuwait number (e.g. 5xxx xxxx)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            onBlur={() => setTouched(true)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 15px",
              borderRadius: t.radius,
              border: `1px solid ${touched && contact && !contactValid ? "#C0392B" : t.color.line}`,
              background: t.color.surface,
              color: t.color.ink,
              fontSize: 16,
              fontFamily: t.fonts.body,
              outline: "none",
            }}
          />
          {touched && contact && !contactValid && (
            <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 6 }}>
              Enter a valid email, or a Kuwait mobile — 8 digits starting 5, 6 or 9.
            </div>
          )}
        </Field>

        {slotError && (
          <div style={{ fontSize: 13, color: "#C0392B", textAlign: "center" }}>{slotError}</div>
        )}
        <PrimaryButton t={t} full disabled={!ready || submitting} onClick={confirm}>
          {submitting ? "Saving…" : c.confirmLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({ t, label, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.color.inkSoft, marginBottom: 10, fontFamily: "system-ui, sans-serif" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Chips({ t, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="bk-focus"
            style={{
              padding: "10px 16px",
              borderRadius: t.button.radius === 999 ? 999 : t.radius,
              border: `1px solid ${active ? t.color.primary : t.color.line}`,
              background: active ? t.color.primary : t.color.surface,
              color: active ? "#fff" : t.color.ink,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: t.fonts.body,
              transition: "all 0.15s ease",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Counter({ t, value, min, max, suffix, onChange }) {
  const btn = {
    width: 44, height: 44, borderRadius: t.button.radius === 999 ? 999 : t.radius,
    border: `1px solid ${t.color.line}`, background: t.color.surface,
    color: t.color.ink, fontSize: 20, cursor: "pointer", lineHeight: 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <button className="bk-focus" style={btn} onClick={() => onChange(Math.max(min, value - 1))}>–</button>
      <div style={{ fontFamily: t.fonts.display, fontSize: 22, minWidth: 90, textAlign: "center" }}>
        {value} <span style={{ fontSize: 13, color: t.color.inkSoft }}>{suffix}</span>
      </div>
      <button className="bk-focus" style={btn} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CONTACT                                                              */
/* ------------------------------------------------------------------ */
function Contact({ t, c, back }) {
  return (
    <div>
      <BackBar t={t} back={back} title="Menu" />
      <Eyebrow t={t}>Find us</Eyebrow>
      <Heading t={t}>Contact us</Heading>

      <div
        style={{
          marginTop: 26,
          borderRadius: t.radius,
          overflow: "hidden",
          border: `1px solid ${t.color.line}`,
        }}
      >
        {/* simple map stand-in */}
        <div
          style={{
            height: 150,
            background: `repeating-linear-gradient(45deg, ${t.color.bgAlt}, ${t.color.bgAlt} 12px, ${t.color.surface} 12px, ${t.color.surface} 24px)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{ color: t.color.primary }}><Icon name="pin" color={t.color.primary} size={34} /></div>
        </div>
        <div style={{ background: t.color.surface }}>
          {c.contact.lines.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: "flex", justifyContent: "space-between", gap: 16,
                padding: "15px 18px",
                borderTop: i === 0 ? "none" : `1px solid ${t.color.line}`,
              }}
            >
              <span style={{ fontSize: 13, color: t.color.inkSoft, fontFamily: "system-ui, sans-serif" }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SUGGESTION                                                           */
/* ------------------------------------------------------------------ */
function Suggestion({ t, c, niche, back }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!msg.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.rpc("add_suggestion", {
      p_niche: niche,
      p_name: name || null,
      p_message: msg.trim(),
    });
    setSending(false);
    if (!error) setSent(true);
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    borderRadius: t.radius,
    border: `1px solid ${t.color.line}`,
    background: t.color.surface,
    color: t.color.ink,
    fontSize: 16,
    fontFamily: t.fonts.body,
    outline: "none",
  };

  if (sent) {
    return (
      <div style={{ textAlign: "center", paddingTop: 30 }}>
        <div
          style={{
            width: 70, height: 70, margin: "0 auto 22px",
            borderRadius: t.menuStyle === "soft" ? 999 : t.radius + 4,
            background: t.color.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="check" color="#fff" size={32} />
        </div>
        <Heading t={t} size={30}>Thank you</Heading>
        <p style={{ color: t.color.inkSoft, marginBottom: 28, fontSize: 16 }}>
          We read every note. Yours is in good hands.
        </p>
        <PrimaryButton t={t} onClick={back}>Back to menu</PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <BackBar t={t} back={back} title="Menu" />
      <Eyebrow t={t}>We’re listening</Eyebrow>
      <Heading t={t}>Leave a suggestion</Heading>
      <p style={{ color: t.color.inkSoft, marginBottom: 24, fontSize: 16 }}>Anything we could do better? Tell us.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          className="bk-focus"
          style={inputStyle}
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="bk-focus"
          style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
          placeholder="Your suggestion…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <PrimaryButton t={t} full disabled={!msg.trim() || sending} onClick={send}>
          {sending ? "Sending…" : "Send suggestion"}
        </PrimaryButton>
      </div>
    </div>
  );
}
