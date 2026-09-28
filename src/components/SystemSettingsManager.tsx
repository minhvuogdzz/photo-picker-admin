'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock, ShieldAlert, CheckCircle2, Loader2, RefreshCw, Sliders, Info, Zap, Globe, Sparkles, LayoutTemplate, Phone, Mail, Send, KeyRound, ExternalLink, Monitor } from 'lucide-react';

const PRESET_DURATIONS = [
  { label: '5 phút', value: 5 },
  { label: '10 phút (Mặc định)', value: 10 },
  { label: '15 phút', value: 15 },
  { label: '30 phút', value: 30 },
  { label: '60 phút (1 giờ)', value: 60 },
  { label: '120 phút (2 giờ)', value: 120 },
];

export function SystemSettingsManager() {
  const queryClient = useQueryClient();
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [companyUrl, setCompanyUrl] = useState('');
  const [supportZalo, setSupportZalo] = useState('');
  const [bannerBadge, setBannerBadge] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  // Màn hình chào mừng (Welcome Screen) desktop app
  const [welcomeTitle, setWelcomeTitle] = useState('MVD Tech & Design Studio');
  const [welcomeViSubtitle, setWelcomeViSubtitle] = useState('Chào mừng bạn đến với hệ sinh thái');
  const [welcomeEnSubtitle, setWelcomeEnSubtitle] = useState('Welcome to the ecosystem of');

  // Mặc định BẬT: backend cũng coi "chưa có cấu hình" là bật, để một lần deploy không
  // bao giờ tự làm hỏng các máy còn chạy app cũ.
  const [legacyCompat, setLegacyCompat] = useState(true);

  // Cấu hình dịch vụ Email (HTTPS API & SMTP)
  const [emailProvider, setEmailProvider] = useState<'auto' | 'resend' | 'brevo' | 'smtp'>('auto');
  const [resendApiKey, setResendApiKey] = useState('');
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailFromName, setEmailFromName] = useState('MVD Tech & Design Studio');
  const [testRecipient, setTestRecipient] = useState('ougvn.it2@gmail.com');

  // 1. Fetch current system configurations
  const { data: configs, isLoading, isError, refetch } = useQuery({
    queryKey: ['system-configs'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    },
  });

  useEffect(() => {
    if (configs?.session_duration_minutes) {
      const parsed = parseInt(configs.session_duration_minutes, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setDurationMinutes(parsed);
      }
    }
    if (configs?.company_website_url) {
      setCompanyUrl(configs.company_website_url);
    }
    if (configs?.support_zalo_phone !== undefined) {
      setSupportZalo(configs.support_zalo_phone);
    }
    if (configs?.launcher_banner_badge !== undefined) {
      setBannerBadge(configs.launcher_banner_badge);
    }
    if (configs?.launcher_banner_title !== undefined) {
      setBannerTitle(configs.launcher_banner_title);
    }
    if (configs?.launcher_banner_subtitle !== undefined) {
      setBannerSubtitle(configs.launcher_banner_subtitle);
    }
    if (configs?.welcome_screen_title !== undefined) {
      setWelcomeTitle(configs.welcome_screen_title);
    }
    if (configs?.welcome_screen_vi_subtitle !== undefined) {
      setWelcomeViSubtitle(configs.welcome_screen_vi_subtitle);
    }
    if (configs?.welcome_screen_en_subtitle !== undefined) {
      setWelcomeEnSubtitle(configs.welcome_screen_en_subtitle);
    }
    if (configs?.legacy_resource_compat !== undefined) {
      setLegacyCompat(String(configs.legacy_resource_compat).trim().toLowerCase() !== 'false');
    }
    if (configs?.email_provider) {
      setEmailProvider(configs.email_provider as any);
    }
    if (configs?.resend_api_key) {
      setResendApiKey(configs.resend_api_key);
    }
    if (configs?.brevo_api_key) {
      setBrevoApiKey(configs.brevo_api_key);
    }
    if (configs?.email_from_address) {
      setEmailFromAddress(configs.email_from_address);
    }
    if (configs?.email_from_name) {
      setEmailFromName(configs.email_from_name);
    }
  }, [configs]);

  // 2. Mutation to update configuration
  const updateMutation = useMutation({
    mutationFn: async (minutes: number) => {
      const res = await api.post('/admin/config', {
        key: 'session_duration_minutes',
        value: String(minutes),
        description: 'Thời gian tối đa của 1 phiên làm việc trước khi tự động kích ra (tính bằng phút)',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu cấu hình thời gian phiên làm việc thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình hệ thống');
    },
  });

  // 3. Mutation to update company website URL
  const updateUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await api.post('/admin/config', {
        key: 'company_website_url',
        value: url,
        description: 'Link trang web công ty hiển thị ở footer ứng dụng desktop',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu link website công ty!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể lưu link website');
    },
  });

  // 3b. Mutation: số Zalo hỗ trợ hiện trong app desktop
  const updateZaloMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await api.post('/admin/config', {
        key: 'support_zalo_phone',
        value: phone,
        description: 'Số Zalo hỗ trợ hiển thị trong app desktop (popup gia hạn, màn hình hệ thống)',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu số Zalo hỗ trợ!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể lưu số Zalo hỗ trợ');
    },
  });

  const handleSaveZalo = () => {
    const trimmed = supportZalo.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập số Zalo hỗ trợ.');
      return;
    }
    updateZaloMutation.mutate(trimmed);
  };

  // 4. Mutation to update launcher banner
  const updateBannerMutation = useMutation({
    mutationFn: async (data: { badge: string; title: string; subtitle: string }) => {
      await Promise.all([
        api.post('/admin/config', {
          key: 'launcher_banner_badge',
          value: data.badge,
          description: 'Nhãn badge banner trang chủ desktop (ví dụ: MVD Tech & Design Studio · Hệ thống sẵn sàng)',
        }),
        api.post('/admin/config', {
          key: 'launcher_banner_title',
          value: data.title,
          description: 'Tiêu đề lời chào banner trang chủ (hỗ trợ {name}, ví dụ: Chào mừng trở lại, {name})',
        }),
        api.post('/admin/config', {
          key: 'launcher_banner_subtitle',
          value: data.subtitle,
          description: 'Mô tả hoặc thông báo studio hiển thị dưới tiêu đề trang chủ',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu cấu hình banner trang chủ desktop thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình banner');
    },
  });

  // 4b. Mutation to update welcome screen
  const updateWelcomeMutation = useMutation({
    mutationFn: async (data: { title: string; viSubtitle: string; enSubtitle: string }) => {
      await Promise.all([
        api.post('/admin/config', {
          key: 'welcome_screen_title',
          value: data.title,
          description: 'Tiêu đề hiển thị trên màn hình chào mừng Desktop App',
        }),
        api.post('/admin/config', {
          key: 'welcome_screen_vi_subtitle',
          value: data.viSubtitle,
          description: 'Phụ đề Tiếng Việt hiển thị trên màn hình chào mừng Desktop App',
        }),
        api.post('/admin/config', {
          key: 'welcome_screen_en_subtitle',
          value: data.enSubtitle,
          description: 'Phụ đề Tiếng Anh hiển thị trên màn hình chào mừng Desktop App',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu cấu hình màn hình chào mừng desktop thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình màn hình chào');
    },
  });

  const handleSaveWelcome = () => {
    updateWelcomeMutation.mutate({
      title: welcomeTitle.trim() || 'MVD Tech & Design Studio',
      viSubtitle: welcomeViSubtitle.trim() || 'Chào mừng bạn đến với hệ sinh thái',
      enSubtitle: welcomeEnSubtitle.trim() || 'Welcome to the ecosystem of',
    });
  };

  // 5. Mutation: chế độ tương thích app cũ cho Kho Tài Nguyên
  const updateLegacyCompatMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await api.post('/admin/config', {
        key: 'legacy_resource_compat',
        value: enabled ? 'true' : 'false',
        description:
          'BẬT = vẫn trả link tải cho app desktop <= 2.4.4 (chưa cập nhật). TẮT = chỉ client đã đăng nhập và còn quyền mới tải được.',
      });
      return res.data;
    },
    onSuccess: (_d, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success(
        enabled
          ? 'Đã BẬT chế độ tương thích app cũ — máy chưa cập nhật vẫn tải được tài nguyên.'
          : 'Đã TẮT chế độ tương thích — từ giờ chỉ app 2.5.0+ đã đăng nhập mới tải được.',
      );
    },
    onError: (err: any) => {
      setLegacyCompat((prev) => !prev); // revert switch khi lưu thất bại
      toast.error(err.response?.data?.message || 'Không thể lưu chế độ tương thích');
    },
  });

  const handleToggleLegacyCompat = (enabled: boolean) => {
    setLegacyCompat(enabled);
    updateLegacyCompatMutation.mutate(enabled);
  };

  const handleSave = () => {
    if (isNaN(durationMinutes) || durationMinutes < 1) {
      toast.error('Vui lòng nhập thời gian phiên hợp lệ (tối thiểu 1 phút)');
      return;
    }
    updateMutation.mutate(durationMinutes);
  };

  const handleSaveUrl = () => {
    updateUrlMutation.mutate(companyUrl.trim());
  };

  const handleSaveBanner = () => {
    updateBannerMutation.mutate({
      badge: bannerBadge.trim(),
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim(),
    });
  };

  // 6. Mutation to update Email settings
  const saveEmailMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.post('/admin/config', { key: 'email_provider', value: emailProvider, description: 'Dịch vụ gửi email (auto/resend/brevo/smtp)' }),
        api.post('/admin/config', { key: 'resend_api_key', value: resendApiKey.trim(), description: 'API Key dịch vụ Resend.com (HTTPS Port 443)' }),
        api.post('/admin/config', { key: 'brevo_api_key', value: brevoApiKey.trim(), description: 'API Key dịch vụ Brevo.com (HTTPS Port 443)' }),
        api.post('/admin/config', { key: 'email_from_address', value: emailFromAddress.trim(), description: 'Địa chỉ email gửi đi' }),
        api.post('/admin/config', { key: 'email_from_name', value: emailFromName.trim(), description: 'Tên hiển thị người gửi email' }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu cấu hình dịch vụ Email thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình Email');
    },
  });

  // 7. Mutation to test sending an email
  const testEmailMutation = useMutation({
    mutationFn: async (to: string) => {
      const res = await api.post('/admin/email/test', { to });
      return res.data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(data?.data?.message || 'Gửi email thử nghiệm thành công! Hãy kiểm tra hộp thư.');
      } else {
        toast.error(data?.data?.message || 'Gửi email thử nghiệm thất bại.');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi email thử nghiệm');
    },
  });

  const handleSaveEmail = () => {
    saveEmailMutation.mutate();
  };

  const handleTestEmail = () => {
    if (!testRecipient.trim() || !testRecipient.includes('@')) {
      toast.error('Vui lòng nhập địa chỉ email hợp lệ để nhận thử nghiệm');
      return;
    }
    testEmailMutation.mutate(testRecipient.trim());
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cutover tương thích app cũ — Kho Tài Nguyên */}
      <Card
        className={`border shadow-sm ${
          legacyCompat ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5'
        }`}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                legacyCompat
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              }`}
            >
              <ShieldAlert size={18} />
            </div>
            <CardTitle className="text-lg font-bold">
              Chế Độ Tương Thích App Cũ (Kho Tài Nguyên)
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground pt-1">
            App desktop từ 2.4.4 trở xuống lấy link tải ngay trong danh sách công khai và gọi
            endpoint tải mà không kèm token. Vì người dùng có thể bấm &quot;để sau&quot; ở hộp
            thoại cập nhật, hãy giữ BẬT cho tới khi phần lớn máy đã lên 2.5.0+.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-background/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {legacyCompat ? 'ĐANG BẬT — ưu tiên không làm hỏng app cũ' : 'ĐANG TẮT — đã siết bảo mật'}
              </p>
              <p className="text-xs text-muted-foreground">
                {legacyCompat
                  ? 'Máy chưa cập nhật vẫn tải được tài nguyên bình thường. Đổi lại, link Google Drive vẫn còn lộ ra ngoài cho người chưa mua gói.'
                  : 'Chỉ app 2.5.0+ đã đăng nhập và còn quyền mới tải được. Máy chưa cập nhật sẽ KHÔNG tải được tài nguyên nữa.'}
              </p>
            </div>

            <Button
              variant={legacyCompat ? 'default' : 'outline'}
              size="sm"
              disabled={updateLegacyCompatMutation.isPending}
              onClick={() => handleToggleLegacyCompat(!legacyCompat)}
              className="gap-1.5 shrink-0"
            >
              {updateLegacyCompatMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : legacyCompat ? (
                <ShieldAlert size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {legacyCompat ? 'Tắt tương thích (siết bảo mật)' : 'Bật lại tương thích'}
            </Button>
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground rounded-lg border border-dashed p-3">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              Thứ tự khuyến nghị: phát hành app 2.5.0 (tag + bump package.json) &rarr; deploy
              backend/admin với cờ này BẬT &rarr; chờ người dùng cập nhật &rarr; quay lại đây TẮT
              cờ để đóng lỗ hổng. Cờ có hiệu lực trong vòng 30 giây.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Clock size={18} />
                </div>
                <CardTitle className="text-lg font-bold">Giới Hạn Thời Gian Phiên Làm Việc (Session Duration)</CardTitle>
              </div>
              <CardDescription className="text-sm text-muted-foreground pt-1">
                Tự động kích người dùng và yêu cầu đăng nhập lại sau khi phiên làm việc chạm mốc thời gian quy định.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="animate-spin w-5 h-5 text-primary" />
              Đang tải cấu hình hiện tại...
            </div>
          ) : isError ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
              <ShieldAlert size={18} />
              Không thể tải cấu hình. Vui lòng kiểm tra lại kết nối backend.
            </div>
          ) : (
            <>
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chọn nhanh thời gian thông dụng
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_DURATIONS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDurationMinutes(preset.value)}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                        durationMinutes === preset.value
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-bold shadow-sm'
                          : 'bg-muted/40 border-border/60 hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {durationMinutes === preset.value && (
                        <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Number Input */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="session-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Hoặc nhập số phút tùy chỉnh
                </Label>
                <div className="relative">
                  <Input
                    id="session-input"
                    type="number"
                    min={1}
                    max={1440}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                    className="pr-16 text-base font-mono font-bold"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                    phút
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Thời lượng hiện tại: <span className="font-bold text-amber-400">{durationMinutes} phút</span> ({Math.floor(durationMinutes * 60)} giây)
                </p>
              </div>

              {/* Policy Notes / Info Box */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
                  <Info size={14} />
                  Quy trình hoạt động trên ứng dụng máy tính (Desktop App)
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
                  <li>
                    Người dùng đăng nhập sẽ bắt đầu phiên làm việc có thời lượng tối đa là <strong className="text-foreground">{durationMinutes} phút</strong>.
                  </li>
                  <li>
                    Đồng hồ trên thanh tiêu đề (TopBar) sẽ đếm ngược trực tiếp thời gian còn lại.
                  </li>
                  <li>
                    Khi còn <strong className="text-amber-400">30 giây cuối</strong>, ứng dụng tự động hiển thị <strong className="text-foreground">Popup cảnh báo khẩn</strong> kèm đồng hồ đếm ngược để người dùng lưu tiến độ.
                  </li>
                  <li>
                    Khi chạm mốc <strong className="text-destructive">0 giây</strong>, ứng dụng tự động khóa phiên, đăng xuất và hiển thị màn hình thông báo hết giờ. Người dùng có thể đăng nhập lại ngay lập tức.
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all gap-2"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang lưu cấu hình...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Lưu cấu hình phiên ({durationMinutes} phút)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Support Zalo Config */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <Phone size={18} />
              </div>
              <CardTitle className="text-lg font-bold">Số Zalo Hỗ Trợ</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground pt-1">
              Hiển thị ở popup cảnh báo sắp hết hạn và màn hình Hệ thống trong app desktop.
              Chưa cấu hình thì app sẽ ẩn hẳn phần liên hệ (không hiện số sai).
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-lg">
            <Label htmlFor="support-zalo-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Số điện thoại Zalo
            </Label>
            <Input
              id="support-zalo-input"
              type="tel"
              placeholder="0869528304"
              value={supportZalo}
              onChange={(e) => setSupportZalo(e.target.value)}
              className="text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              App sẽ mở https://zalo.me/&lt;số này&gt; khi khách bấm vào.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button onClick={handleSaveZalo} disabled={updateZaloMutation.isPending} className="gap-2">
              {updateZaloMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Phone size={16} />
                  Lưu số Zalo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Website URL Config */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Globe size={18} />
              </div>
              <CardTitle className="text-lg font-bold">Link Website Công Ty</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground pt-1">
              Link trang web sẽ hiển thị ở footer của ứng dụng desktop. Để trống nếu không muốn hiển thị.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-lg">
            <Label htmlFor="company-url-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              URL trang web
            </Label>
            <Input
              id="company-url-input"
              type="url"
              placeholder="https://mvdphotoshopacademy.com"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Nhập đầy đủ URL bao gồm https:// (ví dụ: https://mvdphotoshopacademy.com)
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={handleSaveUrl}
              disabled={updateUrlMutation.isPending}
              className="gap-2"
            >
              {updateUrlMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Globe size={16} />
                  Lưu link website
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Launcher Header Banner Config */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <LayoutTemplate size={18} />
              </div>
              <CardTitle className="text-lg font-bold">Tùy Chỉnh Banner Trang Chủ Desktop (Launcher Header)</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground pt-1">
              Tùy biến lời chào, nhãn badge trạng thái và thông báo hiển thị ở đầu trang chủ ứng dụng desktop. Để trống sẽ dùng mặc định của hệ thống.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-badge-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nhãn Badge Trạng Thái
              </Label>
              <Input
                id="banner-badge-input"
                type="text"
                placeholder="MVD Tech & Design Studio · Hệ thống sẵn sàng"
                value={bannerBadge}
                onChange={(e) => setBannerBadge(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Nhãn nhỏ trên cùng (ví dụ: MVD Tech & Design Studio · Hệ thống sẵn sàng)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-title-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tiêu Đề / Lời Chào
              </Label>
              <Input
                id="banner-title-input"
                type="text"
                placeholder="Chào buổi tối, {name}"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Dùng <code className="text-primary font-mono font-bold">{"{name}"}</code> để tự động chèn tên người dùng (ví dụ: Chào mừng, {"{name}"})
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-subtitle-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mô Tả / Thông Báo Studio
            </Label>
            <Input
              id="banner-subtitle-input"
              type="text"
              placeholder="Trung tâm điều phối ứng dụng tự động hoá studio. Chọn công cụ bên dưới để bắt đầu luồng làm việc."
              value={bannerSubtitle}
              onChange={(e) => setBannerSubtitle(e.target.value)}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Dòng thông báo hoặc lời nhắc hiển thị dưới tiêu đề chính
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={handleSaveBanner}
              disabled={updateBannerMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {updateBannerMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu banner...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Lưu banner trang chủ
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tùy Chỉnh Màn Hình Khởi Động (Welcome Screen) */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <Monitor size={18} />
              </div>
              <CardTitle className="text-lg font-bold">Tùy Chỉnh Màn Hình Chào Mừng (Welcome Screen)</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground pt-1">
              Tùy biến câu chào và phụ đề song ngữ hiển thị kèm logo thương hiệu khi khởi động ứng dụng desktop. Dữ liệu được đồng bộ trực tiếp từ backend về máy khách.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="welcome-title-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tên / Tiêu Đề Hệ Thống (Title)
            </Label>
            <Input
              id="welcome-title-input"
              type="text"
              placeholder="MVD Tech & Design Studio"
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              className="text-sm font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              Tiêu đề chính lớn nhất nằm giữa màn hình chào (mặc định: <span className="font-semibold text-primary">MVD Tech & Design Studio</span>)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="welcome-vi-subtitle-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phụ Đề Tiếng Việt (Phase 1)
              </Label>
              <Input
                id="welcome-vi-subtitle-input"
                type="text"
                placeholder="Chào mừng bạn đến với hệ sinh thái"
                value={welcomeViSubtitle}
                onChange={(e) => setWelcomeViSubtitle(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Dòng chữ nhỏ chạy trước trong 2.8 giây đầu
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-en-subtitle-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phụ Đề Tiếng Anh (Phase 2)
              </Label>
              <Input
                id="welcome-en-subtitle-input"
                type="text"
                placeholder="Welcome to the ecosystem of"
                value={welcomeEnSubtitle}
                onChange={(e) => setWelcomeEnSubtitle(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Dòng chữ nhỏ chuyển tiếp hiển thị bằng tiếng Anh
              </p>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 relative overflow-hidden">
            <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Live Preview
            </div>
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 p-2 shadow-lg flex items-center justify-center mb-3">
                <img
                  src="/brand/mvd_brand_logo_minimal_white.png"
                  alt="Logo"
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                />
              </div>
              <span className="text-[11px] font-medium tracking-[0.2em] text-sky-400 uppercase">
                {welcomeViSubtitle || 'Chào mừng bạn đến với hệ sinh thái'}
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide mt-1">
                {welcomeTitle || 'MVD Tech & Design Studio'}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={handleSaveWelcome}
              disabled={updateWelcomeMutation.isPending}
              className="gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              {updateWelcomeMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu màn hình chào...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Lưu Màn Hình Chào Mừng
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cấu Hình Dịch Vụ Gửi Email (HTTPS API & SMTP) */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
                <Mail size={18} />
              </div>
              <CardTitle className="text-lg font-bold">
                Cấu Hình Dịch Vụ Gửi Email (Thông Báo & Cấp Key)
              </CardTitle>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              Hỗ trợ HTTPS 443 (Render Không Chặn)
            </span>
          </div>
          <CardDescription className="text-sm text-muted-foreground pt-1">
            Máy chủ Render Free chặn các cổng SMTP thông thường (465, 587). Bạn có thể cấu hình API Key dịch vụ <strong>Resend</strong> hoặc <strong>Brevo</strong> (miễn phí) để gửi email kích hoạt bản quyền tức thì qua cổng HTTPS 443.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dịch Vụ Gửi Email (Provider)
              </Label>
              <select
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="auto">Tự động (Ưu tiên Resend ➔ Brevo ➔ SMTP)</option>
                <option value="resend">Resend.com (Khuyên dùng - Cổng 443)</option>
                <option value="brevo">Brevo / Sendinblue (Cổng 443)</option>
                <option value="smtp">Gmail SMTP (Cần server mở cổng 465/587)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Khuyên chọn Resend hoặc Brevo để tránh bị chặn kết nối trên cloud.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tên Hiển Thị Người Gửi (From Name)
              </Label>
              <Input
                type="text"
                placeholder="MVD Tech & Design Studio"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Tên hiển thị khi khách nhận được email (VD: MVD Tech & Design Studio).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resend API Key (Khuyên dùng)
              </Label>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Lấy API key tại Resend.com <ExternalLink size={12} />
              </a>
            </div>
            <Input
              type="password"
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              className="text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Miễn phí 3.000 mail/tháng. Đăng ký tại resend.com và dán key dạng <code className="font-mono text-primary font-bold">re_...</code> vào đây.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brevo API Key (Tùy chọn)
              </Label>
              <a
                href="https://app.brevo.com/settings/keys/api"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Lấy API key tại Brevo.com <ExternalLink size={12} />
              </a>
            </div>
            <Input
              type="password"
              placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={brevoApiKey}
              onChange={(e) => setBrevoApiKey(e.target.value)}
              className="text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Miễn phí 300 mail/ngày. Hỗ trợ gửi từ địa chỉ Gmail đã xác minh.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Địa Chỉ Email Người Gửi (From Email)
            </Label>
            <Input
              type="text"
              placeholder="onboarding@resend.dev hoặc ougvn.it2@gmail.com"
              value={emailFromAddress}
              onChange={(e) => setEmailFromAddress(e.target.value)}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Nếu dùng Resend chưa có tên miền riêng, để mặc định: <code className="font-mono text-primary font-bold">onboarding@resend.dev</code>. Nếu dùng Brevo: điền email Gmail của bạn.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <Button
              onClick={handleSaveEmail}
              disabled={saveEmailMutation.isPending}
              className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              {saveEmailMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu cấu hình...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Lưu cấu hình Email
                </>
              )}
            </Button>
          </div>

          {/* Hộp thử nghiệm gửi mail */}
          <div className="mt-4 pt-4 border-t bg-muted/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-primary" />
              <p className="text-sm font-semibold">Thử Nghiệm Gửi Thư Trực Tiếp</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Nhập email của bạn để kiểm tra xem hệ thống có gửi thư thành công với cấu hình hiện tại hay không:
            </p>
            <div className="flex gap-2 flex-wrap">
              <Input
                type="email"
                placeholder="Nhập email nhận thử nghiệm..."
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="text-sm max-w-sm"
              />
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                className="gap-2 shrink-0 border-primary/40 hover:bg-primary/10"
              >
                {testEmailMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang gửi thử...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Gửi Thử Ngay
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

