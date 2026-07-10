import numpy as np
from PIL import Image, ImageDraw

def create_sunset():
    # Create a nice sunset gradient photo for testing
    width, height = 800, 600
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # Draw sky gradient (from dark purple at top to orange at bottom)
    for y in range(height):
        # Interpolate color channels
        r = int(30 + (y / height) * 220)
        g = int(20 + (y / height) * 80)
        b = int(60 - (y / height) * 30)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # Draw a big glowing sun near the lower-right third intersection
    sun_x, sun_y = 533, 400
    sun_radius = 60
    for r in range(sun_radius, 0, -1):
        alpha = int(255 * (1 - r/sun_radius))
        # Draw concentric yellow-orange circles
        draw.ellipse(
            [sun_x - r, sun_y - r, sun_x + r, sun_y + r], 
            fill=(255, 200 + int(55 * (1 - r/sun_radius)), 100)
        )
        
    # Draw silhouette hills at the bottom
    points = [
        (0, 600),
        (0, 520),
        (200, 480),
        (400, 540),
        (600, 490),
        (800, 510),
        (800, 600)
    ]
    draw.polygon(points, fill=(10, 12, 25))
    
    img.save('test_sunset.jpg')
    print("test_sunset.jpg created successfully!")

if __name__ == '__main__':
    create_sunset()
