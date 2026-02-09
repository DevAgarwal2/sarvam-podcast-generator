'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  Mic,
  Loader2,
  CheckCircle2,
  AlertCircle,
  SkipBack,
  SkipForward,
  Music,
  FileAudio
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PodcastSegment {
  speaker: string;
  speakerRole: string;
  text: string;
  tone?: string;
}

interface PodcastScript {
  title: string;
  introduction: string;
  segments: PodcastSegment[];
  conclusion: string;
}

interface AudioSegment {
  text: string;
  speaker: string;
  audioBase64: string;
  duration?: number;
}

interface TTSGeneratorProps {
  script: PodcastScript;
  language: string;
}

// All 45 speakers from bulbul:v3
const SPEAKERS = [
  { id: 'aditya', name: 'Aditya', gender: 'male', type: 'professional' },
  { id: 'shubh', name: 'Shubh', gender: 'male', type: 'warm' },
  { id: 'ritu', name: 'Ritu', gender: 'female', type: 'friendly' },
  { id: 'priya', name: 'Priya', gender: 'female', type: 'professional' },
  { id: 'neha', name: 'Neha', gender: 'female', type: 'energetic' },
  { id: 'rahul', name: 'Rahul', gender: 'male', type: 'casual' },
  { id: 'anushka', name: 'Anushka', gender: 'female', type: 'calm' },
  { id: 'abhilash', name: 'Abhilash', gender: 'male', type: 'authoritative' },
  { id: 'manisha', name: 'Manisha', gender: 'female', type: 'professional' },
  { id: 'vidya', name: 'Vidya', gender: 'female', type: 'knowledgeable' },
  { id: 'arya', name: 'Arya', gender: 'female', type: 'youthful' },
  { id: 'karun', name: 'Karun', gender: 'male', type: 'deep' },
  { id: 'hitesh', name: 'Hitesh', gender: 'male', type: 'friendly' },
  { id: 'pooja', name: 'Pooja', gender: 'female', type: 'warm' },
  { id: 'rohan', name: 'Rohan', gender: 'male', type: 'casual' },
  { id: 'simran', name: 'Simran', gender: 'female', type: 'cheerful' },
  { id: 'kavya', name: 'Kavya', gender: 'female', type: 'youthful' },
  { id: 'amit', name: 'Amit', gender: 'male', type: 'professional' },
  { id: 'dev', name: 'Dev', gender: 'male', type: 'authoritative' },
  { id: 'ishita', name: 'Ishita', gender: 'female', type: 'calm' },
  { id: 'shreya', name: 'Shreya', gender: 'female', type: 'expressive' },
  { id: 'ratan', name: 'Ratan', gender: 'male', type: 'mature' },
  { id: 'varun', name: 'Varun', gender: 'male', type: 'friendly' },
  { id: 'manan', name: 'Manan', gender: 'male', type: 'professional' },
  { id: 'sumit', name: 'Sumit', gender: 'male', type: 'casual' },
  { id: 'roopa', name: 'Roopa', gender: 'female', type: 'mature' },
  { id: 'kabir', name: 'Kabir', gender: 'male', type: 'authoritative' },
  { id: 'aayan', name: 'Aayan', gender: 'male', type: 'youthful' },
  { id: 'ashutosh', name: 'Ashutosh', gender: 'male', type: 'professional' },
  { id: 'advait', name: 'Advait', gender: 'male', type: 'calm' },
  { id: 'amelia', name: 'Amelia', gender: 'female', type: 'warm' },
  { id: 'sophia', name: 'Sophia', gender: 'female', type: 'friendly' },
  { id: 'anand', name: 'Anand', gender: 'male', type: 'mature' },
  { id: 'tanya', name: 'Tanya', gender: 'female', type: 'professional' },
  { id: 'tarun', name: 'Tarun', gender: 'male', type: 'casual' },
  { id: 'sunny', name: 'Sunny', gender: 'male', type: 'energetic' },
  { id: 'mani', name: 'Mani', gender: 'male', type: 'friendly' },
  { id: 'gokul', name: 'Gokul', gender: 'male', type: 'traditional' },
  { id: 'vijay', name: 'Vijay', gender: 'male', type: 'authoritative' },
  { id: 'shruti', name: 'Shruti', gender: 'female', type: 'calm' },
  { id: 'suhani', name: 'Suhani', gender: 'female', type: 'cheerful' },
  { id: 'mohit', name: 'Mohit', gender: 'male', type: 'casual' },
  { id: 'kavitha', name: 'Kavitha', gender: 'female', type: 'knowledgeable' },
  { id: 'rehan', name: 'Rehan', gender: 'male', type: 'expressive' },
  { id: 'soham', name: 'Soham', gender: 'male', type: 'youthful' },
  { id: 'rupali', name: 'Rupali', gender: 'female', type: 'warm' },
];

