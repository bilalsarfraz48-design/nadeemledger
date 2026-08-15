import { useState, useEffect, useMemo } from "react";

const COLORS = {
  bg: "#F7F6F2",
  paper: "#FCFBF8",
  sidebar: "#1C2430",
  sidebarText: "#C7CDD6",
  ink: "#1F2430",
  sub: "#6B7280",
  rule: "#DEDCD3",
  accent: "#2F6F5E",
  debitRed: "#B5533C",
};

const FONT_SERIF = "'Georgia', 'Iowan Old Style', 'Times New Roman', serif";
const FONT_MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash", type: "Asset" },
  { code: "1010", name: "Bank Account", type: "Asset" },
  { code: "1200", name: "Accounts Receivable", type: "Asset" },
  { code: "1400", name: "Inventory", type: "Asset" },
  { code: "1500", name: "Fixed Assets", type: "Asset" },
  { code: "2000", name: "Accounts Payable", type: "Liability" },
  { code: "2100", name: "Taxes Payable", type: "Liability" },
  { code: "2200", name: "Loans Payable", type: "Liability" },
  { code: "3000", name: "Owner's Equity", type: "Equity" },
  { code: "3900", name: "Retained Earnings", type: "Equity" },
  { code: "4000", name: "Sales Revenue", type: "Revenue" },
  { code: "4100", name: "Service Revenue", type: "Revenue" },
  { code: "5000", name: "Cost of Goods Sold", type: "Expense" },
  { code: "5100", name: "Rent Expense", type: "Expense" },
  { code: "5200", name: "Utilities Expense", type: "Expense" },
  { code: "5300", name: "Salaries Expense", type: "Expense" },
  { code: "5400", name: "Marketing Expense", type: "Expense" },
  { code: "5900", name: "Other Expense", type: "Expense" },
];

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmt(n) {
  const v = Math.abs(n) < 0.005 ? 0 : n;
  return "Rs " + v.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function seedAccounts() {
  return DEFAULT_ACCOUNTS.map((a) => ({ id: uid("acc_"), ...a }));
}

function newBookData() {
  return { accounts: seedAccounts(), entries: [] };
}

async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function inputStyle(w) {
  return {
    width: w,
    border: `1px solid ${COLORS.rule}`,
    borderRadius: 5,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: FONT_SANS,
    background: "#fff",
  };
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [activeBookId, setActiveBookId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [authState, setAuthState] = useState("checking"); // checking | setup | login | authed
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const r = await window.storage.get("auth-credentials", false);
      setAuthState(r ? "login" : "setup");
    } catch (e) {
      setAuthState("setup");
    }
  }

  async function handleSetup(username, password) {
    if (!username.trim() || !password) {
      setAuthError("Enter a username and password");
      return;
    }
    if (password.length < 4) {
      setAuthError("Password should be at least 4 characters");
      return;
    }
    const hash = await hashPassword(password);
    await window.storage.set("auth-credentials", JSON.stringify({ username: username.trim(), hash }), false);
    setAuthError("");
    setAuthState("authed");
    init();
  }

  async function handleLogin(username, password) {
    try {
      const r = await window.storage.get("auth-credentials", false);
      const creds = JSON.parse(r.value);
      const hash = await hashPassword(password);
      if (username.trim() === creds.username && hash === creds.hash) {
        setAuthError("");
        setAuthState("authed");
        init();
      } else {
        setAuthError("Incorrect username or password");
      }
    } catch (e) {
      setAuthError("Something went wrong — try again");
    }
  }

  function handleLogout() {
    setAuthState("login");
    setData(null);
    setLoading(true);
  }

  async function saveBrandName(name) {
    setBrandName(name);
    try {
      await window.storage.set("brand-name", name, false);
    } catch (e) {}
  }

  async function init() {
    setLoading(true);
    try {
      try {
        const b = await window.storage.get("brand-name", false);
        if (b) setBrandName(b.value);
      } catch (e) {}
      let list = [];
      try {
        const r = await window.storage.get("books-list", false);
        list = r ? JSON.parse(r.value) : [];
      } catch (e) {
        list = [];
      }
      if (!list || list.length === 0) {
        const defaultBook = { id: uid("book_"), name: "General" };
        list = [defaultBook];
        await window.storage.set("books-list", JSON.stringify(list), false);
        await window.storage.set(`book-data:${defaultBook.id}`, JSON.stringify(newBookData()), false);
      }
      setBooks(list);
      const active = list[0].id;
      setActiveBookId(active);
      await loadBook(active);
    } catch (e) {
      showToast("Couldn't load your books — try reloading");
    } finally {
      setLoading(false);
    }
  }

  async function loadBook(id) {
    try {
      const r = await window.storage.get(`book-data:${id}`, false);
      const d = r ? JSON.parse(r.value) : newBookData();
      setData(d);
    } catch (e) {
      const d = newBookData();
      setData(d);
      await window.storage.set(`book-data:${id}`, JSON.stringify(d), false);
    }
  }

  async function persist(newData) {
    setData(newData);
    try {
      await window.storage.set(`book-data:${activeBookId}`, JSON.stringify(newData), false);
    } catch (e) {
      showToast("Save failed — try again");
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function switchBook(id) {
    setActiveBookId(id);
    setLoading(true);
    await loadBook(id);
    setLoading(false);
    setView("dashboard");
  }

  async function addBook() {
    const name = newBookName.trim();
    if (!name) return;
    const book = { id: uid("book_"), name };
    const list = [...books, book];
    setBooks(list);
    await window.storage.set("books-list", JSON.stringify(list), false);
    await window.storage.set(`book-data:${book.id}`, JSON.stringify(newBookData()), false);
    setNewBookName("");
    setShowBookModal(false);
    await switchBook(book.id);
    showToast(`Book "${name}" created`);
  }

  const accountsById = useMemo(() => {
    const m = {};
    (data?.accounts || []).forEach((a) => (m[a.id] = a));
    return m;
  }, [data]);

  function accountBalance(accId, uptoDate) {
    let debit = 0,
      credit = 0;
    (data?.entries || []).forEach((e) => {
      if (uptoDate && e.date > uptoDate) return;
      e.lines.forEach((l) => {
        if (l.accountId === accId) {
          debit += Number(l.debit || 0);
          credit += Number(l.credit || 0);
        }
      });
    });
    return { debit, credit, net: debit - credit };
  }

  function addEntry(entry) {
    persist({ ...data, entries: [...data.entries, entry] });
  }

  function deleteEntry(id) {
    persist({ ...data, entries: data.entries.filter((e) => e.id !== id) });
  }

  function addAccount(acc) {
    persist({ ...data, accounts: [...data.accounts, { id: uid("acc_"), ...acc }] });
  }

  function deleteAccount(id) {
    const used = data.entries.some((e) => e.lines.some((l) => l.accountId === id));
    if (used) {
      showToast("Can't remove — account is used in journal entries");
      return;
    }
    persist({ ...data, accounts: data.accounts.filter((a) => a.id !== id) });
  }

  if (authState === "checking") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: COLORS.bg, fontFamily: FONT_SANS, color: COLORS.sub }}>
        Loading…
      </div>
    );
  }

  if (authState === "setup") {
    return <AuthScreen mode="setup" error={authError} onSubmit={handleSetup} />;
  }

  if (authState === "login") {
    return <AuthScreen mode="login" error={authError} onSubmit={handleLogin} />;
  }

  if (loading || !data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: COLORS.bg,
          fontFamily: FONT_SANS,
          color: COLORS.sub,
        }}
      >
        Loading ledger…
      </div>
    );
  }

  const activeBook = books.find((b) => b.id === activeBookId);

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: FONT_SANS, color: COLORS.ink, fontSize: 14 }}>
      <Sidebar
        books={books}
        activeBookId={activeBookId}
        onSwitch={switchBook}
        view={view}
        setView={setView}
        onAddBook={() => setShowBookModal(true)}
        brandName={brandName}
        onBrandChange={saveBrandName}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 80px" }}>
          {view === "dashboard" && <Dashboard data={data} accountBalance={accountBalance} setView={setView} />}
          {view === "accounts" && <ChartOfAccounts data={data} addAccount={addAccount} deleteAccount={deleteAccount} accountBalance={accountBalance} />}
          {view === "newentry" && <NewEntry data={data} addEntry={addEntry} showToast={showToast} setView={setView} />}
          {view === "journal" && <Journal data={data} accountsById={accountsById} deleteEntry={deleteEntry} />}
          {view === "ledger" && <GeneralLedger data={data} />}
          {view === "trialbalance" && <TrialBalance data={data} accountBalance={accountBalance} />}
          {view === "reports" && <Reports data={data} accountBalance={accountBalance} />}
        </div>
      </div>
      {showBookModal && (
        <BookModal
          value={newBookName}
          onChange={setNewBookName}
          onCancel={() => {
            setShowBookModal(false);
            setNewBookName("");
          }}
          onSave={addBook}
        />
      )}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: COLORS.sidebar,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 6,
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "9px 16px",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        color: active ? "#fff" : COLORS.sidebarText,
        border: "none",
        borderLeft: active ? `3px solid ${COLORS.accent}` : "3px solid transparent",
        fontSize: 13.5,
        letterSpacing: 0.2,
        cursor: "pointer",
        fontFamily: FONT_SANS,
      }}
    >
      {label}
    </button>
  );
}

