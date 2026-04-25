# 🌍 All India Villages API

A production-grade REST API providing comprehensive village-level geographical data for all of India.

## 📊 Data Coverage
- **4,62,944** Villages
- **28** States
- **488** Districts
- Complete Sub-District hierarchy

## 🚀 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/states` | Get all states |
| GET | `/v1/states/:code/districts` | Get districts by state |
| GET | `/v1/districts/:code/subdistricts` | Get sub-districts |
| GET | `/v1/subdistricts/:code/villages` | Get villages |
| GET | `/v1/autocomplete?q=xxx` | Village autocomplete |
| GET | `/v1/search?q=xxx` | Search villages |

## 📦 Response Format

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "value": "village_id",
      "label": "Manibeli",
      "fullAddress": "Manibeli, Akkalkuwa, Nandurbar, Maharashtra, India",
      "hierarchy": {
        "village": "Manibeli",
        "subDistrict": "Akkalkuwa",
        "district": "Nandurbar",
        "state": "Maharashtra",
        "country": "India"
      }
    }
  ]
}
```

## 🛠️ Tech Stack
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Frontend:** React 18 + Vite
- **Charts:** Recharts
- **Data:** Government of India MDDS Dataset

## ⚡ Performance
- Sub-100ms response time
- Indexed database queries
- CORS enabled for B2B integration

## 🏃 Run Locally

```bash
# Install dependencies
npm install

# Setup database (import all villages)
node setup-db.js

# Start server
node server.js

# API running at http://localhost:3000
```

## 📱 Features
- ✅ Village-level autocomplete
- ✅ Hierarchical dropdown (State → District → Sub-District → Village)
- ✅ Admin dashboard with analytics
- ✅ Rate limiting ready
- ✅ JWT authentication ready

## 👨‍💻 Developer
Built as a B2B SaaS API platform for Indian address standardization.