# AI Student Personal Assistant

A full-stack web application built with [Lovable](https://lovable.dev) using TanStack Start, React, and Tailwind CSS.

---

## Getting Started (Run Locally)

Follow these steps to download and run this app on your own computer.

### 1. Clone the Repository

Open your **terminal** (Command Prompt, PowerShell, or Terminal app) and run:

```bash
git clone <your-github-repo-url>
```

**Where to run it:** Any folder on your computer (for example, `Documents` or `Desktop`). This creates a new project folder.

Then move into that folder:

```bash
cd AIStudentPersonalAssistant
```

> Replace `AIStudentPersonalAssistant` with the actual folder name that was created.

### 2. Install Dependencies

Inside the project folder, run:

```bash
npm install
```

This downloads all the required packages.

### 3. Start the Development Server

Run:

```bash
npm run dev
```

Your app will open at: **http://localhost:3000**

> **AI on localhost:** The Lovable AI key only works in the cloud. To make AI features work locally, create a `.env` file in the project root with:
> ```
> GROQ_API_KEY=your_groq_key_here
> ```
> Get a free key at https://console.groq.com/keys. On the Lovable preview/published URL, Lovable AI is used automatically and Groq is the fallback if it fails.

---

## Keeping Your Code Up to Date

Lovable automatically pushes every change to GitHub. To get the latest code on your local machine:

### Pull from inside your project folder

```bash
git pull origin main
```

> If your branch is named `master` instead of `main`, use:
> ```bash
> git pull origin master
> ```

**Where to run it:** Inside the same `AIStudentPersonalAssistant` folder where you ran `npm run dev`. Use your terminal.

---

## Pushing Your Own Changes

If you edit code locally and want to send it back to GitHub (and Lovable):

### Step 1: Save your changes

```bash
git add .
git commit -m "Describe what you changed"
```

### Step 2: Push to GitHub

```bash
git push origin main
```

> Use `master` instead of `main` if that is your branch name.

Lovable will automatically sync the changes from GitHub within a few moments.

---

## Quick Reference

| Command | What it does |
|---------|--------------|
| `git pull origin main` | Download latest code from GitHub |
| `git add .` | Stage all your changes |
| `git commit -m "message"` | Save changes with a note |
| `git push origin main` | Upload your changes to GitHub |
| `npm install` | Download project dependencies |
| `npm run dev` | Start the local server (localhost:3000) |

---

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React + Vite)
- **Styling:** Tailwind CSS v4
- **Backend:** Lovable Cloud (Supabase)
- **Authentication:** Supabase Auth (Google OAuth + Email)
- **Package Manager:** npm / bun

## Deploy to Vercel

This repo is preconfigured for Vercel. After connecting the GitHub repo on [vercel.com/new](https://vercel.com/new):

1. Vercel auto-detects `vercel.json` — no build settings needed.
2. Add the following **Environment Variables** in the Vercel project settings:

   **Client (public):**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

   **Server (secret):**
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOVABLE_API_KEY` *(optional — primary AI provider)*
   - `GROQ_API_KEY` *(fallback AI provider for quizzes / bullet points)*

3. Click **Deploy**. Subsequent pushes to the connected branch auto-deploy.

The Nitro `vercel` preset is enabled automatically via `NITRO_PRESET=vercel` in `vercel.json`, so the build emits a Vercel-compatible `.vercel/output` directory.
