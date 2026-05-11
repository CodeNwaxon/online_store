# Quick Choice - Premium Online Store & Admin Dashboard

Quick Choice is a state-of-the-art E-commerce platform built with Next.js 15, Firebase, and Tailwind CSS. It features a robust storefront for customers and a secure, comprehensive Admin Dashboard for store owners and staff.

## 🚀 Key Features

### 🛍️ Storefront
- **Modern UI/UX**: Standard, responsive design optimized for all devices.
- **Dynamic Product Catalog**: Real-time product browsing with category and group filtering.
- **Installment Payment System**: Integrated loan/installment plan support for flexible purchasing.
- **Shopping Cart**: Seamless add-to-cart experience with state persistence.
- **WhatsApp Integration**: Direct customer engagement via WhatsApp for order fulfillment.

### 🛡️ Admin Dashboard (CEO & Staff)
- **Product Management**:
    - Add, Edit, and Delete products with ease.
    - **Smart Promo System**: Dynamically link Old Price to New Promo Price.
    - **Automatic Formatting**: Structural items (Groups/Categories) are auto-converted to UPPERCASE, while product names use Title Case.
    - **Promo-First Sorting**: Promotional items are automatically prioritized for management.
- **Admin Management**:
    - Search and assign staff roles to Google-registered users.
    - Grant specific route access to different staff members.
- **CEO Security Suite**:
    - **Passkey Protection**: Sensitive actions (like removing staff) are gated by a secure CEO passkey.
    - **Rate-Limited Access**: 10-attempt limit for passkey entries with a 24-hour lockout on failure.
    - **Admin Guard**: Higher-order components to enforce authentication and role-based access.

## 🛠️ Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), React, Tailwind CSS.
- **Backend/Database**: [Firebase](https://firebase.google.com/) (Firestore & Auth).
- **State Management**: [Zustand](https://github.com/pmndrs/zustand).
- **Images**: [Cloudinary](https://cloudinary.com/) API integration.
- **Notifications**: React Hot Toast.
- **Icons**: React Icons (Fa, Md, etc.).

## 📦 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (Recommended)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   
   NEXT_PUBLIC_ADMIN_KEY=your_ceo_uid_here
   
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

### Building for Production
```bash
pnpm build
pnpm start
```

## 🔒 Security Configuration

### Firestore Rules
Ensure your Firestore rules allow:
- CEO-only access to settings.
- Authenticated user profile persistence (for searchability).
- Read-only access for public product data.

### Admin Access
Admin access is restricted based on the `NEXT_PUBLIC_ADMIN_KEY` which should match the UID of the primary CEO account. Additional staff can be added via the **Admin Management** panel.

---
*Built with ❤️ for Quick Choice Online Store.*
