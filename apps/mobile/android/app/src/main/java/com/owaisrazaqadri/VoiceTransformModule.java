package com.owaisrazaqadri;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.tianscar.soundtouch.SoundTouch;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class VoiceTransformModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "NativeVoiceTransform";
  private static final String TAG = "NativeVoiceTransform";
  private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

  public VoiceTransformModule(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void transform(String sourcePath, String preset, Promise promise) {
    EXECUTOR.execute(() -> {
      try {
        Log.i(TAG, "Starting transform: " + sourcePath + " preset=" + preset);
        File source = new File(sourcePath.replace("file://", ""));
        File outputDirectory = new File(getReactApplicationContext().getCacheDir(), "voice-transform");
        if (!outputDirectory.exists() && !outputDirectory.mkdirs()) {
          throw new IOException("Unable to create voice transform cache");
        }

        String safePreset = preset == null ? "younger" : preset.toLowerCase(Locale.US);
        File output = new File(outputDirectory, source.getName() + "-" + safePreset + ".wav");
        File pcmFile = new File(outputDirectory, source.getName() + ".pcm");
        if (!output.exists() || output.length() == 0) {
          ProgressListener progress = value -> emitProgress(source.getAbsolutePath(), value);
          Log.i(TAG, "Decoding source: " + source.length() + " bytes");
          DecodedAudio audio = decode(source.getAbsolutePath(), pcmFile, progress);
          Log.i(TAG, "Decoded " + audio.sampleCount + " samples at " + audio.sampleRate + "Hz");
          pitchShift(pcmFile, output, audio, semitones(safePreset), progress);
          Log.i(TAG, "Wrote output: " + output.length() + " bytes");
        }
        if (pcmFile.exists()) pcmFile.delete();

        emitProgress(source.getAbsolutePath(), 100);
        new Handler(Looper.getMainLooper()).post(() -> promise.resolve(output.getAbsolutePath()));
      } catch (Exception exception) {
        Log.e(TAG, "Transform failed", exception);
        new Handler(Looper.getMainLooper()).post(() -> promise.reject("VOICE_TRANSFORM_FAILED", exception));
      }
    });
  }

  private static float semitones(String preset) {
    if ("subtle".equals(preset)) return 2f;
    if ("high".equals(preset)) return 6f;
    return 4f;
  }

  private DecodedAudio decode(String path, File pcmFile, ProgressListener progress) throws IOException {
    MediaExtractor extractor = new MediaExtractor();
    extractor.setDataSource(path);
    int trackIndex = -1;
    MediaFormat format = null;
    for (int index = 0; index < extractor.getTrackCount(); index++) {
      MediaFormat candidate = extractor.getTrackFormat(index);
      String mime = candidate.getString(MediaFormat.KEY_MIME);
      if (mime != null && mime.startsWith("audio/")) {
        trackIndex = index;
        format = candidate;
        break;
      }
    }
    if (trackIndex < 0 || format == null) throw new IOException("No audio track found");

    extractor.selectTrack(trackIndex);
    String mime = format.getString(MediaFormat.KEY_MIME);
    MediaCodec decoder = MediaCodec.createDecoderByType(mime);
    decoder.configure(format, null, null, 0);
    decoder.start();
    Log.i(TAG, "Decoder started: " + mime);

    RandomAccessFile pcm = new RandomAccessFile(pcmFile, "rw");
    pcm.setLength(0);
    MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
    boolean inputEnded = false;
    boolean outputEnded = false;
    try {
      while (!outputEnded) {
        if (!inputEnded) {
          int inputIndex = decoder.dequeueInputBuffer(10_000);
          if (inputIndex >= 0) {
            ByteBuffer input = decoder.getInputBuffer(inputIndex);
            if (input == null) throw new IOException("Unable to access decoder input");
            input.clear();
            int sampleSize = extractor.readSampleData(input, 0);
            if (sampleSize < 0) {
              decoder.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
              inputEnded = true;
            } else {
              decoder.queueInputBuffer(inputIndex, 0, sampleSize, extractor.getSampleTime(), 0);
              extractor.advance();
            }
          }
        }

        int outputIndex = decoder.dequeueOutputBuffer(info, 10_000);
        if (outputIndex >= 0) {
          ByteBuffer output = decoder.getOutputBuffer(outputIndex);
          if (output != null && info.size > 0 && (info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
            byte[] bytes = new byte[info.size];
            output.position(info.offset);
            output.limit(info.offset + info.size);
            output.get(bytes);
            pcm.write(bytes);
          }
          decoder.releaseOutputBuffer(outputIndex, false);
          outputEnded = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
        }
      }
    } finally {
      decoder.stop();
      decoder.release();
      extractor.release();
      pcm.close();
    }

    int channels = format.containsKey(MediaFormat.KEY_CHANNEL_COUNT) ? format.getInteger(MediaFormat.KEY_CHANNEL_COUNT) : 2;
    int sampleRate = format.containsKey(MediaFormat.KEY_SAMPLE_RATE) ? format.getInteger(MediaFormat.KEY_SAMPLE_RATE) : 44100;
    long sampleCount = pcmFile.length() / 2;
    progress.onProgress(35);
    Log.i(TAG, "Decoder finished");
    return new DecodedAudio(pcmFile, sampleCount, channels, sampleRate);
  }

  private static void pitchShift(File pcmFile, File outputFile, DecodedAudio audio, float semitones, ProgressListener progress) throws IOException {
    Log.i(TAG, "Pitch processing started: semitones=" + semitones + " frames=" + (audio.sampleCount / audio.channels));
    SoundTouch soundTouch = new SoundTouch();
    soundTouch.setChannels(audio.channels);
    soundTouch.setSampleRate(audio.sampleRate);
    soundTouch.setPitchSemiTones(semitones);
    long outputSamples = 0;
    byte[] inputBytes = new byte[64 * 1024];
    short[] inputSamples = new short[inputBytes.length / 2];
    short[] outputSamplesBuffer = new short[64 * 1024];

    try (RandomAccessFile input = new RandomAccessFile(pcmFile, "r");
         RandomAccessFile output = new RandomAccessFile(outputFile, "rw")) {
      output.setLength(0);
      output.write(new byte[44]);
      int bytesRead;
      while ((bytesRead = input.read(inputBytes)) > 0) {
        ByteBuffer inputBuffer = ByteBuffer.wrap(inputBytes, 0, bytesRead).order(ByteOrder.LITTLE_ENDIAN);
        int sampleCount = bytesRead / 2;
        inputBuffer.asShortBuffer().get(inputSamples, 0, sampleCount);
        soundTouch.putSamples(inputSamples, 0, sampleCount / audio.channels);
        outputSamples += receiveSamples(soundTouch, output, outputSamplesBuffer, audio.channels);
        progress.onProgress(35 + (int) (50f * input.getFilePointer() / pcmFile.length()));
      }
      soundTouch.flush();
      while (!soundTouch.isEmpty()) {
        int written = receiveSamples(soundTouch, output, outputSamplesBuffer, audio.channels);
        if (written == 0) break;
        outputSamples += written;
      }
      writeWavHeader(output, outputSamples, audio.channels, audio.sampleRate);
    }
    soundTouch.dispose();
    progress.onProgress(95);
  }

  private static long receiveSamples(SoundTouch soundTouch, RandomAccessFile output, short[] buffer, int channels) throws IOException {
    int frames = soundTouch.receiveSamplesI16(buffer, 0, buffer.length / channels);
    if (frames == 0) return 0;
    ByteBuffer bytes = ByteBuffer.allocate(frames * channels * 2).order(ByteOrder.LITTLE_ENDIAN);
    bytes.asShortBuffer().put(buffer, 0, frames * channels);
    output.write(bytes.array());
    return (long) frames * channels;
  }

  private static void writeWavHeader(RandomAccessFile output, long sampleCount, int channels, int sampleRate) throws IOException {
    long dataLength = sampleCount * 2;
    output.seek(0);
    output.writeBytes("RIFF");
    writeIntLE(output, (int) (36 + dataLength));
    output.writeBytes("WAVEfmt ");
    writeIntLE(output, 16);
    writeShortLE(output, (short) 1);
    writeShortLE(output, (short) channels);
    writeIntLE(output, sampleRate);
    writeIntLE(output, sampleRate * channels * 2);
    writeShortLE(output, (short) (channels * 2));
    writeShortLE(output, (short) 16);
    output.writeBytes("data");
    writeIntLE(output, (int) dataLength);
  }

  private void emitProgress(String sourcePath, int progress) {
    WritableMap event = Arguments.createMap();
    event.putString("sourcePath", sourcePath);
    event.putInt("progress", progress);
    getReactApplicationContext()
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit("nativeVoiceTransformProgress", event);
  }

  private interface ProgressListener {
    void onProgress(int progress);
  }

  private static void writeIntLE(RandomAccessFile output, int value) throws IOException {
    output.write(value & 0xff);
    output.write((value >> 8) & 0xff);
    output.write((value >> 16) & 0xff);
    output.write((value >> 24) & 0xff);
  }

  private static void writeShortLE(RandomAccessFile output, short value) throws IOException {
    output.write(value & 0xff);
    output.write((value >> 8) & 0xff);
  }

  private static final class DecodedAudio {
    private final File pcmFile;
    private final long sampleCount;
    private final int channels;
    private final int sampleRate;

    private DecodedAudio(File pcmFile, long sampleCount, int channels, int sampleRate) {
      this.pcmFile = pcmFile;
      this.sampleCount = sampleCount;
      this.channels = channels;
      this.sampleRate = sampleRate;
    }
  }
}
