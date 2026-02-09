# Sarvam Podcast Generator

Transform PDF documents into engaging multi-speaker podcasts using Sarvam AI APIs.

## Features

- 📄 **PDF Document Intelligence** - Extract text from PDFs using Sarvam's Document Intelligence API
- 📝 **AI Script Generation** - Convert extracted content into conversational podcast scripts using Sarvam-M
- 🎙️ **Multi-Speaker TTS** - Generate audio with 45 different voices using Sarvam's Text-to-Speech (bulbul:v3)
- 🇮🇳 **Indian Languages** - Support for 11 Indian languages including Hindi, Bengali, Tamil, Telugu, and more
- ✨ **Batch Processing** - Handles large PDFs (20+ pages) by splitting into chunks
- 🎨 **Clean UI** - Minimal, responsive interface inspired by Sarvam's design

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **AI APIs**: Sarvam AI SDK
- **Runtime**: Bun

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/DevAgarwal2/sarvam-podcast-generator.git
cd sarvam-podcast-generator
```

2. Install dependencies:
```bash
bun install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your Sarvam API key to `.env`:
```
SARVAM_API_KEY=your_api_key_here
```

Get your API key from: https://dashboard.sarvam.ai

5. Run the development server:
```bash
bun run dev
```

6. Open http://localhost:3000

## Usage

1. **Upload PDF** - Drag & drop or select a PDF file
2. **Select Language** - Choose from 11 Indian languages
3. **Extract Content** - AI processes the document
4. **Generate Script** - Creates conversational script with Host, Expert, and Guest
5. **Select Voices** - Choose from 45 different speakers
6. **Generate Audio** - Creates combined podcast audio file

## API Endpoints

- `POST /api/extract` - Document Intelligence for PDF extraction
- `POST /api/generate-script` - Sarvam-M for script generation
- `POST /api/tts` - Text-to-Speech for audio generation

## License

MIT

## Powered By

- [Sarvam AI](https://www.sarvam.ai/) - Document Intelligence, Sarvam-M, Text-to-Speech
