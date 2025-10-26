# ChatGPT Client Simulator

A Node.js server application with a vanilla TypeScript frontend that simulates a ChatGPT client interface that supports loading the Todo App.

## Features

- 🚀 Express.js server with TypeScript
- 🎨 Vanilla TypeScript frontend (no frameworks)
- 🔥 Hot reload support for both client and server
- 📦 esbuild for fast bundling
- 🎯 Modern ES modules
- 📱 Responsive design
- 💬 Chat-like interface

## Project Structure

```
chatgpt-app/
├── src/
│   ├── server.ts              # Express server
│   └── client/
│       ├── index.ts           # Main client application
│       ├── api.ts             # API client
│       └── ui.ts              # UI management
├── public/
│   ├── index.html             # HTML template
│   ├── css/
│   │   └── styles.css         # Styles
│   └── js/
│       └── bundle.js          # Built client bundle
├── scripts/
│   └── dev-server.js          # Development server with hot reload
└── dist/
    └── server.js              # Built server
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Development mode (with hot reload):**
   ```bash
   npm run dev
   ```
   This starts both the client watcher and server with hot reload.

3. **Production build:**
   ```bash
   npm run build
   npm start
   ```

4. **Individual commands:**
   ```bash
   npm run build:client    # Build client only
   npm run build:server    # Build server only
   npm run watch:client    # Watch client files
   npm run watch:server    # Watch server files with restart
   ```

## Development Features

- **Client Hot Reload**: Changes to TypeScript files in `src/client/` automatically rebuild the bundle
- **Server Hot Reload**: Changes to `src/server.ts` automatically restart the server
- **Source Maps**: Available for both client and server code
- **ES Modules**: Modern module system throughout

## API Endpoints

- `GET /` - Serves the main application
- `GET /api/health` - Health check endpoint
- `GET /api/message` - Test message endpoint

## Browser Support

- Modern browsers with ES2020 support
- Chrome 63+, Firefox 67+, Safari 13.1+, Edge 79+

## Customization

- **Styling**: Edit `public/css/styles.css`
- **Client Logic**: Modify files in `src/client/`
- **Server Routes**: Add routes in `src/server.ts`
- **Build Config**: Adjust esbuild settings in `package.json`
