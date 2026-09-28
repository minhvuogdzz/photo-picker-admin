'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Sparkles,
  Building2,
  Key,
  Plus,
  Trash2,
  Edit,
  RotateCw,
  Save,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Layers,
  Star,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

interface PricingPackage {
  id: string;
  targetApp: string;
  name: string;
  durationDays: number;
  price: number;
  originalPrice?: number;
  badge?: string;
  isPopular?: boolean;
}

const DEFAULT_PACKAGES: PricingPackage[] = [
  // Super App (ALL)
  {
    id: 'super_1m',
    targetApp: 'ALL',
    name: 'Gói Super App 1 Tháng',
    durationDays: 30,
    price: 99000,
    originalPrice: 129000,
  },
  {
    id: 'super_3m',
    targetApp: 'ALL',
    name: 'Gói Super App 3 Tháng',
    durationDays: 90,
    price: 149000,
    originalPrice: 249000,
    badge: 'Phổ biến',
    isPopular: true,
  },
  {
    id: 'super_6m',
    targetApp: 'ALL',
    name: 'Gói Super App 6 Tháng',
    durationDays: 180,
    price: 249000,
    originalPrice: 399000,
  },
  {
    id: 'super_12m',
    targetApp: 'ALL',
    name: 'Gói Super App 12 Tháng',
    durationDays: 365,
    price: 499000,
    originalPrice: 899000,
    badge: 'Tiết kiệm nhất',
  },
  // Photo Picker Pro
  {
    id: 'picker_1m',
    targetApp: 'photo-picker',
    name: 'Gói Photo Picker Pro 1 Tháng',
    durationDays: 30,
    price: 49000,
    originalPrice: 79000,
  },
  {
    id: 'picker_3m',
    targetApp: 'photo-picker',
    name: 'Gói Photo Picker Pro 3 Tháng',
    durationDays: 90,
    price: 129000,
    originalPrice: 199000,
  },
  {
    id: 'picker_6m',
    targetApp: 'photo-picker',
    name: 'Gói Photo Picker Pro 6 Tháng',
    durationDays: 180,
    price: 229000,
    originalPrice: 329000,
  },
  {
    id: 'picker_12m',
    targetApp: 'photo-picker',
    name: 'Gói Photo Picker Pro 12 Tháng',
    durationDays: 365,
    price: 329000,
    originalPrice: 529000,
    badge: 'Ưu đãi năm',
  },
];

const POPULAR_BANKS = [
  { bin: '970422', name: 'MBBank (Quân Đội)' },
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970458', name: 'TPBank' },
];

