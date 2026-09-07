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
import { MoreHorizontal, Users, MonitorSmartphone, CreditCard, Key, Plus, Loader2, Search, Filter, ShieldAlert, BellRing, Image as ImageIcon, UploadCloud, Trash2, Eye, EyeOff, ExternalLink, ArrowUp, ArrowDown, X, Layers, RotateCw, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResourceManager } from "@/components/ResourceManager";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { compressShowcaseBatch, formatFileSizeMB, CompressionResult } from '@/lib/imageCompressor';


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
        queryClient.invalidateQueries({ queryKey: ['showcase-albums'] }),

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

  // Showcase Slider Queries & Mutations (Album Management)
  const { data: showcaseAlbums, isLoading: albumsLoading } = useQuery<any[]>({
    queryKey: ['showcase-albums'],
    queryFn: async () => {
      const res = await api.get('/admin/showcase/albums');
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumOrder, setAlbumOrder] = useState<number>(0);
  const [albumImages, setAlbumImages] = useState<CompressionResult[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string>('');
  const [selectedAlbumForView, setSelectedAlbumForView] = useState<any | null>(null);

  const handleAlbumFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const currentCount = albumImages.length;
    const remainingSlots = 20 - currentCount;

    if (remainingSlots <= 0) {
      toast.error('Bộ ảnh này đã đạt tối đa 20 ảnh!');
      e.target.value = '';
      return;
    }

    let filesToProcess = rawFiles;
    if (rawFiles.length > remainingSlots) {
      toast.warning(`Chỉ có thể chọn thêm tối đa ${remainingSlots} ảnh (giới hạn tối đa 20 ảnh/bộ).`);
      filesToProcess = rawFiles.slice(0, remainingSlots);
    }

    setIsCompressing(true);
    setCompressionProgress('Đang tự động kiểm tra & nén ảnh...');

    try {
      const results = await compressShowcaseBatch(
        filesToProcess,
        (current, total, name) => {
          setCompressionProgress(`Đang nén ảnh ${current}/${total}: ${name}`);
        }
      );

      const compressedCount = results.filter((r) => r.wasCompressed).length;
      if (compressedCount > 0) {
        toast.success(`Đã tự động nén ${compressedCount} ảnh xuống dưới 1,5 MB!`);
      }

      setAlbumImages((prev) => [...prev, ...results]);
    } catch (err: any) {
      toast.error('Lỗi khi nén ảnh: ' + (err.message || 'Không thể xử lý'));
    } finally {
      setIsCompressing(false);
      setCompressionProgress('');
      e.target.value = '';
    }
  };

  const removeAlbumImage = (index: number) => {
    setAlbumImages((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const createAlbumMutation = useMutation({
    mutationFn: async () => {
      if (!albumTitle.trim()) throw new Error('Vui lòng nhập tên bộ ảnh');
      if (albumImages.length === 0) throw new Error('Vui lòng chọn ít nhất 1 ảnh cho bộ ảnh');
      if (albumImages.length > 20) throw new Error('Một bộ ảnh chỉ được tối đa 20 ảnh');

      const formData = new FormData();
      formData.append('title', albumTitle.trim());
      if (albumDescription.trim()) formData.append('description', albumDescription.trim());
      formData.append('order', String(albumOrder));
      formData.append('isActive', 'true');

      albumImages.forEach((item) => {
        formData.append('images', item.file);
      });

      const res = await api.post('/admin/showcase/albums', formData);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Đã tạo bộ ảnh và tải lên Cloudinary thành công!');
      setCreateAlbumOpen(false);
      albumImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setAlbumImages([]);
      setAlbumTitle('');
      setAlbumDescription('');
      setAlbumOrder(0);
      queryClient.invalidateQueries({ queryKey: ['showcase-albums'] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: (err: any) => toast.error('Lỗi tạo bộ ảnh: ' + (err.response?.data?.message || err.message)),
  });

  const toggleAlbumMutation = useMutation({
    mutationFn: async ({ id, isActive, title }: { id: string; isActive: boolean; title?: string }) => {
      await api.patch(`/admin/showcase/albums/${id}`, { isActive });
      return { isActive, title };
    },
    onSuccess: (data) => {
      toast.success(
        data.isActive
          ? `Đã bật bộ ảnh "${data.title || ''}" chạy slide ngoài màn hình đăng nhập!`
          : `Đã ẩn bộ ảnh "${data.title || ''}"!`
      );
      queryClient.invalidateQueries({ queryKey: ['showcase-albums'] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: (err: any) => toast.error('Có lỗi xảy ra: ' + (err.response?.data?.message || err.message)),
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/showcase/albums/${id}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Đã xoá toàn bộ bộ ảnh thành công!');
      queryClient.invalidateQueries({ queryKey: ['showcase-albums'] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: (err: any) => toast.error('Có lỗi khi xoá bộ ảnh: ' + (err.response?.data?.message || err.message)),
  });

  const updateAlbumOrderMutation = useMutation({
    mutationFn: async ({ id, order }: { id: string; order: number }) => {
      await api.patch(`/admin/showcase/albums/${id}`, { order });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showcase-albums'] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    },
    onError: () => toast.error('Lỗi cập nhật thứ tự bộ ảnh'),
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
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Layers className="text-primary w-5 h-5" />
                  Quản lý Bộ ảnh Slider (Màn hình Đăng nhập)
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Mỗi mục là một <strong>Bộ ảnh (Album)</strong>. Mỗi lượt tải tối đa 20 ảnh; ảnh gốc không giới hạn dung lượng và được tự động nén xuống dưới 1,5 MB/ảnh. Khi Ẩn/Hiện hay Xoá sẽ áp dụng cho toàn bộ album. Màn hình đăng nhập sẽ tự động chạy slide các bộ ảnh đang bật.
                </p>
              </div>

              <Dialog open={createAlbumOpen} onOpenChange={setCreateAlbumOpen}>
                <DialogTrigger
                  render={
                    <Button className="flex items-center gap-2">
                      <Plus size={16} /> Thêm bộ ảnh mới
                    </Button>
                  }
                />
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      Thêm Bộ ảnh mới vào Slider
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="font-semibold">
                        Tên bộ ảnh <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="VD: Album Cưới Studio Mùa Xuân 2026..."
                        value={albumTitle}
                        onChange={(e) => setAlbumTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mô tả bộ ảnh (Tùy chọn)</Label>
                      <Input
                        placeholder="VD: Chụp ngoại cảnh Đà Lạt..."
                        value={albumDescription}
                        onChange={(e) => setAlbumDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">
                          Chọn ảnh (Tối đa 20 ảnh / bộ)
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          JPG, PNG, WEBP, HEIC
                        </span>
                      </div>
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={isCompressing || albumImages.length >= 20}
                        onChange={handleAlbumFilesChange}
                      />
                      <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Hệ thống tự động nén xuống dưới 1,5 MB/ảnh:
                        </p>
                        <p>
                          Ảnh gốc không bị giới hạn dung lượng. Hệ thống giảm chất lượng và kích thước theo từng bước để bảo đảm file gửi lên Cloudinary nhỏ hơn 1,5 MB.
                        </p>
                      </div>
                    </div>

                    {/* Compression in progress */}
                    {isCompressing && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{compressionProgress || 'Đang tự động nén ảnh...'}</span>
                      </div>
                    )}

                    {/* Previews List */}
                    {albumImages.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                            <span>Đã chọn: {albumImages.length}/20 ảnh</span>
                            <span className="text-muted-foreground font-normal">
                              (Tổng: {(albumImages.reduce((acc, f) => acc + f.compressedSize, 0) / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => {
                              albumImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                              setAlbumImages([]);
                            }}
                            className="text-xs text-destructive hover:underline"
                          >
                            Xoá tất cả
                          </button>
                        </div>

                        <div className="max-h-56 overflow-y-auto grid grid-cols-3 gap-2 p-2 border rounded-xl bg-muted/20">
                          {albumImages.map((p, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-lg overflow-hidden border border-border bg-black/10 aspect-video flex flex-col justify-end shadow-sm"
                            >
                              <img
                                src={p.previewUrl}
                                alt={p.file.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <button
                                type="button"
                                onClick={() => removeAlbumImage(idx)}
                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white hover:bg-destructive flex items-center justify-center transition-colors z-10"
                                title="Bỏ ảnh này"
                              >
                                <X size={12} />
                              </button>
                              <div className="relative z-10 p-1 text-[10px] text-white flex items-center justify-between drop-shadow">
                                <span className="font-mono">#{idx + 1}</span>
                                {p.wasCompressed ? (
                                  <span className="bg-amber-500/80 text-[9px] px-1 py-0.2 rounded text-white font-medium" title={`Gốc: ${formatFileSizeMB(p.originalSize)}`}>
                                    Nén {formatFileSizeMB(p.compressedSize)}
                                  </span>
                                ) : (
                                  <span className="bg-black/60 text-[9px] px-1 py-0.2 rounded text-white font-medium">
                                    {formatFileSizeMB(p.compressedSize)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Thứ tự hiển thị bắt đầu (Số nhỏ chạy trước)</Label>
                      <Input
                        type="number"
                        value={albumOrder}
                        onChange={(e) => setAlbumOrder(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => createAlbumMutation.mutate()}
                      disabled={
                        createAlbumMutation.isPending ||
                        isCompressing ||
                        albumImages.length === 0 ||
                        !albumTitle.trim()
                      }
                    >
                      {createAlbumMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải {albumImages.length} ảnh lên Cloudinary & lưu Album...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 mr-2" /> Lưu Bộ ảnh & Tải lên Cloudinary ({albumImages.length} ảnh)
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              {albumsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Đang tải danh sách các bộ ảnh...</p>
                </div>
              ) : !showcaseAlbums || !Array.isArray(showcaseAlbums) || showcaseAlbums.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl border-border/60 p-8 text-center bg-muted/20">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Layers className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">Chưa có bộ ảnh nào trong Slider</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Tạo bộ ảnh đầu tiên (tối đa 20 ảnh) để trình chiếu slide ngoài màn hình đăng nhập ứng dụng Desktop!
                  </p>
                  <Button onClick={() => setCreateAlbumOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} /> Thêm bộ ảnh ngay
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {showcaseAlbums.map((album: any, idx: number) => {
                    const photos: any[] = album.images || [];
                    const photoCount = photos.length;

                    return (
                      <div
                        key={album.id}
                        className={`group relative rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md flex flex-col bg-card ${
                          album.isActive ? 'border-border' : 'border-dashed border-muted-foreground/30 opacity-75'
                        }`}
                      >
                        {/* Header of Album Card */}
                        <div className="p-4 pb-3 flex items-start justify-between gap-2 border-b border-border/40 bg-muted/10">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold">
                                #{album.order !== undefined ? album.order : idx + 1}
                              </span>
                              <h4 className="font-bold text-base truncate text-foreground" title={album.title}>
                                {album.title}
                              </h4>
                            </div>
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                              {photoCount} / 20 ảnh • {formatDate(album.createdAt)}
                            </p>
                          </div>

                          {/* Active Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                              album.isActive
                                ? 'bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30'
                                : 'bg-gray-500/15 text-muted-foreground border border-border'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${album.isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                            {album.isActive ? 'Đang chạy' : 'Đang ẩn'}
                          </span>
                        </div>

                        {/* Photo Collage Preview */}
                        <div
                          className="relative h-44 w-full bg-black/10 overflow-hidden cursor-pointer group-hover:brightness-95 transition-all p-2"
                          onClick={() => setSelectedAlbumForView(album)}
                          title="Bấm để xem tất cả ảnh trong bộ này"
                        >
                          {photoCount === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              Chưa có ảnh trong bộ này
                            </div>
                          ) : photoCount === 1 ? (
                            <div className="w-full h-full rounded-xl overflow-hidden border border-border/50">
                              <img
                                src={photos[0].url}
                                alt={photos[0].title || album.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                          ) : photoCount === 2 ? (
                            <div className="grid grid-cols-2 gap-1.5 w-full h-full">
                              {photos.slice(0, 2).map((p, pIdx) => (
                                <div key={pIdx} className="rounded-xl overflow-hidden border border-border/50">
                                  <img
                                    src={p.url}
                                    alt={p.title || `Ảnh ${pIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : photoCount === 3 ? (
                            <div className="grid grid-cols-3 gap-1.5 w-full h-full">
                              <div className="col-span-2 rounded-xl overflow-hidden border border-border/50">
                                <img
                                  src={photos[0].url}
                                  alt={photos[0].title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                              <div className="grid grid-rows-2 gap-1.5 h-full">
                                {photos.slice(1, 3).map((p, pIdx) => (
                                  <div key={pIdx} className="rounded-lg overflow-hidden border border-border/50">
                                    <img
                                      src={p.url}
                                      alt={p.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5 w-full h-full">
                              <div className="col-span-2 rounded-xl overflow-hidden border border-border/50">
                                <img
                                  src={photos[0].url}
                                  alt={photos[0].title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                              <div className="grid grid-rows-2 gap-1.5 h-full">
                                <div className="rounded-lg overflow-hidden border border-border/50">
                                  <img
                                    src={photos[1].url}
                                    alt={photos[1].title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="relative rounded-lg overflow-hidden border border-border/50">
                                  <img
                                    src={photos[2].url}
                                    alt={photos[2].title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {photoCount > 3 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold backdrop-blur-xs">
                                      +{photoCount - 2} ảnh
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Description if any */}
                        {album.description && (
                          <p className="px-4 py-1 text-xs text-muted-foreground line-clamp-1 italic">
                            {album.description}
                          </p>
                        )}

                        {/* Action Toolbar */}
                        <div className="p-3 pt-2 flex items-center justify-between border-t border-border/50 bg-card">
                          <div className="flex items-center gap-1.5">
                            {/* Toggle Entire Album Active/Inactive */}
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 text-xs font-medium gap-1.5 ${
                                album.isActive
                                  ? 'text-green-600 hover:text-amber-600 hover:border-amber-500/50'
                                  : 'text-muted-foreground hover:text-green-600 hover:border-green-500/50'
                              }`}
                              title={album.isActive ? 'Ẩn cả bộ ảnh này' : 'Bật chạy cả bộ ảnh này'}
                              onClick={() =>
                                toggleAlbumMutation.mutate({
                                  id: album.id,
                                  isActive: !album.isActive,
                                  title: album.title,
                                })
                              }
                            >
                              {album.isActive ? (
                                <>
                                  <Eye size={14} className="text-green-600" /> Ẩn bộ ảnh
                                </>
                              ) : (
                                <>
                                  <EyeOff size={14} /> Bật bộ ảnh
                                </>
                              )}
                            </Button>

                            {/* View detail button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              title="Xem tất cả ảnh trong bộ này"
                              onClick={() => setSelectedAlbumForView(album)}
                            >
                              <ExternalLink size={14} className="mr-1" /> Xem ({photoCount})
                            </Button>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Order Adjust */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Tăng thứ tự ưu tiên (chạy trước)"
                              onClick={() =>
                                updateAlbumOrderMutation.mutate({
                                  id: album.id,
                                  order: Math.max(0, (album.order || 0) - 1),
                                })
                              }
                            >
                              <ArrowUp size={14} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Giảm thứ tự ưu tiên"
                              onClick={() =>
                                updateAlbumOrderMutation.mutate({
                                  id: album.id,
                                  order: (album.order || 0) + 1,
                                })
                              }
                            >
                              <ArrowDown size={14} />
                            </Button>

                            {/* Delete entire album */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Xoá toàn bộ bộ ảnh"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Bạn có chắc chắn muốn xoá toàn bộ bộ ảnh "${album.title}"?\n\nHành động này sẽ xoá ${photoCount} ảnh trên Cloudinary và không thể khôi phục.`
                                  )
                                ) {
                                  deleteAlbumMutation.mutate(album.id);
                                }
                              }}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal xem chi tiết bộ ảnh */}
          <Dialog
            open={Boolean(selectedAlbumForView)}
            onOpenChange={(open) => !open && setSelectedAlbumForView(null)}
          >
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    {selectedAlbumForView?.title}
                  </DialogTitle>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedAlbumForView?.isActive
                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                        : 'bg-gray-500/15 text-muted-foreground'
                    }`}
                  >
                    {selectedAlbumForView?.isActive ? 'Đang chạy slide' : 'Đang ẩn'}
                  </span>
                </div>
                {selectedAlbumForView?.description && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {selectedAlbumForView.description}
                  </p>
                )}
              </DialogHeader>

              <div className="flex-1 overflow-y-auto pt-2 space-y-4 pr-1">
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Tổng số: {selectedAlbumForView?.images?.length || 0} / 20 ảnh</span>
                  <span>Tự động chuyển slide khi người dùng mở màn hình đăng nhập</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedAlbumForView?.images?.map((photo: any, pIdx: number) => (
                    <div
                      key={pIdx}
                      className="group relative rounded-xl overflow-hidden border border-border bg-black/10 aspect-video flex flex-col justify-end shadow-sm"
                    >
                      <img
                        src={photo.url}
                        alt={photo.title || `Ảnh #${pIdx + 1}`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <a
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-black/60 text-white hover:bg-primary flex items-center justify-center transition-colors z-10 opacity-0 group-hover:opacity-100"
                        title="Mở ảnh gốc trên Cloudinary"
                      >
                        <ExternalLink size={12} />
                      </a>

                      <div className="relative z-10 p-1.5 text-[11px] text-white flex items-center justify-between drop-shadow">
                        <span className="font-mono font-bold">#{pIdx + 1}</span>
                        <span className="truncate max-w-[120px] text-[10px] opacity-80">
                          {photo.title || `Ảnh #${pIdx + 1}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>


        <TabsContent value="resources">
          <ResourceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
