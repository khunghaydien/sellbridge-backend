# 🔐 Role-Based Access Control (RBAC) - Hướng Dẫn

## 📋 Roles hệ thống

Hệ thống hỗ trợ 3 roles:

| Role | Giá trị | Mô tả |
|------|---------|-------|
| **Admin** | `admin` | Quyền cao nhất, quản trị toàn hệ thống |
| **Page Admin** | `page_admin` | Quản trị trang/khu vực cụ thể |
| **Shop Owner** | `shop_owner` | Chủ cửa hàng (role mặc định) |

## 🚀 Sử dụng Role Guards

### 1. Import Guards và Decorators

```typescript
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@app/auth';
```

### 2. Áp dụng cho một Route

```typescript
@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
async adminOnly(@Request() req) {
  return { message: 'Only admin can access' };
}
```

**Giải thích:**
- `@UseGuards(JwtAuthGuard, RolesGuard)`: Áp dụng cả 2 guards
  - `JwtAuthGuard`: Kiểm tra JWT token hợp lệ
  - `RolesGuard`: Kiểm tra role của user
- `@Roles(UserRole.ADMIN)`: Chỉ cho phép role ADMIN

### 3. Multiple Roles (OR condition)

```typescript
@Get('admin-or-page-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PAGE_ADMIN)
async adminOrPageAdmin(@Request() req) {
  return { message: 'Admin or Page Admin can access' };
}
```

User có **một trong các roles** được liệt kê thì có thể truy cập.

### 4. Áp dụng cho toàn bộ Controller

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  // Tất cả routes trong controller này yêu cầu role ADMIN
  
  @Get('dashboard')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
  
  @Get('users')
  getUsers() {
    return { message: 'List users' };
  }
}
```

### 5. Override Role cho từng Route

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  // Route này chỉ cho Admin
  @Get('settings')
  getSettings() {
    return { message: 'Admin settings' };
  }
  
  // Route này cho Admin và Page Admin
  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.PAGE_ADMIN)
  getReports() {
    return { message: 'Reports' };
  }
}
```

## 📝 Ví dụ thực tế

### Shop Owner Features

```typescript
@Controller('shop')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_OWNER)
export class ShopController {
  @Get('my-shop')
  getMyShop(@Request() req) {
    return { shopOwnerId: req.user.id };
  }
  
  @Post('products')
  createProduct(@Body() productDto: CreateProductDto) {
    return { message: 'Product created' };
  }
  
  @Get('orders')
  getOrders() {
    return { message: 'Shop orders' };
  }
}
```

### Admin Features

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get('all-shops')
  getAllShops() {
    return { message: 'List all shops in system' };
  }
  
  @Delete('shops/:id')
  deleteShop(@Param('id') id: string) {
    return { message: `Shop ${id} deleted` };
  }
  
  @Get('system-stats')
  getSystemStats() {
    return { message: 'System statistics' };
  }
}
```

### Page Admin Features

```typescript
@Controller('page-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PAGE_ADMIN)
export class PageAdminController {
  @Get('my-page')
  getMyPage(@Request() req) {
    return { pageAdminId: req.user.id };
  }
  
  @Put('page-settings')
  updatePageSettings(@Body() settings: any) {
    return { message: 'Page settings updated' };
  }
}
```

### Mixed Access

```typescript
@Controller('reports')
export class ReportsController {
  // Admin và Page Admin có thể xem reports
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PAGE_ADMIN)
  getAnalytics() {
    return { message: 'Analytics data' };
  }
  
  // Chỉ Admin có thể export
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  exportReports() {
    return { message: 'Export reports' };
  }
  
  // Tất cả roles đã đăng nhập
  @Get('public-stats')
  @UseGuards(JwtAuthGuard)
  getPublicStats() {
    return { message: 'Public statistics' };
  }
}
```

## 🧪 Testing với các Roles

### 1. Tạo user với role cụ thể

**Sign up mặc định = SHOP_OWNER:**
```bash
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shop@example.com",
    "password": "password123",
    "username": "shopowner"
  }'
```

**Tạo Admin (cần update database manually hoặc có API riêng):**
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'admin@example.com';
```

**Tạo Page Admin:**
```sql
UPDATE "user" SET role = 'page_admin' WHERE email = 'pageadmin@example.com';
```

### 2. Test endpoints

```bash
# 1. Sign in
TOKEN=$(curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# 2. Test admin endpoint
curl -X GET http://localhost:3000/auth/admin-only \
  -H "Authorization: Bearer $TOKEN"
```

## 🔒 Error Responses

### Không có token (401 Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Không đủ quyền (403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

## 🎯 Best Practices

### 1. Luôn dùng JWT Guard trước Roles Guard
```typescript
// ✅ Đúng
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)

// ❌ Sai - Roles Guard cần user từ JWT Guard
@UseGuards(RolesGuard, JwtAuthGuard)
@Roles(UserRole.ADMIN)
```

### 2. Dùng Enum thay vì string
```typescript
// ✅ Đúng - Type-safe
@Roles(UserRole.ADMIN)

// ❌ Sai - Dễ typo
@Roles('admin' as any)
```

### 3. Không decorator @Roles = cho phép tất cả
```typescript
// Không có @Roles = cho phép tất cả user đã đăng nhập
@Get('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
async getProfile(@Request() req) {
  return req.user;
}
```

### 4. Tách controller theo role
```typescript
// ✅ Đúng - Dễ quản lý
apps/api/src/
  ├── admin/
  │   ├── admin.controller.ts   # @Roles(ADMIN)
  │   └── admin.module.ts
  ├── shop/
  │   ├── shop.controller.ts    # @Roles(SHOP_OWNER)
  │   └── shop.module.ts
  └── page-admin/
      ├── page-admin.controller.ts  # @Roles(PAGE_ADMIN)
      └── page-admin.module.ts
```

## 🔄 Hierarchy (nếu cần)

Nếu muốn hierarchy (Admin > Page Admin > Shop Owner), thêm logic vào `RolesGuard`:

```typescript
// libs/auth/src/guards/roles.guard.ts
const roleHierarchy = {
  [UserRole.ADMIN]: 3,
  [UserRole.PAGE_ADMIN]: 2,
  [UserRole.SHOP_OWNER]: 1,
};

canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.get<UserRole[]>(...);
  const user = request.user;
  
  const userRoleLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = Math.min(
    ...requiredRoles.map(role => roleHierarchy[role])
  );
  
  return userRoleLevel >= requiredLevel;
}
```

## 📚 API Endpoints trong Auth Controller

| Endpoint | Method | Roles Required | Mô tả |
|----------|--------|----------------|-------|
| `/auth/sign-up` | POST | None | Đăng ký |
| `/auth/sign-in` | POST | None | Đăng nhập |
| `/auth/profile` | GET | Authenticated | Thông tin user |
| `/auth/admin-only` | GET | ADMIN | Chỉ admin |
| `/auth/page-admin-only` | GET | PAGE_ADMIN | Chỉ page admin |
| `/auth/shop-owner-only` | GET | SHOP_OWNER | Chỉ shop owner |
| `/auth/admin-or-page-admin` | GET | ADMIN, PAGE_ADMIN | Admin hoặc Page Admin |
| `/auth/all-roles` | GET | All roles | Tất cả roles |

## 🎓 Tóm tắt

1. **3 Roles**: `admin`, `page_admin`, `shop_owner`
2. **2 Guards**: `JwtAuthGuard` + `RolesGuard`
3. **1 Decorator**: `@Roles(...roles)`
4. **Thứ tự**: JWT Guard → Roles Guard
5. **Multiple roles**: OR condition (user có 1 trong các roles)

