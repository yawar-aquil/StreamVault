import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

interface AudioTrack {
  language: string;
  url: string;
}

interface AudioTracksInputProps {
  value: string; // JSON string from DB
  onChange: (val: string) => void;
}

export function AudioTracksInput({ value, onChange }: AudioTracksInputProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);

  useEffect(() => {
    if (value) {
      try {
        setTracks(JSON.parse(value));
      } catch (e) {
        setTracks([]);
      }
    } else {
      setTracks([]);
    }
  }, [value]);

  const updateTracks = (newTracks: AudioTrack[]) => {
    setTracks(newTracks);
    onChange(JSON.stringify(newTracks));
  };

  const addTrack = () => {
    updateTracks([...tracks, { language: "Spanish", url: "" }]);
  };

  const removeTrack = (index: number) => {
    const newTracks = [...tracks];
    newTracks.splice(index, 1);
    updateTracks(newTracks);
  };

  const handleTrackChange = (index: number, key: keyof AudioTrack, newValues: string) => {
    const newTracks = [...tracks];
    newTracks[index] = { ...newTracks[index], [key]: newValues };
    updateTracks(newTracks);
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex justify-between items-center">
        <Label>Alternative Audio Streams (Multi-Language)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTrack}>
          <Plus className="w-4 h-4 mr-2" />
          Add Audio Track
        </Button>
      </div>

      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No alternative audio streams added. The Default Video URL will be used.
        </p>
      ) : (
        <div className="space-y-3">
          {tracks.map((track, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="space-y-1 w-1/3">
                <Input
                  placeholder="Language (e.g. Spanish, Japanese)"
                  value={track.language}
                  onChange={(e) => handleTrackChange(i, "language", e.target.value)}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Input
                  placeholder="Direct Video URL (.mp4)"
                  value={track.url}
                  onChange={(e) => handleTrackChange(i, "url", e.target.value)}
                />
              </div>
              <Button type="button" variant="destructive" size="icon" onClick={() => removeTrack(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
