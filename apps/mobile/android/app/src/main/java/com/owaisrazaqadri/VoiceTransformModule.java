package com.owaisrazaqadri;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
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
        File source = new File(sourcePath.replace("file://", ""));
        File outputDirectory = new File(getReactApplicationContext().getCacheDir(), "voice-transform");
        if (!outputDirectory.exists() && !outputDirectory.mkdirs()) {
          throw new IOException("Unable to create voice transform cache");
        }

        String safePreset = preset == null ? "younger" : preset.toLowerCase(Locale.US);
        File output = new File(outputDirectory, source.getName() + "-" + safePreset + ".wav");
        if (!output.exists() || output.length() == 0) {
          DecodedAudio audio = decode(source.getAbsolutePath());
          short[] transformed = pitchShift(audio.samples, audio.channels, audio.sampleRate, semitones(safePreset));
          writeWav(output, transformed, audio.channels, audio.sampleRate);
        }

        new Handler(Looper.getMainLooper()).post(() -> promise.resolve(output.getAbsolutePath()));
      } catch (Exception exception) {
        new Handler(Looper.getMainLooper()).post(() -> promise.reject("VOICE_TRANSFORM_FAILED", exception));
      }
    });
  }

  private static float semitones(String preset) {
    if ("subtle".equals(preset)) return 2f;
    if ("high".equals(preset)) return 6f;
    return 4f;
  }

  private static DecodedAudio decode(String path) throws IOException {
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

    ByteArrayOutputStream pcm = new ByteArrayOutputStream();
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
    }

    int channels = format.containsKey(MediaFormat.KEY_CHANNEL_COUNT) ? format.getInteger(MediaFormat.KEY_CHANNEL_COUNT) : 2;
    int sampleRate = format.containsKey(MediaFormat.KEY_SAMPLE_RATE) ? format.getInteger(MediaFormat.KEY_SAMPLE_RATE) : 44100;
    ByteBuffer bytes = ByteBuffer.wrap(pcm.toByteArray()).order(ByteOrder.LITTLE_ENDIAN);
    short[] samples = new short[bytes.remaining() / 2];
    bytes.asShortBuffer().get(samples);
    return new DecodedAudio(samples, channels, sampleRate);
  }

  private static short[] pitchShift(short[] samples, int channels, int sampleRate, float semitones) {
    SoundTouch soundTouch = new SoundTouch();
    soundTouch.setChannels(channels);
    soundTouch.setSampleRate(sampleRate);
    soundTouch.setPitchSemiTones(semitones);
    soundTouch.putSamples(samples, 0, samples.length / channels);
    soundTouch.flush();

    short[] output = new short[samples.length + (sampleRate * channels * 2)];
    int written = 0;
    while (!soundTouch.isEmpty()) {
      int frames = soundTouch.receiveSamplesI16(output, written, output.length / channels - written / channels);
      if (frames == 0) break;
      written += frames * channels;
      if (written == output.length) break;
    }
    soundTouch.dispose();
    short[] result = new short[written];
    System.arraycopy(output, 0, result, 0, written);
    return result;
  }

  private static void writeWav(File file, short[] samples, int channels, int sampleRate) throws IOException {
    long dataLength = (long) samples.length * 2;
    try (RandomAccessFile output = new RandomAccessFile(file, "rw")) {
      output.setLength(0);
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
      ByteBuffer buffer = ByteBuffer.allocate(samples.length * 2).order(ByteOrder.LITTLE_ENDIAN);
      buffer.asShortBuffer().put(samples);
      output.write(buffer.array());
    }
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
    private final short[] samples;
    private final int channels;
    private final int sampleRate;

    private DecodedAudio(short[] samples, int channels, int sampleRate) {
      this.samples = samples;
      this.channels = channels;
      this.sampleRate = sampleRate;
    }
  }
}
