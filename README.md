# StudyTracker

Private, offline-first study tracking app. React Native (Expo SDK 52).

## Setup

```bash
cd study-app

# Delete node_modules and lockfile if they exist from a previous attempt
rm -rf node_modules package-lock.json

# Install fresh
npm install

# Start with cache clear
npx expo start --clear
```

Scan QR with Expo Go on your phone.

**If you still get plugin errors**, the nuclear option:

```bash
rm -rf node_modules package-lock.json .expo
npm install
npx expo start --clear
```

## File Structure

```
App.tsx                         → Re-exports src/App
src/
├── App.tsx                     → DB init, NavigationContainer, dark theme
├── types/index.ts              → All TypeScript interfaces
├── utils/index.ts              → Formatting, ID gen, colors
├── database/db.ts              → SQLite schema + CRUD
├── store/
│   ├── subjectStore.ts         → Zustand: subjects
│   ├── timerStore.ts           → Zustand: timer (idle/running/paused)
│   ├── planStore.ts            → Zustand: daily plans
│   └── noteStore.ts            → Zustand: notes
├── navigation/
│   └── AppNavigator.tsx        → Bottom tabs (5 screens)
└── screens/
    ├── HomeScreen.tsx           → Today: date, total, plans, start button
    ├── TimerScreen.tsx          → Timer, subject picker, note
    ├── StatsScreen.tsx          → Daily/weekly chart, subject breakdown
    ├── NotesScreen.tsx          → Notes CRUD, full-screen editor
    └── SettingsScreen.tsx       → Subjects mgmt, export, reset
```