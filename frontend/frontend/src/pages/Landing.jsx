import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Armchair,
  BrainCircuit,
  CheckCircle2,
  Handshake,
  MapPin,
  Menu,
  RotateCcw,
  Route,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrainTrack,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "ai-matching", label: "AI Matching" },
  { id: "about", label: "About" },
];

const STEPS = [
  {
    title: "Add your journey.",
    copy: "Choose a fictional train and journey so the exchange engine can reason about the trip.",
    icon: Ticket,
  },
  {
    title: "Set your berth preferences.",
    copy: "Tell RailSwap which berth you currently hold and the berth you would prefer.",
    icon: Armchair,
  },
  {
    title: "Discover compatible passengers.",
    copy: "Review reciprocal candidates with transparent compatibility explanations.",
    icon: UsersRound,
  },
  {
    title: "Send an exchange request.",
    copy: "Coordinate through a consent-first workflow where both passengers must approve.",
    icon: Handshake,
  },
];

const FEATURES = [
  {
    title: "Intelligent Matching",
    copy: "Discover passengers with reciprocal berth preferences.",
    icon: BrainCircuit,
  },
  {
    title: "Transparent Recommendations",
    copy: "Understand why a candidate is considered compatible.",
    icon: ScanSearch,
  },
  {
    title: "Coach Visualization",
    copy: "Explore berth layouts through a clear visual interface.",
    icon: Armchair,
  },
  {
    title: "Mutual Consent",
    copy: "Manage exchange requests with clear approval states.",
    icon: Handshake,
  },
  {
    title: "Exchange Tracking",
    copy: "Follow the progress of requests in one place.",
    icon: Route,
  },
  {
    title: "Privacy-Conscious Design",
    copy: "Keep passenger information protected and minimize unnecessary disclosure.",
    icon: ShieldCheck,
  },
];

