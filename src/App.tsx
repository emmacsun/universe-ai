import React, { useState, useRef, useEffect } from 'react';
//import logo from './logo.svg';
import './App.css';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: number;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { 
      type: 'user', 
      content: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Get the last few messages for context (excluding the current message)
      const recentMessages = messages.slice(-4).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add the current user message
      recentMessages.push({
        role: 'user',
        content: input
      });

      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          max_results: 10,
          conversation_history: recentMessages
        }),
      });

      const data = await response.json();
      const botMessage: Message = { 
        type: 'bot', 
        content: data.response,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <h1>Stanford Course Assistant</h1>
        {messages.length > 0 && (
          <button 
            onClick={clearConversation}
            className="clear-button"
          >
            Clear Chat
          </button>
        )}
      </header>

      <div className="chat-container">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome! 👋</h2>
              <p>Ask me anything about Stanford courses, requirements, or graduation.</p>
              <p>Try asking:</p>
              <ul>
                <li>"What are the CS major requirements?"</li>
                <li>"Show me machine learning courses for Spring 2025"</li>
                <li>"What are the graduation requirements?"</li>
              </ul>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-bubble">
                {message.type === 'user' ? '👤 ' : '🤖 '}
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question here... (Press Enter to send, Shift+Enter for new line)"
            disabled={isLoading}
            rows={3}
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
