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

  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);
  const [numRequests, setNumRequests] = useState<string>('100');
  const [isStressTesting, setIsStressTesting] = useState<boolean>(false);
  const isStressTestingRef = useRef(false);

  const [apiKey, setApiKey] = useState<string>(
    'AIzaSyDK_qf5lqRgvP_T-zgWvfeM-_UNec1_EOQ'
  );
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash-lite');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textInput: string) => {
    if (textInput.trim() === '') return;

    const userMessage: Message = { role: 'user', text: textInput };
    const modelMessage: Message = { role: 'model', text: '' };
    const newMessagesForApi = [...messages, userMessage];

    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      modelMessage,
    ]);

    if (textInput === input) {
      setInput('');
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessagesForApi,
          apiKey: apiKey,
          modelName: modelName,
        }),
      });

      if (!response.body) {
        throw new Error('No response body from server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage.role === 'model') {
            lastMessage.text += chunk;
          }
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        const lastMessage = updatedMessages[updatedMessages.length - 1];
        if (lastMessage.role === 'model') {
          lastMessage.text = 'Sorry, I ran into an error.';
        }
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startStressTestLoop = () => {
    const totalRequests = parseInt(numRequests) || 100;
    if (totalRequests <= 0) return;

    setIsTestModalOpen(false);
    setIsStressTesting(true);
    isStressTestingRef.current = true;
    setIsLoading(true);

    const runBatch = async () => {
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
              apiKey: apiKey,
              modelName: modelName,
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
          if (res.ok) {
            successful++;
          } else if (res.status === 429) {
            failed429++;
          } else {
            otherFailed++;
          }
        });

        console.log('--- Stress Batch Complete ---');
        console.log(`Total: ${totalRequests}`);
        console.log(`✅ Successful: ${successful}`);
        console.log(`🚫 Rate Limited (429): ${failed429}`);
        console.log(`❌ Other Errors: ${otherFailed}`);
        console.log('-----------------------------');

        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: `Batch Complete: ✅ ${successful} / 🚫 ${failed429} / ❌ ${otherFailed}`,
          },
        ]);
      } catch (error) {
        console.error('Error during stress test batch:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'Stress test batch failed. Check console.',
          },
        ]);
      } finally {
        if (isStressTestingRef.current) {
          runBatch();
        } else {
          setIsStressTesting(false);
          setIsLoading(false);
          console.log('Stress test loop stopping.');
        }
      }
    };

    runBatch();
  };

  const stopStressTestLoop = () => {
    console.log('Stop signal received. Halting after current batch...');
    isStressTestingRef.current = false;
  };

  return (
    <div className="flex flex-col h-screen bg-linear-to-b from-gray-900 to-gray-800 text-white font-sans">
      <header className="bg-gray-900/90 backdrop-blur-sm shadow-lg flex items-center justify-between p-4 border-b border-gray-700/50 sticky top-0 z-10">
        <div className="w-8"></div>
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Hacko World!
          </h1>
          <p className="text-center text-gray-400 text-sm">
            AI chat with stolen Google Gemini API access from Google Developer Groups on Campus TUP Manila
          </p>
        </div>
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Open settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl p-3 px-4 rounded-2xl shadow-lg my-2 ${
                  msg.role === 'user'
                    ? 'bg-linear-to-br from-blue-600 to-blue-500 text-white rounded-br-lg'
                    : 'bg-gray-700 text-gray-100 rounded-bl-lg'
                } whitespace-pre-wrap`}
              >
                {msg.text === '' ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-gray-900 p-3 sm:p-4 border-t border-gray-700/50 shadow-inner sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center space-x-2 sm:space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && !isLoading && handleSend(input)
            }
            placeholder={
              isLoading ? 'Waiting for response...' : 'Ask something...'
            }
            className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading}
            aria-label="Send message"
            className="bg-blue-600 text-white rounded-full p-2.5 sm:p-3 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
              />
            </svg>
          </button>

          <div className="h-full border-l border-gray-700 mx-1"></div>

          <button
            onClick={
              isStressTesting
                ? stopStressTestLoop
                : () => setIsTestModalOpen(true)
            }
            disabled={isLoading && !isStressTesting}
            aria-label={
              isStressTesting ? 'Stop stress test' : 'Open stress test settings'
            }
            className={`text-white rounded-full p-2.5 sm:p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 ${
              isStressTesting
                ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 animate-pulse'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              {isStressTesting ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              )}
            </svg>
          </button>
        </div>
      </footer>

      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">
              Configure Test Loop
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="numRequests"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Parallel Requests per Batch
                </label>
                <input
                  type="number"
                  id="numRequests"
                  value={numRequests}
                  onChange={(e) => setNumRequests(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={startStressTestLoop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Start Loop
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">
              API Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="modelName"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Model Name
                </label>
                <input
                  type="text"
                  id="modelName"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., gemini-2.5-flash-lite"
                />
              </div>
              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  API Key
                </label>
                <input
                  type="text"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API Key..."
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}