function Sidebar({ books, activeBookId, onSwitch, view, setView, onAddBook, brandName, onBrandChange, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(brandName || "");

  useEffect(() => {
    setDraft(brandName || "");
  }, [brandName]);

  function commit() {
    setEditing(false);
    onBrandChange(draft.trim());
  }

  return (
    <div style={{ width: 220, background: COLORS.sidebar, color: COLORS.sidebarText, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "22px 16px 14px" }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 19, color: "#fff", letterSpacing: 0.3 }}>Nadeemiphone</div>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            placeholder="Your name or business"
            style={{
              marginTop: 6,
              width: "100%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12,
              padding: "4px 7px",
              fontFamily: FONT_SANS,
            }}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            title="Click to set your name or business name"
            style={{ fontSize: 11.5, marginTop: 4, opacity: brandName ? 0.85 : 0.5, cursor: "pointer" }}
          >
            {brandName || "+ add your name/business"}
          </div>
        )}
      </div>
      <div style={{ padding: "0 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.55, marginBottom: 6 }}>Book</div>
        <select
          value={activeBookId || ""}
          onChange={(e) => onSwitch(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.07)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 5,
            padding: "6px 8px",
            fontSize: 12.5,
            fontFamily: FONT_SANS,
          }}
        >
          {books.map((b) => (
            <option key={b.id} value={b.id} style={{ color: "#000" }}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          onClick={onAddBook}
          style={{
            marginTop: 8,
            fontSize: 11.5,
            color: COLORS.sidebarText,
            background: "none",
            border: "1px dashed rgba(255,255,255,0.25)",
            borderRadius: 5,
            padding: "5px 8px",
            width: "100%",
            cursor: "pointer",
          }}
        >
          + New book
        </button>
      </div>
      <div style={{ padding: "14px 0", flex: 1 }}>
        <NavItem label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
        <NavItem label="New journal entry" active={view === "newentry"} onClick={() => setView("newentry")} />
        <NavItem label="Journal" active={view === "journal"} onClick={() => setView("journal")} />
        <NavItem label="General ledger" active={view === "ledger"} onClick={() => setView("ledger")} />
        <NavItem label="Trial balance" active={view === "trialbalance"} onClick={() => setView("trialbalance")} />
        <NavItem label="Reports" active={view === "reports"} onClick={() => setView("reports")} />
        <NavItem label="Chart of accounts" active={view === "accounts"} onClick={() => setView("accounts")} />
      </div>
      <div style={{ padding: "12px 16px", fontSize: 10.5, opacity: 0.4, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        Saved automatically to this device
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={onLogout}
          style={{ width: "100%", fontSize: 11.5, color: COLORS.sidebarText, background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, padding: "7px 8px", cursor: "pointer" }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function BookModal({ value, onChange, onCancel, onSave }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,22,28,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: 340, boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 17, marginBottom: 12 }}>New book</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Electrify Store"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          style={{ ...inputStyle("100%"), marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "7px 14px", fontSize: 13, border: "none", background: "none", color: COLORS.sub, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onSave} style={{ padding: "7px 16px", fontSize: 13, border: "none", borderRadius: 5, background: COLORS.accent, color: "#fff", cursor: "pointer" }}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ mode, error, onSubmit }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  function submit() {
    if (mode === "setup" && password !== confirm) {
      setLocalError("Passwords don't match");
      return;
    }
    setLocalError("");
    onSubmit(username, password);
  }

  const shownError = localError || error;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: COLORS.bg, fontFamily: FONT_SANS }}>
      <div style={{ width: 340, background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 10, padding: 28 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 4 }}>Nadeemiphone</div>
        <div style={{ fontSize: 12.5, color: COLORS.sub, marginBottom: 22 }}>
          {mode === "setup" ? "Create a username and password to protect this ledger." : "Log in to your ledger."}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 5 }}>Username</div>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={inputStyle("100%")}
          />
        </div>
        <div style={{ marginBottom: mode === "setup" ? 12 : 20 }}>
          <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 5 }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={inputStyle("100%")}
          />
        </div>
        {mode === "setup" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 5 }}>Confirm password</div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={inputStyle("100%")}
            />
          </div>
        )}

        {shownError && <div style={{ color: COLORS.debitRed, fontSize: 12, marginBottom: 14 }}>{shownError}</div>}

        <button onClick={submit} style={{ width: "100%", padding: "9px 0", fontSize: 13, border: "none", borderRadius: 5, background: COLORS.accent, color: "#fff", cursor: "pointer" }}>
          {mode === "setup" ? "Create account" : "Log in"}
        </button>

        {mode === "setup" && (
          <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 14, lineHeight: 1.5 }}>
            This is stored only in this browser — the same login won't work on another device or browser unless you set it up there too.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.9, color: COLORS.sub, marginBottom: 10 }}>{children}</div>;
}

