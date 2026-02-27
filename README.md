# Image Generation Private - Nano Banana Pro

A React-based web application for private image generation using [Nano Banana Pro API](https://docs.laozhang.ai/en/api-capabilities/nano-banana-pro-image).

## Features

- **Image Grid Layout**: Displays generated images in a responsive grid, with newest images appearing first (top-left)
- **Liquid Glass UI**: Modern glassmorphism design with backdrop blur effects
- **Control Panel**: Bottom overlay panel with:
  - Reference image upload and management (up to 14 images)
  - Prompt input area
  - AI model selection (Nano Banana Pro, G Nano Banana Pro)
  - Aspect ratio selection (1:1, 3:2, 4:3, 16:9, 9:16, etc.)
  - Quality selection (1K, 2K, 4K)
  - Batch size control (1-8 images)
  - Real-time generation status

## Tech Stack

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Nano Banana Pro API (Google Gemini 3 Pro Image)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API Key

1. Get your API key from [LaoZhang API Console](https://api.laozhang.ai)
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your API key:
   ```
   VITE_LAOZHANG_API_KEY=sk-YOUR_API_KEY_HERE
   ```

### 3. Start the development server

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## API Configuration

The app uses the **Nano Banana Pro** model which supports:

- **Resolutions**: 1K, 2K, 4K
- **Aspect Ratios**: 1:1, 3:2, 4:3, 16:9, 9:16, 2:3, 3:4, 21:9, 5:4, 4:5
- **Reference Images**: Up to 14 images for composition
- **Pricing**: $0.05/image (79% cheaper than official Google pricing)

### API Documentation

- [Nano Banana Pro Documentation](https://docs.laozhang.ai/en/api-capabilities/nano-banana-pro-image)
- [API Console](https://api.laozhang.ai)

## Project Structure

```
src/
  components/
    ImageGrid.tsx      # Grid layout for displaying generated images
    ControlPanel.tsx   # Bottom control panel with prompt and settings
  services/
    imageGeneration.ts # Nano Banana Pro API integration
  App.tsx              # Main application component
  main.tsx             # Application entry point
  index.css            # Global styles and Tailwind imports
```

## Usage

1. **Enter a prompt**: Describe the image you want to generate
2. **Add reference images** (optional): Upload up to 14 reference images for composition
3. **Select settings**:
   - Aspect ratio (default: 3:2)
   - Quality (default: 1K)
   - Batch size (default: 4)
4. **Click Generate**: Images will appear in the grid as they're generated

## Features in Detail

### Image Generation
- Supports text-to-image generation
- Multi-image reference for complex compositions
- Batch generation (1-8 images at once)
- Real-time progress indicators

### UI/UX
- Liquid glass effect with backdrop blur
- Responsive grid layout (2-6 columns based on screen size)
- Image hover effects with action buttons
- Error notifications
- Loading states

### Performance
- Memory-safe with proper cleanup of object URLs
- Optimized re-renders with React.memo and useCallback
- Type-safe with TypeScript

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_LAOZHANG_API_KEY` | Your Nano Banana Pro API key | Yes |
| `VITE_LAOZHANG_API_URL` | API base URL (default: https://api.laozhang.ai) | No |

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Notes

- All image generation happens on the frontend (no backend required)
- API key is exposed in the frontend (use environment-specific keys)
- Generated images are stored in component state (not persisted)
- For production, consider adding a backend to secure API keys

## Future Enhancements

- Backend API for secure key management
- Image storage and persistence
- User authentication
- Image history and management
- Download and share functionality
- Advanced editing features

## License

Private use only.
