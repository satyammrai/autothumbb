import React, { useState, useCallback, useMemo } from 'react';
import { generateThumbnail } from './services/geminiService';
import { fileToBase64 } from './utils/imageUtils';
import { UploadIcon, SparklesIcon, DownloadIcon, PencilSquareIcon } from './components/IconComponents';
import { Spinner } from './components/Spinner';
import type { Thumbnail } from './types';

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<Thumbnail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'correct'>('create');

  const loadingMessages = useMemo(() => [
    "Activating Ultra Visual Power Mode...",
    "Injecting viral aesthetics...",
    "Optimizing for clicks...",
    "Crafting Hollywood-level lighting...",
    "Finalizing hyper-modern design...",
  ], []);

  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setGeneratedThumbnails([]);
      setError(null);
      try {
        const base64 = await fileToBase64(file);
        setUploadedImagePreview(base64);
      } catch (err) {
        setError('Could not read the image file. Please try another one.');
        setUploadedImagePreview(null);
      }
    }
  }, []);

  const handleGenerateClick = useCallback(async () => {
    if (!uploadedImage || !uploadedImagePreview) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedThumbnails([]);

    const messageInterval = setInterval(() => {
        setCurrentLoadingMessage(prev => {
            const currentIndex = loadingMessages.indexOf(prev);
            const nextIndex = (currentIndex + 1) % loadingMessages.length;
            return loadingMessages[nextIndex];
        });
    }, 2500);


    const base64Data = uploadedImagePreview.split(',')[1];
    const mimeType = uploadedImage.type;

    const createVariationPrompts = [
      "Focus on a color palette of electric blue and fiery orange. Emphasize dynamic motion lines and a strong diagonal composition.",
      "Use a color palette of neon yellow and magenta, with intense, high-contrast rim lighting. The background should feature abstract particle bursts.",
      "Create a version with a crimson red and lime green palette, using a futuristic digital grid pattern for the background. Add subtle tech-like HUD elements."
    ];

    const correctVariationPrompts = [
        "Total color and light overhaul. Overhaul the color palette with electric blue and fiery orange, making them intensely vibrant. Make the lighting extremely dramatic and high-contrast. The goal is pure energy.",
        "Text is now the hero. Make the existing text absolutely MASSIVE. Give it an intense neon yellow and magenta glow that's impossible to ignore. The background should explode with particle effects.",
        "Subject transformation. Isolate the subject, add an intensely bright rim light, and sharpen every detail to an extreme degree. Place them against a new, dynamic futuristic background with a crimson and lime green palette."
    ];

    const variationPrompts = mode === 'create' ? createVariationPrompts : correctVariationPrompts;

    try {
      const results = await Promise.allSettled(
        variationPrompts.map(prompt => generateThumbnail(mode, base64Data, mimeType, prompt))
      );

      const successfulThumbnails = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result, index) => ({ id: Date.now() + index, src: result.value }));

      setGeneratedThumbnails(successfulThumbnails);

      const rejectedPromises = results.filter(result => result.status === 'rejected');
      if (rejectedPromises.length > 0) {
        console.error(`${rejectedPromises.length} thumbnail(s) failed to generate.`, rejectedPromises);
      }

      if (successfulThumbnails.length === 0 && rejectedPromises.length > 0) {
          const firstReason = (rejectedPromises[0] as PromiseRejectedResult).reason;
          if (firstReason instanceof Error && firstReason.message.includes('safety')) {
              setError('Generation failed because the content was blocked for safety reasons. Please try a different image.');
          } else {
              setError('Failed to generate thumbnails. The model may be overloaded or the image could not be processed. Please try again.');
          }
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
      clearInterval(messageInterval);
    }
  }, [uploadedImage, uploadedImagePreview, loadingMessages, mode]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          Viral Thumbnail Generator
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Transform your images into click-magnetic YouTube thumbnails with Gemini.
        </p>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="bg-gray-800/50 rounded-2xl p-6 flex flex-col border border-gray-700 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-3xl mr-2">1.</span> Upload Your Image
          </h2>
          <div className="relative flex-grow flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 bg-gray-900/50 transition-colors hover:border-purple-500">
            {uploadedImagePreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                <img src={uploadedImagePreview} alt="Uploaded preview" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold py-1 px-2 rounded-md backdrop-blur-sm">16:9</div>
              </div>
            ) : (
                <div className="text-center">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                  <p className="mt-2 text-gray-400">Upload an image for a 16:9 thumbnail</p>
                  <p className="text-xs text-gray-500">Your image will be displayed in 16:9 format.</p>
                </div>
            )}
             <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
              />
          </div>
           {uploadedImage && (
            <p className="text-sm text-gray-400 mt-2 truncate text-center">
              File: {uploadedImage.name}
            </p>
          )}
          <div className="flex items-center justify-center space-x-4 my-6">
            <span className={`font-medium transition-colors ${mode === 'create' ? 'text-purple-400' : 'text-gray-400'}`}>Create New</span>
            <button
              onClick={() => setMode(prev => prev === 'create' ? 'correct' : 'create')}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${mode === 'correct' ? 'bg-purple-600' : 'bg-gray-600'}`}
              aria-label="Toggle generation mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${mode === 'correct' ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className={`font-medium transition-colors ${mode === 'correct' ? 'text-purple-400' : 'text-gray-400'}`}>Supercharge Thumbnail</span>
          </div>

          <div className="mt-auto">
            <button
              onClick={handleGenerateClick}
              disabled={!uploadedImage || isLoading}
              className="w-full text-lg font-bold py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Spinner />
                   {mode === 'create' ? 'Generating...' : 'Supercharging...'}
                </>
              ) : mode === 'create' ? (
                <>
                  <SparklesIcon className="w-6 h-6 mr-2" />
                  Generate 3 Viral Variations
                </>
              ) : (
                <>
                    <PencilSquareIcon className="w-6 h-6 mr-2" />
                    Supercharge It!
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-gray-800/50 rounded-2xl p-6 flex flex-col border border-gray-700 backdrop-blur-sm">
           <h2 className="text-2xl font-bold mb-4 flex items-center">
             <span className="text-3xl mr-2">2.</span> Your Thumbnails
          </h2>
          <div className="flex-grow rounded-lg bg-gray-900/50 p-4 flex items-center justify-center">
            {isLoading ? (
               <div className="text-center">
                 <Spinner size="lg" />
                 <p className="mt-4 text-lg text-gray-300">{currentLoadingMessage}</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                <p className="font-bold">An Error Occurred</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : generatedThumbnails.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 w-full">
                {generatedThumbnails.map((thumb) => (
                  <div key={thumb.id} className="group relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all">
                    <img src={thumb.src} alt={`Generated thumbnail ${thumb.id + 1}`} className="w-full h-full object-cover" />
                    <a
                      href={thumb.src}
                      download={`thumbnail-variation-${thumb.id + 1}.png`}
                      className="absolute bottom-2 right-2 bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm hover:bg-purple-600"
                      aria-label="Download thumbnail"
                      title="Download thumbnail"
                    >
                      <DownloadIcon className="w-5 h-5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <SparklesIcon className="mx-auto h-12 w-12" />
                <p className="mt-2">Your generated thumbnails will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;