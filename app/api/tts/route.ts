import { NextRequest, NextResponse } from 'next/server';
import { SarvamAIClient, SarvamAI } from 'sarvamai';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

interface TTSRequest {
  text: string;
  language: string;
  speaker: string;
  pace?: number;
  temperature?: number;
}

interface TTSResponse {
  success: boolean;
  audioBase64: string;
  text: string;
  speaker: string;
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

// Map speaker names to SDK format
function mapSpeaker(speaker: string): SarvamAI.TextToSpeechSpeaker {
  const speakerMap: Record<string, SarvamAI.TextToSpeechSpeaker> = {
    'aditya': SarvamAI.TextToSpeechSpeaker.Aditya,
    'anushka': SarvamAI.TextToSpeechSpeaker.Anushka,
    'abhilash': SarvamAI.TextToSpeechSpeaker.Abhilash,
    'manisha': SarvamAI.TextToSpeechSpeaker.Manisha,
    'vidya': SarvamAI.TextToSpeechSpeaker.Vidya,
    'arya': SarvamAI.TextToSpeechSpeaker.Arya,
    'karun': SarvamAI.TextToSpeechSpeaker.Karun,
    'hitesh': SarvamAI.TextToSpeechSpeaker.Hitesh,
    'ritu': SarvamAI.TextToSpeechSpeaker.Ritu,
    'priya': SarvamAI.TextToSpeechSpeaker.Priya,
    'neha': SarvamAI.TextToSpeechSpeaker.Neha,
    'rahul': SarvamAI.TextToSpeechSpeaker.Rahul,
    'pooja': SarvamAI.TextToSpeechSpeaker.Pooja,
    'rohan': SarvamAI.TextToSpeechSpeaker.Rohan,
    'simran': SarvamAI.TextToSpeechSpeaker.Simran,
    'kavya': SarvamAI.TextToSpeechSpeaker.Kavya,
    'amit': SarvamAI.TextToSpeechSpeaker.Amit,
    'dev': SarvamAI.TextToSpeechSpeaker.Dev,
    'ishita': SarvamAI.TextToSpeechSpeaker.Ishita,
    'shreya': SarvamAI.TextToSpeechSpeaker.Shreya,
    'ratan': SarvamAI.TextToSpeechSpeaker.Ratan,
    'varun': SarvamAI.TextToSpeechSpeaker.Varun,
    'manan': SarvamAI.TextToSpeechSpeaker.Manan,
    'sumit': SarvamAI.TextToSpeechSpeaker.Sumit,
    'roopa': SarvamAI.TextToSpeechSpeaker.Roopa,
    'kabir': SarvamAI.TextToSpeechSpeaker.Kabir,
    'aayan': SarvamAI.TextToSpeechSpeaker.Aayan,
    'shubh': SarvamAI.TextToSpeechSpeaker.Shubh,
    'ashutosh': SarvamAI.TextToSpeechSpeaker.Ashutosh,
    'advait': SarvamAI.TextToSpeechSpeaker.Advait,
    'amelia': SarvamAI.TextToSpeechSpeaker.Amelia,
    'sophia': SarvamAI.TextToSpeechSpeaker.Sophia,
    'anand': SarvamAI.TextToSpeechSpeaker.Anand,
    'tanya': SarvamAI.TextToSpeechSpeaker.Tanya,
    'tarun': SarvamAI.TextToSpeechSpeaker.Tarun,
    'sunny': SarvamAI.TextToSpeechSpeaker.Sunny,
    'mani': SarvamAI.TextToSpeechSpeaker.Mani,
    'gokul': SarvamAI.TextToSpeechSpeaker.Gokul,
    'vijay': SarvamAI.TextToSpeechSpeaker.Vijay,
    'shruti': SarvamAI.TextToSpeechSpeaker.Shruti,
    'suhani': SarvamAI.TextToSpeechSpeaker.Suhani,
    'mohit': SarvamAI.TextToSpeechSpeaker.Mohit,
    'kavitha': SarvamAI.TextToSpeechSpeaker.Kavitha,
    'rehan': SarvamAI.TextToSpeechSpeaker.Rehan,
    'soham': SarvamAI.TextToSpeechSpeaker.Soham,
    'rupali': SarvamAI.TextToSpeechSpeaker.Rupali,
  };
  
  return speakerMap[speaker.toLowerCase()] || SarvamAI.TextToSpeechSpeaker.Aditya;
}

export async function POST(request: NextRequest) {
  try {
    if (!SARVAM_API_KEY) {
      return NextResponse.json(
        { error: 'SARVAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json() as TTSRequest;
    const { text, language, speaker, pace = 1.0, temperature = 0.6 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: 'No language specified' },
        { status: 400 }
      );
    }

    if (!speaker) {
      return NextResponse.json(
        { error: 'No speaker specified' },
        { status: 400 }
      );
    }

    // Initialize Sarvam AI client
    const client = new SarvamAIClient({
      apiSubscriptionKey: SARVAM_API_KEY,
    });

    // Map language and speaker to SDK types
    const targetLanguage = mapToTtsLanguage(language);
    const ttsSpeaker = mapSpeaker(speaker);

    // Generate TTS
    const response = await client.textToSpeech.convert({
      text: text,
      target_language_code: targetLanguage,
      speaker: ttsSpeaker,
      pace: pace,
      temperature: temperature,
      model: 'bulbul:v3',
    });

    const result: TTSResponse = {
      success: true,
      audioBase64: response.audios[0],
      text: text,
      speaker: speaker,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating TTS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
