"""
Local Whisper Transcription using faster-whisper
Handles large audio files without API limits
"""

import sys
import json
from faster_whisper import WhisperModel

def transcribe_audio(audio_path, language="ur"):
    """
    Transcribe audio file using faster-whisper
    
    Args:
        audio_path: Path to audio file
        language: Language code (default: ur for Urdu)
    
    Returns:
        JSON with transcription and segments
    """
    print(f"Loading Whisper model...", file=sys.stderr)
    
    # Use large-v3 model for best Urdu accuracy
    # Options: tiny, base, small, medium, large-v2, large-v3
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")
    
    print(f"Transcribing: {audio_path}", file=sys.stderr)
    
    segments, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        word_timestamps=False  # Set to True if you need word-level timestamps
    )
    
    # Convert segments to list
    segment_list = []
    full_text = []
    
    for segment in segments:
        segment_list.append({
            "id": segment.id,
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        })
        full_text.append(segment.text)
    
    result = {
        "language": info.language,
        "duration": info.duration,
        "text": " ".join(full_text),
        "segments": segment_list
    }
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe-local.py <audio_file> [language]", file=sys.stderr)
        sys.exit(1)
    
    audio_file = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "ur"
    
    try:
        result = transcribe_audio(audio_file, language)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
