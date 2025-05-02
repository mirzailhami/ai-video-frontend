import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Combobox } from './ui/combobox';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuItem } from './ui/sidebar';
import {
  Video,
  Clock,
  ArrowLeft,
  Image as ImageIcon,
  RefreshCw,
  Upload as UploadIcon,
  MessageSquare,
  Loader2,
  Film
} from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import { GenerateVideoDialog } from './GenerateVideoDialog';
import axios from 'axios';

interface Scene {
  script: string;
  image_prompt: string;
  image_path: string;
}

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  language: string;
  preview_audio: string;
}

interface VideoDetails {
  generationStatus: 'idle' | 'waiting' | 'processing' | 'completed' | 'failed';
  generatedVideoUrl: string;
  videoDuration: number;
  thumbnailUrl: string;
  generationTime: number;
  heygenStatus: string;
  generationProgress: number;
}

interface HeyGenVideo {
  video_id: string;
  status: string;
  video_title: string;
  created_at: number;
  type: string;
  folder_id: string;
}

interface SceneEditorProps {
  voices: Voice[];
  heygenVideos: HeyGenVideo[];
  setError: (message: string) => void;
}

const mockVoices: Voice[] = [
  { voice_id: "voice1", name: "Alice", gender: "Female", language: "English", preview_audio: "https://example.com/alice.mp3" },
  { voice_id: "voice2", name: "Bob", gender: "Male", language: "English", preview_audio: "https://example.com/bob.mp3" },
  { voice_id: "voice3", name: "Carlos", gender: "Male", language: "Spanish", preview_audio: "https://example.com/carlos.mp3" },
];

