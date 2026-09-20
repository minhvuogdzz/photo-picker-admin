'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock, ShieldAlert, CheckCircle2, Loader2, RefreshCw, Sliders, Info, Zap } from 'lucide-react';

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

  const handleSave = () => {
    if (isNaN(durationMinutes) || durationMinutes < 1) {
      toast.error('Vui lòng nhập thời gian phiên hợp lệ (tối thiểu 1 phút)');
      return;
    }
    updateMutation.mutate(durationMinutes);
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
    </div>
  );
}
