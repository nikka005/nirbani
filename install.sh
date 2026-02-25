#!/bin/bash
set -e

echo "========================================="
echo "  NIRBANI DAIRY - AUTO INSTALLER"
echo "  Domain: nirbanidairy.shop"
echo "========================================="

# System Update
echo "[1/11] Updating system..."
sudo apt update && sudo apt upgrade -y

# Node.js 20
echo "[2/11] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python
echo "[3/11] Installing Python..."
sudo apt install -y python3 python3-pip python3-venv

# MongoDB 7
echo "[4/11] Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Tools
echo "[5/11] Installing Nginx, Yarn, PM2..."
sudo apt install -y nginx git certbot python3-certbot-nginx
sudo npm install -g yarn pm2

# Clone Code
echo "[6/11] Cloning code..."
cd /home/ubuntu
git clone https://github.com/nikka005/nirbani.git || (cd nirbani && git pull)
cd nirbani

# Backend Setup
echo "[7/11] Setting up backend..."
cd /home/ubuntu/nirbani/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi==0.110.1 uvicorn[standard] motor python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv openpyxl pandas bcrypt aiohttp pydantic[email]
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
deactivate

# Backend .env
cat > /home/ubuntu/nirbani/backend/.env << 'ENVEOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=nirbani_dairy
CORS_ORIGINS=https://nirbanidairy.shop,http://nirbanidairy.shop,http://localhost
JWT_SECRET=nirbani-dairy-production-secret-key-change-this-2026
MSG91_AUTH_KEY=
MSG91_SENDER_ID=NIRDRY
MSG91_ROUTE=4
MSG91_COLLECTION_TEMPLATE_ID=
MSG91_PAYMENT_TEMPLATE_ID=
EMERGENT_LLM_KEY=sk-emergent-651E10b5d37729f851
ENVEOF

# Frontend Setup
echo "[8/11] Building frontend..."
cd /home/ubuntu/nirbani/frontend
cat > .env << 'ENVEOF'
REACT_APP_BACKEND_URL=https://nirbanidairy.shop
ENVEOF
yarn install
yarn build

# Nginx Config
echo "[9/11] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/nirbanidairy << 'NGINXEOF'
server {
    listen 80;
    server_name nirbanidairy.shop www.nirbanidairy.shop;

    location / {
        root /home/ubuntu/nirbani/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

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
NGINXEOF
sudo ln -sf /etc/nginx/sites-available/nirbanidairy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Start Backend
echo "[10/11] Starting backend..."
cat > /home/ubuntu/nirbani/backend/start.sh << 'SHEOF'
#!/bin/bash
cd /home/ubuntu/nirbani/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
SHEOF
chmod +x /home/ubuntu/nirbani/backend/start.sh
pm2 start /home/ubuntu/nirbani/backend/start.sh --name "nirbani-backend" --interpreter bash
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Firewall
echo "[11/11] Setting up firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Verify
echo ""
echo "========================================="
echo "  INSTALLATION COMPLETE!"
echo "========================================="
echo ""
curl -s http://localhost:8001/api/health
echo ""
echo ""
echo "NEXT STEPS (Do these manually):"
echo "================================"
echo "1. Point your domain nirbanidairy.shop to this server IP:"
echo "   - Go to your domain registrar"
echo "   - Add A Record: @ → $(curl -s ifconfig.me)"
echo "   - Add A Record: www → $(curl -s ifconfig.me)"
echo ""
echo "2. After DNS is active (5-10 min), run SSL:"
echo "   sudo certbot --nginx -d nirbanidairy.shop -d www.nirbanidairy.shop"
echo ""
echo "3. Open: https://nirbanidairy.shop"
echo "========================================="
