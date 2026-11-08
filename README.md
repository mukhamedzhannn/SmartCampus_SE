# Smart Campus Room Availability Checker (Assignment #04)

## Project Overview
This project is an extension and refactoring of the Smart Campus Room Availability prototype (Assignment #03)[cite: 40, 52, 56]. It evolves a single-room availability checker into a multi-room catalog supporting dynamic filtering by capacity and required equipment, while strictly preserving core time bounds, 120-minute maximum duration limits, room block checks, and half-open interval overlap rules[cite: 57, 58, 59].

## Tech Stack & Architecture
- **Frontend / Prototype:** React, Tailwind CSS (Built and hosted via Bolt.new)[cite: 52, 59]
- **Architecture:** Separated into clean modular layers:
  - `roomsData.js`: Centralized room catalog metadata.
  - `bookingRules.js`: Pure functions for core availability and time rules (AC1–AC5).
  - `roomFilters.js`: Pure functions for filtering rules (F1–F5).
  - UI Components: Responsive presentation layer.

## Setup & Running Instructions
1. Clone or download the repository workspace.
2. Install dependencies (if using Node.js environment):
   ```bash
   npm install
