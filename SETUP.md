# Setup Guide - Nano Banana Pro Image Generation

## Quick Start

### 1. Get Your API Key

1. Visit [LaoZhang API Console](https://api.laozhang.ai)
2. Register for a free account (you'll get $0.05 free credit)
3. Go to [Token Management](https://api.laozhang.ai/token)
4. Create a new token:
   - **Important**: Select "Pay-per-use" billing type
   - Copy the generated token (format: `sk-xxxxxx`)

### 2. Configure the Application

1. Open the `.env` file in the project root
2. Replace `sk-YOUR_API_KEY_HERE` with your actual API key:
   ```
   VITE_LAOZHANG_API_KEY=sk-your-actual-key-here
   ```

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will open at `http://localhost:5173`

## Testing the API

### Test 1: Simple Text-to-Image

1. Enter a prompt: `"A beautiful sunset over mountains"`
2. Keep default settings (3:2, 1K, batch size 4)
3. Click "Generate"
4. Wait ~10 seconds for images to appear

### Test 2: With Reference Images

1. Click the "+" button to upload reference images
2. Upload 1-3 images
3. Enter a prompt that references them: `"Combine these images into a cohesive artwork"`
4. Click "Generate"

### Test 3: 4K High Resolution

1. Enter a detailed prompt: `"A futuristic cyberpunk city at night, neon lights, flying cars, highly detailed, 4k"`
2. Change quality to "4K"
3. Change aspect ratio to "16:9"
4. Set batch size to 1 (4K takes longer)
5. Click "Generate"

## Pricing

- **1K images**: $0.05 per image
- **2K images**: $0.05 per image
- **4K images**: $0.05 per image

All resolutions cost the same! This is 79% cheaper than Google's official pricing ($0.24/image).

## Supported Features

### Aspect Ratios
- **Square**: 1:1
- **Landscape**: 16:9, 4:3, 3:2, 21:9, 5:4
- **Portrait**: 9:16, 3:4, 2:3, 4:5

### Resolutions
- **1K**: Fast generation, good for web/social media
- **2K**: High quality, good for printing
- **4K**: Ultra high quality, best for professional use

### Reference Images
- Upload up to 14 reference images
- Supports JPG, PNG formats
- Used for composition and style guidance

## Troubleshooting

### "API key not configured" error
- Check that your `.env` file has the correct API key
- Make sure the key starts with `sk-`
- Restart the dev server after changing `.env`

### "API request failed" error
- Verify your API key is valid
- Check that you have billing configured (Pay-per-use mode)
- Ensure you have sufficient balance

### Images not generating
- Check browser console for errors (F12)
- Verify your prompt is not empty
- Try with a simpler prompt first

### Slow generation
- 4K images take longer (~15-20 seconds)
- Batch generation processes images in parallel
- Network speed affects download time

## API Limits

- **Batch size**: 1-8 images per request
- **Reference images**: Up to 14 images
- **Prompt length**: No strict limit, but keep it reasonable
- **Rate limits**: Based on your account tier

## Next Steps

Once you've tested the basic functionality:

1. **Add a backend** (recommended for production):
   - Secure API key storage
   - User authentication
   - Image persistence
   - Usage tracking

2. **Enhance features**:
   - Image download functionality
   - Image history/gallery
   - Favorite/like system
   - Sharing capabilities

3. **Optimize**:
   - Add image caching
   - Implement pagination
   - Add retry logic for failed generations

## Resources

- [Nano Banana Pro API Docs](https://docs.laozhang.ai/en/api-capabilities/nano-banana-pro-image)
- [API Console](https://api.laozhang.ai)
- [Pricing](https://docs.laozhang.ai/en/pricing)
- [Support](https://api.laozhang.ai/support)
