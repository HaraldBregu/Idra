# Providers

This catalog documents Friday provider credentials and model coverage using the supplied provider/model catalog for this documentation update.

Provider credentials are stored on provider records. Per-run overrides can select `providerId`, `model`, and, where supported, an effort value; they do not accept API keys or base URLs.

## Model Type Summary

| Model type | Model count | Providers |
| --- | --- | --- |
| Large Language Models | 30 | [OpenAI](openai.md), [Anthropic](anthropic/), [Google DeepMind / Google](google/), [Meta](meta/), [xAI](xai/), [Mistral AI](mistral/), [DeepSeek](deepseek/), [Alibaba / Qwen / Wan](qwen/), [Moonshot AI / Kimi](kimi/), [Z.ai / Zhipu AI](zai/), [MiniMax](minimax/), [Reka AI](reka.md) |
| Research Chat Models | 4 | [Perplexity](perplexity.md) |
| Speech-To-Text Models | 12 | [OpenAI](openai.md), [Deepgram](deepgram.md), [ElevenLabs](elevenlabs/), [Mistral AI](mistral/), [xAI](xai/), [Alibaba / Qwen / Wan](qwen/) |
| Text-To-Speech Models | 12 | [ElevenLabs](elevenlabs/), [Cartesia](cartesia.md), [OpenAI](openai.md), [Google DeepMind / Google](google/), [MiniMax](minimax/), [Mistral AI](mistral/), [Deepgram](deepgram.md) |
| Realtime Voice And Omni Models | 8 | [OpenAI](openai.md), [xAI](xai/), [Google DeepMind / Google](google/), [Alibaba / Qwen / Wan](qwen/), [Luma AI](luma.md) |
| Image Models | 18 | [OpenAI](openai.md), [Google DeepMind / Google](google/), [Alibaba / Qwen / Wan](qwen/), [xAI](xai/), [Black Forest Labs](black-forest-labs.md), [Midjourney](midjourney.md), [Luma AI](luma.md), [Stability AI](stability-ai.md), [Ideogram](ideogram.md) |
| Video Models | 25 | [Google DeepMind / Google](google/), [Runway](runway.md), [Luma AI](luma.md), [MiniMax](minimax/), [Alibaba / Qwen / Wan](qwen/), [xAI](xai/), [OpenAI](openai.md), [Meta](meta/), [Midjourney](midjourney.md), [Pika](pika.md), [Stability AI](stability-ai.md), [Kuaishou / Kling AI](kling.md) |
| Music And Audio Models | 11 | [Google DeepMind / Google](google/), [Suno](suno.md), [MiniMax](minimax/), [ElevenLabs](elevenlabs/), [Stability AI](stability-ai.md), [Kuaishou / Kling AI](kling.md) |
| 3D Models | 2 | [Luma AI](luma.md) |

## Provider Catalog

Each provider name links to its provider-specific markdown file.

