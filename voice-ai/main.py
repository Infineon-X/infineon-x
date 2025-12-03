import asyncio
import edge_tts
import platform
import subprocess
import os

async def generate_speech(text, output_file="output.mp3"):
    # voice = "en-US-JennyNeural"  # Example voice
    # voice = "zh-CN-XiaoxiaoNeural"  # Example voice for  "Bluetooth device is successfully paired"
    voice = "hi-IN-SwaraNeural"  # Example voice for  "Bluetooth device is successfully paired"
    # voice = "hi-IN-ArjunNeural"  # Example voice for  "Bluetooth device is successfully paired"
    # voice = "en-GB-RyanNeural"  # Example voice for  "Bluetooth device is successfully paired"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    print(f"Audio generated and saved to {output_file}")
    return output_file

def play_audio(file_path):
    """Play audio file using platform-specific command"""
    system = platform.system()
    
    if system == "Darwin":  # macOS
        subprocess.run(["afplay", file_path])
    elif system == "Linux":
        subprocess.run(["aplay", file_path])
    elif system == "Windows":
        os.startfile(file_path)
    else:
        print(f"Unsupported platform: {system}")
        print(f"Audio file saved at: {os.path.abspath(file_path)}")

async def main():
    text_to_speak = (
        "Sir, can you restart your computer? Turn it off... and on again."
        # "Bluetooth device is successfully paired"
        # "I am here to help you with your questions. I am actually a voice assistant."
        # "Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair. Fuzzy Wuzzy wasn't very fuzzy, was he?"
        # "She sells sea shells by the sea shore. The shells that she sells are sea shells, I'm sure. So if she sells sea shells by the sea shore, I'm sure that the shells are sea shore shells."
        # "Bluetooth device is successfully paired, but your battery’s lower than a snake’s belly—fancy a cuppa?"
    )
    output_file = await generate_speech(text_to_speak)
    print("Playing audio...")
    play_audio(output_file)

if __name__ == "__main__":
    asyncio.run(main())

