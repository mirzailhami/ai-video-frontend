import { useState, useEffect, useRef } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Download, Video } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface GenerateVideoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    videoTitle: string;
    onGenerate: (title: string) => Promise<void>;
    onTitleChange: (title: string) => void;
    generatedVideoUrl?: string;
    generationStatus: 'idle' | 'waiting' | 'processing' | 'completed' | 'failed';
    heygenStatus: string; // Add HeyGen status
    generationProgress: number;
    generationError?: string;
    videoDuration?: number;
    generationTime?: number;
    thumbnailUrl?: string;
}

export function GenerateVideoDialog({
    open,
    onOpenChange,
    videoTitle,
    onGenerate,
    onTitleChange,
    generatedVideoUrl,
    generationStatus,
    heygenStatus,
    generationProgress,
    generationError,
    videoDuration,
    generationTime,
    thumbnailUrl
}: GenerateVideoDialogProps) {
    const { id } = useParams<{ id: string }>();
    const [titleInput, setTitleInput] = useState(videoTitle);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!open) {
            // Reset form when dialog closes
            setTitleInput(videoTitle);
        }
    }, [open, videoTitle]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitleInput(newTitle);
        onTitleChange(newTitle);
    };

    const handleGenerate = async () => {
        await onGenerate(titleInput);
    };

    const handleDownload = async () => {
        if (!generatedVideoUrl) return;

        try {
            const response = await fetch(generatedVideoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${titleInput || 'generated-video'}.mp4`;
            document.body.appendChild(link);
            link.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to opening in new tab
            window.open(generatedVideoUrl, '_blank');
        }
    };

    // Determine the status message based on generationStatus and heygenStatus
    const getStatusMessage = () => {
        if (generationStatus === 'waiting') {
            return `Waiting in queue (${heygenStatus})...`;
        } else if (generationStatus === 'processing') {
            return `Processing video (${heygenStatus})...`;
        } else if (generationStatus === 'completed') {
            return 'Your video is ready to download';
        } else if (generationStatus === 'failed') {
            return generationError || 'Video generation failed';
        } else {
            return 'Enter a title for your video and confirm generation';
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {generationStatus === 'completed' ? 'Video Generated' :
                            generationStatus === 'failed' ? 'Generation Failed' : 'Generate Video'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {getStatusMessage()}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                    {generationStatus === 'waiting' || generationStatus === 'processing' ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>
                                    {generationStatus === 'waiting' ? `Waiting in queue (${heygenStatus})...` : `Processing video (${heygenStatus})...`}
                                </span>
                            </div>
                            <Progress value={generationProgress} />
                        </div>
                    ) : generationStatus === 'completed' ? (
                        <div className="space-y-4">
                            {generatedVideoUrl ? (
                                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        controls
                                        src={generatedVideoUrl}
                                        className="w-full h-full object-contain"
                                        poster={thumbnailUrl || undefined}
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video bg-gray-100 flex items-center justify-center rounded-lg">
                                    <span className="text-gray-500">Video not yet available</span>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="font-medium">Duration:</p>
                                    <p>{videoDuration?.toFixed(1)} seconds</p>
                                </div>
                                <div>
                                    <p className="font-medium">Generation Time:</p>
                                    <p>{generationTime?.toFixed(1)} seconds</p>
                                </div>
                                <div>
                                    <p className="font-medium">Status:</p>
                                    <p className="capitalize">{generationStatus}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Video Title</label>
                                <Input
                                    value={titleInput}
                                    onChange={handleTitleChange}
                                    placeholder="Enter video title"
                                />
                            </div>
                            {generationError && (
                                <div className="text-red-500 text-sm">{generationError}</div>
                            )}
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    {generationStatus === 'completed' ? (
                        <>
                            <AlertDialogCancel className="cursor-pointer">Close</AlertDialogCancel>
                            <Button
                                onClick={handleDownload}
                                className="rounded px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 cursor-pointer"
                                disabled={!generatedVideoUrl}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download Video
                            </Button>
                        </>
                    ) : generationStatus === 'failed' ? (
                        <>
                            <AlertDialogCancel className="cursor-pointer">Close</AlertDialogCancel>
                            <Button onClick={handleGenerate} className="cursor-pointer">
                                <Video className="mr-2 h-4 w-4" />
                                Retry
                            </Button>
                        </>
                    ) : generationStatus !== 'idle' ? (
                        <AlertDialogCancel className="cursor-pointer">
                            Close
                        </AlertDialogCancel>
                    ) : (
                        <>
                            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                            <Button
                                className="rounded px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 cursor-pointer"
                                onClick={handleGenerate}
                                disabled={!titleInput}
                            >
                                <Video className="mr-2 h-4 w-4" />
                                Generate
                            </Button>
                        </>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}