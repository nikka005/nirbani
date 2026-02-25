# Nirbani Dairy - AWS Deployment Guide
# Domain: nirbanidairy.shop
# GitHub: https://github.com/nikka005/nirbani.git

---

## Step 1: Push Code to GitHub

In the Emergent chat, click **"Save to GitHub"** button (near the chat input).
- Connect your GitHub account if not already connected
- Select repository: `nikka005/nirbani`
- Push the code

---

## Step 2: AWS Account Setup

### What You Need:
- AWS Account (https://aws.amazon.com)
- Domain: nirbanidairy.shop (DNS access required)

### Recommended AWS Services:
| Service | Purpose | Monthly Cost (approx) |
|---------|---------|----------------------|
| EC2 (t3.micro) | Backend + Frontend | $8-15/month |
| MongoDB Atlas (Free) | Database | Free (up to 512MB) |
| Route 53 | Domain DNS | $0.50/month |
| ACM | SSL Certificate | Free |

---

## Step 3: Launch EC2 Instance

### 3.1 Create EC2 Instance
1. Go to AWS Console → EC2 → Launch Instance
2. Settings:
   - **Name**: `nirbani-dairy`
   - **AMI**: Ubuntu 22.04 LTS
   - **Instance Type**: `t3.small` (2 vCPU, 2GB RAM) - minimum for both frontend + backend
   - **Key Pair**: Create new → Download `.pem` file (KEEP SAFE!)
   - **Security Group**: Allow these ports:
     - SSH (22) - Your IP only
     - HTTP (80) - Anywhere
     - HTTPS (443) - Anywhere
   - **Storage**: 20 GB

3. Click **Launch Instance**
4. Note the **Public IP** (e.g., `13.233.xx.xx`)

### 3.2 Connect to EC2
```bash
chmod 400 nirbani-dairy.pem
ssh -i nirbani-dairy.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Step 4: Install Dependencies on EC2

Run these commands on your EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11+
sudo apt install -y python3 python3-pip python3-venv

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Yarn
sudo npm install -g yarn

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

---

## Step 5: Deploy Application

### 5.1 Clone Repository
```bash
cd /home/ubuntu
git clone https://github.com/nikka005/nirbani.git
cd nirbani
```

### 5.2 Setup Backend
```bash
cd /home/ubuntu/nirbani/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip

# Install emergentintegrations (required for AI OCR feature)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Install all other dependencies
pip install fastapi uvicorn motor python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv openpyxl pandas bcrypt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=nirbani_dairy
CORS_ORIGINS=https://nirbanidairy.shop,http://nirbanidairy.shop
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_SECRET_KEY_12345
MSG91_AUTH_KEY=
MSG91_SENDER_ID=NIRDRY
MSG91_ROUTE=4
MSG91_COLLECTION_TEMPLATE_ID=
MSG91_PAYMENT_TEMPLATE_ID=
EMERGENT_LLM_KEY=sk-emergent-651E10b5d37729f851
EOF

# Test backend starts
python3 -c "from server import app; print('Backend OK')"
deactivate
```

### 5.3 Setup Frontend
```bash
cd /home/ubuntu/nirbani/frontend

# Create production .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://nirbanidairy.shop
EOF

# Install dependencies
yarn install

# Build for production
yarn build
```

---

## Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/nirbanidairy
```

Paste this:
```nginx
server {
    listen 80;
    server_name nirbanidairy.shop www.nirbanidairy.shop;

    # Frontend (React build)
    location / {
        root /home/ubuntu/nirbani/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/nirbanidairy /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 7: Start Backend with PM2

```bash
cd /home/ubuntu/nirbani/backend

# Create PM2 start script
cat > start.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/nirbani/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
EOF

chmod +x start.sh

# Start with PM2
pm2 start start.sh --name "nirbani-backend" --interpreter bash
pm2 save
pm2 startup
```

---

## Step 8: Setup Domain (nirbanidairy.shop)

### Option A: Using AWS Route 53
1. Go to Route 53 → Hosted Zones → Create: `nirbanidairy.shop`
2. Add A Record: `nirbanidairy.shop` → Your EC2 Public IP
3. Add A Record: `www.nirbanidairy.shop` → Your EC2 Public IP
4. Update your domain registrar's nameservers to Route 53's NS records

### Option B: Using Your Domain Registrar
1. Go to your domain registrar (GoDaddy/Namecheap/etc.)
2. Add A Record: `@` → Your EC2 Public IP
3. Add A Record: `www` → Your EC2 Public IP
4. Wait 5-30 minutes for DNS propagation

---

## Step 9: Setup SSL (HTTPS) - FREE

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (FREE from Let's Encrypt)
sudo certbot --nginx -d nirbanidairy.shop -d www.nirbanidairy.shop

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

---

## Step 10: Verify Deployment

```bash
# Check all services
sudo systemctl status mongod      # MongoDB
sudo systemctl status nginx        # Nginx
pm2 status                         # Backend

# Test backend
curl http://localhost:8001/api/health

# Test from browser
# Open: https://nirbanidairy.shop
```

---

## Important Security Steps

```bash
# 1. Change JWT Secret in backend/.env
# Replace CHANGE_THIS_TO_A_STRONG_SECRET_KEY_12345 with a random string:
openssl rand -hex 32

# 2. Restrict MongoDB (already localhost only by default)
# 3. Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Updating the App (After Code Changes)

```bash
cd /home/ubuntu/nirbani

# Pull latest code
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
pm2 restart nirbani-backend

# Update frontend
cd ../frontend
yarn install
yarn build

# Done! Changes are live.
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend not starting | `pm2 logs nirbani-backend` |
| MongoDB connection error | `sudo systemctl status mongod` |
| Nginx error | `sudo nginx -t` and `sudo tail -f /var/log/nginx/error.log` |
| SSL not working | `sudo certbot --nginx -d nirbanidairy.shop` |
| Frontend blank page | Check `REACT_APP_BACKEND_URL` in frontend/.env |

---

## Monthly Cost Estimate

| Service | Cost |
|---------|------|
| EC2 t3.small | ~₹800/month |
| Route 53 | ~₹40/month |
| SSL (Let's Encrypt) | Free |
| MongoDB (local) | Free |
| **Total** | **~₹840/month** |

---

## Libraries Used (Special Install)

| Library | Install Command | Purpose |
|---------|----------------|---------|
| emergentintegrations | `pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` | AI OCR for rate chart scanning |
| openpyxl | `pip install openpyxl` | Excel file parsing for bulk upload |
| motor | `pip install motor` | MongoDB async driver |
| python-jose | `pip install python-jose[cryptography]` | JWT authentication |
| bcrypt | `pip install bcrypt` | Password hashing |

---

**Your app will be live at: https://nirbanidairy.shop**
