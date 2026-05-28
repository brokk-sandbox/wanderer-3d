export function hash(x, y) {
    let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return h - Math.floor(h);
}

export function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3.0 - 2.0 * fx), uy = fy * fy * (3.0 - 2.0 * fy);
    const v1 = hash(ix, iy), v2 = hash(ix + 1, iy);
    const v3 = hash(ix, iy + 1), v4 = hash(ix + 1, iy + 1);
    return (v1 * (1 - ux) + v2 * ux) * (1 - uy) + (v3 * (1 - ux) + v4 * ux) * uy;
}

export function fbm(x, y, octaves = 4) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
        val += noise(x * freq, y * freq) * amp;
        max += amp;
        amp *= 0.5;
        freq *= 2.0;
    }
    return val / max;
}

export function getElevation(x, z) {
    const baseNoise = fbm(x * 0.0015, z * 0.0015, 5); // Mountains & Hills
    let elevation = Math.pow(baseNoise, 2.0) * 150 - 5;

    // Carve rivers
    const riverNoise = fbm(x * 0.002 - 50, z * 0.002 - 50, 3);
    const riverDist = Math.abs(riverNoise - 0.5) * 2.0;
    if (riverDist < 0.1) {
        const carve = (0.1 - riverDist) * 10; // 0 to 1
        elevation -= carve * 15;
    }

    // Sea coast on the east (X > 600)
    if (x > 600) {
        elevation -= (x - 600) * 0.25;
    }
    return elevation;
}
