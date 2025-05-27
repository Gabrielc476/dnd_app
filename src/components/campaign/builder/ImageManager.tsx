// src/components/campaign/builder/ImageManager.tsx

"use client";

import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit,
  Eye,
  Share,
  Grid3X3,
  Tag,
  MapPin,
} from "lucide-react";
import { Image } from "@/lib/types";
import { useImage } from "@/hooks/useImage";
import { useToast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImageManagerProps {
  campaignId?: string;
  userId: string;
  images: Image[];
  onUpdate: (images: Image[]) => void;
  isReadOnly?: boolean;
}

interface ImageFormData {
  name: string;
  description: string;
  tags: string[];
  isMap: boolean;
  gridEnabled: boolean;
  gridSize: number;
}

const defaultImageData: ImageFormData = {
  name: "",
  description: "",
  tags: [],
  isMap: false,
  gridEnabled: false,
  gridSize: 5,
};

export function ImageManager({
  campaignId,
  userId,
  images,
  onUpdate,
  isReadOnly = false,
}: ImageManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadImage,
    deleteImage,
    updateImageMetadata,
    shareImage,
    isLoading,
    error,
  } = useImage({
    campaignId: campaignId || "",
    userId,
  });

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [formData, setFormData] = useState<ImageFormData>(defaultImageData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Get all unique tags
  const allTags = Array.from(new Set(images.flatMap((img) => img.tags))).filter(
    Boolean
  );

  // Filter images based on selected tag
  const filteredImages =
    filterTag === "all"
      ? images
      : images.filter((img) => img.tags.includes(filterTag));

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setFormData({
      ...formData,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
    });

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadImage = async () => {
    if (!selectedFile || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a file and provide a name",
        variant: "destructive",
      });
      return;
    }

    try {
      const metadata = {
        name: formData.name,
        description: formData.description,
        tags: formData.tags,
        is_map: formData.isMap,
        grid_enabled: formData.gridEnabled,
        grid_size: formData.gridSize,
      };

      if (campaignId) {
        // Upload to server
        const uploadResult = await uploadImage(selectedFile, metadata);
        if (uploadResult) {
          toast({
            title: "Image Uploaded",
            description: `"${formData.name}" has been uploaded successfully`,
          });
        }
      } else {
        // Add to local state for new campaigns
        const newImage: Image = {
          id: generateId(),
          url: previewUrl,
          name: formData.name,
          description: formData.description,
          tags: formData.tags,
          is_map: formData.isMap,
          grid_enabled: formData.gridEnabled,
          grid_size: formData.gridSize,
        };
        onUpdate([...images, newImage]);
        toast({
          title: "Image Added",
          description: "Image will be uploaded when the campaign is created",
        });
      }

      // Reset form
      setSelectedFile(null);
      setPreviewUrl("");
      setFormData(defaultImageData);
      setIsUploadDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditImage = (image: Image) => {
    setEditingImage(image);
    setFormData({
      name: image.name,
      description: image.description || "",
      tags: image.tags,
      isMap: image.is_map,
      gridEnabled: image.grid_enabled,
      gridSize: image.grid_size || 5,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateImage = async () => {
    if (!editingImage || !formData.name.trim()) return;

    try {
      const updates = {
        name: formData.name,
        description: formData.description,
        tags: formData.tags,
        is_map: formData.isMap,
        grid_enabled: formData.gridEnabled,
        grid_size: formData.gridSize,
      };

      if (campaignId) {
        await updateImageMetadata(editingImage.id, updates);
      } else {
        const updatedImages = images.map((img) =>
          img.id === editingImage.id ? { ...img, ...updates } : img
        );
        onUpdate(updatedImages);
      }

      setEditingImage(null);
      setFormData(defaultImageData);
      setIsEditDialogOpen(false);

      toast({
        title: "Image Updated",
        description: `"${formData.name}" has been updated`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update image",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      if (campaignId) {
        await deleteImage(imageId);
      } else {
        const updatedImages = images.filter((img) => img.id !== imageId);
        onUpdate(updatedImages);
      }

      toast({
        title: "Image Deleted",
        description: "Image has been removed",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleShareImage = async (imageId: string) => {
    if (!campaignId) return;

    try {
      await shareImage(imageId, {});
      toast({
        title: "Image Shared",
        description: "Image has been shared with players",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to share image",
        variant: "destructive",
      });
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const ImageForm = () => (
    <div className="space-y-6">
      {/* File Upload */}
      {!editingImage && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Click to select a different image
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm">
                    Click to select an image or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="image-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="image-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter image name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image-description">Description</Label>
          <Textarea
            id="image-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe what this image shows..."
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add a tag (press Enter)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
        </div>

        {/* Map Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-map"
              checked={formData.isMap}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isMap: !!checked })
              }
            />
            <Label htmlFor="is-map">This is a battle map</Label>
          </div>

          {formData.isMap && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="grid-enabled"
                  checked={formData.gridEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, gridEnabled: !!checked })
                  }
                />
                <Label htmlFor="grid-enabled">Enable grid overlay</Label>
              </div>

              {formData.gridEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="grid-size">Grid Size (feet)</Label>
                  <Select
                    value={formData.gridSize.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gridSize: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 feet</SelectItem>
                      <SelectItem value="10">10 feet</SelectItem>
                      <SelectItem value="15">15 feet</SelectItem>
                      <SelectItem value="20">20 feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Images & Maps
              <Badge variant="outline">{images.length} images</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              {!isReadOnly && (
                <Dialog
                  open={isUploadDialogOpen}
                  onOpenChange={setIsUploadDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Image</DialogTitle>
                      <DialogDescription>
                        Add images, maps, and artwork to your campaign
                      </DialogDescription>
                    </DialogHeader>
                    <ImageForm />
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleUploadImage}>Upload</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Manage images, maps, and visual aids for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {allTags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm">Filter by tag:</Label>
                <Button
                  variant={filterTag === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterTag("all")}
                >
                  All
                </Button>
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={filterTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Image Gallery */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Images Yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload images and maps to enhance your campaign
              </p>
              {!isReadOnly && (
                <Button
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload First Image
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditImage(image)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {campaignId && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleShareImage(image.id)}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                      )}
                      {!isReadOnly && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Image</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{image.name}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteImage(image.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm truncate">
                      {image.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {image.is_map && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          Map
                        </Badge>
                      )}
                      {image.tags.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {image.tags[0]}
                          {image.tags.length > 1 && " +"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{image.name}</h4>
                    {image.description && (
                      <p className="text-sm text-muted-foreground">
                        {image.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {image.is_map && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          Map
                        </Badge>
                      )}
                      {image.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditImage(image)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {campaignId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShareImage(image.id)}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    )}
                    {!isReadOnly && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Image</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{image.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteImage(image.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Update image details and settings
            </DialogDescription>
          </DialogHeader>
          <ImageForm />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateImage}>Update Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
