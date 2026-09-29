'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Megaphone,
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  Code,
  Laptop,
  Sun,
  Moon,
  Info,
  Layers,
  Wrench,
  Tag,
  Check,
} from 'lucide-react';

const DEFAULT_TERMS_HTML = `<div style="font-family: inherit; line-height: 1.6;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25);">
    <span style="font-size: 20px;">📢</span>
    <span style="font-weight: 700; color: #2563eb; font-size: 14px;">Cập Nhật Quan Trọng Từ Ngày 01/10/2026</span>
  </div>

  <p style="margin-bottom: 12px; font-weight: 600;">Kính gửi Quý Khách hàng và Đối tác,</p>

  <p style="margin-bottom: 12px;">
    MVD Tech & Design Studio xin thông báo: Kể từ ngày <strong>01/10/2026</strong>, hệ thống sẽ chính thức áp dụng <strong>Điều khoản dịch vụ & Chính sách bản quyền mới</strong> nhằm nâng cao chất lượng vận hành và bảo vệ quyền lợi tối đa cho người dùng bản quyền.
  </p>

  <div style="background: rgba(148, 163, 184, 0.12); padding: 12px 16px; border-radius: 12px; border-left: 4px solid #3b82f6; margin-bottom: 14px;">
    <div style="font-weight: 700; margin-bottom: 6px; font-size: 13px;">📌 Các điểm chính cần lưu ý:</div>
    <ul style="margin: 0; padding-left: 18px; font-size: 12.5px;">
      <li style="margin-bottom: 4px;">Các gói bản quyền kích hoạt trước ngày 01/10/2026 vẫn được bảo lưu thời hạn và quyền lợi đầy đủ.</li>
      <li style="margin-bottom: 4px;">Tính năng lưu trữ đám mây và đồng bộ presets sẽ được tối ưu băng thông tốc độ cao.</li>
      <li style="margin-bottom: 4px;">Người dùng cần tuân thủ quy định kích hoạt tối đa 1 thiết bị hoạt động đồng thời trên mỗi mã bản quyền.</li>
    </ul>
  </div>

  <p style="margin-bottom: 8px; font-size: 12px; color: #64748b;">
    Mọi thắc mắc và yêu cầu hỗ trợ, Quý khách vui lòng liên hệ Zalo hỗ trợ chính thức hoặc tham gia nhóm cộng đồng của chúng tôi. Xin chân thành cảm ơn!
  </p>
</div>`;

const TEMPLATE_MAINTENANCE = `<div style="font-family: inherit; line-height: 1.6;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px; border-radius: 12px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3);">
    <span style="font-size: 20px;">🛠️</span>
    <span style="font-weight: 700; color: #d97706; font-size: 14px;">Thông Báo Nâng Cấp Hệ Thống Máy Chủ</span>
  </div>

  <p style="margin-bottom: 12px;">
    Để nâng cao tốc độ tải ảnh và tính năng bóc tách số thứ tự, hệ thống MVD Server sẽ tiến hành bảo trì định kỳ:
  </p>

  <div style="background: rgba(148, 163, 184, 0.1); padding: 12px 16px; border-radius: 12px; margin-bottom: 14px;">
    <p style="margin: 0 0 6px 0; font-size: 13px;">⏱ <strong>Thời gian dự kiến:</strong> 23:30 - 02:00 ngày mai.</p>
    <p style="margin: 0; font-size: 13px;">⚡ <strong>Phạm vi ảnh hưởng:</strong> Các tính năng ngoại tuyến (offline) vẫn hoạt động 100% bình thường trên máy tính của bạn.</p>
  </div>
</div>`;

const TEMPLATE_PROMO = `<div style="font-family: inherit; line-height: 1.6;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px; border-radius: 12px; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3);">
    <span style="font-size: 20px;">🎁</span>
    <span style="font-weight: 700; color: #9333ea; font-size: 14px;">Ưu Đãi Đặc Biệt Dành Riêng Cho Bạn!</span>
  </div>

  <p style="margin-bottom: 12px;">
    Chào mừng phiên bản mới! Khi nâng cấp hoặc gia hạn gói <strong>1 Năm / Vĩnh Viễn</strong> trong tuần này, bạn sẽ nhận được trọn bộ quà tặng:
  </p>

  <ul style="margin: 0 0 14px 0; padding-left: 20px; font-size: 13px;">
    <li style="margin-bottom: 5px;">🔥 Tặng thêm <strong>30 ngày sử dụng miễn phí</strong>.</li>
    <li style="margin-bottom: 5px;">📦 Trọn bộ kho Preset & Mockup độc quyền 2026.</li>
    <li style="margin-bottom: 5px;">⚡ Hỗ trợ kích hoạt và cài đặt Ultraview 1-1 miễn phí.</li>
  </ul>
</div>`;

