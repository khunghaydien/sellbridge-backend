# Facebook Webhook Setup Guide 🚀

## 📋 Tổng quan

Webhook đã được setup để nhận real-time messages từ Facebook và push đến frontend qua Socket.IO.

## 🔧 Cấu hình Facebook Webhook

### 1. Vào Facebook App Settings
```
https://developers.facebook.com/apps/740691788788905
```

### 2. Thêm Webhook
1. Sidebar → **Products** → **Webhooks**
2. Click **"Add Subscriptions"** hoặc **"Configure"**
3. Chọn **"Page"**

### 3. Setup Webhook
Nhập thông tin:
- **Callback URL**: `https://sellbridge-backend-production.up.railway.app/webhook/facebook`
- **Verify Token**: `phung huu dat`

### 4. Subscribe to Events
Chọn các events muốn nhận:
- ✅ **messages** - Tin nhắn mới
- ✅ **messaging_postbacks** - Button clicks
- ✅ **message_deliveries** - Delivery confirmations
- ✅ **message_reads** - Read receipts
- ✅ **messaging_optins** - Opt-ins
- ✅ **messaging_referrals** - Referrals

### 5. Subscribe Page
1. Scroll xuống **"Webhooks for Pages"**
2. Click **"Subscribe to this object"**
3. Chọn Page của bạn
4. Click **"Subscribe"**

## 🧪 Test Webhook

### 1. Verify Webhook hoạt động
Sau khi save, Facebook sẽ gửi GET request để verify:
```
GET /webhook/facebook?hub.mode=subscribe&hub.verify_token=phung huu dat&hub.challenge=xxx
```

Nếu thành công, webhook sẽ được kích hoạt ✅

### 2. Test nhận tin nhắn
1. Vào Facebook Page của bạn
2. Gửi tin nhắn từ một Facebook account khác
3. Kiểm tra logs trên Railway

### 3. Kiểm tra logs
Trên Railway dashboard:
1. Vào project → Service
2. Click **"Logs"** tab
3. Bạn sẽ thấy:
```
Facebook webhook received: {
  object: 'page',
  entry: [...],
  ...
}
```

## 📡 Socket.IO Connection

### Frontend kết nối Socket.IO
```javascript
import io from 'socket.io-client';

// Connect to Socket.IO
const socket = io('https://sellbridge-backend-production.up.railway.app', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  auth: {
    userId: 'user-id-here' // User ID từ JWT
  }
});

// Hoặc dùng query param
const socket = io('https://sellbridge-backend-production.up.railway.app', {
  path: '/socket.io',
  query: {
    userId: 'user-id-here'
  }
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('New message received:', data);
  // {
  //   type: 'message',
  //   pageId: '123456',
  //   senderId: '789',
  //   messageId: 'mid.xxx',
  //   text: 'Hello!',
  //   timestamp: 1234567890,
  //   ...
  // }
});

// Listen for specific page
socket.on('page_123456_message', (data) => {
  console.log('Message for page 123456:', data);
});

// Connection status
socket.on('connect', () => {
  console.log('Connected to Socket.IO');
});

socket.on('disconnect', () => {
  console.log('Disconnected from Socket.IO');
});
```

## 📦 Message Structure

### Incoming Message
```json
{
  "type": "message",
  "pageId": "123456789",
  "senderId": "987654321",
  "recipientId": "123456789",
  "timestamp": 1234567890,
  "messageId": "mid.xxx",
  "text": "Hello from customer!",
  "attachments": [],
  "isEcho": false
}
```

### Echo Message (sent by page)
```json
{
  "type": "message",
  "pageId": "123456789",
  "senderId": "123456789",
  "recipientId": "987654321",
  "timestamp": 1234567890,
  "messageId": "mid.xxx",
  "text": "Hello from page!",
  "isEcho": true
}
```

### Postback (Button Click)
```json
{
  "type": "postback",
  "pageId": "123456789",
  "senderId": "987654321",
  "timestamp": 1234567890,
  "payload": "BUTTON_PAYLOAD",
  "title": "Button Title"
}
```

### Delivery Confirmation
```json
{
  "type": "delivery",
  "pageId": "123456789",
  "senderId": "987654321",
  "timestamp": 1234567890,
  "mids": ["mid.xxx", "mid.yyy"],
  "watermark": 1234567890
}
```

### Read Receipt
```json
{
  "type": "read",
  "pageId": "123456789",
  "senderId": "987654321",
  "timestamp": 1234567890,
  "watermark": 1234567890
}
```

## 🔍 Debug và Troubleshooting

### Kiểm tra webhook có nhận được request
```bash
# Check logs trên Railway
# Hoặc local:
npm run start:dev
# Rồi gửi tin nhắn test
```

### Test webhook locally với ngrok
```bash
# Install ngrok
brew install ngrok

# Start ngrok
ngrok http 3030

# Sẽ có URL như: https://abc123.ngrok.io
# Thêm vào Facebook webhook: https://abc123.ngrok.io/webhook/facebook
```

### Verify webhook endpoint
```bash
# Test GET verify
curl "https://sellbridge-backend-production.up.railway.app/webhook/facebook?hub.mode=subscribe&hub.verify_token=phung%20huu%20dat&hub.challenge=test123"

# Should return: test123
```

### Test POST webhook manually
```bash
curl -X POST https://sellbridge-backend-production.up.railway.app/webhook/facebook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "123456",
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "987654"},
        "recipient": {"id": "123456"},
        "timestamp": 1234567890,
        "message": {
          "mid": "mid.test",
          "text": "Test message"
        }
      }]
    }]
  }'

# Should return: {"status":"EVENT_RECEIVED"}
```

## 📊 Monitoring

### Events được log:
- ✅ Webhook verification
- ✅ Incoming messages
- ✅ Postbacks
- ✅ Delivery confirmations
- ✅ Read receipts
- ✅ Socket.IO connections/disconnections

### Kiểm tra trong Railway logs:
```
Client connected: socket-id-xxx
User user-123 connected
New message: { type: 'message', ... }
Sent message to user user-123
```

## 🎯 Environment Variables

Đảm bảo có trong Railway:
```env
FACEBOOK_WEBHOOK_TOKEN=phung huu dat
FRONTEND_URL=https://deploy-railway-production-cb4a.up.railway.app
BACKEND_URL=https://sellbridge-backend-production.up.railway.app
```

## ✅ Checklist

- [ ] Webhook URL đã add vào Facebook App
- [ ] Verify token đúng: `phung huu dat`
- [ ] Subscribe to page events (messages, postbacks, etc)
- [ ] Page đã được subscribe
- [ ] Webhook verification thành công (màu xanh trên Facebook)
- [ ] Test gửi tin nhắn → Xem logs có nhận được
- [ ] Frontend kết nối Socket.IO thành công
- [ ] Frontend nhận được message qua Socket.IO

## 🚀 Next Steps

1. Deploy code lên Railway
2. Setup webhook trên Facebook
3. Test gửi tin nhắn
4. Implement frontend để hiển thị real-time messages

