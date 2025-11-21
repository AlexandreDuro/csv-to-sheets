'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function Home() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [loadingSheets, setLoadingSheets] = useState<boolean>(true);

  // Fetch sheets on mount
  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await fetch('/api/sheets');
        const data = await response.json();
        if (data.success) {
          setSheets(data.sheets);
        }
      } catch (error) {
        console.error('Error fetching sheets:', error);
      } finally {
        setLoadingSheets(false);
      }
    };
    fetchSheets();
  }, []); // Empty dependency array means this runs once on mount

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStatus('uploading');
    setMessage('');
    setLogs([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('CSV uploadé avec succès !');
        setLogs(data.logs || []);
      } else {
        setStatus('error');
        setMessage(data.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Erreur de connexion au serveur');
    }
  }, [selectedSheet]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 sm:p-12 border border-white/20">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            CSV vers Sheets
          </h1>
          <p className="text-lg text-gray-600">
            Transformez vos fichiers CSV en Google Sheets en un clin d&apos;œil.
          </p>
        </div>

        {/* Dropdown removed as per request */}

        <div
          {...getRootProps()}
          className={`
            relative group cursor-pointer
            border-3 border-dashed rounded-xl p-12 sm:p-16
            transition-all duration-300 ease-in-out
            flex flex-col items-center justify-center text-center
            ${isDragActive
              ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
            }
            ${status === 'uploading' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="space-y-6 pointer-events-none">
            <div className={`
              w-20 h-20 mx-auto rounded-full flex items-center justify-center
              transition-colors duration-300
              ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}
            `}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            {status === 'uploading' ? (
              <div className="space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-lg font-medium text-gray-700">Traitement en cours...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-700">
                  {isDragActive ? 'Déposez le fichier ici' : 'Glissez votre fichier CSV ici'}
                </p>
                <p className="text-sm text-gray-500">
                  ou <span className="text-blue-600 font-medium underline decoration-2 underline-offset-2">parcourez vos fichiers</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages with Animation */}
        <div className={`
          mt-8 transition-all duration-500 ease-in-out overflow-hidden
          ${status === 'success' || status === 'error' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          {status === 'success' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 shadow-sm">
              <div className="flex items-center mb-2">
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium text-lg">{message}</span>
              </div>
              {logs.length > 0 && (
                <div className="mt-3 pl-9 text-sm space-y-1 text-green-800/80 font-mono bg-green-100/50 p-3 rounded-md max-h-48 overflow-y-auto">
                  {logs.map((log, index) => (
                    <p key={index}>{log}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-sm">
              <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{message}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