function RailMark({ compact = false }) {
  return (
    <span
      className={`landing-logo-mark ${compact ? "is-compact" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none">
        <path
          d="M11.5 8.5v23M28.5 8.5v23"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 12.5h23M8.5 20h23M8.5 27.5h23"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity=".5"
        />
        <path
          d="M6.5 32.5C14.5 28.5 17.5 19 21 9"
          stroke="#55D6D0"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="21" cy="9" r="3.2" fill="#55D6D0" />
      </svg>
    </span>
  );
}

function HeroBerthCard({ passenger, current, prefers, className = "" }) {
  return (
    <article className={`landing-preview-card ${className}`.trim()}>
      <div className="landing-preview-card-head">
        <span className="landing-preview-passenger">
          <span className="landing-preview-avatar">{passenger}</span>
          Passenger {passenger}
        </span>
        <span className="landing-preview-current">Current</span>
      </div>
      <div className="landing-preview-berth">
        <span className="landing-preview-berth-icon">
          <Armchair size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>{current} Berth</strong>
          <small>Current assignment</small>
        </div>
      </div>
      <div className="landing-preview-pref">
        <ArrowLeftRight size={13} aria-hidden="true" />
        <span>
          Prefers <strong>{prefers} Berth</strong>
        </span>
      </div>
    </article>
  );
}

function TrainArt() {
  return (
    <svg viewBox="0 0 330 138" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="landing-train-body" x1="48" y1="38" x2="260" y2="110">
          <stop stopColor="#17283D" />
          <stop offset="1" stopColor="#101C2C" />
        </linearGradient>
        <linearGradient id="landing-train-glass" x1="82" y1="52" x2="196" y2="78">
          <stop stopColor="#D9F4F2" stopOpacity=".92" />
          <stop offset="1" stopColor="#9FDCD8" stopOpacity=".7" />
        </linearGradient>
      </defs>
      <path
        d="M24 116h282"
        stroke="#101C2C"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".14"
      />
      <path
        d="M38 110h255"
        stroke="#101C2C"
        strokeWidth="1"
        strokeLinecap="round"
        opacity=".1"
      />
      <path
        d="M47 105V55c0-10 8-18 18-18h149c9 0 16 7 16 16v52"
        fill="url(#landing-train-body)"
      />
      <path
        d="M230 37h16c18 0 32 14 32 32v10c0 8-6 14-14 14h-34V37Z"
        fill="url(#landing-train-body)"
      />
      <path
        d="M246 44h8c10 0 18 8 18 18v7c0 4-3 7-7 7h-19V44Z"
        fill="url(#landing-train-glass)"
        opacity=".78"
      />
      <rect x="72" y="50" width="30" height="23" rx="6" fill="#EEF3FA" opacity=".88" />
      <rect x="112" y="50" width="30" height="23" rx="6" fill="#EEF3FA" opacity=".88" />
      <rect x="152" y="50" width="30" height="23" rx="6" fill="#EEF3FA" opacity=".88" />
      <rect x="192" y="50" width="26" height="23" rx="6" fill="#EEF3FA" opacity=".88" />
      <path d="M62 88h208" stroke="#55D6D0" strokeWidth="2" opacity=".55" />
      <circle cx="92" cy="108" r="12" fill="#101C2C" />
      <circle cx="92" cy="108" r="5" fill="#55D6D0" opacity=".9" />
      <circle cx="216" cy="108" r="12" fill="#101C2C" />
      <circle cx="216" cy="108" r="5" fill="#55D6D0" opacity=".9" />
      <path
        d="M286 77h14"
        stroke="#55D6D0"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="307" cy="77" r="7" fill="#55D6D0" opacity=".18" />
    </svg>
  );
}

function HeroVisual() {
  return (
    <div
      className="landing-hero-visual landing-reveal"
      role="img"
      aria-label="Illustration of two passengers exchanging reciprocal upper and lower berth preferences"
    >
      <div className="landing-visual-window">
        <div className="landing-visual-topbar">
          <span className="landing-visual-label">
            <BrainCircuit size={15} aria-hidden="true" />
            AI matching preview
          </span>
          <span className="landing-demo-tag">Synthetic</span>
        </div>

        <svg
          className="landing-visual-route"
          viewBox="0 0 560 520"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="landing-hero-route"
              x1="78"
              y1="390"
              x2="472"
              y2="148"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#2457C5" />
              <stop offset=".58" stopColor="#55D6D0" />
              <stop offset="1" stopColor="#2457C5" stopOpacity=".7" />
            </linearGradient>
          </defs>
          <path
            d="M78 390C168 390 170 288 268 282C366 276 368 178 472 148"
            stroke="#101C2C"
            strokeWidth="26"
            strokeLinecap="round"
            opacity=".035"
          />
          <path
            className="landing-route-flow"
            d="M78 390C168 390 170 288 268 282C366 276 368 178 472 148"
            stroke="url(#landing-hero-route)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="7 10"
          />
          <circle cx="78" cy="390" r="7" fill="#F7F6F2" stroke="#2457C5" strokeWidth="3" />
          <circle cx="472" cy="148" r="7" fill="#F7F6F2" stroke="#55D6D0" strokeWidth="3" />
        </svg>

        <div className="landing-visual-station landing-visual-station-start">
          <MapPin size={14} aria-hidden="true" />
          <div>
            <small>Start</small>
            <strong>Journey</strong>
          </div>
        </div>
        <div className="landing-visual-station landing-visual-station-end">
          <MapPin size={14} aria-hidden="true" />
          <div>
            <small>Arrival</small>
            <strong>Destination</strong>
          </div>
        </div>

        <HeroBerthCard
          passenger="A"
          current="Upper"
          prefers="Lower"
          className="landing-preview-card-a"
        />
        <HeroBerthCard
          passenger="B"
          current="Lower"
          prefers="Upper"
          className="landing-preview-card-b"
        />

        <div className="landing-exchange-chip" aria-hidden="true">
          <span>
            <ArrowLeftRight size={17} />
          </span>
          Reciprocal
        </div>

        <div className="landing-visual-train" aria-hidden="true">
          <TrainArt />
        </div>

        <div className="landing-visual-caption">
          <span>
            <Sparkles size={15} aria-hidden="true" />
          </span>
          <p>Both passengers prefer the berth assigned to the other.</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title, copy, id, align = "center" }) {
  return (
    <header
      className={`landing-section-heading landing-reveal ${
        align === "left" ? "is-left" : ""
      }`.trim()}
    >
      <span className="landing-kicker">{kicker}</span>
      <h2 id={id}>{title}</h2>
      {copy && <p>{copy}</p>}
    </header>
  );
}

function DemoPassengerCard({ passenger, current, prefers, className = "" }) {
  return (
    <article className={`landing-demo-card ${className}`.trim()}>
      <header className="landing-demo-card-head">
        <span className="landing-demo-avatar">{passenger}</span>
        <div>
          <small>Passenger {passenger}</small>
          <strong>{current} berth passenger</strong>
        </div>
      </header>
      <dl className="landing-demo-berth-list">
        <div>
          <dt>
            <Armchair size={14} aria-hidden="true" />
            Current berth
          </dt>
          <dd>{current}</dd>
        </div>
        <div>
          <dt>
            <ArrowLeftRight size={14} aria-hidden="true" />
            Preferred berth
          </dt>
          <dd className="is-preferred">{prefers}</dd>
        </div>
      </dl>
    </article>
  );
}

function MatchDemo() {
  const [runId, setRunId] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    []
  );

  function replay() {
    if (replaying) return;
    setRunId((current) => current + 1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReplaying(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setReplaying(false), 1600);
  }

  return (
    <section
      id="ai-matching"
      className="landing-ai-section"
      aria-labelledby="landing-ai-heading"
    >
      <div className="landing-ai-glow" aria-hidden="true" />
      <div className="landing-container">
        <div className="landing-ai-heading landing-reveal">
          <div>
            <span className="landing-kicker is-light">AI matching</span>
            <h2 id="landing-ai-heading">
              Two preferences.
              <span>One compatible match.</span>
            </h2>
          </div>
          <p>
            RailSwap looks for reciprocal intent, then explains the connection
            in plain language so both passengers can decide with confidence.
          </p>
        </div>

        <div
          className={`landing-demo-grid ${replaying ? "is-replaying" : ""}`.trim()}
        >
          <DemoPassengerCard
            passenger="A"
            current="Upper"
            prefers="Lower"
            className="landing-demo-card-a"
          />

          <div className="landing-demo-connector">
            <span className="landing-demo-match-pill">
              <Sparkles size={13} aria-hidden="true" />
              Reciprocal
            </span>
            <div className="landing-demo-route-wrap" key={runId}>
              <svg viewBox="0 0 190 110" fill="none" aria-hidden="true">
                <path
                  d="M8 55h174"
                  stroke="rgba(255,255,255,.18)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  className="landing-demo-route-line"
                  d="M8 55h174"
                  stroke="#55D6D0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="55" r="4.5" fill="#55D6D0" />
                <circle cx="182" cy="55" r="4.5" fill="#55D6D0" />
              </svg>
              <span className="landing-demo-route-icon">
                <ArrowLeftRight size={16} aria-hidden="true" />
              </span>
            </div>
            <span className="landing-demo-connector-label">Compatible route</span>
          </div>

          <DemoPassengerCard
            passenger="B"
            current="Lower"
            prefers="Upper"
            className="landing-demo-card-b"
          />
        </div>

        <div className="landing-demo-explanation landing-reveal">
          <div>
            <CheckCircle2 size={18} aria-hidden="true" />
            <p>
              Both passengers prefer the berth currently assigned to the other.
            </p>
          </div>
          <span className="landing-demo-synthetic">
            Illustrative demonstration using synthetic data
          </span>
        </div>

        <div className="landing-demo-actions">
          <button
            type="button"
            className="landing-demo-replay"
            onClick={replay}
            disabled={replaying}
          >
            <RotateCcw size={15} aria-hidden="true" />
            {replaying ? "Tracing preferences..." : "Replay matching"}
          </button>
          <span className="landing-sr-only" role="status" aria-live="polite">
            {replaying ? "Tracing reciprocal preferences." : ""}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const year = new Date().getFullYear();

  useEffect(() => {
    const previousTitle = document.title;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute("content");

    document.title = "RailSwap AI | Intelligent Railway Seat Exchange";
    themeMeta?.setAttribute("content", "#F7F6F2");
    document.body.classList.add("landing-body");

    return () => {
      document.title = previousTitle;
      if (themeMeta && previousTheme) {
        themeMeta.setAttribute("content", previousTheme);
      }
      document.body.classList.remove("landing-body");
    };
  }, []);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 14);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const sections = NAV_LINKS.map(({ id }) => document.getElementById(id)).filter(
      Boolean
    );
    if (!sections.length || !("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActiveSection(current.target.id);
      },
      { rootMargin: "-38% 0px -54% 0px", threshold: [0, 0.2, 0.5] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(".landing-reveal"));
    if (!nodes.length) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="landing-page">
      <header className={`landing-nav ${scrolled ? "is-scrolled" : ""}`.trim()}>
        <div className="landing-container landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="RailSwap AI home">
            <RailMark />
            <span className="landing-brand-copy">
              <strong>RailSwap AI</strong>
              <small>Intelligent berth exchange</small>
            </span>
          </Link>

          <nav className="landing-nav-links" aria-label="Landing page">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`landing-nav-link ${
                  activeSection === link.id ? "is-active" : ""
                }`.trim()}
                aria-current={activeSection === link.id ? "location" : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="landing-nav-actions">
            <Link to="/login" className="landing-login-link">
              Login
            </Link>
            <Link
              to="/register"
              className="landing-btn landing-btn-primary landing-btn-small"
            >
              Get Started
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            className="landing-menu-button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="landing-menu-backdrop"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />
          <div
            className="landing-mobile-menu"
            id="landing-mobile-menu"
            aria-label="Mobile navigation"
          >
            <nav>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={closeMenu}
                  className={activeSection === link.id ? "is-active" : ""}
                  aria-current={activeSection === link.id ? "location" : undefined}
                >
                  {link.label}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              ))}
            </nav>
            <div className="landing-mobile-actions">
              <Link to="/login" className="landing-btn landing-btn-secondary" onClick={closeMenu}>
                Login
              </Link>
              <Link to="/register" className="landing-btn landing-btn-primary" onClick={closeMenu}>
                Get Started
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p>Consent-first railway berth exchange · Synthetic demonstration</p>
          </div>
        </>
      )}

      <main>
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow landing-reveal">
                <TrainTrack size={15} aria-hidden="true" />
                Intelligent railway berth exchange
              </span>
              <h1 id="landing-hero-title" className="landing-reveal">
                <span>Your Journey.</span>
                <span>Your Comfort.</span>
                <span className="is-accent">Your Choice.</span>
              </h1>
              <p className="landing-hero-lede landing-reveal">
                Discover compatible berth exchanges through intelligent
                preference matching. Find passengers with reciprocal preferences
                and coordinate exchanges with confidence.
              </p>
              <div className="landing-hero-actions landing-reveal">
                <Link to="/login" className="landing-btn landing-btn-primary">
                  Find My Match
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className="landing-btn landing-btn-secondary"
                >
                  Explore How It Works
                  <ArrowDown size={17} aria-hidden="true" />
                </a>
              </div>
              <div className="landing-trust landing-reveal">
                <span>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Preference-aware matching
                </span>
                <span className="landing-trust-divider" aria-hidden="true">
                  ·
                </span>
                <span>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Transparent recommendations
                </span>
                <span className="landing-trust-divider" aria-hidden="true">
                  ·
                </span>
                <span>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Passenger consent
                </span>
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section
          id="how-it-works"
          className="landing-how-section"
          aria-labelledby="landing-how-heading"
        >
          <div className="landing-container">
            <SectionHeading
              kicker="How it works"
              id="landing-how-heading"
              title={
                <>
                  Better matches.
                  <span>More comfortable journeys.</span>
                </>
              }
              copy="An easier way to discover mutually compatible berth exchanges."
            />

            <div className="landing-steps">
              {STEPS.map(({ title, copy, icon: Icon }, index) => (
                <article
                  key={title}
                  className="landing-step landing-reveal"
                  style={{ "--reveal-delay": `${index * 90}ms` }}
                >
                  <div className="landing-step-marker">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <Icon size={17} aria-hidden="true" />
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <MatchDemo />

        <section
          id="features"
          className="landing-features-section"
          aria-labelledby="landing-features-heading"
        >
          <div className="landing-container">
            <div className="landing-features-heading landing-reveal">
              <div>
                <span className="landing-kicker">Built for better journeys</span>
                <h2 id="landing-features-heading">
                  Every detail works toward
                  <span>a more comfortable exchange.</span>
                </h2>
              </div>
              <p>
                Clear recommendations, mutual approval, and a thoughtful
                workspace keep the focus where it belongs: the passenger.
              </p>
            </div>

            <div className="landing-feature-grid">
              {FEATURES.map(({ title, copy, icon: Icon }, index) => (
                <article
                  key={title}
                  className="landing-feature-card landing-reveal"
                  style={{ "--reveal-delay": `${(index % 3) * 80}ms` }}
                >
                  <div className="landing-feature-top">
                    <span className="landing-feature-icon">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="landing-feature-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="about"
          className="landing-about-section"
          aria-labelledby="landing-about-heading"
        >
          <div className="landing-about-orbit" aria-hidden="true" />
          <div className="landing-container landing-about-grid">
            <div className="landing-about-copy landing-reveal">
              <span className="landing-kicker is-light">About RailSwap AI</span>
              <h2 id="landing-about-heading">
                Designed around the way people travel.
              </h2>
              <p>
                RailSwap AI brings preference-aware matching, transparent
                recommendations, and a structured exchange workflow into one
                thoughtful experience.
              </p>
              <div className="landing-about-note">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>
                  Consent-first by design. Application approval is not official
                  railway authorization.
                </span>
              </div>
            </div>

            <div className="landing-about-visual landing-reveal" aria-hidden="true">
              <div className="landing-about-visual-head">
                <span>Exchange journey</span>
                <span>Synthetic preview</span>
              </div>
              <svg viewBox="0 0 460 330" fill="none">
                <path
                  d="M54 270C122 270 126 182 212 184C298 186 300 92 396 78"
                  stroke="rgba(255,255,255,.15)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="6 9"
                />
                <path
                  className="landing-about-route"
                  d="M54 270C122 270 126 182 212 184C298 186 300 92 396 78"
                  stroke="#55D6D0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="54" cy="270" r="6" fill="#101C2C" stroke="#55D6D0" strokeWidth="2" />
                <circle cx="212" cy="184" r="6" fill="#101C2C" stroke="#55D6D0" strokeWidth="2" />
                <circle cx="396" cy="78" r="6" fill="#101C2C" stroke="#55D6D0" strokeWidth="2" />
              </svg>
              <div className="landing-about-node landing-about-node-1">
                <small>01</small>
                <strong>Preferences</strong>
              </div>
              <div className="landing-about-node landing-about-node-2">
                <small>02</small>
                <strong>Reciprocal candidates</strong>
              </div>
              <div className="landing-about-node landing-about-node-3">
                <small>03</small>
                <strong>Mutual consent</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta-section" aria-labelledby="landing-cta-heading">
          <div className="landing-container">
            <div className="landing-cta-panel landing-reveal">
              <svg
                className="landing-cta-route"
                viewBox="0 0 900 360"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M-80 300C110 300 126 176 300 184C474 192 506 74 720 60C820 54 876 38 980 8"
                  stroke="rgba(255,255,255,.13)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="7 10"
                />
                <circle cx="300" cy="184" r="5" fill="#55D6D0" opacity=".82" />
                <circle cx="720" cy="60" r="4" fill="#55D6D0" opacity=".6" />
              </svg>
              <span className="landing-kicker is-light">Start a better journey</span>
              <h2 id="landing-cta-heading">
                Make room for a
                <br />
                better journey.
              </h2>
              <p>
                Discover how intelligent berth matching can make passenger
                preferences easier to coordinate.
              </p>
              <Link
                to="/register"
                className="landing-btn landing-btn-ivory landing-btn-large"
              >
                Explore RailSwap AI
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <span className="landing-cta-note">
                Independent prototype · Synthetic demonstration data
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <Link to="/" className="landing-brand" aria-label="RailSwap AI home">
                <RailMark compact />
                <span className="landing-brand-copy">
                  <strong>RailSwap AI</strong>
                  <small>Intelligent berth exchange</small>
                </span>
              </Link>
              <p>
                A consent-first, preference-aware railway berth exchange
                experience built as an independent academic prototype.
              </p>
              <span className="landing-footer-badge">
                <span aria-hidden="true" />
                Independent prototype
              </span>
            </div>

            <nav className="landing-footer-column" aria-label="Product">
              <h3>Product</h3>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#ai-matching">AI Matching</a>
              <a href="#about">About</a>
            </nav>

            <nav className="landing-footer-column" aria-label="Workspace">
              <h3>Workspace</h3>
              <Link to="/login">Login</Link>
              <Link to="/register">Create account</Link>
              <Link to="/profile">Privacy &amp; data</Link>
            </nav>

            <div className="landing-footer-column landing-footer-note">
              <h3>Good to know</h3>
              <p>
                No railway reservation system is contacted. Passenger names and
                journeys shown here are illustrative.
              </p>
              <span>Not affiliated with Indian Railways.</span>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <p>© {year} RailSwap AI. All rights reserved.</p>
            <p>Consent-first design · Synthetic data only</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
