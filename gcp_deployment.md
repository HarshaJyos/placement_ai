# Google Cloud Platform (GCP) Deployment Guide

This guide explains how to compile, store, and host your application on Google Cloud Platform **without installing Docker locally**. 

We will use:
1. **Google Cloud Build**: To compile and package your Docker containers directly on Google's remote servers.
2. **Google Artifact Registry**: To store your compiled Docker images securely.
3. **Google Cloud Run**: To execute the containers and automatically assign them a live public HTTPS URL.

---

## Prerequisites
1. Ensure the **Google Cloud CLI** is installed on your local machine.
2. Make sure you have a Google Cloud Project created on the [GCP Console](https://console.cloud.google.com/).
3. Enable the following APIs in your GCP Console or via CLI:
   * Artifact Registry API
   * Cloud Build API
   * Cloud Run API

---

## Step-by-Step Deployment Commands

### 1. Authenticate with Google Cloud
Open your terminal and authenticate your gcloud CLI with your Google account:
```powershell
gcloud auth login
```
*This will open your web browser. Select your Google account and grant permissions.*

### 2. Configure Your Active GCP Project
Set the project ID you want to deploy to:
```powershell
gcloud config set project [YOUR_PROJECT_ID]
```
*(Replace `[YOUR_PROJECT_ID]` with your actual Google Cloud Project ID).*

### 3. Create a Google Artifact Registry Repository
Create a repository (named `placement-repo`) in your preferred region (e.g. `asia-south1` or `us-central1`) to store the Docker images:
```powershell
gcloud artifacts repositories create placement-repo `
    --repository-format=docker `
    --location=asia-south1 `
    --description="Docker repository for Placement AI"
```

### 4. Build Containers Remotely (No Local Docker Needed)
Instead of building locally, we submit the source code to Google Cloud Build. It builds the Dockerfiles in the cloud and automatically registers the resulting image in your Artifact Registry.

Run these commands from the root directory of your workspace:

#### Build the AI Backend:
```powershell
gcloud builds submit --tag asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/placement-repo/ai-service:latest apps/ai-service
```

#### Build the Next.js Frontend:
```powershell
gcloud builds submit --tag asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/placement-repo/web:latest apps/web
```

---

### 5. Deploy to Google Cloud Run (Gets Your Live URLs)

Once both images are built in the Artifact Registry, deploy them as serverless containers.

#### A. Deploy the AI Backend Service
Run the command to launch the Python FastAPI service:
```powershell
gcloud run deploy placement-ai-service `
    --image=asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/placement-repo/ai-service:latest `
    --region=asia-south1 `
    --allow-unauthenticated `
    --set-env-vars="GEMINI_API_KEY=[YOUR_GEMINI_KEY],GITHUB_TOKEN=[YOUR_GITHUB_TOKEN]"
```
*Take note of the **Service URL** output by this command (e.g., `https://placement-ai-service-xxxx-as.a.run.app`). You will pass this URL to the frontend.*

#### B. Deploy the Next.js Frontend Web App
Run the command to launch the web client, supplying the backend service URL you just generated:
```powershell
gcloud run deploy placement-web `
    --image=asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/placement-repo/web:latest `
    --region=asia-south1 `
    --allow-unauthenticated `
    --set-env-vars="DATABASE_URL=file:/data/db/prod.db,GEMINI_API_KEY=[YOUR_GEMINI_KEY],GITHUB_TOKEN=[YOUR_GITHUB_TOKEN],AI_SERVICE_URL=[YOUR_BACKEND_SERVICE_URL]"
```
*(Replace `[YOUR_BACKEND_SERVICE_URL]` with the URL generated in Step A).*

Cloud Run will deploy your frontend container and print your **Live Web URL**!
