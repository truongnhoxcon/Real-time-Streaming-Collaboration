import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import api from '../services/api.js';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socket = useWebSocket(token);

  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Keep ref of active ids to use inside socket event listeners
  const activeChannelIdRef = useRef(null);
  const activeServerIdRef = useRef(null);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    activeServerIdRef.current = activeServerId;
  }, [activeServerId]);

  // Fetch servers on authentication
  useEffect(() => {
    if (token) {
      fetchServers();
    } else {
      setServers([]);
      setActiveServerId(null);
      setActiveChannelId(null);
      setMessages([]);
      setMembers([]);
    }
  }, [token]);

  // Handle server and channel change ws triggers
  useEffect(() => {
    if (socket && activeServerId && activeChannelId) {
      console.log(`[Socket Emit] Joining channel ${activeChannelId} in server ${activeServerId}`);
      socket.emit('join_channel', {
        serverId: activeServerId,
        channelId: activeChannelId,
      });

      // Fetch message history for the new channel
      fetchMessages(activeChannelId);
    }
  }, [socket, activeServerId, activeChannelId]);

  // Connect socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages (event name 'message' is sent by backend-realtime)
    const handleNewMessage = (msg) => {
      console.log('[WebSocket Message] Received message:', msg);
      if (msg.channelId === activeChannelIdRef.current) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    // Listen for presence change (event name 'presence_change' is sent by backend-realtime)
    const handlePresenceChange = (data) => {
      console.log('[WebSocket Presence] Change received:', data);
      const { userId, username, status } = data;
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, status } : m))
      );
    };

    socket.on('message', handleNewMessage);
    socket.on('receive_message', handleNewMessage); // Compatibility fallback
    socket.on('presence_change', handlePresenceChange);
    socket.on('user_online', (data) => handlePresenceChange({ ...data, status: 'online' }));
    socket.on('user_offline', (data) => handlePresenceChange({ ...data, status: 'offline' }));

    return () => {
      socket.off('message', handleNewMessage);
      socket.off('receive_message', handleNewMessage);
      socket.off('presence_change', handlePresenceChange);
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, [socket]);

  /**
   * Fetch all servers the authenticated user is a member of.
   * Fallbacks to localStorage / mock list if API is missing (404).
   */
  const fetchServers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/servers');
      setServers(response.data);
      if (response.data.length > 0) {
        const defaultServer = response.data[0];
        setActiveServerId(defaultServer.id);
        const textChan = defaultServer.channels?.find((c) => c.type === 'text');
        if (textChan) {
          setActiveChannelId(textChan.id);
        }
      }
    } catch (error) {
      console.warn('[ChatContext] GET /api/servers failed or not implemented. Fallback to localStorage mock schema.', error.message);
      
      const stored = localStorage.getItem('local_servers');
      let currentServers = [];
      if (stored) {
        currentServers = JSON.parse(stored);
      } else {
        // Initial setup for the mockup
        currentServers = [
          {
            id: 'server-1',
            name: 'AntiGroup HQ',
            abbr: 'AG',
            channels: [
              { id: 'c-1', name: 'general', type: 'text' },
              { id: 'c-2', name: 'development', type: 'text' },
              { id: 'c-3', name: 'design-feedback', type: 'text' },
              { id: 'c-4', name: 'Lounge', type: 'voice' },
              { id: 'c-5', name: 'Gaming Zone', type: 'voice' }
            ]
          },
          {
            id: 'server-2',
            name: 'Study Room',
            abbr: 'SR',
            channels: [
              { id: 'c-6', name: 'announcements', type: 'text' },
              { id: 'c-7', name: 'resources', type: 'text' },
              { id: 'c-8', name: 'questions', type: 'text' },
              { id: 'c-9', name: 'Silent Study', type: 'voice' }
            ]
          }
        ];
        localStorage.setItem('local_servers', JSON.stringify(currentServers));
      }

      setServers(currentServers);

      // Set default active server and channel
      if (currentServers.length > 0) {
        const defaultServer = currentServers[0];
        setActiveServerId(defaultServer.id);
        const textChan = defaultServer.channels?.find((c) => c.type === 'text');
        if (textChan) {
          setActiveChannelId(textChan.id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch messages for a specific channel.
   * Calls GET /api/channels/:channelId/messages
   */
  const fetchMessages = async (channelId) => {
    try {
      const response = await api.get(`/api/channels/${channelId}/messages`);
      // Sort messages in ascending order for chat window rendering (backend returns order by created_at DESC)
      const messageList = [...response.data.messages].reverse();
      setMessages(messageList);
      
      // Update mock active users/members list based on senders in chat + self
      const uniqueSenders = {};
      messageList.forEach((m) => {
        if (m.sender && m.sender.id) {
          uniqueSenders[m.sender.id] = m.sender.username;
        }
      });
      
      const memberList = Object.keys(uniqueSenders).map((id) => ({
        id,
        username: uniqueSenders[id],
        status: id === user?.id ? 'online' : 'offline',
      }));

      // Add self if not in list
      if (user && !memberList.some((m) => m.id === user.id)) {
        memberList.push({ id: user.id, username: user.username, status: 'online' });
      }

      setMembers(memberList);
    } catch (error) {
      console.error('[ChatContext] Failed to fetch channel messages:', error.message);
      // Fallback for static mock demo
      setMessages([]);
      setMembers([
        { id: user?.id || 'me', username: user?.username || 'You', status: 'online' },
        { id: 'u-1', username: 'Alex', status: 'online' },
        { id: 'u-2', username: 'Sophia', status: 'offline' },
        { id: 'u-3', username: 'Ryan', status: 'online' }
      ]);
    }
  };

  /**
   * Send a chat message via WebSocket.
   */
  const sendMessage = (content) => {
    if (!socket || !activeServerId || !activeChannelId) {
      console.warn('[ChatContext] Socket connection is not ready or channel/server is not selected');
      return;
    }

    console.log('[Socket Emit] send_message:', content);
    socket.emit('send_message', {
      serverId: activeServerId,
      channelId: activeChannelId,
      content,
    });

    // Optimistic local update for self (fallback render until WS broadcasts back)
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      channelId: activeChannelId,
      serverId: activeServerId,
      sender: {
        id: user?.id || 'me',
        username: user?.username || 'You',
      },
    };
    setMessages((prev) => [...prev, tempMessage]);
  };

  /**
   * Helper to create a server using POST /api/servers
   */
  const createServer = async (name) => {
    try {
      const response = await api.post('/api/servers', { name });
      const createdServer = response.data.server;
      
      const updatedServer = {
        id: createdServer.id,
        name: createdServer.name,
        abbr: name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 3),
        channels: [],
      };

      const nextServers = [...servers, updatedServer];
      setServers(nextServers);
      localStorage.setItem('local_servers', JSON.stringify(nextServers));
      
      setActiveServerId(updatedServer.id);
      return { success: true, server: updatedServer };
    } catch (error) {
      console.error('[ChatContext] Server creation failed:', error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to create server' };
    }
  };

  /**
   * Helper to create a channel using POST /api/servers/:serverId/channels
   */
  const createChannel = async (name, type = 'text') => {
    if (!activeServerId) return { success: false, error: 'No active server selected' };

    try {
      const response = await api.post(`/api/servers/${activeServerId}/channels`, { name, type });
      const createdChannel = response.data.channel;

      const nextServers = servers.map((s) => {
        if (s.id === activeServerId) {
          return {
            ...s,
            channels: [...(s.channels || []), createdChannel],
          };
        }
        return s;
      });

      setServers(nextServers);
      localStorage.setItem('local_servers', JSON.stringify(nextServers));
      
      if (type === 'text') {
        setActiveChannelId(createdChannel.id);
      }
      return { success: true, channel: createdChannel };
    } catch (error) {
      console.error('[ChatContext] Channel creation failed:', error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to create channel' };
    }
  };

  return (
    <ChatContext.Provider
      value={{
        servers,
        activeServerId,
        setActiveServerId,
        channels: servers.find((s) => s.id === activeServerId)?.channels || [],
        activeChannelId,
        setActiveChannelId,
        messages,
        members,
        loading,
        sendMessage,
        createServer,
        createChannel,
        fetchServers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
