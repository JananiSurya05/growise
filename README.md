# GroWise 🌱

An AI-powered agri-food platform connecting farmers, consumers, and government officials — built for Tamil Nadu.

---

## Frontend

The frontend is built using **Next.js 16** with **React** and **TypeScript**. It is a responsive web application with role-based dashboards for farmers, consumers, and government officials.

- **Farmer Portal** — Crop listing management, income calculator, sales analytics, weather advisories, AI crop advisor, and plant disease scanner.
- **Consumer Portal** — Fresh produce marketplace, QR farm story (farm-to-table transparency), nutrition guide, and order tracking.
- **Government Portal** — Analytics and oversight dashboard.

---

## Backend

The backend uses **Supabase** — an open-source Firebase alternative — which provides a **PostgreSQL database**, real-time data sync, and user authentication. All data including farmer profiles, crop listings, and orders are stored and retrieved through Supabase.

---

## AI / ML

For disease detection, we implemented an **AI-powered image classification system**. The model analyses crop images and identifies diseases based on visual patterns such as leaf discoloration, spots, and texture changes. It then provides treatment recommendations in real time.

We evaluated both approaches — training a custom CNN model and using a pre-trained vision model. Training a custom model requires 50,000+ labeled crop disease images and weeks of GPU training. We chose to integrate a **pre-trained vision model** fine-tuned for agricultural use, which gives higher accuracy immediately. This reflects real-world industry practice where pre-trained models are preferred over custom models for production systems.

The **AI Crop Advisor** uses the same model pipeline to answer farmer queries in natural language, with guidance tailored to Indian agricultural contexts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / Database | Supabase (PostgreSQL) |
| AI / ML | Pre-trained vision model (agricultural fine-tuned) |
| Weather | OpenWeather API |
| QR Codes | qrcode, qrcode.react |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
