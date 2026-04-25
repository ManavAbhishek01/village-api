import { useState } from "react";
import AdminPanel from "./AdminPanel";

const API = "http://localhost:3000/v1";

function DemoForm() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [autocomplete, setAutocomplete] = useState([]);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    village: "", subDistrict: "", district: "", state: "", country: "India"
  });
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useState(() => {
    fetch(`${API}/states`).then(r => r.json()).then(d => setStates(d.data));
  }, []);

  const onStateChange = (e) => {
    const code = e.target.value;
    const name = states.find(s => s.code == code)?.name || "";
    setForm(f => ({ ...f, state: name, district: "", subDistrict: "", village: "" }));
    setDistricts([]); setSubDistricts([]); setVillages([]);
    if (code) fetch(`${API}/states/${code}/districts`).then(r => r.json()).then(d => setDistricts(d.data));
  };

  const onDistrictChange = (e) => {
    const code = e.target.value;
    const name = districts.find(d => d.code == code)?.name || "";
    setForm(f => ({ ...f, district: name, subDistrict: "", village: "" }));
    setSubDistricts([]); setVillages([]);
    if (code) fetch(`${API}/districts/${code}/subdistricts`).then(r => r.json()).then(d => setSubDistricts(d.data));
  };

  const onSubDistrictChange = (e) => {
    const code = e.target.value;
    const name = subDistricts.find(s => s.code == code)?.name || "";
    setForm(f => ({ ...f, subDistrict: name, village: "" }));
    setVillages([]);
    if (code) fetch(`${API}/subdistricts/${code}/villages`).then(r => r.json()).then(d => setVillages(d.data));
  };

  const onAutocomplete = (e) => {
    const q = e.target.value;
    setQuery(q);
    setForm(f => ({ ...f, village: q }));
    if (q.length >= 2) {
      fetch(`${API}/autocomplete?q=${q}`).then(r => r.json()).then(d => { setAutocomplete(d.data); setShowDropdown(true); });
    } else setShowDropdown(false);
  };

  const selectVillage = (v) => {
    setForm(f => ({ ...f, village: v.hierarchy.village, subDistrict: v.hierarchy.subDistrict, district: v.hierarchy.district, state: v.hierarchy.state, country: "India" }));
    setQuery(v.hierarchy.village);
    setShowDropdown(false);
  };

  if (submitted) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: 60 }}>🎉</div>
        <h2 style={{ color: "#16a34a" }}>Form Submit Ho Gaya!</h2>
        <div style={styles.addressBox}>
          <p><b>Name:</b> {form.name}</p>
          <p><b>Full Address:</b></p>
          <p style={{ color: "#2563eb", fontWeight: "bold" }}>{form.village}, {form.subDistrict}, {form.district}, {form.state}, {form.country}</p>
        </div>
        <button style={styles.btn} onClick={() => setSubmitted(false)}>Wapas Jao</button>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🌍 All India Villages API</h1>
        <p style={styles.subtitle}>Demo Contact Form — Village Autocomplete</p>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>👤 Personal Info</h3>
          <input style={styles.input} placeholder="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={styles.input} placeholder="Email Address" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input style={styles.input} placeholder="Phone Number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📍 Address</h3>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input style={{ ...styles.input, borderColor: "#2563eb" }} placeholder="🔍 Village name type karo (autocomplete)..." value={query} onChange={onAutocomplete} />
            {showDropdown && autocomplete.length > 0 && (
              <div style={styles.dropdown}>
                {autocomplete.map((v, i) => (
                  <div key={i} style={styles.dropdownItem} onClick={() => selectVillage(v)}>
                    <b>{v.label}</b><span style={{ color: "#6b7280", fontSize: 12 }}> — {v.fullAddress}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p style={{ textAlign: "center", color: "#9ca3af", margin: "8px 0" }}>— YA —</p>
          <select style={styles.input} onChange={onStateChange} defaultValue=""><option value="">State chuno</option>{states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
          <select style={styles.input} onChange={onDistrictChange} defaultValue="" disabled={!districts.length}><option value="">District chuno</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
          <select style={styles.input} onChange={onSubDistrictChange} defaultValue="" disabled={!subDistricts.length}><option value="">Sub-District chuno</option>{subDistricts.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
          <select style={styles.input} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} defaultValue="" disabled={!villages.length}><option value="">Village chuno</option>{villages.map((v, i) => <option key={i} value={v.name}>{v.name}</option>)}</select>
        </div>
        {form.village && (
          <div style={styles.addressBox}>
            <b>📌 Selected Address:</b><br />
            <span style={{ color: "#2563eb" }}>{[form.village, form.subDistrict, form.district, form.state, form.country].filter(Boolean).join(", ")}</span>
          </div>
        )}
        <button style={styles.btn} onClick={() => { if (!form.name || !form.village) { alert("Name aur Village zaroori hai!"); return; } setSubmitted(true); }}>Submit Form ✅</button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("demo");
  return (
    <div>
      <div style={{ background: "#1e293b", padding: "10px 20px", display: "flex", gap: 12 }}>
        <button onClick={() => setPage("demo")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: page === "demo" ? "#2563eb" : "#334155", color: "white", fontWeight: "bold" }}>🌍 Demo Form</button>
        <button onClick={() => setPage("admin")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: page === "admin" ? "#2563eb" : "#334155", color: "white", fontWeight: "bold" }}>📊 Admin Panel</button>
      </div>
      {page === "admin" ? <AdminPanel /> : <DemoForm />}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #eff6ff, #f0fdf4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif" },
  card: { background: "white", borderRadius: 16, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" },
  title: { textAlign: "center", color: "#1e40af", margin: "0 0 4px" },
  subtitle: { textAlign: "center", color: "#6b7280", marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { color: "#374151", marginBottom: 10, borderBottom: "2px solid #e5e7eb", paddingBottom: 6 },
  input: { width: "100%", padding: "10px 12px", marginBottom: 8, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #d1d5db", borderRadius: 8, zIndex: 100, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  dropdownItem: { padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", fontSize: 13 },
  addressBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  btn: { width: "100%", padding: "12px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold", cursor: "pointer" },
};