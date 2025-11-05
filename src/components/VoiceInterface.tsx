import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { float32ToInt16, encodeAudioToBase64, decodeAudioFromBase64, createAudioBuffer } from "@/utils/audioUtils";

interface VoiceInterfaceProps {
  userAssets: string[];
  riskProfile: string;
  conversationId?: string;
  onError?: (error: string) => void;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "recording" | "speaking" | "error";

export const VoiceInterface = ({ userAssets, riskProfile, conversationId, onError }: VoiceInterfaceProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const setupCompleteRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const { toast } = useToast();

  const initializeAudio = async () => {
    try {
      console.log('🎤 Initializing audio with 24kHz sample rate...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      mediaStreamRef.current = stream;
      console.log('✅ Microphone access granted');

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      console.log('✅ Audio context created at 24kHz');

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        // Use ref to avoid stale closure
        if (wsRef.current?.readyState === WebSocket.OPEN && isRecordingRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Data = float32ToInt16(inputData);
          const base64Audio = encodeAudioToBase64(int16Data);

          console.log('📤 Sending audio chunk to server...');
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm",
                data: base64Audio
              }]
            }
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      console.log('✅ Audio pipeline connected');

      return true;
    } catch (error: any) {
      console.error('❌ Microphone error:', error);
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Microphone permission denied. Please allow access.');
        toast({
          title: "Microphone Access Denied",
          description: "Please enable microphone permissions in your browser settings.",
          variant: "destructive",
        });
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone.');
        toast({
          title: "No Microphone Found",
          description: "Please connect a microphone and try again.",
          variant: "destructive",
        });
      } else {
        setErrorMessage('Failed to access microphone.');
        toast({
          title: "Microphone Error",
          description: error.message || "Failed to access microphone",
          variant: "destructive",
        });
      }
      setConnectionState("error");
      onError?.(error.message || "Microphone access denied");
      return false;
    }
  };

  const connectWebSocket = async () => {
    try {
      setConnectionState("connecting");
      setupCompleteRef.current = false;
      console.log('🔌 Connecting to voice service...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Check if user has Google Gemini API key
      console.log('🔑 Checking for Google Gemini API key...');
      const { data: apiKeyData, error: keyError } = await supabase
        .from('user_api_keys')
        .select('encrypted_key')
        .eq('service_name', 'google_gemini')
        .maybeSingle();

      if (keyError || !apiKeyData) {
        console.error('❌ No Google Gemini API key found');
        throw new Error('Please add your Google Gemini API key in Settings first');
      }
      console.log('✅ API key found');

      const wsUrl = `wss://qcitzsvwnvbeztspkepf.supabase.co/functions/v1/gemini-voice`;
      console.log('🌐 Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      retryCountRef.current = 0;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        console.log('🔐 Sending authentication...');
        // Send auth token
        ws.send(JSON.stringify({
          type: "auth",
          token: session.access_token
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message:', message.type);
          
          if (message.type === "error") {
            console.error('❌ Error from server:', message.message);
            throw new Error(message.message || "Voice chat error");
          }
          
          if (message.type === "setupComplete") {
            console.log('✅ Setup complete - ready for voice chat');
            setupCompleteRef.current = true;
            setConnectionState("connected");
            
            // If user is still holding button, start recording now
            if (isRecordingRef.current) {
              console.log('🎤 Auto-starting recording after setup complete');
              setConnectionState("recording");
            }
            
            toast({
              title: "Voice chat ready",
              description: "Start speaking to chat with MoneyBot",
            });
          } else if (message.type === "serverContent") {
            console.log('🔊 Receiving audio content from AI');
            // Handle audio response
            if (message.audio) {
              setConnectionState("speaking");
              const audioData = decodeAudioFromBase64(message.audio);
              if (audioContextRef.current) {
                const audioBuffer = await createAudioBuffer(audioContextRef.current, audioData);
                audioQueueRef.current.push(audioBuffer);
                if (!isPlayingRef.current) {
                  playNextAudio();
                }
              }
            }
            
            // Handle transcript
            if (message.transcript) {
              console.log('📝 Transcript:', message.transcript);
              // Message persistence is handled by ChatBot component
            }
          } else if (message.type === "userTranscript") {
            console.log('👤 User transcript:', message.transcript);
            // Message persistence is handled by ChatBot component
          } else if (message.type === "turnComplete") {
            console.log('✅ Turn complete');
            setConnectionState("connected");
          }
        } catch (error: any) {
          console.error("❌ WebSocket message error:", error);
          setErrorMessage(error.message || "Error processing message");
          setConnectionState("error");
          toast({
            title: "Error",
            description: error.message || "Error processing voice message",
            variant: "destructive",
          });
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        
        // Attempt retry if under max retries
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
          console.log(`🔄 Retrying connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})...`);
          
          toast({
            title: "Connection Issue",
            description: `Retrying (${retryCountRef.current}/${maxRetries})...`,
          });
          
          setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          setErrorMessage("Connection failed after multiple attempts");
          setConnectionState("error");
          onError?.("Connection error");
          toast({
            title: "Connection Error",
            description: "Failed to connect after multiple attempts",
            variant: "destructive",
          });
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        
        // Normal closure - don't retry
        if (event.code === 1000) {
          setConnectionState("disconnected");
          return;
        }
        
        // Unexpected closure - attempt retry if under max
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
          console.log(`🔄 Connection closed unexpectedly, retrying in ${delay}ms...`);
          
          setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          setConnectionState("error");
          setErrorMessage("Connection closed unexpectedly");
          console.error('❌ WebSocket closed unexpectedly:', event.code, event.reason);
          toast({
            title: "Connection Closed",
            description: "Voice chat connection was closed",
            variant: "destructive",
          });
        }
      };
    } catch (error: any) {
      console.error("❌ Connect error:", error);
      setErrorMessage(error.message || "Failed to connect");
      setConnectionState("error");
      onError?.(error.message);
      
      if (error.message.includes("API key")) {
        toast({
          title: "API Key Required",
          description: "Please add your Google Gemini API key in Settings",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to voice service",
          variant: "destructive",
        });
      }
    }
  };

  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      setConnectionState("connected");
      return;
    }

    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      playNextAudio();
    };
    
    source.start();
  };

  const startRecording = async () => {
    console.log('🎤 Start recording button pressed');
    isRecordingRef.current = true;
    
    if (connectionState === "disconnected") {
      const audioReady = await initializeAudio();
      if (!audioReady) {
        isRecordingRef.current = false;
        return;
      }
      await connectWebSocket();
      // Don't set recording state yet - wait for setupComplete
      console.log('⏳ Waiting for setup to complete before recording...');
    } else if (connectionState === "connected" && setupCompleteRef.current) {
      setConnectionState("recording");
    } else if (connectionState === "connecting") {
      console.log('⏳ Connection in progress, will auto-start recording after setup...');
    }
  };

  const stopRecording = () => {
    console.log('🛑 Stop recording button released - sending turn complete signal');
    isRecordingRef.current = false;
    
    // Signal to backend that user finished speaking
    if (wsRef.current?.readyState === WebSocket.OPEN && connectionState === "recording") {
      wsRef.current.send(JSON.stringify({
        type: 'clientContent'
      }));
      console.log('✅ Turn complete signal sent to backend');
    }
    
    if (connectionState === "recording") {
      setConnectionState("connected");
    }
  };

  const disconnect = () => {
    console.log('🔌 Disconnecting...');
    
    // Reset all refs
    isRecordingRef.current = false;
    setupCompleteRef.current = false;
    retryCountRef.current = 0;
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setConnectionState("disconnected");
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const getStatusColor = () => {
    // Check if preparing to record (button held during connection)
    if (connectionState === "connecting" && isRecordingRef.current) {
      return "text-amber-500";
    }
    
    switch (connectionState) {
      case "connected": return "text-green-500";
      case "connecting": return "text-yellow-500";
      case "recording": return "text-red-500";
      case "speaking": return "text-blue-500";
      case "error": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getStatusText = () => {
    // Check if preparing to record (button held during connection)
    if (connectionState === "connecting" && isRecordingRef.current) {
      return "Preparing to record - keep holding...";
    }
    
    switch (connectionState) {
      case "connected": return "Connected - Click to speak";
      case "connecting": return "Connecting...";
      case "recording": return "Recording...";
      case "speaking": return "AI is speaking...";
      case "error": return errorMessage;
      default: return "Disconnected";
    }
  };

  const isPreparingToRecord = connectionState === "connecting" && isRecordingRef.current;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8">
      <div className="relative">
        <Button
          size="lg"
          variant={connectionState === "recording" ? "destructive" : "default"}
          className={`h-24 w-24 rounded-full ${
            connectionState === "recording" 
              ? "animate-pulse bg-red-500 hover:bg-red-600" 
              : isPreparingToRecord 
              ? "animate-pulse bg-amber-500 hover:bg-amber-600" 
              : ""
          }`}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={connectionState === "speaking"}
        >
          {isPreparingToRecord ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : connectionState === "recording" ? (
            <MicOff className="h-10 w-10" />
          ) : connectionState === "error" ? (
            <AlertCircle className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
        
        {connectionState === "recording" && (
          <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
        )}
        
        {isPreparingToRecord && (
          <div className="absolute inset-0 rounded-full border-4 border-amber-500 animate-ping" />
        )}
      </div>

      <div className="text-center space-y-2">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        <p className="text-xs text-muted-foreground">
          {connectionState === "connected" || connectionState === "recording" 
            ? "Hold to speak, release to send" 
            : "Click connect to start voice chat"}
        </p>
      </div>

      {connectionState === "error" && (
        <Button variant="outline" onClick={() => {
          setConnectionState("disconnected");
          setErrorMessage("");
        }}>
          Try Again
        </Button>
      )}

      {connectionState !== "disconnected" && connectionState !== "error" && (
        <Button variant="outline" onClick={disconnect}>
          Disconnect
        </Button>
      )}
    </div>
  );
};
