# ExamCraft AI - CBT Platform

A university-grade Computer-Based Test (CBT) examination platform. This React SPA features AI-powered question generation using the Groq API, timed exams, strict answer evaluation, and a robust "Practice Lab" for importing and verifying AOC (Area of Concentration) materials.

## Features

✅ **Subject & Unit Management** - Organize study content hierarchically  
✅ **AI Question Generation** - Uses Groq API to generate PhD-level questions from course material  
✅ **Practice Lab (AOC)** - Import "messy" question sets, verify them with AI, and practice independently  
✅ **Evidence-Based Extraction** - AI must provide "Source Quotes" (direct evidence) for every answer it generates  
✅ **Confidence Scores** - AI-calculated accuracy ratings (0-100%) for every imported question  
✅ **Manual Overrule** - Instantly correct or edit AI-generated questions and answers  
✅ **Dual-Pass Verification** - Two-stage AI processing (Extraction + Strict Validation) for maximum accuracy  
✅ **Exam Interface** - Full-featured exam with timer, question navigation, and flagging  
✅ **Strict Answer Evaluation** - Exact-match only (no semantic matching)  
✅ **Unit Progression** - Automatic unlock logic based on pass/fail status  
✅ **Results System** - Detailed performance review with Bloom's Taxonomy breakdown and source evidence display  
✅ **Local Storage** - No backend required - all data stored in browser with functional persistence  
✅ **Dark Mode** - Built-in dark theme toggle  

## Tech Stack

- **Frontend**: React 18+ with hooks
- **Styling**: Tailwind CSS 3.x
- **AI API**: Groq API (Llama 3.3 70B model)
- **Build Tool**: Vite
- **Persistence**: LocalStorage with functional state synchronization

## New: Practice Lab (AOC)

The Practice Lab is designed for students who have past questions or specific material they want to master.

### 1. Evidence-Backed Import
When you paste your questions, the AI performs a **Dual-Check**:
*   **Pass 1**: Extracts questions, answers, and formatting.
*   **Pass 2**: Validates every answer against your original text and provides a **Confidence Score**.
*   **Source Quotes**: The AI identifies the exact sentence in your text that proves each answer.

### 2. Standalone Practice Sets
Every import or transformation (e.g., converting to MCQ) creates a **standalone "Practice Set"**. You can:
*   Keep the original "as-pasted" version.
*   Generate an MCQ version of the same questions.
*   Practice each version independently without affecting other data.

### 3. Fixing Mistakes
If the AI encounters messy text and picks the wrong answer:
*   Review the **Confidence Score** (Red/Yellow/Green).
*   Read the **Validation Notes** provided by the AI.
*   Use the **"Fix Answer"** button to manually overrule the AI and correct the system's knowledge.

## Installation

1. **Clone or extract the project**
   ```bash
   cd examcraft-ai-main
   ```

2. **Create .env file with Groq API key**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Groq API key (get one free at [console.groq.com/keys](https://console.groq.com/keys)):
   ```
   VITE_GROQ_API_KEY=gsk_your_api_key_here
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Usage

### Keyboard Shortcuts
- **← Arrow Left**: Previous question
- **→ Arrow Right**: Next question
- **Esc**: Submit exam

### API Rate Limits (Error 429)
If you see a "Rate Limit" message:
- The Groq API has a limit on tokens processed per minute.
- Wait **60 seconds** and try again.
- For very large pastes, try importing in **smaller groups** (10-15 questions at a time).

## Question Generation Specifications

- **Distribution**: 30% Easy, 40% Medium, 30% Hard
- **Types**: Multiple Choice, Fill-in-the-Blank, Yes/No, True/False
- **Bloom's Levels**: Knowledge, Comprehension, Application, Analysis, Synthesis, Evaluation
- **Accuracy**: AI-backed evidence extraction with manual overrule capability

## Data Storage

All data is stored in browser's localStorage. The app uses **Functional State Updates** to ensure that data is never lost or overwritten during browser reloads or rapid clicks.

## License

MIT

## Support

For issues, feature requests, or questions:
1. Check [console.groq.com/limits](https://console.groq.com/limits) to verify your API status.
2. Review the troubleshooting section in the app settings.
3. Ensure you are using the latest version of Node.js.
