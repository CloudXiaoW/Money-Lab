// Audio processing utilities for voice chat

// Convert Float32Array to Int16 PCM
export const float32ToInt16 = (float32Array: Float32Array): Int16Array => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
};

// Base64 encode audio for WebSocket
export const encodeAudioToBase64 = (int16Array: Int16Array): string => {
  const uint8Array = new Uint8Array(int16Array.buffer);
  return btoa(String.fromCharCode(...uint8Array));
};

// Decode base64 audio from Gemini
export const decodeAudioFromBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Create audio buffer for playback
export const createAudioBuffer = async (
  audioContext: AudioContext,
  pcmData: Uint8Array
): Promise<AudioBuffer> => {
  // Convert PCM16 to Float32 for Web Audio API
  const int16Array = new Int16Array(pcmData.buffer);
  const float32Array = new Float32Array(int16Array.length);
  
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
  }
  
  // Use 24kHz sample rate to match Gemini Live API
  const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
  audioBuffer.copyToChannel(float32Array, 0);
  return audioBuffer;
};
