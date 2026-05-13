# ExamCraft AI - CBT Platform

A university-grade Computer-Based Test (CBT) examination platform inspired by NOUN's e-exam system. Features AI-powered question generation from course materials, timed exams, strict answer evaluation, and unit progression logic.

## Project Type
React (JavaScript) SPA with Groq API integration, Tailwind CSS, and localStorage persistence.

## Key Features
- Subject and Unit management with hierarchical organization
- Material input and storage
- Groq API integration for PhD-level question generation (20+ questions per unit)
- Exam interface with timer, question navigation, and flagging
- Strict answer evaluation engine (no semantic matching)
- Results system with pass/fail logic and unit unlock progression
- Responsive design with dark mode toggle
- localStorage-based data persistence (no backend required)

## Tech Stack
- Frontend: React (18+) with hooks
- Styling: Tailwind CSS 3.x
- AI: Groq API (openai/gpt-oss-120b model)
- Storage: localStorage + JavaScript UUID generation
- Build Tool: Vite

## Key Requirements
- Groq API key input (stored in localStorage)
- No external backend - all data stored locally
- Strict exam integrity: exact-match answer evaluation only
- Unit lock logic: Unit N+1 unlocks only after Unit N passed (70% default pass mark)
- Bloom's Taxonomy-based question generation with difficulty distribution
- Mobile-responsive UI

## Completed Steps
- [ ] Project scaffolding setup
- [ ] Component architecture implementation
- [ ] Groq API integration
- [ ] localStorage management
- [ ] UI implementation
- [ ] Testing and deployment
