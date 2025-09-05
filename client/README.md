# ChatGPT Manager Client

A professional, modern React application for managing ChatGPT cookies, user accounts, and website permissions.

## 🚀 Features

### **Authentication & User Management**
- **Secure Login/Register**: JWT-based authentication with bcrypt password hashing
- **User Profiles**: Track login history, cookie insertions, and user statistics
- **Admin Support**: Special privileges for administrators
- **Session Management**: Automatic token refresh and logout handling

### **Cookie Management**
- **Multi-Website Support**: ChatGPT, Google Bard, Claude, Perplexity, Poe
- **Cookie Bundles**: Upload, store, and manage cookie collections
- **Insertion Tracking**: Monitor successful and failed cookie insertions
- **Permission Control**: Granular control over which websites can access cookies

### **Professional UI/UX**
- **Material-UI Design**: Modern, responsive interface with professional styling
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Interactive Components**: Steppers, forms, tables, and data visualization
- **Theme System**: Customizable color schemes and typography

### **Data Management**
- **Real-time Updates**: Live data synchronization with the server
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Smooth loading animations and progress indicators
- **Data Validation**: Client-side and server-side validation

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Styling**: Emotion CSS-in-JS
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite
- **Package Manager**: npm

## 📁 Project Structure

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navigation.tsx   # Main navigation bar
│   │   └── ProtectedRoute.tsx # Authentication guard
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Login.tsx        # Authentication page
│   │   ├── Register.tsx     # User registration
│   │   ├── CookieManager.tsx # Cookie management
│   │   ├── UserStats.tsx    # User statistics
│   │   └── Settings.tsx     # User preferences
│   ├── services/            # API services
│   │   └── api.ts          # HTTP client and endpoints
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts        # All application types
│   ├── theme.ts             # Material-UI theme configuration
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── README.md                # This file
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js 16+ and npm
- Running server instance (see server README)
- Modern web browser

### **Installation**

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

### **Build for Production**

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🔧 Configuration

### **Environment Variables**
The client connects to the server at `http://localhost:3000` by default. To change this:

1. **Update API URL** in `src/services/api.ts`:
   ```typescript
   const API_URL = 'http://your-server-url:port/api';
   ```

2. **Update Vite proxy** in `vite.config.ts`:
   ```typescript
   proxy: {
     '/api': {
       target: 'http://your-server-url:port',
       changeOrigin: true,
     },
   },
   ```

## 📱 Pages & Features

### **Dashboard** (`/dashboard`)
- User statistics overview
- Quick access to main features
- Recent activity summary

### **Login** (`/login`)
- Secure authentication
- Error handling and validation
- Redirect to registration

### **Register** (`/register`)
- Multi-step registration process
- Password strength validation
- Username availability checking

### **Cookie Manager** (`/cookies`)
- Upload and manage cookie bundles
- View cookie collections
- Track insertion history

### **User Statistics** (`/stats`)
- Login history
- Cookie insertion metrics
- Activity timeline

### **Settings** (`/settings`)
- Website permission management
- Account preferences
- Security settings

## 🔐 Authentication Flow

1. **User Registration**: Multi-step form with validation
2. **Login**: JWT token generation and storage
3. **Protected Routes**: Automatic redirect for unauthenticated users
4. **Token Management**: Automatic refresh and logout on expiration
5. **Session Persistence**: Local storage with automatic cleanup

## 🎨 Customization

### **Theme Customization**
Edit `src/theme.ts` to customize:
- Color palette
- Typography
- Component styling
- Border radius and shadows

### **Component Styling**
All components use Material-UI's `sx` prop for styling:
```typescript
<Box sx={{ 
  bgcolor: 'background.paper',
  borderRadius: 2,
  p: 3 
}}>
```

## 🧪 Testing

### **Manual Testing**
1. **Authentication**: Test login/register flows
2. **Navigation**: Verify all routes work correctly
3. **Responsiveness**: Test on different screen sizes
4. **Error Handling**: Test with invalid inputs and network errors

### **Browser Testing**
- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🚨 Troubleshooting

### **Common Issues**

1. **"Failed to fetch" errors**
   - Check if server is running
   - Verify server port configuration
   - Check CORS settings

2. **Authentication issues**
   - Clear browser localStorage
   - Check JWT token validity
   - Verify server authentication endpoints

3. **Build errors**
   - Clear `node_modules` and reinstall
   - Check TypeScript configuration
   - Verify all dependencies are installed

### **Development Tips**

1. **Check browser console** for detailed error messages
2. **Use React DevTools** for component debugging
3. **Monitor network tab** for API request issues
4. **Clear cache** when testing authentication flows

## 🔗 Integration

### **Server Connection**
The client automatically connects to the server and handles:
- API authentication
- Error responses
- Network timeouts
- CORS issues

### **Extension Integration**
The client works alongside the Chrome extension:
- Shared authentication tokens
- Coordinated cookie management
- Unified user experience

## 📈 Performance

- **Lazy Loading**: Components load on demand
- **Code Splitting**: Automatic bundle optimization
- **Caching**: Efficient API response caching
- **Optimized Builds**: Production-ready asset optimization

## 🔒 Security

- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Client and server-side validation
- **XSS Protection**: Material-UI built-in security
- **HTTPS Ready**: Production security best practices

## 🤝 Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Include error handling for all API calls
4. Test on multiple browsers
5. Update documentation for new features

## 📄 License

This project is part of the ChatGPT Manager system. See the main project README for license information.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs for backend issues
3. Check browser console for frontend errors
4. Verify all dependencies are up to date
