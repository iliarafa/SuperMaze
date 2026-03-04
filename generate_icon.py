#!/usr/bin/env python3
"""Generate 1024x1024 app icon for Quantum Labyrinth."""

from PIL import Image, ImageDraw, ImageFilter
import math
import random

SIZE = 1024
CENTER = SIZE // 2

# Colors from the game's visual design
BG = (5, 10, 20)
WALL = (26, 107, 138)
ORANGE = (255, 122, 47)


def create_icon():
    img = Image.new("RGBA", (SIZE, SIZE), BG + (255,))

    # Subtle radial gradient for depth
    gradient = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(gradient)
    for r in range(SIZE // 2, 0, -2):
        alpha = int(30 * (1 - r / (SIZE // 2)))
        gdraw.ellipse(
            [CENTER - r, CENTER - r, CENTER + r, CENTER + r],
            fill=(20, 50, 80, alpha)
        )
    img = Image.alpha_composite(img, gradient)

    # --- Maze grid approach ---
    # Draw a small grid maze that's clear and iconic
    # 7x7 cells centered in the icon
    cells = 7
    cell_size = 96
    wall_w = 8
    maze_size = cells * cell_size
    offset_x = (SIZE - maze_size) // 2
    offset_y = (SIZE - maze_size) // 2

    # Define maze walls (which walls are present)
    # For each cell (row, col), store which walls exist: N, E, S, W
    # We'll define a hand-crafted simple maze that spirals toward center
    # Grid coordinates: (row, col) from 0,0 at top-left

    # Walls: set of ((r1,c1), (r2,c2)) meaning wall between adjacent cells
    # If a wall segment is NOT in this set, there's a passage
    # Start with all walls, then carve passages

    h_walls = [[True] * cells for _ in range(cells + 1)]  # horizontal walls (cells+1 rows, cells cols)
    v_walls = [[True] * (cells + 1) for _ in range(cells)]  # vertical walls (cells rows, cells+1 cols)

    # Carve a spiral path from outside to center
    # Path: enter from bottom-center, spiral clockwise inward
    # (row, col) coordinates
    path = [
        # Enter from bottom
        (6, 3), (5, 3), (5, 4), (5, 5), (5, 6),
        # Up the right side
        (4, 6), (3, 6), (2, 6), (1, 6), (0, 6),
        # Left across top
        (0, 5), (0, 4), (0, 3), (0, 2), (0, 1), (0, 0),
        # Down left side
        (1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0),
        # Right along bottom
        (6, 1), (6, 2),
        # Up
        (5, 2), (4, 2), (3, 2), (2, 2),
        # Right
        (2, 3), (2, 4),
        # Down
        (3, 4), (4, 4),
        # Left to center
        (4, 3), (3, 3),  # center
    ]

    # Remove walls along the path
    for i in range(len(path) - 1):
        r1, c1 = path[i]
        r2, c2 = path[i + 1]
        if r2 == r1 + 1:  # moving down
            h_walls[r2][c1] = False
        elif r2 == r1 - 1:  # moving up
            h_walls[r1][c1] = False
        elif c2 == c1 + 1:  # moving right
            v_walls[r1][c2] = False
        elif c2 == c1 - 1:  # moving left
            v_walls[r1][c1] = False

    # Also carve some extra passages so it looks like a real maze (dead ends)
    extra_passages = [
        ((1, 1), (1, 2)), ((1, 3), (1, 4)), ((2, 1), (3, 1)),
        ((3, 5), (4, 5)), ((4, 1), (4, 2)), ((1, 4), (1, 5)),
        ((3, 1), (3, 2)), ((5, 1), (5, 2)), ((6, 4), (6, 5)),
        ((1, 1), (2, 1)), ((4, 5), (5, 5)), ((2, 5), (3, 5)),
        ((1, 2), (1, 3)), ((3, 3), (3, 4)), ((6, 5), (6, 6)),
        ((3, 1), (4, 1)), ((1, 5), (2, 5)), ((4, 3), (4, 4)),
    ]
    for (r1, c1), (r2, c2) in extra_passages:
        if r2 == r1 + 1:
            h_walls[r2][c1] = False
        elif r2 == r1 - 1:
            h_walls[r1][c1] = False
        elif c2 == c1 + 1:
            v_walls[r1][c2] = False
        elif c2 == c1 - 1:
            v_walls[r1][c1] = False

    # Remove entry wall at bottom center
    h_walls[cells][3] = False

    # --- Draw maze walls ---
    maze_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(maze_layer)

    def cell_to_px(row, col):
        """Top-left pixel of cell."""
        return (offset_x + col * cell_size, offset_y + row * cell_size)

    # Draw horizontal walls
    for r in range(cells + 1):
        for c in range(cells):
            if h_walls[r][c]:
                x0 = offset_x + c * cell_size
                y0 = offset_y + r * cell_size
                x1 = x0 + cell_size
                # Extend slightly for clean corners
                mdraw.line([(x0 - wall_w//2, y0), (x1 + wall_w//2, y0)],
                          fill=WALL + (255,), width=wall_w)

    # Draw vertical walls
    for r in range(cells):
        for c in range(cells + 1):
            if v_walls[r][c]:
                x0 = offset_x + c * cell_size
                y0 = offset_y + r * cell_size
                y1 = y0 + cell_size
                mdraw.line([(x0, y0 - wall_w//2), (x0, y1 + wall_w//2)],
                          fill=WALL + (255,), width=wall_w)

    # Glow for walls
    wall_glow = maze_layer.filter(ImageFilter.GaussianBlur(radius=14))
    img = Image.alpha_composite(img, wall_glow)
    img = Image.alpha_composite(img, wall_glow)
    img = Image.alpha_composite(img, maze_layer)

    # --- Quantum wave effect (faint probability cloud) ---
    quantum_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    qdraw = ImageDraw.Draw(quantum_layer)

    random.seed(42)
    # Draw faint quantum paths branching from center
    def draw_quantum_branch(start_r, start_c, directions, alpha_base=35):
        r, c = start_r, start_c
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < cells and 0 <= nc < cells:
                x1 = offset_x + c * cell_size + cell_size // 2
                y1 = offset_y + r * cell_size + cell_size // 2
                x2 = offset_x + nc * cell_size + cell_size // 2
                y2 = offset_y + nr * cell_size + cell_size // 2
                alpha_base = max(10, alpha_base - 3)
                qdraw.line([(x1, y1), (x2, y2)],
                          fill=(80, 190, 255, alpha_base), width=4)
                # Small dot at junction
                qdraw.ellipse([x2-4, y2-4, x2+4, y2+4],
                             fill=(100, 200, 255, alpha_base + 20))
                r, c = nr, nc

    # Several quantum exploration branches from the center area
    draw_quantum_branch(3, 3, [(0, -1), (-1, 0), (-1, 0), (0, 1)], 50)
    draw_quantum_branch(3, 3, [(0, 1), (0, 1), (1, 0), (1, 0)], 45)
    draw_quantum_branch(3, 3, [(-1, 0), (0, -1), (0, -1), (-1, 0)], 40)
    draw_quantum_branch(3, 3, [(1, 0), (1, 0), (0, -1), (0, -1)], 35)
    draw_quantum_branch(3, 3, [(-1, 0), (-1, 0), (0, 1), (0, 1), (1, 0)], 30)

    quantum_layer = quantum_layer.filter(ImageFilter.GaussianBlur(radius=6))
    img = Image.alpha_composite(img, quantum_layer)

    # --- Draw the classical path (orange) ---
    path_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(path_layer)
    path_glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pgdraw = ImageDraw.Draw(path_glow_layer)

    path_px = []
    for r, c in path:
        px = offset_x + c * cell_size + cell_size // 2
        py = offset_y + r * cell_size + cell_size // 2
        path_px.append((px, py))

    # Add entry point below the maze
    entry_x = offset_x + 3 * cell_size + cell_size // 2
    entry_y = offset_y + cells * cell_size + cell_size // 2
    path_px.insert(0, (entry_x, entry_y))

    for j in range(len(path_px) - 1):
        pgdraw.line([path_px[j], path_px[j+1]],
                   fill=(255, 122, 47, 70), width=20)
        pdraw.line([path_px[j], path_px[j+1]],
                  fill=ORANGE + (200,), width=6)

    path_glow_layer = path_glow_layer.filter(ImageFilter.GaussianBlur(radius=10))
    img = Image.alpha_composite(img, path_glow_layer)
    img = Image.alpha_composite(img, path_layer)

    # --- Agent dot at center (3,3) ---
    agent_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(agent_layer)

    cx = offset_x + 3 * cell_size + cell_size // 2
    cy = offset_y + 3 * cell_size + cell_size // 2

    # Outer glow
    for r in range(50, 0, -1):
        alpha = int(140 * (1 - r / 50))
        adraw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(255, 100, 30, alpha)
        )
    # Core
    adraw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14],
                  fill=(255, 200, 140, 255))
    adraw.ellipse([cx - 9, cy - 9, cx + 9, cy + 9],
                  fill=(255, 240, 220, 255))

    img = Image.alpha_composite(img, agent_layer)

    # --- Quantum particles ---
    particle_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ptdraw = ImageDraw.Draw(particle_layer)

    random.seed(17)
    for _ in range(80):
        px = random.randint(offset_x + 20, offset_x + maze_size - 20)
        py = random.randint(offset_y + 20, offset_y + maze_size - 20)
        dist = math.sqrt((px - cx)**2 + (py - cy)**2)
        if dist < 60:
            continue
        pr = random.uniform(1.5, 4)
        alpha = random.randint(30, 100)
        ptdraw.ellipse(
            [px - pr, py - pr, px + pr, py + pr],
            fill=(90, 190, 255, alpha)
        )

    particle_layer = particle_layer.filter(ImageFilter.GaussianBlur(radius=1.5))
    img = Image.alpha_composite(img, particle_layer)

    # --- Vignette (darken edges) ---
    vignette = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    max_r = int(SIZE * 0.75)
    for r in range(max_r, 0, -2):
        progress = 1 - (r / max_r)
        alpha = int(160 * progress * progress)
        vdraw.ellipse(
            [CENTER - r, CENTER - r, CENTER + r, CENTER + r],
            fill=(0, 0, 0, 0)  # clear center
        )
    # Darken corners
    corner_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(corner_layer)
    for r in range(SIZE // 2, 0, -3):
        frac = r / (SIZE // 2)
        alpha = int(80 * (1 - frac * frac))
        cdraw.ellipse(
            [CENTER - r, CENTER - r, CENTER + r, CENTER + r],
            fill=(0, 0, 0, 0)
        )
    # Simple edge darkening
    edge_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    edraw = ImageDraw.Draw(edge_layer)
    border = 100
    for i in range(border):
        alpha = int(80 * (1 - i / border))
        edraw.rectangle([i, i, SIZE - i, SIZE - i], outline=(2, 5, 12, alpha))
    img = Image.alpha_composite(img, edge_layer)

    # Convert to RGB
    final = Image.new("RGB", (SIZE, SIZE), BG)
    final.paste(img, mask=img.split()[3])

    output_path = "/Users/iliasrafailidis/development/labyrinth/app-icon-1024.png"
    final.save(output_path, "PNG", quality=100)
    print(f"Icon saved to {output_path}")


if __name__ == "__main__":
    create_icon()
