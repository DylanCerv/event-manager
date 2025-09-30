import React, { useState, useRef } from 'react';
import { X, Image, Video, Smile, MapPin, UserTag, Send, Camera } from 'lucide-react';
import { EventBookGuest } from '../lib/guest-storage';
import { EventBook } from '../types/eventbook';
import { FeelingPicker, Feeling } from './FeelingPicker';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, mediaFiles: { type: 'image' | 'video'; url: string; thumbnail?: string }[], feeling?: Feeling) => Promise<void>;
  guest: EventBookGuest;
  eventBook: EventBook;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, guest, eventBook }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<{ type: 'image' | 'video'; url: string; thumbnail?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setMediaFiles(prev => [...prev, {
              type: 'image',
              url: event.target!.result as string
            }]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setMediaFiles(prev => [...prev, {
              type: 'video',
              url: event.target!.result as string
            }]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content, mediaFiles, selectedFeeling || undefined);
      setContent('');
      setMediaFiles([]);
      setSelectedFeeling(null);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canUploadImages = eventBook.settings?.functionality?.allowImageUploads !== false;
  const canUploadVideos = eventBook.settings?.functionality?.allowVideoUploads === true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Crear publicación</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* User info */}
          <div className="flex items-center space-x-3 mb-4">
            {guest.profilePhoto ? (
              <img
                src={guest.profilePhoto}
                alt={`${guest.firstName} ${guest.lastName}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-gray-900">
                  {guest.firstName} {guest.lastName}
                </p>
                {selectedFeeling && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm text-gray-600 flex items-center space-x-1">
                      <span>{selectedFeeling.emoji}</span>
                      <span>me siento {selectedFeeling.name}</span>
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Publicando en {eventBook.name}
              </p>
              {selectedFeeling && (
                <button
                  onClick={() => setSelectedFeeling(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Quitar sentimiento
                </button>
              )}
            </div>
          </div>

          {/* Text content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`¿Qué está pasando en el evento, ${guest.firstName}?`}
            className="w-full min-h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />

          {/* Media preview */}
          {mediaFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-32 object-cover rounded-lg"
                      controls
                    />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex space-x-4">
              {canUploadImages && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Image className="w-5 h-5" />
                  <span className="font-medium">Foto</span>
                </button>
              )}
              
              {canUploadVideos && (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Video className="w-5 h-5" />
                  <span className="font-medium">Video</span>
                </button>
              )}
              
              <button
                onClick={() => setShowFeelingPicker(true)}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-3 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Smile className="w-5 h-5" />
                <span className="font-medium">Sentimiento</span>
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && mediaFiles.length === 0) || isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Publicando...' : 'Publicar'}</span>
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleVideoUpload}
          className="hidden"
        />
      </div>
      
      {/* Feeling Picker Modal */}
      <FeelingPicker
        isOpen={showFeelingPicker}
        onClose={() => setShowFeelingPicker(false)}
        onSelect={setSelectedFeeling}
      />
    </div>
  );
}
