'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  Loader2,
  FileCode,
  Sparkles,
  Star,
  CheckCircle2,
  Tag,
  UploadCloud,
  FileText,
  X,
} from 'lucide-react';

const COMMON_CATEGORIES = [
  'Photoshop Action',
  'Presets & LUTs',
  'Brushes & Cọ',
  'Overlays & Textures',
  'Giáo trình & Ebook',
  'Font chữ & Typography',
];

const COMMON_HASHTAGS = [
  'Retouch Da',
  'Dodge & Burn',
  'Frequency Separation',
  'High-End',
  'Studio',
  'Màu Cưới',
  'Tone Hàn Quốc',
  'Cinematic',
  'Lightroom',
  'Camera Raw',
  'Vẽ Tóc',
  'Texture Da',
  'Tia Nắng',
  'Bokeh',
  'Quản Lý Màu',
];

const COMMON_FORMATS = ['.ATN', '.ZIP', '.XMP', '.CUBE', '.ABR', '.PDF', '.PSD', '.TPL'];

export function ResourceManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form State
  const [category, setCategory] = useState('Photoshop Action');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(['Retouch Da', 'High-End']);
  const [customTag, setCustomTag] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [fileFormat, setFileFormat] = useState('.ATN');
  const [rating, setRating] = useState('5.0');
  const [size, setSize] = useState('4.2 MB');
  const [downloadType, setDownloadType] = useState<'DIRECT' | 'DRIVE'>('DIRECT');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [author, setAuthor] = useState('MVD Master Retoucher');
  const [order, setOrder] = useState('0');

  // Fetch Resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const res = await api.get('/admin/resources');
      return res.data?.data || [];
    },
  });

  // Reset form
  const resetForm = () => {
    setEditingItem(null);
    setCategory('Photoshop Action');
    setTitle('');
    setDescription('');
    setHashtags(['Retouch Da', 'High-End']);
    setCustomTag('');
    setIsVip(false);
    setIsHot(false);
    setFileFormat('.ATN');
    setRating('5.0');
    setSize('4.2 MB');
    setDownloadType('DIRECT');
    setDownloadUrl('');
    setSelectedFile(null);
    setAuthor('MVD Master Retoucher');
    setOrder('0');
  };

  // Open Edit Form
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setCategory(item.category || 'Photoshop Action');
    setTitle(item.title || '');
    setDescription(item.description || '');
    setHashtags(item.hashtags || []);
    setIsVip(Boolean(item.isVip));
    setIsHot(Boolean(item.isHot));
    setFileFormat(item.fileFormat || '.ZIP');
    setRating(String(item.rating || '5.0'));
    setSize(item.size || '0 MB');
    setDownloadType(item.downloadType || 'DIRECT');
    setDownloadUrl(item.downloadUrl || '');
    setSelectedFile(null);
    setAuthor(item.author || 'MVD Master Retoucher');
    setOrder(String(item.order || '0'));
    setDialogOpen(true);
  };

  // Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('hashtags', JSON.stringify(hashtags));
      formData.append('isVip', String(isVip));
      formData.append('isHot', String(isHot));
      formData.append('fileFormat', fileFormat);
      formData.append('rating', rating);
      formData.append('size', size);
      formData.append('downloadType', downloadType);
      if (downloadUrl) formData.append('downloadUrl', downloadUrl);
      formData.append('author', author);
      formData.append('order', order);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (editingItem) {
        return api.patch(`/admin/resources/${editingItem.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        return api.post('/admin/resources', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Cập nhật tài nguyên thành công!' : 'Đã thêm tài nguyên mới!');
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error('Lỗi lưu tài nguyên: ' + (err.response?.data?.message || err.message));
    },
  });

  // Toggle Active Status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/admin/resources/${id}`, { isActive });
    },
    onSuccess: () => {
      toast.success('Đã thay đổi trạng thái hiển thị');
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/resources/${id}`);
    },
    onSuccess: () => {
      toast.success('Đã xóa tài nguyên');
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
    },
    onError: () => toast.error('Lỗi khi xóa tài nguyên'),
  });

  // Handle Add Custom Tag
  const handleAddCustomTag = () => {
    if (!customTag.trim()) return;
    const clean = customTag.trim().replace(/^#/, '');
    if (!hashtags.includes(clean)) {
      setHashtags([...hashtags, clean]);
    }
    setCustomTag('');
  };

  const handleToggleTag = (tag: string) => {
    if (hashtags.includes(tag)) {
      setHashtags(hashtags.filter((t) => t !== tag));
    } else {
      setHashtags([...hashtags, tag]);
    }
  };

  // Filtered List
  const filteredResources = resources.filter((item: any) => {
    const matchCat = filterCategory === 'all' || item.category === filterCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchCat;
    const matchText =
      item.title?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.author?.toLowerCase().includes(q) ||
      item.fileFormat?.toLowerCase().includes(q) ||
      item.hashtags?.some((t: string) => t.toLowerCase().includes(q));
    return matchCat && matchText;
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng số tài nguyên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{resources.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tài nguyên VIP / Hot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {resources.filter((r: any) => r.isVip || r.isHot).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng lượt tải về
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {resources.reduce((sum: number, r: any) => sum + (r.downloads || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="text-amber-500" size={20} />
              Quản lý Kho Tài Nguyên Creative
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Đăng tải Actions, Presets, Brushes, Overlays và Giáo trình cho người dùng Desktop
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow flex items-center gap-1.5"
            >
              <Plus size={16} /> Thêm tài nguyên mới
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, tác giả, hashtag, định dạng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="w-full md:w-56">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tất cả danh mục</option>
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resources Table */}
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground text-xs gap-2">
              <Loader2 size={18} className="animate-spin text-amber-500" /> Đang tải danh sách tài nguyên...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Chưa có tài nguyên nào. Bấm "Thêm tài nguyên mới" để tạo tài nguyên đầu tiên!
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">STT</TableHead>
                    <TableHead>Tên & Mô tả tài nguyên</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Định dạng & Size</TableHead>
                    <TableHead>Nguồn tải</TableHead>
                    <TableHead>Lượt tải</TableHead>
                    <TableHead>Tác giả</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground font-mono">{index + 1}</TableCell>
                      
                      <TableCell className="max-w-[280px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          {item.isVip && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              VIP
                            </span>
                          )}
                          {item.isHot && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              HOT
                            </span>
                          )}
                          <span className="font-bold text-xs text-foreground truncate">{item.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                        {item.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.hashtags.slice(0, 3).map((h: string, i: number) => (
                              <span key={i} className="text-[9px] text-muted-foreground/80 bg-accent px-1.5 py-0.2 rounded">
                                #{h}
                              </span>
                            ))}
                            {item.hashtags.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{item.hashtags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent text-muted-foreground border">
                          {item.category}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-mono font-semibold">{item.fileFormat}</div>
                        <div className="text-[10px] text-muted-foreground">{item.size} • ★ {item.rating}</div>
                      </TableCell>

                      <TableCell>
                        {item.downloadType === 'DIRECT' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <UploadCloud size={11} /> File DB (&lt;5MB)
                          </span>
                        ) : (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 hover:underline"
                          >
                            <ExternalLink size={11} /> Google Drive
                          </a>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono">{item.downloads || 0}</TableCell>

                      <TableCell className="text-xs font-medium text-amber-500/90">{item.author}</TableCell>

                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
                          title={item.isActive ? 'Đang hiển thị (Click để ẩn)' : 'Đang ẩn (Click để hiện)'}
                        >
                          {item.isActive ? (
                            <Eye size={16} className="text-green-500" />
                          ) : (
                            <EyeOff size={16} className="text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0"
                            title="Sửa tài nguyên"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa tài nguyên: "${item.title}"?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            title="Xóa tài nguyên"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Resource Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="text-amber-500" size={18} />
              {editingItem ? 'Chỉnh sửa tài nguyên' : 'Thêm tài nguyên mới vào Kho Creative'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Loại tài nguyên */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">1. Loại tài nguyên (Category)</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="VD: Photoshop Action, Presets & LUTs..."
                className="text-xs"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      category === cat
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-accent/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tên tài nguyên */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">2. Tên tài nguyên (Title) *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Action Retouch Da Studio (D&B + Frequency Separation)"
                className="text-xs font-medium"
              />
            </div>

            {/* 3. Mô tả tài nguyên */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">3. Mô tả tài nguyên (Description)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả công dụng, tính năng, cách sử dụng..."
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* 4. Hashtags liên quan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">4. Hashtags liên quan (Tags)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="Nhập hashtag mới và nhấn Enter..."
                  className="text-xs"
                />
                <Button type="button" size="sm" onClick={handleAddCustomTag} variant="outline" className="text-xs shrink-0">
                  Thêm tag
                </Button>
              </div>

              {/* Selected Hashtags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setHashtags(hashtags.filter((t) => t !== tag))}
                      className="hover:text-destructive text-[10px]"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick Suggestions */}
              <div className="pt-1">
                <span className="text-[10px] text-muted-foreground block mb-1">Gợi ý hashtag sẵn:</span>
                <div className="flex flex-wrap gap-1">
                  {COMMON_HASHTAGS.map((tag) => {
                    const isSelected = hashtags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-accent/40 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. Tag: HOT, VIP & Định dạng tệp */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-accent/30 border">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tùy chọn hiển thị</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isVip}
                      onChange={(e) => setIsVip(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span className="font-bold text-amber-500">VIP Tag</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isHot}
                      onChange={(e) => setIsHot(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-500"
                    />
                    <span className="font-bold text-rose-500">HOT Tag</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold">5. Định dạng tệp (Format Tag)</Label>
                <Input
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                  placeholder="VD: .ATN, .ZIP, .XMP, .CUBE, .PDF..."
                  className="text-xs uppercase font-mono"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFileFormat(fmt)}
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                        fileFormat === fmt ? 'bg-primary/20 text-primary border-primary/40' : 'bg-accent/40 text-muted-foreground'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Review star & Dung lượng */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">6. Đánh giá (Star Rating)</Label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="5.0">5.0 ★★★★★ (Xuất sắc)</option>
                  <option value="4.9">4.9 ★★★★★ (Rất cao)</option>
                  <option value="4.8">4.8 ★★★★☆ (Khuyên dùng)</option>
                  <option value="4.7">4.7 ★★★★☆ (Tốt)</option>
                  <option value="4.5">4.5 ★★★★☆</option>
                  <option value="4.0">4.0 ★★★★☆</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Dung lượng hiển thị (Size)</Label>
                <Input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="VD: 4.2 MB, 48 MB, 320 MB..."
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* 7. Button chi tiết: Lựa chọn nguồn tải */}
            <div className="space-y-2 p-3.5 rounded-lg bg-accent/40 border">
              <Label className="text-xs font-bold text-foreground">7. Nguồn tải về (Download Source)</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="downloadType"
                    value="DIRECT"
                    checked={downloadType === 'DIRECT'}
                    onChange={() => setDownloadType('DIRECT')}
                    className="accent-primary"
                  />
                  <span className="font-semibold text-emerald-500">1. Tải lên trực tiếp DB (&lt; 5MB)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="downloadType"
                    value="DRIVE"
                    checked={downloadType === 'DRIVE'}
                    onChange={() => setDownloadType('DRIVE')}
                    className="accent-primary"
                  />
                  <span className="font-semibold text-blue-500">2. Google Drive / Link Ngoài</span>
                </label>
              </div>

              {downloadType === 'DIRECT' ? (
                <div className="pt-2 space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">
                    Chọn tệp đính kèm (.zip, .atn, .xmp, .cube, .abr, .pdf) tối đa 5MB:
                  </Label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setSelectedFile(f);
                        // Auto populate size and format if empty
                        const mb = (f.size / (1024 * 1024)).toFixed(1);
                        setSize(`${mb} MB`);
                        const ext = f.name.substring(f.name.lastIndexOf('.')).toUpperCase();
                        if (ext) setFileFormat(ext);
                      }
                    }}
                    className="text-xs cursor-pointer bg-background"
                  />
                  {editingItem?.fileName && !selectedFile && (
                    <p className="text-[10px] text-muted-foreground">
                      Tệp hiện tại: <strong>{editingItem.fileName}</strong> ({editingItem.size})
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-2 space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">
                    Nhập liên kết tải xuống Google Drive / Cloud:
                  </Label>
                  <Input
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            {/* 8. Tác giả & Thứ tự */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">8. Tác giả (Author)</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="VD: MVD Master Retoucher"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Thứ tự ưu tiên (Order)</Label>
                <Input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  placeholder="0"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending || !title.trim()}
              onClick={() => saveMutation.mutate()}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs flex items-center gap-1.5"
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {editingItem ? 'Lưu thay đổi' : 'Đăng tải tài nguyên'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
