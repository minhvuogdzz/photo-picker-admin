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
import { MoreHorizontal, Users, MonitorSmartphone, CreditCard, Key, Plus, Loader2, Search, Filter, ShieldAlert, BellRing, Image as ImageIcon, UploadCloud, Trash2, Eye, EyeOff, ExternalLink, ArrowUp, ArrowDown, X, Layers, RotateCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResourceManager } from "@/components/ResourceManager";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_token')) {
      router.push('/login');
    }
  }, [router]);


  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['keys'] }),
        queryClient.invalidateQueries({ queryKey: ['showcase'] }),
      ]);
      toast.success('Dữ liệu đã được làm mới');
    } catch {
      toast.error('Không thể làm mới dữ liệu');
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data;
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
  });

  const { data: keys, isLoading: keysLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: async () => {
      const res = await api.get('/license/keys');
      return res.data;
    },
  });

  // User Actions
  const updateSubMutation = useMutation({
    mutationFn: async ({ id, addDays, status, isPremium }: any) => {
      await api.post(`/admin/users/${id}/subscription`, { addDays, status, isPremium });
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
  const [newUser, setNewUser] = useState({ email: '', username: '', name: '', password: '' });
  const createUserMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/users`, newUser);
    },
    onSuccess: () => {
      toast.success('Đã tạo tài khoản thành công');
      setCreateUserOpen(false);
      setNewUser({ email: '', username: '', name: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: any) => toast.error('Lỗi tạo tài khoản: ' + (err.response?.data?.message || err.message))
  });

  // Key Actions
  const [generateKeysOpen, setGenerateKeysOpen] = useState(false);
  const [keyParams, setKeyParams] = useState({ count: 1, durationDays: 90, keyType: 'ORIGINAL' });
  const generateKeysMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/license/generate`, keyParams);
    },
    onSuccess: () => {
      toast.success(`Đã tạo ${keyParams.count} key ${keyParams.keyType === 'PREMIUM' ? '👑 Premium' : 'Original'} thành công`);
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

  // Showcase Slider Queries & Mutations
  const { data: showcaseImages, isLoading: showcaseLoading } = useQuery<any[]>({
    queryKey: ['showcase'],
    queryFn: async () => {
      const res = await api.get('/admin/showcase');
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const [uploadShowcaseOpen, setUploadShowcaseOpen] = useState(false);
  const [showcaseFiles, setShowcaseFiles] = useState<File[]>([]);
  const [showcasePreviews, setShowcasePreviews] = useState<{ id: string; file: File; url: string }[]>([]);
  const [showcaseTitle, setShowcaseTitle] = useState('');
  const [showcaseOrder, setShowcaseOrder] = useState<number>(0);

  const handleShowcaseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    for (const f of rawFiles) {
      if (f.size > MAX_SIZE) {
        oversizedFiles.push(`${f.name} (${(f.size / (1024 * 1024)).toFixed(1)}MB)`);
      } else {
        validFiles.push(f);
      }
    }

    if (oversizedFiles.length > 0) {
      toast.error(`Có ${oversizedFiles.length} file vượt quá giới hạn 5MB:\n${oversizedFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      const newPreviews = validFiles.map((file) => ({
        id: Math.random().toString(36).substring(2),
        file,
        url: URL.createObjectURL(file),
      }));

      setShowcaseFiles((prev) => [...prev, ...validFiles]);
      setShowcasePreviews((prev) => [...prev, ...newPreviews]);
    }

    // Reset input value so same files can be re-selected
    e.target.value = '';
  };

  const removePreviewFile = (index: number) => {
    setShowcaseFiles((prev) => prev.filter((_, i) => i !== index));
    setShowcasePreviews((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadShowcaseMutation = useMutation({
    mutationFn: async () => {
      if (showcaseFiles.length === 0) throw new Error('Vui lòng chọn ít nhất 1 ảnh');
      const formData = new FormData();
      showcaseFiles.forEach((file) => {
        formData.append('images', file);
      });
      if (showcaseTitle.trim()) formData.append('title', showcaseTitle.trim());
      formData.append('order', String(showcaseOrder));

      const res = await api.post('/admin/showcase/upload', formData);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || `Đã tải ${showcaseFiles.length} ảnh lên Cloudinary và lưu vào Album`);
      setUploadShowcaseOpen(false);
      showcasePreviews.forEach((p) => URL.revokeObjectURL(p.url));
      setShowcaseFiles([]);
      setShowcasePreviews([]);
      setShowcaseTitle('');
      setShowcaseOrder(0);
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: (err: any) => toast.error('Lỗi upload: ' + (err.response?.data?.message || err.message))
  });

  const toggleShowcaseMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/admin/showcase/${id}`, { isActive });
    },
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái hiển thị');
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: () => toast.error('Có lỗi xảy ra')
  });

  const deleteShowcaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/showcase/${id}`);
    },
    onSuccess: () => {
      toast.success('Đã xoá ảnh khỏi album');
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: () => toast.error('Có lỗi khi xoá ảnh')
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, order }: { id: string; order: number }) => {
      await api.patch(`/admin/showcase/${id}`, { order });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: () => toast.error('Lỗi cập nhật thứ tự')
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredUsers = users?.filter((u: any) => {
    // Search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = u.email.toLowerCase().includes(searchLower) || 
                          u.name.toLowerCase().includes(searchLower) ||
                          (u.username && u.username.toLowerCase().includes(searchLower));
    
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
          <Button variant="outline" onClick={handleRefreshAll} disabled={isRefreshing}>
            <RotateCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
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
          <TabsTrigger value="resources" className="flex items-center gap-2"><Layers size={16}/> Kho Tài Nguyên</TabsTrigger>
          <TabsTrigger value="showcase" className="flex items-center gap-2"><ImageIcon size={16}/> Album Slider (Đăng nhập)</TabsTrigger>
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
                      <Label>Tên tài khoản (Username)</Label>
                      <Input value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} placeholder="vd: hoanghan (để trống sẽ tự lấy theo email)" />
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
                    <TableHead>Đặc quyền</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">Đang tải...</TableCell>
                    </TableRow>
                  ) : filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Không tìm thấy người dùng nào phù hợp với bộ lọc.</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user: any) => {
                      const isUpdatingUser = updateSubMutation.isPending && updateSubMutation.variables?.id === user.id;
                      const isSuspendingUser = suspendMutation.isPending && suspendMutation.variables === user.id;
                      const isKickingDevice = kickDeviceMutation.isPending && user.devices?.length > 0 && kickDeviceMutation.variables === user.devices[0].id;
                      const isRowLoading = isUpdatingUser || isSuspendingUser || isKickingDevice;

                      return (
                      <TableRow key={user.id} className={isRowLoading ? 'opacity-70 pointer-events-none transition-opacity' : 'transition-opacity'}>
                        <TableCell className="font-medium">
                          <div>{user.email}</div>
                          <div className="text-xs text-muted-foreground font-mono">@{user.username || user.email.split('@')[0]}</div>
                        </TableCell>
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
                        <TableCell>
                          {user.subscription?.isPremium ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              👑 VIP Premium
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                              Chuẩn (Original)
                            </span>
                          )}
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
                              <DropdownMenuItem
                                className={user.subscription?.isPremium ? "text-amber-600 font-semibold" : "font-semibold"}
                                onClick={() => updateSubMutation.mutate({ id: user.id, isPremium: !user.subscription?.isPremium })}
                              >
                                {user.subscription?.isPremium ? "👑 Hủy quyền VIP Premium" : "👑 Cấp quyền VIP Premium"}
                              </DropdownMenuItem>
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
                      <Label>Loại Bản Quyền (Key Type)</Label>
                      <select
                        value={keyParams.keyType}
                        onChange={(e) => setKeyParams({ ...keyParams, keyType: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="ORIGINAL">Original Key (Bản quyền chuẩn)</option>
                        <option value="PREMIUM">👑 Premium Key (Full tính năng + Kho tài nguyên)</option>
                      </select>
                    </div>
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
                    <TableHead>Loại Key</TableHead>
                    <TableHead>Thời hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người dùng (nếu có)</TableHead>
                    <TableHead>Ngày kích hoạt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keysLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">Đang tải...</TableCell>
                    </TableRow>
                  ) : (
                    keys?.map((k: any) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-mono font-medium tracking-widest">{k.key}</TableCell>
                        <TableCell>
                          {k.keyType === 'PREMIUM' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              👑 PREMIUM
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                              ORIGINAL
                            </span>
                          )}
                        </TableCell>
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

        {/* Tab Album Slider */}
        <TabsContent value="showcase">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Quản lý Album Slider (Màn hình Đăng nhập)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Các hình ảnh dưới đây được lưu trữ trên Cloudinary và tự động phát slide trên ứng dụng Desktop.
                </p>
              </div>

              <Dialog open={uploadShowcaseOpen} onOpenChange={setUploadShowcaseOpen}>
                <DialogTrigger
                  render={
                    <Button className="flex items-center gap-2">
                      <UploadCloud size={16} /> Tải ảnh mới lên Cloudinary
                    </Button>
                  }
                />
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Tải ảnh lên Album Slider</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Chọn các file ảnh (Tối đa 5MB/ảnh)</Label>
                        <span className="text-xs text-muted-foreground">JPG, PNG, WEBP</span>
                      </div>
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleShowcaseFileChange}
                      />
                      <p className="text-[12px] text-muted-foreground">
                        💡 Có thể chọn cùng lúc nhiều ảnh. Hệ thống sẽ tự động nén tối ưu hiển thị trên Cloudinary.
                      </p>
                    </div>

                    {/* Previews List */}
                    {showcasePreviews.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            Đã chọn {showcasePreviews.length} ảnh (Tổng: {(showcaseFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB)
                          </Label>
                          <button
                            type="button"
                            onClick={() => {
                              showcasePreviews.forEach((p) => URL.revokeObjectURL(p.url));
                              setShowcaseFiles([]);
                              setShowcasePreviews([]);
                            }}
                            className="text-xs text-destructive hover:underline"
                          >
                            Xoá tất cả
                          </button>
                        </div>
                        <div className="max-h-52 overflow-y-auto grid grid-cols-3 gap-2 p-2 border rounded-xl bg-muted/20">
                          {showcasePreviews.map((p, idx) => (
                            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border bg-black/10 aspect-video flex flex-col justify-end">
                              <img
                                src={p.url}
                                alt={p.file.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <button
                                type="button"
                                onClick={() => removePreviewFile(idx)}
                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white hover:bg-destructive flex items-center justify-center transition-colors z-10"
                                title="Bỏ ảnh này"
                              >
                                <X size={12} />
                              </button>
                              <div className="relative z-10 p-1 text-[10px] text-white truncate font-medium drop-shadow">
                                {(p.file.size / (1024 * 1024)).toFixed(1)}MB
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Tiêu đề chung / Tên mô tả (Tùy chọn)</Label>
                      <Input
                        placeholder="VD: Album Cưới Studio 2026..."
                        value={showcaseTitle}
                        onChange={(e) => setShowcaseTitle(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {showcaseFiles.length > 1
                          ? 'Khi tải nhiều ảnh, tiêu đề sẽ tự động đánh số: [Tên] #1, [Tên] #2...'
                          : 'Nếu để trống, hệ thống sẽ lấy tên file ảnh gốc.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Thứ tự hiển thị bắt đầu (Số nhỏ chạy trước)</Label>
                      <Input
                        type="number"
                        value={showcaseOrder}
                        onChange={(e) => setShowcaseOrder(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => uploadShowcaseMutation.mutate()}
                      disabled={uploadShowcaseMutation.isPending || showcaseFiles.length === 0}
                    >
                      {uploadShowcaseMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang nén và đẩy {showcaseFiles.length} ảnh lên Cloudinary...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 mr-2" /> Tải lên Cloudinary ({showcaseFiles.length} ảnh)
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              {showcaseLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Đang tải danh sách album...</p>
                </div>
              ) : !showcaseImages || !Array.isArray(showcaseImages) || showcaseImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl border-border/60 p-8 text-center bg-muted/20">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <ImageIcon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">Chưa có ảnh nào trong Album Slider</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Hiện tại app Desktop đang chạy bằng ảnh mặc định cục bộ. Hãy tải ảnh đầu tiên lên Cloudinary để hiển thị!
                  </p>
                  <Button onClick={() => setUploadShowcaseOpen(true)} className="flex items-center gap-2">
                    <UploadCloud size={16} /> Tải ảnh ngay
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {showcaseImages.map((img: any, idx: number) => (
                    <div
                      key={img.id}
                      className={`group relative rounded-xl border overflow-hidden transition-all shadow-sm hover:shadow-md flex flex-col bg-card ${
                        img.isActive ? 'border-border' : 'border-dashed border-muted-foreground/30 opacity-70'
                      }`}
                    >
                      {/* Image Preview */}
                      <div className="relative aspect-video w-full bg-black/10 overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.title || 'Showcase'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        
                        {/* Order badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold">
                          #{img.order !== undefined ? img.order : idx + 1}
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md ${
                              img.isActive
                                ? 'bg-green-500/80 text-white'
                                : 'bg-gray-500/80 text-white'
                            }`}
                          >
                            {img.isActive ? 'Đang chạy' : 'Đang ẩn'}
                          </span>
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <p className="font-semibold text-sm truncate" title={img.title}>
                            {img.title || 'Không có tên'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(img.createdAt)}
                          </p>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1">
                            {/* Toggle Active */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={img.isActive ? 'Ẩn ảnh này' : 'Bật hiển thị'}
                              onClick={() => toggleShowcaseMutation.mutate({ id: img.id, isActive: !img.isActive })}
                            >
                              {img.isActive ? <Eye size={15} className="text-green-600" /> : <EyeOff size={15} className="text-muted-foreground" />}
                            </Button>

                            {/* Order adjust */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Tăng thứ tự ưu tiên (Giảm số)"
                              onClick={() => updateOrderMutation.mutate({ id: img.id, order: Math.max(0, (img.order || 0) - 1) })}
                            >
                              <ArrowUp size={15} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Giảm thứ tự ưu tiên (Tăng số)"
                              onClick={() => updateOrderMutation.mutate({ id: img.id, order: (img.order || 0) + 1 })}
                            >
                              <ArrowDown size={15} />
                            </Button>

                            {/* Open link */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Mở ảnh gốc trên Cloudinary"
                              onClick={() => window.open(img.url, '_blank')}
                            >
                              <ExternalLink size={14} />
                            </Button>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Xoá ảnh"
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn xoá ảnh này khỏi Album Slider?')) {
                                deleteShowcaseMutation.mutate(img.id);
                              }
                            }}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <ResourceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
