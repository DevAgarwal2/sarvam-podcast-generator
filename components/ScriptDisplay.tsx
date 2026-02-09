'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mic, User, BookOpen } from 'lucide-react';

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

interface ScriptDisplayProps {
  script: PodcastScript | null;
  isGenerating: boolean;
}

export function ScriptDisplay({ script, isGenerating }: ScriptDisplayProps) {
  if (isGenerating) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 animate-pulse" />
            Generating Podcast Script
          </CardTitle>
          <CardDescription>
            AI is analyzing your document and creating an engaging podcast script...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!script) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Generated Podcast Script
        </CardTitle>
        <CardDescription>
          {script.title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Introduction */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Introduction</span>
              </div>
              <p className="text-sm leading-relaxed">{script.introduction}</p>
            </div>

            <Separator />

            {/* Segments */}
            <div className="space-y-4">
              {script.segments.map((segment, index) => (
                <div
                  key={index}
                  className="border-l-2 border-primary/30 pl-4 py-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{segment.speaker}</span>
                    <Badge variant="secondary" className="text-xs">
                      {segment.speakerRole}
                    </Badge>
                    {segment.tone && (
                      <Badge variant="outline" className="text-xs">
                        {segment.tone}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed pl-6">{segment.text}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Conclusion */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Conclusion</span>
              </div>
              <p className="text-sm leading-relaxed">{script.conclusion}</p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { PodcastScript, PodcastSegment };
