# 🌐 PlayProof Web Command Center

This is the canonical web application for **PlayProof**, serving as the central management dashboard and API orchestrator.

## 🚀 Responsibilities

- **Dashboard**: Oversee all verification deployments and real-time session monitoring.
- **Analytics**: Deep-dive into bot detection metrics and behavioral scoring performance.
- **API Services**: Next.js App Router handlers for scoring, training, and batch processing.
- **Woodwide Integration**: Direct interface with the Woodwide ML platform for anomaly detection.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State/Data**: [Convex](https://www.convex.dev/) (Client/Server)
- **Real-time**: [LiveKit](https://livekit.io/)
- **Auth**: [Clerk](https://clerk.com/)

## 🏁 Getting Started

From this directory:

```bash
# Start the Next.js dev server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Key Directories

- `/app`: Next.js App Router pages and API routes.
- `/components`: Reusable UI components (Dashboard, Charts, Session Views).
- `/server`: Core business logic, scoring pipeline, and external service clients.
- `/woodwide`: Training data scripts, evaluation tests, and Woodwide-specific docs.

## 📖 Related Docs

- [WOODWIDE_TEST_PAGE.md](./WOODWIDE_TEST_PAGE.md) - Guide for testing minigame scoring.
- [ROOT README](../../README.md) - Project overview and monorepo structure.

---
<p align="center">PlayProof • Secure by Play</p>