function SceneEditor({ voices = mockVoices, heygenVideos, setError }: SceneEditorProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lastSaved, setLastSaved] = useState<string>('Just now');
  const [editedScenes, setEditedScenes] = useState<Scene[]>([]);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [voiceId, setVoiceId] = useState<string>('');
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'waiting' | 'processing' | 'completed' | 'failed'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [generationTime, setGenerationTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [generationError, setGenerationError] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [heygenStatus, setHeygenStatus] = useState<string>('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [shouldShowDialog, setShouldShowDialog] = useState<boolean>(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const [scriptInput, setScriptInput] = useState<string>('');
  const [promptInput, setPromptInput] = useState<string>('');
  const debouncedScript = useDebounce(scriptInput, 100);
  const debouncedPrompt = useDebounce(promptInput, 100);
  const debouncedScenes = useDebounce(hasLoaded ? editedScenes : [], 1000);

  const videoDetails: VideoDetails = useMemo(() => ({
    generationStatus,
    generatedVideoUrl,
    videoDuration,
    thumbnailUrl,
    generationTime,
    heygenStatus,
    generationProgress,
  }), [generationStatus, generatedVideoUrl, videoDuration, thumbnailUrl, generationTime, heygenStatus, generationProgress]);

  const debouncedVideoDetails = useDebounce(videoDetails, 1000);

  const languages = useMemo(() => Array.from(new Set(voices.map((v) => v.language))).sort(), [voices]);
  const availableVoices = useMemo(
    () => voices.filter((v) => v.language === selectedLanguage).sort((a, b) => a.name.localeCompare(b.name)),
    [voices, selectedLanguage]
  );

  const videoOptions = useMemo(
    () =>
      heygenVideos.map((video) => ({
        value: video.video_id,
        label: `${video.video_title} (${new Date(video.created_at * 1000).toLocaleDateString()})`,
      })),
    [heygenVideos]
  );

  useEffect(() => {
    if (availableVoices.length > 0) {
      setVoiceId(availableVoices[0].voice_id);
    }
  }, [availableVoices]);

  useEffect(() => {
    if (heygenVideos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(heygenVideos[0].video_id);
    }
  }, [heygenVideos, selectedVideoId]);

  const fetchVideoStatus = useCallback(async (currentVideoId: string) => {
    try {
      const response = await axios.get<{
        video_url: string;
        duration: number;
        thumbnail_url: string;
        status: string;
        video_id: string;
        created_at: number | null;
      }>(
        `${import.meta.env.VITE_API_URL}/api/video/status/${currentVideoId}`
      );
      const { video_url, duration, thumbnail_url, status, created_at } = response.data;
      setHeygenStatus(status || 'pending');
      setGenerationStatus(status === 'pending' || status === 'waiting' ? 'waiting' : status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing');
      setGeneratedVideoUrl(video_url || '');
      setVideoDuration(duration || 0);
      setThumbnailUrl(thumbnail_url || '');
      setGenerationProgress(status === 'completed' ? 100 : status === 'failed' ? 0 : 50);

      if (status === 'completed' && created_at) {
        const currentTime = Math.floor(Date.now() / 1000);
        const generationDuration = currentTime - created_at;
        setGenerationTime(generationDuration);
      }

      if (status === 'failed') {
        setGenerationError('Video generation failed');
      }
      if (shouldShowDialog) {
        setIsGenerateDialogOpen(true);
      }
      return status;
    } catch (error: any) {
      console.error('Failed to fetch video status:', error);
      setGenerationStatus('failed');
      setGenerationError(error.response?.data?.detail || 'Failed to fetch video status');
      if (shouldShowDialog) {
        setIsGenerateDialogOpen(true);
      }
      return 'failed';
    }
  }, [shouldShowDialog]);

  const fetchVideoDetails = useCallback(async (videoId: string) => {
    try {
      const response = await axios.get<{
        video_url: string;
        duration: number;
        thumbnail_url: string;
        status: string;
        video_id: string;
        created_at: number | null;
      }>(
        `${import.meta.env.VITE_API_URL}/api/video/status/${videoId}`
      );
      const { video_url, duration, thumbnail_url, status, created_at } = response.data;
      setHeygenStatus(status || 'pending');
      setGenerationStatus(status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'idle');
      setGeneratedVideoUrl(video_url || '');
      setVideoDuration(duration || 0);
      setThumbnailUrl(thumbnail_url || '');
      setGenerationProgress(status === 'completed' ? 100 : 0);

      if (status === 'completed' && created_at) {
        const currentTime = Math.floor(Date.now() / 1000);
        const generationDuration = currentTime - created_at;
        setGenerationTime(generationDuration);
      }

      if (status === 'failed') {
        setGenerationError('Video generation failed');
      }
    } catch (error: any) {
      console.error('Failed to fetch video details:', error);
      setGenerationStatus('failed');
      setGenerationError(error.response?.data?.detail || 'Failed to fetch video details');
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setError('Invalid project ID.');
      navigate('/');
      return;
    }

    const data = localStorage.getItem(id);
    if (data) {
      const parsedData = JSON.parse(data);
      console.log(`SceneEditor.tsx: Loaded project with ID ${id}`, parsedData);
      const { scenes, title, logo_data_url, language, voice_id, last_saved, video_id, dialog_closed, video_details } = parsedData;
      if (!scenes || scenes.length === 0) {
        setError('No scenes found for this project. Please upload a presentation again.');
        navigate('/');
        return;
      }
      setEditedScenes(scenes || []);
      setVideoTitle(title || '');
      setLogoDataUrl(logo_data_url || null);
      setSelectedLanguage(language || 'English');
      setVoiceId(voice_id || '');
      if (scenes && scenes.length > 0) {
        setScriptInput(scenes[0]?.script || '');
        setPromptInput(scenes[0]?.image_prompt || '');
      }
      setLastSaved(last_saved ? new Date(last_saved).toLocaleTimeString() : 'Just now');
      setVideoId(video_id || null);
      setShouldShowDialog(dialog_closed !== true);

      if (video_details) {
        setGenerationStatus(video_details.generationStatus || 'idle');
        setGeneratedVideoUrl(video_details.generatedVideoUrl || '');
        setVideoDuration(video_details.videoDuration || 0);
        setThumbnailUrl(video_details.thumbnailUrl || '');
        setGenerationTime(video_details.generationTime || 0);
        setHeygenStatus(video_details.heygenStatus || '');
        setGenerationProgress(video_details.generationProgress || 0);

        if (video_details.heygenStatus === 'completed' && video_id) {
          setVideoId(null);
          const updatedData = { ...parsedData, video_id: null };
          localStorage.setItem(id, JSON.stringify(updatedData));
        }
      }

      if (logo_data_url) {
        fetch(logo_data_url)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], 'logo.png', { type: blob.type });
            setLogo(file);
          });
      }

      setHasLoaded(true);
    } else {
      setError('Project not found.');
      navigate('/');
    }
  }, [id, navigate, setError]);

  useEffect(() => {
    if (!videoId || !hasLoaded) return;

    fetchVideoStatus(videoId);

    const interval = setInterval(async () => {
      const status = await fetchVideoStatus(videoId);
      if (status === 'completed' || status === 'failed') {
        clearInterval(interval);
        setVideoId(null);
        setShouldShowDialog(true);
        if (id) {
          const data = localStorage.getItem(id);
          if (data) {
            const parsedData = JSON.parse(data);
            parsedData.video_id = null;
            parsedData.dialog_closed = false;
            parsedData.video_details = videoDetails;
            localStorage.setItem(id, JSON.stringify(parsedData));
          }
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [videoId, hasLoaded, fetchVideoStatus, id, videoDetails]);

  const debouncedTitle = useDebounce(videoTitle, 1000);
  const debouncedLogoDataUrl = useDebounce(logoDataUrl, 1000);
  const debouncedLanguage = useDebounce(selectedLanguage, 1000);
  const debouncedVoiceId = useDebounce(voiceId, 1000);
  const debouncedVideoId = useDebounce(videoId, 1000);
  const debouncedShouldShowDialog = useDebounce(shouldShowDialog, 1000);

  useEffect(() => {
    if (id && hasLoaded && debouncedScenes.length > 0) {
      const saveData = {
        id,
        title: debouncedTitle,
        scenes: debouncedScenes,
        logo_data_url: debouncedLogoDataUrl,
        language: debouncedLanguage,
        voice_id: debouncedVoiceId,
        video_id: debouncedVideoId,
        dialog_closed: !debouncedShouldShowDialog,
        video_details: debouncedVideoDetails,
        last_saved: new Date().toISOString(),
      };

      localStorage.setItem(id, JSON.stringify(saveData));
      setLastSaved(new Date().toLocaleTimeString());
    }
  }, [id, hasLoaded, debouncedScenes, debouncedTitle, debouncedLogoDataUrl, debouncedLanguage, debouncedVoiceId, debouncedVideoId, debouncedShouldShowDialog, debouncedVideoDetails]);

  useEffect(() => {
    if (editedScenes.length > 0) {
      setEditedScenes((prevScenes) => {
        const newScenes = [...prevScenes];
        newScenes[selectedSceneIndex].script = debouncedScript;
        newScenes[selectedSceneIndex].image_prompt = debouncedPrompt;
        return newScenes;
      });
    }
  }, [debouncedScript, debouncedPrompt, selectedSceneIndex]);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && !selectedFile.type.startsWith('image/')) {
      setError('Please select an image file for the logo.');
      return;
    }
    setLogo(selectedFile || null);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setLogoDataUrl(null);
      setLogo(null);
    }
  }, [setError]);

  const handleSelectScene = useCallback((index: number) => {
    setSelectedSceneIndex(index);
    setScriptInput(editedScenes[index]?.script || '');
    setPromptInput(editedScenes[index]?.image_prompt || '');
  }, [editedScenes]);

  const handleRegenerateImage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= editedScenes.length) {
        setError('Invalid scene index.');
        return;
      }

      try {
        const response = await axios.post<{ image_path: string }>(
          `${import.meta.env.VITE_API_URL}/api/scenes/generate_images`,
          { prompt: editedScenes[index].image_prompt }
        );

        const newImagePath = `${response.data.image_path}?t=${Date.now()}`;

        setEditedScenes((prevScenes) => {
          const newScenes = [...prevScenes];
          newScenes[index] = {
            ...newScenes[index],
            image_path: newImagePath,
          };
          if (id && hasLoaded) {
            const saveData = {
              id,
              title: videoTitle,
              scenes: newScenes,
              logo_data_url: logoDataUrl,
              language: selectedLanguage,
              voice_id: voiceId,
              video_id: videoId,
              dialog_closed: !shouldShowDialog,
              video_details: videoDetails,
              last_saved: new Date().toISOString(),
            };
            localStorage.setItem(id, JSON.stringify(saveData));
            setLastSaved(new Date().toLocaleTimeString());
          }
          return newScenes;
        });

        setError('Image regenerated successfully.');
      } catch (error) {
        console.error('Failed to regenerate image:', error);
        setError('Failed to regenerate image. Please try again.');
      }
    },
    [id, hasLoaded, editedScenes, videoTitle, logoDataUrl, selectedLanguage, voiceId, videoId, shouldShowDialog, videoDetails, setError]
  );

  const handleGenerateClick = () => {
    if (!voiceId) {
      setError('Please select a voice');
      return;
    }
    if (!logoDataUrl) {
      setError('Please upload a logo');
      return;
    }

    setIsGenerateDialogOpen(true);
    setGenerationStatus('idle');
    setGeneratedVideoUrl('');
    setThumbnailUrl('');
    setVideoDuration(0);
    setGenerationTime(0);
    setGenerationError('');
    setGenerationProgress(0);
    setHeygenStatus('');
    setVideoId(null);
    setShouldShowDialog(true);
    if (id) {
      const data = localStorage.getItem(id);
      if (data) {
        const parsedData = JSON.parse(data);
        parsedData.dialog_closed = false;
        parsedData.video_details = null;
        parsedData.video_id = null;
        localStorage.setItem(id, JSON.stringify(parsedData));
      }
    }
  };

  const handleViewStatusClick = () => {
    setIsGenerateDialogOpen(true);
    setShouldShowDialog(true);
    if (id) {
      const data = localStorage.getItem(id);
      if (data) {
        const parsedData = JSON.parse(data);
        parsedData.dialog_closed = false;
        localStorage.setItem(id, JSON.stringify(parsedData));
      }
    }
  };

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    fetchVideoDetails(videoId);
    setIsGenerateDialogOpen(true);
    setShouldShowDialog(true);
    if (id) {
      const data = localStorage.getItem(id);
      if (data) {
        const parsedData = JSON.parse(data);
        parsedData.dialog_closed = false;
        localStorage.setItem(id, JSON.stringify(parsedData));
      }
    }
  };

  const handleGenerateVideo = async (title: string): Promise<void> => {
    setGenerationStatus('waiting');
    setGenerationProgress(0);
    setGenerationError('');
    const isMounted = true;

    try {
      if (!logoDataUrl) {
        throw new Error('Logo is required');
      }
      const response = await fetch(logoDataUrl);
      const blob = await response.blob();
      const logoFile = new File([blob], 'logo.png', { type: blob.type });

      const formData = new FormData();
      formData.append('scenes', JSON.stringify(editedScenes));
      formData.append('logo', logoFile);
      formData.append('voice_id', voiceId);
      formData.append('title', title);

      const apiResponse = await axios.post<{ video_url: string; duration: number; thumbnail_url: string; status: string; video_id: string }>(
        `${import.meta.env.VITE_API_URL}/api/video/generate`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      let { video_url, duration, thumbnail_url, status, video_id } = apiResponse.data;

      if (!video_id) {
        throw new Error('Video ID not returned from the server');
      }

      setVideoId(video_id);

      while (isMounted && status !== 'completed' && status !== 'failed' && status !== 'error') {
        setHeygenStatus(status || 'pending');
        setGenerationStatus(status === 'pending' || status === 'waiting' ? 'waiting' : 'processing');
        setGenerationProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const pollResponse = await axios.get<{
          video_url: string;
          duration: number;
          thumbnail_url: string;
          status: string;
          video_id: string;
          created_at: number | null;
        }>(
          `${import.meta.env.VITE_API_URL}/api/video/status/${video_id}`
        );

        const { video_url: updatedVideoUrl, duration: updatedDuration, thumbnail_url: updatedThumbnailUrl, status: updatedStatus, created_at } = pollResponse.data;
        video_url = updatedVideoUrl;
        duration = updatedDuration;
        thumbnail_url = updatedThumbnailUrl;
        status = updatedStatus;

        if (status === 'completed' && created_at) {
          const currentTime = Math.floor(Date.now() / 1000);
          const generationDuration = currentTime - created_at;
          setGenerationTime(generationDuration);
        }
      }

      if (!isMounted) return;

      if (status === 'completed') {
        setGenerationStatus('completed');
        setGenerationProgress(100);
        setGeneratedVideoUrl(video_url);
        setVideoDuration(duration);
        setThumbnailUrl(thumbnail_url);
      } else {
        throw new Error(`Video generation failed with status: ${status}`);
      }
    } catch (error: any) {
      if (!isMounted) return;
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate video. Please try again.';
      setGenerationStatus('failed');
      setGenerationError(errorMessage);
      setGenerationProgress(0);
      console.error('Video generation error:', error);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setVideoTitle(newTitle);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsGenerateDialogOpen(open);
    if (!open) {
      setShouldShowDialog(false);
      if (id) {
        const data = localStorage.getItem(id);
        if (data) {
          const parsedData = JSON.parse(data);
          parsedData.dialog_closed = true;
          localStorage.setItem(id, JSON.stringify(parsedData));
        }
      }
    }
  };

  const selectedVoice = availableVoices.find((v) => v.voice_id === voiceId);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9fa]">
      <header className="sticky top-0 bg-white border-b z-50 flex justify-between items-center px-6 py-3 h-16">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full w-8 h-8 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-medium text-gray-900">{videoTitle || 'Untitled Project'}</h1>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              Last saved: {lastSaved}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {heygenVideos.length > 0 && (
            <Combobox
              options={videoOptions}
              value={selectedVideoId || ''}
              onChange={handleSelectVideo}
              placeholder="Select a video..."
              className="text-sm cursor-pointer w-1/2"
            />
          )}
          {(generationStatus === 'waiting' || generationStatus === 'processing') && (
            <Button
              onClick={handleViewStatusClick}
              className="rounded px-4 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Video Status
            </Button>
          )}
          <Button
            onClick={handleGenerateClick}
            className="rounded px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 cursor-pointer whitespace-nowrap flex-shrink-0"
            disabled={generationStatus === 'waiting' || generationStatus === 'processing'}
          >
            <Video className="h-4 w-4 mr-2" />
            Generate Video
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider>
          <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
            <Sidebar className="w-80 bg-white border-r z-20 flex flex-col" style={{ height: 'calc(100vh - 4rem)', position: 'sticky', top: '4rem' }}>
              <SidebarContent className="p-4 overflow-y-auto flex-1">
                <SidebarGroup className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video Title</label>
                      <Input
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        className="w-full text-sm cursor-text"
                        placeholder="My Awesome Video"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                      <div className="flex items-center space-x-3">
                        {logoDataUrl ? (
                          <>
                            <img src={logoDataUrl} alt="Logo" className="h-10 w-10 rounded-md object-contain border" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLogoDataUrl(null);
                                setLogo(null);
                              }}
                              className="cursor-pointer"
                            >
                              Change
                            </Button>
                          </>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500">
                            <UploadIcon className="h-5 w-5 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Click to upload logo</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </SidebarGroup>

                <SidebarGroup>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <Combobox
                        options={languages.map((lang) => ({ value: lang, label: lang }))}
                        value={selectedLanguage}
                        onChange={setSelectedLanguage}
                        placeholder="Select language..."
                        className="text-sm cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                      <Combobox
                        options={availableVoices.map((voice) => ({
                          value: voice.voice_id,
                          label: `${voice.name} (${voice.gender})`,
                        }))}
                        value={voiceId}
                        onChange={setVoiceId}
                        placeholder="Select voice..."
                        disabled={!selectedLanguage}
                        className="text-sm cursor-pointer"
                      />
                      {selectedVoice?.preview_audio && (
                        <audio
                          controls
                          src={selectedVoice.preview_audio}
                          className="mt-2 w-full h-8 cursor-pointer"
                        />
                      )}
                    </div>
                  </div>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                {editedScenes.length > 0 ? (
                  <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="relative" style={{ aspectRatio: '16/9' }}>
                      {editedScenes[selectedSceneIndex].image_path ? (
                        <img
                          src={editedScenes[selectedSceneIndex].image_path}
                          alt={`Scene ${selectedSceneIndex + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          key={editedScenes[selectedSceneIndex].image_path}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                          No image generated yet
                        </div>
                      )}
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <MessageSquare className="h-4 w-4 inline mr-2" />
                          Script
                        </label>
                        <Textarea
                          value={scriptInput}
                          onChange={(e) => setScriptInput(e.target.value)}
                          className="min-h-[100px] text-sm cursor-text"
                          placeholder="Enter the narration for this scene..."
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            <ImageIcon className="h-4 w-4 inline mr-2" />
                            Background Image
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateImage(selectedSceneIndex)}
                            className="text-sm cursor-pointer"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </Button>
                        </div>
                        <Textarea
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          className="min-h-[80px] text-sm cursor-text"
                          placeholder="Describe the background image you want to generate..."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">No scenes available. Please upload a presentation to create scenes.</div>
                )}
              </div>

              <div className="border-t bg-white p-3 min-h-[80px] max-h-[15vh] flex-shrink-0 z-10">
                <div className="flex overflow-x-auto h-full items-center content-center justify-center gap-4">
                  {editedScenes.map((scene, index) => (
                    <motion.div
                      key={index}
                      className={`relative w-32 h-20 flex-shrink-0 rounded-md overflow-hidden cursor-pointer ${selectedSceneIndex === index ? 'ring-2 ring-blue-500' : 'border border-gray-200'}`}
                      onClick={() => handleSelectScene(index)}
                      whileHover={{ scale: 1.03 }}
                    >
                      {scene.image_path ? (
                        <img
                          src={scene.image_path}
                          alt={`Scene ${index + 1}`}
                          className="w-full h-full object-cover"
                          key={scene.image_path}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          Scene {index + 1}
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </div>

      <GenerateVideoDialog
        open={isGenerateDialogOpen}
        onOpenChange={handleDialogOpenChange}
        videoTitle={videoTitle}
        onGenerate={handleGenerateVideo}
        onTitleChange={handleTitleChange}
        generatedVideoUrl={generatedVideoUrl}
        generationStatus={generationStatus}
        heygenStatus={heygenStatus}
        generationProgress={generationProgress}
        generationError={generationError}
        videoDuration={videoDuration}
        generationTime={generationTime}
        thumbnailUrl={thumbnailUrl}
      />
    </div>
  );
}

export default SceneEditor;