'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isStressTesting, setIsStressTesting] = useState<boolean>(false);
  const isStressTestingRef = useRef(false);

  const [numRequests, setNumRequests] = useState<string>('100');
  const [apiKey, setApiKey] = useState<string>('AIzaSyDK_qf5lqRgvP_T-zgWvfeM-_UNec1_EOQ');
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash-lite');

  const [tempNumRequests, setTempNumRequests] = useState(numRequests);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempModelName, setTempModelName] = useState(modelName);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openSettingsModal = () => {
    setTempApiKey(apiKey);
    setTempModelName(modelName);
    setTempNumRequests(numRequests);
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = () => {
    setApiKey(tempApiKey);
    setModelName(tempModelName);
    setNumRequests(tempNumRequests);
    setIsSettingsModalOpen(false);
  };

  const handleSaveAndStartLoop = () => {
    setApiKey(tempApiKey);
    setModelName(tempModelName);
    setNumRequests(tempNumRequests);
    setIsSettingsModalOpen(false);
    startStressTestLoop(tempNumRequests, tempApiKey, tempModelName);
  };

  const handleSend = async (textInput: string) => {
    if (textInput.trim() === '') return;

    const userMessage: Message = { role: 'user', text: textInput };
    const modelMessage: Message = { role: 'model', text: '' };
    const newMessagesForApi = [...messages, userMessage];

    setMessages((prev) => [...prev, userMessage, modelMessage]);

    if (textInput === input) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessagesForApi,
          apiKey,
          modelName,
        }),
      });

      if (!response.body) throw new Error('No response body from server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'model') last.text += chunk;
          return updated;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'model') last.text = 'Sorry, I ran into an error.';
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startStressTestLoop = (
    requests: string,
    key: string,
    model: string
  ) => {
    const totalRequests = parseInt(requests) || 100;
    if (totalRequests <= 0) return;

    setIsStressTesting(true);
    isStressTestingRef.current = true;
    setIsLoading(true);

    const runBatch = async (apiKey: string, modelName: string) => {
      if (!isStressTestingRef.current) {
        setIsStressTesting(false);
        setIsLoading(false);
        console.log('Stress test loop stopped.');
        return;
      }

      console.log(`Starting stress batch: ${totalRequests} parallel requests...`);
      const testMessage: Message[] = [{ role: 'user', text: 'Test' }];
      const requests = [];

      for (let i = 0; i < totalRequests; i++) {
        requests.push(
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: testMessage,
              apiKey,
              modelName,
            }),
          })
        );
      }

      try {
        const responses = await Promise.all(requests);
        let successful = 0;
        let failed429 = 0;
        let otherFailed = 0;

        responses.forEach((res) => {
          if (res.ok) successful++;
          else if (res.status === 429) failed429++;
          else otherFailed++;
        });

        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: `Batch Complete: ✅ ${successful} / 🚫 ${failed429} / ❌ ${otherFailed}`,
          },
        ]);
      } catch (error) {
        console.error('Error during test:', error);
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: 'Test failed. Check console.' },
        ]);
      } finally {
        if (isStressTestingRef.current) runBatch(apiKey, modelName);
        else {
          setIsStressTesting(false);
          setIsLoading(false);
        }
      }
    };

    runBatch(key, model);
  };

  const stopStressTestLoop = () => {
    console.log('Stop signal received. Halting after current batch...');
    isStressTestingRef.current = false;
  };

  return (
    <div className="flex flex-col h-screen bg-linear-to-b from-gray-900 to-gray-800 text-white font-sans overflow-hidden">
      <header className="bg-gray-900/90 backdrop-blur-sm shadow-lg flex flex-col p-4 border-b border-gray-700/50 sticky top-0 z-10">
        <div className="relative flex justify-center items-center w-full">
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Hacko World!
          </h1>
          <button
            onClick={isStressTesting ? stopStressTestLoop : openSettingsModal}
            disabled={isLoading && !isStressTesting}
            className={`absolute right-0 text-gray-400 hover:text-white transition-all duration-300 p-1 rounded-full ${
              isStressTesting
                ? 'bg-yellow-500 text-white animate-pulse'
                : 'hover:bg-gray-700'
            } disabled:bg-gray-600 disabled:cursor-not-allowed`}
            aria-label={isStressTesting ? 'Stop test loop' : 'Open settings'}
          >
            {isStressTesting ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-center text-gray-400 text-sm px-2 mt-4">
          AI chat with stolen Google Gemini API access from Google Developer Groups on Campus TUP Manila
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3 w-full overflow-x-hidden">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-md md:max-w-lg lg:max-w-2xl p-3 px-4 rounded-2xl shadow-lg my-2 ${
                  msg.role === 'user'
                    ? 'bg-linear-to-br from-blue-600 to-blue-500 text-white rounded-br-lg'
                    : 'bg-gray-700 text-gray-100 rounded-bl-lg'
                } whitespace-pre-wrap wrap-break-word`}
              >
                {msg.text === '' ? <span className="animate-pulse">...</span> : msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-gray-900 p-3 sm:p-4 border-t border-gray-700/50 shadow-inner sticky bottom-0 w-full">
        <div className="max-w-3xl mx-auto flex items-center space-x-2 sm:space-x-3 w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder={isLoading ? 'Waiting for response...' : 'Ask something...'}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 w-0 min-w-0"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading}
            aria-label="Send message"
            className="bg-blue-600 text-white rounded-full p-2.5 sm:p-3 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
      </footer>

      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-x-hidden">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Settings & Test</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="numRequests" className="block text-sm font-medium text-gray-300 mb-1">
                  Parallel Requests per Batch
                </label>
                <input
                  type="number"
                  id="numRequests"
                  value={tempNumRequests}
                  onChange={(e) => setTempNumRequests(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <label htmlFor="modelName" className="block text-sm font-medium text-gray-300 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  id="modelName"
                  value={tempModelName}
                  onChange={(e) => setTempModelName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., gemini-2.5-flash-lite"
                />
              </div>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  id="apiKey"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API Key..."
                />
              </div>
            </div>
            <div className="flex justify-between space-x-3 mt-6">
              <button onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                Cancel
              </button>
              <div className="flex space-x-3">
                <button onClick={handleSaveSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Done
                </button>
                <button onClick={handleSaveAndStartLoop} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                  Start Loop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}