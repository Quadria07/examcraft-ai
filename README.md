# ExamCraft AI - CBT Platform

A university-grade Computer-Based Test (CBT) examination platform. This React SPA features AI-powered question generation using the Groq API, timed exams, strict answer evaluation, and unit progression logic.

## Features

✅ **Subject & Unit Management** - Organize study content hierarchically  
✅ **AI Question Generation** - Uses Groq API to generate PhD-level questions from course material  
✅ **Exam Interface** - Full-featured exam with timer, question navigation, and flagging  
✅ **Strict Answer Evaluation** - Exact-match only (no semantic matching)  
✅ **Unit Progression** - Automatic unlock logic based on pass/fail status  
✅ **Results System** - Detailed performance review with Bloom's Taxonomy breakdown  
✅ **Responsive Design** - Works seamlessly on desktop, tablet, and mobile  
✅ **Dark Mode** - Built-in dark theme toggle  
✅ **Local Storage** - No backend required - all data stored in browser  
✅ **Exam Progress Persistence** - Save and resume interrupted exams  
✅ **Keyboard Shortcuts** - Arrow keys for navigation, Esc for submit  
✅ **Question Search/Filter** - Search questions in real-time during exam  

## Tech Stack

- **Frontend**: React 18+ with hooks
- **Styling**: Tailwind CSS 3.x
- **AI API**: Groq API (openai/gpt-oss-120b model)
- **Build Tool**: Vite
- **Build**: ES Modules

## Prerequisites

- Node.js 16+ and npm
- Groq API key (free tier available at [console.groq.com/keys](https://console.groq.com/keys))

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

5. **Open in browser**
   - Navigate to `http://localhost:5173`

## Usage

### Exam Features

#### Keyboard Shortcuts
- **← Arrow Left**: Previous question
- **→ Arrow Right**: Next question
- **Esc**: Submit exam

#### Progress Persistence
- Your exam progress is **automatically saved every 10 seconds** to localStorage
- If you close the browser or internet disconnects, you can **resume later**
- When you return to the app, you'll see a dialog to resume or discard the interrupted exam
- Your responses, flags, and current question position are preserved
- Click **"Save & Exit"** button during exam to manually save and exit

#### Question Search/Filter
- Use the search box in the **question palette** (right sidebar) to find questions quickly
- Search matches question text in real-time
- Navigate through filtered results with Previous/Next buttons
- Search is helpful when reviewing specific topics during an exam

### Getting Started

1. **Add a Subject**
   - Click "Add New Subject" on the dashboard
   - Enter subject code and name (e.g., "GST103 - Computer in Society")

2. **Create Units**
   - Open a subject
   - Click "Add Unit" to create Unit 1, Unit 2, etc.
   - First unit starts in "unlocked" status

3. **Generate Questions**
   - In a unit, paste course material (minimum 100 words)
   - Click "Generate Exam Questions"
   - AI generates 20 questions (12 MCQ, 6 FITB, 2 Short Answer)

4. **Take Exam**
   - Click "Start Exam" in a unit
   - Answer questions one at a time
   - Navigate with Previous/Next or question palette
   - Flag questions for review
   - Submit when ready

5. **Review Results**
   - See score and pass/fail status
   - Review all questions with answers
   - View performance breakdown by difficulty
   - Proceed to next unit if passed (70% required by default)

## Configuration

### Environment Variables (in `.env` file)

- **VITE_GROQ_API_KEY**: Required for question generation. Get from [console.groq.com/keys](https://console.groq.com/keys)

### Default Settings (in Settings page)

- **Pass Mark**: 70% (adjustable: 50%, 60%, 70%, 80%)
- **Timer**: Optional, default 30 minutes (adjustable 5-120 minutes)
- **Dark Mode**: Toggle on/off

## Question Generation

The AI generates questions using Groq's GPT-OSS 120B model with these specifications:

- **Distribution**: 30% Easy, 40% Medium, 30% Hard
- **Types**: Multiple Choice, Fill-in-the-Blank, Short Answer
- **Bloom's Levels**: Knowledge, Comprehension, Application, Analysis, Synthesis, Evaluation
- **Accuracy**: Strict exact-match evaluation (case-insensitive for FITB/Short Answer)
- **Source**: Questions derived ONLY from provided material

## Answer Evaluation Rules

### Multiple Choice (MCQ)
- Case-insensitive exact match
- No partial credit

### Fill-in-the-Blank (FITB)
- Exact match required
- Case-insensitive
- Leading/trailing whitespace trimmed
- No synonym acceptance (e.g., "LAN" ≠ "Local Area Network")

### Short Answer
- Exact match required
- Strict evaluation for academic integrity

## Data Storage

All data is stored in browser's localStorage:

```
{
  "subjects": [
    {
      "id": "uuid",
      "name": "GST103",
      "units": [
        {
          "id": "uuid",
          "title": "Unit 1",
          "material": "course text...",
          "questions": [...],
          "attempts": [...],
          "status": "passed|failed|unlocked|locked",
          "bestScore": 85
        }
      ]
    }
  ],
  "settings": {
    "passMarkPercent": 70,
    "darkMode": false
  }
}
```

## Unit Progression Logic

- **Unit 1**: Starts "unlocked"
- **Subsequent Units**: Start "locked"
- **Unlock Trigger**: Pass the previous unit (score ≥ pass mark)
- **Retakes**: Passed units can be retaken but remain unlocked
- **Failed Units**: Can be retaken immediately

## Building for Production

```bash
npm run build
```

Output is in `dist/` directory. Deploy to any static hosting:
- Vercel
- Netlify  
- GitHub Pages
- AWS S3 + CloudFront

## Troubleshooting

### Questions not generating?
- Check `.env` file has `VITE_GROQ_API_KEY` set with a valid API key
- Verify API key is valid at https://console.groq.com/keys
- Ensure material is at least 100 words
- Check browser console for error messages (F12)

### Timer not working?
- Refresh page if timer appears stuck
- Timer requires Enable Timer toggle before exam starts

### Data not persisting?
- Check if localStorage is enabled in browser
- Check if browser is in private/incognito mode
- Verify browser allows localStorage for domain

## Performance Tips

- Maximum 20 questions per exam recommended
- Use separate subjects for different courses
- Keep material inputs focused on core topics
- Disable timer for untimed practice

## API Limits

Groq's free tier includes:
- 30 requests per minute
- 14,000 tokens per minute
- Sufficient for most education use cases

## Development

### Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx
│   ├── SubjectPage.jsx
│   ├── MaterialInput.jsx
│   ├── ExamScreen.jsx
│   ├── QuestionCard.jsx
│   ├── ResultsPage.jsx
│   ├── Settings.jsx
│   ├── Timer.jsx
│   └── Header.jsx
├── hooks/
│   └── useLocalStorage.js
├── utils/
│   └── data.js
├── App.jsx
├── main.jsx
└── index.css
```

## License

MIT

## Support

For issues, feature requests, or questions:
1. Check the Troubleshooting section above
2. Review Groq API documentation: https://console.groq.com/docs
3. Ensure Node.js and npm are up to date

## Contributing

Feel free to fork, modify, and enhance!
