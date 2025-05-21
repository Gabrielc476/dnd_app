// hooks/useImage.ts
import { useState, useCallback } from "react";
import { campaignsAPI } from "@/lib/api";
import { useImageSocket } from "@/lib/socket";
import { Image } from "@/lib/types";

export interface UseImageProps {
  campaignId: string;
  userId: string;
}

export interface UseImageReturn {
  images: Image[];
  selectedImage: Image | null;
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  fetchImages: (params?: {
    tags?: string;
    is_map?: boolean;
  }) => Promise<Image[]>;
  uploadImage: (imageFile: File, metadata: any) => Promise<any>;
  deleteImage: (imageId: string) => Promise<any>;
  updateImageMetadata: (imageId: string, updates: any) => Promise<any>;
  shareImage: (imageId: string, imageData: Record<string, any>) => boolean;
  hideImage: (imageId: string) => boolean;
  revealArea: (
    imageId: string,
    area: { x: number; y: number; width: number; height: number }
  ) => boolean;
  moveToken: (
    imageId: string,
    tokenId: string,
    position: { x: number; y: number }
  ) => boolean;
  selectImage: (image: Image | null) => void;
}

/**
 * Hook for image management with WebSocket and API integration
 */
export function useImage({
  campaignId,
  userId,
}: UseImageProps): UseImageReturn {
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for image events
  const {
    connected,
    error: socketError,
    shareImage: shareImageSocket,
    hideImage: hideImageSocket,
    revealArea: revealAreaSocket,
    moveToken: moveTokenSocket,
  } = useImageSocket(campaignId, userId);

  // Handle socket error
  if (socketError && !error) {
    setError(`WebSocket error: ${socketError}`);
  }

  /**
   * Fetch images with optional filtering
   */
  const fetchImages = useCallback(
    async (params?: { tags?: string; is_map?: boolean }): Promise<Image[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.listImages(campaignId, params);
        setImages(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to fetch images");
        setIsLoading(false);
        return [];
      }
    },
    [campaignId]
  );

  /**
   * Upload a new image
   */
  const uploadImage = useCallback(
    async (imageFile: File, metadata: any): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.uploadImage(
          campaignId,
          imageFile,
          metadata
        );
        // Refresh image list
        fetchImages();
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to upload image");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, fetchImages]
  );

  /**
   * Delete an image
   */
  const deleteImage = useCallback(
    async (imageId: string): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.deleteImage(campaignId, imageId);
        // Refresh image list
        fetchImages();
        // Clear selected image if it was deleted
        if (selectedImage && selectedImage.id === imageId) {
          setSelectedImage(null);
        }
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to delete image");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, fetchImages, selectedImage]
  );

  /**
   * Update image metadata
   */
  const updateImageMetadata = useCallback(
    async (imageId: string, updates: any): Promise<any> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsAPI.updateImageMetadata(
          campaignId,
          imageId,
          updates
        );
        // Refresh image list
        fetchImages();
        // Update selected image if it was modified
        if (selectedImage && selectedImage.id === imageId) {
          const updatedImage = images.find((img) => img.id === imageId);
          if (updatedImage) {
            setSelectedImage({
              ...updatedImage,
              ...updates,
            });
          }
        }
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message || "Failed to update image metadata");
        setIsLoading(false);
        return null;
      }
    },
    [campaignId, fetchImages, selectedImage, images]
  );

  /**
   * Share image with players via WebSocket
   */
  const shareImage = useCallback(
    (imageId: string, imageData: Record<string, any>): boolean => {
      if (!connected) {
        setError("WebSocket not connected");
        return false;
      }
      return shareImageSocket(imageId, imageData);
    },
    [connected, shareImageSocket]
  );

  /**
   * Hide image from players via WebSocket
   */
  const hideImage = useCallback(
    (imageId: string): boolean => {
      if (!connected) {
        setError("WebSocket not connected");
        return false;
      }
      return hideImageSocket(imageId);
    },
    [connected, hideImageSocket]
  );

  /**
   * Reveal an area of an image via WebSocket
   */
  const revealArea = useCallback(
    (
      imageId: string,
      area: { x: number; y: number; width: number; height: number }
    ): boolean => {
      if (!connected) {
        setError("WebSocket not connected");
        return false;
      }
      return revealAreaSocket(imageId, area);
    },
    [connected, revealAreaSocket]
  );

  /**
   * Move a token on an image via WebSocket
   */
  const moveToken = useCallback(
    (
      imageId: string,
      tokenId: string,
      position: { x: number; y: number }
    ): boolean => {
      if (!connected) {
        setError("WebSocket not connected");
        return false;
      }
      return moveTokenSocket(imageId, tokenId, position);
    },
    [connected, moveTokenSocket]
  );

  /**
   * Select an image to work with
   */
  const selectImage = useCallback((image: Image | null) => {
    setSelectedImage(image);
  }, []);

  return {
    images,
    selectedImage,
    isLoading,
    error,
    connected,
    fetchImages,
    uploadImage,
    deleteImage,
    updateImageMetadata,
    shareImage,
    hideImage,
    revealArea,
    moveToken,
    selectImage,
  };
}

export default useImage;
