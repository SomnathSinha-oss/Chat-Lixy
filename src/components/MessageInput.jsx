import { useState, useRef } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import AttachmentModal from './AttachmentModal';

export default function MessageInput({
    onSendMessage,
    onSendAudio,
    onSendAttachment,
    onTyping,
    disabled
}) {
    const [text, setText] = useState('');
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const fileInputRef = useRef(null);
    const typingTimerRef = useRef(null);

    const handleTextChange = (e) => {
        setText(e.target.value);

        if (onTyping) {
            onTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        if (onTyping) onTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

        onSendMessage(trimmed);
        setText('');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
        e.target.value = ''; // reset so same file can be selected again
    };

    if (isVoiceRecording) {
        return (
            <div className="p-3 border-t border-dark-border bg-dark-base">
                <VoiceRecorder
                    onSendAudio={(audioData) => {
                        setIsVoiceRecording(false);
                        onSendAudio(audioData);
                    }}
                    onCancel={() => setIsVoiceRecording(false)}
                />
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 border-t border-dark-border bg-dark-base">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Attachment Picker */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-dark-hover transition-colors disabled:opacity-50"
                    title="Attach file or photo"
                >
                    <Paperclip className="w-5 h-5 rotate-45" />
                </button>

                {/* Text Input */}
                <div className="flex-1 relative flex items-center">
                    <input
                        type="text"
                        placeholder="Type an end-to-end encrypted message..."
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="w-full px-4 py-2.5 rounded-2xl bg-dark-card border border-dark-border text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neon-green/60 transition-all disabled:opacity-50"
                    />
                </div>

                {/* Voice Record or Send Button */}
                {text.trim().length === 0 ? (
                    <button
                        type="button"
                        onClick={() => setIsVoiceRecording(true)}
                        disabled={disabled}
                        className="p-2.5 rounded-xl text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-colors disabled:opacity-50"
                        title="Record Voice Note"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={disabled}
                        className="p-2.5 rounded-xl btn-neon-green flex items-center justify-center shrink-0 disabled:opacity-50"
                        title="Send Message"
                    >
                        <Send className="w-5 h-5 fill-dark-base" />
                    </button>
                )}
            </form>

            {/* Modal for Attachment Preview */}
            {selectedFile && (
                <AttachmentModal
                    file={selectedFile}
                    onSend={onSendAttachment}
                    onClose={() => setSelectedFile(null)}
                />
            )}
        </div>
    );
}
