import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileVideo, Upload, Play, Info } from "lucide-react";
import VideoPlayer from "@/components/video-player";
import { SEO } from "@/components/seo"; // Assuming SEO component exists

export default function DownloadsPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
        }
    };

    const handleSelectClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="min-h-screen bg-background pt-20 px-4 pb-12">
            <SEO title="Downloads & Offline Player - StreamVault" description="Watch your downloaded content offline." />

            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                        Offline Player
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Watch your downloaded Movies and TV Shows without an internet connection.
                        Simply select the file from your device to start playing.
                    </p>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileVideo className="h-6 w-6 text-primary" />
                            Select Local File
                        </CardTitle>
                        <CardDescription>
                            Any video file (.mp4, .mkv, .webm) saved on your device
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!videoUrl ? (
                            <div
                                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/50"
                                onClick={handleSelectClick}
                            >
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Upload className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-xl">Click to Select Video</h3>
                                        <p className="text-sm text-muted-foreground">
                                            or drag and drop your video file here
                                        </p>
                                    </div>
                                    <Button variant="outline" className="mt-4">
                                        Browse Files
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black/50 shadow-2xl">
                                    <VideoPlayer
                                        videoUrl={videoUrl}
                                        className="w-full h-full"
                                        autoplay={true}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
                                            <Play className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground truncate max-w-[200px] md:max-w-md">
                                                {selectedFile?.name}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {(selectedFile?.size ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0)} MB • Local File
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => {
                                        setVideoUrl(null);
                                        setSelectedFile(null);
                                    }}>
                                        Select Different File
                                    </Button>
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*,.mkv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-muted/20 border-border/40">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="h-4 w-4 text-sky-500" />
                                How to Download?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>1. Open any Movie or TV Show episode.</p>
                            <p>2. Look for the <span className="text-primary font-medium">Download</span> button below the video player.</p>
                            <p>3. The file will be saved to your device's Downloads folder.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/20 border-border/40">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="h-4 w-4 text-emerald-500" />
                                Offline Capabilities
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>• Plays directly from your device storage</p>
                            <p>• Zero data usage while watching local files</p>
                            <p>• Works even when you are completely offline</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
