'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CreditCard, Eye, EyeOff, Key, Layers, Loader2, Megaphone } from 'lucide-react';
import api from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const HIGHLIGHTS = [
  { icon: Key, text: 'Quản lý khách hàng, gói dịch vụ và License Key' },
  { icon: CreditCard, text: 'Theo dõi đơn hàng, doanh thu và bảng giá' },
  { icon: Layers, text: 'Kho tài nguyên và album slider trên app' },
  { icon: Megaphone, text: 'Popup thông báo và cấu hình hệ thống' },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a persistent device ID for the admin dashboard if it doesn't exist
      let deviceFingerprint = localStorage.getItem('admin_dashboard_device_id');
      if (!deviceFingerprint) {
        deviceFingerprint = 'admin-dashboard-' + Date.now();
        localStorage.setItem('admin_dashboard_device_id', deviceFingerprint);
      }

      // Use the regular login endpoint, but Admin dashboard expects an admin account
      const res = await api.post('/auth/login', {
        email,
        password,
        deviceFingerprint
      });

      const session = res.data.data;

      // Store token
      localStorage.setItem('admin_token', session.accessToken);
      localStorage.setItem('admin_user_id', session.userId);
      localStorage.setItem('admin_device_id', session.deviceId);

      // We rely on the API returning data, if they don't have ADMIN role,
      // the dashboard endpoints will return 403 Forbidden anyway.
      toast.success('Đăng nhập thành công');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — hidden on small screens, where the form card carries the logo instead */}
      <aside className="relative hidden overflow-hidden bg-[oklch(0.2_0.045_265)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-cyan-400/15 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-xl shadow-lg ring-1 ring-white/15" priority />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">DH STUDIO PRO</p>
            <p className="text-xs text-white/70">DevHouse Software</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-4xl font-semibold leading-tight tracking-tight text-balance">
              Trung tâm quản trị DH Studio Pro
            </p>
            <p className="text-base leading-relaxed text-white/75">
              Một nơi để vận hành giấy phép, đơn hàng và nội dung hiển thị trên ứng dụng của khách hàng.
            </p>
          </div>

          <ul className="space-y-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} DevHouse Software. Chỉ dành cho quản trị viên.
        </p>
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <Image
              src="/logo.png"
              alt="DH Studio Pro"
              width={48}
              height={48}
              className="mx-auto rounded-xl shadow-sm ring-1 ring-foreground/10 lg:hidden"
              priority
            />
            <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập quản trị</h1>
            <p className="text-sm text-muted-foreground">
              Dùng tài khoản có quyền Admin để quản lý giấy phép của Photo Picker Pro.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Tài khoản (Username hoặc Email)</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="admin hoặc admin@example.com"
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-10 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="h-10 w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
