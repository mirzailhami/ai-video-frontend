import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Upload as UploadIcon } from 'lucide-react';
import axios from 'axios';

interface Scene {
  script: string;
  image_prompt: string;
  image_path: string;
}

interface UploadProps {
  setError: (message: string) => void;
}

function Upload({ setError }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && !selectedFile.name.endsWith('.ppt') && !selectedFile.name.endsWith('.pptx')) {
      setError('Please select a .ppt or .pptx file.');
      setFile(null);
      return;
    }
    setFile(selectedFile || null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file.');
      return;
    }
    setIsLoading(true);
    try {
      // Step 1: Upload the PPT file to /api/upload/ppt
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload/ppt`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      const { path: filePath } = uploadResponse.data;
      console.log(`Upload.tsx: Uploaded file to ${filePath}`);

      // Step 2: Generate scenes by calling /api/scenes/generate
      const scenesResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/scenes/generate?file_path=${encodeURIComponent(filePath)}`
      );
      const scenes: Scene[] = scenesResponse.data.scenes;
      console.log(`Upload.tsx: Generated scenes for file ${filePath}`, scenes);

      if (!scenes || scenes.length === 0) {
        throw new Error('No scenes generated from the presentation.');
      }

      // Step 3: Save project data to localStorage
      const id = uuidv4();
      const projectData = {
        id,
        title: file.name.replace(/\.(ppt|pptx)$/, ''),
        scenes,
        pptFile: filePath,
        logo_data_url: null,
        language: 'English',
        voice_id: '',
        avatar_id: '',
        last_saved: new Date().toISOString(),
      };
      localStorage.setItem(id, JSON.stringify(projectData));
      console.log(`Upload.tsx: Saved project with ID ${id}`, projectData);

      // Step 4: Navigate to the editor
      navigate(`/create/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Error processing file.';
      setError(errorMessage);
      console.error('Upload error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full space-y-6 border border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Upload Presentation</h1>
        <p className="text-sm text-gray-500 text-center">Upload a .ppt or .pptx file to create a video presentation</p>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
            >
              {file ? (
                <div className="text-center">
                  <p className="text-sm text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                </div>
              ) : (
                <>
                  <UploadIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">.ppt or .pptx files only</p>
                </>
              )}
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".ppt,.pptx"
              />
            </label>
          </div>
          <Button
            onClick={handleUpload}
            disabled={isLoading || !file}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              'Create Video'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Upload;