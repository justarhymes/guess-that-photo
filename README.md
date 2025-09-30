# Guess That Photo – Prototype

This directory houses a fresh React + Firebase prototype for the "Guess That Photo" party game. It keeps the legacy `legacy-guess-game/` project untouched while providing a modernized room flow that matches the instructions in the root README.

## Highlights

- **Room lifecycle**: setup → join → upload → guess → results → complete, with phase transitions controlled by the host.
- **Firebase-backed state**: Firestore for rooms/users/photos/messages, Storage for image uploads, Auth (anonymous) for lightweight identity.
- **Real-time UI**: onSnapshot listeners keep player lists, chat, photos, and guesses in sync.
- **Ready toggles**: every stage enforces the ready/cancel requirement and locks the player’s inputs while ready.
- **Drag & Drop guessing**: react-dnd enables dragging photos to players, with reassignment support.
- **Scoreboard**: each correct guess is worth 100 points; leaderboards render automatically at the results and complete screens.

## Getting started

```bash
cd new-prototype
npm install
npm run dev
```

The Vite dev server defaults to `http://localhost:5173`. Ensure your Firebase project (`guess-that-photo`) has the relevant collections (`rooms`, `rooms/{roomId}/users`, etc.) and Storage enabled.

## Firebase structure

- `rooms/{roomId}`
  - `status`: `join | upload | guess | results | complete`
  - `gameName`, `hostUid`, `countdownEnabled`, `maxPhotos`, `timerPerUserSeconds`
  - `timerEndsAt`, `timerStartedAt`, timestamps for lifecycle auditing
- `rooms/{roomId}/users/{userId}`
  - `name`, `photoURL`, `avatarSeed`, `role`, `ready`, `score`
- `rooms/{roomId}/photos/{photoId}`
  - `url`, `storagePath`, `uploadedBy`, `uploadedByName`, `guesses.{userId}`
- `rooms/{roomId}/messages/{messageId}`
  - `text`, `userName`, `userPhoto`, `createdAt`

## Known gaps & next steps

- **Validation**: client-side checks are minimal. Add guards for oversized files, duplicate joins, and room existence edge cases.
- **Timer sync**: countdown relies on client clocks. A Cloud Function or server timestamp comparisons would make timing authoritative.
- **Results animations**: the results screen renders data but skips the detailed animation flow described in the product brief.
- **Replays**: completing a room prompts players to create a new room; an automated replay flow (clone settings, rejoin players) is still TODO.
- **Testing**: no automated tests yet. Consider adding integration tests with Vitest/React Testing Library for stage transitions and Firestore mocks.

Feel free to iterate on this baseline without touching the legacy project.