| Provider | Provider id | Capabilities | Documented model sections |
| --- | --- | --- | --- |
| [Anthropic](anthropic/) | `anthropic` | Chat | Large Language Models |
| [Black Forest Labs](black-forest-labs.md) | `black-forest-labs` | Image | Image Models |
| [Cartesia](cartesia.md) | `cartesia` | Text-to-speech | Text-To-Speech Models |
| [Deepgram](deepgram.md) | `deepgram` | Speech-to-text - Text-to-speech | Speech-To-Text Models - Text-To-Speech Models |
| [DeepSeek](deepseek/) | `deepseek` | Chat | Large Language Models |
| [ElevenLabs](elevenlabs/) | `elevenlabs` | Speech-to-text - Text-to-speech - Music/audio | Speech-To-Text Models - Text-To-Speech Models - Music And Audio Models |
| [Google DeepMind / Google](google/) | `google` | Chat - Text-to-speech - Realtime voice/omni - Image - Video - Music/audio | Large Language Models - Text-To-Speech Models - Realtime Voice And Omni Models - Image Models - Video Models - Music And Audio Models |
| [Ideogram](ideogram.md) | `ideogram` | Image | Image Models |
| [Moonshot AI / Kimi](kimi/) | `kimi` | Chat | Large Language Models |
| [Kuaishou / Kling AI](kling.md) | `kling` | Video - Music/audio | Video Models - Music And Audio Models |
| [Luma AI](luma.md) | `luma` | Realtime voice/omni - Image - Video - 3D | Realtime Voice And Omni Models - Image Models - Video Models - 3D Models |
| [Meta](meta/) | `meta` | Chat - Video | Large Language Models - Video Models |
| [Midjourney](midjourney.md) | `midjourney` | Image - Video | Image Models - Video Models |
| [MiniMax](minimax/) | `minimax` | Chat - Text-to-speech - Video - Music/audio | Large Language Models - Text-To-Speech Models - Video Models - Music And Audio Models |
| [Mistral AI](mistral/) | `mistral` | Chat - Speech-to-text - Text-to-speech | Large Language Models - Speech-To-Text Models - Text-To-Speech Models |
| [OpenAI](openai.md) | `openai` | Chat - Speech-to-text - Text-to-speech - Realtime voice/omni - Image - Video | Large Language Models - Speech-To-Text Models - Text-To-Speech Models - Realtime Voice And Omni Models - Image Models - Video Models |
| [Perplexity](perplexity.md) | `perplexity` | Research chat | Research Chat Models |
| [Pika](pika.md) | `pika` | Video | Video Models |
| [Alibaba / Qwen / Wan](qwen/) | `qwen` | Chat - Speech-to-text - Realtime voice/omni - Image - Video | Large Language Models - Speech-To-Text Models - Realtime Voice And Omni Models - Image Models - Video Models |
| [Reka AI](reka.md) | `reka` | Chat | Large Language Models |
| [Runway](runway.md) | `runway` | Video | Video Models |
| [Stability AI](stability-ai.md) | `stability-ai` | Image - Video - Music/audio | Image Models - Video Models - Music And Audio Models |
| [Suno](suno.md) | `suno` | Music/audio | Music And Audio Models |
| [xAI](xai/) | `xai` | Chat - Speech-to-text - Realtime voice/omni - Image - Video | Large Language Models - Speech-To-Text Models - Realtime Voice And Omni Models - Image Models - Video Models |
| [Z.ai / Zhipu AI](zai/) | `zai` | Chat | Large Language Models |

## Providers Without LLM Entries

These providers do not have Large Language Models in the supplied catalog but do have other model types documented.

| Provider | Provider id | Capabilities |
| --- | --- | --- |
| [Black Forest Labs](black-forest-labs.md) | `black-forest-labs` | Image |
| [Cartesia](cartesia.md) | `cartesia` | Text-to-speech |
| [Deepgram](deepgram.md) | `deepgram` | Speech-to-text - Text-to-speech |
| [ElevenLabs](elevenlabs/) | `elevenlabs` | Speech-to-text - Text-to-speech - Music/audio |
| [Ideogram](ideogram.md) | `ideogram` | Image |
| [Kuaishou / Kling AI](kling.md) | `kling` | Video - Music/audio |
| [Luma AI](luma.md) | `luma` | Realtime voice/omni - Image - Video - 3D |
| [Midjourney](midjourney.md) | `midjourney` | Image - Video |
| [Perplexity](perplexity.md) | `perplexity` | Research chat |
| [Pika](pika.md) | `pika` | Video |
| [Runway](runway.md) | `runway` | Video |
| [Stability AI](stability-ai.md) | `stability-ai` | Image - Video - Music/audio |
| [Suno](suno.md) | `suno` | Music/audio |

## Status Markers

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

| Provider | Model id | Status | Model type |
| --- | --- | --- | --- |
| [Kuaishou / Kling AI](kling.md) | `kling-2.6` | `verify` | Video Models |
| [Kuaishou / Kling AI](kling.md) | `kling-2.1` | `verify` | Video Models |
| [Kuaishou / Kling AI](kling.md) | `kling-audio` | `verify` | Music And Audio Models |
| [Luma AI](luma.md) | `genie` | `verify` | 3D Models |
| [Luma AI](luma.md) | `interactive-scenes` | `verify` | 3D Models |
| [Meta](meta/) | `movie-gen-video` | `verify` | Video Models |
| [OpenAI](openai.md) | `sora-2-pro` | `deprecated` | Video Models |
| [OpenAI](openai.md) | `sora-2` | `deprecated` | Video Models |
