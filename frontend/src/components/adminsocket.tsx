import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace('/api', '');

export const useAdminSocket = (
  electionId: number | null,
  onVoteUpdate?: (data: any) => void,
  onCandidateCounts?: (data: any) => void,
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!electionId) return;

    const socket = io(WS_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_role', { role: 'admin', election_id: electionId });
    });

    socket.on('vote_update', (data: any) => {
      onVoteUpdate?.(data);
    });

    socket.on('admin_candidate_counts', (data: any) => {
      onCandidateCounts?.(data);
    });

    socket.on('error', (err: any) => {
      console.error('[AdminSocket] error:', err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [electionId]);

  const requestCounts = () => {
    if (socketRef.current && electionId) {
      socketRef.current.emit('admin_candidate_counts', { election_id: electionId });
    }
  };

  return { requestCounts };
};