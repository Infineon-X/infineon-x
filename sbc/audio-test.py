import asyncio
import os
import subprocess

import edge_tts

# VOICE = "zh-CN-liaoning-XiaobeiNeural"  # Deepest Chinese accent
# VOICE = "hi-IN-SwaraNeural" 
# VOICE = "en-US-AvaNeural" # neutral american accent
# VOICE = "en-US-EricNeural" # neutral american accent
# VOICE = "en-US-AriaNeural" # neutral american accent
# VOICE = "en-US-JennyNeural" # neutral american accent
# VOICE = "en-US-GuyNeural" # neutral american accent/
# VOICE = "en-US-SaraNeural" # neutral american accent
VOICE = "en-US-EmmaMultilingualNeural" # neutral american accent with multilingual support
# VOICE = "en-US-ThomasNeural" # neutral american accent
OUTPUT_FILE = "output.mp3"
RATE = "-20%"   # slowest is -100% and fastest is +200%
PITCH = "+0Hz"  # lowest is -100Hz and highest is +100Hz
VOLUME = "+0%"  # FIXED: Use % format, not dB [web:1] loudest is 100% and quietest is 0%

async def main() -> None:
    # text = "quick brown fox jumps over the lazy dog " # English
    text = "测试蓝牙设备成功配对"
  # or "测试 Bluetooth 设备成功配对" # Chinese  
    
    # CLI-equivalent parameters (your working method)
    communicate = edge_tts.Communicate(
        text, 
        VOICE,
        rate=RATE,
        pitch=PITCH,
        volume=VOLUME   # Now valid format
    )
    
    await communicate.save(OUTPUT_FILE)
    print(f"✅ MP3 file (rate={RATE}) ready: {os.path.abspath(OUTPUT_FILE)}")
    
    subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", OUTPUT_FILE], check=True)

if __name__ == "__main__":
    asyncio.run(main())
