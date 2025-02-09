import React, { useState } from 'react';
import './App.css';
//import stanfordLogo from './assets/stanford-logo.png';

function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message to chat
    const userMessage = { type: 'user', content: query };
    setMessages([...messages, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          max_results: 10,
        }),
      });

      const data = await response.json();
      
      // Add bot response to chat
      const botMessage = { type: 'bot', content: data.response };
      setMessages([...messages, userMessage, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { type: 'bot', content: 'Sorry, there was an error processing your request.' };
      setMessages([...messages, userMessage, errorMessage]);
    }

    setLoading(false);
    setQuery('');
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={stanfordLogo} alt="Stanford University Logo" className="stanford-logo" /> */}
        <h1>Stanford Course Assistant</h1>
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to Stanford Course Assistant!</h2>
              <p>Ask me anything about courses, major requirements, or graduation requirements.</p>
              <p>Example questions:</p>
              <ul>
                <li>"What are the requirements for a Computer Science major?"</li>
                <li>"Show me Spring 2025 courses about machine learning"</li>
                <li>"What are the university graduation requirements?"</li>
              </ul>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                {message.type === 'user' ? '🧑 ' : '🤖 '}
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message bot">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about courses, requirements, or graduation..."
            className="chat-input"
          />
          <button type="submit" className="send-button" disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App; 