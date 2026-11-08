# WebbApp for Notes

A browser-based sticky-note board built with vanilla JavaScript and Cloud Firestore. Create notes, edit their contents, and arrange them on the board. Your notes and their positions persist across page reloads.

**[Open the live demo](https://profitcoder.github.io/WebbApp_for_Notes/)**

## Features

| Action | Interaction |
| --- | --- |
| Create a note | Select **+** to add a sticky note. |
| Edit a note | Double-click or double-tap the title or body. Click or tap outside the note to save your changes. |
| Move a note | Drag the note and release it to save its new position. |
| Delete a note | Swipe the note quickly to the left or right and confirm. If you cancel, the note returns immediately to its previous position. |

## Technology stack

- **HTML and CSS** for the board, sticky notes, and confirmation dialog.
- **Vanilla JavaScript and Pointer Events** for mouse and touch interactions.
- **Cloud Firestore** for persistent note storage.
- **GitHub Pages and GitHub Actions** for deployment.

## Local development

1. Clone the repository and open the project folder.
2. Register a Firebase web app and enable Cloud Firestore.
3. Create `src/script/firebase_config.js` locally and export the Firebase web configuration as `firebaseConfig`.
4. Configure access to the `ColeccionPostIt` collection through Firestore Security Rules.
5. Serve `index.html` over HTTP using VS Code Live Server or another local web server.

## Deployment

The project is hosted on GitHub Pages. The deployment workflow uses the `FIREBASE_CONFIG_JS` repository secret to generate the Firebase configuration file for the published site.

## Copyright and permissions

Copyright © 2026 [ProfitCoder](https://github.com/ProfitCoder). All rights reserved.

Unless permitted by applicable law or GitHub's Terms of Service, you must obtain prior written permission to copy, redistribute, modify, republish, or sell this project's original code or assets. You may not present this work as your own.

Unauthorized use may result in a takedown request or other remedies available under applicable law. For permission requests, contact [ProfitCoder](https://github.com/ProfitCoder).