export function PricingManager() {
  const queryClient = useQueryClient();

  // Bank form state
  const [bankBin, setBankBin] = useState('970422');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [sepayApiKey, setSepayApiKey] = useState('');

  // Packages state
  const [packages, setPackages] = useState<PricingPackage[]>(DEFAULT_PACKAGES);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Edit/New package item state
  const [currentPackage, setCurrentPackage] = useState<PricingPackage>({
    id: '',
    targetApp: 'ALL',
    name: '',
    durationDays: 30,
    price: 99000,
    originalPrice: 129000,
    badge: '',
    isPopular: false,
  });

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
      if (configs.bank_bin) setBankBin(configs.bank_bin);
      if (configs.bank_account_no) setBankAccountNo(configs.bank_account_no);
      if (configs.bank_account_name) setBankAccountName(configs.bank_account_name);
      if (configs.sepay_webhook_api_key) setSepayApiKey(configs.sepay_webhook_api_key);

      if (configs.pricing_packages) {
        try {
          const parsed = JSON.parse(configs.pricing_packages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPackages(parsed);
          }
        } catch {}
      }
    }
  }, [configs]);

  /**
   * Kiểm tra cấu hình thanh toán TRƯỚC khi gửi lên server.
   *
   * Bắt buộc phải có API Key webhook: nếu để trống, backend không thể xác thực
   * webhook SePay và bất kỳ ai biết URL đều có thể tự gửi "đã thanh toán" để lấy
   * key bản quyền miễn phí. Các trường ngân hàng để trống thì mã VietQR sai/không
   * tạo được nên khách chuyển tiền vào tài khoản không tồn tại.
   */
  const validateBankConfig = (): string | null => {
    if (!/^\d{6}$/.test(bankBin.trim())) {
      return 'Mã BIN ngân hàng không hợp lệ (phải đúng 6 chữ số).';
    }
    if (!/^\d{6,20}$/.test(bankAccountNo.trim())) {
      return 'Số tài khoản không hợp lệ (chỉ gồm 6–20 chữ số).';
    }
    if (bankAccountName.trim().length < 3) {
      return 'Tên chủ tài khoản phải có ít nhất 3 ký tự.';
    }
    if (sepayApiKey.trim().length < 16) {
      return sepayApiKey.trim().length === 0
        ? 'Bắt buộc nhập SePay Webhook API Key — để trống thì webhook không được xác thực, ai cũng có thể tự tạo key bản quyền miễn phí.'
        : 'SePay Webhook API Key quá ngắn (cần tối thiểu 16 ký tự).';
    }
    return null;
  };

  // Save Bank Settings
  const saveBankMutation = useMutation({
    mutationFn: async () => {
      const validationError = validateBankConfig();
      if (validationError) {
        throw new Error(validationError);
      }

      await Promise.all([
        api.post('/admin/config', {
          key: 'bank_bin',
          value: bankBin,
          description: 'Mã BIN ngân hàng nhận tiền VietQR (vd: 970422)',
        }),
        api.post('/admin/config', {
          key: 'bank_account_no',
          value: bankAccountNo,
          description: 'Số tài khoản ngân hàng nhận tiền VietQR',
        }),
        api.post('/admin/config', {
          key: 'bank_account_name',
          value: bankAccountName.toUpperCase(),
          description: 'Tên chủ tài khoản ngân hàng (viết hoa không dấu)',
        }),
        api.post('/admin/config', {
          key: 'sepay_webhook_api_key',
          value: sepayApiKey,
          description: 'API Key bảo mật nhận webhook từ SePay.vn',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu cấu hình Ngân hàng & Webhook SePay thành công!');
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err?.message || 'Lỗi khi lưu cấu hình ngân hàng',
      );
    },
  });

  // Save Packages to DB
  const savePackagesMutation = useMutation({
    mutationFn: async (updatedPkgs: PricingPackage[]) => {
      const res = await api.post('/admin/config', {
        key: 'pricing_packages',
        value: JSON.stringify(updatedPkgs),
        description: 'Bảng giá danh sách các gói cước ứng dụng (V3.0)',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Đã lưu danh sách bảng giá gói cước vào hệ thống!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu bảng giá');
    },
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setCurrentPackage({
      id: `pkg_${Date.now()}`,
      targetApp: 'ALL',
      name: '',
      durationDays: 30,
      price: 99000,
      originalPrice: 129000,
      badge: '',
      isPopular: false,
    });
    setIsPackageDialogOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setCurrentPackage({ ...packages[index] });
    setIsPackageDialogOpen(true);
  };

  const handleSavePackageModal = () => {
    if (!currentPackage.name.trim()) {
      toast.error('Vui lòng nhập tên gói');
      return;
    }
    if (currentPackage.durationDays <= 0) {
      toast.error('Số ngày sử dụng phải lớn hơn 0');
      return;
    }
    if (currentPackage.price <= 0) {
      toast.error('Giá bán phải lớn hơn 0 VNĐ');
      return;
    }

    const updated = [...packages];
    if (editingIndex !== null) {
      updated[editingIndex] = currentPackage;
    } else {
      updated.push(currentPackage);
    }

    setPackages(updated);
    setIsPackageDialogOpen(false);
    savePackagesMutation.mutate(updated);
  };

  const handleDeletePackage = (index: number) => {
    const pkg = packages[index];
    if (confirm(`Bạn có chắc chắn muốn xóa gói "${pkg.name}"?`)) {
      const updated = packages.filter((_, i) => i !== index);
      setPackages(updated);
      savePackagesMutation.mutate(updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại tất cả các gói về mặc định của hệ thống?')) {
      setPackages(DEFAULT_PACKAGES);
      savePackagesMutation.mutate(DEFAULT_PACKAGES);
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: VIETQR & BANK ACCOUNT CONFIG */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Cấu hình Tài khoản Ngân hàng nhận thanh toán (VietQR)
          </CardTitle>
          <CardDescription>
            Thông tin tài khoản để tạo mã QR chuyển khoản động tự động điền sẵn số tiền và mã đơn hàng (MVDxxxxxx).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank BIN */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Ngân hàng (Mã BIN)</Label>
              <select
                value={bankBin}
                onChange={(e) => setBankBin(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name} ({b.bin})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">Mã BIN chuẩn Napas 247</p>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Số tài khoản</Label>
              <Input
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value.trim())}
                placeholder="vd: 0987654321"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Số tài khoản ngân hàng nhận tiền</p>
            </div>

            {/* Account Holder Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tên chủ tài khoản (Viết hoa không dấu)</Label>
              <Input
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                placeholder="DUONG MINH VUONG"
                className="font-bold"
              />
              <p className="text-[11px] text-muted-foreground">Phải trùng với tên đăng ký tại ngân hàng</p>
            </div>
          </div>

          {/* SePay Webhook API Key */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <Key className="w-4 h-4" />
              <span>
                SePay Webhook Authorization API Key{' '}
                <span className="text-red-500">(Bắt buộc)</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Nhập API Key bạn đã cấu hình trong bảng điều khiển SePay.vn. Hệ thống sẽ kiểm tra trường Authorization Header trong Webhook để chống giả mạo giao dịch.
            </p>
            <div className="max-w-md">
              <Input
                type="password"
                value={sepayApiKey}
                onChange={(e) => setSepayApiKey(e.target.value.trim())}
                placeholder="Nhập secret key (tối thiểu 16 ký tự)"
                className="font-mono text-xs"
              />
            </div>
            {sepayApiKey.trim().length < 16 && (
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                ⚠️ Chưa có key hợp lệ: webhook SePay sẽ bị từ chối (503) và đơn hàng không
                được tự động kích hoạt. Bắt buộc nhập tối thiểu 16 ký tự, trùng với key đã
                đặt trên SePay.vn.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveBankMutation.mutate()}
              disabled={saveBankMutation.isPending}
              className="gap-2"
            >
              {saveBankMutation.isPending ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu Thông Tin Ngân Hàng
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: PRICING PACKAGES */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Quản lý Bảng Giá Gói Cước (V3.0)
            </CardTitle>
            <CardDescription>
              Các gói này sẽ xuất hiện trên ứng dụng desktop khi người dùng bấm gia hạn hoặc khi tài khoản còn ≤ 3 ngày.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetDefaults} className="text-xs">
              Đặt lại mặc định
            </Button>
            <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs">
              <Plus className="w-4 h-4" />
              Thêm gói mới
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên gói</TableHead>
                  <TableHead>Ứng dụng áp dụng</TableHead>
                  <TableHead>Thời hạn</TableHead>
                  <TableHead>Giá bán (VNĐ)</TableHead>
                  <TableHead>Giá gốc (gạch ngang)</TableHead>
                  <TableHead>Huy hiệu</TableHead>
                  <TableHead>Nổi bật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Chưa có gói cước nào. Nhấn "Thêm gói mới" hoặc "Đặt lại mặc định".
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg, idx) => (
                    <TableRow key={pkg.id || idx}>
                      <TableCell className="font-semibold text-foreground text-xs">
                        {pkg.name}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            pkg.targetApp === 'ALL'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}
                        >
                          {pkg.targetApp === 'ALL' ? 'Toàn bộ App (Super App)' : pkg.targetApp}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs font-mono font-bold">
                        {pkg.durationDays} ngày
                      </TableCell>

                      <TableCell className="font-mono font-black text-xs text-primary">
                        {formatVND(pkg.price)}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground line-through">
                        {pkg.originalPrice ? formatVND(pkg.originalPrice) : '-'}
                      </TableCell>

                      <TableCell>
                        {pkg.badge ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            {pkg.badge}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell>
                        {pkg.isPopular ? (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleOpenEdit(idx)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePackage(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG ADD/EDIT PACKAGE */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Chỉnh sửa gói cước' : 'Thêm gói cước mới'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tên gói</Label>
              <Input
                value={currentPackage.name}
                onChange={(e) => setCurrentPackage({ ...currentPackage, name: e.target.value })}
                placeholder="vd: Gói Super App 3 Tháng"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ứng dụng áp dụng</Label>
                <select
                  value={currentPackage.targetApp}
                  onChange={(e) => setCurrentPackage({ ...currentPackage, targetApp: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="ALL">Toàn bộ App (ALL)</option>
                  <option value="photo-picker">Lọc ảnh (photo-picker)</option>
                  <option value="contact-the-sheet">Liên hệ trang tính</option>
                  <option value="photo-counter">Đếm ảnh</option>
                  <option value="resources">Kho tài nguyên</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Thời hạn (Số ngày)</Label>
                <Input
                  type="number"
                  min={1}
                  value={currentPackage.durationDays}
                  onChange={(e) =>
                    setCurrentPackage({
                      ...currentPackage,
                      durationDays: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Giá bán (VNĐ)</Label>
                <Input
                  type="number"
                  step={1000}
                  value={currentPackage.price}
                  onChange={(e) =>
                    setCurrentPackage({ ...currentPackage, price: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Giá gốc (gạch ngang)</Label>
                <Input
                  type="number"
                  step={1000}
                  value={currentPackage.originalPrice || ''}
                  onChange={(e) =>
                    setCurrentPackage({
                      ...currentPackage,
                      originalPrice: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Tuỳ chọn"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Huy hiệu (Badge)</Label>
                <Input
                  value={currentPackage.badge || ''}
                  onChange={(e) => setCurrentPackage({ ...currentPackage, badge: e.target.value })}
                  placeholder="vd: Phổ biến, Tiết kiệm"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={currentPackage.isPopular || false}
                  onChange={(e) =>
                    setCurrentPackage({ ...currentPackage, isPopular: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="isPopular" className="text-xs font-medium cursor-pointer">
                  Đánh dấu Gói nổi bật
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSavePackageModal}>
                Lưu gói cước
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
