# MiniMax Models

This section documents MiniMax models.

## Provider Details

| Property | Value |
| --- | --- |
| Provider id | `minimax` |
| Display name | MiniMax |
| Capabilities | Chat - Text-to-speech - Video - Music/audio |
| Default base URL | `https://api.minimax.io/v1` |
| Credential type | API key; Token Plan key is separate |
| Auth method | API key / Bearer token |
| Recommended env vars | `MINIMAX_API_KEY` |
| API-key link | [MiniMax interface keys](https://platform.minimax.io/user-center/basic-information/interface-key) |
| Official docs | [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview) |

## Current Model Set

| Model type | Models | Documentation |
| --- | --- | --- |
| Large language models | `MiniMax-M2.7`, `MiniMax-M2.5` | [minimax/llm](llm/index) |
| Text-to-speech | `Speech-2.8-HD`, `Speech-2.8-Turbo` | [minimax/tts](tts/index) |
| Video | `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-2.3-Fast`, `MiniMax-Hailuo-02` | [minimax/video](video/index) |
| Music and audio | `music-2.6`, `music-cover` | [minimax/music](music/index) |
