# Friday

**Your desktop AI copilot for everyday tasks.**

Friday is a desktop application that puts a capable, personal AI assistant on your
computer. You chat with it in plain language, and it gets real work done: it reads and
writes files, searches the web, generates images, transcribes your voice, speaks back,
runs on a schedule, and connects to the tools and messaging apps you already use.

Unlike a website chatbot, Friday runs as a native app on your machine. You bring your own
AI provider keys, your data and credentials stay local, and every action that touches your
files, accounts, or the outside world passes through explicit permission checks.

---

## Table of contents

- [What Friday is](#what-friday-is)
- [Who it's for](#who-its-for)
- [Key ideas in one minute](#key-ideas-in-one-minute)
- [Feature overview](#feature-overview)
  - [The AI assistant (chat)](#1-the-ai-assistant-chat)
  - [Agent tools](#2-agent-tools-what-the-assistant-can-do)
  - [Voice: dictation and read-aloud](#3-voice-dictation-and-read-aloud)
  - [Image generation](#4-image-generation)
  - [Providers: bring your own AI](#5-providers-bring-your-own-ai)
  - [Skills](#6-skills)
  - [MCP servers](#7-mcp-servers)
  - [Channels: chat from anywhere](#8-channels-chat-from-anywhere)
  - [Task scheduler](#9-task-scheduler)
  - [Health checks](#10-health-checks)
  - [Memory and personalization](#11-memory-and-personalization)
- [How a request flows through Friday](#how-a-request-flows-through-friday)
- [Privacy and security](#privacy-and-security)
- [Platforms and languages](#platforms-and-languages)
- [Getting started](#getting-started)
- [Glossary](#glossary)

---

## What Friday is

Friday is a native desktop app (Windows, macOS, and Linux) built on Electron. At its core is
an **AI agent**: not just a chat window, but an assistant that can take actions on your
behalf using a set of tools. You describe a goal in natural language, and Friday plans,
uses the right tools, and returns a concrete result: a written file, an answer with sources,
a generated image, a scheduled job, a transcribed recording, and more.

You stay in control. Friday works with the AI providers *you* choose and pay for, keeps its
working data on your own machine, and asks for permission before doing anything sensitive.

## Who it's for

- **Anyone who wants a personal AI assistant** that lives on their desktop instead of a browser tab.
- **Professionals and power users** who want the AI to actually *do* things: manage files, draft documents, automate recurring tasks, and work with the external tools they connect.
- **People who care about privacy** and prefer to use their own AI provider accounts and keep data local.
- **Tinkerers and teams** who want to extend the assistant with custom skills, tool servers, and messaging integrations.

## Key ideas in one minute

- **Chat that acts.** Talk to Friday like a person; it uses tools to complete the task, not just describe it.
- **Bring your own AI.** Plug in your own API keys for the model providers you prefer. Friday is not locked to a single vendor.
- **Local first.** The app, your settings, credentials, and conversation history live on your device.
- **Permissioned.** Writing files, sending messages, or accessing private data requires explicit approval.
- **Extensible.** Add skills, connect external tools via MCP, and reach the assistant from your favorite chat apps.
- **Automatable.** Schedule the assistant to run jobs on a recurring basis, and run periodic health checks.

---

## Feature overview

### 1. The AI assistant (chat)

The heart of Friday is a conversational assistant. You type (or speak) a request, and it
responds in a clean, readable chat with full Markdown, syntax-highlighted code blocks, and
inline images.

What makes it more than a chatbot:

- **It takes action.** When a task needs it, the assistant reaches for tools (see below) to
  read files, search the web, generate an image, and so on, then weaves the results into its
  answer.
- **Transparent tool activity.** You can see what the assistant is doing, grouped by tool,
  as it works.
- **Permission prompts.** When an action is sensitive (like writing or editing a file), Friday
  shows a confirmation card so you approve before it happens.
- **Attachments.** Send images and PDFs alongside your prompt.
- **Natural, direct tone.** The assistant is tuned to sound human and practical, brief for
  quick questions and more careful for complex work.
- **Session history.** Conversations are saved locally so you can revisit or clear them.

### 2. Agent tools (what the assistant can do)

Tools are the assistant's hands. Depending on your setup, Friday can:

| Tool | What it does |
| --- | --- |
| **Read / write / edit files** | Open, create, and modify files in your workspace, with safety checks and approval prompts before changes. |
| **Apply patch** | Make precise, surgical edits to existing files. |
| **Run commands & processes** | Execute shell commands and longer-running processes to build, test, or automate work. |
| **Web search** | Look things up on the internet for fresh, accurate information. |
| **Web fetch** | Pull the contents of a specific page or URL. |
| **Web browser** | Drive a real browser to interact with web pages when a simple fetch isn't enough. |
| **Create image** | Generate images from a text description. |
| **Schedule (cron)** | Create, update, pause, resume, list, delete, and run scheduled jobs. |
| **Load skills** | Pull in a reusable skill to handle a class of work. |
| **Subagents** | Spin up focused helper agents for independent parts of a larger task. |
| **MCP tools** | Use any tool exposed by a connected MCP server (see [MCP servers](#7-mcp-servers)). |

The assistant uses tools only when they improve the result, and treats their output as
evidence rather than instructions. It won't send messages, change records, delete data, or
touch production systems without clear authorization.

### 3. Voice: dictation and read-aloud

Friday listens and speaks.

- **Speech-to-text (transcription).** Talk instead of type. Friday captures your microphone
  and transcribes speech into text, with support for real-time dictation as you speak.
- **Text-to-speech (voice).** Have the assistant read its replies aloud in a natural voice.
- You choose which provider and voice model powers each direction, and grant microphone
  permission on your own terms.

### 4. Image generation

Describe an image in words and Friday creates it, using the image provider and model you
select. Generated images appear directly in the conversation and can be saved. This is
exposed both as a chat tool and as its own dedicated image workspace in settings.

### 5. Providers: bring your own AI

Friday doesn't ship a single built-in model. Instead, you connect the AI **providers** you
want to use by adding your own API keys. Each capability can use a different provider and
model, so you can mix and match for quality, cost, and speed.

Friday organizes AI into **model services**, and you pick a provider + model for each:

- **Assistant** — the chat/agent brain (large language models).
- **Speech-to-Text** — transcription of your voice.
- **Text-to-Speech** — the assistant's spoken voice.
- **Text-to-Image** — image generation.
- **Text-to-Video** — *coming soon.*
- **Music / Audio** — *coming soon.*

Behind the scenes, provider adapters normalize many different vendors into one consistent
interface, including major chat/LLM providers, transcription providers, speech providers, and
image providers. Because Friday speaks the common "OpenAI-compatible" format too, additional
compatible providers can be added by pointing to their endpoint.

Your API keys are stored as credentials in local settings and are never displayed back in
plain text once saved.

### 6. Skills

**Skills** are reusable capabilities that teach Friday how to handle a particular kind of
work, so it doesn't have to rediscover the same workflow every time. A skill can bundle
instructions, reference material, templates, schemas, and optional executable behavior.

- **Install and manage.** Friday ships with example skills, and you can import or download
  more into your personal skill library, then enable or disable each one.
- **Automatic discovery.** Before answering, Friday looks at your request and selects the
  most relevant enabled skills to guide its work.
- **Safe by design.** Skills run within declared limits (allowed tools, timeouts), and unsafe
  or disabled skills are blocked. Friday keeps an audit of why a skill was chosen or rejected.

### 7. MCP servers

Friday supports the **Model Context Protocol (MCP)**, an open standard for giving AI
assistants access to external tools and data. You can connect:

- **Remote MCP servers** — hosted tool servers reached over HTTP, with optional token/key auth.
- **Local (stdio) MCP servers** — tools that run as a local process on your machine.

Once connected, the tools that server provides become available to the assistant
automatically. This is how Friday stays extensible: any capability someone can package as an
MCP server can plug into Friday without changing the app.

### 8. Channels: chat from anywhere

**Channels** let you talk to Friday from outside the app, through the messaging platforms you
already use. A message arrives from a channel, Friday runs an agent turn, and the reply is
delivered back through the same channel.

- **Supported today: Telegram and Discord.** Connect a bot and chat with your assistant from
  your phone or desktop, with reliable delivery and reconnection built in.
- **Access control.** Each channel has its own configuration, enabled state, and a
  direct-message policy (allowlist, pairing, open, or deny), so you decide who can message
  Friday. Channel secrets stay in the channel's own records.

### 9. Task scheduler

Friday can work on a schedule, even when you're not actively chatting. The **task scheduler**
(cron) lets you set up recurring jobs, a daily summary, a periodic check, a routine cleanup,
and have the assistant run them automatically.

- Create, update, pause, resume, list, and run schedules on demand.
- Each schedule runs an agent turn with its own instructions, using the provider and model you
  choose for scheduled work.

### 10. Health checks

The **health** feature runs the assistant on a periodic interval against a checklist you
define, so Friday can proactively verify that things are in order and report back. You set the
interval, the provider/model, and the checklist instructions that describe what "healthy"
means for your setup.

### 11. Memory and personalization

Friday builds up a personal working context so it gets more useful over time:

- **Memory.** Durable facts and preferences the assistant should remember across conversations.
- **User profile & identity.** Who you are and how you like the assistant to behave, so replies
  match your context and tone.
- **Workspace.** A local working area where the assistant keeps and edits the files it produces.

This personalization stays on your device and shapes how the assistant responds and acts.

---

## How a request flows through Friday

A simple mental model of what happens when you ask Friday to do something:

1. **You make a request** in chat (typed or spoken).
2. **Friday understands the goal**, its constraints, and what output you expect. If something
   critical is ambiguous, it asks a focused question; otherwise it proceeds with a reasonable,
   reversible assumption.
3. **It plans and picks tools.** For multi-step or risky work, it forms a short plan and
   chooses the right tools, skills, or subagents.
4. **It acts, with permission.** Sensitive actions (writing files, sending messages, touching
   private data) prompt you for approval first.
5. **It verifies and responds.** Friday checks the result against your request and returns a
   concrete, ready-to-use answer or artifact.
6. **It remembers what matters** and, if scheduled, can repeat the work automatically later.

---

## Privacy and security

Friday is built to keep you in control of your data and actions:

- **Local by default.** The app, your settings, provider keys, and conversation history live
  on your own machine.
- **Bring your own keys.** You use your own AI provider accounts; Friday doesn't put a vendor
  in between.
- **Secrets stay secret.** API keys and channel credentials are stored as credentials and are
  not shown in plain text after saving, not logged, and not rendered.
- **Explicit permissions.** Any tool action that writes, deletes, publishes, or reads private
  data must pass a permission check. The app shows confirmation prompts before sensitive
  changes.
- **Hardened app shell.** The user interface runs in a locked-down, sandboxed environment with
  strict isolation from the underlying system, and browser windows are created through safe
  defaults.

> Note: Friday does not currently claim any formal regulated-data certification. Review your
> own AI providers' and connected services' terms for how *they* handle data you send them.

## Platforms and languages

- **Platforms:** Windows, macOS (Intel and Apple Silicon), and Linux.
- **Interface languages:** English and Italian, with a language switcher in settings.
- **Appearance:** Light, dark, and system themes.
- **Convenience:** A command menu for quick navigation, plus optional menu-bar/tray presence.

## Getting started

1. **Install and open Friday** on your computer.
2. **Add a provider key.** In Settings → Providers, paste the API key for at least one AI
   provider you want to use.
3. **Pick your models.** Choose which provider and model powers the assistant, and optionally
   transcription, voice, and image generation.
4. **Start chatting.** Ask Friday to do something. Approve any permission prompts for actions
   that touch your files or accounts.
5. **Extend it (optional).** Enable skills, connect your Google/Microsoft/Dropbox accounts,
   add MCP tool servers, link a Telegram channel, or schedule a recurring task.

## Glossary

- **Agent / Assistant** — the AI that chats with you and takes actions using tools.
- **Provider** — an AI vendor (accessed with your API key) that powers a capability like chat,
  transcription, speech, or images.
- **Model service** — a capability slot (Assistant, Speech-to-Text, Text-to-Speech,
  Text-to-Image, and more) that you assign a provider and model to.
- **Tool** — a specific action the assistant can perform, such as reading a file or searching
  the web.
- **Skill** — a reusable, packaged workflow that teaches Friday how to handle a class of tasks.
- **Connector** — a link to an external service (Google, Microsoft, Dropbox) so the assistant
  can work with your email, calendar, and files.
- **MCP (Model Context Protocol)** — an open standard for connecting external tools and data to
  the assistant.
- **Channel** — a messaging platform (like Telegram) you can use to reach Friday from outside
  the app.
- **Task scheduler (cron)** — recurring jobs that run the assistant automatically.
- **Health check** — a periodic, checklist-driven run that verifies your setup and reports back.
