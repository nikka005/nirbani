# ============================================
# NIRBANI DAIRY - AWS DEPLOYMENT COMMANDS
# Domain: nirbanidairy.shop
# Run these commands on your EC2 Ubuntu instance
# ============================================

# ==========================================
# STEP 1: SYSTEM UPDATE
# ==========================================
sudo apt update && sudo apt upgrade -y

# ==========================================
# STEP 2: INSTALL NODE.JS 20
# ==========================================
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ==========================================
# STEP 3: INSTALL PYTHON 3.11
# ==========================================
sudo apt install -y python3 python3-pip python3-venv

# ==========================================
# STEP 4: INSTALL MONGODB 7
# ==========================================
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# ==========================================
# STEP 5: INSTALL NGINX, YARN, PM2, GIT
# ==========================================
sudo apt install -y nginx git
sudo npm install -g yarn
sudo npm install -g pm2

# ==========================================
# STEP 6: CLONE YOUR CODE
# ==========================================
cd /home/ubuntu
git clone https://github.com/nikka005/nirbani.git
cd nirbani

# ==========================================
# STEP 7: SETUP BACKEND
# ==========================================
cd /home/ubuntu/nirbani/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi==0.110.1 uvicorn[standard] motor python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv openpyxl pandas bcrypt aiohttp pydantic[email]
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
deactivate

# ==========================================
# STEP 8: CREATE BACKEND .env FILE
# ==========================================
cat > /home/ubuntu/nirbani/backend/.env << 'EOF'
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
EOF

# ==========================================
# STEP 9: SETUP FRONTEND
# ==========================================
cd /home/ubuntu/nirbani/frontend
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://nirbanidairy.shop
EOF
yarn install
yarn build

# ==========================================
# STEP 10: CONFIGURE NGINX
# ==========================================
sudo tee /etc/nginx/sites-available/nirbanidairy << 'EOF'
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
EOF

sudo ln -sf /etc/nginx/sites-available/nirbanidairy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# ==========================================
# STEP 11: START BACKEND WITH PM2
# ==========================================
cat > /home/ubuntu/nirbani/backend/start.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/nirbani/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
EOF
chmod +x /home/ubuntu/nirbani/backend/start.sh
pm2 start /home/ubuntu/nirbani/backend/start.sh --name "nirbani-backend" --interpreter bash
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# ==========================================
# STEP 12: POINT DOMAIN (nirbanidairy.shop)
# Go to your domain registrar and add:
#   A Record: @ → YOUR_EC2_PUBLIC_IP
#   A Record: www → YOUR_EC2_PUBLIC_IP
# Wait 5-10 minutes for DNS to propagate
# ==========================================

# ==========================================
# STEP 13: INSTALL FREE SSL (HTTPS)
# Run this AFTER domain DNS is pointing to your server
# ==========================================
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nirbanidairy.shop -d www.nirbanidairy.shop

# ==========================================
# STEP 14: SETUP FIREWALL
# ==========================================
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# ==========================================
# STEP 15: VERIFY EVERYTHING IS RUNNING
# ==========================================
echo "=== MongoDB ===" && sudo systemctl status mongod | head -5
echo "=== Nginx ===" && sudo systemctl status nginx | head -5
echo "=== Backend ===" && pm2 status
echo "=== API Test ===" && curl -s http://localhost:8001/api/health
echo ""
echo "========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "  Open: https://nirbanidairy.shop"
echo "========================================="

# ==========================================
# USEFUL COMMANDS (SAVE FOR LATER)
# ==========================================

# View backend logs:
# pm2 logs nirbani-backend

# Restart backend:
# pm2 restart nirbani-backend

# Update code after changes:
# cd /home/ubuntu/nirbani && git pull
# cd backend && source venv/bin/activate && pip install -r requirements.txt && deactivate
# pm2 restart nirbani-backend
# cd ../frontend && yarn install && yarn build

# Check MongoDB:
# sudo systemctl status mongod

# Check Nginx errors:
# sudo tail -f /var/log/nginx/error.log

# Renew SSL (auto, but manual if needed):
# sudo certbot renew
