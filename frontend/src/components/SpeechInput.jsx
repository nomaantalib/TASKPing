import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

const SpeechInput = ({ onTranscript, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recInstance = new SpeechRecognition();
      recInstance.continuous = false;
      recInstance.interimResults = false;
      recInstance.lang = 'en-US';

      recInstance.onstart = () => {
        setIsListening(true);
      };

      recInstance.onend = () => {
        setIsListening(false);
      };

      recInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onTranscript) {
          onTranscript(transcript);
        }
      };

      recInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      setRecognition(recInstance);
      setSupported(true);
    }
  }, [onTranscript]);

  const handleToggle = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition failed to start:', err);
      }
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      title={isListening ? 'Stop Listening' : 'Add via Voice Input'}
      className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-center shadow-lg ${
        isListening
          ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse ring-2 ring-rose-500/30'
          : 'bg-[#1e293b] border-gray-800 text-gray-400 hover:text-indigo-400 hover:bg-[#253248]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {isListening ? (
        <MicOff className="w-5.5 h-5.5" />
      ) : (
        <Mic className="w-5.5 h-5.5" />
      )}
    </button>
  );
};

export default SpeechInput;
