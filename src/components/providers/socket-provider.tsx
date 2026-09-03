'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userId = localStorage.getItem('admin_user_id');
    const deviceId = localStorage.getItem('admin_device_id');

    if (!token || !userId) return;

    const socket = io('https://photo-picker-backend.vercel.app', {
      transports: ['websocket'],
      reconnectionAttempts: 2,
      reconnectionDelay: 15000,
      reconnectionDelayMax: 60000,
      timeout: 5000,
    });

    socket.io.on('reconnect_failed', () => {
      // Server does not support WebSockets on current deployment (serverless)
      // Disconnect cleanly to prevent infinite 404 request loops
      socket.disconnect();
    });

    socket.on('connect', () => {
      socket.emit('register', { userId });
    });

    socket.on('forceLogout', (data: { deviceId: string }) => {
      if (data.deviceId === deviceId || data.deviceId === 'all') {
        toast.error('Tài khoản của bạn đã được đăng nhập ở thiết bị khác.');
        setTimeout(() => {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user_id');
          localStorage.removeItem('admin_device_id');
          window.location.href = '/login';
        }, 3000);
      }
    });

    socket.on('accountSuspended', () => {
      toast.error('Tài khoản của bạn đã bị khoá. Đăng xuất sau 3s...');
      setTimeout(() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user_id');
        localStorage.removeItem('admin_device_id');
        window.location.href = '/login';
      }, 3000);
    });

    socket.on('subscriptionExpired', () => {
      toast.error('Tài khoản của bạn đã hết hạn. Đăng xuất sau 3s...');
      setTimeout(() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user_id');
        localStorage.removeItem('admin_device_id');
        window.location.href = '/login';
      }, 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <>{children}</>;
}
