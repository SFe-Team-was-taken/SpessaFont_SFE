import "../../externals/libflac/dist/libflac";
import type * as FlacType from "../../externals/libflac/dist/index.d";
import { Encoder } from "../../externals/libflac/src/encoder";

const Flac = (
    globalThis as typeof globalThis & { Flac: typeof FlacType }
).Flac;

const isInitialized: Promise<boolean> = new Promise((resolve) => {
    if (Flac.isReady()) {
        resolve(true);
        return;
    }
    function onReady(): void {
        Flac.off("ready", onReady);
        resolve(true);
    }
    Flac.on("ready", onReady);
});

export async function encodeFlac(
    audioData: Float32Array,
    sampleRate: number,
): Promise<Uint8Array> {
    await isInitialized;
    
    const libflacEncoder = new Encoder(Flac, { 
        sampleRate: sampleRate, 
        channels: 1, 
        bitsPerSample: 16, 
        compression: 8,
        totalSamples: audioData.length,
        verify: true,
        isOgg: false
     })
    
    const data = audioData;
    const dataInt = new Int32Array(data.length);
    const len = data.length;
    // Libflacjs accepts Int32Array containing signed 16-bit values
    for (let i = 0; i < len; i++) {
        let sample = data[i] * 32_768;
        // Clamp for safety (do not use Math.max/Math.min here)
        if (sample > 32_767) {
            sample = 32_767;
        } else if (sample < -32_768) {
            sample = -32_768;
        }
        dataInt[i] = sample;
    }
    
    if (!libflacEncoder.encode(dataInt)) {
        const errorState = libflacEncoder.getState();
        libflacEncoder.destroy();
        throw new Error(
            `libflac.js encode failed: decoding error ${errorState}`
        );
    }
    
    // Finalise sample buffer
    libflacEncoder.encode();

    const flacData = libflacEncoder.getSamples();

    if (!flacData) {
        libflacEncoder.destroy();
        throw new Error(
            "libflac.js encode failed: unexpected missing sample data"
        );
    }

    libflacEncoder.destroy();

    return flacData;
}
