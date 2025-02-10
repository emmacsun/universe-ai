import React, { useState, useRef, useEffect } from 'react';
//import logo from './logo.svg';
import './App.css';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: number;
}

interface User {
  email: string;
  token: string;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for saved token
    const savedToken = localStorage.getItem('token');
    const savedEmail = localStorage.getItem('email');
    if (savedToken && savedEmail) {
      setUser({ email: savedEmail, token: savedToken });
      loadConversationHistory(savedToken);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/conversation-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.history) {
        const formattedMessages: Message[] = data.history.map((msg: any) => ({
          type: msg.role === 'user' ? 'user' : 'bot',
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime()
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const handleAuth = async (isRegister: boolean) => {
    try {
      const endpoint = isRegister ? 'register' : 'token';
      const response = await fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Authentication failed');
      }

      const data = await response.json();
      const newUser = { email, token: data.access_token };
      setUser(newUser);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('email', email);
      
      if (!isRegister) {
        loadConversationHistory(data.access_token);
      }
      
      setError('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([]);
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { 
      type: 'user', 
      content: input,
      timestamp: Date.now()
    };

    // Add user message immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setInput('');

    try {
      // Send the full conversation history for better context
      const conversationHistory = updatedMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          max_results: 10,
          conversation_history: conversationHistory
        }),
      });

      const data = await response.json();
      const botMessage: Message = { 
        type: 'bot', 
        content: data.response,
        timestamp: Date.now()
      };
      setMessages([...updatedMessages, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: Date.now()
      };
      setMessages([...updatedMessages, errorMessage]);
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

  if (!user) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Stanford Course Assistant</h1>
        </header>
        <div className="auth-container">
          <h2>{isRegistering ? 'Register' : 'Login'}</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAuth(isRegistering);
          }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>
          <button 
            className="switch-auth-mode"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Stanford Course Assistant</h1>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
          {messages.length > 0 && (
            <button 
              onClick={clearConversation}
              className="clear-button"
            >
              Clear Chat
            </button>
          )}
        </div>
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
