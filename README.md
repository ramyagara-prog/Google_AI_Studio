<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/04d4a805-6491-40b2-aa17-3566aae2c086

## Deployment Instructions

### Google AI Studio

* Created the Weather Intelligence App using Google AI Studio App Build.
* Connected the generated application directly to GitHub.

### Local Setup

1. Install dependencies:

   ```
   npm install
   ```
2. Run the application:

   ```
   npm run dev
   ```

### Cloudflare Pages Deployment

1. Connect the GitHub repository to Cloudflare Pages.
2. Build command:

   ```
   npm run build
   ```
3. Build output directory:

   ```
   dist
   ```
4. Deploy the application and access it using the generated `pages.dev` URL.

### APIs Used

* Open-Meteo Geocoding API
* Open-Meteo Forecast API

### Validation

* Tested using valid cities (for example, Chennai and London).
* Verified invalid city search displays an appropriate error message.
* Confirmed the application is successfully deployed on Cloudflare Pages.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
