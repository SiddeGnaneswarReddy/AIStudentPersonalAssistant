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

> **Note:** AI-powered features (like PDF processing) rely on Lovable-managed secrets that only work in the cloud environment. Test those features on your **Lovable preview URL** instead of localhost.

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