export function AnnouncementPopupManager() {
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('Thông Báo Cập Nhật Điều Khoản Dịch Vụ Mới');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TERMS_HTML);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  // Fetch configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ['system-configs'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    },
  });

  useEffect(() => {
    if (configs) {
      if (configs.announcement_popup_enabled !== undefined) {
        setEnabled(configs.announcement_popup_enabled === 'true');
      }
      if (configs.announcement_popup_title !== undefined) {
        setTitle(configs.announcement_popup_title);
      }
      if (configs.announcement_popup_html !== undefined && configs.announcement_popup_html.trim() !== '') {
        setHtmlContent(configs.announcement_popup_html);
      }
    }
  }, [configs]);

  // Mutation to save announcement config
  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await Promise.all([
        api.post('/admin/config', {
          key: 'announcement_popup_enabled',
          value: enabled ? 'true' : 'false',
          description: 'Bật/Tắt popup thông báo động hiển thị trên app desktop sau màn hình chào mừng',
        }),
        api.post('/admin/config', {
          key: 'announcement_popup_title',
          value: title.trim() || 'Thông Báo Từ Nhà Phát Triển',
          description: 'Tiêu đề popup thông báo nhà cung cấp trên desktop app',
        }),
        api.post('/admin/config', {
          key: 'announcement_popup_html',
          value: htmlContent,
          description: 'Mã HTML/CSS inline hoặc iframe hiển thị bên trong khung div cố định của popup app desktop',
        }),
        api.post('/admin/config', {
          key: 'announcement_popup_updated_at',
          value: now,
          description: 'Thời điểm cập nhật popup thông báo',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu cấu hình Popup Thông Báo thành công! App desktop sẽ nhận ngay.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/40 p-5 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Popup Thông Báo Khách Hàng (Desktop App)</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                enabled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {enabled ? '● Đang Bật' : '○ Đang Tắt'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">
            Tự động xuất hiện trên màn hình desktop app mỗi khi người dùng mở app (sau khi màn hình Welcome kết thúc).
            Hoàn toàn điều khiển từ xa, không hardcode.
          </p>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Đang lưu...' : 'Lưu & Áp Dụng Ngay'}
        </Button>
      </div>

      {/* Grid Layout: Config on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-5">
          {/* Status Switch Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>1. Trạng Thái Hoạt Động</span>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </CardTitle>
              <CardDescription className="text-xs">
                {enabled
                  ? 'Popup đang được BẬT: Người dùng mở app sẽ nhìn thấy thông báo này.'
                  : 'Popup đang TẮT: App desktop sẽ bỏ qua và vào thẳng giao diện bình thường.'}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Title & Content Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                <span>2. Nội Dung Cấu Hình (HTML / Inline CSS)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Toàn bộ nội dung sẽ được bọc cố định trong thẻ div <code className="text-primary font-mono">.mvd-announcement-container</code> bên app desktop với kích thước và thanh cuộn an toàn, không lo bị tràn hay vỡ layout app.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Title Input */}
              <div className="space-y-1.5">
                <Label htmlFor="popup-title" className="text-xs font-semibold">
                  Tiêu đề hiển thị trên header popup:
                </Label>
                <Input
                  id="popup-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Cập Nhật Điều Khoản Dịch Vụ Mới"
                  className="font-medium"
                />
              </div>

              {/* Quick Template Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mẫu nội dung gợi ý nhanh:</span>
                  </Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => {
                      setTitle('Cập Nhật Điều Khoản Dịch Vụ Mới (01/10/2026)');
                      setHtmlContent(DEFAULT_TERMS_HTML);
                      toast.info('Đã nạp mẫu Điều khoản dịch vụ 01/10/2026');
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                    Mẫu mặc định (01/10/2026)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => {
                      setTitle('Thông Báo Nâng Cấp Máy Chủ');
                      setHtmlContent(TEMPLATE_MAINTENANCE);
                      toast.info('Đã nạp mẫu Thông báo bảo trì');
                    }}
                  >
                    <Wrench className="w-3 h-3 text-amber-500" />
                    Mẫu Bảo trì
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => {
                      setTitle('Ưu Đãi Đặc Biệt Dành Cho Khách Hàng');
                      setHtmlContent(TEMPLATE_PROMO);
                      toast.info('Đã nạp mẫu Khuyến mãi');
                    }}
                  >
                    <Tag className="w-3 h-3 text-purple-500" />
                    Mẫu Khuyến mãi
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setHtmlContent('');
                      toast.info('Đã xoá trống khung nhập');
                    }}
                  >
                    Xoá trống
                  </Button>
                </div>
              </div>

              {/* HTML Editor */}
              <div className="space-y-1.5">
                <Label htmlFor="popup-html" className="text-xs font-semibold flex items-center justify-between">
                  <span>Mã HTML / CSS Inline / Iframe:</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {htmlContent.length} ký tự
                  </span>
                </Label>
                <textarea
                  id="popup-html"
                  rows={14}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Nhập mã HTML với inline CSS tại đây..."
                  className="w-full rounded-xl border border-input bg-muted/30 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y custom-scrollbar leading-relaxed"
                />
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Mẹo cấu hình CSS:
                </div>
                <p>• Dùng inline CSS như: <code className="text-primary font-mono">&lt;div style=&quot;padding: 12px; background: rgba(59,130,246,0.1); border-radius: 8px;&quot;&gt;</code></p>
                <p>• App desktop dùng theme tự động (Light/Dark). Hãy dùng màu bán trong suốt <code className="text-primary font-mono">rgba(...)</code> để hiển thị đẹp trên cả 2 chế độ!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Live Preview (6 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-3 sticky top-4">
          <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider">Xem Trước Trực Quan (Live Preview)</span>
            </div>

            {/* Light / Dark Mode Toggle for Preview */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setPreviewTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  previewTheme === 'light'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                Sáng
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  previewTheme === 'dark'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Moon className="w-3 h-3 text-blue-400" />
                Tối
              </button>
            </div>
          </div>

          {/* Desktop App Simulation Window */}
          <div
            className={`rounded-2xl border border-border overflow-hidden shadow-xl transition-all ${
              previewTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
            }`}
          >
            {/* App Mock Window Bar */}
            <div
              className={`flex items-center justify-between px-4 py-2.5 border-b text-[11px] font-medium ${
                previewTheme === 'dark'
                  ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="font-semibold text-xs ml-1 flex items-center gap-1 text-foreground">
                  <Laptop className="w-3.5 h-3.5" />
                  MVD Photo Picker Pro - Mô phỏng màn hình Desktop
                </span>
              </div>
              <span className="text-[10px] opacity-75">
                {previewTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>

            {/* Modal Backdrop Container */}
            <div
              className={`p-4 sm:p-6 min-h-[480px] flex items-center justify-center relative ${
                previewTheme === 'dark' ? 'bg-black/60 backdrop-blur-xs' : 'bg-slate-800/40 backdrop-blur-xs'
              }`}
            >
              {!enabled ? (
                <div className="absolute inset-0 bg-black/75 z-20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-xs">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                  <div className="font-bold text-sm text-white">Popup đang ở trạng thái TẮT</div>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Người dùng mở app sẽ không nhìn thấy modal này. Hãy bật công tắc phía trên nếu muốn kích hoạt.
                  </p>
                </div>
              ) : null}

              {/* Exact Desktop App Popup Modal Replication */}
              <div
                className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
                  previewTheme === 'dark'
                    ? 'bg-slate-900 border-slate-700/80 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
                }`}
              >
                {/* Popup Header */}
                <div
                  className={`flex items-center justify-between px-5 py-3.5 border-b ${
                    previewTheme === 'dark'
                      ? 'bg-slate-800/60 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xs">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold leading-tight">
                          {title || 'Chưa đặt tiêu đề'}
                        </h4>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-500">
                          <Sparkles className="w-2.5 h-2.5" />
                          Thông báo
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Cập nhật thông tin chính thức từ MVD Tech & Design Studio
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-60">
                    <X className="w-4 h-4" />
                  </div>
                </div>

                {/* Fixed Bounding Div Container (.mvd-announcement-container) */}
                <div className="p-4 sm:p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div
                    className={`mvd-announcement-container w-full rounded-2xl border p-4 text-xs leading-relaxed overflow-hidden select-text ${
                      previewTheme === 'dark'
                        ? 'bg-slate-950/50 border-slate-800 text-slate-200'
                        : 'bg-slate-50/80 border-slate-200 text-slate-800'
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: htmlContent || '<div style="color: #888; font-style: italic;">Chưa có nội dung HTML. Hãy nhập code ở khung bên trái.</div>',
                    }}
                  />
                </div>

                {/* Popup Footer */}
                <div
                  className={`px-5 py-3 border-t flex items-center justify-between gap-3 text-xs ${
                    previewTheme === 'dark'
                      ? 'bg-slate-800/40 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Xác thực từ nhà cung cấp</span>
                  </span>

                  <button
                    type="button"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
