import { useState } from 'react';
import { X, Send, Image as ImageIcon, Video, FileText } from 'lucide-react';

export default function AttachmentModal({ file, onSend, onClose }) {
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    if (!file) return null;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const previewUrl = URL.createObjectURL(file);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);

        const reader = new FileReader();
        reader.onloadend = () => {
            onSend({
                dataUrl: reader.result,
                mimeType: file.type,
                fileName: file.name,
                caption: caption.trim(),
                mediaType: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document'
            });
            setIsUploading(false);
            onClose();
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="glass-modal w-full max-w-lg rounded-2xl overflow-hidden shadow-glass border border-dark-border animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
                    <div className="flex items-center gap-2">
                        {isImage && <ImageIcon className="w-5 h-5 text-neon-green" />}
                        {isVideo && <Video className="w-5 h-5 text-neon-green" />}
                        {!isImage && !isVideo && <FileText className="w-5 h-5 text-neon-green" />}
                        <span className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-neon-red hover:bg-neon-red/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="p-4 flex items-center justify-center bg-dark-surface/50 min-h-[240px] max-h-[380px] overflow-hidden">
                    {isImage && (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-[340px] max-w-full rounded-xl object-contain shadow-md"
                        />
                    )}
                    {isVideo && (
                        <video
                            src={previewUrl}
                            controls
                            className="max-h-[340px] max-w-full rounded-xl shadow-md"
                        />
                    )}
                    {!isImage && !isVideo && (
                        <div className="flex flex-col items-center justify-center gap-3 p-6 text-gray-400">
                            <FileText className="w-16 h-16 text-neon-green/60" />
                            <div className="text-sm font-medium text-white">{file.name}</div>
                            <div className="text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                    )}
                </div>

                {/* Caption & Send */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-dark-border bg-dark-base flex flex-col gap-3">
                    <input
                        type="text"
                        placeholder="Add a caption... (optional)"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-card border border-dark-border text-white text-sm focus:outline-none focus:border-neon-green transition-all"
                    />

                    <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green"></span>
                            Payload will be encrypted with Web Crypto AES-256-GCM
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-2 rounded-xl text-xs font-semibold btn-neon-red"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="px-4 py-2 rounded-xl text-xs font-semibold btn-neon-green flex items-center gap-2 disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5 fill-dark-base" />
                                {isUploading ? 'Encrypting...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
