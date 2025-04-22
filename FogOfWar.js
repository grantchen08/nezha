// --- FOG OF WAR HELPER FUNCTIONS ---

/**
 * Converts world coordinates (like sprite x/y) to fog grid coordinates.
 */
function worldToGrid(worldX, worldY) {
    const gridX = Math.floor(worldX / FOG_CELL_SIZE);
    const gridY = Math.floor(worldY / FOG_CELL_SIZE);
    return { gridX, gridY };
}

/**
 * Checks if a specific fog grid cell is revealed for a given perspective.
 */
function isCellRevealed(gridX, gridY, isPlayerView) {
    const grid = isPlayerView ? this.playerFogGrid : this.aiFogGrid;
    if (grid && gridY >= 0 && gridY < this.gridHeight && gridX >= 0 && gridX < this.gridWidth) {
        return grid[gridY][gridX];
    }
    return false;
}

/**
 * Reveals a specific fog grid cell for a given perspective.
 */
function revealCell(gridX, gridY, isPlayerView) {
    if (gridY < 0 || gridY >= this.gridHeight || gridX < 0 || gridX >= this.gridWidth) return;
    const targetGrid = isPlayerView ? this.playerFogGrid : this.aiFogGrid;
    if (targetGrid[gridY][gridX]) return; // Already revealed
    targetGrid[gridY][gridX] = true;
    if (isPlayerView && this.fogRects[gridY] && this.fogRects[gridY][gridX]) { // Added check for row existence
        this.fogRects[gridY][gridX].setVisible(false);
    }
}

/**
 * Checks if all fog cells are revealed for a given perspective.
 * @param {boolean} isPlayerView - True for player's perspective, false for AI's.
 * @returns {boolean} True if all cells are revealed, false otherwise.
 */
function areAllCellsRevealed(isPlayerView) {
    const grid = isPlayerView ? this.playerFogGrid : this.aiFogGrid;
    if (!grid) return false; // Grid not initialized
    for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
            if (!grid[y][x]) {
                return false; // Found an unrevealed cell
            }
        }
    }
    return true; // All cells checked and are revealed
}


/**
 * Updates fog visibility around a given game object based on its bounds.
 */
function updateVisibilityAround(gameObject) {
    if (!gameObject || !gameObject.active) return;
    const isPlayerUnit = gameObject.getData('isPlayer');
    let bounds;
    if (typeof gameObject.getBounds === 'function') {
        bounds = gameObject.getBounds();
    } else {
        const width = gameObject.displayWidth || gameObject.width;
        const height = gameObject.displayHeight || gameObject.height;
        const originXFactor = gameObject.originX ?? 0.5;
        const originYFactor = gameObject.originY ?? 0.5;
        const topLeftX = gameObject.x - width * originXFactor;
        const topLeftY = gameObject.y - height * originYFactor;
        bounds = new Phaser.Geom.Rectangle(topLeftX, topLeftY, width, height);
    }
    const topLeftGrid = this.worldToGrid(bounds.x, bounds.y);
    const bottomRightGrid = this.worldToGrid(bounds.right, bounds.bottom);
    for (let gx = topLeftGrid.gridX; gx <= bottomRightGrid.gridX; gx++) {
        for (let gy = topLeftGrid.gridY; gy <= bottomRightGrid.gridY; gy++) {
            this.revealCell(gx, gy, isPlayerUnit);
        }
    }
}


/**
 * Finds the grid coordinates of the nearest hidden fog cell for a specific perspective.
 */
function findNearestHiddenCell(unit, isPlayerView) {
    const grid = isPlayerView ? this.playerFogGrid : this.aiFogGrid;
    if (!grid) return null;
    let nearestCell = null;
    let minDistanceSq = Infinity;
    for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
            if (!grid[y][x]) {
                const cellCenterX = x * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                const cellCenterY = y * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                const distanceSq = Phaser.Math.Distance.Squared(unit.x, unit.y, cellCenterX, cellCenterY);
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    nearestCell = { gridX: x, gridY: y };
                }
            }
        }
    }
    return nearestCell;
}