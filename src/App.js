import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SECTIONS = ["concepts", "schemas", "scd", "watsonx", "sql"];

const SECTION_META = {
  concepts: { label: "Core Concepts", icon: "◈", color: "#00ffc6" },
  schemas:  { label: "Schema Design", icon: "✦", color: "#818cf8" },
  scd:      { label: "SCD Types",     icon: "⟳", color: "#f472b6" },
  watsonx:  { label: "Watsonx.data",  icon: "◉", color: "#38bdf8" },
  sql:      { label: "SQL Lab",       icon: "⌘", color: "#fb923c" },
};

const SCD_DATA = {
  type0: { title: "Type 0 — Retain Original", color: "#94a3b8", desc: "Static. No updates ever allowed. Values are locked at creation." },
  type1: { title: "Type 1 — Overwrite",        color: "#f472b6", desc: "Simply overwrite old value. No history is kept." },
  type2: { title: "Type 2 — Add New Row",      color: "#00ffc6", desc: "Insert a new versioned row. Full history preserved via effective dates." },
  type3: { title: "Type 3 — Add Column",       color: "#818cf8", desc: "Store previous value in a new column. Limited to one prior version." },
  type4: { title: "Type 4 — History Table",    color: "#fb923c", desc: "Maintain a separate history table. Current values remain fast to query." },
};

const SQL_QUERIES = {
  basic: {
    label: "GROUP BY",
    code: `SELECT 
    autoclassname,
    SUM(salesamount) AS total_sales,
    COUNT(*) AS num_sales
FROM DNsales
WHERE salestype = 'New'
GROUP BY autoclassname
ORDER BY total_sales DESC;`,
    results: [
      { autoclassname: "Compact",   total_sales: "$2,483,783", num_sales: 842 },
      { autoclassname: "Full-size", total_sales: "$2,269,450", num_sales: 631 },
      { autoclassname: "Midsize",   total_sales: "$1,906,575", num_sales: 718 },
      { autoclassname: "Subcompact",total_sales: "$1,265,765", num_sales: 503 },
    ]
  },
  cube: {
    label: "CUBE",
    code: `SELECT 
    salespersonname,
    autoclassname,
    SUM(salesamount) AS total_sales
FROM DNsales
WHERE salestype = 'New'
GROUP BY CUBE(salespersonname, autoclassname);`,
    results: [
      { salespersonname: "Adams",  autoclassname: "Compact",    total_sales: "$412,880" },
      { salespersonname: "Adams",  autoclassname: "NULL",        total_sales: "$1,204,330" },
      { salespersonname: "NULL",   autoclassname: "Compact",     total_sales: "$2,483,783" },
      { salespersonname: "NULL",   autoclassname: "NULL",        total_sales: "$7,925,574" },
    ]
  },
  rollup: {
    label: "ROLLUP",
    code: `SELECT 
    YEAR(saledate)  AS sale_year,
    MONTH(saledate) AS sale_month,
    SUM(salesamount) AS total_sales
FROM DNsales
GROUP BY ROLLUP(
    YEAR(saledate), 
    MONTH(saledate)
);`,
    results: [
      { sale_year: 2024, sale_month: 1,    total_sales: "$643,210" },
      { sale_year: 2024, sale_month: 2,    total_sales: "$581,940" },
      { sale_year: 2024, sale_month: "—",  total_sales: "$3,921,450" },
      { sale_year: "—",  sale_month: "—",  total_sales: "$7,925,574" },
    ]
  },
  sets: {
    label: "GROUPING SETS",
    code: `SELECT 
    salespersonname,
    autoclassname,
    SUM(salesamount) AS total_sales
FROM DNsales
WHERE salestype = 'New'
GROUP BY GROUPING SETS (
    (salespersonname),
    (autoclassname)
);`,
    results: [
      { salespersonname: "Adams",   autoclassname: "NULL", total_sales: "$1,204,330" },
      { salespersonname: "Baker",   autoclassname: "NULL", total_sales: "$980,220" },
      { salespersonname: "NULL",    autoclassname: "Compact",   total_sales: "$2,483,783" },
      { salespersonname: "NULL",    autoclassname: "Full-size", total_sales: "$2,269,450" },
    ]
  }
};

// ─── STYLES ───────────────────────────────────────────────────────────────────