function EmptyState({ text, action, onAction }) {
  return (
    <div style={{ border: `1px dashed ${COLORS.rule}`, borderRadius: 8, padding: "28px 16px", textAlign: "center", color: COLORS.sub }}>
      <div style={{ marginBottom: action ? 10 : 0, fontSize: 13 }}>{text}</div>
      {action && (
        <button onClick={onAction} style={{ fontSize: 12.5, padding: "7px 14px", borderRadius: 5, border: "none", background: COLORS.accent, color: "#fff", cursor: "pointer" }}>
          {action}
        </button>
      )}
    </div>
  );
}

function Card({ label, value, accent }) {
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 11, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 19, fontVariantNumeric: "tabular-nums", color: accent || COLORS.ink }}>{fmt(value)}</div>
    </div>
  );
}

function Dashboard({ data, accountBalance, setView }) {
  const totals = { Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0 };
  data.accounts.forEach((a) => {
    const { net } = accountBalance(a.id);
    if (a.type === "Asset") totals.Asset += net;
    if (a.type === "Liability") totals.Liability += -net;
    if (a.type === "Equity") totals.Equity += -net;
    if (a.type === "Revenue") totals.Revenue += -net;
    if (a.type === "Expense") totals.Expense += net;
  });
  const netIncome = totals.Revenue - totals.Expense;
  const recent = [...data.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 28 }}>Current position across this book's accounts.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
        <Card label="Assets" value={totals.Asset} />
        <Card label="Liabilities" value={totals.Liability} />
        <Card label="Equity" value={totals.Equity} />
        <Card label="Net income" value={netIncome} accent={netIncome >= 0 ? COLORS.accent : COLORS.debitRed} />
      </div>

      <SectionLabel>Recent entries</SectionLabel>
      {recent.length === 0 ? (
        <EmptyState text="No journal entries yet." action="Record your first entry" onAction={() => setView("newentry")} />
      ) : (
        <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: "hidden" }}>
          {recent.map((e) => {
            const total = e.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
            return (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${COLORS.rule}`, fontSize: 13 }}>
                <div>
                  <div>{e.description}</div>
                  <div style={{ color: COLORS.sub, fontSize: 11.5, marginTop: 2 }}>{e.date}</div>
                </div>
                <div style={{ fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChartOfAccounts({ data, addAccount, deleteAccount, accountBalance }) {
  const [form, setForm] = useState({ code: "", name: "", type: "Asset" });
  const grouped = ACCOUNT_TYPES.map((t) => ({ type: t, accounts: data.accounts.filter((a) => a.type === t).sort((a, b) => a.code.localeCompare(b.code)) }));

  function submit() {
    if (!form.code.trim() || !form.name.trim()) return;
    addAccount({ ...form });
    setForm({ code: "", name: "", type: "Asset" });
  }

  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>Chart of accounts</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 24 }}>Every account this book can post to.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap", alignItems: "center", background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 8, padding: 14 }}>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={inputStyle(70)} />
        <input placeholder="Account name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle(220)} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle(130)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button onClick={submit} style={{ padding: "8px 16px", fontSize: 13, border: "none", borderRadius: 5, background: COLORS.accent, color: "#fff", cursor: "pointer" }}>
          Add account
        </button>
      </div>

      {grouped.map(
        (g) =>
          g.accounts.length > 0 && (
            <div key={g.type} style={{ marginBottom: 22 }}>
              <SectionLabel>{g.type}</SectionLabel>
              <div style={{ border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: "hidden" }}>
                {g.accounts.map((a) => {
                  const bal = accountBalance(a.id);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "9px 16px", borderBottom: `1px solid ${COLORS.rule}`, fontSize: 13, background: COLORS.paper }}>
                      <div style={{ width: 60, color: COLORS.sub, fontFamily: FONT_MONO }}>{a.code}</div>
                      <div style={{ flex: 1 }}>{a.name}</div>
                      <div style={{ fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums", marginRight: 16 }}>{fmt(Math.abs(bal.net))}</div>
                      <button onClick={() => deleteAccount(a.id)} style={{ fontSize: 11.5, color: COLORS.debitRed, background: "none", border: "none", cursor: "pointer" }}>
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )
      )}
    </div>
  );
}

function NewEntry({ data, addEntry, showToast, setView }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState([
    { id: uid("l_"), accountId: "", debit: "", credit: "" },
    { id: uid("l_"), accountId: "", debit: "", credit: "" },
  ]);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  function updateLine(id, field, value) {
    setLines(
      lines.map((l) =>
        l.id === id
          ? { ...l, [field]: value, ...(field === "debit" && value ? { credit: "" } : {}), ...(field === "credit" && value ? { debit: "" } : {}) }
          : l
      )
    );
  }
  function addLine() {
    setLines([...lines, { id: uid("l_"), accountId: "", debit: "", credit: "" }]);
  }
  function removeLine(id) {
    if (lines.length > 2) setLines(lines.filter((l) => l.id !== id));
  }

  function save() {
    if (!description.trim()) {
      showToast("Add a description");
      return;
    }
    if (!balanced) {
      showToast("Debits must equal credits");
      return;
    }
    const cleanLines = lines
      .filter((l) => l.accountId && (Number(l.debit || 0) > 0 || Number(l.credit || 0) > 0))
      .map((l) => ({ accountId: l.accountId, debit: Number(l.debit || 0), credit: Number(l.credit || 0) }));
    if (cleanLines.length < 2) {
      showToast("Add at least two lines");
      return;
    }
    addEntry({ id: uid("je_"), date, description: description.trim(), lines: cleanLines });
    showToast("Entry recorded");
    setDescription("");
    setDate(today);
    setLines([
      { id: uid("l_"), accountId: "", debit: "", credit: "" },
      { id: uid("l_"), accountId: "", debit: "", credit: "" },
    ]);
    setView("journal");
  }

  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>New journal entry</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 24 }}>Every entry needs equal debits and credits across at least two accounts.</p>

      <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 5 }}>Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle(150)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 5 }}>Description</div>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this entry for?" style={inputStyle("100%")} />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.rule}`, paddingTop: 14 }}>
          <div style={{ display: "flex", fontSize: 11, color: COLORS.sub, marginBottom: 8, paddingLeft: 2 }}>
            <div style={{ flex: 1 }}>Account</div>
            <div style={{ width: 120, textAlign: "right" }}>Debit</div>
            <div style={{ width: 120, textAlign: "right" }}>Credit</div>
            <div style={{ width: 28 }}></div>
          </div>
          {lines.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <select value={l.accountId} onChange={(e) => updateLine(l.id, "accountId", e.target.value)} style={{ ...inputStyle("auto"), flex: 1 }}>
                <option value="">Select account…</option>
                {data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
              <input type="number" placeholder="0.00" value={l.debit} onChange={(e) => updateLine(l.id, "debit", e.target.value)} style={{ ...inputStyle(120), textAlign: "right", fontFamily: FONT_MONO }} />
              <input type="number" placeholder="0.00" value={l.credit} onChange={(e) => updateLine(l.id, "credit", e.target.value)} style={{ ...inputStyle(120), textAlign: "right", fontFamily: FONT_MONO }} />
              <button onClick={() => removeLine(l.id)} style={{ width: 28, background: "none", border: "none", color: COLORS.sub, cursor: "pointer", fontSize: 16 }}>
                ×
              </button>
            </div>
          ))}
          <button onClick={addLine} style={{ fontSize: 12, color: COLORS.accent, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            + Add line
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.rule}`, fontFamily: FONT_MONO, fontSize: 13 }}>
          <div>
            Debit total <strong>{fmt(totalDebit)}</strong>
          </div>
          <div>
            Credit total <strong>{fmt(totalCredit)}</strong>
          </div>
          <div style={{ color: balanced ? COLORS.accent : COLORS.debitRed }}>{balanced ? "Balanced" : "Not balanced"}</div>
        </div>

        <div style={{ marginTop: 18, textAlign: "right" }}>
          <button
            onClick={save}
            disabled={!balanced}
            style={{ padding: "9px 20px", fontSize: 13, border: "none", borderRadius: 5, background: balanced ? COLORS.accent : COLORS.rule, color: balanced ? "#fff" : COLORS.sub, cursor: balanced ? "pointer" : "not-allowed" }}
          >
            Record entry
          </button>
        </div>
      </div>
    </div>
  );
}

function Journal({ data, accountsById, deleteEntry }) {
  const sorted = [...data.entries].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>Journal</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 24 }}>All recorded entries, most recent first.</p>
      {sorted.length === 0 ? (
        <EmptyState text="No entries recorded yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((e) => (
            <div key={e.id} style={{ background: COLORS.paper, border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: "#F0EEE7", fontSize: 12.5 }}>
                <div>
                  <strong>{e.description}</strong> <span style={{ color: COLORS.sub }}> · {e.date}</span>
                </div>
                <button onClick={() => deleteEntry(e.id)} style={{ background: "none", border: "none", color: COLORS.debitRed, cursor: "pointer", fontSize: 11.5 }}>
                  Delete
                </button>
              </div>
              {e.lines.map((l, i) => (
                <div key={i} style={{ display: "flex", padding: "7px 16px", fontSize: 13, borderTop: i > 0 ? `1px solid ${COLORS.rule}` : "none" }}>
                  <div style={{ flex: 1, paddingLeft: l.debit > 0 ? 0 : 24, color: l.debit > 0 ? COLORS.ink : COLORS.sub }}>{accountsById[l.accountId]?.name || "—"}</div>
                  <div style={{ width: 120, textAlign: "right", fontFamily: FONT_MONO }}>{l.debit > 0 ? fmt(l.debit) : ""}</div>
                  <div style={{ width: 120, textAlign: "right", fontFamily: FONT_MONO }}>{l.credit > 0 ? fmt(l.credit) : ""}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GeneralLedger({ data }) {
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const entries = data.entries.filter((e) => e.lines.some((l) => l.accountId === accountId)).sort((a, b) => a.date.localeCompare(b.date));
  const account = data.accounts.find((a) => a.id === accountId);
  const isDebitNormal = account && (account.type === "Asset" || account.type === "Expense");

  let running = 0;
  const rows = entries.map((e) => {
    const line = e.lines.find((l) => l.accountId === accountId);
    const delta = isDebitNormal ? Number(line.debit || 0) - Number(line.credit || 0) : Number(line.credit || 0) - Number(line.debit || 0);
    running += delta;
    return { ...e, line, running };
  });

  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>General ledger</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 20 }}>Every posting to a single account, with a running balance.</p>

      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...inputStyle(320), marginBottom: 20 }}>
        {data.accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} · {a.name}
          </option>
        ))}
      </select>

      <div style={{ border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 16px", background: "#F0EEE7", fontSize: 11, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <div style={{ width: 90 }}>Date</div>
          <div style={{ flex: 1 }}>Description</div>
          <div style={{ width: 110, textAlign: "right" }}>Debit</div>
          <div style={{ width: 110, textAlign: "right" }}>Credit</div>
          <div style={{ width: 130, textAlign: "right" }}>Balance</div>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 20, color: COLORS.sub, fontSize: 13 }}>No activity on this account yet.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} style={{ display: "flex", padding: "9px 16px", fontSize: 13, borderTop: `1px solid ${COLORS.rule}`, background: COLORS.paper }}>
              <div style={{ width: 90, color: COLORS.sub }}>{r.date}</div>
              <div style={{ flex: 1 }}>{r.description}</div>
              <div style={{ width: 110, textAlign: "right", fontFamily: FONT_MONO }}>{r.line.debit > 0 ? fmt(r.line.debit) : ""}</div>
              <div style={{ width: 110, textAlign: "right", fontFamily: FONT_MONO }}>{r.line.credit > 0 ? fmt(r.line.credit) : ""}</div>
              <div style={{ width: 130, textAlign: "right", fontFamily: FONT_MONO, fontWeight: 600 }}>{fmt(r.running)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TrialBalance({ data, accountBalance }) {
  const rows = data.accounts
    .map((a) => {
      const { net } = accountBalance(a.id);
      const debitCol = Math.max(net, 0);
      const creditCol = Math.max(-net, 0);
      return { ...a, debitCol, creditCol };
    })
    .filter((r) => r.debitCol > 0.004 || r.creditCol > 0.004);

  const totalDebit = rows.reduce((s, r) => s + r.debitCol, 0);
  const totalCredit = rows.reduce((s, r) => s + r.creditCol, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>Trial balance</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 20 }}>All account balances as of today. Debit and credit totals should match.</p>

      <div style={{ border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 16px", background: "#F0EEE7", fontSize: 11, color: COLORS.sub, textTransform: "uppercase" }}>
          <div style={{ width: 60 }}>Code</div>
          <div style={{ flex: 1 }}>Account</div>
          <div style={{ width: 130, textAlign: "right" }}>Debit</div>
          <div style={{ width: 130, textAlign: "right" }}>Credit</div>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 20, color: COLORS.sub, fontSize: 13 }}>No activity recorded yet.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} style={{ display: "flex", padding: "9px 16px", fontSize: 13, borderTop: `1px solid ${COLORS.rule}`, background: COLORS.paper }}>
              <div style={{ width: 60, fontFamily: FONT_MONO, color: COLORS.sub }}>{r.code}</div>
              <div style={{ flex: 1 }}>{r.name}</div>
              <div style={{ width: 130, textAlign: "right", fontFamily: FONT_MONO }}>{r.debitCol > 0 ? fmt(r.debitCol) : ""}</div>
              <div style={{ width: 130, textAlign: "right", fontFamily: FONT_MONO }}>{r.creditCol > 0 ? fmt(r.creditCol) : ""}</div>
            </div>
          ))
        )}
        <div style={{ display: "flex", padding: "12px 16px", fontSize: 13, borderTop: `2px solid ${COLORS.ink}`, fontWeight: 700 }}>
          <div style={{ width: 60 }}></div>
          <div style={{ flex: 1 }}>Total</div>
          <div style={{ width: 130, textAlign: "right", fontFamily: FONT_MONO }}>{fmt(totalDebit)}</div>
          <div style={{ width: 130, textAlign: "right", fontFamily: FONT_MONO }}>{fmt(totalCredit)}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, color: balanced ? COLORS.accent : COLORS.debitRed }}>
        {balanced ? "✓ Books are balanced." : "⚠ Debits and credits don't match — check your entries."}
      </div>
    </div>
  );
}

function ReportBlock({ rows }) {
  return (
    <div style={{ border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: "hidden" }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 16px",
            fontSize: 13,
            borderTop: r.ruleTop ? `2px solid ${COLORS.ink}` : i > 0 ? `1px solid ${COLORS.rule}` : "none",
            fontWeight: r.bold ? 700 : 400,
            background: COLORS.paper,
          }}
        >
          <div>{r.label}</div>
          <div style={{ fontFamily: FONT_MONO }}>{fmt(r.value)}</div>
        </div>
      ))}
    </div>
  );
}

function Reports({ data, accountBalance }) {
  const revenue = data.accounts.filter((a) => a.type === "Revenue");
  const expense = data.accounts.filter((a) => a.type === "Expense");
  const asset = data.accounts.filter((a) => a.type === "Asset");
  const liability = data.accounts.filter((a) => a.type === "Liability");
  const equity = data.accounts.filter((a) => a.type === "Equity");

  const revTotal = revenue.reduce((s, a) => s - accountBalance(a.id).net, 0);
  const expTotal = expense.reduce((s, a) => s + accountBalance(a.id).net, 0);
  const netIncome = revTotal - expTotal;

  const assetTotal = asset.reduce((s, a) => s + accountBalance(a.id).net, 0);
  const liabTotal = liability.reduce((s, a) => s - accountBalance(a.id).net, 0);
  const equityTotal = equity.reduce((s, a) => s - accountBalance(a.id).net, 0) + netIncome;

  return (
    <div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, marginBottom: 4 }}>Reports</h1>
      <p style={{ color: COLORS.sub, fontSize: 13, marginBottom: 28 }}>Profit & loss and balance sheet, as of today.</p>

      <SectionLabel>Profit & loss</SectionLabel>
      <ReportBlock rows={[...revenue.map((a) => ({ label: a.name, value: -accountBalance(a.id).net })), { label: "Total revenue", value: revTotal, bold: true, ruleTop: true }]} />
      <div style={{ height: 16 }} />
      <ReportBlock rows={[...expense.map((a) => ({ label: a.name, value: accountBalance(a.id).net })), { label: "Total expenses", value: expTotal, bold: true, ruleTop: true }]} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", marginTop: 8, background: "#F0EEE7", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
        <div>Net income</div>
        <div style={{ fontFamily: FONT_MONO, color: netIncome >= 0 ? COLORS.accent : COLORS.debitRed }}>{fmt(netIncome)}</div>
      </div>

      <div style={{ height: 36 }} />
      <SectionLabel>Balance sheet</SectionLabel>
      <ReportBlock rows={[...asset.map((a) => ({ label: a.name, value: accountBalance(a.id).net })), { label: "Total assets", value: assetTotal, bold: true, ruleTop: true }]} />
      <div style={{ height: 16 }} />
      <ReportBlock rows={[...liability.map((a) => ({ label: a.name, value: -accountBalance(a.id).net })), { label: "Total liabilities", value: liabTotal, bold: true, ruleTop: true }]} />
      <div style={{ height: 16 }} />
      <ReportBlock
        rows={[
          ...equity.map((a) => ({ label: a.name, value: -accountBalance(a.id).net })),
          { label: "Net income (current)", value: netIncome },
          { label: "Total equity", value: equityTotal, bold: true, ruleTop: true },
        ]}
      />
      <div style={{ marginTop: 12, fontSize: 12.5, color: Math.abs(assetTotal - (liabTotal + equityTotal)) < 0.01 ? COLORS.accent : COLORS.debitRed }}>
        {Math.abs(assetTotal - (liabTotal + equityTotal)) < 0.01 ? "✓ Assets = Liabilities + Equity." : "⚠ Balance sheet doesn't balance — review entries."}
      </div>
    </div>
  );
}
