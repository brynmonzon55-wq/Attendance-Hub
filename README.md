# 🌸 AttendanceHub

A classroom and attendance management web app for students and teachers, built with **React + Vite + Firebase**, deployed to GitHub Pages.

**Live app:** https://brynmonzon55-wq.github.io/Attendance-Hub

---

## ✨ Features

### Role-based dashboards
- **Student Portal** — enrolled classes, personal attendance history & stats, check-ins, announcements, assignments, faculty directory, messenger, and account settings.
- **Teacher Portal** — class roster management, live check-in monitoring, announcements, assignments & grading, attendance reports, messenger, and account settings.

### Authentication & onboarding
- Sign in with **Google Account**, or a **Student/Teacher ID**-based login (backed by real Firebase Authentication — passwords are hashed and managed by Firebase, never stored in Firestore).
- New Google sign-ins go through a guided onboarding flow to pick a role, department/subject, and complete their profile.
- New student accounts require teacher approval before gaining full access.

### Classroom & sections
- Teachers create class sections (e.g. "Grade 10 – Section A") with a short **join code** students use to enroll themselves.
- Google Classroom-style section view: class stream, classwork, materials, people, and per-section attendance sheet.
- Class-level and private (1-on-1) comments on posts and submissions.

### Attendance
- Quick check-in workflow with **Present / Absent / Late** status tracking.
- Daily check-ins tab with live, section-aware verification.
- Per-student attendance stats (present/absent/late counts and attendance %).
- Teacher-side attendance reports, exportable per class/section.

### Announcements & assignments
- Teachers post announcements and assignments (with due dates, max points, and file attachments) to a class stream.
- Students submit assignments (text and/or file attachment) and receive scores + feedback from teachers.

### Messaging
- Built-in **Class Messenger** for real-time 1-on-1 direct messaging between students, teachers, and faculty, with unread-message tracking and file attachments.

### Faculty directory
- Students can browse and view profiles of teachers/faculty tied to their enrolled classes.

### Security & audit logging
- Security event log (impersonation attempts, invalid registrations, unauthorized access, verification status changes, account deletions) for admin/teacher visibility.

### Personalization
- 6 selectable visual themes, each with an independent **Day / Night** mode and animated background:

  | Theme | Vibe |
  |---|---|
  | 🖥️ **Cyberpunk** *(default)* | Neo-Tokyo neon — electric cyan, magenta & purple glow |
  | 🌸 **Sakura** | Hanami & Yozakura — soft blossom pink & warm lantern gold, with falling Somei-Yoshino/Yaezakura petals |
  | 🌷 **Spring** | Fresh meadow blossoms — pink, rose & emerald |
  | ☀️ **Summer** | Golden hour sunbursts over tropical azure skies |
  | 🍂 **Autumn** | Harvest moon & crimson/amber falling leaves |
  | ❄️ **Winter** | Polar aurora skies with drifting snowflakes |

- Profile picture upload/selection, editable contact & social info (Facebook, Twitter/X, LinkedIn, GitHub, Instagram).
- Toggle for background particle effects (for lower-powered devices).
- Fullscreen mode toggle.

---

## 🛠️ Tech stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4**
- **Firebase** (Authentication + Firestore, real-time listeners)
- **Framer Motion** (`motion`) for animation
- **lucide-react** for icons
- Deployed via **GitHub Actions** to GitHub Pages, with Firestore security rules deployed separately

---

## 🚀 Getting started

```bash
npm install
npm run dev       # start local dev server
npm run build      # production build
npm run lint       # type-check (tsc --noEmit)
npm run deploy      # build + publish to GitHub Pages
```

Firebase config lives in `firebase-config.json` (repo root) and is imported by `src/lib/firebase.ts`. Firestore security rules are in `firestore.rules` and require an authenticated user (`request.auth != null`) on every collection — they must be deployed via the Firebase Console or CLI separately from the app itself.
