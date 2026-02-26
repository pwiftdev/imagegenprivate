# Image Generation Private

A React-based web application for private image generation using Nano Banana Pro. This is a UI-only implementation focused on the user experience and interface design.

## Features

- **Image Grid Layout**: Displays generated images in a responsive grid, with newest images appearing in the top-left
- **Control Panel**: Overlapping bottom panel with:
  - Reference image upload and management
  - Prompt input area
  - AI model selection (Nano Banana Pro, G Nano Banana Pro)
  - Aspect ratio selection
  - Quality selection
  - Batch size control
  - Generate button

## Tech Stack

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Project Structure

```
src/
  components/
    ImageGrid.tsx      # Grid layout for displaying generated images
    ControlPanel.tsx   # Bottom control panel with prompt and settings
  App.tsx              # Main application component
  main.tsx             # Application entry point
  index.css            # Global styles and Tailwind imports
```

## Future Development

This is currently a UI-only implementation. Future work will include:
- API integration for image generation
- Backend connectivity
- Image storage and management
- User authentication (if needed)

## Notes

- The image grid currently displays placeholder images
- All controls are functional but don't make API calls yet
- The design matches the reference image provided
