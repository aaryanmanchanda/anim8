# Anim8 — Chat-Based Hyperframes Video Generator

A web application where you describe a video in natural language, and an LLM drives [HeyGen's Hyperframes framework](https://github.com/heygen-com/hyperframes) to generate the corresponding HTML composition. See motion graphics rendered live, iterate by chatting, and download the result as an `.mp4` video.

**Live Demo:** https://anim8-five.vercel.app  
**GitHub:** https://github.com/aaryanmanchanda/anim8

---

## Demo

Type a prompt like:
- *"a 5-second intro with a fade-in title that says Hello World on a dark background"*
- *"now add a subtitle that fades in at 2 seconds"*
- *"make the title bigger and switch to a red gradient"*

The app generates a valid Hyperframes HTML composition, renders it live in the preview pane, and lets you download the final result as an MP4.

---

## Architecture

```
anim8/
├── hyperframes-chat/        # Next.js frontend + API routes (Vercel)
│   ├── app/
│   │   ├── page.tsx         # Chat UI + live preview
│   │   └── api/chat/
│   │       └── route.ts     # LLM API route (Groq / LLaMA 3.3 70B)
└── hyperframes-server/      # Express render server (Railway)
    └── server.js            # Hyperframes render pipeline
```

### How it works

1. **User types a prompt** into the chat interface
2. **Next.js API route** sends the prompt + current composition HTML to Groq (LLaMA 3.3 70B) with a system prompt that teaches it the Hyperframes HTML schema
3. **LLM returns** a complete Hyperframes HTML composition
4. **Frontend renders** the composition live in a scaled iframe
5. **User iterates** — follow-up prompts send the current composition back to the LLM so edits are applied incrementally
6. **Download** — the composition is sent to the Express render server which runs `npx hyperframes render` (Puppeteer + FFmpeg) and streams back an MP4

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS
- **LLM:** Groq API (LLaMA 3.3 70B Versatile)
- **Composition Framework:** [Hyperframes](https://github.com/heygen-com/hyperframes)
- **Animation Runtime:** GSAP 3
- **Render Pipeline:** `@hyperframes/producer` + Puppeteer + FFmpeg
- **Frontend Deployment:** Vercel
- **Render Server Deployment:** Railway

---

## Local Setup

### Prerequisites
- Node.js >= 22
- FFmpeg installed (`brew install ffmpeg` on macOS)

### 1. Clone the repo
```bash
git clone https://github.com/aaryanmanchanda/anim8.git
cd anim8
```

### 2. Frontend setup
```bash
cd hyperframes-chat
npm install
```

Create `.env.local`:
```
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_RENDER_URL=http://localhost:3001
```

```bash
npm run dev
```

### 3. Render server setup
```bash
cd ../hyperframes-server
npm install
node server.js
```

The render server runs on `http://localhost:3001`.

### 4. Open the app
Visit `http://localhost:3000`

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | hyperframes-chat | Groq API key for LLM |
| `NEXT_PUBLIC_RENDER_URL` | hyperframes-chat | URL of the render server |

---

## LLM → Composition Mapping

The system prompt teaches the LLM the exact Hyperframes HTML schema:
- Root element with `data-composition-id`, `data-width`, `data-height`, `data-duration`
- Clip elements with `data-start`, `data-duration`, `data-track-index`
- GSAP timelines registered as `window.__timelines["main"]` (paused, for deterministic seeking)
- Full HTML document returned on every response for clean state replacement

Iterative edits work by always sending the current composition HTML alongside the new user message, so the LLM can diff and apply changes without starting from scratch.

---

## Known Limitations & What I'd Improve

**1. Production render pipeline**  
The render server requires Puppeteer + FFmpeg + a Chromium build that supports `HeadlessExperimental.beginFrame`. Railway's environment has Chromium compatibility issues causing it to fall back to screenshot mode and time out. Rendering works perfectly locally. With more time I'd use the official `ghcr.io/puppeteer/puppeteer` Docker image with a custom FFmpeg layer, or offload rendering to a dedicated cloud render farm.

**2. Groq free tier rate limits**  
LLaMA 3.3 70B on Groq's free tier has a 100k tokens/day limit which gets exhausted quickly during development and demos. With more time I'd add a fallback model, implement token counting, or switch to a paid tier.

**3. No streaming**  
The LLM response is returned all at once. Streaming tokens would make the app feel much faster and is straightforward to add with Groq's streaming API.

---

## Submission

Built by **Aaryan Manchanda**  
Assignment: Soundverse AI Software Engineer Intern
