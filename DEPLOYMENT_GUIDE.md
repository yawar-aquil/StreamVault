# StreamVault EC2 Deployment Guide

## 1. Prerequisites
- **AWS Account**: An active AWS account.
- **Domain Name**: A domain pointing to your EC2 Elastic IP (e.g., `streamvault.yourdomain.com`).
- **SSH Client**: Terminal (Mac/Linux) or PowerShell/PuTTY (Windows).

## 2. Launch EC2 Instance
1.  **OS**: Ubuntu 24.04 LTS (recommended).
2.  **Instance Type**: `t3.small` (2 vCPU, 2GB RAM) is good for starting.
3.  **Key Pair**: Create a new key pair (`streamvault-key.pem`) and download it.
4.  **Security Group**: Allow **SSH (22)**, **HTTP (80)**, and **HTTPS (443)** from Anywhere (`0.0.0.0/0`).
5.  **Elastic IP**: Allocate an Elastic IP and associate it with your new instance.

## 3. Server Setup (Automated)
Connect to your server:
```bash
ssh -i path/to/streamvault-key.pem ubuntu@<elastic-ip>
```

Clone your repository:
```bash
git clone https://github.com/shakirali78690/StreamVault.git streamvault
cd streamvault
```

Run the setup script:
```bash
sudo bash setup-server.sh
```

## 4. Application Configuration
1.  **Environment Variables**:
    Create the `.env` file:
    ```bash
    nano .env
    ```
    Paste your `.env` content (TMDB keys, GitHub ID, etc.).
    **IMPORTANT**: Add `JWT_SECRET=sv-streamvault-prod-secret-2026-secure` (or your own random string).

2.  **Install & Build**:
    ```bash
    npm ci
    npm run build
    ```

## 5. Data Migration (CRITICAL)
Your data resides in JSON files. You **MUST** copy them from your local machine to the server.

**Run this on YOUR LOCAL MACHINE (PowerShell):**
```powershell
# Copy data folder
scp -i path/to/streamvault-key.pem -r .\data ubuntu@<elastic-ip>:~/streamvault/data

# Copy uploads folder (if you have one)
scp -i path/to/streamvault-key.pem -r .\uploads ubuntu@<elastic-ip>:~/streamvault/uploads
```
*Note: If `scp` is not available, you can use FileZilla or WinSCP.*

## 6. Start Application
Back on the server (SSH):
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
# Run the command output by 'pm2 startup' to enable auto-start on boot
```

## 7. Domain & SSL (HTTPS)
Once your domain points to the server IP:
```bash
sudo certbot --nginx -d yourdomain.com
```
Follow prompts to enable HTTPS.

## 8. Updates
To update the app in the future:
```bash
./deploy.sh
```
