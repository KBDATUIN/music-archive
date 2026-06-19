# Supabase Setup Guide

## Step 1: Create a Supabase Account & Project

1. Go to https://supabase.com and click **"Start your project"**
2. Sign up with GitHub or email
3. Once logged in, click **"New project"**
4. Fill in:
   - **Name:** `music-archive` (or anything)
   - **Database Password:** Create a strong password and **save it somewhere**
   - **Region:** Pick the closest one to you
   - **Pricing Plan:** Free tier is fine
5. Click **"Create new project"** and wait ~2 minutes

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar, icon looks like `{}`)
2. Click **"New query"**
3. Open the file `db-schema.sql` from this project in a text editor
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" — that means all tables were created

## Step 3: Create a Storage Bucket for Images

1. In your Supabase dashboard, go to **Storage** (left sidebar, icon looks like a file)
2. Click **"New bucket"**
3. Set:
   - **Name:** `entry-images`
   - **Public bucket:** ON (toggle to green)
4. Click **"Create bucket"**
5. Still in Storage, click on **`entry-images`** bucket
6. Go to the **"Policies"** tab
7. Click the **"Create policy"** button (there should be a quick setup option)
8. Choose **"Get started with quick policies"**
9. Check **"Allow public access"** and confirm

## Step 4: Enable Email Auth (for Admin Login)

1. Go to **Authentication** (left sidebar, icon looks like a key)
2. Click **"Providers"** tab (should be selected by default)
3. Find **"Email"** and make sure it's **Enabled** (toggle is on)
4. Under "Confirm email", set it to **OFF** (so you don't need email verification for admin)

## Step 5: Create an Admin User

1. In **Authentication > Users**, click **"Add user"**
2. Enter:
   - **Email:** `admin@example.com` (or your preferred email)
   - **Password:** Create a strong password
3. Click **"Create user"**

## Step 6: Get Your API Keys

1. Go to **Project Settings > API** (or click the gear icon in bottom-left, then **API**)
2. Under **"Project URL"**, copy the URL (looks like `https://xxxxx.supabase.co`)
3. Under **"Project API keys"**, find **"anon public"** — copy that key

## Step 7: Configure the Project

1. Open `supabase-config.js` in this project
2. Replace the placeholder values:

```js
const SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT.supabase.co',   // <-- paste your Project URL here
  anonKey: 'YOUR_SUPABASE_ANON_KEY'           // <-- paste your anon key here
};
```

Example (yours will be different):
```js
const SUPABASE_CONFIG = {
  url: 'https://abcdefghijklm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxOTUwMDAwMDAwfQ.xxxxx'
};
```

## Step 8: Test It

1. Open `index.html` in your browser
2. The hardcoded entries should appear (seeded automatically on first load)
3. Open `admin.html` in your browser
4. Sign in with the admin email/password you created in Step 5
5. You should see the admin dashboard with "No pending submissions"

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page / no entries | Open the browser console (F12). Check if there's an error about Supabase URL. Make sure `supabase-config.js` has your real URL and key. |
| "Failed to fetch" errors | Check that your Supabase project is active and the URL is correct. The free tier hibernates after 1 week of inactivity — just visit your Supabase dashboard to wake it up. |
| Admin login fails | Go to **Authentication > Users** in your Supabase dashboard and make sure the admin user exists. |
| Images not uploading | Make sure the `entry-images` storage bucket is public. Check **Storage > entry-images > Policies** has a policy allowing public inserts. |
