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
