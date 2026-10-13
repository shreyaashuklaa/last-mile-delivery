import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(
    localStorage.getItem('demo_persona_id') || 'usr_cust_1'
  );
  const [loading, setLoading] = useState(true);

  // Load demo personas from API
  useEffect(() => {
    fetch('/api/auth/demo-personas')
      .then(res => res.json())
      .then(data => {
        if (data.personas) {
          setPersonas(data.personas);
          // If no user is logged in, default to first persona (Rahul Sharma)
          const targetPersona = data.personas.find(p => p.id === activePersonaId) || data.personas[0];
          if (targetPersona) {
            switchPersona(targetPersona.id, false);
          }
        }
      })
      .catch(err => console.error('Failed to load personas:', err))
      .finally(() => setLoading(false));
  }, []);

  const switchPersona = (personaId, persist = true) => {
    setActivePersonaId(personaId);
    if (persist) {
      localStorage.setItem('demo_persona_id', personaId);
    }

    // Fetch user details for this persona
    fetch('/api/auth/me', {
      headers: {
        'x-demo-user-id': personaId
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(e => console.error('Persona switch error:', e));
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data.user;
  };

  const register = async (name, email, password, phone, role) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('token');
  };

  // Helper fetch with auth headers included
  const authFetch = (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      'x-demo-user-id': activePersonaId || ''
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        personas,
        activePersonaId,
        switchPersona,
        login,
        register,
        logout,
        authFetch,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