const ROLE_SPEAKERS: Record<string, string[]> = {
  'Host': ['aditya', 'shubh', 'neha', 'ritu', 'priya'],
  'Expert': ['dev', 'abhilash', 'vidya', 'manisha', 'kabir'],
  'Guest': ['rahul', 'pooja', 'simran', 'rohan', 'kavya'],
};

// Format time in mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TTSGenerator({ script, language }: TTSGeneratorProps) {
  const [selectedSpeakers, setSelectedSpeakers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize default speakers for Host, Expert, Guest
  useEffect(() => {
    const defaults: Record<string, string> = {
      'Host': 'aditya',
      'Expert': 'dev', 
      'Guest': 'rahul'
    };
    
    setSelectedSpeakers(defaults);
  }, [script]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Update progress while playing
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  // Generate audio for all segments
  const generateAudio = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    const segments: AudioSegment[] = [];
    const allSegments = [
      { speaker: 'Host', text: script.introduction },
      ...script.segments,
      { speaker: 'Host', text: script.conclusion },
    ];

    console.log(`Starting TTS generation for ${allSegments.length} segments...`);

    try {
      for (let i = 0; i < allSegments.length; i++) {
        const segment = allSegments[i];
        const speakerName = selectedSpeakers[segment.speaker] || 'aditya';
        
        console.log(`Processing segment ${i + 1}/${allSegments.length}: ${segment.speaker} (${segment.text.length} chars)`);

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: segment.text,
            language: language,
            speaker: speakerName,
            pace: 1.0,
            temperature: 0.6,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Segment ${i + 1} failed:`, errorData);
          throw new Error(`Failed to generate audio for segment ${i + 1}: ${errorData.error || 'Unknown error'}`);
        }

        const result = await response.json();
        segments.push({
          text: segment.text,
          speaker: speakerName,
          audioBase64: result.audioBase64,
        });
        
        console.log(`✓ Segment ${i + 1} complete`);

        setProgress(((i + 1) / allSegments.length) * 100);
      }
      
      console.log(`All ${segments.length} segments generated successfully`);

      setAudioSegments(segments);
      
      // Create combined audio URL
      const combinedBlob = await combineAudioBlobs(segments);
      const url = URL.createObjectURL(combinedBlob);
      setCombinedAudioUrl(url);
      
      // Setup audio element
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse WAV header and extract PCM data
  const parseWav = (uint8Array: Uint8Array) => {
    // WAV header is typically 44 bytes
    // Check for RIFF header
    const isWav = uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && 
                  uint8Array[2] === 0x46 && uint8Array[3] === 0x46;
    
    if (!isWav) {
      return { header: new Uint8Array(0), data: uint8Array };
    }
    
    // Get data size from header (bytes 40-43)
    const dataSize = uint8Array[40] | (uint8Array[41] << 8) | 
                     (uint8Array[42] << 16) | (uint8Array[43] << 24);
    
    const header = uint8Array.slice(0, 44);
    const data = uint8Array.slice(44, 44 + dataSize);
    
    return { header, data };
  };

  // Combine audio segments into single blob
  const combineAudioBlobs = async (segments: AudioSegment[]): Promise<Blob> => {
    if (segments.length === 0) {
      return new Blob([], { type: 'audio/wav' });
    }
    
    if (segments.length === 1) {
      const byteString = atob(segments[0].audioBase64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const intArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }
      return new Blob([intArray], { type: 'audio/wav' });
    }
    
    // Parse all WAV files
    const parsedWavs = segments.map(seg => {
      const byteString = atob(seg.audioBase64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const intArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }
      return parseWav(intArray);
    });
    
    // Use first file's header as base
    const baseHeader = parsedWavs[0].header;
    
    // Calculate total data size
    const totalDataSize = parsedWavs.reduce((sum, wav) => sum + wav.data.length, 0);
    
    // Create new header with updated sizes
    const newHeader = new Uint8Array(baseHeader);
    
    // Update file size (bytes 4-7) = total size - 8
    const fileSize = totalDataSize + 36;
    newHeader[4] = fileSize & 0xFF;
    newHeader[5] = (fileSize >> 8) & 0xFF;
    newHeader[6] = (fileSize >> 16) & 0xFF;
    newHeader[7] = (fileSize >> 24) & 0xFF;
    
    // Update data chunk size (bytes 40-43)
    newHeader[40] = totalDataSize & 0xFF;
    newHeader[41] = (totalDataSize >> 8) & 0xFF;
    newHeader[42] = (totalDataSize >> 16) & 0xFF;
    newHeader[43] = (totalDataSize >> 24) & 0xFF;
    
    // Combine all data
    const combinedData = new Uint8Array(totalDataSize);
    let offset = 0;
    for (const wav of parsedWavs) {
      combinedData.set(wav.data, offset);
      offset += wav.data.length;
    }
    
    // Combine header and data
    const finalAudio = new Uint8Array(newHeader.length + combinedData.length);
    finalAudio.set(newHeader, 0);
    finalAudio.set(combinedData, newHeader.length);
    
    console.log(`Combined ${segments.length} audio segments, total size: ${finalAudio.length} bytes`);
    
    return new Blob([finalAudio], { type: 'audio/wav' });
  };

  // Play/Pause toggle
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Skip backward 15 seconds
  const skipBackward = () => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, audioRef.current.currentTime - 15);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Skip forward 15 seconds
  const skipForward = () => {
    if (!audioRef.current) return;
    const newTime = Math.min(duration, audioRef.current.currentTime + 15);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Seek to position
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Download full podcast
  const downloadPodcast = () => {
    if (!combinedAudioUrl) return;
    
    const link = document.createElement('a');
    link.href = combinedAudioUrl;
    link.download = `${script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_podcast.wav`;
    link.click();
  };

  // Ensure we have exactly 3 speakers: Host, Expert, Guest
  const uniqueSpeakers = ['Host', 'Expert', 'Guest'];

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Generate Podcast Audio
          </CardTitle>
          <CardDescription>
            Select voices for each speaker and generate the complete podcast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Speaker Selection */}
          {!isComplete && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Assign Voices to Speakers
              </h4>

              <div className="space-y-4">
                {uniqueSpeakers.map((speaker, index) => {
                  const role = speaker;
                  const recommended = ROLE_SPEAKERS[role] || [];

                  return (
                    <div key={speaker} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-base font-semibold">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                            {index + 1}
                          </span>
                          {speaker}
                          <Badge variant="secondary" className="text-xs">{role}</Badge>
                        </Label>
                      </div>
                      <Select
                        value={selectedSpeakers[speaker] || ''}
                        onValueChange={(value) => 
                          setSelectedSpeakers(prev => ({ ...prev, [speaker]: value }))
                        }
                        disabled={isGenerating}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${speaker} voice...`} />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Recommended for {role}
                          </div>
                          {SPEAKERS.filter(s => recommended.includes(s.id)).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              ⭐ {s.name} ({s.gender}, {s.type})
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                            All Voices
                          </div>
                          {SPEAKERS.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.gender}, {s.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Segment Info */}
          {!isComplete && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium">Podcast Structure:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Introduction (Host)</li>
                <li>• {script.segments.length} conversation segments</li>
                <li>• Conclusion (Host)</li>
                <li className="text-primary font-medium">Total: {script.segments.length + 2} audio segments</li>
              </ul>
            </div>
          )}

          {/* Generate Button */}
          {!isComplete && (
            <Button
              onClick={generateAudio}
              disabled={isGenerating || Object.keys(selectedSpeakers).length === 0}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Audio... {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Generate Podcast Audio ({script.segments.length + 2} segments)
                </>
              )}
            </Button>
          )}

          {/* Progress */}
          {isGenerating && (
            <Progress value={progress} className="h-2" />
          )}
        </CardContent>
      </Card>

      {/* Audio Player - Only show when complete */}
      {isComplete && combinedAudioUrl && (
        <Card className="w-full border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="h-5 w-5 text-primary" />
              Now Playing
            </CardTitle>
            <CardDescription>
              {script.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Podcast Generated Successfully!</span>
            </div>

            {/* Spotify-style Player */}
            <div className="bg-muted rounded-xl p-6 space-y-4">
              {/* Album Art Placeholder */}
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center shadow-lg">
                  <Music className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipBackward}
                  className="h-12 w-12"
                >
                  <SkipBack className="h-6 w-6" />
                </Button>
                
                <Button
                  onClick={togglePlayPause}
                  size="icon"
                  className="h-16 w-16 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipForward}
                  className="h-12 w-12"
                >
                  <SkipForward className="h-6 w-6" />
                </Button>
              </div>

              {/* Control Labels */}
              <div className="flex justify-center gap-8 text-xs text-muted-foreground">
                <span>-15s</span>
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                <span>+15s</span>
              </div>
            </div>

            {/* Download Button */}
            <Button
              onClick={downloadPodcast}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <FileAudio className="mr-2 h-4 w-4" />
              Download Full Podcast
            </Button>

            {/* Individual Segments */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Music className="h-4 w-4" />
                Individual Segments
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {audioSegments.map((segment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-6">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {segment.speaker}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {SPEAKERS.find(s => s.id === segment.speaker)?.name || segment.speaker}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {segment.text.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export type { PodcastScript, PodcastSegment };
