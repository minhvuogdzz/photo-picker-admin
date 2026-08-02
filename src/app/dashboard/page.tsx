'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Users, MonitorSmartphone, CreditCard, Key, Plus, Loader2, Search, Filter, ShieldAlert, BellRing } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data;
    },
    refetchInterval: 5000
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
    refetchInterval: 5000
  });

  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: async () => {
      const res = await api.get('/license/keys');
      return res.data;
    },
    refetchInterval: 5000
  });

  // User Actions
  const updateSubMutation = useMutation({
    mutationFn: async ({ id, addDays, status }: any) => {
      await api.post(`/admin/users/${id}/subscription`, { addDays, status });
    },
    onSuccess: () => {
      toast.success('Cập nhật gói thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error('Có lỗi xảy ra')
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/users/${id}/suspend`);
    },
    onSuccess: () => {
      toast.success('Đã khoá người dùng');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const kickDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await api.post(`/admin/devices/${deviceId}/kick`);
    },
    onSuccess: () => {
      toast.success('Đã kick thiết bị');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '' });
  const createUserMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/users`, newUser);
    },
    onSuccess: () => {
      toast.success('Đã tạo tài khoản thành công');
      setCreateUserOpen(false);
      setNewUser({ email: '', name: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: any) => toast.error('Lỗi tạo tài khoản: ' + (err.response?.data?.message || err.message))
  });

  // Key Actions
  const [generateKeysOpen, setGenerateKeysOpen] = useState(false);
  const [keyParams, setKeyParams] = useState({ count: 1, durationDays: 90 });
  const generateKeysMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/license/generate`, keyParams);
    },
    onSuccess: () => {
      toast.success(`Đã tạo ${keyParams.count} key thành công`);
      setGenerateKeysOpen(false);
      queryClient.invalidateQueries({ queryKey: ['keys'] });
    },
    onError: () => toast.error('Lỗi tạo key')
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/scan-expired');
      return res.data;
    },
    onSuccess: (data) => toast.success(`Đã quét và cảnh báo ${data.count} tài khoản`),
    onError: () => toast.error('Có lỗi khi quét')
  });

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/notify-expiring');
      return res.data;
    },
    onSuccess: (data) => toast.success(`Đã gửi thông báo cho ${data.count} tài khoản`),
    onError: () => toast.error('Có lỗi khi gửi thông báo')
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredUsers = users?.filter((u: any) => {
    // Search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = u.email.toLowerCase().includes(searchLower) || u.name.toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;

    // Filter
    if (statusFilter === 'ALL') return true;
    
    const status = u.subscription?.status || 'INACTIVE';
    const expiresAt = u.subscription?.expiresAt ? new Date(u.subscription.expiresAt) : null;
    const now = new Date();
    const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (statusFilter === 'ACTIVE') return status === 'ACTIVE';
    if (statusFilter === 'LIFETIME') return status === 'LIFETIME';
    if (statusFilter === 'TRIAL') return status === 'TRIAL';
    if (statusFilter === 'EXPIRED') return status === 'EXPIRED';
    if (statusFilter === 'SUSPENDED') return status === 'SUSPENDED';
    if (statusFilter === 'EXPIRING_SOON') return (status === 'ACTIVE' || status === 'TRIAL') && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
    if (statusFilter === 'CRACK') return status === 'EXPIRED' || status === 'INACTIVE';

    return true;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatDateWithRemaining = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const dateFormatted = date.toLocaleDateString('vi-VN');
    
    if (days < 0) return `${dateFormatted} (Đã hết hạn)`;
    if (days === 0) return `${dateFormatted} (Hết hôm nay)`;
    return `${dateFormatted} (Còn ${days} ngày)`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <Button variant="destructive" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            {scanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
            Quét Bản Quyền
          </Button>
          <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => notifyMutation.mutate()} disabled={notifyMutation.isPending}>
            {notifyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
            Thông báo Hết Hạn
          </Button>
          <Button variant="secondary" onClick={() => {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
          }}>
            Đăng xuất
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Khách hàng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gói Đang Hoạt Động</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeSubscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Thiết bị đang chạy</CardTitle>
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.totalDevices || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users size={16}/> Khách hàng</TabsTrigger>
          <TabsTrigger value="keys" className="flex items-center gap-2"><Key size={16}/> License Keys</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="mb-4">Danh sách Người dùng</CardTitle>
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Tìm kiếm theo tên hoặc email..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative w-full md:w-64">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang Active</option>
                    <option value="LIFETIME">Vĩnh viễn (Lifetime)</option>
                    <option value="TRIAL">Đang dùng thử</option>
                    <option value="EXPIRED">Đã hết hạn</option>
                    <option value="EXPIRING_SOON">Sắp hết hạn (&lt;7 ngày)</option>
                    <option value="CRACK">Crack / Không bản quyền</option>
                    <option value="SUSPENDED">Bị khoá</option>
                  </select>
                </div>
              </div>
              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-2" /> Tạo tài khoản</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo tài khoản mới</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Họ tên</Label>
                      <Input value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} placeholder="Nguyễn Văn A" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mật khẩu</Label>
                      <Input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" />
                    </div>
                    <Button className="w-full" onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {createUserMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">Đang tải...</TableCell>
                    </TableRow>
                  ) : filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Không tìm thấy người dùng nào phù hợp với bộ lọc.</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user: any) => {
                      const isUpdatingUser = updateSubMutation.isPending && updateSubMutation.variables?.id === user.id;
                      const isSuspendingUser = suspendMutation.isPending && suspendMutation.variables === user.id;
                      const isKickingDevice = kickDeviceMutation.isPending && user.devices?.length > 0 && kickDeviceMutation.variables === user.devices[0].id;
                      const isRowLoading = isUpdatingUser || isSuspendingUser || isKickingDevice;

                      return (
                      <TableRow key={user.id} className={isRowLoading ? 'opacity-70 pointer-events-none transition-opacity' : 'transition-opacity'}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.subscription?.status === 'ACTIVE' || user.subscription?.status === 'LIFETIME' 
                              ? 'bg-green-100 text-green-800' 
                              : user.subscription?.status === 'SUSPENDED' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.subscription?.status || 'INACTIVE'}
                          </span>
                        </TableCell>
                        <TableCell>{user.subscription?.status === 'LIFETIME' ? 'Vĩnh viễn' : formatDateWithRemaining(user.subscription?.expiresAt)}</TableCell>
                        <TableCell>
                          {user.devices?.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">1 Đang chạy</span>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-6 text-[10px] px-2"
                                disabled={isRowLoading}
                                onClick={() => kickDeviceMutation.mutate(user.devices[0].id)}
                              >
                                {isKickingDevice ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                {isKickingDevice ? 'Đang kick...' : 'Kick'}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Trống</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isRowLoading}>
                                {isUpdatingUser || isSuspendingUser ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            } />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateSubMutation.mutate({ id: user.id, addDays: 30 })}>
                                Gia hạn 1 tháng
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateSubMutation.mutate({ id: user.id, addDays: 90 })}>
                                Gia hạn 3 tháng
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateSubMutation.mutate({ id: user.id, addDays: 365 })}>
                                Gia hạn 1 năm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateSubMutation.mutate({ id: user.id, status: 'LIFETIME' })}>
                                Cấp Lifetime
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                onClick={() => suspendMutation.mutate(user.id)}
                              >
                                Khoá tài khoản
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quản lý License Keys</CardTitle>
              <Dialog open={generateKeysOpen} onOpenChange={setGenerateKeysOpen}>
                <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-2" /> Tạo Key mới</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo License Keys Hàng loạt</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Số lượng Key</Label>
                      <Input type="number" min={1} max={100} value={keyParams.count} onChange={(e) => setKeyParams({...keyParams, count: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Thời hạn (Ngày)</Label>
                      <Input type="number" min={1} value={keyParams.durationDays} onChange={(e) => setKeyParams({...keyParams, durationDays: parseInt(e.target.value)})} />
                    </div>
                    <Button className="w-full" onClick={() => generateKeysMutation.mutate()} disabled={generateKeysMutation.isPending}>
                      {generateKeysMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {generateKeysMutation.isPending ? 'Đang tạo...' : 'Tạo ngay'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Key</TableHead>
                    <TableHead>Thời hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người dùng (nếu có)</TableHead>
                    <TableHead>Ngày kích hoạt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keysLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">Đang tải...</TableCell>
                    </TableRow>
                  ) : (
                    keys?.map((k: any) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-mono font-medium tracking-widest">{k.key}</TableCell>
                        <TableCell>{k.durationDays} ngày</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            k.status === 'UNUSED' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {k.status}
                          </span>
                        </TableCell>
                        <TableCell>{k.user?.email || '-'}</TableCell>
                        <TableCell>{formatDate(k.activatedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