const injectStyles = () => {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Cormorant+Garamond:wght@600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #030712;
      --surface:  #0d1117;
      --panel:    #111827;
      --border:   rgba(255,255,255,0.07);
      --text:     #e2e8f0;
      --muted:    #64748b;
      --teal:     #00ffc6;
      --violet:   #818cf8;
      --pink:     #f472b6;
      --sky:      #38bdf8;
      --amber:    #fb923c;
      --font-ui:  'Outfit', sans-serif;
      --font-mono:'JetBrains Mono', monospace;
      --font-disp:'Cormorant Garamond', serif;
    }

    body {
      font-family: var(--font-ui);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    /* Grid background */
    .grid-bg {
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    /* Glass card */
    .glass {
      background: rgba(13,17,23,0.85);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    /* Glow */
    .glow-teal  { box-shadow: 0 0 20px rgba(0,255,198,0.15); }
    .glow-violet{ box-shadow: 0 0 20px rgba(129,140,248,0.15); }
    .glow-pink  { box-shadow: 0 0 20px rgba(244,114,182,0.15); }
    .glow-sky   { box-shadow: 0 0 20px rgba(56,189,248,0.15); }
    .glow-amber { box-shadow: 0 0 20px rgba(251,146,60,0.15); }

    /* Animated gradient border */
    .grad-border {
      position: relative;
    }
    .grad-border::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 13px;
      background: linear-gradient(135deg, var(--teal), var(--violet), var(--pink));
      z-index: -1;
      opacity: 0.4;
    }

    /* Pulse dot */
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%;
      display: inline-block;
      animation: pulse-anim 2s ease infinite;
    }
    @keyframes pulse-anim {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.4; transform: scale(0.7); }
    }

    /* Fade in up */
    .fade-up {
      animation: fadeUp 0.4s ease both;
    }
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* Typing cursor */
    .cursor::after {
      content: '▋';
      animation: blink 1s step-end infinite;
      color: var(--teal);
      margin-left: 2px;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

    /* Node connector line for schemas */
    .connector {
      stroke: rgba(129,140,248,0.4);
      stroke-width: 1.5;
      stroke-dasharray: 4 3;
      animation: dash 12s linear infinite;
    }
    @keyframes dash { to { stroke-dashoffset: -100; } }

    /* SCD row flash */
    @keyframes rowFlash {
      0%   { background: rgba(0,255,198,0.25); }
      100% { background: transparent; }
    }
    .row-flash { animation: rowFlash 1.5s ease; }

    /* Nav indicator */
    .nav-indicator {
      height: 2px;
      border-radius: 1px;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    }

    /* Monospace tag */
    .mono { font-family: var(--font-mono); }

    /* Chat bubble */
    .chat-bubble-user {
      background: rgba(129,140,248,0.15);
      border: 1px solid rgba(129,140,248,0.3);
      border-radius: 12px 12px 2px 12px;
      padding: 10px 14px;
      margin-left: auto;
      max-width: 80%;
      font-size: 13px;
    }
    .chat-bubble-ai {
      background: rgba(0,255,198,0.06);
      border: 1px solid rgba(0,255,198,0.2);
      border-radius: 12px 12px 12px 2px;
      padding: 10px 14px;
      max-width: 90%;
      font-size: 13px;
      line-height: 1.65;
    }
  `;
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
};

// ─── API HELPER ───────────────────────────────────────────────────────────────

async function streamClaude(systemPrompt, userMessage, onChunk, onDone) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
    // Simulate streaming
    let i = 0;
    const speed = Math.max(8, Math.floor(text.length / 120));
    const interval = setInterval(() => {
      if (i >= text.length) { clearInterval(interval); onDone(text); return; }
      i = Math.min(i + speed, text.length);
      onChunk(text.slice(0, i));
    }, 16);
  } catch (e) {
    onChunk("⚠ API error: " + e.message);
    onDone("");
  }
}

// ─── AI ASSISTANT PANEL ──────────────────────────────────────────────────────

function AIAssistant({ section }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottomRef = useRef(null);

  const sectionContext = {
    concepts: "You are an expert data engineering tutor explaining Data Warehouses, Data Marts, and Data Lakes. Be concise and use examples.",
    schemas:  "You are an expert explaining Star Schema vs Snowflake Schema design in data warehousing. Focus on practical tradeoffs.",
    scd:      "You are a data modeling expert explaining Slowly Changing Dimensions (SCD) Types 0–4 with real-world scenarios.",
    watsonx:  "You are an IBM Watsonx.data specialist explaining its lakehouse architecture, features, and enterprise use cases.",
    sql:      "You are a SQL expert explaining GROUP BY, CUBE, ROLLUP, and GROUPING SETS aggregation functions with examples.",
  };

  const suggestions = {
    concepts: ["Compare DW vs Data Lake", "When to use a Data Mart?", "What is schema-on-read?"],
    schemas:  ["When to use Star Schema?", "Explain denormalization tradeoffs", "Star vs Snowflake for OLAP"],
    scd:      ["What is SCD Type 2?", "Banking compliance SCD choice", "SCD Type 2 vs Type 4"],
    watsonx:  ["What is lakehouse architecture?", "Watsonx vs Snowflake", "Watsonx governance features"],
    sql:      ["CUBE vs ROLLUP difference", "When use GROUPING SETS?", "Explain NULL in ROLLUP output"],
  };

  useEffect(() => {
    setMessages([]);
    setStreaming("");
  }, [section]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    setStreaming("");

    await streamClaude(
      sectionContext[section],
      userMsg,
      (chunk) => setStreaming(chunk),
      (final) => {
        setMessages(m => [...m, { role: "ai", content: final }]);
        setStreaming("");
        setLoading(false);
      }
    );
  }, [section, loading]);

  const color = SECTION_META[section].color;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface)", borderRadius: 12,
      border: "1px solid var(--border)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.02)"
      }}>
        <span className="pulse-dot" style={{ background: color }} />
        <span style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          AI Tutor
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
          claude-sonnet-4
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px", display: "flex",
        flexDirection: "column", gap: 12, minHeight: 0
      }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>◈</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Ask anything about {SECTION_META[section].label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestions[section].map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 8, color: "var(--muted)", padding: "7px 12px",
                  fontSize: 12, cursor: "pointer", transition: "all 0.2s", textAlign: "left"
                }}
                  onMouseEnter={e => { e.target.style.borderColor = color; e.target.style.color = color; }}
                  onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.color = "var(--muted)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
            {m.role === "ai" && (
              <div style={{ fontSize: 10, color, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" }}>
                AI TUTOR
              </div>
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}

        {loading && streaming && (
          <div className="chat-bubble-ai">
            <div style={{ fontSize: 10, color, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" }}>AI TUTOR</div>
            <div className="cursor" style={{ whiteSpace: "pre-wrap" }}>{streaming}</div>
          </div>
        )}
        {loading && !streaming && (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            <span style={{ display: "inline-flex", gap: 4 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: color,
                  animation: `pulse-anim 1.2s ${i * 0.2}s ease infinite`, display: "inline-block"
                }} />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
            placeholder="Ask a question..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "8px 12px", color: "var(--text)",
              fontSize: 13, outline: "none", fontFamily: "var(--font-ui)"
            }}
          />
          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{
            background: loading ? "rgba(255,255,255,0.05)" : color,
            border: "none", borderRadius: 8, padding: "8px 14px",
            color: loading ? "var(--muted)" : "#000",
            cursor: loading ? "default" : "pointer", fontWeight: 600, fontSize: 13,
            transition: "all 0.2s"
          }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONCEPTS SECTION ─────────────────────────────────────────────────────────

function ConceptsSection() {
  const [active, setActive] = useState("warehouse");

  const concepts = {
    warehouse: {
      icon: "◈", color: "#00ffc6",
      title: "Data Warehouse",
      tagline: "The single source of truth",
      attrs: [
        ["Purpose",    "Enterprise-wide analytics & BI"],
        ["Structure",  "Schema-on-write, highly structured"],
        ["Users",      "Analysts, executives, BI teams"],
        ["Latency",    "Batch-loaded, T+1 or T+N"],
        ["Cost",       "High compute + storage"],
        ["Example",    "Snowflake, Redshift, BigQuery"],
      ],
      desc: "A centralized repository that integrates structured, cleaned data from disparate sources. Designed for complex query performance, time-variant analysis, and business intelligence workloads."
    },
    mart: {
      icon: "▣", color: "#818cf8",
      title: "Data Mart",
      tagline: "Domain-scoped speed layer",
      attrs: [
        ["Purpose",    "Department-specific analytics"],
        ["Structure",  "Subset of warehouse, aggregated"],
        ["Users",      "Sales, Finance, HR teams"],
        ["Latency",    "Near-real-time or batch"],
        ["Cost",       "Low–Medium"],
        ["Example",    "Sales Mart, Finance Mart"],
      ],
      desc: "A focused subset of the data warehouse serving a specific business domain. Provides faster query response and simpler data model for power users within a department."
    },
    lake: {
      icon: "≋", color: "#38bdf8",
      title: "Data Lake",
      tagline: "Raw, limitless, schema-free",
      attrs: [
        ["Purpose",    "ML training, exploration, raw storage"],
        ["Structure",  "Schema-on-read, any format"],
        ["Users",      "Data scientists, ML engineers"],
        ["Latency",    "Real-time ingestion possible"],
        ["Cost",       "Low storage, high compute (ad-hoc)"],
        ["Example",    "S3 + Glue, Azure ADLS, HDFS"],
      ],
      desc: "Stores raw data in its native format—structured, semi-structured, or unstructured—at massive scale. Ideal for machine learning, event streaming, and exploratory analysis."
    },
    lakehouse: {
      icon: "⬡", color: "#fb923c",
      title: "Lakehouse",
      tagline: "Best of both worlds",
      attrs: [
        ["Purpose",    "Unified analytics + ML platform"],
        ["Structure",  "Open formats (Parquet, Delta, Iceberg)"],
        ["Users",      "All data personas"],
        ["Latency",    "Streaming + batch"],
        ["Cost",       "Optimized via open storage"],
        ["Example",    "Databricks, Watsonx.data"],
      ],
      desc: "Combines data lake flexibility and scale with data warehouse ACID transactions and governance. Eliminates dual-storage architectures using open table formats."
    }
  };

  const c = concepts[active];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, height: "100%" }}>
      {/* Left nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(concepts).map(([key, v]) => (
          <button key={key} onClick={() => setActive(key)} style={{
            background: active === key ? `rgba(${hexToRgb(v.color)},0.1)` : "rgba(255,255,255,0.02)",
            border: `1px solid ${active === key ? v.color : "rgba(255,255,255,0.06)"}`,
            borderRadius: 10, padding: "14px 16px", cursor: "pointer",
            textAlign: "left", transition: "all 0.25s",
            color: active === key ? v.color : "var(--muted)"
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{v.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{v.title}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{v.tagline}</div>
          </button>
        ))}
      </div>

      {/* Right panel */}
      <div key={active} className="fade-up glass" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 24,
            background: `rgba(${hexToRgb(c.color)},0.12)`,
            border: `1px solid rgba(${hexToRgb(c.color)},0.3)`, color: c.color
          }}>
            {c.icon}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-disp)", color: c.color }}>
              {c.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{c.tagline}</div>
          </div>
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#94a3b8", marginBottom: 24 }}>{c.desc}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {c.attrs.map(([label, val]) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.02)", borderRadius: 8,
              border: "1px solid var(--border)", padding: "10px 14px"
            }}>
              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Comparison chips */}
        <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["OLAP", "#00ffc6"], ["Structured", "#818cf8"], ["Time-variant", "#f472b6"]].map(([t, col]) => (
            <span key={t} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 12,
              background: `rgba(${hexToRgb(col)},0.1)`,
              border: `1px solid rgba(${hexToRgb(col)},0.3)`, color: col, fontWeight: 600
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCHEMAS SECTION ──────────────────────────────────────────────────────────

function SchemasSection() {
  const [schema, setSchema] = useState("star");
  const [highlight, setHighlight] = useState(null);

  const starNodes = [
    { id: "fact",   x: 240, y: 180, w: 180, h: 80, label: "FACT_SALES", fields: ["sale_id PK","date_id FK","product_id FK","customer_id FK","amount","qty"], color: "#38bdf8", type: "fact" },
    { id: "date",   x: 60,  y: 30,  w: 140, h: 50, label: "DIM_DATE",     fields: ["date_id PK","year","month","quarter"], color: "#00ffc6", type: "dim" },
    { id: "product",x: 360, y: 20,  w: 140, h: 50, label: "DIM_PRODUCT",  fields: ["product_id PK","name","category","price"], color: "#00ffc6", type: "dim" },
    { id: "customer",x:420, y: 310, w: 150, h: 50, label: "DIM_CUSTOMER", fields: ["customer_id PK","name","city","region"], color: "#00ffc6", type: "dim" },
    { id: "store",  x: 20,  y: 280, w: 140, h: 50, label: "DIM_STORE",   fields: ["store_id FK","name","region"], color: "#00ffc6", type: "dim" },
  ];

  const snowNodes = [
    { id: "fact",    x: 230, y: 175, w: 180, h: 80, label: "FACT_SALES",   fields: ["sale_id PK","date_id FK","product_id FK","customer_id FK","amount"], color: "#38bdf8", type: "fact" },
    { id: "product", x: 360, y: 40,  w: 140, h: 50, label: "DIM_PRODUCT",  fields: ["product_id PK","name","category_id FK"], color: "#818cf8", type: "dim" },
    { id: "category",x: 520, y: 10,  w: 130, h: 40, label: "DIM_CATEGORY", fields: ["category_id PK","category_name"], color: "#f472b6", type: "sub" },
    { id: "customer",x: 390, y: 310, w: 140, h: 50, label: "DIM_CUSTOMER", fields: ["customer_id PK","name","city_id FK"], color: "#818cf8", type: "dim" },
    { id: "city",    x: 540, y: 310, w: 120, h: 40, label: "DIM_CITY",     fields: ["city_id PK","city_name","country"], color: "#f472b6", type: "sub" },
    { id: "date",    x: 40,  y: 40,  w: 140, h: 50, label: "DIM_DATE",     fields: ["date_id PK","year","month"], color: "#818cf8", type: "dim" },
  ];

  const starEdges = [
    ["fact","date"], ["fact","product"], ["fact","customer"], ["fact","store"]
  ];
  const snowEdges = [
    ["fact","product"], ["fact","customer"], ["fact","date"],
    ["product","category"], ["customer","city"]
  ];

  const nodes = schema === "star" ? starNodes : snowNodes;
  const edges = schema === "star" ? starEdges : snowEdges;

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  function getCenter(n) {
    return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 10 }}>
        {[["star", "⭐  Star Schema", "#818cf8"], ["snowflake", "❄  Snowflake Schema", "#38bdf8"]].map(([s, l, c]) => (
          <button key={s} onClick={() => setSchema(s)} style={{
            padding: "10px 22px", borderRadius: 8, cursor: "pointer",
            background: schema === s ? `rgba(${hexToRgb(c)},0.15)` : "rgba(255,255,255,0.03)",
            border: `1px solid ${schema === s ? c : "rgba(255,255,255,0.08)"}`,
            color: schema === s ? c : "var(--muted)", fontWeight: 600, fontSize: 14,
            transition: "all 0.2s"
          }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* SVG Diagram */}
        <div key={schema} className="fade-up glass" style={{ padding: 20, overflow: "visible" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Interactive Diagram — hover nodes to inspect
          </div>
          <svg viewBox="0 0 680 420" style={{ width: "100%", height: "auto" }}>
            {/* Edges */}
            {edges.map(([a, b], i) => {
              const ca = getCenter(nodeMap[a]);
              const cb = getCenter(nodeMap[b]);
              const isHl = highlight === a || highlight === b;
              return (
                <line key={i} x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y}
                  className="connector"
                  stroke={isHl ? "#00ffc6" : "rgba(129,140,248,0.35)"}
                  strokeWidth={isHl ? 2 : 1.5}
                  strokeDasharray="5 3"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(n => {
              const isHl = highlight === n.id;
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHighlight(n.id)}
                  onMouseLeave={() => setHighlight(null)}
                  style={{ cursor: "pointer" }}>
                  <rect width={n.w} height={n.h} rx={8}
                    fill={isHl ? `rgba(${hexToRgb(n.color)},0.18)` : `rgba(${hexToRgb(n.color)},0.08)`}
                    stroke={isHl ? n.color : `rgba(${hexToRgb(n.color)},0.4)`}
                    strokeWidth={isHl ? 2 : 1}
                  />
                  {n.type === "fact" && (
                    <rect x={2} y={2} width={n.w - 4} height={24} rx={6}
                      fill={`rgba(${hexToRgb(n.color)},0.15)`} />
                  )}
                  <text x={n.w / 2} y={n.type === "fact" ? 17 : 18}
                    textAnchor="middle" fill={n.color}
                    fontSize={n.type === "fact" ? 11 : 10}
                    fontWeight={700} fontFamily="JetBrains Mono, monospace">
                    {n.label}
                  </text>
                  {n.type === "fact" && n.fields.slice(0,4).map((f, fi) => (
                    <text key={fi} x={10} y={38 + fi * 11}
                      fill={isHl ? "#e2e8f0" : "#64748b"}
                      fontSize={9} fontFamily="JetBrains Mono, monospace">
                      {f}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Hover detail */}
          {highlight && nodeMap[highlight] && (
            <div className="fade-up" style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 8,
              border: "1px solid var(--border)", padding: "10px 14px", marginTop: 10
            }}>
              <div style={{ fontSize: 11, color: nodeMap[highlight].color, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
                {nodeMap[highlight].label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {nodeMap[highlight].fields.map(f => (
                  <code key={f} style={{
                    fontSize: 11, padding: "2px 7px", borderRadius: 4,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#94a3b8"
                  }}>
                    {f}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comparison */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Read Speed",  star: "🟢 Fast", snow: "🟡 Slower", note: "Star wins — fewer JOINs" },
            { label: "Write Speed", star: "🟡 Slower", snow: "🟢 Faster", note: "Snowflake wins — normalized" },
            { label: "Storage",     star: "🟡 More", snow: "🟢 Less", note: "Snowflake is more efficient" },
            { label: "Complexity",  star: "🟢 Low", snow: "🟡 Higher", note: "Star is simpler to query" },
            { label: "Ideal for",   star: "OLAP / BI", snow: "OLTP / DW", note: "" },
          ].map(row => (
            <div key={row.label} className="glass" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {row.label}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#818cf8" }}>Star: {row.star}</span>
                <span style={{ fontSize: 12, color: "#38bdf8" }}>Snow: {row.snow}</span>
              </div>
              {row.note && <div style={{ fontSize: 11, color: "var(--muted)" }}>→ {row.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCD SECTION ──────────────────────────────────────────────────────────────

function SCDSection() {
  const [type, setType] = useState("type2");
  const [rows, setRows] = useState([
    { id: "C001", name: "Jane Doe", address: "123 Old St", start: "2021-01-01", end: "—", current: true, flash: false }
  ]);
  const [simRan, setSimRan] = useState(false);

  const simulate = () => {
    if (type === "type1") {
      setRows([{ id: "C001", name: "Jane Doe", address: "456 New Ave", start: "—", end: "—", current: true, flash: true }]);
      setTimeout(() => setRows(r => r.map(x => ({ ...x, flash: false }))), 1500);
    } else if (type === "type2") {
      setRows([
        { id: "C001", name: "Jane Doe", address: "123 Old St", start: "2021-01-01", end: "2024-12-31", current: false, flash: false },
        { id: "C001-v2", name: "Jane Doe", address: "456 New Ave", start: "2025-01-01", end: "—", current: true, flash: true }
      ]);
      setTimeout(() => setRows(r => r.map(x => ({ ...x, flash: false }))), 1500);
    } else if (type === "type3") {
      setRows([{ id: "C001", name: "Jane Doe", address: "456 New Ave", prev: "123 Old St", flash: true }]);
      setTimeout(() => setRows(r => r.map(x => ({ ...x, flash: false }))), 1500);
    } else {
      setRows([{ id: "C001", name: "Jane Doe", address: "123 Old St", start: "—", end: "—", current: true, flash: false }]);
    }
    setSimRan(true);
  };

  const reset = () => {
    setRows([{ id: "C001", name: "Jane Doe", address: "123 Old St", start: "2021-01-01", end: "—", current: true, flash: false }]);
    setSimRan(false);
  };

  useEffect(() => { reset(); }, [type]);

  const t = SCD_DATA[type];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Type selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(SCD_DATA).map(([key, v]) => (
          <button key={key} onClick={() => setType(key)} style={{
            padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: type === key ? `rgba(${hexToRgb(v.color)},0.15)` : "rgba(255,255,255,0.02)",
            border: `1px solid ${type === key ? v.color : "rgba(255,255,255,0.06)"}`,
            color: type === key ? v.color : "var(--muted)", transition: "all 0.2s"
          }}>
            {v.title.split("—")[0]}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Info panel */}
        <div key={type} className="fade-up glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-disp)", color: t.color, marginBottom: 8 }}>
            {t.title}
          </div>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: 20 }}>{t.desc}</p>

          {/* Simulation */}
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{
              padding: "8px 14px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Live Simulation
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={simulate} style={{
                  fontSize: 11, padding: "4px 12px", borderRadius: 6,
                  background: `rgba(${hexToRgb(t.color)},0.15)`,
                  border: `1px solid ${t.color}`, color: t.color, cursor: "pointer", fontWeight: 600
                }}>
                  ▶ Apply Change
                </button>
                <button onClick={reset} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)", cursor: "pointer"
                }}>
                  ↺
                </button>
              </div>
            </div>

            {/* Change description */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "rgba(251,146,60,0.05)" }}>
              <span style={{ fontSize: 12, color: "#fb923c" }}>
                Incoming change: <strong>Jane Doe moved from 123 Old St → 456 New Ave</strong>
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                    {["CustomerID", "Name",
                      ...(type === "type3" ? ["Current Addr", "Prev Addr"] : ["Address"]),
                      ...(type === "type2" ? ["Start", "End", "Current"] : [])
                    ].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: 10, letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} style={{
                      borderTop: "1px solid var(--border)",
                      animation: row.flash ? "rowFlash 1.5s ease" : "none"
                    }}>
                      <td style={{ padding: "7px 10px", color: t.color }}>{row.id}</td>
                      <td style={{ padding: "7px 10px", color: "var(--text)" }}>{row.name}</td>
                      {type === "type3" ? (
                        <>
                          <td style={{ padding: "7px 10px", color: "#00ffc6" }}>{row.address}</td>
                          <td style={{ padding: "7px 10px", color: "#64748b" }}>{row.prev || "—"}</td>
                        </>
                      ) : (
                        <td style={{ padding: "7px 10px", color: "var(--text)" }}>{row.address}</td>
                      )}
                      {type === "type2" && (
                        <>
                          <td style={{ padding: "7px 10px", color: "#64748b" }}>{row.start}</td>
                          <td style={{ padding: "7px 10px", color: "#64748b" }}>{row.end}</td>
                          <td style={{ padding: "7px 10px" }}>
                            <span style={{
                              fontSize: 10, padding: "2px 8px", borderRadius: 10,
                              background: row.current ? "rgba(0,255,198,0.15)" : "rgba(100,116,139,0.15)",
                              border: `1px solid ${row.current ? "#00ffc6" : "#475569"}`,
                              color: row.current ? "#00ffc6" : "#475569"
                            }}>
                              {row.current ? "Y" : "N"}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
            SCD Type Comparison
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(SCD_DATA).map(([key, v]) => (
              <div key={key} onClick={() => setType(key)} style={{
                padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${type === key ? v.color : "rgba(255,255,255,0.06)"}`,
                background: type === key ? `rgba(${hexToRgb(v.color)},0.07)` : "rgba(255,255,255,0.01)",
                transition: "all 0.2s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: v.color }}>{v.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{v.desc.split(". ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WATSONX SECTION ──────────────────────────────────────────────────────────

function WatsonxSection() {
  const features = [
    { icon: "⬡", title: "Lakehouse Architecture", desc: "Unifies lake flexibility with warehouse governance. Open formats: Parquet, Delta, Iceberg.", color: "#38bdf8" },
    { icon: "⚡", title: "Presto + Spark Engines", desc: "Multiple query engines run on the same data. No duplication, no movement.", color: "#00ffc6" },
    { icon: "🛡", title: "Data Governance", desc: "Row-level access, column masking, unified metadata catalog across all assets.", color: "#818cf8" },
    { icon: "☁", title: "Multi-cloud", desc: "Deploy on AWS, Azure, GCP, or IBM Cloud. Seamless portability via open standards.", color: "#f472b6" },
    { icon: "🤖", title: "AI Ready", desc: "Native integration with watsonx.ai for model training directly on lakehouse data.", color: "#fb923c" },
    { icon: "💰", title: "Cost Optimizer", desc: "Route queries to the cheapest engine automatically. 50–70% cost reduction vs cloud DW.", color: "#a78bfa" },
  ];

  const arch = [
    { label: "Data Sources", items: ["S3 / ADLS / GCS", "On-prem DBs", "Streaming (Kafka)"], color: "#fb923c" },
    { label: "Storage Layer", items: ["Parquet / ORC", "Delta Lake", "Apache Iceberg"], color: "#00ffc6" },
    { label: "Query Engines", items: ["Presto", "Apache Spark", "Db2 Warehouse"], color: "#818cf8" },
    { label: "Governance", items: ["IBM Knowledge Catalog", "Access Control", "Lineage"], color: "#38bdf8" },
    { label: "Consumers", items: ["BI Tools", "ML Pipelines", "APIs"], color: "#f472b6" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Architecture flow */}
      <div className="glass" style={{ padding: 24 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
          Watsonx.data Architecture
        </div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto", alignItems: "stretch" }}>
          {arch.map((layer, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 120 }}>
              <div style={{
                flex: 1, border: `1px solid rgba(${hexToRgb(layer.color)},0.3)`,
                borderRadius: 10, padding: "14px 12px",
                background: `rgba(${hexToRgb(layer.color)},0.06)`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: layer.color, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {layer.label}
                </div>
                {layer.items.map(item => (
                  <div key={item} style={{
                    fontSize: 11, padding: "3px 8px", marginBottom: 4, borderRadius: 5,
                    background: "rgba(255,255,255,0.03)", color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    {item}
                  </div>
                ))}
              </div>
              {i < arch.length - 1 && (
                <div style={{ color: "var(--muted)", fontSize: 16, padding: "0 6px", flexShrink: 0 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {features.map((f, i) => (
          <div key={i} className="glass" style={{
            padding: "20px", transition: "transform 0.2s, box-shadow 0.2s",
            cursor: "default"
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 30px rgba(${hexToRgb(f.color)},0.12)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 22, color: f.color, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SQL SECTION ──────────────────────────────────────────────────────────────

function SQLSection() {
  const [active, setActive] = useState("basic");
  const [aiQuery, setAIQuery] = useState("");
  const [aiResult, setAIResult] = useState("");
  const [aiLoading, setAILoading] = useState(false);
  const [aiStreaming, setAIStreaming] = useState("");

  const q = SQL_QUERIES[active];

  const runAI = async () => {
    if (!aiQuery.trim() || aiLoading) return;
    setAILoading(true);
    setAIResult("");
    setAIStreaming("");
    const sys = `You are a SQL expert. When asked to write or explain SQL aggregation queries (GROUP BY, CUBE, ROLLUP, GROUPING SETS), provide clear SQL code with brief explanations. Keep responses concise and technical. Use code blocks with SQL syntax.`;
    await streamClaude(sys, aiQuery,
      c => setAIStreaming(c),
      f => { setAIResult(f); setAIStreaming(""); setAILoading(false); }
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Tab selector */}
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(SQL_QUERIES).map(([key, v]) => (
          <button key={key} onClick={() => setActive(key)} style={{
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: active === key ? "rgba(251,146,60,0.15)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${active === key ? "#fb923c" : "rgba(255,255,255,0.06)"}`,
            color: active === key ? "#fb923c" : "var(--muted)", transition: "all 0.2s",
            fontFamily: "var(--font-mono)"
          }}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Query panel */}
        <div key={active} className="fade-up glass" style={{ overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.02)"
          }}>
            <span className="pulse-dot" style={{ background: "#fb923c" }} />
            <span style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              {active}.sql
            </span>
          </div>
          <pre style={{
            padding: "20px", fontSize: 13, fontFamily: "var(--font-mono)",
            lineHeight: 1.7, color: "#e2e8f0", overflowX: "auto",
            background: "transparent"
          }}>
            {highlightSQL(q.code)}
          </pre>
        </div>

        {/* Results panel */}
        <div className="glass" style={{ overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.02)"
          }}>
            <span className="pulse-dot" style={{ background: "#00ffc6" }} />
            <span style={{ fontSize: 11, color: "#00ffc6", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Results ({q.results.length} rows)
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {Object.keys(q.results[0]).map(k => (
                    <th key={k} style={{
                      padding: "8px 14px", textAlign: "left", color: "var(--muted)",
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
                      borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)"
                    }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.results.map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    animation: `fadeUp 0.3s ${i * 0.06}s both`
                  }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{
                        padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 12,
                        color: val === "NULL" || val === "—" ? "#475569" :
                               String(val).startsWith("$") ? "#00ffc6" : "#e2e8f0"
                      }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key insight */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "rgba(251,146,60,0.04)" }}>
            <div style={{ fontSize: 11, color: "#fb923c" }}>
              {active === "basic" && "→ Simple aggregation. One grouping dimension."}
              {active === "cube" && "→ NULL rows = subtotals. All permutations included."}
              {active === "rollup" && "→ Hierarchy: Month → Year → Grand Total."}
              {active === "sets" && "→ Custom groupings only. No grand total row."}
            </div>
          </div>
        </div>
      </div>

      {/* AI SQL Generator */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fb923c", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pulse-dot" style={{ background: "#fb923c" }} />
          AI SQL Generator — describe a query and Claude writes it
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            value={aiQuery}
            onChange={e => setAIQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runAI()}
            placeholder='e.g. "Total sales by region and year with subtotals using ROLLUP"'
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 13,
              outline: "none", fontFamily: "var(--font-ui)"
            }}
          />
          <button onClick={runAI} disabled={aiLoading} style={{
            padding: "10px 20px", borderRadius: 8, cursor: aiLoading ? "default" : "pointer",
            background: aiLoading ? "rgba(255,255,255,0.04)" : "rgba(251,146,60,0.2)",
            border: "1px solid #fb923c", color: aiLoading ? "var(--muted)" : "#fb923c",
            fontWeight: 700, fontSize: 14, transition: "all 0.2s"
          }}>
            {aiLoading ? "..." : "⌘ Generate"}
          </button>
        </div>

        {(aiResult || aiStreaming) && (
          <div className={`fade-up${aiLoading ? " cursor" : ""}`} style={{
            background: "rgba(13,17,23,0.8)", borderRadius: 8,
            border: "1px solid rgba(251,146,60,0.2)", padding: "16px",
            fontFamily: "var(--font-mono)", fontSize: 12, color: "#e2e8f0",
            lineHeight: 1.7, whiteSpace: "pre-wrap"
          }}>
            {aiResult || aiStreaming}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "255,255,255";
}

function highlightSQL(code) {
  const keywords = ["SELECT","FROM","WHERE","GROUP","BY","ORDER","SUM","COUNT","CUBE","ROLLUP","GROUPING","SETS","AS","AND","OR","DESC","ASC","YEAR","MONTH","NULL"];
  const lines = code.split("\n");
  return lines.map((line, li) => {
    let styled = line;
    // Replace comments
    if (line.trimStart().startsWith("--")) {
      return <div key={li} style={{ color: "#475569" }}>{line}</div>;
    }
    // Tokenize
    const parts = [];
    let remaining = line;
    const regex = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");
    let last = 0, m;
    regex.lastIndex = 0;
    const src = line;
    while ((m = regex.exec(src)) !== null) {
      if (m.index > last) parts.push(<span key={last} style={{ color: "#e2e8f0" }}>{src.slice(last, m.index)}</span>);
      parts.push(<span key={m.index} style={{ color: "#818cf8", fontWeight: 700 }}>{m[0]}</span>);
      last = m.index + m[0].length;
    }
    if (last < src.length) parts.push(<span key={last} style={{ color: "#e2e8f0" }}>{src.slice(last)}</span>);
    return <div key={li}>{parts.length > 0 ? parts : line}</div>;
  });
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [section, setSection] = useState("concepts");

  useEffect(() => { injectStyles(); }, []);

  const renderSection = () => {
    switch (section) {
      case "concepts": return <ConceptsSection />;
      case "schemas":  return <SchemasSection />;
      case "scd":      return <SCDSection />;
      case "watsonx":  return <WatsonxSection />;
      case "sql":      return <SQLSection />;
    }
  };

  return (
    <div className="grid-bg" style={{ minHeight: "100vh", padding: "0", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <div style={{
        background: "rgba(13,17,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 32px", position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(20px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32, maxWidth: 1400, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ padding: "14px 0", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
              <span style={{ color: "#00ffc6" }}>DW</span>
              <span style={{ color: "#818cf8" }}>://</span>
              <span style={{ color: "#e2e8f0" }}>master</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Data Warehousing Intelligence
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center" }}>
            {SECTIONS.map(s => {
              const m = SECTION_META[s];
              const isActive = section === s;
              return (
                <button key={s} onClick={() => setSection(s)} style={{
                  padding: "18px 20px", background: "transparent",
                  border: "none", cursor: "pointer", position: "relative",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "all 0.2s"
                }}>
                  <span style={{ fontSize: 16, color: isActive ? m.color : "#475569" }}>{m.icon}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                    color: isActive ? m.color : "#475569", textTransform: "uppercase"
                  }}>
                    {m.label}
                  </span>
                  <div className="nav-indicator" style={{
                    width: isActive ? "100%" : "0%",
                    background: m.color, position: "absolute", bottom: 0, left: 0
                  }} />
                </button>
              );
            })}
          </div>

          {/* Status */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pulse-dot" style={{ background: "#00ffc6" }} />
            <span style={{ fontSize: 11, color: "#00ffc6", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              API LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 1400, margin: "0 auto", width: "100%", padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* Section title */}
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "baseline", gap: 14, paddingBottom: 4 }}>
          <h1 style={{
            fontFamily: "var(--font-disp)", fontSize: 32, fontWeight: 700,
            color: SECTION_META[section].color, lineHeight: 1
          }}>
            {SECTION_META[section].label}
          </h1>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            dw://master/{section}
          </span>
        </div>

        {/* Main content */}
        <div key={section} className="fade-up">
          {renderSection()}
        </div>

        {/* AI Assistant */}
        <div style={{ position: "sticky", top: 80, height: "calc(100vh - 110px)" }}>
          <AIAssistant section={section} />
        </div>
      </div>
    </div>
  );
}

