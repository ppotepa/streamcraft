# Triggers and Effects Prototype

Location: `prototypes/triggers/eveents`

## Goal
A 1:1 draft of the target simple contextual flow for a Chat component:
- show only chat-context triggers/events
- show chat-safe effects
- one simple optional value input (only when needed)
- one effect text input
- user sentence preview: `When ... then ...`
- test and add rule with no advanced builder

## Files
- `index.html`
- `styles.css`
- `scripts/app.js`

## Current prototype features
- 15 chat-context trigger templates (filtered by category)
- 15 effect templates (filtered by category)
- guided 3-step layout:
  - Trigger Explorer
  - Effect Explorer
  - Rule Setup
- no raw event schema editor visible to user
- random event simulation and matching event test
- active rules list and event log

## Local run
Open `index.html` directly in browser or serve folder with any static server.
