import { useState, useRef, useEffect } from 'react';
import { Square, Trash2, Send, Play, Pause } from 'lucide-react';

export default function VoiceRecorder({ onSendAudio, onCancel }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioElementRef = useRef(null);

    // Start recording immediately when mounted
    useEffect(() => {
        startRecording();
        return () => {
            stopRecordingCleanup();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                // Stop media tracks
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start(100);
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please check permissions.');
            onCancel();
        }
    };

    const stopRecordingCleanup = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handlePlayPause = () => {
        if (!audioElementRef.current) return;
        if (isPlaying) {
            audioElementRef.current.pause();
            setIsPlaying(false);
        } else {
            audioElementRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleSend = () => {
        if (!audioBlob) return;
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            onSendAudio({
                dataUrl: reader.result,
                duration: duration,
                mimeType: 'audio/webm'
            });
        };
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 w-full bg-dark-card border border-dark-border px-4 py-2.5 rounded-2xl shadow-glass animate-in slide-in-from-bottom-2 duration-200">
            {/* Discard / Delete (Neon Red) */}
            <button
                onClick={onCancel}
                className="p-2 rounded-xl text-gray-400 hover:text-neon-red hover:bg-neon-red/10 transition-colors"
                title="Discard voice note"
            >
                <Trash2 className="w-5 h-5 text-neon-red" />
            </button>

            {/* Recording State Visualization */}
            {isRecording ? (
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 rounded-full bg-neon-red animate-ping" />
                    <span className="font-mono text-sm text-neon-red font-semibold">
                        {formatTime(duration)}
                    </span>

                    {/* Animated Waveform */}
                    <div className="flex items-center gap-1 flex-1 h-6 px-2 overflow-hidden">
                        {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 65, 85, 35, 75, 55, 90].map((h, i) => (
                            <div
                                key={i}
                                className="waveform-bar"
                                style={{
                                    height: `${h}%`,
                                    animationDelay: `${(i * 0.1) % 0.8}s`
                                }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleStopRecording}
                        className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-white transition-colors"
                        title="Stop recording"
                    >
                        <Square className="w-4 h-4 fill-white" />
                    </button>
                </div>
            ) : (
                /* Recorded Preview State */
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={handlePlayPause}
                        className="p-2 rounded-full bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-neon-green" />}
                    </button>
                    <audio
                        ref={audioElementRef}
                        src={audioUrl || ''}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                    <div className="flex-1">
                        <div className="text-xs text-gray-400">Voice Note Preview</div>
                        <div className="font-mono text-xs text-neon-green">{formatTime(duration)}</div>
                    </div>
                </div>
            )}

            {/* Send Button (Neon Green) */}
            <button
                onClick={isRecording ? handleStopRecording : handleSend}
                disabled={isRecording ? false : !audioBlob}
                className="p-2.5 rounded-xl btn-neon-green disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                title="Send Voice Note"
            >
                <Send className="w-4 h-4 fill-dark-base" />
            </button>
        </div>
    );
}
