import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Upload from './components/Upload';
import SceneEditor from './components/SceneEditor';
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle } from "lucide-react";

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  language: string;
  preview_audio: string;
}

interface HeyGenVideo {
  video_id: string;
  status: string;
  video_title: string;
  created_at: number;
  type: string;
  folder_id: string;
}

function App() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [heygenVideos, setHeygenVideos] = useState<HeyGenVideo[]>([]);
  const [error, setError] = useState<string>('');
  const hasFetched = useRef(false);

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  useEffect(() => {
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;

    const fetchVoices = async () => {
      try {
        const response = await axios.get<{ error: string | null; data: { voices: Voice[] } }>(
          `${import.meta.env.VITE_API_URL}/api/video/voices`
        );
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        setVoices(response.data.data.voices);
      } catch (err) {
        handleError('Failed to fetch voices: ' + (err as Error).message);
      }
    };

    const fetchHeyGenVideos = async () => {
      try {
        const response = await axios.get<{
          code: number;
          data: {
            videos: HeyGenVideo[];
            token: string | null;
            total: number;
          };
          msg: string | null;
          message: string | null;
        }>(
          `${import.meta.env.VITE_API_URL}/api/video/list`
        );
        setHeygenVideos(response.data.data.videos);
      } catch (err) {
        handleError('Failed to fetch video list from backend: ' + (err as Error).message);
      }
    };

    Promise.all([fetchVoices(), fetchHeyGenVideos()]);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#f8f9fa]">
        {error && (
          <div className="fixed bottom-4 z-50 max-w-md w-full animate-in fade-in">
            <Alert variant="destructive" className="shadow-lg bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Upload setError={handleError} />} />
          <Route
            path="/create/:id"
            element={
              <SceneEditor
                voices={voices}
                heygenVideos={heygenVideos}
                setError={handleError}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;