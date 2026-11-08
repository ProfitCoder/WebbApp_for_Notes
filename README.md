# WebbApp for Notes

[![GitHub Pages deployment](https://github.com/ProfitCoder/WebbApp_for_Notes/actions/workflows/pages.yml/badge.svg)](https://github.com/ProfitCoder/WebbApp_for_Notes/actions/workflows/pages.yml)
[![Live demo](https://img.shields.io/badge/Live%20demo-GitHub%20Pages-2563EB)](https://profitcoder.github.io/WebbApp_for_Notes/)
[![License](https://img.shields.io/badge/License-All%20rights%20reserved-lightgrey)](#copyright-and-permissions)

A browser-based sticky-note board built with vanilla JavaScript and Cloud Firestore. Create notes, edit their titles and contents directly on the board, and drag them into place. Notes and their saved positions persist across page reloads.

**[Open the live demo](https://profitcoder.github.io/WebbApp_for_Notes/)**

## Screenshots

### The board

![Sticky-note board with notes arranged across the workspace](docs/images/board.png)

### Delete confirmation

![Confirmation dialog displayed after swiping a sticky note](docs/images/delete-confirmation.png)

## How to use the board

| Action | Mouse or touch interaction | Result |
| --- | --- | --- |
| Create | Select the **+** button. | A new note is saved and added to the board. |
| Edit | Double-click or double-tap the title or body. Click or tap outside the note when finished. | The title and body are saved. |
| Move | Drag a note to a new location and release it. | The new position is saved. |
| Delete | Swipe a note quickly to the left or right and confirm in the dialog. | The note is removed from the board and from storage. |
| Cancel deletion | Select **Cancel** in the confirmation dialog. | The note immediately returns to its position before the swipe. |

## How the gestures work

The board uses Pointer Events for both mouse and touch input. When a gesture starts, the app records the pointer position and the note's starting coordinates. On release, it uses the movement distance, direction, and elapsed time to decide whether to edit, move, or ask for deletion confirmation.

A regular drag saves the final coordinates. A fast horizontal swipe opens a confirmation dialog, so releasing the note alone never deletes it.

## Technology stack

| Technology | Role |
| --- | --- |
| HTML | Board, add button, and native confirmation dialog |
| CSS | Sticky-note layout, colors, typography, and positioning |
| Vanilla JavaScript | Note creation, inline editing, and gesture handling |
| Cloud Firestore | Persistent storage for note content and board positions |
| GitHub Pages | Hosting for the live demo |
| GitHub Actions | Automated deployment |

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Page layout and application entry point |
| `src/css/style.css` | Board and sticky-note styles |
| `src/script/main.js` | Note rendering, gesture handling, and storage operations |
| `docs/images/` | Screenshots used in this README |

## Copyright and permissions

Copyright © 2026 [ProfitCoder](https://github.com/ProfitCoder). All rights reserved.

This notice applies to the original source code, documentation, and assets authored by ProfitCoder. Third-party components remain subject to their respective terms.

Except where permitted by applicable law or GitHub's Terms of Service, prior written permission is required to reproduce, modify, redistribute, republish, or sell protected material from this project. Retain existing copyright and authorship notices when using material with permission. GitHub's terms permit viewing and forking public repositories on the platform.

### Legal basis

Under Spain's [Intellectual Property Act, Royal Legislative Decree 1/1996](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930), Article 14.3 recognizes the author's right to claim authorship. Articles 96 and 99 govern the protection of original computer programs and the exclusive rights over their reproduction, adaptation, and distribution, subject to statutory exceptions.

Where an infringement occurs, the rights holder may request removal through [GitHub's copyright takedown process](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy) or pursue applicable civil remedies. Articles 138–140 of the Spanish Intellectual Property Act provide for remedies including cessation of the infringement and, where applicable, damages.

For permission requests, contact [ProfitCoder](https://github.com/ProfitCoder).
