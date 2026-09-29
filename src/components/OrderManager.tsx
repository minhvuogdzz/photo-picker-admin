'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RotateCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package,
  Check,
  Phone,
  Mail,
  User,
} from 'lucide-react';

interface OrderItem {
  id: string;
  orderCode: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  packageName: string;
  targetApp: string;
  amount: number;
  durationDays: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  qrUrl?: string;
  generatedKey?: string;
  sepayTransactionId?: string;
  paidAmount?: number;
  paidAt?: string;
  paymentNote?: string;
  createdAt: string;
  updatedAt: string;
}

export function OrderManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Fetch Orders
  const { data: orders = [], isLoading, isRefetching, refetch } = useQuery<OrderItem[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await api.get('/admin/orders');
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    },
    refetchInterval: 15000, // Tự động làm mới mỗi 15s để bắt đơn mới
  });

  // 2. Mutation Duyệt thủ công
  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/admin/orders/${orderId}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Đã duyệt đơn và xuất license key thành công!');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt đơn hàng');
    },
  });

  // 3. Mutation Gửi lại Email cho khách
  const resendMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/admin/orders/${orderId}/resend-email`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Đã gửi lại email thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi lại email');
    },
  });

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    toast.success('Đã sao chép License Key!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + (o.paidAmount || o.amount || 0), 0);
    const paidCount = orders.filter((o) => o.status === 'PAID').length;
    const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

    return {
      totalRevenue,
      paidCount,
      pendingCount,
      totalCount: orders.length,
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter status
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // Filter search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = order.orderCode?.toLowerCase().includes(q);
      const nameMatch = order.buyerName?.toLowerCase().includes(q);
      const emailMatch = order.buyerEmail?.toLowerCase().includes(q);
      const phoneMatch = order.buyerPhone?.toLowerCase().includes(q);
      const keyMatch = order.generatedKey?.toLowerCase().includes(q);
      const pkgMatch = order.packageName?.toLowerCase().includes(q);

      return codeMatch || nameMatch || emailMatch || phoneMatch || keyMatch || pkgMatch;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng Doanh Thu Đã Thu
            </CardTitle>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatVND(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 inline" /> Từ {stats.paidCount} đơn thanh toán thành công
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Đơn Đã Thanh Toán
            </CardTitle>
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.paidCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Đã tự động xuất mã bản quyền</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Đơn Chờ Thanh Toán
            </CardTitle>
            <Clock className="w-5 h-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Đang quét mã hoặc chuyển khoản</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng Đơn Hàng
            </CardTitle>
            <Package className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Toàn bộ lịch sử đặt gói</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Order Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Lịch sử Giao dịch & Đơn hàng VietQR
            </CardTitle>
            <CardDescription>
              Tự động khớp lệnh thanh toán qua SePay Webhook và xuất mã kích hoạt cho khách hàng
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo Mã đơn (MVD...), Tên, SĐT, Email, License Key..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative w-full sm:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                className="flex h-10 w-full items-center rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái ({orders.length})</option>
                <option value="PAID">Đã thanh toán (PAID)</option>
                <option value="PENDING">Chờ thanh toán (PENDING)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Mã đơn</TableHead>
                  <TableHead>Khách hàng (Người mua)</TableHead>
                  <TableHead>Gói cước</TableHead>
                  <TableHead>Ứng dụng</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Mã Bản Quyền (License Key)</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Đang tải danh sách đơn hàng...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Không có đơn hàng nào khớp với tìm kiếm.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const isApproving = approveMutation.isPending && approveMutation.variables === order.id;

                    return (
                      <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
                        {/* Order Code */}
                        <TableCell className="font-mono font-bold text-foreground">
                          {order.orderCode}
                        </TableCell>

                        {/* Customer Info */}
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            {order.buyerName || order.user?.name || 'Khách vãng lai'}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {order.buyerEmail || order.user?.email || '-'}
                          </div>
                          {order.buyerPhone && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {order.buyerPhone}
                            </div>
                          )}
                        </TableCell>

                        {/* Package */}
                        <TableCell>
                          <div className="text-xs font-semibold">{order.packageName}</div>
                          <div className="text-[11px] text-muted-foreground">+{order.durationDays} ngày</div>
                        </TableCell>

                        {/* Target App */}
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              order.targetApp === 'ALL'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}
                          >
                            {order.targetApp === 'ALL' ? 'Toàn bộ App' : order.targetApp}
                          </span>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="font-mono font-bold text-xs text-foreground">
                          {formatVND(order.amount)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {order.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Thành công
                            </span>
                          ) : order.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              Chờ thanh toán
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                              {order.status}
                            </span>
                          )}
                        </TableCell>

                        {/* Generated Key */}
                        <TableCell>
                          {order.generatedKey ? (
                            <div className="flex items-center gap-1.5">
                              <code className="text-[11px] font-mono font-bold bg-muted px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 select-all border border-border">
                                {order.generatedKey}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy(order.generatedKey!, order.id)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors cursor-pointer"
                                title="Sao chép Key"
                              >
                                {copiedKey === order.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Chưa tạo</span>
                          )}
                        </TableCell>

                        {/* Dates */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div>Tạo: {formatDate(order.createdAt)}</div>
                          {order.paidAt && (
                            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Trả: {formatDate(order.paidAt)}
                            </div>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {order.status === 'PENDING' ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              disabled={isApproving}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Bạn có chắc chắn muốn DUYỆT THỦ CÔNG đơn hàng ${order.orderCode} (${formatVND(
                                      order.amount
                                    )}) cho khách "${order.buyerName || order.buyerEmail}"?\n\nHệ thống sẽ lập tức tạo License Key và tự động kích hoạt cho khách.`
                                  )
                                ) {
                                  approveMutation.mutate(order.id);
                                }
                              }}
                            >
                              {isApproving ? (
                                <RotateCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3 h-3 mr-1" />
                              )}
                              Duyệt & Xuất Key
                            </Button>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {order.generatedKey ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                                  disabled={resendMutation.isPending && resendMutation.variables === order.id}
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Gửi lại email hóa đơn và mã License Key (${order.generatedKey}) tới "${order.buyerEmail}"?`
                                      )
                                    ) {
                                      resendMutation.mutate(order.id);
                                    }
                                  }}
                                  title="Gửi lại email xác nhận và mã key cho khách"
                                >
                                  {resendMutation.isPending && resendMutation.variables === order.id ? (
                                    <RotateCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Mail className="w-3 h-3" />
                                  )}
                                  <span>Gửi lại Email</span>
                                </Button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Đã xử lý</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
