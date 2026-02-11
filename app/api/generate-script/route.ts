import { NextRequest, NextResponse } from 'next/server';
import { SarvamAIClient, SarvamAI } from 'sarvamai';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

interface GenerateScriptRequest {
  extractedText: string;
  language: string;
  topic?: string;
}

interface GenerateScriptResponse {
  success: boolean;
  script: PodcastScript;
  language: string;
}

interface PodcastScript {
  title: string;
  introduction: string;
  segments: PodcastSegment[];
  conclusion: string;
}

interface PodcastSegment {
  speaker: string;
  speakerRole: string;
  text: string;
  tone?: string;
}

// Map language codes to TTS supported languages
function mapToTtsLanguage(code: string): SarvamAI.TextToSpeechLanguage {
  const languageMap: Record<string, SarvamAI.TextToSpeechLanguage> = {
    'hi-IN': SarvamAI.TextToSpeechLanguage.HiIn,
    'en-IN': SarvamAI.TextToSpeechLanguage.EnIn,
    'bn-IN': SarvamAI.TextToSpeechLanguage.BnIn,
    'gu-IN': SarvamAI.TextToSpeechLanguage.GuIn,
    'kn-IN': SarvamAI.TextToSpeechLanguage.KnIn,
    'ml-IN': SarvamAI.TextToSpeechLanguage.MlIn,
    'mr-IN': SarvamAI.TextToSpeechLanguage.MrIn,
    'od-IN': SarvamAI.TextToSpeechLanguage.OdIn,
    'pa-IN': SarvamAI.TextToSpeechLanguage.PaIn,
    'ta-IN': SarvamAI.TextToSpeechLanguage.TaIn,
    'te-IN': SarvamAI.TextToSpeechLanguage.TeIn,
  };
  
  return languageMap[code] || SarvamAI.TextToSpeechLanguage.EnIn;
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'hi-IN': 'Hindi',
    'en-IN': 'English',
    'bn-IN': 'Bengali',
    'gu-IN': 'Gujarati',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'mr-IN': 'Marathi',
    'od-IN': 'Odia',
    'pa-IN': 'Punjabi',
    'ta-IN': 'Tamil',
    'te-IN': 'Telugu',
  };
  
  return names[code] || 'English';
}

function generateSystemPrompt(language: string, languageName: string): string {
  return `You are an expert podcast script writer specializing in creating engaging, conversational podcast episodes in ${languageName} (${language}).

Your task is to transform the provided document content into a podcast script featuring 2-3 speakers having a natural, engaging discussion about the topic.

Guidelines:
1. Create a compelling title for the podcast episode
2. Write an engaging introduction that hooks the listener
3. Structure the content into 4-6 conversational segments
4. Use multiple speakers (Host, Expert, Guest) to create dynamic discussion
5. Include natural conversation elements: questions, reactions, transitions, occasional humor
6. Each speaker should have a distinct voice/personality
7. Make complex topics accessible through analogies and examples
8. Write in ${languageName} language naturally
9. End with a memorable conclusion and call-to-action

CRITICAL JSON REQUIREMENTS:
- Output MUST be valid JSON
- Escape all quotes in text with backslash: \"
- Escape newlines with \\n
- No trailing commas
- Use double quotes for all strings

Output Format (JSON):
{
  "title": "Episode Title",
  "introduction": "Host's opening monologue...",
  "segments": [
    {
      "speaker": "Host",
      "speakerRole": "Podcast Host",
      "text": "Welcome everyone...",
      "tone": "enthusiastic"
    },
    {
      "speaker": "Expert",
      "speakerRole": "Subject Matter Expert",
      "text": "Thanks for having me...",
      "tone": "knowledgeable"
    }
  ],
  "conclusion": "Final thoughts and outro..."
}

Keep the conversation natural, informative, and entertaining. Each segment should be 50-150 words.`;
}

async function generatePodcastScript(
  client: SarvamAIClient,
  extractedText: string,
  language: string
): Promise<PodcastScript> {
  const languageName = getLanguageName(language);
  const systemPrompt = generateSystemPrompt(language, languageName);
  
  const userPrompt = `Based on the following document content, create an engaging podcast script in ${languageName}:

DOCUMENT CONTENT:
${extractedText.substring(0, 8000)}

Create a podcast script with multiple speakers discussing this topic. Make it conversational, informative, and engaging.`;

  const response = await client.chat.completions({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Failed to generate script');
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Try to find JSON object - be more specific
    const objectMatch = content.match(/\{[\s\S]*"title"[\s\S]*"conclusion"[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  }

  // Sanitize JSON string
  jsonStr = jsonStr.trim();
  // Remove any BOM or special characters at start
  jsonStr = jsonStr.replace(/^\uFEFF/, '');
  
  try {
    const script = JSON.parse(jsonStr) as PodcastScript;
    return script;
  } catch (error) {
    console.error('Failed to parse script JSON:', error);
    console.error('JSON string preview:', jsonStr.substring(0, 200));
    // Fallback: create a basic script structure
    return createFallbackScript(extractedText, languageName);
  }
}

function createFallbackScript(content: string, languageName: string): PodcastScript {
  // Split content into chunks for different speakers
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const chunks = [];

  for (let i = 0; i < sentences.length; i += 3) {
    chunks.push(sentences.slice(i, i + 3).join('. ') + '.');
  }

  const segments: PodcastSegment[] = [];
  const speakers = ['Host', 'Expert', 'Guest'];
  const roles = ['Podcast Host', 'Subject Matter Expert', 'Special Guest'];

  chunks.slice(0, 6).forEach((chunk, index) => {
    segments.push({
      speaker: speakers[index % 3],
      speakerRole: roles[index % 3],
      text: chunk.trim(),
      tone: index % 3 === 0 ? 'enthusiastic' : index % 3 === 1 ? 'knowledgeable' : 'curious',
    });
  });

  return {
    title: `Podcast Episode on ${languageName} Topic`,
    introduction: `Welcome to today's episode where we explore an interesting topic together.`,
    segments,
    conclusion: `Thank you for listening to today's episode. Join us next time for more insightful discussions!`,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!SARVAM_API_KEY) {
      return NextResponse.json(
        { error: 'SARVAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json() as GenerateScriptRequest;
    const { extractedText, language, topic } = body;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No extracted text provided' },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: 'No language specified' },
        { status: 400 }
      );
    }

    // Initialize Sarvam AI client
    const client = new SarvamAIClient({
      apiSubscriptionKey: SARVAM_API_KEY,
    });

    // Generate podcast script
    const script = await generatePodcastScript(client, extractedText, language);

    const result: GenerateScriptResponse = {
      success: true,
      script,
      language,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
